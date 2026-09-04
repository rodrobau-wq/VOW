# Deploy · Plataforma VOW (protótipo de design) em vow.onrender.com

Protótipo navegável do SaaS (Painel, Fornecedores, Ficha, Mapa, Contratos, Itens, Portal do fornecedor), no tema claro (`body.paper`) do `tokens.css` — que implementa o Brandguide 2026 (preto + 4 cinzas, Obviously). Mesmo conteúdo do `public/tokens.css` do repo, mais aliases (--accent, --gold, --sans) para os protótipos.

## O que copiar para o repositório `rodrobau-wq/VOW`

```
deploy/public/tokens.css                →  public/tokens.css               (substitui o atual; mesmos valores do Brandguide + aliases)
deploy/public/abras/plataforma.dc.html  →  public/abras/plataforma.dc.html
deploy/public/abras/abras.dc.html       →  public/abras/abras.dc.html      (site + diagnóstico no Brandguide; rota sugerida /abras → sendFile; usa /motor.js da raiz)
deploy/public/icone.svg                 →  public/icone.svg
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
