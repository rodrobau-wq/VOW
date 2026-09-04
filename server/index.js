/**
 * VOW · ABRAS — API do totem e da plataforma de leads.
 *
 *   GET  /                 landing pública com os diagnósticos gratuitos
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
import { exigeLogin } from '../auth.js'
import { lerLeads, gravarLead, caminhoDb } from '../leads-db.js'
import * as store from '../store.js'
import { temPostgres } from '../db.js'
import { primeiroAcesso, garantirSuperadmin, garantirRedeVow } from '../bootstrap.js'
import { protegido } from '../basic-auth.js'
import { migrarDoDisco, ultimaMigracao } from '../migrar.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.join(__dirname, '..')

const app = express()
app.use(express.json({ limit: '256kb' }))
app.disable('x-powered-by')

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
/**
 * Health check e estado de instalação.
 *
 * `inicializada` diz apenas SE existe algum acesso — nunca quem. Sem isso não
 * há como saber de fora se a plataforma está pronta ou se o primeiro acesso
 * nunca foi criado, e as duas situações se parecem: o login recusa igual.
 */
app.get('/healthz', async (_req, res) => {
  let plataforma = {
    inicializada: null,
    persistencia: temPostgres() ? 'postgres' : 'espelho em disco',
    // Sem acesso ao log do serviço, é aqui que se confere se a migração
    // achou os arquivos antigos e o que ela trouxe.
    migracao: ultimaMigracao,
  }
  try {
    plataforma.inicializada = (await store.listar('usuario')).length > 0
  } catch { /* banco indisponível não pode derrubar o health check */ }
  res.json({ ok: true, uptime: process.uptime(), plataforma })
})

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
      // 'qr' vem de quem leu o código do estande; 'abras' do totem.
      origem: ['abras', 'site', 'qr'].includes(origem) ? origem : 'site',
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

/* ======================================================================
 * QR do estande.
 *
 * O código impresso aponta SEMPRE para /q/:codigo, nunca para o destino
 * final. Trocar para onde ele leva não invalida o material já impresso —
 * que é o ponto: cartaz de feira não se reimprime no meio do evento.
 * ====================================================================== */

/** Só o que a landing precisa para decidir se mostra o QR. */
app.get('/api/qr', async (_req, res, next) => {
  try {
    const qr = await store.achar('qr', (q) => q.codigo === 'abras')
    if (!qr?.url) return res.status(404).json({ erro: 'QR não configurado' })
    res.json({ codigo: qr.codigo, url: qr.url })
  } catch (e) { next(e) }
})

app.get('/q/:codigo', async (req, res, next) => {
  try {
    const codigo = String(req.params.codigo || '').slice(0, 40)
    const qr = await store.achar('qr', (q) => q.codigo === codigo)
    // Sem destino cadastrado o código não existe: 404, e a landing esconde
    // o bloco do QR em vez de oferecer um caminho que não leva a lugar nenhum.
    if (!qr?.url) return res.status(404).send('QR não configurado.')

    /**
     * A leitura é append-only. Guardamos o hash do IP, não o IP: dá para
     * distinguir leituras repetidas do mesmo aparelho sem manter dado
     * pessoal de quem passou na frente do estande.
     */
    await store.inserir('leitura', {
      codigo,
      em: new Date().toISOString(),
      ua: String(req.headers['user-agent'] || '').slice(0, 200),
      ip_hash: crypto.createHash('sha256')
        .update(String(req.ip || '') + (process.env.SESSION_SECRET || ''))
        .digest('hex').slice(0, 16),
    })

    const destino = new URL(qr.url)
    destino.searchParams.set('origem', 'qr')
    res.redirect(302, destino.toString())
  } catch (e) { next(e) }
})

/* ------------------------------------------------------------------ telas */
// `/` é a landing pública (topo de funil). O totem da feira fica em /totem,
// e o index.html deixa de ser servido pelo static para não disputar a raiz.
/**
 * A raiz é o totem: uma entrada só.
 *
 * Havia duas landings — esta e /abras — com a mesma promessa e cópias que já
 * tinham divergido ("Já fez o seu JBP?" contra "de 2027?"). A do Claude
 * Design é a fonte da verdade do desenho, então é ela que fica.
 */
app.get('/', (_req, res) => res.sendFile(path.join(RAIZ, 'public', 'abras', 'abras.dc.html')))
// A raiz virou uma tela só (hero, vertical ou horizontal, para o painel do
// estande). O site completo — seções de produto, como funciona, rodapé —
// continua inteiro aqui, e é para onde a navegação aponta.
app.get('/site', (_req, res) => res.sendFile(path.join(RAIZ, 'public', 'site.html')))
/**
 * Protótipos do Claude Design, no Brandguide 2026. São a FONTE DA VERDADE
 * do desenho: quando o produto e eles divergirem, quem está errado é o
 * produto. Ficam servidos para poder ser comparados lado a lado.
 */
// O endereço antigo continua valendo: já foi impresso e já foi compartilhado.
app.get('/abras', (req, res) => res.redirect(301, '/' + (req.url.split('?')[1] ? '?' + req.url.split('?')[1] : '')))
app.get('/plataforma', (_req, res) => res.sendFile(path.join(RAIZ, 'public', 'abras', 'plataforma.dc.html')))

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
// Gerador de QR sem dependência: o pavilhão não tem rede garantida e a
// marca não carrega script de terceiros.
app.get('/qr.js', (_req, res) =>
  res.type('application/javascript').sendFile(path.join(RAIZ, 'qr.js')))

// As etapas do funil moram na raiz porque servidor e telas leem as mesmas.
app.get('/crm.js', (_req, res) =>
  res.type('application/javascript').sendFile(path.join(RAIZ, 'crm.js')))
/**
 * O mapa do potencial e o ranking que ele lê moram em `public/` porque o
 * protótipo os carrega por caminho relativo — mas contam onde estão os leads.
 * Esta guarda vem antes do `static`: sem ela o arquivo sai direto do disco.
 */
app.get(['/abras/mapa-potencial.html', '/abras/ranking-abras-2026.csv',
         '/abras/crm-demo.js'], exigeLogin)

app.use(express.static(path.join(RAIZ, 'public'), { index: false }))

app.use((err, _req, res, _next) => {
  const status = err.status || 500
  if (status >= 500) console.error(err)
  res.status(status).json({ erro: err.message || 'erro interno' })
})

const port = process.env.PORT || 3000
app.listen(port, async () => {
  console.log(`VOW ABRAS na porta ${port} · leads em ${caminhoDb()}`)
  // Cria o acesso inicial se o banco estiver vazio. Falhar aqui não pode
  // derrubar o site público: o totem da feira não depende da plataforma.
  try {
    // Traz o que ficou no disco antes de criar qualquer coisa nova, senão o
    // primeiro acesso ocuparia o banco e a migração se recusaria a rodar.
    // Mescla por padrão: a inserção é `on conflict do nothing`, então nunca
    // sobrescreve, e o arquivo é renomeado depois — roda uma vez e acabou.
    const m = await migrarDoDisco({ mesclar: process.env.MIGRAR_DISCO !== '0' })
    if (!m.migrou) console.log(`Migração: ${m.motivo}`)
    const r = await primeiroAcesso()
    if (!r.criado) console.log(`Plataforma: ${r.motivo}`)
    const d = await garantirSuperadmin()
    if (!d.ok) console.log(`Dono da plataforma: ${d.motivo}`)
    const v = await garantirRedeVow()
    if (!v.criada) console.log(`Rede da casa: ${v.motivo}`)
  } catch (e) {
    console.error('Falha ao criar o primeiro acesso:', e.message)
  }
})
