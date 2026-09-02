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
import { lerLeads, atualizarLead, gravarLead, porCapturaId } from '../leads-db.js'
import { temPostgres } from '../db.js'
import { protegido } from '../basic-auth.js'
import { diagnosticar, PREMISSAS } from '../motor.js'
import { enviarEmail, emailAcesso } from '../email.js'
import {
  ESTAGIOS, MOTIVOS_PERDA, TIPOS_INTERACAO, SLA_PRIMEIRO_CONTATO_H,
  comCrm, ehEstagio, ehMotivo, estagio, montarPipeline, montarResultado, montarHoje,
} from '../crm.js'

import { montarPainel, CLASSES_CREDITO, RISCOS, CALENDARIO } from '../painel.js'
import {
  abrirSessao, fecharSessao, carregaContexto, conferirSenha, hashSenha,
  exigeLogin, exigeRede, gerarLinkMagico, lerLinkMagico, lerSessao,
  gerarLinkSenha, lerLinkSenha, SENHA_MINIMA,
} from '../auth.js'

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const tela = (nome) => (_req, res) => res.sendFile(path.join(RAIZ, 'public', `app-${nome}.html`))

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

    // Mesma resposta para e-mail inexistente e senha errada: não confirma
    // quem é cliente da VOW para quem está testando de fora.
    if (!usuario || !conferirSenha(senha, usuario.senhaHash)) {
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
    if (!usuario) return res.json(resposta)

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
    const resposta = { ok: true, mensagem: 'Se este e-mail tiver acesso, o link chega em instantes. Ele vale por 30 minutos.' }
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
    await store.atualizar('usuario', usuario.id, { senhaHash: hashSenha(senha) })
    abrirSessao(res, { usuarioId: usuario.id, redeId: null })
    res.json({ ok: true, destino: '/app' })
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

app.get('/app', async (req, res, next) => {
  // Consultor sem nenhuma rede cliente ainda tem trabalho: a carteira de
  // leads é da VOW e não depende de tenant. Mandar para o funil é melhor do
  // que travar numa tela de escolher rede que não tem o que escolher.
  if (!req.redesPermitidas.length) return res.redirect('/app/pipeline')
  next()
}, exigeRede, async (req, res, next) => {
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
/** Erro de validação: reenviar não conserta, então a fila offline descarta. */
function recusa(mensagem) {
  return Object.assign(new Error(mensagem), { definitivo: true })
}

/**
 * Cria um lead capturado à mão. Usada pela rota e pela sincronização da fila
 * offline — as duas precisam das mesmas regras, e duplicar isso seria a
 * forma mais fácil de o app de campo e o navegador discordarem.
 *
 * Mais permissiva que /api/lead de propósito: ali a pessoa simulou e o
 * e-mail é o que faz o diagnóstico chegar. Aqui basta um jeito de retornar.
 * Exigir o que não se tem faz o consultor inventar endereço.
 */
export async function capturar(b, usuario) {
  const nome = String(b.nome || '').trim().slice(0, 120)
  const empresa = String(b.empresa || '').trim().slice(0, 160)
  const email = String(b.email || '').trim().slice(0, 200)
  const telefone = String(b.telefone || '').trim().slice(0, 40)

  if (!nome && !empresa) throw recusa('Informe ao menos o nome ou a rede.')
  if (!email && !telefone) throw recusa('Informe e-mail ou telefone — sem isso não há como retornar.')
  if (email && !EMAIL_RE_CRM.test(email)) throw recusa('E-mail inválido.')

  /**
   * `capturaId` é gerado no aparelho antes de existir rede. Quando a fila
   * offline reenvia — e ela reenvia, é para isso que existe — o mesmo id
   * chega de novo e devolvemos o lead que já foi criado. Sem isto, um
   * consultor com sinal ruim cadastra a mesma pessoa quatro vezes.
   */
  const capturaId = String(b.capturaId || '').slice(0, 64)
  if (capturaId) {
    const jaExiste = await porCapturaId(capturaId)
    if (jaExiste) return { ...comCrm(jaExiste), duplicado: true }
  }

  // O diagnóstico é opcional: quem só deixou o cartão entra sem número, e o
  // valor em jogo aparece como zero até alguém simular por ele.
  let diagnosticos = []
  const faturamento = Number(b.faturamento)
  if (Number.isFinite(faturamento) && faturamento > 0) {
    const tipos = Array.isArray(b.tipos) && b.tipos.length ? b.tipos : ['revenda']
    if (tipos.some((t) => t !== 'revenda' && t !== 'indiretos')) throw recusa('Tipo de diagnóstico inválido.')
    diagnosticos = tipos.map((t) => {
      const d = diagnosticar(t, { faturamento })
      return { tipo: d.tipo, destaque: d.destaque, entrada: d.entrada }
    })
  }

  const id = crypto.randomUUID()
  const agora = new Date().toISOString()
  // Vale o instante em que o consultor capturou, não o em que a rede voltou.
  const capturadoEm = b.capturadoEm && !Number.isNaN(Date.parse(b.capturadoEm)) ? b.capturadoEm : agora

  const lead = {
    id, capturaId: capturaId || null, criadoEm: capturadoEm, sincronizadoEm: agora,
    nome, empresa, email, telefone,
    cnpj: String(b.cnpj || '').slice(0, 20),
    origem: b.origem === 'site' ? 'site' : 'abras',
    faturamento: Number.isFinite(faturamento) && faturamento > 0 ? faturamento : 0,
    fezOsDois: diagnosticos.length > 1,
    diagnosticos,
    agendar: b.agendar === true,
    email_enviado: false,
    // Capturado por alguém da VOW é, por definição, contato feito.
    primeiroContatoEm: capturadoEm,
    estagio: 'capturado', estagioDesde: capturadoEm,
    responsavel: String(b.responsavel || usuario.nome).slice(0, 120),
    capturadoPor: usuario.nome,
  }
  await gravarLead(lead)

  const nota = String(b.nota || '').trim()
  if (nota) await registrar(id, usuario.nome, nota.slice(0, 2000), 'nota')
  await registrar(id, usuario.nome, `Capturado no ${lead.origem === 'abras' ? 'estande' : 'site'} por ${usuario.nome}`)
  return comCrm(lead)
}

app.post('/api/app/crm/leads', async (req, res, next) => {
  try {
    res.json(await capturar(req.body || {}, req.usuario))
  } catch (e) {
    if (e.definitivo) return res.status(400).json({ erro: e.message })
    next(e)
  }
})

app.get('/api/app/crm/leads/:id', async (req, res, next) => {
  try {
    const lead = (await lerLeads()).find((l) => l.id === req.params.id)
    if (!lead) return res.status(404).json({ erro: 'lead não encontrado' })
    const interacoes = await store.listar('interacao', null, (i) => i.leadId === lead.id)
    res.json({
      lead: comCrm(lead),
      // Mais recente primeiro: é o que a pessoa quer ler ao abrir.
      interacoes: interacoes.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
    })
  } catch (e) { next(e) }
})

/** Toda mudança de fase deixa rastro na linha do tempo. */
async function registrar(leadId, autor, texto, tipo = 'sistema') {
  return store.inserir('interacao', { leadId, tipo, autor, texto })
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
        // Sair de "capturado" é, por definição, ter falado com a pessoa.
        if (atual.estagio === undefined || atual.estagio === 'capturado') {
          if (b.estagio !== 'capturado' && !atual.primeiroContatoEm) {
            mudancas.primeiroContatoEm = new Date().toISOString()
          }
        }
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
    for (const n of notas) await registrar(req.params.id, autor, n)
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

/**
 * Sincroniza a fila offline. Cada item é tratado isoladamente: um que falha
 * não derruba os outros, e o aparelho só apaga da fila o que voltou com `ok`.
 */
app.post('/api/app/crm/sync', async (req, res, next) => {
  try {
    const fila = Array.isArray(req.body?.fila) ? req.body.fila.slice(0, 200) : []
    const resultados = []
    for (const item of fila) {
      try {
        const r = await capturar(item, req.usuario)
        resultados.push({ capturaId: item.capturaId, ok: true, id: r.id, duplicado: r.duplicado === true })
      } catch (e) {
        // Erro de validação é definitivo: reenviar não conserta. O aparelho
        // tira da fila e mostra para o consultor corrigir.
        resultados.push({ capturaId: item.capturaId, ok: false, erro: e.message, definitivo: e.definitivo === true })
      }
    }
    res.json({ resultados })
  } catch (e) { next(e) }
})

/** Painel do estande: quem acabou de simular no totem, para abordar na hora. */
app.get('/api/app/crm/feira', async (req, res, next) => {
  try {
    const minutos = Math.min(Number(req.query.minutos) || 120, 1440)
    const corte = Date.now() - minutos * 60e3
    const todos = await lerLeads()
    const recentes = todos
      .filter((l) => new Date(l.criadoEm).getTime() >= corte)
      .map(comCrm)
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))

    const hoje = new Date().toISOString().slice(0, 10)
    const doDia = todos.filter((l) => l.criadoEm.slice(0, 10) === hoje)
    res.json({
      recentes,
      // Quem veio do totem e ninguém tocou ainda é o que o consultor precisa
      // ver: a pessoa ainda está no pavilhão.
      naoAbordados: recentes.filter((l) => l.origem === 'abras' && !l.primeiroContatoEm).length,
      hoje: {
        total: doDia.length,
        totem: doDia.filter((l) => l.origem === 'abras').length,
        pediramConversa: doDia.filter((l) => l.agendar).length,
        valorEmJogo: doDia.reduce((s, l) => s + (l.diagnosticos || []).reduce((a, d) => a + (d.destaque || 0), 0), 0),
      },
    })
  } catch (e) { next(e) }
})

/* ======================================================================
 * Onde os dados moram.
 *
 * Não há serviço de banco: a persistência é JSON em disco, como o brief
 * mandou para o piloto. Isso é invisível no painel do Render, o que faz
 * parecer que não há dado nenhum. Estas rotas mostram o que existe, quanto
 * ocupa e desde quando — e deixam baixar para conferir ou guardar cópia.
 * ====================================================================== */

/** Só o consultor VOW enxerga a base inteira. */
function soVow(req, res, next) {
  if (req.usuario.papel !== 'vow') return res.status(403).json({ erro: 'acesso restrito' })
  next()
}

app.get('/api/app/dados', soVow, async (_req, res, next) => {
  try {
    const leads = await lerLeads()
    const colecoes = {}
    for (const c of ['rede', 'usuario', 'fornecedor', 'verificacao', 'item', 'contrato', 'excecao', 'interacao']) {
      try {
        colecoes[c] = (await store.listar(c, null)).length
      } catch {
        // Coleção por tenant não pode ser contada sem rede — e não deve.
        colecoes[c] = null
      }
    }
    res.json({
      tipo: temPostgres() ? 'Postgres' : 'memória do processo',
      // Sem banco, a plataforma perde tudo no próximo deploy. Isso precisa
      // gritar na tela, não ficar escondido num log.
      persistente: temPostgres(),
      leads: {
        total: leads.length,
        porOrigem: { abras: leads.filter((l) => l.origem === 'abras').length,
                     site: leads.filter((l) => l.origem !== 'abras').length },
        maisAntigo: leads.length ? leads.reduce((a, b) => a.criadoEm < b.criadoEm ? a : b).criadoEm : null,
        maisRecente: leads.length ? leads.reduce((a, b) => a.criadoEm > b.criadoEm ? a : b).criadoEm : null,
      },
      colecoes,
    })
  } catch (e) { next(e) }
})

/** Baixa a base para conferência ou cópia. Hash de senha nunca sai daqui. */
app.get('/api/app/dados/:qual.json', soVow, async (req, res, next) => {
  try {
    let dados
    if (req.params.qual === 'leads') {
      dados = await lerLeads()
    } else if (req.params.qual === 'plataforma') {
      dados = {}
      for (const c of ['rede', 'usuario', 'interacao']) {
        dados[c] = await store.listar(c, null)
      }
      dados.usuario = dados.usuario.map((u) => ({ ...u, senhaHash: '[redigido]' }))
    } else {
      return res.status(404).json({ erro: 'arquivo desconhecido' })
    }
    res.set('Content-Disposition', `attachment; filename="vow-${req.params.qual}-${new Date().toISOString().slice(0, 10)}.json"`)
    res.type('application/json').send(JSON.stringify(dados, null, 2))
  } catch (e) { next(e) }
})

/* ------------------------------------------------------------ telas CRM */
app.get('/app/capturar', tela('capturar'))
app.get('/app/feira', tela('feira'))
app.get('/app/dados', tela('dados'))
app.get('/app/pipeline', tela('pipeline'))
app.get('/app/hoje', tela('hoje'))
app.get('/app/resultado', tela('resultado'))
app.get('/app/leads', tela('leads'))
app.get('/app/leads/:id', tela('lead'))
