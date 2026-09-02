// Motor de simulação ABRAS · VOW — premissas do documento (alíquota 26,5%, 70,5% tributável, margem 2%)
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
  const r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + d);
  if (!r.ok) throw new Error('CNPJ não encontrado');
  const j = await r.json();
  return { razao: j.razao_social, fantasia: j.nome_fantasia || '', municipio: j.municipio, uf: j.uf, porte: j.porte || '', cnae: j.cnae_fiscal_descricao || '', abertura: j.data_inicio_atividade || '' };
}

// ---- Leads: persistência local + entrega automática à plataforma ----
export function carregarLeads() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
export function salvarLead(lead, webhookUrl) {
  const leads = carregarLeads();
  const i = leads.findIndex(l => l.id === lead.id);
  if (i >= 0) leads[i] = lead; else leads.unshift(lead);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  if (webhookUrl) { try { fetch(webhookUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) }); } catch {} }
  return lead;
}
// ---- Envio do e-mail via Resend (através de um endpoint próprio: a chave nunca fica no navegador) ----
export const RESEND_KEY = 'vow_abras_resend';
export function resendConfig() { try { return { endpoint: '', from: 'VOW <diagnostico@vow.com.br>', replyTo: 'contato@vow.com.br', ...JSON.parse(localStorage.getItem(RESEND_KEY) || '{}') }; } catch { return { endpoint: '', from: '', replyTo: '' }; } }
export function salvarResendConfig(cfg) { localStorage.setItem(RESEND_KEY, JSON.stringify(cfg)); }
export function linkDiagnostico(lead, baseUrl) {
  const d = { id: lead.id, p: lead.produto, f: lead.faturamento, pc: lead.pct, a: lead.resultado?.ativas || null, w: lead.resultado?.pesos || null, n: lead.nome, e: lead.empresa ? (lead.empresa.fantasia || lead.empresa.razao) : '', s: Object.keys(lead.simulacoes || {}) };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(d))));
  const base = baseUrl || new URL('Diagnóstico VOW.dc.html', location.href).href;
  return base + '#d=' + b64;
}
export function decodificarDiagnostico(hash) {
  try { const m = /d=([^&]+)/.exec(hash || ''); return m ? JSON.parse(decodeURIComponent(escape(atob(m[1])))) : null; } catch { return null; }
}
// Envia o diagnóstico. Sem endpoint configurado, registra como 'demo' (aparece como enviado na feira, sem disparo real).
export async function enviarEmail(lead, opts = {}) {
  const cfg = resendConfig();
  const { emailHtml, emailText } = await import('./email.js');
  const link = linkDiagnostico(lead, opts.baseUrl);
  const payload = { to: lead.email, from: cfg.from, reply_to: cfg.replyTo, subject: assuntoEmail(lead), html: emailHtml(lead, { linkDiagnostico: link, linkContato: opts.linkContato || ('mailto:' + (cfg.replyTo || 'contato@vow.com.br')) }), text: emailText(lead), tags: [{ name: 'origem', value: 'totem_abras' }, { name: 'produto', value: lead.produto }], leadId: lead.id };
  if (!cfg.endpoint) return { status: 'enviado', modo: 'demo', ts: Date.now() };
  try {
    const r = await fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || j.message || ('HTTP ' + r.status));
    return { status: 'enviado', modo: 'resend', ts: Date.now(), resendId: j.id || j.data?.id || '' };
  } catch (e) { return { status: 'erro', modo: 'resend', ts: Date.now(), erro: String(e.message || e) }; }
}

export function novoLead(dados) { return { id: 'L' + Date.now().toString(36).toUpperCase(), ts: Date.now(), status: 'lead', entregas: {}, origem: 'Totem ABRAS', ...dados }; }

export function assuntoEmail(lead) {
  if (!lead.resultado) return 'Seu diagnóstico VOW · ABRAS 2026';
  return lead.resultado.produto === 'revenda'
    ? `Diagnóstico VOW · ${fmtBRLc(lead.resultado.perda)} em jogo nas verbas com a indústria`
    : `Diagnóstico VOW · ${fmtBRLc(lead.resultado.ganho)} de crédito que passa a voltar`;
}

export function seedDemo() {
  if (carregarLeads().length) return;
  const agora = Date.now();
  const demos = [
    ['revenda', 'Mariana Costa', 'mariana@superbomdia.com.br', '11987650001', '12.345.678/0001-90', 'Supermercados Bom Dia Ltda', 'Campinas', 'SP', 300e6, 3, true],
    ['indiretos', 'Carlos Menezes', 'carlos@redeviva.com.br', '21998760002', '23.456.789/0001-01', 'Rede Viva Supermercados S.A.', 'Niterói', 'RJ', 520e6, 8, false],
    ['revenda', 'Ana Paula Ribeiro', 'ana.ribeiro@mercadoreal.com', '31991230003', '', '', '', '', 120e6, 4, true],
    ['indiretos', 'Roberto Lins', 'roberto@atacadolins.com.br', '81988880004', '34.567.890/0001-12', 'Atacado Lins Distribuição', 'Recife', 'PE', 900e6, 7, true],
    ['revenda', 'Fernanda Souza', 'fernanda@souzamercados.com.br', '41999990005', '', '', '', '', 60e6, 2.5, false],
  ];
  demos.forEach((d, i) => {
    const [produto, nome, email, telefone, cnpj, razao, municipio, uf, fat, pct, agendar] = d;
    const ts = agora - (i + 1) * 23 * 60 * 1000;
    const lead = { id: 'L' + (ts).toString(36).toUpperCase(), ts, status: 'simulado', origem: 'Totem ABRAS', demo: true, produto, nome, email, telefone, cnpj, empresa: razao ? { razao, fantasia: '', municipio, uf } : null, faturamento: fat, pct, resultado: simular(produto, fat, pct), entregas: { email: { ts: ts + 90000, status: 'enviado' }, qr: true, agendar } };
    salvarLead(lead);
  });
}
