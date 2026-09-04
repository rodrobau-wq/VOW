/**
 * Casca da plataforma: barra superior e abas.
 *
 * Fica num módulo só porque cinco telas usam. Foi exatamente repetindo isto
 * inline que os tokens divergiram em três paletas antes — não repete de novo.
 */
/**
 * A barra conta a jornada do lead, não uma lista de telas.
 *
 * Da esquerda para a direita é a ordem em que o trabalho acontece: o que
 * precisa de você agora, mover no quadro, a carteira inteira, e o que fechou.
 * A captura não é aba porque não acontece aqui: o lead entra sozinho pelo
 * diagnóstico da landing. `Base` fica separada porque não é etapa de
 * trabalho — é onde se confere o dado.
 */
const ABAS = [
  { href: '/app/hoje',      rotulo: 'Agora',     grupo: 'O dia' },
  { href: '/app/pipeline',  rotulo: 'Jornada',   grupo: 'A jornada' },
  { href: '/app/leads',     rotulo: 'Carteira',  grupo: 'A jornada' },
  { href: '/app/resultado', rotulo: 'Resultado', grupo: 'O fecho' },
  { href: '/app/projetos',  rotulo: 'Projetos',  grupo: 'A entrega' },
  { href: '/app/dados',     rotulo: 'Base',      grupo: 'A entrega' },
  { href: '/app/usuarios',  rotulo: 'Equipe',    grupo: 'A entrega' },
  { href: '/app/qr',        rotulo: 'QR',        grupo: 'A entrega' },
]

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]))

export async function montarNav(atual) {
  const ctx = await (await fetch('/api/app/contexto')).json()
  const el = document.createElement('div')
  el.className = 'appbar'
  el.innerHTML = `
    <a class="marca" href="/app/pipeline" style="text-decoration:none;color:inherit">
      <span class="caduceu"></span>
      <span><span class="nome">GRUPO VOW</span><span class="sob">Plataforma</span></span>
    </a>
    <nav class="abas">
      ${ABAS.map((a, i) => {
        // Separador entre grupos: marca a mudança de momento sem gastar linha.
        const abre = i > 0 && ABAS[i - 1].grupo !== a.grupo ? '<span class="sep" aria-hidden="true"></span>' : ''
        return `${abre}<a href="${a.href}" class="${a.href === atual ? 'on' : ''}"
                   title="${a.grupo}">${a.rotulo}</a>`
      }).join('')}
    </nav>
    <div class="sp"></div>
    <div class="quem"><b>${esc(ctx.usuario.nome)}</b>${esc(ctx.usuario.papel)}</div>
    <button class="sair" type="button">Sair</button>`
  document.body.prepend(el)
  el.querySelector('.sair').addEventListener('click', async () => {
    await fetch('/api/app/sair', { method: 'POST' })
    location.href = '/app/entrar'
  })
  return ctx
}

export { esc }

/**
 * Registra o service worker. Só isso torna o app instalável — e é o que faz
 * a casca abrir sem rede no pavilhão. Falhar aqui não pode quebrar a tela:
 * num navegador sem suporte o app continua funcionando online.
 */
export function ligarApp() {
  if (!('serviceWorker' in navigator)) return
  addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

/** Faixa de estado da rede e da fila, no topo da tela. */
export function faixaRede() {
  const el = document.createElement('div')
  el.className = 'faixa-rede'
  el.hidden = true
  document.body.prepend(el)
  return (estado) => {
    if (estado.presos === -1 || !navigator.onLine) {
      el.hidden = false; el.className = 'faixa-rede off'
      el.textContent = 'Sem conexão. O que você capturar fica guardado no aparelho.'
      return
    }
    if (estado.presos > 0) {
      el.hidden = false; el.className = 'faixa-rede esperando'
      el.textContent = `${estado.presos} captura(s) esperando para subir.`
      return
    }
    if (estado.enviados > 0) {
      el.hidden = false; el.className = 'faixa-rede ok'
      el.textContent = `${estado.enviados} captura(s) sincronizada(s).`
      setTimeout(() => { el.hidden = true }, 4000)
      return
    }
    el.hidden = true
  }
}

/* ---------------------------------------------------------- formatadores */
export const brl = (v) => 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR')
export const brlCurto = (v) => {
  const a = Math.abs(v || 0)
  if (a >= 1e9) return 'R$ ' + (v / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' bi'
  if (a >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi'
  if (a >= 1e3) return 'R$ ' + Math.round(a / 1e3).toLocaleString('pt-BR') + ' mil'
  return brl(v)
}
export const dataBr = (iso) => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—'
export const quando = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
         d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
/** "há 5 dias" — o que importa numa fila é o tempo parado, não a data. */
export const parado = (dias) => dias === 0 ? 'hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`
