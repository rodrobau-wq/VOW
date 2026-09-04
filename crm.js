/**
 * CRM — as fases do funil e as contas que as telas consomem.
 *
 * Regra que atravessa o arquivo inteiro: **valor em jogo e honorário são
 * coisas diferentes.** O valor em jogo é a exposição do cliente e vem do
 * diagnóstico que ele mesmo simulou; o honorário é a receita da VOW e só
 * existe a partir da proposta. Somar diagnósticos e chamar de previsão infla
 * o forecast em dezenas de vezes — ver docs/CRM-DESENHO.md.
 *
 * Por isso `previsaoPonderada` usa honorário, e `valorEmJogo` só ordena a
 * fila de quem atender primeiro.
 */

/**
 * Fase sem critério de saída não é pipeline, é lista de desejos.
 *
 * `Abordado` existe por causa da feira. Durante o evento, a distinção que
 * decide tudo não é entre qualificado e proposta — é entre **quem simulou no
 * totem sem ninguém falar** e **quem a gente conversou**. Sem essa coluna, o
 * quadro do estande mostra uma pilha só e o consultor não sabe para quem ir.
 * Fora da feira ela continua servindo: separa contato feito de contato
 * pendente.
 */
export const ESTAGIOS = [
  { id: 'capturado',   n: '01', nome: 'Capturado',       saida: 'Alguém da VOW falou com a pessoa.',               metaDias: 2,  prob: 0.03,
    dica: 'Simulou no totem ou deixou o cartão. Ninguém falou ainda.' },
  { id: 'abordado',    n: '02', nome: 'Abordado',        saida: 'Porte confere e há acesso a quem decide.',        metaDias: 3,  prob: 0.10,
    dica: 'Conversamos. Ainda não se sabe se compensa.' },
  { id: 'qualificado', n: '03', nome: 'Qualificado',     saida: 'Reunião marcada com data.',                       metaDias: 7,  prob: 0.20,
    dica: 'Vale a pena e dá para chegar em quem decide.' },
  { id: 'reuniao',     n: '04', nome: 'Reunião marcada', saida: 'Reunião aconteceu e autorizou o levantamento.',   metaDias: 14, prob: 0.35,
    dica: 'Data no calendário para apresentar o número real.' },
  { id: 'levantamento',n: '05', nome: 'Levantamento',    saida: 'Número real apurado e apresentado.',              metaDias: 30, prob: 0.55,
    dica: 'Varredura de 12 meses. É aqui que a VOW gasta hora antes de faturar.' },
  { id: 'proposta',    n: '06', nome: 'Proposta',        saida: 'Resposta do cliente — sim ou não, mas resposta.', metaDias: 21, prob: 0.70,
    dica: 'Escopo e honorário na mesa.' },
  { id: 'fechado',     n: '07', nome: 'Fechado',         saida: null, metaDias: null, prob: 1, final: true,
    dica: 'Contrato assinado.' },
  { id: 'perdido',     n: '07', nome: 'Perdido',         saida: null, metaDias: null, prob: 0, final: true,
    dica: 'Com motivo registrado.' },
]

export const ESTAGIO_PADRAO = 'capturado'
export const ABERTOS = ESTAGIOS.filter((e) => !e.final).map((e) => e.id)
const PORID = Object.fromEntries(ESTAGIOS.map((e) => [e.id, e]))
export const ehEstagio = (id) => Boolean(PORID[id])
export const estagio = (id) => PORID[id] || PORID[ESTAGIO_PADRAO]

/**
 * Lista fixa. Campo livre vira cento e vinte redações de "não tinha verba" e
 * nenhum relatório — o motivo é a única leitura que sobra de um negócio perdido.
 */
export const MOTIVOS_PERDA = [
  { id: 'sem_orcamento',  rotulo: 'Sem orçamento para 2027',      acao: 'Retomar na virada do orçamento' },
  { id: 'interno',        rotulo: 'Contabilidade interna assumiu', acao: 'Sinal de produto: pode virar assinatura da plataforma' },
  { id: 'concorrente',    rotulo: 'Foi para concorrente',          acao: 'Registrar qual — é como se sabe contra quem se perde', pedeDetalhe: true },
  { id: 'porte',          rotulo: 'Porte abaixo do mínimo',        acao: 'Não deveria ter sido qualificado; corrigir o filtro' },
  { id: 'sem_resposta',   rotulo: 'Sem resposta',                  acao: 'Se muitos caem aqui, o problema é o prazo de contato' },
  { id: 'momento',        rotulo: 'Momento errado',                acao: 'Volta ao pipeline na data marcada', pedeData: true },
]
export const ehMotivo = (id) => MOTIVOS_PERDA.some((m) => m.id === id)

/** Prazo para o primeiro contato. É o número que faz alguém pegar o telefone. */
export const SLA_PRIMEIRO_CONTATO_H = 48

export const TIPOS_INTERACAO = ['nota', 'ligacao', 'email', 'reuniao', 'whatsapp']

const HORA = 3600e3
const DIA = 24 * HORA
const agora = () => Date.now()
const ts = (v) => (v ? new Date(v).getTime() : 0)
const round = (n) => Math.round(n * 100) / 100

/** Exposição do cliente, somada dos diagnósticos que ele simulou. */
export function valorEmJogo(lead) {
  return (lead.diagnosticos || []).reduce((s, d) => s + (d.destaque || 0), 0)
}

/** Enriquece o lead com o que as telas precisam e o banco não guarda. */
export function comCrm(lead) {
  const est = estagio(lead.estagio)
  const desde = ts(lead.estagioDesde || lead.criadoEm)
  const diasParado = Math.floor((agora() - desde) / DIA)
  // Fase final manda na probabilidade: fechado é 100%, perdido é 0. Manter a
  // estimativa que o consultor digitou na proposta deixaria negócio ganho
  // aparecendo com 70% de chance de acontecer.
  const prob = est.final ? est.prob : (lead.probabilidade ?? est.prob)

  // Fora do prazo: capturado há mais de 48 h e ninguém falou com ele ainda.
  // Só a fase `capturado` conta — a partir de `abordado` a conversa já houve.
  const semContato = !lead.primeiroContatoEm && est.id === 'capturado'
  const foraDoSla = semContato && !est.final &&
    agora() - ts(lead.criadoEm) > SLA_PRIMEIRO_CONTATO_H * HORA

  const prazo = lead.proximaAcao?.quando
  return {
    ...lead,
    estagio: est.id,
    estagioNome: est.nome,
    valorEmJogo: valorEmJogo(lead),
    honorario: lead.honorario ?? null,
    probabilidade: prob,
    // Sem honorário não há previsão: o valor em jogo é do cliente, não da VOW.
    previsao: lead.honorario ? round(lead.honorario * prob) : 0,
    diasParado,
    atrasadoNaFase: est.metaDias != null && diasParado > est.metaDias,
    foraDoSla,
    acaoVencida: Boolean(prazo && prazo < new Date().toISOString().slice(0, 10) && !est.final),
  }
}

/**
 * Reconstitui a jornada do lead a partir do log append-only.
 *
 * O lead só guarda a fase atual. O caminho até ela — quando entrou em cada
 * uma e quanto tempo ficou — está nas interações, que nunca são apagadas.
 * É por isso que aquele log ser append-only não é preciosismo: é o que
 * permite responder "onde esse negócio travou".
 */
export function jornada(lead, interacoes = []) {
  const marcos = interacoes
    .filter((i) => i.para)
    .map((i) => ({ estagio: i.para, em: i.criadoEm, autor: i.autor }))
    .sort((a, b) => String(a.em).localeCompare(String(b.em)))

  // Lead capturado antes desta versão não tem o marco inicial gravado.
  if (!marcos.length || marcos[0].estagio !== 'capturado') {
    marcos.unshift({ estagio: 'capturado', em: lead.criadoEm, autor: null, inferido: true })
  }

  const atual = estagio(lead.estagio).id
  const passos = ESTAGIOS.filter((e) => !e.final || e.id === atual)

  let anterior = null
  const trilha = passos.map((e) => {
    const marco = marcos.find((m) => m.estagio === e.id)
    const seguinte = marco && marcos.find((m) => String(m.em) > String(marco.em))
    const fim = seguinte ? ts(seguinte.em) : (marco ? agora() : null)
    const passo = {
      id: e.id, nome: e.nome, n: e.n, dica: e.dica,
      alcancado: Boolean(marco),
      em: marco?.em || null,
      inferido: marco?.inferido === true,
      atual: e.id === atual,
      // Dias parados nesta fase. Na fase atual, conta até agora.
      dias: marco ? Math.floor((fim - ts(marco.em)) / DIA) : null,
      esperaDesde: anterior,
    }
    if (marco) anterior = marco.em
    return passo
  })

  const alcancados = trilha.filter((p) => p.alcancado)
  return {
    trilha,
    // Quanto tempo desde a captura, e quantas fases já venceu.
    diasTotais: Math.floor((agora() - ts(lead.criadoEm)) / DIA),
    fasesVencidas: Math.max(0, alcancados.length - 1),
    // A fase onde mais tempo se passou é onde o negócio está travando.
    maiorEspera: alcancados.reduce((a, b) => (b.dias ?? 0) > (a?.dias ?? -1) ? b : a, null),
  }
}

/**
 * Conversão de uma fase para a seguinte: de tudo que já passou por aqui,
 * quanto seguiu adiante. Sem isso o funil mostra pilhas e não mostra onde
 * elas param de andar.
 */
function conversoes(leads) {
  const ordem = [...ABERTOS, 'fechado']
  const indice = Object.fromEntries(ordem.map((id, i) => [id, i]))
  // Um lead perdido ainda passou pelas fases anteriores à saída dele.
  const alcance = (l) => {
    const e = estagio(l.estagio)
    if (e.id === 'perdido') return indice[l.estagioAnterior] ?? 0
    return indice[e.id] ?? 0
  }
  return ABERTOS.map((id, i) => {
    const chegaram = leads.filter((l) => alcance(l) >= i).length
    const passaram = leads.filter((l) => alcance(l) > i).length
    return { de: id, chegaram, passaram, taxa: chegaram ? Math.round((passaram / chegaram) * 100) : null }
  })
}

/** O funil: uma coluna por fase aberta, ordenada por quem espera há mais tempo. */
export function montarPipeline(leads) {
  const vivos = leads.map(comCrm).filter((l) => !estagio(l.estagio).final)
  const colunas = ABERTOS.map((id) => {
    const e = PORID[id]
    const dentro = vivos
      .filter((l) => l.estagio === id)
      .sort((a, b) => b.diasParado - a.diasParado)
    return {
      ...e,
      leads: dentro,
      total: dentro.length,
      valorEmJogo: round(dentro.reduce((s, l) => s + l.valorEmJogo, 0)),
      previsao: round(dentro.reduce((s, l) => s + l.previsao, 0)),
      atrasados: dentro.filter((l) => l.atrasadoNaFase).length,
    }
  })
  return {
    colunas,
    conversoes: conversoes(leads.map(comCrm)),
    totalAbertos: vivos.length,
    previsaoPonderada: round(vivos.reduce((s, l) => s + l.previsao, 0)),
    valorEmJogoTotal: round(vivos.reduce((s, l) => s + l.valorEmJogo, 0)),
    foraDoSla: vivos.filter((l) => l.foraDoSla).length,
    acoesVencidas: vivos.filter((l) => l.acaoVencida).length,
  }
}

/** A tela da reunião de pipeline: o que fechou, o que caiu e por quê. */
export function montarResultado(leads, desdeIso) {
  const corte = desdeIso ? ts(desdeIso) : 0
  const noPeriodo = leads.filter((l) => ts(l.fechadoEm || l.criadoEm) >= corte)
  const fechados = noPeriodo.filter((l) => l.estagio === 'fechado')
  const perdidos = noPeriodo.filter((l) => l.estagio === 'perdido')
  const decididos = fechados.length + perdidos.length

  const motivos = MOTIVOS_PERDA.map((m) => ({
    ...m,
    total: perdidos.filter((l) => l.motivoPerda === m.id).length,
  })).sort((a, b) => b.total - a.total)

  // Ciclo médio: da captura ao fechamento. Só de quem realmente fechou.
  const ciclos = fechados.map((l) => (ts(l.fechadoEm) - ts(l.criadoEm)) / DIA).filter((d) => d >= 0)

  return {
    fechados: fechados.length,
    perdidos: perdidos.length,
    // Sem negócio decidido não há taxa: 0/0 é ausência de dado, não 0%.
    taxa: decididos ? round((fechados.length / decididos) * 100) : null,
    receitaFechada: round(fechados.reduce((s, l) => s + (l.honorario || 0), 0)),
    perdidaEmProposta: round(perdidos.reduce((s, l) => s + (l.honorario || 0), 0)),
    cicloMedioDias: ciclos.length ? Math.round(ciclos.reduce((s, d) => s + d, 0) / ciclos.length) : null,
    motivos,
    origens: ['abras', 'site'].map((o) => ({
      origem: o,
      fechados: fechados.filter((l) => l.origem === o).length,
      perdidos: perdidos.filter((l) => l.origem === o).length,
    })),
  }
}

/** A tela que o consultor abre de manhã: só o que vence hoje e o que passou. */
export function montarHoje(leads) {
  const hoje = new Date().toISOString().slice(0, 10)
  const vivos = leads.map(comCrm).filter((l) => !estagio(l.estagio).final)
  const comPrazo = (f) => vivos.filter(f).sort((a, b) =>
    (a.proximaAcao?.quando || '').localeCompare(b.proximaAcao?.quando || ''))

  return {
    foraDoSla: vivos.filter((l) => l.foraDoSla).sort((a, b) => b.valorEmJogo - a.valorEmJogo),
    vencidas: comPrazo((l) => l.acaoVencida),
    hoje: comPrazo((l) => l.proximaAcao?.quando === hoje),
    // Oportunidade sem próxima ação está morta e ninguém percebeu.
    semProximaAcao: vivos.filter((l) => !l.proximaAcao?.quando && !l.foraDoSla)
      .sort((a, b) => b.diasParado - a.diasParado),
  }
}

/**
 * A linha do tempo só registra o que mudou.
 *
 * Sem isto, salvar a ficha por um motivo repetia todos os outros campos:
 * "Honorário: em branco" a cada clique em Salvar num lead que nunca teve
 * honorário, "Próxima ação: X" de novo quando ninguém mexeu na ação. Uma
 * linha do tempo cheia de linha que não conta nada deixa de ser lida — e aí
 * não serve para reconstituir a jornada, que é a única razão de ela existir.
 *
 * `null` e `undefined` são a mesma ausência: um lead antigo não tem o campo,
 * um lead novo tem o campo em branco, e os dois significam "sem honorário".
 */
export function mudouDeVerdade(antes, depois) {
  const norm = (v) => (v === undefined || v === '' ? null : v)
  const a = norm(antes), d = norm(depois)
  if (a === null && d === null) return false
  if (a === null || d === null) return true
  if (typeof a === 'object' || typeof d === 'object') {
    return JSON.stringify(a) !== JSON.stringify(d)
  }
  return a !== d
}
