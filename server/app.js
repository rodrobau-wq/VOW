/**
 * Camada SaaS — as rotas de `/app`.
 *
 * Fase 1 do brief: um usuário entra, escolhe a rede e vê quatro números.
 * Os Sistemas 1, 2 e 3 vêm depois, e cada um monta as suas rotas aqui.
 */
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as store from '../store.js'
import crypto from 'node:crypto'
import { baseUrl } from '../lib-url.js'
import { lerLeads, atualizarLead, removerLead } from '../leads-db.js'
import { temPostgres } from '../db.js'
import { protegido } from '../basic-auth.js'
import { PREMISSAS } from '../motor.js'
import { montarProjeto, resumo, ehStatusEtapa } from '../projeto.js'
import { enviarEmail, emailAcesso } from '../email.js'
import {
  ESTAGIOS, MOTIVOS_PERDA, TIPOS_INTERACAO, SLA_PRIMEIRO_CONTATO_H,
  comCrm, ehEstagio, ehMotivo, estagio, montarPipeline, montarResultado, montarHoje, jornada,
} from '../crm.js'

import { montarPainel, CLASSES_CREDITO, RISCOS, CALENDARIO } from '../painel.js'
import {
  abrirSessao, ehAdmin, ehDono, fecharSessao, carregaContexto, conferirSenha, hashSenha,
  exigeLogin, exigeRede, gerarLinkMagico, lerLinkMagico, lerSessao,
  gerarLinkSenha, lerLinkSenha, SENHA_MINIMA, PAPEIS, STATUS, podeEntrar,
} from '../auth.js'

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const tela = (nome) => (_req, res) => res.sendFile(path.join(RAIZ, 'public', `app-${nome}.html`))

/** Mesma regra de e-mail da captura pública. */
const EMAIL_RE_CRM = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const app = express.Router()

/* ------------------------------------------------------------- entrada */

app.get('/app/entrar', (req, res, next) => {
  // Quem já tem sessão não vê o login de novo.
  if (lerSessao(req)) return res.redirect('/app')
  tela('entrar')(req, res, next)
})

app.post('/api/app/entrar', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const senha = String(req.body?.senha || '')
    const usuario = await store.achar('usuario', (u) => u.email === email)

    // Mesma resposta para e-mail inexistente, senha errada e conta
    // desativada: nenhuma das três confirma quem é da VOW para quem está
    // testando de fora. Desativar precisa fechar a porta de verdade — sem
    // isto o botão da tela de usuários não faria nada.
    if (!podeEntrar(usuario) || !conferirSenha(senha, usuario.senhaHash)) {
      return res.status(401).json({ erro: 'E-mail ou senha não conferem.' })
    }

    const redes = usuario.papel === 'vow'
      ? (await store.listar('rede')).map((r) => r.id)
      : usuario.redes || []

    abrirSessao(res, { usuarioId: usuario.id, redeId: redes.length === 1 ? redes[0] : null })
    res.json({ ok: true, destino: redes.length === 1 ? '/app' : '/app/redes' })
  } catch (e) { next(e) }
})

/**
 * Link mágico. Em produção o token vai por e-mail; sem RESEND_API_KEY ele
 * volta na resposta para o piloto não travar. A resposta é a mesma exista
 * ou não o e-mail — de novo, para não confirmar cadastro.
 */
app.post('/api/app/link-magico', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const usuario = await store.achar('usuario', (u) => u.email === email)
    const resposta = { ok: true, mensagem: 'Se este e-mail tiver acesso, o link chega em instantes.' }
    if (!podeEntrar(usuario)) return res.json(resposta)

    const token = gerarLinkMagico(usuario.id)
    const base = baseUrl(req)
    const link = `${base}/app/entrar/${token}`

    const peca = emailAcesso({ nome: usuario.nome, link, tipo: 'magico', minutos: 15 })
    const envio = await enviarEmail({ para: usuario.email, assunto: peca.assunto, html: peca.html, texto: peca.texto })
    // Sem e-mail configurado o link volta na resposta: melhor do que deixar
    // o time trancado para fora da própria plataforma.
    if (!envio.enviado) resposta.link = link
    res.json(resposta)
  } catch (e) { next(e) }
})

app.get('/app/entrar/:token', async (req, res, next) => {
  try {
    const p = lerLinkMagico(req.params.token)
    if (!p) return res.redirect('/app/entrar?erro=link')
    const usuario = await store.porId('usuario', p.usuarioId)
    if (!usuario) return res.redirect('/app/entrar?erro=link')

    const redes = usuario.papel === 'vow'
      ? (await store.listar('rede')).map((r) => r.id)
      : usuario.redes || []
    abrirSessao(res, { usuarioId: usuario.id, redeId: redes.length === 1 ? redes[0] : null })
    res.redirect(redes.length === 1 ? '/app' : '/app/redes')
  } catch (e) { next(e) }
})

/* ------------------------------------------------- primeiro acesso */

/**
 * Cria o primeiro usuário pela própria plataforma, sem depender de shell nem
 * de variável de ambiente. Duas travas:
 *
 * 1. Só funciona enquanto NÃO existe nenhum usuário. Depois do primeiro, a
 *    rota recusa para sempre — não serve para criar um segundo acesso.
 * 2. Exige as credenciais de LEADS_USER/LEADS_PASSWORD. Sem isso, uma
 *    plataforma recém-publicada ficaria com a conta de administrador
 *    disponível para quem descobrisse o endereço primeiro.
 */
app.get('/app/primeiro-acesso', protegido, async (_req, res, next) => {
  try {
    if ((await store.listar('usuario')).length) return res.redirect('/app/entrar')
    res.sendFile(path.join(RAIZ, 'public', 'app-primeiro.html'))
  } catch (e) { next(e) }
})

app.post('/api/app/primeiro-acesso', protegido, async (req, res, next) => {
  try {
    if ((await store.listar('usuario')).length) {
      return res.status(409).json({ erro: 'A plataforma já tem acesso criado. Use "esqueci minha senha".' })
    }
    const email = String(req.body?.email || '').trim().toLowerCase()
    const senha = String(req.body?.senha || '')
    const nome = String(req.body?.nome || '').trim().slice(0, 120)

    if (!EMAIL_RE_CRM.test(email)) return res.status(400).json({ erro: 'E-mail inválido.' })
    if (senha.length < SENHA_MINIMA) {
      return res.status(400).json({ erro: `A senha precisa de ao menos ${SENHA_MINIMA} caracteres.` })
    }

    const u = await store.inserir('usuario', {
      nome: nome || 'Administrador VOW', email, papel: 'vow',
      senhaHash: hashSenha(senha), redes: [],
    })
    abrirSessao(res, { usuarioId: u.id, redeId: null })
    res.json({ ok: true, destino: '/app' })
  } catch (e) { next(e) }
})

/* ------------------------------------------------ esqueci minha senha */

/**
 * Pede o link de redefinição. A resposta é sempre a mesma, exista ou não o
 * e-mail — senão a tela vira um verificador de quem é cliente da VOW.
 */
app.post('/api/app/senha/esqueci', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const resposta = { ok: true, mensagem: 'Se este e-mail tiver acesso, o link chega em instantes. Ele vale por 1 hora.' }
    const usuario = await store.achar('usuario', (u) => u.email === email)
    if (!usuario) return res.json(resposta)

    const base = baseUrl(req)
    const link = `${base}/app/senha/${gerarLinkSenha(usuario)}`

    const peca = emailAcesso({ nome: usuario.nome, link, tipo: 'senha', minutos: 30 })
    const envio = await enviarEmail({ para: usuario.email, assunto: peca.assunto, html: peca.html, texto: peca.texto })
    // Sem e-mail configurado o link volta na resposta.
    if (!envio.enviado) resposta.link = link
    res.json(resposta)
  } catch (e) { next(e) }
})

app.get('/app/senha/:token', tela('senha'))

app.post('/api/app/senha/redefinir', async (req, res, next) => {
  try {
    const token = String(req.body?.token || '')
    const senha = String(req.body?.senha || '')

    // Descobre de quem é o token antes de validar a digital da senha.
    const bruto = token.split('.')[0]
    let usuarioId = null
    try {
      usuarioId = JSON.parse(Buffer.from(bruto, 'base64url').toString()).usuarioId
    } catch { /* token deformado cai no erro padrão abaixo */ }

    const usuario = usuarioId ? await store.porId('usuario', usuarioId) : null
    if (!lerLinkSenha(token, usuario)) {
      return res.status(400).json({ erro: 'Este link expirou ou já foi usado. Peça outro.' })
    }
    if (senha.length < SENHA_MINIMA) {
      return res.status(400).json({ erro: `A senha precisa de ao menos ${SENHA_MINIMA} caracteres.` })
    }

    // Trocar o hash invalida o próprio link que trouxe a pessoa até aqui.
    // E quem define a senha deixa de ser convidado: passou a usar a conta.
    await store.atualizar('usuario', usuario.id, {
      senhaHash: hashSenha(senha),
      status: usuario.status === 'convidado' ? 'ativo' : (usuario.status || 'ativo'),
    })
    abrirSessao(res, { usuarioId: usuario.id, redeId: null })
    res.json({ ok: true, destino: '/app' })
  } catch (e) { next(e) }
})

/**
 * Auto-cadastro do time VOW.
 *
 * Aberto na internet, então a trava é o domínio — e ela vive AQUI, no
 * servidor. A tela também confere, mas conferência de tela é conveniência:
 * quem chama a API direto não passa por ela.
 *
 * A resposta é sempre a mesma, exista ou não a conta. Senão a rota vira um
 * verificador de quem trabalha na VOW para qualquer um na internet.
 */
const DOMINIO_VOW = /@grupovow\.com\.br$/i

app.post('/api/app/cadastro', async (req, res, next) => {
  try {
    const nome = String(req.body?.nome || '').trim().slice(0, 120)
    const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 200)
    const neutra = { ok: true, mensagem: 'Se este e-mail puder ter acesso, o link de criação chega em instantes. Ele vale por 24 horas.' }

    if (!nome) return res.status(400).json({ erro: 'Informe o seu nome.' })
    if (!EMAIL_RE_CRM.test(email)) return res.status(400).json({ erro: 'E-mail inválido.' })
    // Domínio errado é o único caso que vale dizer em voz alta: não expõe
    // cadastro nenhum e evita a pessoa esperar um e-mail que não vem.
    if (!DOMINIO_VOW.test(email)) {
      return res.status(403).json({ erro: 'O acesso é restrito a e-mails @grupovow.com.br.' })
    }
    if (await store.achar('usuario', (u) => u.email === email)) return res.json(neutra)

    // Senha sorteada que ninguém conhece: a pessoa define a dela pelo link.
    const provisoria = crypto.randomBytes(18).toString('base64url')
    const u = await store.inserir('usuario', {
      nome, email, papel: 'vendedor', senhaHash: hashSenha(provisoria), redes: [],
      status: 'convidado', origem: 'auto-cadastro', convidadoEm: new Date().toISOString(),
    })

    const link = `${baseUrl(req)}/app/senha/${gerarLinkSenha({ id: u.id, senhaHash: u.senhaHash }, { convite: true })}`
    const peca = emailAcesso({ nome, link, tipo: 'senha', minutos: 24 * 60 })
    const envio = await enviarEmail({ para: email, assunto: peca.assunto, html: peca.html, texto: peca.texto })
    if (!envio.enviado) neutra.link = link
    res.json(neutra)
  } catch (e) { next(e) }
})

app.post('/api/app/sair', (_req, res) => {
  fecharSessao(res)
  res.json({ ok: true })
})

/* ------------------------------------------------ daqui pra baixo, logado */

app.use(['/app', '/api/app'], exigeLogin, carregaContexto)

app.get('/api/app/contexto', async (req, res, next) => {
  try {
    const redes = await Promise.all(req.redesPermitidas.map((id) => store.porId('rede', id)))
    res.json({
      usuario: { nome: req.usuario.nome, email: req.usuario.email, papel: req.usuario.papel },
      redes: redes.filter(Boolean).map((r) => ({ id: r.id, razao: r.razao, cnpj: r.cnpj, porte: r.porte, plano: r.plano, interna: r.interna === true })),
      redeAtual: req.rede ? { id: req.rede.id, razao: req.rede.razao } : null,
    })
  } catch (e) { next(e) }
})

/**
 * Cadastra uma rede cliente. Não havia como criar nenhuma pela plataforma: a
 * única origem era o script de seed, que não roda em produção. Quem entrasse
 * numa instalação limpa caía numa tela de escolher rede sem rede nenhuma para
 * escolher, e sem saída.
 */
app.post('/api/app/redes', async (req, res, next) => {
  try {
    if (req.usuario.papel !== 'vow') return res.status(403).json({ erro: 'acesso restrito' })
    const razao = String(req.body?.razao || '').trim().slice(0, 160)
    if (!razao) return res.status(400).json({ erro: 'Informe o nome da rede.' })

    const rede = await store.inserir('rede', {
      razao,
      cnpj: String(req.body?.cnpj || '').slice(0, 20),
      porte: String(req.body?.porte || '').slice(0, 60),
      plano: String(req.body?.plano || 'piloto').slice(0, 40),
      programaConformidade: req.body?.programaConformidade === true,
      // Cada rede carrega as premissas dela. Nunca hardcode premissa fora daqui.
      premissas: { aliquota: PREMISSAS.aliquota, parcelaCestaBasica: PREMISSAS.indiretos.parcelaCestaBasicaPadrao },
    })
    abrirSessao(res, { usuarioId: req.usuario.id, redeId: rede.id })
    res.json({ ok: true, id: rede.id, destino: '/app' })
  } catch (e) { next(e) }
})

app.get('/app/redes', (req, res, next) => {
  // Escolher rede só faz sentido para quem atende mais de uma. Com nenhuma,
  // a tela vira o cadastro da primeira.
  if (req.redesPermitidas.length === 1) return res.redirect('/app')
  tela('redes')(req, res, next)
})

app.post('/api/app/rede', async (req, res, next) => {
  try {
    const redeId = String(req.body?.redeId || '')
    if (!req.redesPermitidas.includes(redeId)) {
      return res.status(403).json({ erro: 'você não tem acesso a esta rede' })
    }
    abrirSessao(res, { usuarioId: req.usuario.id, redeId })
    res.json({ ok: true, destino: '/app' })
  } catch (e) { next(e) }
})

app.get('/app/inicio', exigeRede, tela('inicio'))

/**
 * A porta de entrada é o CRM da feira.
 *
 * O foco agora é a jornada do lead. Os três sistemas
 * (fornecedores, contratos, itens) continuam de pé e acessíveis pelo
 * endereço próprio, mas não disputam a abertura — abrir no onboarding de um
 * cliente que ainda não existe é ruído entre o consultor e o trabalho dele.
 */
app.get('/app', (_req, res) => res.redirect('/app/pipeline'))

/** O painel dos três sistemas, quando houver base de cliente para mostrar. */
app.get('/app/rede', exigeRede, async (req, res, next) => {
  try {
    // Rede sem base importada cai no onboarding, não num painel de zeros.
    const fornecedores = await store.listar('fornecedor', req.redeId)
    const itens = await store.listar('item', req.redeId)
    if (!fornecedores.length && !itens.length) return res.redirect('/app/inicio')
    tela('painel')(req, res, next)
  } catch (e) { next(e) }
})

app.get('/api/app/painel', exigeRede, async (req, res, next) => {
  try {
    const [fornecedores, contratos, itens, excecoes] = await Promise.all([
      store.listar('fornecedor', req.redeId),
      store.listar('contrato', req.redeId),
      store.listar('item', req.redeId),
      store.listar('excecao', req.redeId),
    ])
    res.json({
      rede: { razao: req.rede.razao, porte: req.rede.porte, plano: req.rede.plano },
      ...montarPainel({ rede: req.rede, fornecedores, contratos, itens, excecoes }),
    })
  } catch (e) { next(e) }
})

/** Referências que as telas usam para rotular sem duplicar regra. */
app.get('/api/app/referencias', (_req, res) =>
  res.json({ classesCredito: CLASSES_CREDITO, riscos: RISCOS, calendario: CALENDARIO }))

/* ======================================================================
 * CRM — a carteira comercial da VOW.
 *
 * Estas rotas NÃO pedem rede: lead é da VOW e só vira rede depois de
 * fechar. Por isso exigem login mas não passam por `exigeRede`.
 * ====================================================================== */

app.get('/api/app/crm/referencias', (_req, res) =>
  res.json({ estagios: ESTAGIOS, motivos: MOTIVOS_PERDA, tipos: TIPOS_INTERACAO, slaHoras: SLA_PRIMEIRO_CONTATO_H }))

app.get('/api/app/crm/pipeline', async (_req, res, next) => {
  try { res.json(montarPipeline(await lerLeads())) } catch (e) { next(e) }
})

app.get('/api/app/crm/hoje', async (_req, res, next) => {
  try { res.json(montarHoje(await lerLeads())) } catch (e) { next(e) }
})

app.get('/api/app/crm/resultado', async (req, res, next) => {
  try { res.json(montarResultado(await lerLeads(), req.query.desde)) } catch (e) { next(e) }
})

app.get('/api/app/crm/leads', async (req, res, next) => {
  try {
    const { estagio: filtroEstagio, origem, responsavel, q } = req.query
    const busca = String(q || '').trim().toLowerCase()
    const leads = (await lerLeads()).map(comCrm).filter((l) => {
      if (filtroEstagio && l.estagio !== filtroEstagio) return false
      if (origem && l.origem !== origem) return false
      if (responsavel && l.responsavel !== responsavel) return false
      if (busca && ![l.nome, l.empresa, l.email].some((v) => String(v || '').toLowerCase().includes(busca))) return false
      return true
    })
    res.json(leads.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)))
  } catch (e) { next(e) }
})

/**
 * Captura manual — o consultor no estande, com o cartão na mão.
 *
 * Mais permissivo que /api/lead de propósito: ali a pessoa simulou e o
 * e-mail é o que faz o diagnóstico chegar. Aqui basta um jeito de retornar,
 * e-mail ou telefone. Exigir o que não se tem faz o consultor inventar
 * endereço, e aí o lead nasce sujo.
 */
app.get('/api/app/crm/leads/:id', async (req, res, next) => {
  try {
    const lead = (await lerLeads()).find((l) => l.id === req.params.id)
    if (!lead) return res.status(404).json({ erro: 'lead não encontrado' })
    const interacoes = await store.listar('interacao', null, (i) => i.leadId === lead.id)
    res.json({
      lead: comCrm(lead),
      // A jornada lê as interações em ordem crescente; a linha do tempo, ao
      // contrário. Calcula antes de inverter.
      jornada: jornada(lead, [...interacoes].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))),
      // Mais recente primeiro: é o que a pessoa quer ler ao abrir.
      interacoes: interacoes.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
    })
  } catch (e) { next(e) }
})

/**
 * Toda mudança de fase deixa rastro na linha do tempo.
 *
 * `de` e `para` vão em campos próprios, não só embutidos no texto: é assim
 * que a jornada do lead pode ser reconstituída depois. Ler a frase de volta
 * com expressão regular seria frágil e quebraria na primeira vez que alguém
 * mudasse a redação.
 */
async function registrar(leadId, autor, texto, tipo = 'sistema', extra = {}) {
  return store.inserir('interacao', { leadId, tipo, autor, texto, ...extra })
}

app.patch('/api/app/crm/leads/:id', async (req, res, next) => {
  try {
    const leads = await lerLeads()
    const atual = leads.find((l) => l.id === req.params.id)
    if (!atual) return res.status(404).json({ erro: 'lead não encontrado' })

    const b = req.body || {}
    const mudancas = {}
    const autor = req.usuario.nome
    const notas = []
    let transicao = null

    if (b.estagio !== undefined) {
      if (!ehEstagio(b.estagio)) return res.status(400).json({ erro: 'fase desconhecida' })

      // Fechar sem honorário deixaria a receita fora do resultado, e ninguém
      // percebe um número que nunca foi digitado.
      const honorario = b.honorario ?? atual.honorario
      if (b.estagio === 'fechado' && !(Number(honorario) > 0)) {
        return res.status(400).json({ erro: 'Informe o honorário antes de marcar como fechado.' })
      }
      // Perder sem motivo torna o relatório de perdas inútil.
      const motivo = b.motivoPerda ?? atual.motivoPerda
      if (b.estagio === 'perdido' && !ehMotivo(motivo)) {
        return res.status(400).json({ erro: 'Escolha o motivo da perda.' })
      }

      if (b.estagio !== atual.estagio) {
        mudancas.estagio = b.estagio
        mudancas.estagioDesde = new Date().toISOString()
        if (b.estagio === 'fechado' || b.estagio === 'perdido') {
          mudancas.fechadoEm = new Date().toISOString()
        }
        // Sair de "capturado" é, por definição, ter falado com a pessoa —
        // e "abordado" é justamente esse momento, nomeado.
        if (b.estagio !== 'capturado' && !atual.primeiroContatoEm) {
          mudancas.primeiroContatoEm = new Date().toISOString()
        }
        transicao = { de: atual.estagio || 'capturado', para: b.estagio }
        notas.push(`Fase: ${estagio(atual.estagio).nome} → ${estagio(b.estagio).nome}`)
      }
    }

    if (b.responsavel !== undefined) {
      mudancas.responsavel = String(b.responsavel || '').slice(0, 120)
      if (mudancas.responsavel !== atual.responsavel) notas.push(`Responsável: ${mudancas.responsavel || 'ninguém'}`)
    }
    if (b.honorario !== undefined) {
      const v = b.honorario === null || b.honorario === '' ? null : Number(b.honorario)
      if (v !== null && (!Number.isFinite(v) || v < 0 || v > 1e9)) {
        return res.status(400).json({ erro: 'honorário inválido' })
      }
      mudancas.honorario = v
      if (v !== atual.honorario) notas.push(`Honorário: ${v === null ? 'em branco' : 'R$ ' + v.toLocaleString('pt-BR')}`)
    }
    if (b.probabilidade !== undefined) {
      const v = Number(b.probabilidade)
      if (!Number.isFinite(v) || v < 0 || v > 1) return res.status(400).json({ erro: 'probabilidade fora de 0 a 1' })
      mudancas.probabilidade = v
    }
    if (b.motivoPerda !== undefined) {
      if (b.motivoPerda && !ehMotivo(b.motivoPerda)) return res.status(400).json({ erro: 'motivo desconhecido' })
      mudancas.motivoPerda = b.motivoPerda || null
      if (b.motivoDetalhe !== undefined) mudancas.motivoDetalhe = String(b.motivoDetalhe || '').slice(0, 300)
    }
    if (b.proximaAcao !== undefined) {
      const a = b.proximaAcao
      mudancas.proximaAcao = a && a.texto
        ? { texto: String(a.texto).slice(0, 300), quando: String(a.quando || '').slice(0, 10) }
        : null
      if (mudancas.proximaAcao) notas.push(`Próxima ação: ${mudancas.proximaAcao.texto} (${mudancas.proximaAcao.quando || 'sem data'})`)
    }

    const salvo = await atualizarLead(req.params.id, mudancas)

    // Fechar não é o fim: é o começo da entrega. O projeto nasce junto para
    // ninguém precisar lembrar de criá-lo depois.
    if (mudancas.estagio === 'fechado') await abrirProjeto(salvo, autor)

    for (const n of notas) {
      // Só a linha da mudança de fase carrega de/para; as outras são notas.
      const eFase = transicao && n.startsWith('Fase:')
      await registrar(req.params.id, autor, n, 'sistema', eFase ? transicao : {})
    }
    res.json(comCrm(salvo))
  } catch (e) { next(e) }
})

app.post('/api/app/crm/leads/:id/interacoes', async (req, res, next) => {
  try {
    const lead = (await lerLeads()).find((l) => l.id === req.params.id)
    if (!lead) return res.status(404).json({ erro: 'lead não encontrado' })

    const tipo = String(req.body?.tipo || 'nota')
    if (!TIPOS_INTERACAO.includes(tipo)) return res.status(400).json({ erro: 'tipo de interação inválido' })
    const texto = String(req.body?.texto || '').trim()
    if (!texto) return res.status(400).json({ erro: 'escreva o que aconteceu' })

    const i = await registrar(req.params.id, req.usuario.nome, texto.slice(0, 2000), tipo)

    // Ligação, reunião ou e-mail registrado é o primeiro contato acontecendo.
    if (!lead.primeiroContatoEm && ['ligacao', 'reuniao', 'email', 'whatsapp'].includes(tipo)) {
      await atualizarLead(lead.id, { primeiroContatoEm: new Date().toISOString() })
    }
    res.json(i)
  } catch (e) { next(e) }
})

/* ======================================================================
 * Onde os dados moram, e o que só o consultor VOW pode fazer.
 * ====================================================================== */

/** Só quem administra enxerga a base inteira e apaga registro. */
function soVow(req, res, next) {
  if (!ehAdmin(req.usuario)) return res.status(403).json({ erro: 'acesso restrito' })
  next()
}

/* ======================================================================
 * QR do estande — leitura e configuração pelo CRM.
 * ====================================================================== */

app.get('/api/app/qr', async (_req, res, next) => {
  try {
    const qr = await store.achar('qr', (q) => q.codigo === 'abras')
    const leituras = await store.listar('leitura', null, (l) => l.codigo === 'abras')
    res.json({
      codigo: 'abras',
      url: qr?.url || null,
      criadoEm: qr?.criadoEm || null,
      // Só o instante: o hash de IP e o user-agent ficam no servidor.
      leituras: leituras.map((l) => l.em).sort(),
    })
  } catch (e) { next(e) }
})

app.put('/api/app/qr', soVow, async (req, res, next) => {
  try {
    const bruta = String(req.body?.url || '').trim()
    let url
    try {
      url = new URL(bruta)
      if (!/^https?:$/.test(url.protocol)) throw new Error()
    } catch {
      return res.status(400).json({ erro: 'Informe um endereço completo, com https://' })
    }

    const qr = await store.achar('qr', (q) => q.codigo === 'abras')
    // O código impresso não muda: só o destino. É por isso que o QR aponta
    // para /q/abras e nunca para a URL final.
    const salvo = qr
      ? await store.atualizar('qr', qr.id, { url: url.toString() })
      : await store.inserir('qr', { codigo: 'abras', url: url.toString(), criadoEm: new Date().toISOString() })
    res.json({ codigo: 'abras', url: salvo.url, criadoEm: salvo.criadoEm })
  } catch (e) { next(e) }
})

/* ======================================================================
 * Usuários da plataforma.
 * ====================================================================== */

app.get('/api/app/usuarios', soVow, async (_req, res, next) => {
  try {
    const us = await store.listar('usuario')
    // O hash da senha nunca sai daqui, nem para o próprio administrador.
    res.json(us.map(({ senhaHash, ...u }) => ({ ...u, status: u.status || 'ativo' }))
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome))))
  } catch (e) { next(e) }
})

app.post('/api/app/usuarios', soVow, async (req, res, next) => {
  try {
    const nome = String(req.body?.nome || '').trim().slice(0, 120)
    const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 200)
    const papel = String(req.body?.papel || 'vow')

    if (!nome) return res.status(400).json({ erro: 'Informe o nome.' })
    if (!EMAIL_RE_CRM.test(email)) return res.status(400).json({ erro: 'E-mail inválido.' })
    if (!PAPEIS.includes(papel)) return res.status(400).json({ erro: 'Papel inválido.' })
    if (await store.achar('usuario', (u) => u.email === email)) {
      return res.status(409).json({ erro: 'Já existe alguém com este e-mail.' })
    }

    /**
     * A senha é sorteada e nunca escolhida por quem convida: quem cria a
     * conta não deve saber a senha de quem vai usá-la. A pessoa recebe o
     * link para definir a dela, do mesmo jeito que no "esqueci minha senha".
     */
    const provisoria = crypto.randomBytes(18).toString('base64url')
    const u = await store.inserir('usuario', {
      nome, email, papel, senhaHash: hashSenha(provisoria), redes: [],
      status: 'convidado', convidadoPor: req.usuario.nome, convidadoEm: new Date().toISOString(),
    })

    const base = baseUrl(req)
    const link = `${base}/app/senha/${gerarLinkSenha({ id: u.id, senhaHash: u.senhaHash })}`
    const peca = emailAcesso({ nome, link, tipo: 'senha', minutos: 30 })
    const envio = await enviarEmail({ para: email, assunto: peca.assunto, html: peca.html, texto: peca.texto })

    const { senhaHash, ...limpo } = u
    // Sem e-mail configurado, o link volta para quem convidou repassar.
    res.json({ ...limpo, status: 'convidado', emailEnviado: envio.enviado, link: envio.enviado ? null : link })
  } catch (e) { next(e) }
})

app.patch('/api/app/usuarios/:id', soVow, async (req, res, next) => {
  try {
    const u = await store.porId('usuario', req.params.id)
    if (!u) return res.status(404).json({ erro: 'usuário não encontrado' })

    // A conta do dono não é editável por ninguém — nem por ela mesma. É o que
    // garante que sempre exista alguém capaz de destravar a plataforma.
    if (u.fixo) return res.status(409).json({ erro: 'A conta do dono da plataforma é protegida.' })

    const mudancas = {}
    if (req.body?.papel !== undefined) {
      if (!PAPEIS.includes(req.body.papel)) return res.status(400).json({ erro: 'Papel inválido.' })
      // Só o dono cria outro dono: um administrador não se promove sozinho.
      if (req.body.papel === 'deus' && !ehDono(req.usuario)) {
        return res.status(403).json({ erro: 'Só o dono da plataforma define outro dono.' })
      }
      // Trancar-se para fora é irreversível sem shell: o último admin fica.
      if (u.id === req.usuario.id && !ehAdmin({ papel: req.body.papel })) {
        return res.status(409).json({ erro: 'Você não pode tirar o próprio acesso de administrador.' })
      }
      mudancas.papel = req.body.papel
    }
    if (req.body?.status !== undefined) {
      if (!STATUS.includes(req.body.status)) return res.status(400).json({ erro: 'Situação inválida.' })
      if (u.id === req.usuario.id && req.body.status === 'inativo') {
        return res.status(409).json({ erro: 'Você não pode desativar a própria conta.' })
      }
      mudancas.status = req.body.status
    }
    const salvo = await store.atualizar('usuario', u.id, mudancas)
    const { senhaHash, ...limpo } = salvo
    res.json({ ...limpo, status: limpo.status || 'ativo' })
  } catch (e) { next(e) }
})

app.get('/app/usuarios', tela('usuarios'))
app.get('/app/qr', tela('qr'))

/**
 * Protótipo do CRM no Brandguide. Fica sob /app porque é ali que a guarda de
 * sessão está montada — mostra a estrutura da carteira, mesmo com dados de
 * demonstração.
 */
app.get('/app/crm', (_req, res) =>
  res.sendFile(path.join(RAIZ, 'public', 'abras', 'crm.dc.html')))



/**
 * Exclui um lead e tudo que pende dele.
 *
 * Só o consultor VOW. É irreversível de propósito: arquivar seria mais
 * seguro, mas base de feira enche de teste e de duplicata, e uma carteira
 * que só cresce deixa de ser confiável para decidir a quem ligar.
 *
 * O projeto de entrega, se existir, NÃO é apagado junto: ele é trabalho
 * contratado e sobrevive ao registro comercial que o originou.
 */
app.delete('/api/app/crm/leads/:id', soVow, async (req, res, next) => {
  try {
    const lead = (await lerLeads()).find((l) => l.id === req.params.id)
    if (!lead) return res.status(404).json({ erro: 'lead não encontrado' })

    const projeto = await store.achar('projeto', (p) => p.leadId === lead.id)
    if (projeto) {
      return res.status(409).json({
        erro: 'Este lead virou projeto de entrega. Exclua o projeto antes, se for mesmo o caso.',
      })
    }

    const interacoes = await store.listar('interacao', null, (i) => i.leadId === lead.id)
    for (const i of interacoes) await store.remover('interacao', i.id)
    await removerLead(lead.id)
    res.json({ ok: true, removidas: interacoes.length })
  } catch (e) { next(e) }
})

/* ======================================================================
 * Projetos — o que começa quando a jornada comercial termina.
 * ====================================================================== */

app.get('/api/app/projetos', async (_req, res, next) => {
  try {
    const projetos = await store.listar('projeto')
    res.json(projetos
      .map((p) => ({ ...p, resumo: resumo(p) }))
      .sort((a, b) => String(b.iniciadoEm).localeCompare(String(a.iniciadoEm))))
  } catch (e) { next(e) }
})

app.get('/api/app/projetos/:id', async (req, res, next) => {
  try {
    const p = await store.porId('projeto', req.params.id)
    if (!p) return res.status(404).json({ erro: 'projeto não encontrado' })
    const lead = (await lerLeads()).find((l) => l.id === p.leadId) || null
    res.json({ projeto: p, resumo: resumo(p), lead: lead ? comCrm(lead) : null })
  } catch (e) { next(e) }
})

/** Cria o projeto de um lead fechado. Um por lead. */
async function abrirProjeto(lead, autor) {
  const existente = await store.achar('projeto', (p) => p.leadId === lead.id)
  if (existente) return existente
  const projeto = await store.inserir('projeto', montarProjeto(lead, { responsavel: lead.responsavel || autor }))
  await registrar(lead.id, autor, `Projeto de entrega aberto: ${projeto.etapas.length} etapas`)
  return projeto
}

app.post('/api/app/crm/leads/:id/projeto', async (req, res, next) => {
  try {
    const lead = (await lerLeads()).find((l) => l.id === req.params.id)
    if (!lead) return res.status(404).json({ erro: 'lead não encontrado' })
    if (lead.estagio !== 'fechado') {
      return res.status(409).json({ erro: 'O projeto começa quando o negócio fecha.' })
    }
    res.json(await abrirProjeto(lead, req.usuario.nome))
  } catch (e) { next(e) }
})

/**
 * Atualiza uma etapa. Responsável, prazo e objetivo são editáveis: o padrão
 * é ponto de partida, não decisão tomada.
 */
app.patch('/api/app/projetos/:id/etapas/:etapaId', async (req, res, next) => {
  try {
    const projeto = await store.porId('projeto', req.params.id)
    if (!projeto) return res.status(404).json({ erro: 'projeto não encontrado' })
    const etapa = projeto.etapas.find((e) => e.id === req.params.etapaId)
    if (!etapa) return res.status(404).json({ erro: 'etapa não encontrada' })

    const b = req.body || {}
    if (b.status !== undefined) {
      if (!ehStatusEtapa(b.status)) return res.status(400).json({ erro: 'situação inválida' })
      etapa.status = b.status
      etapa.concluidaEm = b.status === 'concluída' ? new Date().toISOString() : null
    }
    if (b.responsavel !== undefined) etapa.responsavel = String(b.responsavel || '').slice(0, 120) || null
    if (b.prazo !== undefined) etapa.prazo = String(b.prazo || '').slice(0, 10) || null
    if (b.objetivo !== undefined) {
      const v = Number(b.objetivo)
      if (!Number.isFinite(v) || v < 0) return res.status(400).json({ erro: 'objetivo inválido' })
      etapa.objetivo = v
    }

    // Projeto com todas as etapas fechadas está entregue.
    const todasFeitas = projeto.etapas.every((e) => e.status === 'concluída')
    const salvo = await store.atualizar('projeto', projeto.id, {
      etapas: projeto.etapas,
      status: todasFeitas ? 'entregue' : 'em andamento',
      entregueEm: todasFeitas ? new Date().toISOString() : null,
    })
    res.json({ projeto: salvo, resumo: resumo(salvo) })
  } catch (e) { next(e) }
})

/* ------------------------------------------------------------ telas CRM */
app.get('/app/dados', tela('dados'))
app.get('/app/projetos', tela('projetos'))
app.get('/app/projetos/:id', tela('projeto'))
app.get('/app/pipeline', tela('pipeline'))
app.get('/app/hoje', tela('hoje'))
app.get('/app/resultado', tela('resultado'))
app.get('/app/leads', tela('leads'))
app.get('/app/leads/:id', tela('lead'))
