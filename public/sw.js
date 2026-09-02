/**
 * Service worker do app de campo.
 *
 * Duas regras, e a segunda é a que importa numa feira:
 *
 * 1. A casca do app (telas, tokens, módulos) é servida do cache primeiro.
 *    Abre instantâneo e abre sem rede.
 *
 * 2. Chamada de API NUNCA é servida do cache como se fosse fresca. Um funil
 *    de ontem apresentado como o de agora faz o consultor abordar quem já foi
 *    abordado. Sem rede, a API falha — e a tela diz que está offline, em vez
 *    de mentir.
 *
 * Com a captura acontecendo só na landing, não há fila offline a manter: o
 * app é de leitura e de mover cartão, e essas duas coisas exigem rede.
 */
const VERSAO = 'vow-campo-v1'
const CASCA = [
  '/app/hoje', '/app/pipeline', '/app/leads',
  '/tokens.css', '/app-nav.js', '/motor.js',
  '/icone.svg', '/manifest.webmanifest',
]

self.addEventListener('install', (e) => {
  // addAll falha inteiro se um item falhar; aqui cada um é opcional.
  e.waitUntil(caches.open(VERSAO).then((c) =>
    Promise.all(CASCA.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ns) => Promise.all(ns.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return

  // API: só rede. Dado comercial velho servido como atual é pior que erro.
  if (url.pathname.startsWith('/api/')) return

  e.respondWith((async () => {
    const cache = await caches.open(VERSAO)
    const guardado = await cache.match(e.request, { ignoreSearch: true })
    const rede = fetch(e.request).then((r) => {
      if (r.ok) cache.put(e.request, r.clone())
      return r
    }).catch(() => null)

    // Casca: responde do cache na hora e atualiza por trás.
    if (guardado) { rede; return guardado }
    const r = await rede
    if (r) return r
    return cache.match('/app/feira') || new Response(
      '<meta charset="utf-8"><p style="font:16px system-ui;padding:24px">Sem conexão. O que você capturou está guardado no aparelho e sobe quando a rede voltar.</p>',
      { headers: { 'content-type': 'text/html; charset=utf-8' } })
  })())
})
