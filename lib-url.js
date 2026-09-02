/**
 * O Render entrega `PUBLIC_BASE_URL` pela propriedade `host` do serviço, que
 * vem sem esquema — "vow-abras.onrender.com". Concatenar isso com "/d/:id"
 * produz uma URL relativa, e o QR do totem e o link mágico apontariam para
 * lugar nenhum. Normalizar aqui é mais seguro do que confiar no valor.
 */
export function baseUrl(req) {
  const bruto = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '')
  if (!bruto) return `${req.protocol}://${req.get('host')}`
  return /^https?:\/\//i.test(bruto) ? bruto : `https://${bruto}`
}
