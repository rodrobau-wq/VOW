/**
 * Os quatro números do painel.
 *
 * A tela responde "o que preciso olhar hoje", não "quanto de dado vocês têm".
 *
 * DEPENDÊNCIA QUE NÃO PODE SER IGNORADA (seção 1 do brief): é o Sistema 3
 * que define a alíquota efetiva de cada item, e é ela que diz quanto crédito
 * está em risco em cada fornecedor. Calcular com alíquota cheia sobre tudo
 * produz número falso — uma rede de bairro vende 35% a 50% em cesta básica a
 * alíquota zero. Por isso o crédito esperado usa `fornecedor.aliquotaEfetiva`
 * e, quando ela falta, o número sai marcado como incompleto em vez de sair
 * inflado.
 */
import { PREMISSAS } from './motor.js'

/**
 * Quanto do imposto destacado volta, conforme o regime do fornecedor.
 *
 * CUIDADO AO USAR ISTO PARA COMPARAR PROPOSTAS. Estas frações valem sobre a
 * mesma nota. Para escolher entre dois fornecedores, o número certo é o
 * custo líquido sobre o mesmo valor pago ao prestador, e aí a vantagem do
 * crédito integral é de ~2% (motor.js → vantagemRegimeIntegral), não dos 70
 * pontos que a leitura ingênua desta tabela sugere.
 */
export const CLASSES_CREDITO = {
  integral:    { rotulo: 'Integral',      aproveitamento: 1.00, nota: 'Regime regular, ou Simples que optou por recolher IBS/CBS por fora da guia única' },
  guia_unica:  { rotulo: 'Guia única',    aproveitamento: 0.30, nota: 'Simples na guia única: transfere só o que consta na guia' },
  mei:         { rotulo: 'MEI',           aproveitamento: 0.00, nota: 'Não transfere crédito' },
  desconhecido:{ rotulo: 'Não declarado', aproveitamento: null, nota: 'Regime não declarado ou declaração vencida — não é consultável por terceiros' },
}

/** Risco de o débito do fornecedor não ser extinto (art. 47). */
export const RISCOS = {
  verde:    { rotulo: 'Regular',   emRisco: false },
  ambar:    { rotulo: 'Pendente',  emRisco: true },
  vermelho: { rotulo: 'Irregular', emRisco: true },
}

/**
 * O art. 48 dispensa o requisito de extinção enquanto split payment e RAD
 * não estiverem implementados. Ou seja: o crédito em risco de hoje ainda não
 * dói — ele passa a doer no calendário abaixo. A tela precisa dizer isso,
 * senão vende urgência falsa.
 */
export const CALENDARIO = {
  2026: 'Ano de teste. CBS 0,9% e IBS 0,1%. Desde 03/08 a nota sem os campos consistentes é rejeitada na origem.',
  2027: 'CBS entra cheia. Split payment opcional — a dispensa do art. 48 começa a cair.',
  2028: 'Split payment obrigatório. O crédito passa a depender de fato da extinção do débito do fornecedor.',
  2033: 'Fim do ICMS e do ISS.',
}

const soma = (lista, f) => lista.reduce((s, x) => s + (f(x) || 0), 0)
const round = (n) => Math.round(n * 100) / 100

/**
 * Crédito que o fornecedor deveria devolver num ano.
 * Devolve `null` quando falta alíquota efetiva ou classe — número incompleto
 * é melhor sinalizado do que estimado por cima.
 */
export function creditoEsperado(fornecedor, rede) {
  const classe = CLASSES_CREDITO[fornecedor.classeCredito || 'desconhecido']
  if (!classe || classe.aproveitamento === null) return null

  const aliquota = fornecedor.aliquotaEfetiva ?? rede?.premissas?.aliquota ?? PREMISSAS.aliquota
  if (fornecedor.aliquotaEfetiva == null) return null // depende do Sistema 3

  return (fornecedor.pago12m || 0) * aliquota * classe.aproveitamento
}

export function montarPainel({ rede, fornecedores, contratos, itens, excecoes, ano = new Date().getFullYear() }) {
  /* ------------------------------------------------ 1. crédito em risco */
  const emRisco = fornecedores.filter((f) => RISCOS[f.risco]?.emRisco)
  const semAliquota = fornecedores.filter((f) => f.aliquotaEfetiva == null)

  const creditoEmRisco = soma(emRisco, (f) => creditoEsperado(f, rede))
  const creditoTotal = soma(fornecedores, (f) => creditoEsperado(f, rede))

  /* --------------------------------------------- 2. cobertura contratual */
  // Todo CNPJ pago precisa de contrato vigente. O denominador é quem recebeu
  // dinheiro, não quem está cadastrado — é essa diferença que a tela revela.
  const hoje = new Date().toISOString().slice(0, 10)
  const vigente = (c) => c.vigenciaFim >= hoje
  const comContrato = new Set(contratos.filter(vigente).map((c) => c.fornecedorId))
  const pagos = fornecedores.filter((f) => (f.pago12m || 0) > 0)
  const semContrato = pagos.filter((f) => !comContrato.has(f.id))
  const cobertura = pagos.length ? (pagos.length - semContrato.length) / pagos.length : 0

  /* -------------------------------------------------- 3. itens saneados */
  const saneados = itens.filter((i) => i.status === 'saneado')
  const pctSaneado = itens.length ? saneados.length / itens.length : 0
  const ganhoIdentificado = soma(itens.filter((i) => i.status !== 'saneado'), (i) => i.ganhoMes)

  /* --------------------------------------------- 4. saldo credor na fila */
  const p = PREMISSAS.indiretos
  const emConformidade = rede?.programaConformidade === true
  const dias = emConformidade ? p.diasRessarcimento.comConformidade : p.diasRessarcimento.semConformidade
  const saldoAnual = creditoTotal * (rede?.premissas?.parcelaCestaBasica ?? p.parcelaCestaBasicaPadrao)
  const naFila = (saldoAnual / 365) * dias
  // Quanto custa não estar no programa de conformidade: 180 dias contra 30.
  const custoForaDoPrograma = emConformidade
    ? 0
    : ((saldoAnual / 365) * (p.diasRessarcimento.semConformidade - p.diasRessarcimento.comConformidade)) * p.custoCapitalAnual

  /* ------------------------------------------------ fila e movimentação */
  const abertas = excecoes.filter((e) => e.status !== 'fechada')
  const vencidas = abertas.filter((e) => e.prazo && e.prazo < hoje)

  const ontem = new Date(Date.now() - 86400e3).toISOString()
  const novasHoje = excecoes.filter((e) => e.criadoEm > ontem)
  const fechadasHoje = excecoes.filter((e) => e.status === 'fechada' && (e.atualizadoEm || '') > ontem)

  return {
    numeros: {
      creditoEmRisco: {
        valor: round(creditoEmRisco),
        fornecedores: emRisco.length,
        de: round(creditoTotal),
        // Sem isto a tela venderia urgência que a lei ainda não cobra.
        vigenteA_partir_de: 2028,
        nota: CALENDARIO[2028],
        incompleto: semAliquota.length > 0,
        semAliquota: semAliquota.length,
      },
      coberturaContratual: {
        valor: round(cobertura * 100),
        semContrato: semContrato.length,
        pagos: pagos.length,
        // Prioriza por dinheiro, não por ordem alfabética.
        exposicaoSemContrato: round(soma(semContrato, (f) => f.pago12m)),
      },
      itensSaneados: {
        valor: round(pctSaneado * 100),
        saneados: saneados.length,
        total: itens.length,
        ganhoIdentificadoMes: round(ganhoIdentificado),
      },
      saldoCredorNaFila: {
        valor: round(naFila),
        dias,
        emConformidade,
        custoForaDoPrograma: round(custoForaDoPrograma),
      },
    },
    fila: abertas
      .sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'))
      .slice(0, 8),
    filaTotal: abertas.length,
    vencidas: vencidas.length,
    desdeOntem: {
      excecoesNovas: novasHoje.length,
      excecoesFechadas: fechadasHoje.length,
    },
    completude: {
      // O painel diz o que ainda não sabe. Credibilidade vem daí.
      fornecedoresSemAliquota: semAliquota.length,
      fornecedoresSemRegime: fornecedores.filter((f) => !f.classeCredito || f.classeCredito === 'desconhecido').length,
      fornecedoresSemContrato: semContrato.length,
    },
  }
}
