# Deploy · Plataforma VOW (protótipo de design) em vow.onrender.com

Protótipo navegável do SaaS (Painel, Fornecedores, Ficha, Mapa, Contratos, Itens, Portal do fornecedor), no tema claro (`body.paper`) do `tokens.css` — que implementa o Brandguide 2026 (preto + 4 cinzas, Obviously). Mesmo conteúdo do `public/tokens.css` do repo, mais aliases (--accent, --gold, --sans) para os protótipos.

## O que copiar para o repositório `rodrobau-wq/VOW`

```
deploy/public/tokens.css                →  public/tokens.css               (substitui o atual; mesmos valores do Brandguide + aliases)
deploy/public/abras/plataforma.dc.html  →  public/abras/plataforma.dc.html
deploy/public/abras/abras.dc.html       →  public/abras/abras.dc.html      (site + diagnóstico no Brandguide; rota sugerida /abras → sendFile; usa /motor.js da raiz)
deploy/public/icone.svg                 →  public/icone.svg
deploy/public/abras/crm.dc.html         →  public/abras/crm.dc.html        (CRM no Brandguide; importa /crm.js da raiz do repo + /abras/crm-demo.js; rota sugerida /crm, protegida)
deploy/qr.js                            →  qr.js (raiz do repo; servir em /qr.js como o motor)   gerador de QR sem dependência
deploy/public/abras/crm-demo.js         →  public/abras/crm-demo.js        (dados de demonstração: leads, interações e USUARIOS; em produção trocar pelos fetches de /api/app/crm/* e por um /api/app/usuarios com papéis vow|vendedor, convite via link mágico)
deploy/public/marca/*                   →  public/marca/*                  (logotipos e símbolo; o appbar usa o SVG embutido no tokens.css)
deploy/public/abras/support.js          →  public/abras/support.js   (só se ainda não existir; é o mesmo runtime do totem)
```

Os nomes de token foram mantidos: landing, totem e leads passam a usar a nova paleta ao trocar o arquivo. 
O `<base href="/abras/">` já está logo após `<head>`.

## Rota (server/index.js, camada pública)

```js
app.get('/plataforma', (_req, res) => res.sendFile(path.join(pub, 'abras', 'plataforma.dc.html')))
```

Ou, se preferir dentro da camada SaaS com sessão, em `server/app.js` como `/app/design`.

## Depois do commit

Render faz o deploy automático da branch `main`. Testar: `https://vow.onrender.com/plataforma`.
Se abrir em branco sem erro no console, o `<base>` ou o `support.js` não estão em `/abras/`.

## O que este protótipo respeita

- Dois eixos (risco × classe de crédito), cor sempre com rótulo escrito.
- Números marcados como demonstração; premissas pendentes de validação fiscal.
- Crédito em risco com nota "vale a partir de 2028" e "número parcial" quando falta alíquota efetiva.
- Bloqueio = sugestão + alçada; RAD e exceção como alternativas.
- Verbas dentro de Contratos (`/app/contratos/verbas`), com a matriz por linha do acordo.
- Assinatura via assinador de mercado sob marca VOW.
- Portal do fornecedor: declaração de regime, revalidação março/setembro, append-only.


## Login do CRM (abras.dc.html → link "CRM")
O modal tem três passos: entrar, esqueci a senha, criar acesso. No frontend é demonstração; no servidor:
- POST /api/app/entrar (já existe) — sucesso redireciona para /app/pipeline.
- POST /api/app/senha/esqueci (já existe) — resposta sempre neutra; link por e-mail, 1 h.
- NOVO POST /api/app/cadastro { nome, email }: aceitar só e-mail @grupovow.com.br (checar no servidor, não só na tela); criar usuário papel 'vendedor', status 'convidado'; enviar link mágico (24 h) que leva a definir senha. E-mail já existente → mesma resposta neutra, sem revelar cadastro.
- Admin promove a 'vow' na aba Equipe do CRM.


## QR do estande (CRM → aba QR · landing → bloco "Prefere no celular?")
- Tabela/coleção `qr`: { codigo: 'abras', url, criadoEm } · coleção `leitura` append-only: { codigo, em, ua, ip_hash }.
- GET /q/:codigo → grava leitura, 302 para `url` + `?origem=qr`. Sem cadastro (url vazia) → 404 e a landing não mostra o QR.
- GET /api/qr (público, só { url, codigo }) → a landing lê para decidir se mostra o QR. Hoje o frontend usa localStorage 'vow.qr' como demonstração.
- GET /api/app/qr (login) → { url, codigo, criadoEm, leituras: [iso] } · PUT /api/app/qr { url } (só papel vow).
- /api/lead: aceitar origem 'qr' (vem do parâmetro ?origem=qr guardado na sessão da landing).
- Conteúdo do QR é sempre o endereço curto `{BASE}/q/abras`, nunca a url final — trocar a url não invalida o QR impresso.
