/**
 * O brief de Revenda traz quatro números fechados para uma rede de R$ 300 mi
 * com verba de 3%. Eles são o contrato do motor: se algum sair do lugar, a
 * aritmética divergiu do material que a VOW leva para a mesa.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { diagnosticoRevenda, diagnosticoIndiretos, PREMISSAS, brlCurto } from '../motor.js'

test('revenda reproduz os números do brief (R$ 300 mi, verba 3%)', () => {
  const d = diagnosticoRevenda({ faturamento: 300e6 })
  assert.equal(d.verbaTotal, 9_000_000)
  assert.equal(d.tributavel, 6_345_000)
  assert.equal(d.recomposicao, 1_681_425)
  assert.equal(Math.round(d.perda), 1_329_190)
  assert.equal(Math.round(d.perdaSobreLucro * 100), 22)
})

test('recomposição é o tributo por fora e a perda é o por dentro', () => {
  const d = diagnosticoRevenda({ faturamento: 300e6 })
  const a = PREMISSAS.aliquota
  assert.ok(Math.abs(d.recomposicao - d.tributavel * a) < 0.01)
  assert.ok(Math.abs(d.perda - d.tributavel * (a / (1 + a))) < 0.01)
  // A perda é sempre menor que a recomposição — por dentro < por fora.
  assert.ok(d.perda < d.recomposicao)
})

test('revenda escala linearmente com o faturamento', () => {
  const a = diagnosticoRevenda({ faturamento: 100e6 })
  const b = diagnosticoRevenda({ faturamento: 300e6 })
  assert.ok(Math.abs(b.perda - a.perda * 3) < 0.01)
})

test('pesos das famílias de indiretos somam 1', () => {
  const soma = PREMISSAS.indiretos.familias.reduce((s, f) => s + f.peso, 0)
  assert.ok(Math.abs(soma - 1) < 1e-9, `pesos somam ${soma}`)
})

test('indiretos: ganho por família nunca é negativo e fecha com o total', () => {
  const d = diagnosticoIndiretos({ faturamento: 300e6 })
  for (const f of d.familias) {
    assert.ok(f.ganho >= 0, `${f.nome} com ganho negativo`)
    assert.ok(f.creditoDepoisPct >= f.creditoHojePct, `${f.nome} piora depois`)
  }
  const soma = d.familias.reduce((s, f) => s + f.ganho, 0)
  assert.ok(Math.abs(soma - d.ganhoCredito) < 0.01)
  assert.equal(d.destaque, d.ganhoTotal)
})

test('indiretos: saldo credor cresce com a fatia de cesta básica', () => {
  const baixo = diagnosticoIndiretos({ faturamento: 300e6, parcelaCestaBasica: 0.35 })
  const alto  = diagnosticoIndiretos({ faturamento: 300e6, parcelaCestaBasica: 0.50 })
  assert.ok(alto.saldoCredorAnual > baixo.saldoCredorAnual)
  // Conformidade sempre vale dinheiro: 30 dias prende menos caixa que 180.
  assert.ok(alto.caixaPreso30 < alto.caixaPreso180)
  assert.ok(alto.ganhoConformidade > 0)
})

test('brlCurto abrevia nas três faixas', () => {
  assert.equal(brlCurto(1_329_190), 'R$ 1,3 mi')
  assert.equal(brlCurto(291_000), 'R$ 291 mil')
  assert.equal(brlCurto(1_500_000_000), 'R$ 1,5 bi')
})
