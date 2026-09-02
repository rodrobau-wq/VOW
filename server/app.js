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
import { lerLeads, atualizarLead, gravarLead } from '../leads-db.js'
import { diagnosticar } from '../motor.js'
import {
  ESTAGIOS, MOTIVOS_PERDA, TIPOS_INTERACAO, SLA_PRIMEIRO_CONTATO_H,
  comCrm, ehEstagio, ehMotivo, estagio, montarPipeline, montarResultado, montarHoje,
} from '../crm.js'
import { baseUrl } from '../lib-url.js'
import { montarPainel, CLASSES_CREDITO, RISCOS, CALENDARIO } from '../painel.js'
import {
  abrirSessao, fecharSessao, carregaContexto, conferirSenha,
  exigeLogin, exigeRede, gerarLinkMagico, lerLinkMagico, lerSessao,
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

    if (!process.env.RESEND_API_KEY) resposta.link = link
    else {
      const { Resend } = await import('resend')
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.MAIL_FROM || 'VOW <onboarding@resend.dev>',
        to: [usuario.email],
        subject: 'Seu acesso à plataforma VOW',
        text: `Entre pelo link abaixo. Ele vale por 15 minutos.\n\n${link}\n\nSe não foi você, ignore.`,
      })
    }
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
      redes: redes.filter(Boolean).map((r) => ({ id: r.id, razao: r.razao, cnpj: r.cnpj, porte: r.porte, plano: r.plano })),
      redeAtual: req.rede ? { id: req.rede.id, razao: req.rede.razao } : null,
    })
  } catch (e) { next(e) }
})

app.get('/app/redes', (req, res, next) => {
  // Escolher rede só faz sentido para quem atende mais de uma.
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

app.get('/app', exigeRede, async (req, res, next) => {
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
app.post('/api/app/crm/leads', async (req, res, next) => {
  try {
    const b = req.body || {}
    const nome = String(b.nome || '').trim().slice(0, 120)
    const empresa = String(b.empresa || '').trim().slice(0, 160)
    const email = String(b.email || '').trim().slice(0, 200)
    const telefone = String(b.telefone || '').trim().slice(0, 40)

    if (!nome && !empresa) return res.status(400).json({ erro: 'Informe ao menos o nome ou a rede.' })
    if (!email && !telefone) return res.status(400).json({ erro: 'Informe e-mail ou telefone — sem isso não há como retornar.' })
    if (email && !EMAIL_RE_CRM.test(email)) return res.status(400).json({ erro: 'E-mail inválido.' })

    // O diagnóstico é opcional: quem só deixou o cartão entra sem número, e
    // o valor em jogo aparece como zero até alguém simular por ele.
    let diagnosticos = []
    const faturamento = Number(b.faturamento)
    if (Number.isFinite(faturamento) && faturamento > 0) {
      const tipos = Array.isArray(b.tipos) && b.tipos.length ? b.tipos : ['revenda']
      if (tipos.some((t) => t !== 'revenda' && t !== 'indiretos')) {
        return res.status(400).json({ erro: 'tipo de diagnóstico inválido' })
      }
      diagnosticos = tipos.map((t) => {
        const d = diagnosticar(t, { faturamento })
        return { tipo: d.tipo, destaque: d.destaque, entrada: d.entrada }
      })
    }

    const id = crypto.randomUUID()
    const agora = new Date().toISOString()
    const lead = {
      id, criadoEm: agora,
      nome, empresa, email, telefone,
      cnpj: String(b.cnpj || '').slice(0, 20),
      origem: b.origem === 'site' ? 'site' : 'abras',
      faturamento: Number.isFinite(faturamento) && faturamento > 0 ? faturamento : 0,
      fezOsDois: diagnosticos.length > 1,
      diagnosticos,
      agendar: b.agendar === true,
      email_enviado: false,
      // Capturado por alguém da VOW é, por definição, contato feito.
      primeiroContatoEm: agora,
      estagio: 'capturado', estagioDesde: agora,
      responsavel: String(b.responsavel || req.usuario.nome).slice(0, 120),
      capturadoPor: req.usuario.nome,
    }
    await gravarLead(lead)

    const nota = String(b.nota || '').trim()
    if (nota) await registrar(id, req.usuario.nome, nota.slice(0, 2000), 'nota')
    await registrar(id, req.usuario.nome, `Capturado no ${lead.origem === 'abras' ? 'estande' : 'site'} por ${req.usuario.nome}`)

    res.json(comCrm(lead))
  } catch (e) { next(e) }
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

/* ------------------------------------------------------------ telas CRM */
app.get('/app/capturar', tela('capturar'))
app.get('/app/pipeline', tela('pipeline'))
app.get('/app/hoje', tela('hoje'))
app.get('/app/resultado', tela('resultado'))
app.get('/app/leads', tela('leads'))
app.get('/app/leads/:id', tela('lead'))
