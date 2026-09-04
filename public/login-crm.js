/**
 * O modal de entrada no CRM, fora do runtime do Claude Design.
 *
 * O desenho é o de `public/abras/abras.dc.html` — quatro passos: entrar,
 * esqueci a senha, criar acesso e o aviso de e-mail enviado. O totem roda
 * aquela versão; as telas HTML normais rodam esta. As duas chamam a mesma
 * API, porque um segundo caminho de login seria um segundo lugar para
 * esquecer de corrigir.
 */
const DOMINIO = 'grupovow.com.br'
const SUPERADMIN = 'rodrobau@gmail.com'
// A guarda de sessão está montada em /app — é lá que o CRM mora.
const DESTINO = '/app/crm'

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
const corporativo = (e) => e.toLowerCase().endsWith('@' + DOMINIO)

const OLHO_VER = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 12c1-3 5-7 10-7s9 4 10 7c-1 3-5 7-10 7S3 15 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`
const OLHO_OCULTAR = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.1A10.8 10.8 0 0 1 12 5c5 0 9 4 10 7-.4 1.1-1.2 2.4-2.4 3.6"/><path d="M6.6 6.6C4.2 8 2.6 10.2 2 12c1 3 5 7 10 7 1.5 0 2.9-.3 4.1-.9"/></svg>`

const CSS = `
.lgc-fundo{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.55);
  display:grid;place-items:safe center;padding:20px;overflow:auto}
.lgc-caixa{width:100%;max-width:420px;background:var(--surface);border:1px solid var(--line);
  padding:32px;box-sizing:border-box;animation:lgc-sobe .25s ease both}
@keyframes lgc-sobe{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.lgc-topo{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}
.lgc-topo .marca{display:flex;align-items:center;gap:10px}
.lgc-fechar{background:none;border:0;font-size:18px;line-height:1;cursor:pointer;color:var(--muted);
  width:32px;height:32px;border-radius:4px}
.lgc-fechar:hover{color:var(--ink)}
.lgc-caixa h2{font-size:26px;font-weight:600;margin:0 0 6px}
.lgc-caixa .diz{font-size:14px;color:var(--muted);margin:0 0 20px}
.lgc-caixa label{display:block;font-size:12.5px;color:var(--muted);margin:0 0 6px}
.lgc-caixa label.dep{margin-top:14px}
.lgc-caixa input{width:100%;height:44px;padding:0 14px;box-sizing:border-box;
  border:1px solid var(--line-2);border-radius:4px;background:var(--raised);color:var(--ink);
  font:400 15px/1 var(--fonte);outline:none}
.lgc-caixa input:focus{border-color:var(--ink)}
.lgc-senha{position:relative}
.lgc-senha input{padding-right:52px}
.lgc-olho{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:40px;height:40px;
  display:grid;place-items:center;background:none;border:0;border-radius:4px;cursor:pointer;color:var(--muted)}
.lgc-olho:hover{color:var(--ink)}
.lgc-msg{font-size:13.5px;min-height:19px;margin-top:10px;color:var(--risco)}
.lgc-caixa .btn.lg{width:100%;margin-top:6px}
.lgc-pes{display:flex;justify-content:space-between;gap:12px;margin-top:16px;font-size:13.5px}
.lgc-volta{margin-top:16px;font-size:13.5px}
.lgc-fine{font-size:12.5px;color:var(--muted);margin-top:12px;line-height:1.5}
`

export function montarLoginCrm () {
  const estilo = document.createElement('style')
  estilo.textContent = CSS
  document.head.appendChild(estilo)

  let fundo = null
  let passo = 'entrar'
  let mostrar = false
  let ocupado = false
  let msg = ''
  let enviado = { tit: '', txt: '' }
  const val = { email: '', senha: '', nome: '' }

  const fechar = () => {
    if (!fundo) return
    fundo.remove()
    fundo = null
    document.removeEventListener('keydown', tecla)
  }
  const tecla = (ev) => { if (ev.key === 'Escape') fechar() }

  function pintar () {
    const caixa = fundo.querySelector('.lgc-caixa')
    caixa.innerHTML = `
      <div class="lgc-topo">
        <div class="marca"><span class="caduceu" aria-hidden="true"></span>
          <span class="eyebrow">Plataforma · CRM</span></div>
        <button class="lgc-fechar" type="button" data-fechar aria-label="Fechar">×</button>
      </div>
      ${corpo()}`

    caixa.querySelector('[data-fechar]').onclick = fechar
    caixa.querySelectorAll('[data-ir]').forEach((a) => {
      a.onclick = (ev) => { ev.preventDefault(); passo = a.dataset.ir; msg = ''; val.senha = ''; pintar() }
    })
    const olho = caixa.querySelector('[data-olho]')
    if (olho) olho.onclick = () => { mostrar = !mostrar; pintar() }

    caixa.querySelectorAll('input[data-campo]').forEach((i) => {
      i.oninput = () => { val[i.dataset.campo] = i.value }
      i.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); agir() } }
    })
    const acao = caixa.querySelector('[data-acao]')
    if (acao) acao.onclick = agir

    const foco = caixa.querySelector('input:not([value]), input')
    if (foco && !ocupado) foco.focus()
  }

  function corpo () {
    const erro = `<div class="lgc-msg">${msg}</div>`
    const senha = `
      <label class="dep">Senha</label>
      <div class="lgc-senha">
        <input data-campo="senha" type="${mostrar ? 'text' : 'password'}" autocomplete="current-password"
               placeholder="Sua senha" value="${val.senha.replace(/"/g, '&quot;')}">
        <button class="lgc-olho" type="button" data-olho aria-pressed="${mostrar}"
                aria-label="${mostrar ? 'Ocultar a senha' : 'Mostrar a senha'}"
                title="${mostrar ? 'Ocultar a senha' : 'Mostrar a senha'}">${mostrar ? OLHO_OCULTAR : OLHO_VER}</button>
      </div>`
    const campoEmail = (rot = 'E-mail') => `
      <label>${rot}</label>
      <input data-campo="email" type="email" autocomplete="username"
             placeholder="nome@${DOMINIO}" value="${val.email.replace(/"/g, '&quot;')}">`

    if (passo === 'entrar') return `
      <h2>Entrar</h2>
      <p class="diz">Só para a equipe do Grupo VOW.</p>
      ${campoEmail()}${senha}${erro}
      <button class="btn lg" type="button" data-acao ${ocupado ? 'disabled' : ''}>${ocupado ? 'Entrando…' : 'Entrar'}</button>
      <div class="lgc-pes">
        <a href="#" data-ir="esqueci">Esqueci a senha</a>
        <a href="#" data-ir="cadastro">Ainda não tenho acesso</a>
      </div>`

    if (passo === 'esqueci') return `
      <h2>Redefinir a senha</h2>
      <p class="diz">Você recebe um link por e-mail para escolher uma senha nova. Vale por 1 hora.</p>
      ${campoEmail()}${erro}
      <button class="btn lg" type="button" data-acao ${ocupado ? 'disabled' : ''}>${ocupado ? 'Enviando…' : 'Enviar o link'}</button>
      <div class="lgc-volta"><a href="#" data-ir="entrar">← Voltar para entrar</a></div>`

    if (passo === 'cadastro') return `
      <h2>Criar acesso</h2>
      <p class="diz">Qualquer e-mail <b style="color:var(--ink);font-weight:500">@${DOMINIO}</b> pode entrar.
      A senha é definida pelo link que chega no seu e-mail.</p>
      <label>Nome</label>
      <input data-campo="nome" autocomplete="name" placeholder="Nome e sobrenome" value="${val.nome.replace(/"/g, '&quot;')}">
      ${campoEmail('E-mail corporativo')}${erro}
      <button class="btn lg" type="button" data-acao ${ocupado ? 'disabled' : ''}>${ocupado ? 'Criando…' : 'Criar acesso'}</button>
      <p class="lgc-fine">Você entra como vendedor. Um administrador pode mudar o papel depois, na aba Equipe.</p>
      <div class="lgc-volta"><a href="#" data-ir="entrar">← Já tenho acesso</a></div>`

    return `
      <span class="tag ok" style="margin-bottom:14px">E-mail enviado</span>
      <h2>${enviado.tit}</h2>
      <p style="font-size:14px;color:var(--dim);margin:0;line-height:1.5">${enviado.txt}</p>
      <p class="lgc-fine">Não chegou? Confira o spam.</p>
      <div class="lgc-volta"><a href="#" data-ir="entrar">← Voltar para entrar</a></div>`
  }

  async function api (rota, corpo) {
    ocupado = true; msg = ''; pintar()
    try {
      const r = await fetch(rota, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo),
      })
      return { ok: r.ok, ...(await r.json().catch(() => ({}))) }
    } catch (e) {
      return { ok: false, erro: 'Sem conexão com o servidor. Tente de novo.' }
    } finally { ocupado = false }
  }

  async function agir () {
    if (ocupado) return
    const email = val.email.trim().toLowerCase()

    if (passo === 'entrar') {
      if (!emailOk(email)) { msg = 'Confira o e-mail.'; return pintar() }
      if (!val.senha) { msg = 'Digite a senha.'; return pintar() }
      const r = await api('/api/app/entrar', { email, senha: val.senha })
      // Nunca dizer qual dos dois está errado: isso confirmaria o e-mail.
      if (r.ok) {
        // O protótipo do CRM ainda lê daqui para saber quem está logado. A
        // sessão de verdade é o cookie assinado; isto é só o nome na tela.
        try { localStorage.setItem('vow.sessao', JSON.stringify({ email, em: new Date().toISOString() })) } catch (e) {}
        window.location.href = DESTINO
        return
      }
      msg = r.erro || 'E-mail ou senha não conferem.'
      return pintar()
    }

    if (passo === 'esqueci') {
      if (!emailOk(email)) { msg = 'Confira o e-mail.'; return pintar() }
      await api('/api/app/senha/esqueci', { email })
      // Resposta igual com e sem conta: a tela não conta quem existe.
      enviado = { tit: 'Veja seu e-mail',
        txt: `Se ${email} tiver acesso, o link para redefinir a senha já foi enviado. Vale por 1 hora.` }
      passo = 'enviado'
      return pintar()
    }

    if (!val.nome.trim()) { msg = 'Informe o nome.'; return pintar() }
    if (!emailOk(email)) { msg = 'Confira o e-mail.'; return pintar() }
    if (email === SUPERADMIN) {
      msg = 'Esse e-mail já é o administrador da plataforma. Use “Entrar” ou “Esqueci a senha”.'
      return pintar()
    }
    if (!corporativo(email)) {
      msg = `Só e-mails @${DOMINIO} podem criar acesso. Se você é da equipe, use o e-mail corporativo.`
      return pintar()
    }
    const r = await api('/api/app/cadastro', { nome: val.nome.trim(), email })
    if (!r.ok) { msg = r.erro || 'Não deu para criar o acesso.'; return pintar() }
    enviado = { tit: `Quase lá, ${val.nome.trim().split(' ')[0]}`,
      txt: `Enviamos para ${email} o link para definir sua senha e entrar. Vale por 24 horas.` }
    passo = 'enviado'
    pintar()
  }

  function abrir () {
    if (fundo) return
    passo = 'entrar'; msg = ''; mostrar = false; ocupado = false
    val.email = ''; val.senha = ''; val.nome = ''
    fundo = document.createElement('div')
    fundo.className = 'lgc-fundo'
    fundo.innerHTML = '<div class="lgc-caixa" role="dialog" aria-modal="true" aria-label="Entrar no CRM"></div>'
    // Clique no escuro fecha; dentro da caixa, não.
    fundo.addEventListener('click', (ev) => { if (ev.target === fundo) fechar() })
    document.body.appendChild(fundo)
    document.addEventListener('keydown', tecla)
    pintar()
  }

  document.querySelectorAll('[data-login-crm]').forEach((a) => {
    a.addEventListener('click', (ev) => { ev.preventDefault(); abrir() })
  })
  return { abrir, fechar }
}
