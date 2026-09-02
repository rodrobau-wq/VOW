# VOW · ABRAS

Totem de diagnóstico para a feira da ABRAS e a plataforma que recebe os leads.
Produto do **Grupo VOW** — *a inteligência tributária que alimenta o Brasil*.

O visitante informa só o faturamento, roda um ou os dois diagnósticos, vê o número
em R$ na tela e recebe o detalhamento por e-mail e por QR code.

## Três camadas

| Camada | Público | Auth |
|---|---|---|
| Pública — landing, diagnósticos, totem | Prospect | nenhuma |
| Comercial — leads | Time VOW | Basic Auth |
| SaaS — `/app` | Cliente pagante | sessão, tenant, papéis |

| Rota | O que é |
|---|---|
| `/` | Landing pública. |
| `/totem` | Totem da feira (kiosk). Público. |
| `/leads` | Plataforma de leads. Basic Auth. |
| `/d/:id` | Página do diagnóstico — destino do QR code. |
| `POST /api/simular` | Roda o motor sem gravar nada. |
| `POST /api/lead` | Grava o lead, dispara o e-mail, devolve o QR. |
| `GET /api/leads` · `/api/leads.csv` | Carteira e exportação. Basic Auth. |
| `GET /healthz` | Health check do Render. |
| `/app/entrar` | Login — senha ou link mágico. |
| `/app/redes` | Escolher rede, quando o usuário atende mais de uma. |
| `/app/inicio` | Onboarding em três passos. |
| `/app` | Painel — os quatro números. |

## Os dois diagnósticos

**Revenda — verbas com a indústria.** O varejo *recebe*, e a pergunta é quanto disso
vira tributo. 70,5% da verba passa a ser tributada; a recomposição é o tributo por fora,
que se pede à indústria (e não custa nada a ela, que credita integralmente); a perda é o
tributo por dentro, que sai do bolso do varejo se ninguém recompuser.

**Indiretos — serviços contratados.** O varejo *paga*, e a pergunta inverte: quanto de
cada real volta como crédito. Hoje quase nada. Sete famílias de gasto, cada uma com um
aproveitamento diferente conforme o regime dos prestadores.

Fonte de tudo: [`docs/ABRAS - Contrato de Revenda.md`](docs/ABRAS%20-%20Contrato%20de%20Revenda.md)
e [`docs/ABRAS - Contrato de Indiretos.md`](docs/ABRAS%20-%20Contrato%20de%20Indiretos.md).

## ⚠️ As premissas ainda não foram assinadas

Toda premissa numérica está em `PREMISSAS`, no topo de [`motor.js`](motor.js), isolada de
propósito. A **pendência nº 5 dos dois briefs** é literalmente *"confirmar a aritmética de
recomposição / de custo líquido antes de virar material comercial"*.

Enquanto o time fiscal da VOW não assinar, o que sai daqui é **ordem de grandeza, não
parecer** — e as telas e o e-mail dizem isso ao visitante.

O que já está validado: o diagnóstico de Revenda reproduz **exatamente** os quatro números
publicados no brief (R$ 9.000.000 · R$ 6.345.000 · R$ 1.681.425 · R$ 1.329.190 = 22% do
lucro). Há teste travando isso — veja `test/motor.test.js`.

O de **Indiretos não tem número de referência no brief**: o mix das sete famílias
(pesos, crédito atual, aproveitamento) foi derivado das descrições qualitativas do
documento. É a parte que mais precisa da revisão fiscal.

## Rodar

```bash
npm install
cp .env.example .env    # preencha RESEND_API_KEY
npm run dev             # http://localhost:3000
```

Sem `RESEND_API_KEY` o totem **não quebra**: o lead é gravado, o QR é gerado, e o e-mail
fica marcado como pendente na plataforma. Numa feira, perder o lead é pior do que atrasar
o e-mail.

```bash
npm test                # 7 testes do motor
```

## Deploy no Render

O [`render.yaml`](render.yaml) é um blueprint completo. No Render: **New → Blueprint** e
aponte para este repositório.

Depois do primeiro deploy, preencha no dashboard as variáveis marcadas `sync: false`:
`RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`, `LEADS_USER`, `LEADS_PASSWORD`.

**O disco é obrigatório, não opcional.** Os leads gravam em arquivo; sem o disco montado em
`/var/data` o Render zera tudo a cada redeploy. Para uma feira de três dias isso é
inaceitável — por isso o disco está no blueprint. Ele exige plano pago; no free tier, troque
o armazenamento por Postgres antes de usar em produção.

## Estrutura

```
motor.js              aritmética dos dois diagnósticos · isomórfico (browser + node)
email.js              montagem e envio do e-mail via Resend
server/index.js       API Express
public/index.html     totem (kiosk)
public/leads.html     plataforma de leads
test/motor.test.js    trava os números do brief
docs/                 os dois briefs ABRAS e o material de apoio
_handoff/             export de outros projetos de design (fora do app)
```

`motor.js` é servido também para o browser em `/motor.js`, então totem, plataforma e
servidor rodam **a mesma aritmética** — sem build step e sem cópia que possa divergir.

## A plataforma (`/app`)

Fase 1 do brief: auth, tenant e painel.

```bash
node scripts/seed.js --forcar   # carteira de demonstração
npm run dev                     # http://localhost:3000/app/entrar
```

O seed imprime os três logins. Senha padrão `vow-piloto`, trocável por `SEED_PASSWORD`.

**Multi-tenant de verdade.** `store.js` recusa gravar dado de negócio sem `redeId` e
`listar()` não atravessa tenant — não existe consulta que devolva "todos os fornecedores"
sem dizer de quem. Há teste cobrindo isso.

**`verificacao` é append-only.** É o log de diligência e a defesa em fiscalização;
`atualizar()` recusa a coleção. Também há teste.

**Cada rede carrega as premissas dela.** Alíquota e mix de cesta básica ficam em
`rede.premissas`, nunca hardcoded fora de `PREMISSAS` ou da rede.

### Os quatro números, e o que eles não fingem saber

`painel.js` respeita a dependência da seção 1 do brief: é o Sistema 3 que define a alíquota
efetiva, e sem ela **o crédito esperado sai `null`, não estimado por cima**. O card mostra
quantos fornecedores ainda estão sem esse dado, e o bloco "o que ainda falta" lista as três
lacunas. Número inflado não sustenta conversa com a indústria nem defesa em fiscalização.

O card de crédito em risco também diz **a partir de quando** o risco existe: hoje o art. 48
dispensa o requisito de extinção do débito, que passa a valer com o split payment obrigatório
em 2028. Sem essa linha, a tela venderia urgência que a lei ainda não cobra.

### Dois eixos, não um semáforo

`CLASSES_CREDITO` (quanto volta) e `RISCOS` (se vai voltar) são perguntas independentes —
um MEI perfeitamente regular é verde em risco e zero em crédito.

⚠️ As frações de `CLASSES_CREDITO` valem **sobre a mesma nota**. Para comparar duas propostas,
o número certo é o custo líquido sobre o mesmo valor pago ao prestador, e aí a vantagem do
crédito integral é de ~2% (`motor.js` → `vantagemRegimeIntegral`) — não dos 70 pontos que a
leitura ingênua da tabela sugere. É o cuidado da seção 4.4 do brief.

## Arquivos

```
tokens.css            fonte única da linguagem visual (duas escalas, mesmos nomes)
motor.js              aritmética dos diagnósticos · isomórfico
painel.js             os quatro números do painel
store.js              persistência multi-tenant, com as duas regras do brief
auth.js               sessão, senha, link mágico, papéis
server/index.js       camadas pública e comercial
server/app.js         camada SaaS
scripts/seed.js       carteira de demonstração
test/                 14 testes
```
