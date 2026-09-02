/**
 * Persistência da plataforma — JSON em arquivo, multi-tenant.
 *
 * O brief é explícito: arquivo aguenta o piloto, Postgres só quando o
 * primeiro contrato for assinado. Então o que importa aqui não é a
 * tecnologia, é a forma — as coleções e as regras de escrita já são as do
 * banco futuro, e a troca fica mecânica.
 *
 * DUAS REGRAS QUE NÃO SE NEGOCIAM:
 *
 * 1. `verificacao` e `interacao` são append-only. Uma é o log de diligência e
 *    a defesa em fiscalização; a outra é o histórico do que foi combinado com
 *    o cliente. Um UPDATE em qualquer das duas destrói o valor da tabela, e
 *    `atualizar()` recusa as duas.
 *
 * 2. Todo dado de negócio é escopado por `redeId`. Nenhuma consulta
 *    atravessa tenant — `listar()` exige a rede, e não há como pedir
 *    "todos os fornecedores" sem dizer de quem.
 */
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const ARQUIVO = process.env.APP_DB || path.join(process.cwd(), 'data', 'db.json')

/** Coleções que nunca são atualizadas, só recebem linha nova. */
const APPEND_ONLY = new Set(['verificacao', 'interacao'])

/** Coleções que não pertencem a uma rede: são o cadastro da própria plataforma.
 *  `interacao` entra aqui porque acompanha lead, e lead é da VOW — só vira
 *  rede depois de fechar. */
const GLOBAIS = new Set(['rede', 'usuario', 'interacao'])

const VAZIO = {
  rede: [], usuario: [], fornecedor: [], verificacao: [],
  item: [], contrato: [], excecao: [], interacao: [],
}

let cache = null
let fila = Promise.resolve()

async function carregar() {
  if (cache) return cache
  try {
    cache = { ...VAZIO, ...JSON.parse(await fs.readFile(ARQUIVO, 'utf8')) }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
    cache = structuredClone(VAZIO)
  }
  return cache
}

/** Escritas são serializadas: o arquivo inteiro é reescrito a cada uma. */
function persistir() {
  fila = fila.then(async () => {
    await fs.mkdir(path.dirname(ARQUIVO), { recursive: true })
    await fs.writeFile(ARQUIVO, JSON.stringify(cache, null, 2))
  })
  return fila
}

function checaColecao(colecao) {
  if (!(colecao in VAZIO)) throw new Error(`coleção desconhecida: ${colecao}`)
}

export async function inserir(colecao, dados, redeId = null) {
  checaColecao(colecao)
  if (!GLOBAIS.has(colecao) && !redeId) {
    throw new Error(`${colecao} exige redeId — nenhum dado de negócio fica fora do tenant`)
  }
  const db = await carregar()
  const linha = {
    id: crypto.randomUUID(),
    ...(redeId ? { redeId } : {}),
    ...dados,
    criadoEm: new Date().toISOString(),
  }
  db[colecao].push(linha)
  await persistir()
  return linha
}

export async function atualizar(colecao, id, mudancas) {
  checaColecao(colecao)
  if (APPEND_ONLY.has(colecao)) {
    throw new Error(`${colecao} é append-only: registre uma linha nova em vez de atualizar`)
  }
  const db = await carregar()
  const linha = db[colecao].find((r) => r.id === id)
  if (!linha) throw new Error(`${colecao}/${id} não existe`)
  Object.assign(linha, mudancas, { atualizadoEm: new Date().toISOString() })
  await persistir()
  return linha
}

export async function listar(colecao, redeId = null, filtro = null) {
  checaColecao(colecao)
  const db = await carregar()
  let linhas = db[colecao]
  if (!GLOBAIS.has(colecao)) {
    if (!redeId) throw new Error(`${colecao} exige redeId`)
    linhas = linhas.filter((r) => r.redeId === redeId)
  }
  return filtro ? linhas.filter(filtro) : linhas
}

export async function achar(colecao, filtro) {
  checaColecao(colecao)
  const db = await carregar()
  return db[colecao].find(filtro) || null
}

export async function porId(colecao, id) {
  return achar(colecao, (r) => r.id === id)
}

/** Só para os testes e o seed: zera o cache em memória. */
export function esquecerCache() {
  cache = null
}

export async function vazio() {
  const db = await carregar()
  return db.rede.length === 0
}
