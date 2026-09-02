/**
 * VOW · ABRAS — API do totem e da plataforma de leads.
 *
 *   GET  /                 landing pública com os diagnósticos gratuitos
 *   GET  /totem            totem da feira — protótipo de design (public/abras)
 *   GET  /totem-v1         totem codado, com gravação de lead no servidor
 *   GET  /diagnostico      simulador AS IS -> TO BE (diagnóstico gratuito da landing)
 *   GET  /app/*            plataforma SaaS (ver server/app.js)
 *   GET  /leads            plataforma de leads (protegida por Basic Auth)
 *   POST /api/simular      roda o motor, sem gravar nada
 *   POST /api/lead         grava o lead, dispara o e-mail, devolve o QR
 *   GET  /api/leads        lista os leads (protegida)
 *   GET  /api/leads.csv    exporta a carteira (protegida)
 *   GET  /d/:id            página do diagnóstico — é o destino do QR code
 *   GET  /healthz          health check do Render
 */
import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import { baseUrl } from '../lib-url.js'

import { diagnosticar, PREMISSAS, PORTES } from '../motor.js'
import { enviarDiagnostico, montarHtml } from '../email.js'
import { app as rotasApp } from './app.js'
import { lerLeads, gravarLead, caminhoDb } from '../leads-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.join(__dirname, '..')

const app = express()
app.use(express.json({ limit: '256kb' }))
app.disable('x-powered-by')

/* ------------------------------------------------------------------- auth */
function protegido(req, res, next) {
  const user = process.env.LEADS_USER
  const pass = process.env.LEADS_PASSWORD
  if (!user || !pass) return next() // sem credenciais configuradas, fica aberto

  const [tipo, b64] = (req.headers.authorization || '').split(' ')
  if (tipo === 'Basic' && b64) {
    const [u, p] = Buffer.from(b64, 'base64').toString().split(':')
    // timingSafeEqual exige buffers do mesmo tamanho — hash antes de comparar.
    const h = (s) => crypto.createHash('sha256').update(String(s)).digest()
    if (crypto.timingSafeEqual(h(u), h(user)) && crypto.timingSafeEqual(h(p), h(pass))) return next()
  }
  res.set('WWW-Authenticate', 'Basic realm="VOW Leads"').status(401).send('Acesso restrito')
}

/* --------------------------------------------------------------- validação */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function lerEntrada(body) {
  const faturamento = Number(body?.faturamento)
  if (!Number.isFinite(faturamento) || faturamento <= 0 || faturamento > 1e12) {
    throw Object.assign(new Error('faturamento inválido'), { status: 400 })
  }
  const num = (v, min, max) => {
    if (v === undefined || v === null || v === '') return undefined
    const n = Number(v)
    if (!Number.isFinite(n) || n < min || n > max) {
      throw Object.assign(new Error('premissa fora da faixa'), { status: 400 })
    }
    return n
  }
  // Calibração do simulador: quais famílias o varejista tem e com que peso.
  // Nomes desconhecidos são ignorados pelo motor, então basta limitar tamanho.
  const ativas = Array.isArray(body.ativas) && body.ativas.length
    ? body.ativas.slice(0, 40).map((n) => String(n).slice(0, 60))
    : undefined
  let pesos
  if (body.pesos && typeof body.pesos === 'object') {
    pesos = {}
    for (const [nome, valor] of Object.entries(body.pesos).slice(0, 40)) {
      const v = Number(valor)
      if (Number.isFinite(v) && v >= 0 && v <= 100) pesos[String(nome).slice(0, 60)] = v
    }
  }

  return {
    faturamento,
    percentualVerba: num(body.percentualVerba, 0, 0.2),
    percentualBase: num(body.percentualBase, 0, 0.6),
    parcelaCestaBasica: num(body.parcelaCestaBasica, 0, 1),
    ativas,
    pesos,
  }
}

/* -------------------------------------------------------------------- API */
app.get('/healthz', (_req, res) => res.json({ ok: true, uptime: process.uptime() }))

app.get('/api/premissas', (_req, res) => res.json({ premissas: PREMISSAS, portes: PORTES }))

app.post('/api/simular', (req, res, next) => {
  try {
    const tipo = req.body?.tipo
    if (tipo !== 'revenda' && tipo !== 'indiretos') {
      return res.status(400).json({ erro: 'tipo deve ser revenda ou indiretos' })
    }
    res.json(diagnosticar(tipo, lerEntrada(req.body)))
  } catch (e) {
    next(e)
  }
})

app.post('/api/lead', async (req, res, next) => {
  try {
    const { nome, empresa, email, telefone, tipos, origem, cnpj, agendar } = req.body || {}
    if (!email || !EMAIL_RE.test(String(email))) {
      return res.status(400).json({ erro: 'e-mail inválido' })
    }
    const lista = Array.isArray(tipos) && tipos.length ? tipos : ['revenda']
    if (lista.some((t) => t !== 'revenda' && t !== 'indiretos')) {
      return res.status(400).json({ erro: 'tipo inválido' })
    }

    // O cadastro vem antes da simulação: sem faturamento ainda, o lead nasce
    // sem diagnóstico. Quem abandona no slider continua sendo um lead.
    const temNumero = Number(req.body?.faturamento) > 0
    const entrada = temNumero ? lerEntrada(req.body) : null
    const diagnosticos = temNumero ? lista.map((t) => diagnosticar(t, entrada)) : []

    const id = crypto.randomUUID()
    const lead = {
      id,
      criadoEm: new Date().toISOString(),
      nome: String(nome || '').slice(0, 120),
      empresa: String(empresa || '').slice(0, 160),
      email: String(email).slice(0, 200),
      telefone: String(telefone || '').slice(0, 40),
      cnpj: String(cnpj || '').slice(0, 20),
      // Pedido de conversa é a fila comercial: vale mais que o lead cru.
      agendar: agendar === true,
      // De onde veio: 'abras' no estande, 'site' na landing. É o corte que o
      // comercial mais usa depois da feira.
      origem: String(origem || 'site').slice(0, 40),
      faturamento: entrada ? entrada.faturamento : 0,
      // "fez os dois" é o sinal comercial que a plataforma exibe.
      fezOsDois: diagnosticos.length > 1,
      estagio: 'capturado',
      estagioDesde: new Date().toISOString(),
      diagnosticos: diagnosticos.map((d) => ({ tipo: d.tipo, destaque: d.destaque, entrada: d.entrada })),
      email_enviado: false,
    }

    if (!diagnosticos.length) {
      await gravarLead(lead)
      return res.json({ id, url: null, qr: null, emailEnviado: false, diagnosticos: [] })
    }

    const envio = await enviarDiagnostico({ para: lead.email, nome: lead.nome, empresa: lead.empresa, diagnosticos })
    lead.email_enviado = envio.enviado
    if (!envio.enviado) lead.email_erro = envio.motivo

    await gravarLead(lead)

    // QR só é montado quando o lead existe — aponta para a página do resultado.
    const base = baseUrl(req)
    const url = `${base}/d/${id}`
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: '#14120F', light: '#FFFFFF' } })

    res.json({ id, url, qr, emailEnviado: envio.enviado, diagnosticos })
  } catch (e) {
    next(e)
  }
})

/**
 * Anexa o diagnóstico a um lead já capturado, dispara o e-mail e devolve o QR.
 *
 * Existe porque o cadastro vem antes da simulação: o lead nasce no passo 1 e
 * só ganha número no passo 3. Refazer a simulação sobrescreve — é o mesmo
 * lead ajustando a calibração, não um lead novo.
 */
app.post('/api/lead/:id/diagnostico', async (req, res, next) => {
  try {
    const leads = await lerLeads()
    const lead = leads.find((l) => l.id === req.params.id)
    if (!lead) return res.status(404).json({ erro: 'lead não encontrado' })

    const tipos = Array.isArray(req.body?.tipos) && req.body.tipos.length ? req.body.tipos : ['revenda']
    if (tipos.some((t) => t !== 'revenda' && t !== 'indiretos')) {
      return res.status(400).json({ erro: 'tipo inválido' })
    }
    const entrada = lerEntrada(req.body)
    const diagnosticos = tipos.map((t) => diagnosticar(t, entrada))

    Object.assign(lead, {
      faturamento: entrada.faturamento,
      fezOsDois: diagnosticos.length > 1,
      diagnosticos: diagnosticos.map((d) => ({ tipo: d.tipo, destaque: d.destaque, entrada: d.entrada })),
      agendar: req.body?.agendar === true || lead.agendar === true,
    })

    const envio = await enviarDiagnostico({
      para: lead.email, nome: lead.nome, empresa: lead.empresa, diagnosticos,
    })
    lead.email_enviado = envio.enviado
    if (!envio.enviado) lead.email_erro = envio.motivo
    await gravarLead(lead)

    const base = baseUrl(req)
    const url = `${base}/d/${lead.id}`
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: '#0E1B14', light: '#FFFFFF' } })
    res.json({ id: lead.id, url, qr, emailEnviado: envio.enviado, diagnosticos })
  } catch (e) { next(e) }
})

app.get('/api/leads', protegido, async (_req, res, next) => {
  try {
    const leads = await lerLeads()
    res.json(leads.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)))
  } catch (e) {
    next(e)
  }
})

app.get('/api/leads.csv', protegido, async (_req, res, next) => {
  try {
    const leads = await lerLeads()
    const campo = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const linhas = [
      ['criado_em', 'origem', 'nome', 'empresa', 'email', 'telefone', 'faturamento', 'fez_os_dois', 'revenda', 'indiretos', 'email_enviado'].join(','),
      ...leads.map((l) =>
        [
          l.criadoEm,
          l.origem || 'site',
          l.nome,
          l.empresa,
          l.email,
          l.telefone,
          l.faturamento,
          l.fezOsDois ? 'sim' : 'nao',
          l.diagnosticos.find((d) => d.tipo === 'revenda')?.destaque ?? '',
          l.diagnosticos.find((d) => d.tipo === 'indiretos')?.destaque ?? '',
          l.email_enviado ? 'sim' : 'nao',
        ].map(campo).join(',')
      ),
    ]
    res.type('text/csv; charset=utf-8')
      .set('Content-Disposition', `attachment; filename="leads-vow-${new Date().toISOString().slice(0, 10)}.csv"`)
      .send('﻿' + linhas.join('\n'))
  } catch (e) {
    next(e)
  }
})

/** Destino do QR: a mesma peça do e-mail, servida como página. */
app.get('/d/:id', async (req, res, next) => {
  try {
    const lead = (await lerLeads()).find((l) => l.id === req.params.id)
    if (!lead) return res.status(404).send('Diagnóstico não encontrado.')
    const diagnosticos = lead.diagnosticos.map((d) => diagnosticar(d.tipo, d.entrada))
    res.type('html').send(montarHtml({ nome: lead.nome, empresa: lead.empresa, diagnosticos }))
  } catch (e) {
    next(e)
  }
})

/* ------------------------------------------------------------------ telas */
// `/` é a landing pública (topo de funil). O totem da feira fica em /totem,
// e o index.html deixa de ser servido pelo static para não disputar a raiz.
app.get('/', (_req, res) => res.sendFile(path.join(RAIZ, 'public', 'landing.html')))
// A raiz virou uma tela só (hero, vertical ou horizontal, para o painel do
// estande). O site completo — seções de produto, como funciona, rodapé —
// continua inteiro aqui, e é para onde a navegação aponta.
app.get('/site', (_req, res) => res.sendFile(path.join(RAIZ, 'public', 'site.html')))
// /totem é o protótipo de design vindo do Claude Design (public/abras/).
// Ele traz o próprio runtime e o próprio motor, e é a tela que o cliente
// aprovou — por isso é o destino do botão de diagnóstico.
// O totem codado, que grava lead no servidor, fica em /totem-v1 até a
// portabilidade do protótipo para o motor da casa.
app.get('/totem', (_req, res) => res.sendFile(path.join(RAIZ, 'public', 'abras', 'totem.dc.html')))
app.get('/totem-v1', (_req, res) => res.sendFile(path.join(RAIZ, 'public', 'index.html')))

// O diagnóstico gratuito da landing. Mesma tela do protótipo do totem, mas
// adaptada à web (responsiva, não 1080x1920) e ligada ao backend de verdade:
// usa o motor da casa, grava o lead, dispara o e-mail e gera o QR no servidor.
app.get('/diagnostico', (_req, res) => res.sendFile(path.join(RAIZ, 'public', 'diagnostico.html')))
app.get('/leads', protegido, (_req, res) => res.sendFile(path.join(RAIZ, 'public', 'leads.html')))

// A camada SaaS tem auth própria (sessão, tenant, papéis) e monta as suas
// rotas antes do static, para /app/... nunca cair num arquivo solto.
app.use(rotasApp)

// O motor vive na raiz e é importado pelas duas telas — mesma aritmética no
// browser e no servidor, sem build step nem cópia que possa divergir.
app.get('/motor.js', (_req, res) =>
  res.type('application/javascript').sendFile(path.join(RAIZ, 'motor.js')))
app.use(express.static(path.join(RAIZ, 'public'), { index: false }))

app.use((err, _req, res, _next) => {
  const status = err.status || 500
  if (status >= 500) console.error(err)
  res.status(status).json({ erro: err.message || 'erro interno' })
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`VOW ABRAS na porta ${port} · leads em ${caminhoDb()}`))
