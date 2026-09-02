/**
 * As duas regras não negociáveis do brief (seção 6) e a aritmética do painel.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

process.env.APP_DB = path.join(os.tmpdir(), `vow-test-${process.pid}.json`)
const store = await import('../store.js')
const { hashSenha, conferirSenha } = await import('../auth.js')
const { montarPainel, creditoEsperado } = await import('../painel.js')

test.after(() => fs.rm(process.env.APP_DB, { force: true }))

test('verificacao é append-only: atualizar é recusado', async () => {
  const rede = await store.inserir('rede', { razao: 'Teste' })
  const v = await store.inserir('verificacao',
    { fornecedorId: 'x', camada: 'cadastral', resultado: 'ativa' }, rede.id)
  await assert.rejects(
    () => store.atualizar('verificacao', v.id, { resultado: 'inapta' }),
    /append-only/)
})

test('dado de negócio sem redeId é recusado', async () => {
  await assert.rejects(() => store.inserir('fornecedor', { razao: 'X' }), /exige redeId/)
})

test('listar não atravessa tenant', async () => {
  const a = await store.inserir('rede', { razao: 'A' })
  const b = await store.inserir('rede', { razao: 'B' })
  await store.inserir('fornecedor', { razao: 'da A', pago12m: 10 }, a.id)
  await store.inserir('fornecedor', { razao: 'da B', pago12m: 20 }, b.id)
  const soA = await store.listar('fornecedor', a.id)
  assert.equal(soA.length, 1)
  assert.equal(soA[0].razao, 'da A')
  await assert.rejects(() => store.listar('fornecedor'), /exige redeId/)
})

test('senha: scrypt confere a certa e recusa a errada', () => {
  const h = hashSenha('vow-piloto')
  assert.ok(conferirSenha('vow-piloto', h))
  assert.ok(!conferirSenha('vow-pilot', h))
  assert.ok(!conferirSenha('', h))
  // Dois hashes da mesma senha diferem: o sal é aleatório.
  assert.notEqual(h, hashSenha('vow-piloto'))
})

test('crédito esperado exige alíquota efetiva do Sistema 3', () => {
  const rede = { premissas: { aliquota: 0.265 } }
  // Sem alíquota efetiva o número não sai estimado por cima: sai null.
  assert.equal(creditoEsperado({ pago12m: 1e6, classeCredito: 'integral', aliquotaEfetiva: null }, rede), null)
  // Regime não declarado também não gera número.
  assert.equal(creditoEsperado({ pago12m: 1e6, classeCredito: 'desconhecido', aliquotaEfetiva: 0.265 }, rede), null)
  // Com os dois, o crédito é pago × alíquota efetiva × aproveitamento.
  assert.equal(creditoEsperado({ pago12m: 1e6, classeCredito: 'integral', aliquotaEfetiva: 0.10 }, rede), 100_000)
  assert.equal(creditoEsperado({ pago12m: 1e6, classeCredito: 'guia_unica', aliquotaEfetiva: 0.10 }, rede), 30_000)
  assert.equal(creditoEsperado({ pago12m: 1e6, classeCredito: 'mei', aliquotaEfetiva: 0.10 }, rede), 0)
})

test('painel: risco e cobertura saem dos dados, e o incompleto é sinalizado', () => {
  const rede = { premissas: { aliquota: 0.265, parcelaCestaBasica: 0.4 }, programaConformidade: false }
  const fornecedores = [
    { id: 'f1', pago12m: 1e6, classeCredito: 'integral', risco: 'verde',    aliquotaEfetiva: 0.10 },
    { id: 'f2', pago12m: 2e6, classeCredito: 'integral', risco: 'vermelho', aliquotaEfetiva: 0.10 },
    { id: 'f3', pago12m: 5e5, classeCredito: 'desconhecido', risco: 'ambar', aliquotaEfetiva: null },
  ]
  const amanha = new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10)
  const p = montarPainel({
    rede, fornecedores,
    contratos: [{ fornecedorId: 'f1', vigenciaFim: amanha }],
    itens: [{ status: 'saneado' }, { status: 'divergente', ganhoMes: 500 }],
    excecoes: [],
  })
  // Só f2 conta: f3 não tem alíquota, então não vira número.
  assert.equal(p.numeros.creditoEmRisco.valor, 200_000)
  assert.equal(p.numeros.creditoEmRisco.fornecedores, 2)
  assert.equal(p.numeros.creditoEmRisco.incompleto, true)
  // 3 pagos, 1 com contrato vigente.
  assert.equal(Math.round(p.numeros.coberturaContratual.valor), 33)
  assert.equal(p.numeros.coberturaContratual.semContrato, 2)
  assert.equal(p.numeros.itensSaneados.valor, 50)
  assert.equal(p.numeros.itensSaneados.ganhoIdentificadoMes, 500)
  // Fora do programa de conformidade, o saldo espera 180 dias.
  assert.equal(p.numeros.saldoCredorNaFila.dias, 180)
  assert.ok(p.numeros.saldoCredorNaFila.custoForaDoPrograma > 0)
})

test('painel: contrato vencido não conta como cobertura', () => {
  const ontem = new Date(Date.now() - 86400e3).toISOString().slice(0, 10)
  const p = montarPainel({
    rede: {}, fornecedores: [{ id: 'f1', pago12m: 1e6, classeCredito: 'integral', risco: 'verde', aliquotaEfetiva: 0.1 }],
    contratos: [{ fornecedorId: 'f1', vigenciaFim: ontem }],
    itens: [], excecoes: [],
  })
  assert.equal(p.numeros.coberturaContratual.valor, 0)
})
