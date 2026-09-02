/**
 * Projeto de entrega — o que vem depois do "Fechado".
 *
 * A jornada comercial termina quando o contrato é assinado. O que começa ali
 * é outra coisa: entregar o que foi vendido. São etapas diferentes, com
 * responsáveis diferentes e prazos próprios.
 *
 * As etapas NÃO são inventadas aqui: vêm de `PRODUTOS[x].etapas` no motor,
 * que é a seção 5.1 dos dois briefs — a metodologia que a VOW já usa. Manter
 * a fonte única evita o projeto prometer um roteiro e a consultoria executar
 * outro.
 *
 * TRÊS COISAS EM TODA ETAPA, porque sem qualquer uma delas a etapa não anda:
 * responsável (quem faz), prazo (até quando) e objetivo financeiro (quanto
 * daquilo que foi vendido depende dela).
 */
import { PRODUTOS, diagnosticar } from './motor.js'

/**
 * Peso de cada etapa no objetivo financeiro, em % do total.
 *
 * Não é distribuição igual de propósito: o dinheiro não aparece por igual ao
 * longo do projeto. Classificar é onde o número deixa de ser estimativa, e
 * Renegociar é onde ele vira caixa — quem senta com a indústria sem a
 * classificação pronta negocia no escuro, e é isso que os pesos dizem.
 *
 * Somam 100 em cada produto. São o padrão: o projeto permite ajustar.
 */
export const PESOS = {
  revenda:   { 'Inventariar': 10, 'Classificar': 25, 'Decidir a ação': 15, 'Renegociar': 40, 'Instrumentar': 10 },
  indiretos: { 'Inventariar': 10, 'Classificar': 25, 'Calcular': 15, 'Decidir': 15, 'Renegociar': 35 },
}

/** Duração padrão de cada etapa, em dias. O prazo é cumulativo. */
export const DURACAO = {
  'Inventariar': 15, 'Classificar': 20, 'Decidir a ação': 10, 'Decidir': 10,
  'Calcular': 15, 'Renegociar': 30, 'Instrumentar': 20,
}

export const STATUS_ETAPA = ['prevista', 'em andamento', 'concluída', 'travada']
export const ehStatusEtapa = (s) => STATUS_ETAPA.includes(s)

const DIA = 864e5
const round = (n) => Math.round(n * 100) / 100
const dia = (base, mais) => new Date(base + mais * DIA).toISOString().slice(0, 10)

/**
 * Monta o projeto a partir do lead fechado.
 *
 * O objetivo financeiro do projeto é o **valor em jogo** — a exposição do
 * cliente, que é o que a entrega precisa destravar. O honorário da VOW segue
 * separado, como em todo o resto do sistema: são números diferentes e somá-los
 * inflaria as duas contas.
 */
export function montarProjeto(lead, { inicio = Date.now(), responsavel = null } = {}) {
  const produtos = (lead.diagnosticos || []).map((d) => d.tipo)
  const tipos = produtos.length ? [...new Set(produtos)] : ['revenda']
  const valorEmJogo = (lead.diagnosticos || []).reduce((s, d) => s + (d.destaque || 0), 0)

  const etapas = []
  let ordem = 0
  for (const tipo of tipos) {
    const produto = PRODUTOS[tipo]
    const pesos = PESOS[tipo] || {}
    // Cada produto tem o próprio objetivo: o diagnóstico daquele lado.
    const alvo = (lead.diagnosticos || []).find((d) => d.tipo === tipo)?.destaque || 0
    let acumulado = 0

    for (const e of produto.etapas) {
      const peso = pesos[e.t] ?? Math.round(100 / produto.etapas.length)
      acumulado += DURACAO[e.t] ?? 15
      etapas.push({
        id: `${tipo}-${ordem++}`,
        produto: tipo,
        produtoNome: produto.sub,
        nome: e.t,
        descricao: e.d,
        responsavel: responsavel || null,
        prazo: dia(inicio, acumulado),
        peso,
        objetivo: round(alvo * peso / 100),
        status: 'prevista',
        concluidaEm: null,
      })
    }
  }

  return {
    leadId: lead.id,
    nome: lead.empresa || lead.nome || 'Projeto sem nome',
    produtos: tipos,
    // O que a entrega precisa destravar para o cliente.
    valorEmJogo: round(valorEmJogo),
    // O que a VOW fatura. Nunca somar com o de cima.
    honorario: lead.honorario ?? null,
    status: 'em andamento',
    iniciadoEm: new Date(inicio).toISOString(),
    etapas,
  }
}

/** Números do projeto: o que já foi entregue, o que atrasou, o que falta. */
export function resumo(projeto) {
  const etapas = projeto.etapas || []
  const hoje = new Date().toISOString().slice(0, 10)
  const concluidas = etapas.filter((e) => e.status === 'concluída')
  const atrasadas = etapas.filter((e) => e.status !== 'concluída' && e.prazo && e.prazo < hoje)
  const travadas = etapas.filter((e) => e.status === 'travada')

  const objetivoTotal = etapas.reduce((s, e) => s + (e.objetivo || 0), 0)
  const entregue = concluidas.reduce((s, e) => s + (e.objetivo || 0), 0)
  const emRisco = atrasadas.concat(travadas).reduce((s, e) => s + (e.objetivo || 0), 0)

  // Próxima etapa a puxar: a mais antiga que ainda não fechou.
  const proxima = etapas
    .filter((e) => e.status !== 'concluída')
    .sort((a, b) => String(a.prazo).localeCompare(String(b.prazo)))[0] || null

  return {
    total: etapas.length,
    concluidas: concluidas.length,
    atrasadas: atrasadas.length,
    travadas: travadas.length,
    objetivoTotal: round(objetivoTotal),
    entregue: round(entregue),
    // Nunca dividir por zero: projeto sem etapa não tem progresso, tem erro.
    progresso: etapas.length ? Math.round((concluidas.length / etapas.length) * 100) : 0,
    progressoFinanceiro: objetivoTotal ? Math.round((entregue / objetivoTotal) * 100) : 0,
    emRisco: round(emRisco),
    proxima,
    // Sem responsável a etapa não anda, e ninguém percebe que parou.
    semResponsavel: etapas.filter((e) => e.status !== 'concluída' && !e.responsavel).length,
  }
}
