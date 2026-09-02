/**
 * Proteção por Basic Auth — as credenciais de LEADS_USER/LEADS_PASSWORD.
 *
 * Vive num módulo próprio porque duas camadas usam: a carteira de leads e a
 * criação do primeiro acesso. Sem isso, `server/app.js` teria de importar de
 * `server/index.js`, que já importa `app.js` de volta.
 */
import crypto from 'node:crypto'

export function protegido(req, res, next) {
  const user = process.env.LEADS_USER
  const pass = process.env.LEADS_PASSWORD
  if (!user || !pass) return next()   // sem credenciais configuradas, fica aberto

  const [tipo, b64] = (req.headers.authorization || '').split(' ')
  if (tipo === 'Basic' && b64) {
    const [u, p] = Buffer.from(b64, 'base64').toString().split(':')
    // timingSafeEqual exige buffers do mesmo tamanho — hash antes de comparar.
    const h = (s) => crypto.createHash('sha256').update(String(s)).digest()
    if (crypto.timingSafeEqual(h(u), h(user)) && crypto.timingSafeEqual(h(p), h(pass))) return next()
  }
  res.set('WWW-Authenticate', 'Basic realm="VOW"').status(401).send('Acesso restrito')
}
