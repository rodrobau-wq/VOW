/**
 * Autenticação e sessão da plataforma.
 *
 * Sem dependência nova: scrypt e HMAC vêm do node:crypto, e o cookie é
 * assinado e lido à mão. O brief pede justificativa para cada pacote novo,
 * e não há nada aqui que valha um.
 *
 * A sessão é um cookie assinado, sem estado no servidor: quem tem a
 * assinatura está dentro. Isso significa que revogar exige trocar o
 * SESSION_SECRET (derruba todo mundo) — aceitável no piloto, e o ponto de
 * troca fica isolado em `assinar`/`verificar` para quando não for mais.
 */
import crypto from 'node:crypto'
import * as store from './store.js'

const COOKIE = 'vow_sess'
const DURACAO_MS = 12 * 60 * 60 * 1000 // um dia de trabalho
const MAGIC_MS = 15 * 60 * 1000
const SENHA_MS = 60 * 60 * 1000        // 1 h — prazo do handoff
/** Convite de auto-cadastro: 24 h, porque a pessoa pode não estar no e-mail. */
const CONVITE_MS = 24 * 60 * 60 * 1000

/** Piso de tamanho. Não é política de segurança, é o mínimo defensável. */
export const SENHA_MINIMA = 10

/**
 * Papéis. `vow` é o administrador e enxerga tudo; `vendedor` trabalha o
 * funil mas não administra equipe nem apaga base. Os quatro seguintes são
 * os papéis do cliente, do brief.
 */
export const PAPEIS = ['deus', 'vow', 'vendedor', 'comprador', 'fiscal', 'juridico', 'suprimentos', 'diretoria']

/**
 * Quem administra a plataforma. `deus` é o dono: tem tudo que `vow` tem, mais
 * o direito de promover e rebaixar administradores. A distinção existe para
 * que um `vow` não possa se tornar dono sozinho.
 */
export const ehAdmin = (u) => u?.papel === 'vow' || u?.papel === 'deus'
export const ehDono = (u) => u?.papel === 'deus'

/** `convidado` já entra pelo link, mas ainda não definiu senha. */
export const STATUS = ['convidado', 'ativo', 'inativo']
/** Conta sem status é anterior ao campo e continua valendo. */
export const podeEntrar = (u) => Boolean(u) && (u.status || 'ativo') !== 'inativo'

function segredo() {
  const s = process.env.SESSION_SECRET
  if (s) return s
  // Em dev, um segredo por processo: reiniciar o servidor desloga, o que é
  // melhor do que um default fixo que alguém acaba levando para produção.
  globalThis.__vowSegredo ||= crypto.randomBytes(32).toString('hex')
  return globalThis.__vowSegredo
}

const b64 = (buf) => Buffer.from(buf).toString('base64url')

function assinar(payload) {
  const corpo = b64(JSON.stringify(payload))
  const mac = crypto.createHmac('sha256', segredo()).update(corpo).digest('base64url')
  return `${corpo}.${mac}`
}

function verificar(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [corpo, mac] = token.split('.')
  const esperado = crypto.createHmac('sha256', segredo()).update(corpo).digest('base64url')
  const a = Buffer.from(mac || '')
  const b = Buffer.from(esperado)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const p = JSON.parse(Buffer.from(corpo, 'base64url').toString())
    return p.exp > Date.now() ? p : null
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ senha */

export function hashSenha(senha) {
  const sal = crypto.randomBytes(16)
  const chave = crypto.scryptSync(senha, sal, 64)
  return `scrypt$${sal.toString('hex')}$${chave.toString('hex')}`
}

export function conferirSenha(senha, hash) {
  const [algo, salHex, chaveHex] = String(hash || '').split('$')
  if (algo !== 'scrypt' || !salHex || !chaveHex) return false
  const esperado = Buffer.from(chaveHex, 'hex')
  const obtido = crypto.scryptSync(senha, Buffer.from(salHex, 'hex'), esperado.length)
  return crypto.timingSafeEqual(esperado, obtido)
}

/* ---------------------------------------------------------------- cookies */

function lerCookies(req) {
  const bruto = req.headers.cookie || ''
  const saida = {}
  for (const parte of bruto.split(';')) {
    const i = parte.indexOf('=')
    if (i > 0) saida[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim())
  }
  return saida
}

export function abrirSessao(res, { usuarioId, redeId = null }) {
  const token = assinar({ usuarioId, redeId, exp: Date.now() + DURACAO_MS })
  res.append('Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DURACAO_MS / 1000}` +
    (process.env.NODE_ENV === 'production' ? '; Secure' : ''))
  return token
}

export function fecharSessao(res) {
  res.append('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

export function lerSessao(req) {
  return verificar(lerCookies(req)[COOKIE])
}

/* ------------------------------------------------------------- link mágico */

/** Token de entrada sem senha, válido por 15 min. Não grava nada: é assinado. */
export function gerarLinkMagico(usuarioId) {
  return assinar({ usuarioId, magico: true, exp: Date.now() + MAGIC_MS })
}

export function lerLinkMagico(token) {
  const p = verificar(token)
  return p?.magico ? p : null
}

/* ------------------------------------------------ redefinição de senha */

/**
 * Impressão digital da senha atual. Ela entra no token de redefinição, e é o
 * que torna o link de uso único sem guardar estado: assim que a senha muda, o
 * hash muda, a digital não confere mais e o link morre — inclusive se alguém
 * tiver interceptado o e-mail e tentar usar depois.
 */
const digital = (senhaHash) =>
  crypto.createHash('sha256').update(String(senhaHash || '')).digest('base64url').slice(0, 16)

export function gerarLinkSenha(usuario, { convite = false } = {}) {
  return assinar({
    usuarioId: usuario.id,
    senha: true,
    dg: digital(usuario.senhaHash),
    exp: Date.now() + (convite ? CONVITE_MS : SENHA_MS),
  })
}

/** Devolve o payload só se o token for de senha E a senha não tiver mudado. */
export function lerLinkSenha(token, usuario) {
  const p = verificar(token)
  if (!p?.senha) return null
  if (!usuario || p.usuarioId !== usuario.id) return null
  if (p.dg !== digital(usuario.senhaHash)) return null
  return p
}

/* ------------------------------------------------------------- middlewares */

/**
 * Dentro de um Router montado em '/api/app', `req.path` chega como '/painel'
 * — sem o prefixo. Quem decide entre 401 e redirect é a URL original.
 */
const ehApi = (req) => (req.originalUrl || req.url || '').startsWith('/api/')

/**
 * Exige sessão. Em rota de tela redireciona para o login; em rota de API
 * devolve 401, porque o fetch do browser não sabe seguir redirect de HTML.
 */
export function exigeLogin(req, res, next) {
  const sess = lerSessao(req)
  if (!sess) {
    if (ehApi(req)) return res.status(401).json({ erro: 'não autenticado' })
    return res.redirect('/app/entrar')
  }
  req.sessao = sess
  next()
}

/** Carrega usuário e rede ativa. Roda sempre depois de `exigeLogin`. */
export async function carregaContexto(req, res, next) {
  try {
    const usuario = await store.porId('usuario', req.sessao.usuarioId)
    // Desativar precisa valer para quem já está dentro: o cookie dura 12 h e
    // sem esta checagem a pessoa seguiria trabalhando o dia todo.
    if (usuario && !podeEntrar(usuario)) {
      fecharSessao(res)
      return ehApi(req)
        ? res.status(401).json({ erro: 'conta desativada' })
        : res.redirect('/app/entrar')
    }
    if (!usuario) {
      fecharSessao(res)
      return ehApi(req)
        ? res.status(401).json({ erro: 'sessão inválida' })
        : res.redirect('/app/entrar')
    }
    req.usuario = usuario

    const permitidas = usuario.papel === 'vow'
      ? (await store.listar('rede')).map((r) => r.id)
      : usuario.redes || []

    // A rede da sessão precisa continuar permitida: perder acesso não pode
    // deixar um cookie antigo funcionando.
    const redeId = permitidas.includes(req.sessao.redeId)
      ? req.sessao.redeId
      : (permitidas.length === 1 ? permitidas[0] : null)

    req.redesPermitidas = permitidas
    req.redeId = redeId
    req.rede = redeId ? await store.porId('rede', redeId) : null
    next()
  } catch (e) {
    next(e)
  }
}

/** Exige que uma rede esteja escolhida. */
export function exigeRede(req, res, next) {
  if (!req.redeId) {
    return ehApi(req)
      ? res.status(409).json({ erro: 'nenhuma rede selecionada' })
      : res.redirect('/app/redes')
  }
  next()
}
