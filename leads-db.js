/**
 * Persistência dos leads — a carteira comercial da própria VOW.
 *
 * Fica fora do store.js de propósito: aquele é multi-tenant e escopa tudo por
 * `redeId`, e lead não pertence a rede nenhuma. Lead é da VOW até virar
 * cliente.
 *
 * A fila serializa as escritas: o arquivo inteiro é reescrito a cada uma, e
 * durante a feira o totem e o CRM gravam ao mesmo tempo.
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const ARQUIVO = process.env.LEADS_DB || path.join(process.cwd(), 'data', 'leads.json')
let fila = Promise.resolve()

export async function lerLeads() {
  try {
    return JSON.parse(await fs.readFile(ARQUIVO, 'utf8'))
  } catch (e) {
    if (e.code === 'ENOENT') return []
    throw e
  }
}

export function gravarLead(lead) {
  fila = fila.then(async () => {
    const leads = await lerLeads()
    const i = leads.findIndex((l) => l.id === lead.id)
    if (i >= 0) leads[i] = lead
    else leads.push(lead)
    await fs.mkdir(path.dirname(ARQUIVO), { recursive: true })
    await fs.writeFile(ARQUIVO, JSON.stringify(leads, null, 2))
  })
  return fila
}

/**
 * Aplica mudanças a um lead existente. Devolve o lead atualizado, ou null se
 * não existir — quem chama decide se isso é 404.
 */
export async function atualizarLead(id, mudancas) {
  let saida = null
  fila = fila.then(async () => {
    const leads = await lerLeads()
    const i = leads.findIndex((l) => l.id === id)
    if (i < 0) return
    leads[i] = { ...leads[i], ...mudancas, atualizadoEm: new Date().toISOString() }
    saida = leads[i]
    await fs.mkdir(path.dirname(ARQUIVO), { recursive: true })
    await fs.writeFile(ARQUIVO, JSON.stringify(leads, null, 2))
  })
  await fila
  return saida
}

export const caminhoDb = () => ARQUIVO
