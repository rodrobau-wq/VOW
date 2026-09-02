/**
 * Popula a plataforma com uma carteira de demonstração.
 *
 *   node scripts/seed.js            # cria se estiver vazio
 *   node scripts/seed.js --forcar   # apaga e recria
 *
 * Os dados são inventados, mas a FORMA é a real: fornecedor com regime não
 * declarado, CNPJ pago sem contrato, item sem alíquota efetiva. É justamente
 * o que está faltando que o painel precisa saber mostrar.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import * as store from '../store.js'
import { hashSenha } from '../auth.js'

const SENHA = process.env.SEED_PASSWORD || 'vow-piloto'
const ARQUIVO = process.env.APP_DB || path.join(process.cwd(), 'data', 'db.json')

if (process.argv.includes('--forcar')) {
  await fs.rm(ARQUIVO, { force: true })
  store.esquecerCache()
}
if (!(await store.vazio())) {
  console.log('Já existe base. Use --forcar para recriar.')
  process.exit(0)
}

const dia = (d) => new Date(Date.now() + d * 86400e3).toISOString().slice(0, 10)

/* --------------------------------------------------------------- redes */
const bomPreco = await store.inserir('rede', {
  cnpj: '12.345.678/0001-90', razao: 'Rede Bom Preço', porte: 'R$ 300 mi a 1 bi', plano: 'piloto',
  programaConformidade: false,
  // Cada rede carrega as premissas dela. Nunca hardcode premissa fora daqui.
  premissas: { aliquota: 0.265, parcelaCestaBasica: 0.44 },
})
const vale = await store.inserir('rede', {
  cnpj: '98.765.432/0001-10', razao: 'Supermercados Vale', porte: 'R$ 100 a 300 mi', plano: 'piloto',
  programaConformidade: true,
  premissas: { aliquota: 0.265, parcelaCestaBasica: 0.38 },
})

/* ------------------------------------------------------------ usuários */
await store.inserir('usuario', {
  nome: 'Rodrigo Bauer', email: process.env.ADMIN_EMAIL || 'rodrobau@gmail.com', papel: 'vow',
  senhaHash: hashSenha(SENHA), redes: [],   // papel vow enxerga todas
})
await store.inserir('usuario', {
  nome: 'Marina Aguiar', email: 'marina@bompreco.com.br', papel: 'fiscal',
  senhaHash: hashSenha(SENHA), redes: [bomPreco.id],
})
await store.inserir('usuario', {
  nome: 'Caio Ferraz', email: 'caio@vale.com.br', papel: 'suprimentos',
  senhaHash: hashSenha(SENHA), redes: [vale.id, bomPreco.id],
})

/* -------------------------------------------------------- fornecedores */
// [razao, cnpj, familia, pago12m, classeCredito, risco, aliquotaEfetiva]
const FORN = [
  ['Distribuidora Andorinha',   '11.111.111/0001-01', 'Revenda',     18_400_000, 'integral',     'verde',    0.121],
  ['Laticínios Serra Azul',     '22.222.222/0001-02', 'Revenda',     12_900_000, 'integral',     'verde',    0.038],
  ['Frigorífico Campo Novo',    '33.333.333/0001-03', 'Revenda',      9_750_000, 'integral',     'ambar',    0.061],
  ['Bebidas Litoral',           '44.444.444/0001-04', 'Revenda',      7_200_000, 'integral',     'verde',    0.265],
  ['Higiene Aurora',            '55.555.555/0001-05', 'Revenda',      4_100_000, 'integral',     'verde',    0.265],
  ['Panificadora Trigo de Ouro','66.666.666/0001-06', 'Revenda',      2_350_000, 'guia_unica',   'ambar',    0.049],
  ['Energia Sul Comercializadora','77.777.777/0001-07','Utilidades',  6_800_000, 'integral',     'verde',    0.265],
  ['Imobiliária Pinheiro',      '88.888.888/0001-08', 'Ocupação',     5_400_000, 'desconhecido', 'ambar',    null ],
  ['Limpeza Prisma',            '99.999.999/0001-09', 'Facilities',   2_900_000, 'guia_unica',   'ambar',    0.265],
  ['Segurança Vigilante',       '10.101.010/0001-10', 'Facilities',   2_640_000, 'guia_unica',   'vermelho', 0.265],
  ['Refrigeração Polar',        '12.121.212/0001-11', 'Facilities',   1_880_000, 'integral',     'verde',    0.265],
  ['Transportes Marca Certa',   '13.131.313/0001-12', 'Logística',    3_720_000, 'integral',     'verde',    0.265],
  ['Bluesoft Sistemas',         '14.141.414/0001-13', 'Tecnologia',   1_260_000, 'integral',     'verde',    0.265],
  ['Contabilidade Ipiranga',    '15.151.515/0001-14', 'Serviços',       540_000, 'guia_unica',   'ambar',    0.265],
  ['Promotoria de Vendas RS',   '16.161.616/0001-15', 'Pessoas',      4_950_000, 'desconhecido', 'ambar',    null ],
  ['Manutenção Predial Sul',    '17.171.717/0001-16', 'Facilities',     980_000, 'mei',          'verde',    0.265],
]

const fornecedores = []
for (const [razao, cnpj, familia, pago12m, classeCredito, risco, aliquotaEfetiva] of FORN) {
  fornecedores.push(await store.inserir('fornecedor', {
    razao, cnpj, familia, pago12m, classeCredito, risco, aliquotaEfetiva,
    regimeDeclaradoEm: classeCredito === 'desconhecido' ? null : dia(-40),
  }, bomPreco.id))
}

/* --------------------------------------------------------- verificações */
// Append-only: cada linha é uma consulta feita, com fonte e data. É o log de
// diligência que sustenta o crédito numa fiscalização.
for (const f of fornecedores.slice(0, 11)) {
  await store.inserir('verificacao', {
    fornecedorId: f.id, camada: 'cadastral', fonte: 'Receita Federal',
    resultado: f.risco === 'vermelho' ? 'inapta' : 'ativa', ts: new Date().toISOString(),
  }, bomPreco.id)
}
for (const f of fornecedores.filter((f) => f.classeCredito !== 'desconhecido').slice(0, 6)) {
  await store.inserir('verificacao', {
    fornecedorId: f.id, camada: 'regime', fonte: 'declaração do fornecedor · portal',
    resultado: f.classeCredito, ts: new Date().toISOString(),
  }, bomPreco.id)
}

/* ------------------------------------------------------------ contratos */
// Quatro fornecedores pagos ficam sem contrato de propósito: é o buraco que a
// tela de cobertura existe para revelar.
const SEM_CONTRATO = new Set(['Imobiliária Pinheiro', 'Promotoria de Vendas RS', 'Contabilidade Ipiranga', 'Manutenção Predial Sul'])
for (const f of fornecedores) {
  if (SEM_CONTRATO.has(f.razao)) continue
  await store.inserir('contrato', {
    fornecedorId: f.id, tipo: f.familia === 'Revenda' ? 'comercial' : 'serviço',
    vigenciaInicio: dia(-300), vigenciaFim: dia(f.razao === 'Bebidas Litoral' ? 25 : 400),
    score: f.risco === 'verde' ? 78 : 52,
    clausulas: ['objeto', 'preço', 'prazo', ...(f.risco === 'verde' ? ['regime declarado', 'gatilho de mudança de regime'] : [])],
    arquivo: null,
  }, bomPreco.id)
}

/* ---------------------------------------------------------------- itens */
const CATEGORIAS = [
  ['Mercearia', 0.00, 'saneado'], ['Laticínios', 0.00, 'saneado'], ['Carnes', 0.00, 'divergente'],
  ['Bebidas', 0.265, 'saneado'], ['Limpeza', 0.265, 'saneado'], ['Higiene', 0.265, 'divergente'],
  ['Hortifruti', 0.00, 'divergente'], ['Padaria', 0.106, 'pendente'],
]
for (let i = 0; i < 320; i++) {
  const [categoria, aliq, base] = CATEGORIAS[i % CATEGORIAS.length]
  const status = i % 7 === 0 ? base : (i % 3 === 0 ? 'divergente' : 'saneado')
  await store.inserir('item', {
    sku: String(10000 + i * 7), categoria,
    ncm: '0000.00.00', cclasstrib: aliq === 0 ? '200003' : '000001',
    aliquotaEfetiva: aliq, status,
    ganhoMes: status === 'saneado' ? 0 : Math.round(400 + (i % 23) * 310),
    evidencia: status === 'saneado' ? 'base mestre VOW' : null,
  }, bomPreco.id)
}

/* -------------------------------------------------------------- exceções */
const EXC = [
  ['fornecedor', 'Imobiliária Pinheiro recebeu R$ 5,4 mi em 12 meses sem contrato vinculado', 'Locação antiga, contrato nunca digitalizado', 'Localizar o contrato e cadastrar, ou renegociar com as cláusulas novas', 'Jurídico', dia(-3)],
  ['fornecedor', 'Promotoria de Vendas RS não declarou o regime tributário', 'Opção do Simples pelo regime regular não é consultável por terceiros', 'Enviar o portal do fornecedor e cobrar a declaração antes da janela de setembro', 'Suprimentos', dia(2)],
  ['fornecedor', 'Segurança Vigilante está inapta na Receita', 'Débito não extinto compromete o crédito a partir de 2028 (art. 47)', 'Suspender novos pedidos e acionar a alternativa homologada', 'Suprimentos', dia(5)],
  ['contrato', 'Contrato da Bebidas Litoral vence em 25 dias', 'Renovação automática sem as cláusulas de regime e documento fiscal', 'Renegociar incluindo as sete linhas novas antes do vencimento', 'Comercial', dia(25)],
  ['item', '46 itens de Carnes com cClassTrib divergente da base mestre', 'Peso variável ficou fora da curadoria automática', 'Encaminhar ao especialista e aprovar em lote', 'Fiscal', dia(9)],
  ['item', 'Hortifruti sem alíquota efetiva calculada', 'Base do Sistema 3 ainda não processada para a família', 'Rodar o saneamento da família antes de fechar o número de crédito em risco', 'Fiscal', dia(14)],
  ['fornecedor', 'Contabilidade Ipiranga paga sem contrato vigente', 'Contrato venceu e não foi renovado', 'Renovar com declaração de regime e gatilho de mudança', 'Jurídico', dia(-1)],
]
for (const [origem, fato, causa, acao, responsavel, prazo] of EXC) {
  await store.inserir('excecao', { origem, fato, causa, acao, responsavel, prazo, status: 'aberta' }, bomPreco.id)
}

// A segunda rede fica quase vazia de propósito: exercita o onboarding.
await store.inserir('fornecedor', {
  razao: 'Distribuidora Litoral Norte', cnpj: '20.202.020/0001-20', familia: 'Revenda',
  pago12m: 3_100_000, classeCredito: 'desconhecido', risco: 'ambar',
  aliquotaEfetiva: null, regimeDeclaradoEm: null,
}, vale.id)

console.log('Base criada.')
console.log(`  redes:        ${bomPreco.razao} · ${vale.razao}`)
console.log(`  fornecedores: ${FORN.length}`)
console.log(`  itens:        320`)
console.log(`  exceções:     ${EXC.length}`)
console.log('')
console.log('  Entrar em /app/entrar:')
console.log(`    ${process.env.ADMIN_EMAIL || 'rodrobau@gmail.com'}      (admin VOW · vê as duas redes)`)
console.log('    marina@bompreco.com.br    (fiscal · só a Bom Preço)')
console.log('    caio@vale.com.br          (suprimentos · atende as duas)')
console.log(`    senha: ${SENHA}`)
