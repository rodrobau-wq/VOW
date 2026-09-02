/**
 * Persistência dos leads — a carteira comercial da própria VOW.
 *
 * Tabela separada de `registros` porque lead não pertence a rede nenhuma:
 * é da VOW até virar cliente. E porque `captura_id` precisa de restrição de
 * unicidade no banco — é ela que impede a fila offline de criar o mesmo lead
 * quatro vezes quando o sinal do pavilhão oscila. Antes isso dependia de ler
 * antes de escrever, o que falha com dois aparelhos sincronizando juntos.
 */
import { consulta, preparar, emMemoria, tabelaMemoria } from './db.js'

const doc = (r) => ({ id: r.id, ...r.dados })

export async function lerLeads() {
  if (emMemoria()) {
    return [...tabelaMemoria('leads').values()].map(doc)
      .sort((a, b) => String(a.criadoEm).localeCompare(String(b.criadoEm)))
  }
  await preparar()
  const r = await consulta('select * from leads order by criado_em')
  return r.rows.map(doc)
}

export async function porCapturaId(capturaId) {
  if (!capturaId) return null
  if (emMemoria()) {
    return [...tabelaMemoria('leads').values()].map(doc)
      .find((l) => l.capturaId === capturaId) || null
  }
  await preparar()
  const r = await consulta('select * from leads where captura_id = $1', [capturaId])
  return r.rowCount ? doc(r.rows[0]) : null
}

export async function gravarLead(lead) {
  const { id, ...dados } = lead
  if (emMemoria()) {
    tabelaMemoria('leads').set(id, { id, dados })
    return lead
  }
  await preparar()
  try {
    const r = await consulta(
      `insert into leads (id, captura_id, criado_em, origem, dados)
       values ($1,$2,$3,$4,$5)
       on conflict (id) do update set dados = excluded.dados, origem = excluded.origem
       returning *`,
      [id, lead.capturaId || null, lead.criadoEm || new Date().toISOString(), lead.origem || null, dados])
    return doc(r.rows[0])
  } catch (e) {
    /**
     * 23505 é violação de unicidade. `on conflict (id)` acima não cobre o
     * caso de dois ids diferentes com o mesmo `captura_id` — que é
     * exatamente o que acontece quando dois aparelhos sincronizam a mesma
     * captura ao mesmo tempo e a checagem anterior perde a corrida.
     * A restrição do banco decide, e devolvemos o lead que já existe.
     */
    if (e.code === '23505' && lead.capturaId) {
      const existente = await porCapturaId(lead.capturaId)
      if (existente) return existente
    }
    throw e
  }
}

export async function atualizarLead(id, mudancas) {
  const atualizadoEm = new Date().toISOString()
  if (emMemoria()) {
    const r = tabelaMemoria('leads').get(id)
    if (!r) return null
    r.dados = { ...r.dados, ...mudancas, atualizadoEm }
    return doc(r)
  }
  await preparar()
  const r = await consulta(
    `update leads set dados = dados || $2::jsonb where id = $1 returning *`,
    [id, JSON.stringify({ ...mudancas, atualizadoEm })])
  return r.rowCount ? doc(r.rows[0]) : null
}

export async function contarLeads() {
  if (emMemoria()) return tabelaMemoria('leads').size
  await preparar()
  const r = await consulta('select count(*)::int as n from leads')
  return r.rows[0].n
}

export const caminhoDb = () =>
  process.env.DATABASE_URL ? 'Postgres' : 'memória (sem DATABASE_URL)'
