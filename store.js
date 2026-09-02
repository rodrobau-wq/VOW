/**
 * Persistência da plataforma — Postgres, com as mesmas regras de sempre.
 *
 * DUAS REGRAS QUE NÃO SE NEGOCIAM:
 *
 * 1. `verificacao` e `interacao` são append-only. Uma é o log de diligência e
 *    a defesa em fiscalização; a outra é o histórico do que foi combinado com
 *    o cliente. Um UPDATE em qualquer das duas destrói o valor da tabela, e
 *    `atualizar()` recusa as duas.
 *
 * 2. Todo dado de negócio é escopado por `redeId`. Nenhuma consulta atravessa
 *    tenant — `listar()` exige a rede, e não há como pedir "todos os
 *    fornecedores" sem dizer de quem.
 *
 * Tudo vive na tabela `registros`, com a coleção numa coluna e o documento em
 * jsonb. É o formato que o modelo já tinha em arquivo, então a migração não
 * mexeu em nenhuma chamada.
 */
import crypto from 'node:crypto'
import { consulta, preparar, emMemoria, tabelaMemoria } from './db.js'

/** Coleções que nunca são atualizadas, só recebem linha nova. */
const APPEND_ONLY = new Set(['verificacao', 'interacao'])

/** Coleções que não pertencem a uma rede: são o cadastro da própria
 *  plataforma. `interacao` entra aqui porque acompanha lead, e lead é da
 *  VOW — só vira rede depois de fechar. */
const GLOBAIS = new Set(['rede', 'usuario', 'interacao'])

const COLECOES = new Set([
  'rede', 'usuario', 'fornecedor', 'verificacao', 'item', 'contrato', 'excecao', 'interacao',
])

function checa(colecao) {
  if (!COLECOES.has(colecao)) throw new Error(`coleção desconhecida: ${colecao}`)
}

const linha = (r) => ({ id: r.id, ...(r.rede_id ? { redeId: r.rede_id } : {}), ...r.dados })

export async function inserir(colecao, dados, redeId = null) {
  checa(colecao)
  if (!GLOBAIS.has(colecao) && !redeId) {
    throw new Error(`${colecao} exige redeId — nenhum dado de negócio fica fora do tenant`)
  }
  const id = crypto.randomUUID()
  const criadoEm = new Date().toISOString()
  const doc = { ...dados, criadoEm }

  if (emMemoria()) {
    tabelaMemoria('registros').set(id, { id, colecao, rede_id: redeId, dados: doc })
  } else {
    await preparar()
    await consulta(
      'insert into registros (id, colecao, rede_id, criado_em, dados) values ($1,$2,$3,$4,$5)',
      [id, colecao, redeId, criadoEm, doc])
  }
  return { id, ...(redeId ? { redeId } : {}), ...doc }
}

export async function atualizar(colecao, id, mudancas) {
  checa(colecao)
  if (APPEND_ONLY.has(colecao)) {
    throw new Error(`${colecao} é append-only: registre uma linha nova em vez de atualizar`)
  }
  const atualizadoEm = new Date().toISOString()

  if (emMemoria()) {
    const r = tabelaMemoria('registros').get(id)
    if (!r || r.colecao !== colecao) throw new Error(`${colecao}/${id} não existe`)
    r.dados = { ...r.dados, ...mudancas, atualizadoEm }
    return linha(r)
  }
  await preparar()
  // `||` mescla no jsonb: só as chaves enviadas mudam, o resto do documento
  // fica intacto — é o mesmo comportamento do Object.assign de antes.
  const r = await consulta(
    `update registros set dados = dados || $3::jsonb
     where id = $1 and colecao = $2 returning *`,
    [id, colecao, JSON.stringify({ ...mudancas, atualizadoEm })])
  if (!r.rowCount) throw new Error(`${colecao}/${id} não existe`)
  return linha(r.rows[0])
}

export async function listar(colecao, redeId = null, filtro = null) {
  checa(colecao)
  const global = GLOBAIS.has(colecao)
  if (!global && !redeId) throw new Error(`${colecao} exige redeId`)

  let linhas
  if (emMemoria()) {
    linhas = [...tabelaMemoria('registros').values()]
      .filter((r) => r.colecao === colecao && (global || r.rede_id === redeId))
      .map(linha)
  } else {
    await preparar()
    const r = global
      ? await consulta('select * from registros where colecao = $1 order by criado_em', [colecao])
      : await consulta('select * from registros where colecao = $1 and rede_id = $2 order by criado_em', [colecao, redeId])
    linhas = r.rows.map(linha)
  }
  return filtro ? linhas.filter(filtro) : linhas
}

/**
 * Busca por predicado em JavaScript. Serve para as consultas pequenas do
 * cadastro (achar usuário por e-mail). Coleção grande pede índice e SQL.
 */
export async function achar(colecao, filtro) {
  checa(colecao)
  if (emMemoria()) {
    return [...tabelaMemoria('registros').values()]
      .filter((r) => r.colecao === colecao).map(linha).find(filtro) || null
  }
  await preparar()
  const r = await consulta('select * from registros where colecao = $1', [colecao])
  return r.rows.map(linha).find(filtro) || null
}

export async function porId(colecao, id) {
  checa(colecao)
  if (emMemoria()) {
    const r = tabelaMemoria('registros').get(id)
    return r && r.colecao === colecao ? linha(r) : null
  }
  await preparar()
  const r = await consulta('select * from registros where id = $1 and colecao = $2', [id, colecao])
  return r.rowCount ? linha(r.rows[0]) : null
}

export async function vazio() {
  return (await listar('rede')).length === 0
}

/** Só para os testes e o seed. */
export { limparMemoria as esquecerCache } from './db.js'
