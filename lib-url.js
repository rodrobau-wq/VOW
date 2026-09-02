/**
 * Descobre a URL pública do serviço. É ela que vai no QR do totem e no link
 * mágico de login — os dois precisam ser absolutos e resolvíveis de fora.
 *
 * HISTÓRICO, para ninguém repetir: o render.yaml declarava PUBLIC_BASE_URL
 * com `fromService property: host`. No Render isso devolve o hostname
 * *interno* do serviço — "vow-abras", sem domínio — e o QR da feira apontava
 * para https://vow-abras/d/xxx, que não resolve em lugar nenhum. O valor
 * certo vem de RENDER_EXTERNAL_URL, que o Render injeta sozinho.
 *
 * Daí a checagem de plausibilidade: um host sem ponto não é público, então é
 * descartado em vez de virar uma URL quebrada em silêncio.
 */

function normalizar(valor) {
  const bruto = String(valor || '').trim().replace(/\/+$/, '')
  if (!bruto) return null

  const comEsquema = /^https?:\/\//i.test(bruto) ? bruto : `https://${bruto}`
  let host
  try {
    host = new URL(comEsquema).hostname
  } catch {
    return null
  }
  // localhost e IP servem em dev; qualquer outra coisa precisa de domínio.
  const ehLocal = host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)
  if (!ehLocal && !host.includes('.')) return null
  return comEsquema
}

export function baseUrl(req) {
  for (const candidato of [process.env.PUBLIC_BASE_URL, process.env.RENDER_EXTERNAL_URL]) {
    const url = normalizar(candidato)
    if (url) return url
  }
  return `${req.protocol}://${req.get('host')}`
}

export const _normalizar = normalizar
