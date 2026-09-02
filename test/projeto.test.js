/**
 * O projeto é o que começa quando a venda termina. As três coisas que toda
 * etapa precisa ter — responsável, prazo e objetivo — são o contrato aqui.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { montarProjeto, resumo, PESOS, DURACAO, STATUS_ETAPA } from '../projeto.js'
import { PRODUTOS } from '../motor.js'

const lead = (o = {}) => ({
  id: 'L1', empresa: 'Rede Bom Preço', honorario: 84_000,
  diagnosticos: [{ tipo: 'revenda', destaque: 1_000_000 }], ...o,
})

test('as etapas vêm da metodologia do brief, não são inventadas aqui', () => {
  const p = montarProjeto(lead())
  const nomes = p.etapas.map((e) => e.nome)
  assert.deepEqual(nomes, PRODUTOS.revenda.etapas.map((e) => e.t))
})

test('toda etapa nasce com prazo e objetivo, e o dono vem do responsável', () => {
  const p = montarProjeto(lead(), { responsavel: 'Rodrigo Bauer' })
  for (const e of p.etapas) {
    assert.ok(e.prazo, `${e.nome} sem prazo`)
    assert.ok(e.objetivo > 0, `${e.nome} sem objetivo`)
    assert.equal(e.responsavel, 'Rodrigo Bauer')
    assert.equal(e.status, 'prevista')
  }
  // Prazos cumulativos: cada etapa vence depois da anterior.
  for (let i = 1; i < p.etapas.length; i++) {
    assert.ok(p.etapas[i].prazo > p.etapas[i - 1].prazo)
  }
})

test('os objetivos somam o valor em jogo, sem inventar dinheiro', () => {
  const p = montarProjeto(lead())
  const soma = p.etapas.reduce((s, e) => s + e.objetivo, 0)
  assert.ok(Math.abs(soma - 1_000_000) < 1, `somou ${soma}`)
  assert.equal(p.valorEmJogo, 1_000_000)
  // O honorário da VOW é outro número e não se mistura com o objetivo.
  assert.equal(p.honorario, 84_000)
})

test('os pesos somam 100 em cada produto', () => {
  for (const [produto, pesos] of Object.entries(PESOS)) {
    const soma = Object.values(pesos).reduce((s, v) => s + v, 0)
    assert.equal(soma, 100, `${produto} soma ${soma}`)
    // Todo nome de etapa do produto tem peso e duração declarados.
    for (const e of PRODUTOS[produto].etapas) {
      assert.ok(pesos[e.t] !== undefined, `${produto}: ${e.t} sem peso`)
      assert.ok(DURACAO[e.t] !== undefined, `${produto}: ${e.t} sem duração`)
    }
  }
})

test('lead com os dois diagnósticos gera as etapas dos dois', () => {
  const p = montarProjeto(lead({
    diagnosticos: [{ tipo: 'revenda', destaque: 1e6 }, { tipo: 'indiretos', destaque: 3e6 }],
  }))
  assert.equal(p.produtos.length, 2)
  assert.equal(p.etapas.length, PRODUTOS.revenda.etapas.length + PRODUTOS.indiretos.etapas.length)
  // Cada produto persegue o próprio objetivo, não uma média dos dois.
  const soma = (t) => p.etapas.filter((e) => e.produto === t).reduce((s, e) => s + e.objetivo, 0)
  assert.ok(Math.abs(soma('revenda') - 1e6) < 1)
  assert.ok(Math.abs(soma('indiretos') - 3e6) < 1)
})

test('resumo conta entrega, atraso e etapa sem dono', () => {
  const p = montarProjeto(lead(), { responsavel: 'Rodrigo' })
  p.etapas[0].status = 'concluída'
  p.etapas[1].prazo = '2020-01-01'          // vencida
  p.etapas[2].responsavel = null

  const r = resumo(p)
  assert.equal(r.concluidas, 1)
  assert.equal(r.atrasadas, 1)
  assert.equal(r.semResponsavel, 1)
  assert.equal(r.progresso, 20)             // 1 de 5
  assert.equal(r.entregue, p.etapas[0].objetivo)
  assert.ok(r.emRisco > 0)
  // A próxima a puxar é a de prazo mais curto que ainda não fechou.
  assert.equal(r.proxima.prazo, '2020-01-01')
})

test('projeto sem etapa não divide por zero', () => {
  const r = resumo({ etapas: [] })
  assert.equal(r.progresso, 0)
  assert.equal(r.progressoFinanceiro, 0)
  assert.equal(r.proxima, null)
})

test('as situações da etapa são lista fechada', () => {
  assert.deepEqual(STATUS_ETAPA, ['prevista', 'em andamento', 'concluída', 'travada'])
})
