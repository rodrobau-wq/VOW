/**
 * O contrato da persistência, exercitado pelo adaptador de memória. O SQL
 * equivalente só pode ser verificado contra um Postgres de verdade — ver a
 * checagem em produção depois do deploy.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

delete process.env.DATABASE_URL
const { gravarLead, lerLeads, atualizarLead, porCapturaId, contarLeads } = await import('../leads-db.js')
const store = await import('../store.js')
const { emMemoria } = await import('../db.js')

test('sem DATABASE_URL a persistência é memória, e ela avisa', () => {
  assert.equal(emMemoria(), true)
})

test('lead grava, lê e atualiza sem perder campo', async () => {
  await gravarLead({ id: 'L1', nome: 'Marina', criadoEm: '2026-09-01T10:00:00.000Z', origem: 'abras', faturamento: 300e6 })
  const [l] = (await lerLeads()).filter((x) => x.id === 'L1')
  assert.equal(l.nome, 'Marina')

  await atualizarLead('L1', { estagio: 'qualificado' })
  const depois = (await lerLeads()).find((x) => x.id === 'L1')
  // A mesclagem preserva o que não foi enviado — é o mesmo comportamento do
  // `dados || jsonb` no Postgres.
  assert.equal(depois.estagio, 'qualificado')
  assert.equal(depois.nome, 'Marina')
  assert.equal(depois.faturamento, 300e6)
})

test('atualizar lead inexistente devolve null, não explode', async () => {
  assert.equal(await atualizarLead('nao-existe', { estagio: 'fechado' }), null)
})

test('captura é encontrada pelo capturaId', async () => {
  await gravarLead({ id: 'L2', capturaId: 'cap-9', nome: 'Caio', criadoEm: '2026-09-01T11:00:00.000Z' })
  assert.equal((await porCapturaId('cap-9')).id, 'L2')
  assert.equal(await porCapturaId('nao-existe'), null)
  assert.equal(await porCapturaId(null), null)
  assert.ok(await contarLeads() >= 2)
})

test('store mantém as duas regras depois da troca de banco', async () => {
  const rede = await store.inserir('rede', { razao: 'Teste' })
  const v = await store.inserir('verificacao', { fornecedorId: 'x', resultado: 'ativa' }, rede.id)
  await assert.rejects(() => store.atualizar('verificacao', v.id, { resultado: 'inapta' }), /append-only/)
  await assert.rejects(() => store.inserir('fornecedor', { razao: 'X' }), /exige redeId/)
  await assert.rejects(() => store.listar('fornecedor'), /exige redeId/)
  await assert.rejects(() => store.inserir('inventada', {}), /coleção desconhecida/)
})

test('atualizar do store mescla em vez de substituir', async () => {
  const r = await store.inserir('rede', { razao: 'Bom Preço', cnpj: '123', porte: 'médio' })
  const d = await store.atualizar('rede', r.id, { porte: 'grande' })
  assert.equal(d.porte, 'grande')
  assert.equal(d.razao, 'Bom Preço')
  assert.equal(d.cnpj, '123')
  assert.ok(d.atualizadoEm)
})
