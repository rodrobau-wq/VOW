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
import { montarPainel, CLASSES_CREDITO, RISCOS, CALENDARIO } from '../painel.js'
import {
  abrirSessao, fecharSessao, carregaContexto, conferirSenha,
  exigeLogin, exigeRede, gerarLinkMagico, lerLinkMagico, lerSessao,
} from '../auth.js'

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const tela = (nome) => (_req, res) => res.sendFile(path.join(RAIZ, 'public', `app-${nome}.html`))

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
    const base = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')
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
