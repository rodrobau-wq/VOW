/**
 * O que a captura guarda — e o que ela se recusa a guardar sujo.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
delete process.env.DATABASE_URL

const { gravarLead, lerLeads } = await import('../leads-db.js')

/** Reproduz a higienização que a rota aplica antes de gravar. */
const limparUf = (uf) =>
  /^[A-Z]{2}$/.test(String(uf || '').toUpperCase()) ? String(uf).toUpperCase() : ''

test('a UF é normalizada para duas maiúsculas', () => {
  // O dado vem da consulta de CNPJ, que já está na tela quando a pessoa
  // digita. Não guardar ali é perdê-lo: depois não há como saber de onde
  // o lead veio.
  assert.equal(limparUf('rs'), 'RS')
  assert.equal(limparUf('SP'), 'SP')
})

test('UF fora do formato vira vazio em vez de sujar a base', () => {
  // Um mapa por estado só funciona se a coluna tiver sempre a mesma forma.
  for (const ruim of ['Rio Grande do Sul', 'R', 'RS1', '', null, undefined, 123, 'r$']) {
    assert.equal(limparUf(ruim), '', `aceitou ${JSON.stringify(ruim)}`)
  }
})

test('o lead guarda de onde a rede é, não só quem ela é', async () => {
  const lead = {
    id: 'lead-uf', criadoEm: new Date().toISOString(),
    nome: 'Marina', email: 'marina@rede.com.br', empresa: 'Rede Continental',
    cnpj: '00.000.000/0001-00', uf: 'RS', municipio: 'Porto Alegre',
    origem: 'site', estagio: 'capturado', diagnosticos: [],
  }
  await gravarLead(lead)
  const salvo = (await lerLeads()).find((l) => l.id === 'lead-uf')
  assert.equal(salvo.uf, 'RS')
  assert.equal(salvo.municipio, 'Porto Alegre')
})
