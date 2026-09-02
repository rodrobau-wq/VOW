/**
 * Fila de captura offline.
 *
 * O wi-fi de pavilhão de feira cai — isso não é hipótese, é o normal. Perder
 * um lead no momento da captura é o pior resultado possível da operação, então
 * a captura grava primeiro no aparelho e só depois tenta a rede.
 *
 * IndexedDB e não localStorage porque a fila precisa sobreviver a aba fechada,
 * aparelho desligado e memória cheia — e localStorage é síncrono, o que trava
 * a tela justamente quando o consultor está com alguém na frente.
 */
const BANCO = 'vow-fila'
const LOJA = 'capturas'

function abrir() {
  return new Promise((ok, erro) => {
    const req = indexedDB.open(BANCO, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(LOJA)) {
        req.result.createObjectStore(LOJA, { keyPath: 'capturaId' })
      }
    }
    req.onsuccess = () => ok(req.result)
    req.onerror = () => erro(req.error)
  })
}

async function transacao(modo, fn) {
  const db = await abrir()
  return new Promise((ok, erro) => {
    const t = db.transaction(LOJA, modo)
    const r = fn(t.objectStore(LOJA))
    t.oncomplete = () => ok(r?.result)
    t.onerror = () => erro(t.error)
  })
}

/** Id gerado no aparelho: é ele que impede duplicata quando a rede volta. */
export const novoId = () =>
  (crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2))

export async function enfileirar(captura) {
  const item = { ...captura, capturaId: captura.capturaId || novoId(), capturadoEm: new Date().toISOString() }
  await transacao('readwrite', (loja) => loja.put(item))
  return item
}

export async function pendentes() {
  return transacao('readonly', (loja) => loja.getAll())
}

export async function remover(capturaId) {
  return transacao('readwrite', (loja) => loja.delete(capturaId))
}

/**
 * Envia a fila. Só remove do aparelho o que o servidor confirmou, ou o que
 * ele recusou por validação — reenviar um e-mail inválido nunca vai passar,
 * e manter o item preso trava a fila inteira atrás dele.
 */
export async function sincronizar() {
  const fila = await pendentes()
  if (!fila.length) return { enviados: 0, presos: 0, recusados: [] }
  if (!navigator.onLine) return { enviados: 0, presos: fila.length, recusados: [] }

  let r
  try {
    r = await fetch('/api/app/crm/sync', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fila }),
    })
  } catch {
    return { enviados: 0, presos: fila.length, recusados: [] }   // sem rede: tenta depois
  }
  if (!r.ok) return { enviados: 0, presos: fila.length, recusados: [] }

  const { resultados } = await r.json()
  let enviados = 0
  const recusados = []
  for (const res of resultados) {
    if (res.ok) { await remover(res.capturaId); enviados++ }
    else if (res.definitivo) {
      await remover(res.capturaId)
      recusados.push({ capturaId: res.capturaId, erro: res.erro })
    }
  }
  const restantes = await pendentes()
  return { enviados, presos: restantes.length, recusados }
}

/** Tenta assim que a rede voltar, e periodicamente enquanto a tela viver. */
export function sincronizarSempre(aoMudar) {
  const rodar = async () => {
    const r = await sincronizar().catch(() => null)
    if (r) aoMudar?.(r)
  }
  addEventListener('online', rodar)
  addEventListener('offline', () => aoMudar?.({ enviados: 0, presos: -1, recusados: [] }))
  setInterval(rodar, 30000)
  rodar()
  return rodar
}
