# VOW · ABRAS

Totem de diagnóstico para a feira da ABRAS e a plataforma que recebe os leads.
Produto do **Grupo VOW** — *a inteligência tributária que alimenta o Brasil*.

O visitante informa só o faturamento, roda um ou os dois diagnósticos, vê o número
em R$ na tela e recebe o detalhamento por e-mail e por QR code.

| Rota | O que é |
|---|---|
| `/` | Totem (kiosk). Público. |
| `/leads` | Plataforma de leads. Basic Auth. |
| `/d/:id` | Página do diagnóstico — destino do QR code. |
| `POST /api/simular` | Roda o motor sem gravar nada. |
| `POST /api/lead` | Grava o lead, dispara o e-mail, devolve o QR. |
| `GET /api/leads` · `/api/leads.csv` | Carteira e exportação. Basic Auth. |
| `GET /healthz` | Health check do Render. |

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
