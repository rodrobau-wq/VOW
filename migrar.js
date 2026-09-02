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

/** Guarda o resultado da última execução, para o /healthz poder mostrar. */
export let ultimaMigracao = { motivo: 'ainda não rodou' }

/**
 * @param {boolean} mesclar  Quando verdadeiro, roda mesmo com o banco já
 *   populado e insere apenas o que falta. Ligado por MIGRAR_DISCO=1.
 *
 *   A versão automática só age com o banco vazio, e isso é certo: evita
 *   reimportar por cima de dado novo. Mas deixou leads presos no disco depois
 *   que o Postgres entrou com outros registros. Como toda inserção é
 *   `on conflict do nothing`, mesclar nunca sobrescreve — no pior caso não
 *   faz nada.
 */
export async function migrarDoDisco({ mesclar = false } = {}) {
  const fim = (r) => (ultimaMigracao = r)
  if (!temPostgres()) return fim({ migrou: false, motivo: 'sem Postgres' })
  await preparar()

  const jaTem = await consulta('select (select count(*) from leads) as l, (select count(*) from registros) as r')
  const populado = Number(jaTem.rows[0].l) > 0 || Number(jaTem.rows[0].r) > 0
  if (populado && !mesclar) {
    return fim({ migrou: false, motivo: 'banco já tem dados (use MIGRAR_DISCO=1 para mesclar)' })
  }

  const leads = await lerJson(CAMINHOS.leads)
  const plataforma = await lerJson(CAMINHOS.plataforma)
  if (!leads && !plataforma) {
    return fim({ migrou: false, motivo: `nada em disco: ${CAMINHOS.leads} não existe ou está ilegível` })
  }

  let nLeads = 0, jaExistiam = 0
  for (const lead of leads || []) {
    const { id, ...dados } = lead
    // `captura_id` também é único: um lead vindo do disco com a mesma captura
    // de um que já está no banco não pode estourar a inserção.
    const r = await consulta(
      `insert into leads (id, captura_id, criado_em, origem, dados)
       values ($1,$2,$3,$4,$5)
       on conflict do nothing returning id`,
      [id, lead.capturaId || null, lead.criadoEm || new Date().toISOString(), lead.origem || null, dados])
    if (r.rowCount) nLeads++
    else jaExistiam++
  }

  let nRegistros = 0
  for (const [colecao, linhas] of Object.entries(plataforma || {})) {
    if (!Array.isArray(linhas)) continue
    for (const l of linhas) {
      const { id, redeId, ...dados } = l
      const r = await consulta(
        `insert into registros (id, colecao, rede_id, criado_em, dados)
         values ($1,$2,$3,$4,$5) on conflict (id) do nothing returning id`,
        [id, colecao, redeId || null, l.criadoEm || new Date().toISOString(), dados])
      if (r.rowCount) nRegistros++
    }
  }

  /**
   * Renomeia a origem depois de importar. É o que faz a mesclagem acontecer
   * uma vez só: sem isso, ela rodaria a cada deploy e ressuscitaria lead que
   * alguém tivesse apagado no CRM depois. O arquivo não é destruído — fica
   * como `.migrado` no disco, caso seja preciso conferir.
   */
  for (const caminho of [CAMINHOS.leads, CAMINHOS.plataforma]) {
    try {
      await fs.rename(caminho, caminho + '.migrado')
    } catch { /* arquivo pode não existir; não é erro */ }
  }

  console.log(`Migração do disco: ${nLeads} lead(s) novo(s), ${jaExistiam} já existia(m), ${nRegistros} registro(s).`)
  return fim({ migrou: true, leads: nLeads, jaExistiam, registros: nRegistros, encontradosEmDisco: (leads || []).length })
}
