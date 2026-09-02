/**
 * Os quatro números publicados no brief são o contrato do motor. Se algum
 * sair do lugar, a aritmética divergiu do material que a VOW leva à mesa.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  diagnosticoRevenda, diagnosticoIndiretos, simular, PRODUTOS, PREMISSAS,
  ALIQUOTA, POR_DENTRO, caixaRevenda, caixaIndiretos, brlCurto,
} from '../motor.js'

test('revenda reproduz os números do brief (R$ 300 mi, verba 3%)', () => {
  const d = diagnosticoRevenda({ faturamento: 300e6 })
  assert.equal(d.verbaTotal, 9_000_000)
  assert.equal(d.tributavel, 6_345_000)
  assert.equal(d.recomposicao, 1_681_425)
  assert.equal(Math.round(d.perda), 1_329_190)
  assert.equal(Math.round(d.perdaSobreLucro * 100), 22)
})

test('os 70,5% caem do mix das famílias, não de uma constante', () => {
  // Σ peso × trib = 70,5 é o que produz a parcela tributável publicada.
  const soma = PRODUTOS.revenda.familias.reduce((s, f) => s + f.peso * f.trib, 0)
  assert.equal(soma, 70.5)
  const d = diagnosticoRevenda({ faturamento: 300e6 })
  assert.ok(Math.abs(d.parcelaTributavel - 0.705) < 1e-9)
})

test('pesos de cada produto somam 100', () => {
  for (const [id, p] of Object.entries(PRODUTOS)) {
    const soma = p.familias.reduce((s, f) => s + f.peso, 0)
    assert.equal(soma, 100, `${id} soma ${soma}`)
  }
})

test('recomposição é o tributo por fora e a perda é o por dentro', () => {
  const d = diagnosticoRevenda({ faturamento: 300e6 })
  assert.ok(Math.abs(d.recomposicao - d.tributavel * ALIQUOTA) < 0.01)
  assert.ok(Math.abs(d.perda - d.tributavel * POR_DENTRO) < 0.01)
  // Por dentro é sempre menor que por fora.
  assert.ok(d.perda < d.recomposicao)
  // Número de controle da seção 11 do brief.
  assert.ok(Math.abs(d.perda / d.tributavel - 0.2095) < 1e-4)
})

test('revenda escala linearmente com o faturamento', () => {
  const a = diagnosticoRevenda({ faturamento: 100e6 })
  const b = diagnosticoRevenda({ faturamento: 300e6 })
  assert.ok(Math.abs(b.perda - a.perda * 3) < 0.01)
})

test('calibração: cada família é independente', () => {
  const todas = simular('revenda', 300e6, 3)
  const tres = simular('revenda', 300e6, 3, ['Logística', 'Marketing', 'Comercial'])
  // Desmarcar tira a linha do total sem mexer nas outras.
  const log = (r) => r.familias.find((f) => f.nome === 'Logística').valor
  assert.equal(log(todas), log(tres))
  assert.ok(tres.base < todas.base)
  // A referência não muda: é o faturamento × pct informado.
  assert.equal(tres.baseRef, todas.baseRef)
})

test('calibração: mover o peso de uma família não mexe nas demais', () => {
  const antes = simular('revenda', 300e6, 3)
  const depois = simular('revenda', 300e6, 3, null, { 'Logística': 20 })
  const mkt = (r) => r.familias.find((f) => f.nome === 'Marketing').valor
  assert.equal(mkt(antes), mkt(depois))
  assert.ok(depois.familias.find((f) => f.nome === 'Logística').valor >
            antes.familias.find((f) => f.nome === 'Logística').valor)
})

test('indiretos: ganho por família nunca é negativo e fecha com o total', () => {
  const d = diagnosticoIndiretos({ faturamento: 300e6 })
  for (const f of d.familias) {
    assert.ok(f.ganho >= 0, `${f.nome} com ganho negativo`)
    assert.ok(f.cred * POR_DENTRO >= f.hojeCred, `${f.nome} piora depois`)
  }
  // Cada família é arredondada a centavos antes de somar, então o desvio
  // acumulado é de até um centavo por linha — não é erro de aritmética.
  const soma = d.familias.reduce((s, f) => s + f.ganho, 0)
  assert.ok(Math.abs(soma - d.ganhoCredito) <= 0.01 * (d.familias.length + 1),
    `soma ${soma} vs total ${d.ganhoCredito}`)
  assert.equal(d.destaque, d.ganhoTotal)
})

test('indiretos: saldo credor cresce com a fatia de cesta básica', () => {
  const baixo = diagnosticoIndiretos({ faturamento: 300e6, parcelaCestaBasica: 0.35 })
  const alto = diagnosticoIndiretos({ faturamento: 300e6, parcelaCestaBasica: 0.50 })
  assert.ok(alto.saldoCredorAnual > baixo.saldoCredorAnual)
  // Conformidade sempre vale dinheiro: 30 dias prendem menos caixa que 180.
  assert.ok(alto.caixaPreso30 < alto.caixaPreso180)
  assert.ok(alto.ganhoConformidade > 0)
})

test('caixa: o tributo vence antes de a verba entrar', () => {
  const r = simular('revenda', 300e6, 3)
  const c = caixaRevenda(r, { dReceb: 45 })
  assert.equal(c.gap, 20)                       // 45 de receber − 25 de recolher
  assert.ok(Math.abs(c.tribMes - r.recomposicao / 12) < 0.01)
  assert.ok(c.giro > 0 && c.carrego > 0)
  // Receber à vista (antes do tributo) elimina o descasamento.
  assert.equal(caixaRevenda(r, { dReceb: 10 }).gap, 0)
})

test('caixa: prazo de ressarcimento maior prende mais caixa', () => {
  const r = simular('indiretos', 300e6, 8)
  const curto = caixaIndiretos(r, { prazo: 30 })
  const longo = caixaIndiretos(r, { prazo: 180 })
  assert.ok(longo.preso > curto.preso)
  assert.ok(longo.carrego > curto.carrego)
})

test('premissas expostas continuam batendo com o motor', () => {
  assert.equal(PREMISSAS.aliquota, 0.265)
  assert.ok(Math.abs(PREMISSAS.porDentro - 0.2095) < 1e-4)
  assert.equal(PREMISSAS.revenda.percentualVerbaPadrao, 0.03)
  assert.equal(PREMISSAS.indiretos.percentualBasePadrao, 0.08)
})

test('brlCurto abrevia nas três faixas', () => {
  assert.equal(brlCurto(1_329_190), 'R$ 1,3 mi')
  assert.equal(brlCurto(291_000), 'R$ 291 mil')
  assert.equal(brlCurto(1_500_000_000), 'R$ 1,5 bi')
})
