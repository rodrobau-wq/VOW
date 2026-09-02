/**
 * O SQL de verdade, contra um Postgres de verdade.
 *
 * PGlite é o próprio PostgreSQL compilado para WASM: o esquema, o `jsonb ||`
 * e o `on conflict` exercitados aqui são exatamente os que rodam no Render.
 * Os outros testes usam o adaptador de memória e não pegariam um erro de SQL.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'

const pg = await PGlite.create()
const { usarCliente, preparar, consulta, temPostgres, emMemoria } = await import('../db.js')
usarCliente(pg)

const store = await import('../store.js')
const leads = await import('../leads-db.js')

test.after(() => pg.close())

test('o esquema é criado e é idempotente', async () => {
  assert.equal(temPostgres(), true)
  assert.equal(emMemoria(), false)
  await preparar()
  // Rodar de novo não pode falhar: o boot chama preparar() toda vez.
  await consulta(`create table if not exists leads (
      id text primary key, captura_id text unique, criado_em timestamptz not null,
      origem text, dados jsonb not null)`)

  const t = await consulta(
    `select table_name from information_schema.tables where table_schema='public' order by 1`)
  assert.deepEqual(t.rows.map((r) => r.table_name), ['leads', 'registros'])
})

test('captura_id tem restrição de unicidade no banco', async () => {
  const u = await consulta(`select indexdef from pg_indexes where tablename='leads'`)
  assert.ok(u.rows.some((r) => /unique/i.test(r.indexdef) && /captura_id/.test(r.indexdef)),
    'faltou o unique em captura_id — a idempotência da fila offline depende dele')
})

test('gravar e ler lead pelo caminho real', async () => {
  await leads.gravarLead({
    id: 'P1', capturaId: 'cap-p1', criadoEm: '2026-09-01T10:00:00.000Z',
    origem: 'abras', nome: 'Marina', faturamento: 300e6,
  })
  const l = (await leads.lerLeads()).find((x) => x.id === 'P1')
  assert.equal(l.nome, 'Marina')
  assert.equal(l.faturamento, 300e6)
  assert.equal((await leads.porCapturaId('cap-p1')).id, 'P1')
})

test('jsonb || mescla sem apagar o resto do documento', async () => {
  await leads.atualizarLead('P1', { estagio: 'proposta', honorario: 84000 })
  const l = (await leads.lerLeads()).find((x) => x.id === 'P1')
  assert.equal(l.estagio, 'proposta')
  assert.equal(l.honorario, 84000)
  assert.equal(l.nome, 'Marina')            // não sumiu
  assert.equal(l.faturamento, 300e6)        // nem este
  assert.ok(l.atualizadoEm)
})

test('mesmo capturaId com id novo devolve o lead que já existe', async () => {
  // É a corrida real: dois aparelhos sincronizam a mesma captura offline.
  const r = await leads.gravarLead({
    id: 'P2-outro-id', capturaId: 'cap-p1', criadoEm: new Date().toISOString(), nome: 'Duplicata',
  })
  assert.equal(r.id, 'P1')
  const quantos = await consulta(`select count(*)::int n from leads where captura_id='cap-p1'`)
  assert.equal(quantos.rows[0].n, 1)
})

test('store: insere, mescla e respeita as duas regras no banco', async () => {
  const rede = await store.inserir('rede', { razao: 'Bom Preço', porte: 'médio' })
  const d = await store.atualizar('rede', rede.id, { porte: 'grande' })
  assert.equal(d.porte, 'grande')
  assert.equal(d.razao, 'Bom Preço')

  const f = await store.inserir('fornecedor', { razao: 'Energia Sul', pago12m: 100 }, rede.id)
  assert.equal(f.redeId, rede.id)
  assert.equal((await store.porId('fornecedor', f.id)).razao, 'Energia Sul')

  const v = await store.inserir('verificacao', { fornecedorId: f.id, resultado: 'ativa' }, rede.id)
  await assert.rejects(() => store.atualizar('verificacao', v.id, { resultado: 'inapta' }), /append-only/)
  await assert.rejects(() => store.atualizar('rede', 'nao-existe', { x: 1 }), /não existe/)
})

test('listar não atravessa tenant, nem no SQL', async () => {
  const a = await store.inserir('rede', { razao: 'A' })
  const b = await store.inserir('rede', { razao: 'B' })
  await store.inserir('item', { sku: '1' }, a.id)
  await store.inserir('item', { sku: '2' }, b.id)
  await store.inserir('item', { sku: '3' }, b.id)
  assert.equal((await store.listar('item', a.id)).length, 1)
  assert.equal((await store.listar('item', b.id)).length, 2)
})

test('achar por predicado funciona sobre o que veio do banco', async () => {
  await store.inserir('usuario', { nome: 'Chefe', email: 'chefe@vow.com.br', papel: 'vow' })
  const u = await store.achar('usuario', (x) => x.email === 'chefe@vow.com.br')
  assert.equal(u.nome, 'Chefe')
  assert.equal(await store.achar('usuario', (x) => x.email === 'ninguem@x.com'), null)
})

test('migração do disco não roda com o banco já populado', async () => {
  const { migrarDoDisco } = await import('../migrar.js')
  const r = await migrarDoDisco()
  assert.equal(r.migrou, false)
  assert.match(r.motivo, /já tem dados/)
})
