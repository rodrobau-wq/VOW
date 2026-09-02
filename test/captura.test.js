/**
 * A fila offline reenvia — é para isso que ela existe. O que não pode é o
 * reenvio virar lead novo.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
delete process.env.DATABASE_URL
const { capturar } = await import('../server/app.js')
const { lerLeads } = await import('../leads-db.js')
const store = await import('../store.js')

const eu = { nome: 'Rodrigo Bauer' }

test('reenvio com o mesmo capturaId não cria lead novo', async () => {
  const captura = { capturaId: 'abc-123', nome: 'Marina', telefone: '51999990000', origem: 'abras' }
  const a = await capturar(captura, eu)
  const b = await capturar(captura, eu)
  const c = await capturar(captura, eu)

  assert.equal(a.id, b.id)
  assert.equal(b.id, c.id)
  assert.equal(a.duplicado, undefined)
  assert.equal(b.duplicado, true)
  assert.equal((await lerLeads()).filter((l) => l.capturaId === 'abc-123').length, 1)
})

test('exige nome ou rede, e um jeito de retornar', async () => {
  await assert.rejects(() => capturar({ email: 'a@b.com.br' }, eu), /nome ou a rede/)
  await assert.rejects(() => capturar({ nome: 'Só nome' }, eu), /e-mail ou telefone/)
  await assert.rejects(() => capturar({ nome: 'X', email: 'nao-e-email' }, eu), /E-mail inválido/)
  // Telefone sozinho basta: quem só deu o cartão não pode ser recusado.
  const so = await capturar({ nome: 'Só telefone', telefone: '51988887777' }, eu)
  assert.equal(so.estagio, 'capturado')
})

test('erro de validação é definitivo — a fila descarta em vez de travar', async () => {
  const erro = await capturar({ nome: 'X' }, eu).catch((e) => e)
  assert.equal(erro.definitivo, true)
})

test('vale o instante da captura, não o da sincronização', async () => {
  // O consultor capturou às 10h no pavilhão sem sinal; subiu às 14h. A fila
  // do funil precisa contar desde as 10h.
  const ontem = new Date(Date.now() - 864e5).toISOString()
  const l = await capturar({ capturaId: 'atrasada', nome: 'Tardia', telefone: '51900000000', capturadoEm: ontem }, eu)
  assert.equal(l.criadoEm, ontem)
  assert.ok(l.diasParado >= 1)
})

test('captura sem faturamento entra sem número, não com número errado', async () => {
  const semNumero = await capturar({ capturaId: 's1', nome: 'Sem número', telefone: '51900000001' }, eu)
  assert.equal(semNumero.valorEmJogo, 0)
  assert.deepEqual(semNumero.diagnosticos, [])

  const comNumero = await capturar({ capturaId: 's2', nome: 'Com número', telefone: '51900000002',
    faturamento: 300e6, tipos: ['revenda'] }, eu)
  assert.equal(Math.round(comNumero.valorEmJogo), 1_329_190)
})

test('a nota do consultor vira a primeira linha do histórico', async () => {
  const l = await capturar({ capturaId: 'n1', nome: 'Com nota', telefone: '51900000003',
    nota: 'É CFO da rede, quer proposta até sexta' }, eu)
  const hist = await store.listar('interacao', null, (i) => i.leadId === l.id)
  assert.equal(hist.length, 2)                       // a nota e o registro do sistema
  assert.ok(hist.some((i) => i.tipo === 'nota' && /CFO/.test(i.texto)))
  // Capturado por alguém da VOW é contato feito: não pode nascer fora do prazo.
  assert.equal(l.foraDoSla, false)
})
