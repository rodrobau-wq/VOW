/**
 * Motor de diagnóstico VOW · ABRAS
 *
 * Dois diagnósticos sobre o mesmo faturamento:
 *   revenda   — verbas recebidas da indústria. Quanto passa a ser tributado.
 *   indiretos — gasto com serviços. Quanto de cada real pago volta como crédito.
 *
 * Fontes: docs/ABRAS - Contrato de Revenda.md e docs/ABRAS - Contrato de Indiretos.md
 *
 * ATENÇÃO — toda premissa numérica está em PREMISSAS, isolada de propósito.
 * A pendência nº 5 dos dois briefs é exatamente "confirmar a aritmética antes
 * de virar material comercial". Enquanto o time fiscal da VOW não assinar,
 * o que sai daqui é ordem de grandeza, não parecer.
 *
 * Isomórfico: roda no Node (server) e no browser (totem), sem dependência.
 */

export const PREMISSAS = {
  /** Alíquota de referência IBS + CBS. */
  aliquota: 0.265,

  revenda: {
    /** % do faturamento que a rede recebe em verba da indústria. */
    percentualVerbaPadrao: 0.03,
    /**
     * Parcela da verba que passa a ser tributada — 70,5%.
     * O que sobra fora do campo de incidência é o desconto e a bonificação
     * na própria nota. Brief de Revenda, seção 4.
     */
    parcelaTributavel: 0.705,
    /** Margem líquida presumida do varejo alimentar, para expressar a perda em % do lucro. */
    margemLiquida: 0.02,
  },

  indiretos: {
    /** Gasto com indiretos como % do faturamento (exclui mercadoria para revenda). */
    percentualBasePadrao: 0.14,
    /**
     * Sete famílias. `peso` soma 1 e distribui a base de indiretos.
     * `creditoHoje` é o crédito efetivo atual (PIS/Cofins preso ao conceito
     * de insumo; ISS não credita nada).
     * `aproveitamento` é quanto da alíquota cheia se realiza depois, dado o
     * regime típico dos prestadores da família e os regimes específicos.
     */
    familias: [
      { id: 'ocupacao',   nome: 'Ocupação',              peso: 0.26, creditoHoje: 0.000, aproveitamento: 0.55,
        nota: 'Regime específico de bens imóveis. Locador PF e PJ não valem o mesmo.' },
      { id: 'utilidades', nome: 'Utilidades',            peso: 0.22, creditoHoje: 0.050, aproveitamento: 1.00,
        nota: 'Energia vira insumo creditável sem a discussão de essencialidade. Não depende de renegociação.' },
      { id: 'facilities', nome: 'Facilities e manutenção', peso: 0.16, creditoHoje: 0.000, aproveitamento: 0.72,
        nota: 'Maior concentração de prestadores do Simples da base. É onde a janela de setembro pesa mais.' },
      { id: 'pessoas',    nome: 'Pessoas terceirizadas', peso: 0.14, creditoHoje: 0.000, aproveitamento: 0.80,
        nota: 'Serviço terceirizado credita; folha própria não. Achado 3.1 — pendente de validação fiscal.' },
      { id: 'logistica',  nome: 'Logística e frota',     peso: 0.11, creditoHoje: 0.040, aproveitamento: 0.95,
        nota: 'Frete embutido segue a mercadoria; frete à parte segue o serviço. Resultados diferentes.' },
      { id: 'tecnologia', nome: 'Tecnologia',            peso: 0.07, creditoHoje: 0.020, aproveitamento: 0.90,
        nota: 'Crédito amplo sobre software e cloud. Serviço importado tem regra própria.' },
      { id: 'servicos',   nome: 'Serviços profissionais', peso: 0.04, creditoHoje: 0.000, aproveitamento: 0.75,
        nota: 'Valores individualmente menores, base toda renegociável a cada ciclo.' },
    ],
    /** Parcela da carteira hoje em prestadores da guia única do Simples. */
    parcelaGuiaUnica: 0.28,
    /**
     * Vantagem do prestador de crédito integral sobre o da guia única, no
     * mesmo líquido ao prestador. O brief é explícito: são ~2%, não vinte e
     * tantos — um desconto de pouco mais de 2% já empata a disputa.
     */
    vantagemRegimeIntegral: 0.02,
    /** Faixa de cesta básica a alíquota zero numa rede de bairro: 35% a 50%. */
    parcelaCestaBasicaPadrao: 0.42,
    /** Prazo de ressarcimento do saldo credor, em dias: com e sem conformidade. */
    diasRessarcimento: { comConformidade: 30, semConformidade: 180 },
    /** Custo de oportunidade anual do caixa preso na fila de ressarcimento. */
    custoCapitalAnual: 0.12,
  },
}

const round = (n) => Math.round(n * 100) / 100

/**
 * Diagnóstico de Revenda — verbas com a indústria.
 * Responde: quanto da minha verba passa a ser tributado e o que isso custa
 * se eu não recompuser com a indústria.
 */
export function diagnosticoRevenda({ faturamento, percentualVerba } = {}) {
  const p = PREMISSAS.revenda
  const aliq = PREMISSAS.aliquota
  const pctVerba = percentualVerba ?? p.percentualVerbaPadrao

  const verbaTotal = faturamento * pctVerba
  const tributavel = verbaTotal * p.parcelaTributavel

  // Recomposição: o tributo por fora, que se pede à indústria. Não custa nada
  // a ela — credita integralmente o que paga.
  const recomposicao = tributavel * aliq

  // Perda sem recompor: o tributo por dentro, que sai do bolso do varejo.
  const perda = tributavel * (aliq / (1 + aliq))

  const lucroAnual = faturamento * p.margemLiquida

  return {
    tipo: 'revenda',
    entrada: { faturamento, percentualVerba: pctVerba },
    verbaTotal: round(verbaTotal),
    tributavel: round(tributavel),
    parcelaTributavel: p.parcelaTributavel,
    recomposicao: round(recomposicao),
    perda: round(perda),
    lucroAnual: round(lucroAnual),
    perdaSobreLucro: lucroAnual > 0 ? perda / lucroAnual : 0,
    /** O número que vai grande na tela do totem. */
    destaque: round(perda),
  }
}

/**
 * Diagnóstico de Indiretos — serviços contratados.
 * Responde: quanto de crédito novo a minha base de indiretos passa a gerar.
 */
export function diagnosticoIndiretos({ faturamento, percentualBase, parcelaCestaBasica } = {}) {
  const p = PREMISSAS.indiretos
  const aliq = PREMISSAS.aliquota
  const pctBase = percentualBase ?? p.percentualBasePadrao
  const pctCesta = parcelaCestaBasica ?? p.parcelaCestaBasicaPadrao

  const base = faturamento * pctBase

  const familias = p.familias.map((f) => {
    const gasto = base * f.peso
    const creditoDepois = aliq * f.aproveitamento
    const ganho = gasto * (creditoDepois - f.creditoHoje)
    return {
      ...f,
      gasto: round(gasto),
      creditoDepoisPct: creditoDepois,
      creditoHojePct: f.creditoHoje,
      ganho: round(ganho),
    }
  })

  const ganhoCredito = familias.reduce((s, f) => s + f.ganho, 0)

  // Ganho adicional se a carteira hoje na guia única migrar para regime regular.
  const ganhoMigracaoRegime = base * p.parcelaGuiaUnica * p.vantagemRegimeIntegral

  // Achado 3.2: crédito alto na entrada + saída majoritariamente a alíquota
  // zero = saldo credor estrutural. Quanto mais crédito a rede acerta, mais
  // caixa fica preso na fila de ressarcimento.
  const saldoCredorAnual = ganhoCredito * pctCesta
  const dias = p.diasRessarcimento
  const caixaPreso180 = (saldoCredorAnual / 365) * dias.semConformidade
  const caixaPreso30 = (saldoCredorAnual / 365) * dias.comConformidade
  const ganhoConformidade = (caixaPreso180 - caixaPreso30) * p.custoCapitalAnual

  return {
    tipo: 'indiretos',
    entrada: { faturamento, percentualBase: pctBase, parcelaCestaBasica: pctCesta },
    base: round(base),
    familias,
    ganhoCredito: round(ganhoCredito),
    ganhoMigracaoRegime: round(ganhoMigracaoRegime),
    ganhoTotal: round(ganhoCredito + ganhoMigracaoRegime),
    saldoCredorAnual: round(saldoCredorAnual),
    caixaPreso180: round(caixaPreso180),
    caixaPreso30: round(caixaPreso30),
    ganhoConformidade: round(ganhoConformidade),
    /** O número que vai grande na tela do totem. */
    destaque: round(ganhoCredito + ganhoMigracaoRegime),
  }
}

export function diagnosticar(tipo, entrada) {
  if (tipo === 'revenda') return diagnosticoRevenda(entrada)
  if (tipo === 'indiretos') return diagnosticoIndiretos(entrada)
  throw new Error(`diagnóstico desconhecido: ${tipo}`)
}

/** Portes usados nos presets do totem, para o visitante não digitar nada. */
export const PORTES = [
  { id: 'ate100',    rotulo: 'Até R$ 100 mi',        faturamento: 60_000_000 },
  { id: 'ate300',    rotulo: 'R$ 100 a 300 mi',      faturamento: 200_000_000 },
  { id: 'ate1bi',    rotulo: 'R$ 300 mi a 1 bi',     faturamento: 600_000_000 },
  { id: 'acima1bi',  rotulo: 'Acima de R$ 1 bi',     faturamento: 1_500_000_000 },
]

export const brl = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

/** R$ 1,3 mi · R$ 291 mil — para o número grande do totem. */
export function brlCurto(v) {
  const abs = Math.abs(v)
  const sinal = v < 0 ? '−' : ''
  if (abs >= 1e9) return `${sinal}R$ ${(abs / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi`
  if (abs >= 1e6) return `${sinal}R$ ${(abs / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (abs >= 1e3) return `${sinal}R$ ${Math.round(abs / 1e3).toLocaleString('pt-BR')} mil`
  return sinal + brl(abs)
}
