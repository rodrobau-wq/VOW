/**
 * Migração única: disco → Postgres.
 *
 * A plataforma rodou sobre arquivos JSON num disco montado, e há leads reais
 * lá. Trocar a persistência sem trazer esses dados seria perder captura de
 * cliente — o pior tipo de perda desta operação.
 *
 * Roda na subida, e só age quando o banco está vazio E o arquivo antigo
 * existe. Depois da primeira vez vira no-op: não há como reimportar por cima
 * de dado novo.
 */
import fs from 'node:fs/promises'
import { consulta, preparar, temPostgres } from './db.js'

const CAMINHOS = {
  leads: process.env.LEADS_DB || '/var/data/leads.json',
  plataforma: process.env.APP_DB || '/var/data/db.json',
}

async function lerJson(caminho) {
  try {
    return JSON.parse(await fs.readFile(caminho, 'utf8'))
  } catch {
    return null
  }
}

export async function migrarDoDisco() {
  if (!temPostgres()) return { migrou: false, motivo: 'sem Postgres' }
  await preparar()

  const jaTem = await consulta('select (select count(*) from leads) as l, (select count(*) from registros) as r')
  if (Number(jaTem.rows[0].l) > 0 || Number(jaTem.rows[0].r) > 0) {
    return { migrou: false, motivo: 'banco já tem dados' }
  }

  const leads = await lerJson(CAMINHOS.leads)
  const plataforma = await lerJson(CAMINHOS.plataforma)
  if (!leads && !plataforma) return { migrou: false, motivo: 'nada em disco para migrar' }

  let nLeads = 0
  for (const lead of leads || []) {
    const { id, ...dados } = lead
    await consulta(
      `insert into leads (id, captura_id, criado_em, origem, dados)
       values ($1,$2,$3,$4,$5) on conflict (id) do nothing`,
      [id, lead.capturaId || null, lead.criadoEm || new Date().toISOString(), lead.origem || null, dados])
    nLeads++
  }

  let nRegistros = 0
  for (const [colecao, linhas] of Object.entries(plataforma || {})) {
    if (!Array.isArray(linhas)) continue
    for (const l of linhas) {
      const { id, redeId, ...dados } = l
      await consulta(
        `insert into registros (id, colecao, rede_id, criado_em, dados)
         values ($1,$2,$3,$4,$5) on conflict (id) do nothing`,
        [id, colecao, redeId || null, l.criadoEm || new Date().toISOString(), dados])
      nRegistros++
    }
  }

  console.log(`Migração do disco: ${nLeads} lead(s) e ${nRegistros} registro(s) para o Postgres.`)
  return { migrou: true, leads: nLeads, registros: nRegistros }
}
