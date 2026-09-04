/**
 * Motor de diagnóstico VOW · ABRAS — fonte única da aritmética.
 *
 * O núcleo abaixo veio do handoff de design ("Simulador AS IS TO BE Abras"),
 * onde é copy aprovada: famílias, pesos, textos de "hoje → o que muda" e as
 * etapas de conformidade. Não altere pesos nem `trib`/`cred` sem falar com a
 * VOW — é o mix que produz os números publicados.
 *
 * Diferença importante para a versão anterior deste arquivo: os 70,5% de
 * parcela tributável **não são mais uma constante**. Eles caem do mix das 12
 * famílias de Revenda (Σ peso × trib = 70,5), o que torna o número calibrável
 * pelo varejista no simulador sem deixar de bater com o documento.
 *
 * Fontes:
 *   docs/ABRAS - Verbas Comerciais.md     → produto `revenda`
 *   docs/ABRAS - Contrato de Indiretos.md → produto `indiretos`
 *
 * CUIDADO COM O NOME `revenda`. Ele calcula VERBAS, não aquisição de
 * mercadoria. É contrato público da API (`POST /api/simular`) e está gravado
 * nos leads já capturados: renomear exige migração.
 *
 * ATENÇÃO — as premissas seguem pendentes de validação do time fiscal da VOW
 * (pendência nº 1 do handoff e nº 5 dos dois briefs). O que sai daqui é ordem
 * de grandeza, não parecer, e a interface precisa dizer isso.
 *
 * Isomórfico: roda no Node (servidor) e no browser (simulador), sem build.
 */

export const ALIQUOTA = 0.265;
export const MARGEM_LUCRO = 0.02;
export const POR_DENTRO = 1 - 1 / (1 + ALIQUOTA); // 20,95%
export const STORAGE_KEY = 'vow_abras_leads';

export const PRODUTOS = {
  revenda: {
    id: 'revenda', nome: 'Contrato de Revenda', curto: 'Revenda',
    sub: 'Verbas com a indústria', pergunta: 'Quanto do que você recebe passa a ser tributado?',
    campoPct: 'Verba recebida da indústria', pctDefault: 3, pctMin: 1, pctMax: 8, pctStep: 0.5,
    familias: [
      { nome: 'Logística', peso: 14, trib: 1, hoje: 'Percentual sobre o pedido, abatido em fatura', muda: 'Serviço de distribuição: nota do varejo com IBS/CBS' },
      { nome: 'Marketing', peso: 17, trib: 1, hoje: 'Encarte e ação de loja por nota de débito', muda: 'Serviço claro: documento fiscal do varejo e CNAE' },
      { nome: 'Comercial', peso: 16, trib: 0, hoje: 'Contrato-mãe com desconto e bonificação na nota', muda: 'Desconto na nota segue sem tributo, mas o contrato precisa das cláusulas novas' },
      { nome: 'Crescimento', peso: 10, trib: 0.5, hoje: 'Meta apurada no fim do período', muda: 'Refletido na nota não tributa; apurado depois tributa' },
      { nome: 'Troca', peso: 8, trib: 0.6, hoje: 'Acerto informal, planilha, nota às vezes', muda: 'Documentada é indenizatória; recompra é operação e tributa' },
      { nome: 'Perecíveis', peso: 7, trib: 0.5, hoje: '% de quebra e rebaixa, pouco documento', muda: 'Sem documento vira receita; categoria gera saldo credor' },
      { nome: 'Fidelidade', peso: 6, trib: 1, hoje: 'Patrocínio do clube entra sem tributo', muda: 'Acesso à base é serviço; desconto ao shopper separado' },
      { nome: 'Mídia Kit', peso: 6, trib: 1, hoje: 'Retail media por nota de débito ou sem nota', muda: 'Serviço de mídia: tributa e exige CNAE de publicidade' },
      { nome: 'Campanha', peso: 5, trib: 1, hoje: 'Verba por ação, acerto no fim', muda: 'Serviço com documento fiscal do varejo' },
      { nome: 'Inauguração', peso: 4, trib: 0.55, hoje: 'Pacote misto lançado junto', muda: 'Ativação tributa; desconto na nota não. Separar vale dinheiro' },
      { nome: 'Ecommerce', peso: 4, trib: 1, hoje: 'Verba misturada com comissão', muda: 'Comissão é da plataforma; a verba é serviço do varejo' },
      { nome: 'CRM', peso: 3, trib: 1, hoje: 'Dado e campanha vendidos sem tributo', muda: 'Cessão de dado é serviço, com base legal LGPD' },
    ],
    etapas: [
      { t: 'Inventariar', d: 'Cruzar contas a pagar e receber de 12 meses com a base de contratos.' },
      { t: 'Classificar', d: 'Cada família recebe uma natureza: utilidade econômica, desconto ou indenizatória.' },
      { t: 'Decidir a ação', d: 'Preservar, migrar para desconto na nota, recompor ou documentar.' },
      { t: 'Renegociar', d: 'Levar o cálculo de recomposição à mesa do acordo 2027. Para a indústria é neutro.' },
      { t: 'Instrumentar', d: 'CNAE, emissão de nota, parametrização no ERP e rubrica por natureza.' },
    ],
    mecanismos: ['Gate de pagamento no ERP', 'Fila de exceção com responsável e prazo', 'Revisão em março e setembro'],
  },
  indiretos: {
    id: 'indiretos', nome: 'Contrato de Indiretos', curto: 'Indiretos',
    sub: 'Serviços e indiretos', pergunta: 'Quanto de cada real que você paga volta como crédito?',
    campoPct: 'Gasto com serviços e indiretos', pctDefault: 8, pctMin: 3, pctMax: 15, pctStep: 0.5,
    familias: [
      { nome: 'Ocupação', peso: 22, cred: 0.7, hojeCred: 0, hoje: 'Aluguel, condomínio e shopping sem crédito', muda: 'Crédito no regime de imóveis; locador PF e PJ custam diferente' },
      { nome: 'Utilidades', peso: 20, cred: 1, hojeCred: 0.06, hoje: 'Energia com crédito parcial e disputado', muda: 'Crédito amplo e automático: só parametrizar e conferir a nota' },
      { nome: 'Facilities', peso: 18, cred: 0.7, hojeCred: 0, hoje: 'Preço é o único critério; muitos do Simples', muda: 'Crédito depende do regime do prestador. Janela de setembro' },
      { nome: 'Logística e frota', peso: 14, cred: 1, hojeCred: 0.05, hoje: 'Frete embutido no preço da mercadoria', muda: 'Separado ou embutido vira decisão tributária' },
      { nome: 'Pessoas terceirizadas', peso: 11, cred: 0.8, hojeCred: 0, hoje: 'Tratado como custo puro', muda: 'Terceirizado credita; folha própria não' },
      { nome: 'Tecnologia', peso: 9, cred: 0.9, hojeCred: 0, hoje: 'Licenças com ISS, sem crédito', muda: 'Crédito amplo; importado tem regra própria' },
      { nome: 'Serviços profissionais', peso: 6, cred: 0.7, hojeCred: 0, hoje: 'Honorários com ISS, sem crédito', muda: 'Crédito conforme o regime do prestador' },
    ],
    etapas: [
      { t: 'Inventariar', d: 'Varredura de contas a pagar de 12 meses. Todo CNPJ pago aparece.' },
      { t: 'Classificar', d: 'Cada prestador recebe família, regime tributário e classe de crédito.' },
      { t: 'Calcular', d: 'Custo líquido atual contra o potencial, prestador a prestador.' },
      { t: 'Decidir', d: 'Manter, renegociar preço, pedir migração de regime ou substituir.' },
      { t: 'Renegociar', d: 'Preço, prazo, SLA, regime e cláusulas novas na mesma folha.' },
    ],
    mecanismos: ['Gate de pagamento no ERP', 'Fila de exceção com responsável e prazo', 'Revisão em março e setembro'],
  },
};

// ativas: nomes das famílias que o varejista tem (null = todas). Os pesos são renormalizados entre as ativas.
// pesos: { nome: peso } em % da verba de referência. Cada linha é independente: ajustar uma não mexe nas outras.
// baseRef = faturamento × pct é a referência inicial; a base efetiva é a soma das linhas ativas.
export function simular(produtoId, faturamento, pct, ativas, pesos) {
  const p = PRODUTOS[produtoId];
  const baseRef = faturamento * (pct / 100);
  const lucro = faturamento * MARGEM_LUCRO;
  const sel = (ativas && ativas.length ? p.familias.filter(f => ativas.includes(f.nome)) : p.familias).map(f => ({ ...f, peso: Math.max(0, pesos?.[f.nome] ?? f.peso) }));
  const somaPeso = 100;
  const base = sel.reduce((s, f) => s + baseRef * f.peso / 100, 0);
  const listaAtivas = sel.map(f => f.nome);
  if (produtoId === 'revenda') {
    const fams = sel.map(f => {
      const valor = baseRef * f.peso / 100;
      const tributavel = valor * f.trib;
      return { ...f, valor, share: f.peso / somaPeso, tributavel, tributo: tributavel * POR_DENTRO, recomposicao: tributavel * ALIQUOTA };
    });
    const tributavel = fams.reduce((s, f) => s + f.tributavel, 0);
    const recomposicao = tributavel * ALIQUOTA;
    const perda = tributavel * POR_DENTRO;
    return { produto: 'revenda', faturamento, pct, ativas: listaAtivas, pesos: pesos || null, baseRef, base, lucro, tributavel, pctTributavel: base ? tributavel / base : 0, recomposicao, perda, pctLucro: perda / lucro, familias: fams };
  }
  const fams = sel.map(f => {
    const valor = baseRef * f.peso / 100;
    const tributo = valor * POR_DENTRO;
    const creditoDepois = tributo * f.cred;
    const creditoHoje = valor * f.hojeCred;
    return { ...f, valor, share: f.peso / somaPeso, tributo, creditoHoje, creditoDepois, ganho: creditoDepois - creditoHoje };
  });
  const creditoHoje = fams.reduce((s, f) => s + f.creditoHoje, 0);
  const creditoDepois = fams.reduce((s, f) => s + f.creditoDepois, 0);
  const ganho = creditoDepois - creditoHoje;
  return { produto: 'indiretos', faturamento, pct, ativas: listaAtivas, pesos: pesos || null, baseRef, base, lucro, creditoHoje, creditoDepois, ganho, pctGanho: base ? ganho / base : 0, pctLucro: ganho / lucro, custoHoje: base - creditoHoje, custoDepois: base - creditoDepois, pontoVirada: 0.02, familias: fams };
}

// Caixa (premissas do simulador de verbas VOW): tributo vence antes de a verba entrar
export function caixaRevenda(r, { dReceb = 45, dTrib = 25, cc = 0.14 } = {}) {
  const tribMes = r.recomposicao / 12; const gap = Math.max(0, dReceb - dTrib); const giro = tribMes * gap / 30;
  return { tribMes, gap, giro, carrego: giro * cc, dReceb, dTrib, cc };
}
// Indiretos: crédito acumula e volta pela fila de ressarcimento (30/60/180 dias conforme conformidade)
export function caixaIndiretos(r, { prazo = 60, cc = 0.14 } = {}) {
  const credMes = r.creditoDepois / 12; const preso = credMes * prazo / 30;
  return { credMes, prazo, preso, carrego: preso * cc, cc };
}

export const fmtBRL = v => 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR');
export const fmtBRLc = v => { const a = Math.abs(v || 0); if (a >= 1e9) return 'R$ ' + (v / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' bi'; if (a >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi'; if (a >= 1e3) return 'R$ ' + (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil'; return fmtBRL(v); };
export const fmtPct = (v, d = 1) => (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: d }) + '%';
export const fmtHora = ts => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const fmtData = ts => new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
export const soDigitos = s => (s || '').replace(/\D/g, '');
export const fmtCNPJ = d => { d = soDigitos(d).slice(0, 14); return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2'); };
export const fmtFone = d => { d = soDigitos(d).slice(0, 11); if (d.length <= 2) return d; if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`; if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; };
export const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e || '');

export async function buscarCNPJ(cnpj) {
  const d = soDigitos(cnpj);
  if (d.length !== 14) return null;
  // Pelo servidor quando existe um: ele guarda a resposta e o visitante não
  // fala direto com o serviço externo. Sem servidor — o editor do Design —
  // vale a chamada direta, senão a tela não teria como demonstrar nada.
  try {
    const r = await fetch('/api/cnpj/' + d);
    if (r.ok) return await r.json();
    if (r.status === 404) throw new Error('CNPJ não encontrado');
  } catch (e) {
    if (e && e.message === 'CNPJ não encontrado') throw e;
  }
  const r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + d);
  if (!r.ok) throw new Error('CNPJ não encontrado');
  const j = await r.json();
  return { razao: j.razao_social, fantasia: j.nome_fantasia || '', municipio: j.municipio, uf: j.uf, porte: j.porte || '', cnae: j.cnae_fiscal_descricao || '', abertura: j.data_inicio_atividade || '' };
}

export function assuntoEmail(lead) {
  if (!lead.resultado) return 'Seu diagnóstico VOW · ABRAS 2026';
  return lead.resultado.produto === 'revenda'
    ? `Diagnóstico VOW · ${fmtBRLc(lead.resultado.perda)} em jogo nas verbas com a indústria`
    : `Diagnóstico VOW · ${fmtBRLc(lead.resultado.ganho)} de crédito que passa a voltar`;
}

/* ======================================================================
 * Camada de compatibilidade
 *
 * A API pública (`/api/simular`, `/api/lead`), o e-mail e o painel do SaaS
 * falam em frações (0.03) e em nomes próprios. O simulador fala em pontos
 * percentuais (3) e no vocabulário do handoff. Traduzir aqui evita a única
 * coisa que o brief proíbe de verdade: duas aritméticas no mesmo repositório.
 * ====================================================================== */

/** Faixas usadas nos presets do totem, para o visitante não digitar nada. */
export const PORTES = [
  { id: 'ate100',   rotulo: 'Até R$ 100 mi',    faturamento: 60_000_000 },
  { id: 'ate300',   rotulo: 'R$ 100 a 300 mi',  faturamento: 200_000_000 },
  { id: 'ate1bi',   rotulo: 'R$ 300 mi a 1 bi', faturamento: 600_000_000 },
  { id: 'acima1bi', rotulo: 'Acima de R$ 1 bi', faturamento: 1_500_000_000 },
]

/**
 * Premissas que o painel do SaaS consome e que não vivem no mix de famílias:
 * prazos de ressarcimento da LC 214, custo de capital e a comparação entre
 * regimes de fornecedor.
 */
export const PREMISSAS = {
  aliquota: ALIQUOTA,
  porDentro: POR_DENTRO,
  margemLucro: MARGEM_LUCRO,
  revenda: { percentualVerbaPadrao: PRODUTOS.revenda.pctDefault / 100 },
  indiretos: {
    percentualBasePadrao: PRODUTOS.indiretos.pctDefault / 100,
    /** Parcela da carteira hoje em prestadores da guia única do Simples. */
    parcelaGuiaUnica: 0.28,
    /**
     * Vantagem do crédito integral sobre a guia única, no mesmo líquido ao
     * prestador. O brief é explícito: ~2%, não vinte e tantos — um desconto
     * de pouco mais de 2% já empata a disputa.
     */
    vantagemRegimeIntegral: 0.02,
    /** Rede de bairro vende de 35% a 50% em cesta básica, a alíquota zero. */
    parcelaCestaBasicaPadrao: 0.42,
    /** LC 214: 30 dias em programa de conformidade, 180 fora dele. */
    diasRessarcimento: { comConformidade: 30, semConformidade: 180 },
    custoCapitalAnual: 0.14,
  },
}

const round = (n) => Math.round(n * 100) / 100

/** Diagnóstico de Revenda no formato da API. `percentualVerba` é fração. */
export function diagnosticoRevenda({ faturamento, percentualVerba, ativas, pesos } = {}) {
  const pct = (percentualVerba ?? PREMISSAS.revenda.percentualVerbaPadrao) * 100
  const r = simular('revenda', faturamento, pct, ativas, pesos)
  return {
    tipo: 'revenda',
    entrada: { faturamento, percentualVerba: pct / 100, ativas: r.ativas, pesos: r.pesos },
    verbaTotal: round(r.base),
    verbaReferencia: round(r.baseRef),
    tributavel: round(r.tributavel),
    parcelaTributavel: r.pctTributavel,
    recomposicao: round(r.recomposicao),
    perda: round(r.perda),
    lucroAnual: round(r.lucro),
    perdaSobreLucro: r.pctLucro,
    familias: r.familias.map((f) => ({
      nome: f.nome, valor: round(f.valor), tributavel: round(f.tributavel),
      recomposicao: round(f.recomposicao), trib: f.trib, hoje: f.hoje, muda: f.muda,
    })),
    /** O número grande da tela. */
    destaque: round(r.perda),
  }
}

/** Diagnóstico de Indiretos no formato da API. `percentualBase` é fração. */
export function diagnosticoIndiretos({ faturamento, percentualBase, parcelaCestaBasica, ativas, pesos } = {}) {
  const p = PREMISSAS.indiretos
  const pct = (percentualBase ?? p.percentualBasePadrao) * 100
  const pctCesta = parcelaCestaBasica ?? p.parcelaCestaBasicaPadrao
  const r = simular('indiretos', faturamento, pct, ativas, pesos)

  // Ganho adicional se a carteira hoje na guia única migrar de regime.
  const ganhoMigracaoRegime = r.base * p.parcelaGuiaUnica * p.vantagemRegimeIntegral

  // Crédito alto na entrada + saída majoritariamente a alíquota zero =
  // saldo credor estrutural. Quanto mais crédito a rede acerta, mais caixa
  // fica preso na fila de ressarcimento.
  const saldoCredorAnual = r.ganho * pctCesta
  const d = p.diasRessarcimento
  const caixaPreso180 = (saldoCredorAnual / 365) * d.semConformidade
  const caixaPreso30 = (saldoCredorAnual / 365) * d.comConformidade

  return {
    tipo: 'indiretos',
    entrada: { faturamento, percentualBase: pct / 100, parcelaCestaBasica: pctCesta, ativas: r.ativas, pesos: r.pesos },
    base: round(r.base),
    baseReferencia: round(r.baseRef),
    creditoHoje: round(r.creditoHoje),
    creditoDepois: round(r.creditoDepois),
    ganhoCredito: round(r.ganho),
    ganhoMigracaoRegime: round(ganhoMigracaoRegime),
    ganhoTotal: round(r.ganho + ganhoMigracaoRegime),
    saldoCredorAnual: round(saldoCredorAnual),
    caixaPreso180: round(caixaPreso180),
    caixaPreso30: round(caixaPreso30),
    ganhoConformidade: round((caixaPreso180 - caixaPreso30) * p.custoCapitalAnual),
    familias: r.familias.map((f) => ({
      nome: f.nome, valor: round(f.valor), ganho: round(f.ganho),
      cred: f.cred, hojeCred: f.hojeCred, hoje: f.hoje, muda: f.muda,
    })),
    destaque: round(r.ganho + ganhoMigracaoRegime),
  }
}

export function diagnosticar(tipo, entrada) {
  if (tipo === 'revenda') return diagnosticoRevenda(entrada)
  if (tipo === 'indiretos') return diagnosticoIndiretos(entrada)
  throw new Error(`diagnóstico desconhecido: ${tipo}`)
}

/* Nomes antigos, mantidos porque as telas já os importam. */
export const brl = fmtBRL
export const brlCurto = fmtBRLc
export const pct = fmtPct
