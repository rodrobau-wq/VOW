// HTML do e-mail de diagnóstico VOW · fonte única para preview (browser) e envio (Resend, Node)
import { PRODUTOS, fmtBRLc, fmtPct, POR_DENTRO, assuntoEmail } from './motor.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SERIF = "Georgia,'Times New Roman',serif", SANS = "Helvetica,Arial,sans-serif";
const C = { bg: '#EFE9DB', card: '#FBF8F1', ink: '#0E1B14', ink2: '#5C6A5F', mute: '#8A9389', dark: '#0E1B14', dark2: '#15261C', gold: '#E0C48C', red: '#E8906C', green: '#7BD389', line: 'rgba(14,27,20,0.10)' };

function linhas(r, isRev) {
  return r.familias.map(f => {
    const tag = isRev ? (f.trib === 1 ? ['Tributa', '#9A4A2C'] : f.trib === 0 ? ['Não tributa', '#1F6B33'] : ['Depende do documento', '#7A5E22']) : (f.cred === 1 ? ['Crédito integral', '#1F6B33'] : f.cred >= 0.8 ? ['Crédito alto', '#1F6B33'] : ['Depende do regime', '#7A5E22']);
    const val = isRev ? fmtBRLc(f.tributavel) : fmtBRLc(f.creditoDepois);
    return `<tr><td style="padding:14px 0;border-bottom:1px solid ${C.line};font-family:${SANS}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:15px;font-weight:bold;color:${C.ink}">${esc(f.nome)} <span style="font-size:11px;font-weight:normal;color:${tag[1]};padding-left:6px">${tag[0]}</span></td>
        <td align="right" style="font-family:${SERIF};font-size:18px;color:${isRev ? (f.trib === 0 ? C.mute : C.ink) : '#1F6B33'}">${val}</td>
      </tr></table>
      <div style="font-size:13px;line-height:1.45;color:${C.ink2};margin-top:4px"><span style="color:${C.mute}">${esc(f.hoje)}</span> &rarr; ${esc(f.muda)}</div>
    </td></tr>`;
  }).join('');
}

function bloco(titulo, rows, dark) {
  const bg = dark ? '#1C3225' : C.card, t = dark ? C.gold : C.mute, v = dark ? '#F3EEE2' : C.ink, l = dark ? '#9FB0A2' : C.mute;
  return `<td width="50%" valign="top" style="padding:0 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border-radius:12px;${dark ? '' : `border:1px solid ${C.line}`}"><tr><td style="padding:18px 18px 8px;font-family:${SANS}">
    <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${t};margin-bottom:12px">${titulo}</div>
    ${rows.map(r => `<div style="margin-bottom:12px"><div style="font-size:12px;color:${l}">${esc(r.l)}</div><div style="font-size:15px;font-weight:bold;color:${r.cor || v};line-height:1.3">${esc(r.v)}</div></div>`).join('')}
  </td></tr></table></td>`;
}

export function emailHtml(lead, opts = {}) {
  const r = lead.resultado; if (!r) return '';
  const isRev = r.produto === 'revenda'; const P = PRODUTOS[r.produto];
  const nome = (lead.nome || '').split(' ')[0];
  const empresa = lead.empresa ? (lead.empresa.fantasia || lead.empresa.razao) : '';
  const linkDiag = opts.linkDiagnostico || '#', linkContato = opts.linkContato || 'mailto:contato@vow.com.br';
  const hero = isRev
    ? { l: 'Perda anual se a verba não for recomposta', v: fmtBRLc(r.perda), cor: C.red, sub: `${fmtPct(r.pctLucro, 0)} do lucro anual estimado. ${fmtPct(r.pctTributavel)} da verba passa a ser tributada. A recomposição não custa nada à indústria: ela credita o imposto que paga.` }
    : { l: 'Crédito que passa a voltar por ano', v: fmtBRLc(r.ganho), cor: C.green, sub: `${fmtPct(r.pctGanho)} do que você paga em indiretos, hoje tratado como custo puro. Equivale a ${fmtPct(r.pctLucro, 0)} do lucro anual estimado, conforme o regime de cada prestador.` };
  const hoje = isRev ? [{ l: 'Verba recebida no ano', v: fmtBRLc(r.base) }, { l: 'Como circula', v: 'Abatimento em fatura, nota de débito' }, { l: 'Tributo sobre a verba', v: 'R$ 0' }, { l: 'Documento fiscal do varejo', v: 'Raro' }]
    : [{ l: 'Gasto com indiretos no ano', v: fmtBRLc(r.base) }, { l: 'Crédito recuperado', v: fmtBRLc(r.creditoHoje) }, { l: 'Custo líquido', v: fmtBRLc(r.custoHoje) }, { l: 'Critério de compra', v: 'Preço' }];
  const depois = isRev ? [{ l: 'Passa a ser tributado', v: `${fmtBRLc(r.tributavel)} · ${fmtPct(r.pctTributavel)}` }, { l: 'IBS/CBS embutido na verba', v: fmtBRLc(r.perda), cor: C.red }, { l: 'Recomposição a negociar', v: fmtBRLc(r.recomposicao), cor: C.green }, { l: 'Documento fiscal do varejo', v: 'Obrigatório, com CNAE' }]
    : [{ l: 'IBS/CBS embutido no gasto', v: fmtBRLc(r.base * POR_DENTRO) }, { l: 'Crédito potencial', v: fmtBRLc(r.creditoDepois), cor: C.green }, { l: 'Custo líquido', v: fmtBRLc(r.custoDepois), cor: C.green }, { l: 'Critério de compra', v: 'Custo líquido de crédito e regime do prestador' }];
  const outroId = isRev ? 'indiretos' : 'revenda'; const outro = lead.simulacoes?.[outroId];
  const outroBloco = outro
    ? `<tr><td style="padding:0 32px 28px;font-family:${SANS}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.line};border-radius:12px"><tr><td style="padding:18px 20px"><div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.mute};margin-bottom:6px">Você também fez · ${PRODUTOS[outroId].nome}</div><div style="font-size:15px;color:${C.ink}">${isRev ? `Crédito de indiretos que passa a voltar: <b style="color:#1F6B33">${fmtBRLc(outro.ganho)}</b> por ano.` : `Perda nas verbas com a indústria sem recomposição: <b style="color:#9A4A2C">${fmtBRLc(outro.perda)}</b> por ano.`}</div></td></tr></table></td></tr>`
    : `<tr><td style="padding:0 32px 28px;font-family:${SANS}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px dashed rgba(14,27,20,0.25);border-radius:12px"><tr><td style="padding:18px 20px"><div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.mute};margin-bottom:6px">Falta a outra metade</div><div style="font-size:15px;color:${C.ink};line-height:1.45">${isRev ? 'Você viu quanto do que recebe passa a ser tributado. O diagnóstico de <b>Indiretos</b> mostra quanto do que você paga volta como crédito.' : 'Você viu quanto do que paga volta como crédito. O diagnóstico de <b>Revenda</b> mostra quanto do que recebe da indústria passa a ser tributado.'} <a href="${linkContato}" style="color:#1C3225;font-weight:bold">Peça à VOW &rarr;</a></div></td></tr></table></td></tr>`;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(assuntoEmail(lead))}</title></head>
<body style="margin:0;padding:0;background:${C.bg}">
<div style="display:none;max-height:0;overflow:hidden">${esc(hero.l)}: ${hero.v}. ${esc(hero.sub)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
  <tr><td style="background:${C.dark};border-radius:16px 16px 0 0;padding:28px 32px;font-family:${SANS}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-family:${SERIF};font-size:26px;letter-spacing:1px;color:#F3EEE2">VOW</td>
      <td align="right" style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9FB0A2">Diagnóstico · ABRAS 2026</td>
    </tr></table>
    <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.gold};margin:36px 0 10px">${esc(P.nome)}${empresa ? ' · ' + esc(empresa) : ''}</div>
    <div style="font-size:15px;color:#C9D2C8;margin-bottom:6px">${esc(hero.l)}</div>
    <div style="font-family:${SERIF};font-size:56px;line-height:1;color:${hero.cor};margin-bottom:14px">${hero.v}</div>
    <div style="font-size:15px;line-height:1.5;color:#C9D2C8">${esc(hero.sub)}</div>
    <div style="font-size:13px;color:#9FB0A2;margin-top:22px">Premissas informadas: faturamento ${fmtBRLc(lead.faturamento)} · ${lead.pct.toLocaleString('pt-BR')}% ${isRev ? 'de verba da indústria' : 'em serviços e indiretos'}</div>
  </td></tr>
  <tr><td style="background:${C.bg};padding:28px 26px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${bloco('Hoje', hoje, false)}${bloco('Depois da reforma', depois, true)}</tr></table></td></tr>
  <tr><td style="padding:8px 32px 0;font-family:${SANS}">
    <p style="font-size:16px;line-height:1.55;color:${C.ink};margin:18px 0 6px">Olá, ${esc(nome)}.</p>
    <p style="font-size:15px;line-height:1.55;color:${C.ink2};margin:0 0 22px">${isRev ? 'Sob o IBS/CBS, verba e contrato passam a ser exigidos juntos. O que hoje circula como abatimento em fatura vira nota emitida pelo varejo, com tributo embutido. Abaixo, o que muda em cada família da sua verba e as cinco etapas para ficar em conformidade antes do acordo de 2027.' : 'Sob o IBS/CBS, quase todo gasto com serviço passa a gerar crédito, mas o quanto volta depende do regime de cada prestador. Duas propostas com o mesmo preço deixaram de ser a mesma proposta. Abaixo, o que muda em cada família do seu indireto e as cinco etapas para capturar esse crédito.'}</p>
    <div style="font-family:${SERIF};font-size:24px;color:${C.ink};margin-bottom:4px">Linha a linha</div>
    <div style="font-size:12px;color:${C.mute};margin-bottom:6px">${isRev ? 'valor que passa a tributar, por família' : 'crédito potencial por ano, por família'}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhas(r, isRev)}</table>
    ${isRev ? '' : `<p style="font-size:12px;line-height:1.5;color:${C.mute};margin:14px 0 0">Serviços financeiros (adquirência, antecipação, seguros) têm regime próprio na LC 214 e ficam fora deste cálculo.</p>`}
  </td></tr>
  <tr><td style="padding:32px 32px 8px;font-family:${SANS}">
    <div style="font-family:${SERIF};font-size:24px;color:${C.ink};margin-bottom:4px">Como ficar em conformidade</div>
    <div style="font-size:13px;color:${C.mute};margin-bottom:14px">${isRev ? 'Classificar antes de renegociar.' : 'Classificar antes de sentar.'}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${P.etapas.map((e, i) => `<tr><td width="36" valign="top" style="font-family:${SERIF};font-size:22px;color:#B8934A;padding:10px 0">0${i + 1}</td><td style="padding:10px 0;border-bottom:1px solid ${C.line}"><div style="font-size:15px;font-weight:bold;color:${C.ink}">${esc(e.t)}</div><div style="font-size:13px;line-height:1.45;color:${C.ink2}">${esc(e.d)}</div></td></tr>`).join('')}</table>
    <div style="font-size:12px;color:${C.mute};margin:14px 0 28px">Depois: ${P.mecanismos.join(' · ').toLowerCase()}.</div>
  </td></tr>
  ${outroBloco}
  <tr><td style="padding:0 32px 32px;font-family:${SANS}" align="center">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${C.dark};border-radius:10px"><a href="${linkContato}" style="display:inline-block;padding:16px 28px;font-size:15px;font-weight:bold;color:#F3EEE2;text-decoration:none">Conversar com a VOW sobre este diagnóstico</a></td></tr></table>
    <div style="margin-top:14px;font-size:13px"><a href="${linkDiag}" style="color:${C.ink2}">Abrir o diagnóstico no navegador</a></div>
  </td></tr>
  <tr><td style="padding:20px 32px 8px;font-family:${SANS};font-size:11px;line-height:1.5;color:${C.mute};border-top:1px solid ${C.line}">
    Estimativa com as premissas do estudo VOW × ABRAS: alíquota de referência 26,5%, mix padrão do varejo por família e margem líquida de 2%. Os valores da sua rede dependem do inventário. Aritmética a validar com o time fiscal da VOW.<br><br>
    Grupo VOW · Consultoria para o varejo · Você recebeu este e-mail porque fez um diagnóstico no estande da VOW na ABRAS 2026. <a href="${opts.linkDescadastro || '#'}" style="color:${C.mute}">Não quero receber mais</a>.
  </td></tr>
</table></td></tr></table></body></html>`;
}

export function emailText(lead) {
  const r = lead.resultado; if (!r) return '';
  const isRev = r.produto === 'revenda';
  return `${assuntoEmail(lead)}\n\nOlá, ${(lead.nome || '').split(' ')[0]}.\n${isRev ? `Perda anual sem recomposição: ${fmtBRLc(r.perda)} (${fmtPct(r.pctTributavel)} da verba passa a tributar).` : `Crédito que passa a voltar por ano: ${fmtBRLc(r.ganho)}.`}\nPremissas: faturamento ${fmtBRLc(lead.faturamento)} · ${lead.pct}%.\n\nGrupo VOW · ABRAS 2026`;
}
