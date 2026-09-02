/**
 * As regras que o CRM não pode perder: os dois números separados, a fase
 * final mandando na probabilidade, e o prazo de primeiro contato.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  comCrm, montarPipeline, montarResultado, montarHoje,
  ESTAGIOS, ABERTOS, MOTIVOS_PERDA, SLA_PRIMEIRO_CONTATO_H, valorEmJogo,
} from '../crm.js'

const DIA = 864e5
const hoje = () => new Date().toISOString().slice(0, 10)
const atras = (d) => new Date(Date.now() - d * DIA).toISOString()
const lead = (o = {}) => ({
  id: 'L' + Math.random(), criadoEm: atras(1), origem: 'site',
  diagnosticos: [{ tipo: 'revenda', destaque: 1_000_000 }], ...o,
})

test('valor em jogo e previsão são números diferentes', () => {
  // O diagnóstico é a exposição do cliente. Sem honorário não há receita da
  // VOW, e a previsão tem de ser zero — nunca o valor em jogo.
  const semHonorario = comCrm(lead({ estagio: 'qualificado' }))
  assert.equal(semHonorario.valorEmJogo, 1_000_000)
  assert.equal(semHonorario.previsao, 0)

  const comHonorario = comCrm(lead({ estagio: 'proposta', honorario: 80_000 }))
  assert.equal(comHonorario.valorEmJogo, 1_000_000)
  assert.equal(comHonorario.previsao, 80_000 * 0.7)
})

test('valor em jogo soma os dois diagnósticos', () => {
  assert.equal(valorEmJogo({ diagnosticos: [{ destaque: 3 }, { destaque: 4 }] }), 7)
  assert.equal(valorEmJogo({}), 0)
})

test('fase final manda na probabilidade', () => {
  // Um negócio ganho não pode continuar aparecendo com 70% de chance só
  // porque foi isso que o consultor digitou na proposta.
  const ganho = comCrm(lead({ estagio: 'fechado', honorario: 80_000, probabilidade: 0.7 }))
  assert.equal(ganho.probabilidade, 1)
  assert.equal(ganho.previsao, 80_000)

  const perdido = comCrm(lead({ estagio: 'perdido', honorario: 80_000, probabilidade: 0.7 }))
  assert.equal(perdido.probabilidade, 0)
  assert.equal(perdido.previsao, 0)
})

test('fora do prazo: capturado há mais de 48 h sem ninguém falar', () => {
  assert.equal(comCrm(lead({ criadoEm: atras(1) })).foraDoSla, false)
  assert.equal(comCrm(lead({ criadoEm: atras(5) })).foraDoSla, true)
  // Contato registrado tira do atraso, mesmo que antigo.
  assert.equal(comCrm(lead({ criadoEm: atras(5), primeiroContatoEm: atras(4) })).foraDoSla, false)
  // Fase final não tem prazo de contato a cumprir.
  assert.equal(comCrm(lead({ criadoEm: atras(9), estagio: 'perdido' })).foraDoSla, false)
  assert.equal(SLA_PRIMEIRO_CONTATO_H, 48)
})

test('atraso na fase usa a meta da fase, não um número fixo', () => {
  // Capturado tem meta de 2 dias; levantamento tem 30.
  assert.equal(comCrm(lead({ estagio: 'capturado', estagioDesde: atras(4) })).atrasadoNaFase, true)
  assert.equal(comCrm(lead({ estagio: 'levantamento', estagioDesde: atras(4) })).atrasadoNaFase, false)
})

test('pipeline separa a previsão do valor em jogo e ignora as fases finais', () => {
  const p = montarPipeline([
    lead({ estagio: 'proposta', honorario: 100_000 }),
    lead({ estagio: 'capturado' }),
    lead({ estagio: 'fechado', honorario: 500_000 }),
    lead({ estagio: 'perdido', motivoPerda: 'porte' }),
  ])
  assert.equal(p.totalAbertos, 2)
  assert.equal(p.colunas.length, ABERTOS.length)
  // Só os dois abertos entram: 100.000 × 0,7 da proposta, e zero do capturado.
  assert.equal(p.previsaoPonderada, 70_000)
  assert.equal(p.valorEmJogoTotal, 2_000_000)
})

test('resultado: taxa é nula quando nada foi decidido, não zero', () => {
  // 0/0 é ausência de dado. Mostrar 0% faria parecer que se perdeu tudo.
  const vazio = montarResultado([lead({ estagio: 'proposta' })])
  assert.equal(vazio.taxa, null)
  assert.equal(vazio.cicloMedioDias, null)

  const r = montarResultado([
    lead({ estagio: 'fechado', honorario: 80_000, criadoEm: atras(30), fechadoEm: atras(10) }),
    lead({ estagio: 'perdido', motivoPerda: 'concorrente', fechadoEm: atras(5) }),
  ])
  assert.equal(r.fechados, 1)
  assert.equal(r.perdidos, 1)
  assert.equal(r.taxa, 50)
  assert.equal(r.receitaFechada, 80_000)
  assert.equal(r.cicloMedioDias, 20)
  assert.equal(r.motivos.find((m) => m.id === 'concorrente').total, 1)
})

test('resultado respeita a janela de tempo', () => {
  const leads = [
    lead({ estagio: 'fechado', honorario: 10, fechadoEm: atras(200) }),
    lead({ estagio: 'fechado', honorario: 20, fechadoEm: atras(5) }),
  ]
  assert.equal(montarResultado(leads).fechados, 2)
  assert.equal(montarResultado(leads, atras(30)).fechados, 1)
})

test('hoje separa o vencido do que ninguém combinou', () => {
  const d = montarHoje([
    lead({ criadoEm: atras(9) }),                                                    // fora do prazo
    lead({ primeiroContatoEm: atras(1), estagio: 'reuniao',
           proximaAcao: { texto: 'Ligar', quando: '2020-01-01' } }),                 // vencida
    lead({ primeiroContatoEm: atras(1), estagio: 'reuniao',
           proximaAcao: { texto: 'Enviar proposta', quando: hoje() } }),             // hoje
    lead({ primeiroContatoEm: atras(1), estagio: 'qualificado' }),                   // sem ação
    lead({ estagio: 'fechado' }),                                                    // final, fora de tudo
  ])
  assert.equal(d.foraDoSla.length, 1)
  assert.equal(d.vencidas.length, 1)
  assert.equal(d.hoje.length, 1)
  assert.equal(d.semProximaAcao.length, 1)
})

test('cada fase aberta declara critério de saída e meta', () => {
  for (const e of ESTAGIOS.filter((x) => !x.final)) {
    assert.ok(e.saida, `${e.id} sem critério de saída`)
    assert.ok(e.metaDias > 0, `${e.id} sem meta de dias`)
  }
  // Motivo de perda é lista fechada — texto livre inviabiliza o relatório.
  assert.equal(MOTIVOS_PERDA.length, 6)
  assert.ok(MOTIVOS_PERDA.every((m) => m.id && m.rotulo && m.acao))
})

test('a feira ganha a coluna que separa "simulou" de "conversamos"', () => {
  const ids = ESTAGIOS.map((e) => e.id)
  assert.deepEqual(ids, ['capturado', 'abordado', 'qualificado', 'reuniao',
                         'levantamento', 'proposta', 'fechado', 'perdido'])
  // Seis colunas abertas no quadro; fechado e perdido saem dele.
  assert.equal(ABERTOS.length, 6)
  // A probabilidade sobe monotonicamente até a proposta: um lead nunca vale
  // menos por ter avançado.
  const abertos = ESTAGIOS.filter((e) => !e.final)
  for (let i = 1; i < abertos.length; i++) {
    assert.ok(abertos[i].prob > abertos[i - 1].prob,
      `${abertos[i].id} não vale mais que ${abertos[i - 1].id}`)
  }
})

test('abordado tira o lead do atraso de primeiro contato', () => {
  const antigo = { id: 'x', criadoEm: atras(9), diagnosticos: [] }
  // Capturado há nove dias sem contato: está fora do prazo.
  assert.equal(comCrm({ ...antigo, estagio: 'capturado' }).foraDoSla, true)
  // Movido para abordado, a conversa aconteceu — mesmo sem a data gravada.
  assert.equal(comCrm({ ...antigo, estagio: 'abordado' }).foraDoSla, false)
})

test('cada fase aberta tem dica e critério de saída', () => {
  for (const e of ESTAGIOS.filter((x) => !x.final)) {
    assert.ok(e.dica, `${e.id} sem dica`)
    assert.ok(e.saida, `${e.id} sem critério de saída`)
  }
})
