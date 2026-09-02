/**
 * VOW · ABRAS — API do totem e da plataforma de leads.
 *
 *   GET  /                 landing pública com os diagnósticos gratuitos
 *   GET  /totem            totem (kiosk da feira)
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

import { diagnosticar, PREMISSAS, PORTES } from '../motor.js'
import { enviarDiagnostico, montarHtml } from '../email.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.join(__dirname, '..')
const DB = process.env.LEADS_DB || path.join(RAIZ, 'data', 'leads.json')

const app = express()
app.use(express.json({ limit: '256kb' }))
app.disable('x-powered-by')

/* ---------------------------------------------------------------- storage */
// Arquivo JSON com escrita serializada. Uma feira gera centenas de leads, não
// milhões — troca por Postgres só quando a plataforma sair do estande.
let fila = Promise.resolve()

async function lerLeads() {
  try {
    return JSON.parse(await fs.readFile(DB, 'utf8'))
  } catch (e) {
    if (e.code === 'ENOENT') return []
    throw e
  }
}

function gravarLead(lead) {
  fila = fila.then(async () => {
    const leads = await lerLeads()
    const i = leads.findIndex((l) => l.id === lead.id)
    if (i >= 0) leads[i] = lead
    else leads.push(lead)
    await fs.mkdir(path.dirname(DB), { recursive: true })
    await fs.writeFile(DB, JSON.stringify(leads, null, 2))
  })
  return fila
}

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
  return {
    faturamento,
    percentualVerba: num(body.percentualVerba, 0, 0.2),
    percentualBase: num(body.percentualBase, 0, 0.6),
    parcelaCestaBasica: num(body.parcelaCestaBasica, 0, 1),
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
    const { nome, empresa, email, telefone, tipos } = req.body || {}
    if (!email || !EMAIL_RE.test(String(email))) {
      return res.status(400).json({ erro: 'e-mail inválido' })
    }
    const lista = Array.isArray(tipos) && tipos.length ? tipos : ['revenda']
    if (lista.some((t) => t !== 'revenda' && t !== 'indiretos')) {
      return res.status(400).json({ erro: 'tipo inválido' })
    }

    const entrada = lerEntrada(req.body)
    const diagnosticos = lista.map((t) => diagnosticar(t, entrada))

    const id = crypto.randomUUID()
    const lead = {
      id,
      criadoEm: new Date().toISOString(),
      nome: String(nome || '').slice(0, 120),
      empresa: String(empresa || '').slice(0, 160),
      email: String(email).slice(0, 200),
      telefone: String(telefone || '').slice(0, 40),
      faturamento: entrada.faturamento,
      // "fez os dois" é o sinal comercial que a plataforma exibe.
      fezOsDois: diagnosticos.length > 1,
      diagnosticos: diagnosticos.map((d) => ({ tipo: d.tipo, destaque: d.destaque, entrada: d.entrada })),
      email_enviado: false,
    }

    const envio = await enviarDiagnostico({ para: lead.email, nome: lead.nome, empresa: lead.empresa, diagnosticos })
    lead.email_enviado = envio.enviado
    if (!envio.enviado) lead.email_erro = envio.motivo

    await gravarLead(lead)

    // QR só é montado quando o lead existe — aponta para a página do resultado.
    const base = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')
    const url = `${base}/d/${id}`
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: '#14120F', light: '#FFFFFF' } })

    res.json({ id, url, qr, emailEnviado: envio.enviado, diagnosticos })
  } catch (e) {
    next(e)
  }
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
      ['criado_em', 'nome', 'empresa', 'email', 'telefone', 'faturamento', 'fez_os_dois', 'revenda', 'indiretos', 'email_enviado'].join(','),
      ...leads.map((l) =>
        [
          l.criadoEm,
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
app.get('/totem', (_req, res) => res.sendFile(path.join(RAIZ, 'public', 'index.html')))
app.get('/leads', protegido, (_req, res) => res.sendFile(path.join(RAIZ, 'public', 'leads.html')))

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
app.listen(port, () => console.log(`VOW ABRAS na porta ${port} · leads em ${DB}`))
