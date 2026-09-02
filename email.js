/**
 * Envio do diagnóstico por e-mail, via Resend.
 *
 * O totem da feira não entrega PDF: o visitante faz a simulação, deixa o
 * e-mail, e recebe o resultado com as premissas à mostra. O e-mail é a peça
 * que sobrevive à feira — por isso ele carrega o raciocínio, não só o número.
 */
import { Resend } from 'resend'
import { PREMISSAS, brl, brlCurto } from './motor.js'

const FROM = process.env.MAIL_FROM || 'VOW Diagnóstico <onboarding@resend.dev>'
const REPLY_TO = process.env.MAIL_REPLY_TO || undefined

let cliente = null
function resend() {
  if (!process.env.RESEND_API_KEY) return null
  cliente ||= new Resend(process.env.RESEND_API_KEY)
  return cliente
}

const pct = (v) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const COR = { ink: '#14120F', gold: '#B08A3E', line: '#E5E2DC', storm: '#5C5A55', green: '#2F7A55' }

function linha(rotulo, valor, forte = false) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${COR.line};color:${COR.storm};font-size:14px">${esc(rotulo)}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${COR.line};text-align:right;font-size:14px;${
      forte ? `font-weight:700;color:${COR.ink}` : `color:${COR.ink}`
    }">${esc(valor)}</td>
  </tr>`
}

function blocoRevenda(d) {
  return {
    titulo: 'Verbas com a indústria',
    chamada: `${brlCurto(d.perda)} por ano`,
    legenda: `é o que sai do seu bolso se a verba não for recomposta — ${pct(d.perdaSobreLucro)} do lucro anual`,
    tabela: [
      linha('Faturamento informado', brl(d.entrada.faturamento)),
      linha(`Verba da indústria (${pct(d.entrada.percentualVerba)})`, brl(d.verbaTotal)),
      linha(`Parcela que passa a ser tributada (${pct(d.parcelaTributavel)})`, brl(d.tributavel)),
      linha('Recomposição a negociar com a indústria', brl(d.recomposicao)),
      linha('Perda se não recompor', brl(d.perda), true),
    ].join(''),
    leitura: [
      'Sete de cada dez reais de verba passam a ser tributados. O que fica fora do campo de incidência é basicamente o desconto e a bonificação na própria nota.',
      'A recomposição não custa nada à indústria — ela credita integralmente o imposto que paga. Não se está pedindo dinheiro a mais, e sim que o tributo novo não saia do bolso do varejo.',
      'O caixa piora mesmo com recomposição: a verba deixa de ser abatimento e vira nota emitida pelo varejo. Surge um recebível e um tributo que vence antes de o recebível entrar. Por isso o prazo de pagamento entra na mesa junto com o valor.',
    ],
  }
}

function blocoIndiretos(d) {
  const top = [...d.familias].sort((a, b) => b.ganho - a.ganho).slice(0, 4)
  return {
    titulo: 'Serviços e indiretos',
    chamada: `${brlCurto(d.ganhoTotal)} por ano`,
    legenda: 'é o crédito novo que a sua base de indiretos passa a gerar',
    tabela: [
      linha('Faturamento informado', brl(d.entrada.faturamento)),
      linha(`Base de indiretos (${pct(d.entrada.percentualBase)})`, brl(d.base)),
      ...top.map((f) => linha(`· ${f.nome}`, brl(f.ganho))),
      linha('Migração de regime dos prestadores', brl(d.ganhoMigracaoRegime)),
      linha('Crédito novo por ano', brl(d.ganhoTotal), true),
    ].join(''),
    leitura: [
      'A pergunta inverte: aqui você paga, e o que importa é quanto de cada real volta como crédito. Hoje quase nada — o ISS não credita e o crédito de PIS/Cofins vive preso ao conceito de insumo.',
      'O crédito não vem igual para todos: depende do regime do prestador e da extinção do débito dele. Duas propostas com o mesmo preço deixaram de ser a mesma proposta — a diferença é de cerca de 2%, o que significa que um desconto de pouco mais de 2% já empata a disputa.',
      `Quanto mais crédito você acerta, mais saldo credor acumula: cerca de ${brlCurto(d.saldoCredorAnual)} por ano. Em programa de conformidade esse dinheiro volta em 30 dias; fora dele, em 180 — uma diferença de ${brlCurto(d.caixaPreso180 - d.caixaPreso30)} preso em caixa.`,
    ],
  }
}

/**
 * Envio genérico. Todo e-mail do produto sai por aqui, com o mesmo remetente
 * e o mesmo responder-para do diagnóstico — antes as mensagens de acesso
 * montavam o cliente do Resend por conta própria e esqueciam o replyTo, então
 * a resposta do cliente caía no vazio.
 */
export async function enviarEmail({ para, assunto, html, texto }) {
  const r = resend()
  if (!r) return { enviado: false, motivo: 'RESEND_API_KEY ausente' }
  try {
    const { data, error } = await r.emails.send({
      from: FROM, to: [para], replyTo: REPLY_TO, subject: assunto, html, text: texto,
    })
    if (error) return { enviado: false, motivo: error.message || String(error) }
    return { enviado: true, id: data?.id }
  } catch (e) {
    return { enviado: false, motivo: e.message }
  }
}

/**
 * E-mail de acesso à plataforma: redefinir senha ou entrar sem senha.
 * Mesma identidade do diagnóstico, para não parecer phishing — é justamente
 * a mensagem em que a pessoa desconfia de link.
 */
export function emailAcesso({ nome, link, tipo, minutos }) {
  const redefinir = tipo === 'senha'
  const titulo = redefinir ? 'Redefinir sua senha' : 'Entrar na plataforma'
  const chamada = redefinir ? 'Escolher uma senha nova' : 'Entrar na plataforma'
  const explica = redefinir
    ? `Você pediu para trocar a senha da plataforma VOW. O link abaixo vale por ${minutos} minutos e funciona uma única vez.`
    : `Use o link abaixo para entrar sem senha. Ele vale por ${minutos} minutos.`
  const rodape = redefinir
    ? 'Se não foi você que pediu, ignore este e-mail: a sua senha atual continua valendo.'
    : 'Se não foi você que pediu, ignore este e-mail.'

  // "Rodrigo, Você pediu" fica errado: depois da vírgula a frase continua.
  const abre = (frase) => nome ? esc(nome) + ', ' + frase[0].toLowerCase() + frase.slice(1) : frase

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#FAF9F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid ${COR.line}">
      <tr><td style="background:${COR.ink};padding:22px 32px">
        <div style="color:#fff;font-size:17px;font-weight:700">Grupo VOW</div>
        <div style="color:${COR.gold};font-size:10px;letter-spacing:.14em;text-transform:uppercase;margin-top:2px">Plataforma</div>
      </td></tr>
      <tr><td style="padding:32px">
        <div style="font-size:24px;font-weight:700;color:${COR.ink};margin-bottom:14px">${esc(titulo)}</div>
        <p style="margin:0 0 26px;font-size:15px;color:${COR.storm};line-height:1.6">
          ${esc(abre(explica))}
        </p>
        <table cellpadding="0" cellspacing="0"><tr><td style="background:${COR.gold};padding:14px 28px">
          <a href="${esc(link)}" style="color:#fff;font-size:15px;font-weight:600;text-decoration:none">${esc(chamada)}</a>
        </td></tr></table>
        <p style="margin:24px 0 0;font-size:12.5px;color:${COR.storm};line-height:1.6">
          Se o botão não abrir, copie este endereço:<br>
          <span style="word-break:break-all;color:${COR.gold}">${esc(link)}</span>
        </p>
        <p style="margin:24px 0 0;font-size:13px;color:${COR.storm};line-height:1.6">${esc(rodape)}</p>
      </td></tr>
      <tr><td style="background:#FAF9F7;border-top:1px solid ${COR.line};padding:18px 32px;font-size:12px;color:${COR.storm}">
        Grupo VOW · A inteligência tributária que alimenta o Brasil
      </td></tr>
    </table>
  </td></tr></table></body></html>`

  const texto = `${abre(explica)}\n\n${link}\n\n${rodape}\n\nGrupo VOW`
  return { assunto: redefinir ? 'Redefinir sua senha da plataforma VOW' : 'Seu acesso à plataforma VOW', html, texto }
}

export function montarHtml({ nome, empresa, diagnosticos }) {
  const blocos = diagnosticos.map((d) => (d.tipo === 'revenda' ? blocoRevenda(d) : blocoIndiretos(d)))
  const ambos = blocos.length > 1

  const secoes = blocos
    .map(
      (b) => `
    <div style="margin:0 0 34px">
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${COR.gold};font-weight:600">${esc(b.titulo)}</div>
      <div style="font-size:38px;font-weight:700;color:${COR.ink};margin:8px 0 4px;line-height:1.1">${esc(b.chamada)}</div>
      <div style="font-size:14px;color:${COR.storm};margin-bottom:18px">${esc(b.legenda)}</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${b.tabela}</table>
      <ul style="margin:18px 0 0;padding-left:18px;color:${COR.storm};font-size:14px;line-height:1.65">
        ${b.leitura.map((t) => `<li style="margin-bottom:8px">${esc(t)}</li>`).join('')}
      </ul>
    </div>`
    )
    .join('')

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#FAF9F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid ${COR.line}">
      <tr><td style="background:${COR.ink};padding:22px 32px">
        <div style="color:#fff;font-size:17px;font-weight:700">Grupo VOW</div>
        <div style="color:${COR.gold};font-size:10px;letter-spacing:.14em;text-transform:uppercase;margin-top:2px">Diagnóstico ABRAS ${ambos ? '· os dois mapas' : ''}</div>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="margin:0 0 26px;font-size:15px;color:${COR.ink};line-height:1.6">
          ${nome ? `${esc(nome)}, s` : 'S'}egue o resultado da simulação que você fez no nosso estande${empresa ? `, para a ${esc(empresa)}` : ''}.
        </p>
        ${secoes}
        <div style="border:1px solid ${COR.line};background:#FAF9F7;padding:18px;margin-top:8px">
          <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${COR.storm};font-weight:600">Como ler estes números</div>
          <p style="margin:8px 0 0;font-size:13px;color:${COR.storm};line-height:1.6">
            É uma ordem de grandeza a partir do seu faturamento, com alíquota de referência de
            ${pct(PREMISSAS.aliquota)} e o mix médio do varejo alimentar. Não é parecer: o número
            da sua rede depende do seu mix de verbas, do regime dos seus prestadores e do que os
            seus contratos dizem hoje. É esse levantamento que a gente faz.
          </p>
        </div>
        <p style="margin:26px 0 0;font-size:15px;color:${COR.ink};line-height:1.6">
          Se quiser o número real, a gente parte de uma varredura de 12 meses de contas a pagar
          e da sua base de contratos. Responda este e-mail que marcamos.
        </p>
      </td></tr>
      <tr><td style="background:#FAF9F7;border-top:1px solid ${COR.line};padding:18px 32px;font-size:12px;color:${COR.storm}">
        Grupo VOW · A inteligência tributária que alimenta o Brasil<br>Porto Alegre · São Paulo · Brasília
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

export function montarTexto({ nome, diagnosticos }) {
  const linhas = [`${nome ? nome + ',' : 'Olá,'} segue o resultado da simulação feita no estande da VOW.`, '']
  for (const d of diagnosticos) {
    if (d.tipo === 'revenda') {
      linhas.push(
        'VERBAS COM A INDÚSTRIA',
        `  Verba total no ano: ${brl(d.verbaTotal)}`,
        `  Parcela tributada: ${brl(d.tributavel)} (${pct(d.parcelaTributavel)})`,
        `  Recomposição a negociar: ${brl(d.recomposicao)}`,
        `  Perda se não recompor: ${brl(d.perda)} — ${pct(d.perdaSobreLucro)} do lucro anual`,
        ''
      )
    } else {
      linhas.push(
        'SERVIÇOS E INDIRETOS',
        `  Base de indiretos: ${brl(d.base)}`,
        `  Crédito novo por ano: ${brl(d.ganhoTotal)}`,
        `  Saldo credor gerado: ${brl(d.saldoCredorAnual)}/ano`,
        ''
      )
    }
  }
  linhas.push(
    `Ordem de grandeza, com alíquota de referência de ${pct(PREMISSAS.aliquota)} e mix médio do varejo alimentar.`,
    'Não é parecer. Responda este e-mail para o levantamento da sua rede.',
    '',
    'Grupo VOW'
  )
  return linhas.join('\n')
}

/**
 * Envia o diagnóstico. Sem RESEND_API_KEY não quebra o totem: devolve
 * `{ enviado:false, motivo }` e o lead fica gravado do mesmo jeito — numa
 * feira, perder o lead é pior do que não mandar o e-mail na hora.
 */
export async function enviarDiagnostico({ para, nome, empresa, diagnosticos }) {
  const r = resend()
  if (!r) return { enviado: false, motivo: 'RESEND_API_KEY ausente' }

  const ambos = diagnosticos.length > 1
  const assunto = ambos
    ? 'Seus dois diagnósticos — verbas e indiretos sob a reforma'
    : diagnosticos[0].tipo === 'revenda'
      ? 'Seu diagnóstico — verbas com a indústria sob a reforma'
      : 'Seu diagnóstico — crédito de indiretos sob a reforma'

  try {
    const { data, error } = await r.emails.send({
      from: FROM,
      to: [para],
      replyTo: REPLY_TO,
      subject: assunto,
      html: montarHtml({ nome, empresa, diagnosticos }),
      text: montarTexto({ nome, diagnosticos }),
    })
    if (error) return { enviado: false, motivo: error.message || String(error) }
    return { enviado: true, id: data?.id }
  } catch (e) {
    return { enviado: false, motivo: e.message }
  }
}
