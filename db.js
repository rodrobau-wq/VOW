/**
 * Conexão com o banco.
 *
 * Produção é Postgres. Nada de arquivo em disco: um serviço com disco não
 * escala para duas instâncias, não tem backup com ponto de restauração e não
 * dá para consultar de fora — e o projeto passou a exigir as três coisas.
 *
 * Sem DATABASE_URL o módulo cai num armazenamento em memória. Isso existe
 * para o `npm test` rodar sem subir banco, e some quando o processo morre.
 * Em produção, a ausência da variável é gritada no log: subir a plataforma
 * gravando em memória seria perder tudo no primeiro deploy, em silêncio.
 */
import pg from 'pg'

const URL = process.env.DATABASE_URL || ''

let pool = null
let pronto = null
/**
 * Cliente injetado pelos testes: o PGlite é o Postgres de verdade compilado
 * para WASM, então o SQL exercitado é exatamente o que roda em produção.
 * Existe uma costura só aqui, e nada no resto do projeto sabe dela.
 */
let injetado = null

export const temPostgres = () => Boolean(pool || injetado)

export function usarCliente(cliente) {
  injetado = cliente
  pronto = null
}

if (URL) {
  pool = new pg.Pool({
    connectionString: URL,
    // O Postgres gerenciado do Render exige TLS e usa certificado próprio.
    ssl: /localhost|127\.0\.0\.1/.test(URL) ? false : { rejectUnauthorized: false },
    max: 8,
    idleTimeoutMillis: 30000,
  })
  pool.on('error', (e) => console.error('Postgres:', e.message))
} else if (process.env.NODE_ENV === 'production') {
  console.error('!'.repeat(64))
  console.error('DATABASE_URL ausente em produção. Os dados vão para a memória')
  console.error('e somem no próximo deploy. Configure o banco antes de usar.')
  console.error('!'.repeat(64))
}

/* ----------------------------------------------------------- em memória */
// Espelha só o que as consultas do projeto usam. Não é um banco: é o
// suficiente para os testes rodarem sem depender de rede.
//
// REDE DE SEGURANÇA: quando LEADS_DB/APP_DB apontam para um caminho, o
// conteúdo é lido na subida e regravado a cada escrita. Sem isso, um deploy
// feito antes de o Postgres existir apagaria em silêncio tudo que foi
// capturado — foi o que aconteceu, e não pode acontecer de novo. A gravação
// desliga sozinha assim que DATABASE_URL aparece.
const memoria = { leads: new Map(), registros: new Map() }

const ARQ_LEADS = process.env.LEADS_DB || ''
const ARQ_REGISTROS = process.env.APP_DB || ''
const espelhaEmDisco = () => !temPostgres() && Boolean(ARQ_LEADS || ARQ_REGISTROS)

async function carregarDoDisco() {
  if (!espelhaEmDisco()) return
  const fs = await import('node:fs/promises')
  try {
    for (const l of JSON.parse(await fs.readFile(ARQ_LEADS, 'utf8'))) {
      const { id, ...dados } = l
      memoria.leads.set(id, { id, dados })
    }
  } catch { /* arquivo ausente é o caso normal na primeira vez */ }
  try {
    const doc = JSON.parse(await fs.readFile(ARQ_REGISTROS, 'utf8'))
    for (const [colecao, linhas] of Object.entries(doc)) {
      if (!Array.isArray(linhas)) continue
      for (const l of linhas) {
        const { id, redeId, ...dados } = l
        memoria.registros.set(id, { id, colecao, rede_id: redeId || null, dados })
      }
    }
  } catch { /* idem */ }
}

let gravando = null
export function salvarNoDisco() {
  if (!espelhaEmDisco()) return Promise.resolve()
  // Agrupa escritas do mesmo tique: a captura grava várias linhas seguidas.
  gravando ||= Promise.resolve().then(async () => {
    gravando = null
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    if (ARQ_LEADS) {
      await fs.mkdir(path.dirname(ARQ_LEADS), { recursive: true })
      await fs.writeFile(ARQ_LEADS, JSON.stringify([...memoria.leads.values()].map((r) => ({ id: r.id, ...r.dados })), null, 2))
    }
    if (ARQ_REGISTROS) {
      const doc = {}
      for (const r of memoria.registros.values()) {
        ;(doc[r.colecao] ||= []).push({ id: r.id, ...(r.rede_id ? { redeId: r.rede_id } : {}), ...r.dados })
      }
      await fs.mkdir(path.dirname(ARQ_REGISTROS), { recursive: true })
      await fs.writeFile(ARQ_REGISTROS, JSON.stringify(doc, null, 2))
    }
  })
  return gravando
}

await carregarDoDisco()

export const emMemoria = () => !temPostgres()
export function limparMemoria() {
  memoria.leads.clear()
  memoria.registros.clear()
}
export const tabelaMemoria = (nome) => memoria[nome]

export async function consulta(texto, valores = []) {
  const cliente = injetado || pool
  if (!cliente) throw new Error('sem Postgres: use as funções de memória')
  return cliente.query(texto, valores)
}

/**
 * Um comando por chamada, de propósito.
 *
 * `consulta()` sempre passa o array de valores, e isso faz o driver usar o
 * protocolo estendido — que recusa múltiplos comandos numa mesma instrução
 * ("cannot insert multiple commands into a prepared statement"). Juntar o
 * esquema num texto só quebrava a criação das tabelas na primeira subida.
 */
const ESQUEMA = [
  `create table if not exists leads (
     id          text primary key,
     captura_id  text unique,
     criado_em   timestamptz not null,
     origem      text,
     dados       jsonb not null
   )`,
  `create index if not exists leads_criado_em on leads (criado_em desc)`,
  `create table if not exists registros (
     id         text primary key,
     colecao    text not null,
     rede_id    text,
     criado_em  timestamptz not null,
     dados      jsonb not null
   )`,
  `create index if not exists registros_colecao on registros (colecao, rede_id)`,
]

/** Cria as tabelas na primeira necessidade. Idempotente. */
export function preparar() {
  if (!temPostgres()) return Promise.resolve()
  pronto ||= (async () => {
    for (const comando of ESQUEMA) await consulta(comando)
  })().catch((e) => {
    pronto = null                    // deixa tentar de novo no próximo pedido
    throw e
  })
  return pronto
}

export async function encerrar() {
  if (pool) await pool.end()
}
