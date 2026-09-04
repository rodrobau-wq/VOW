# Dossiê do projeto VOW · ABRAS 2026

**Para:** novo projeto (Claude Design / Claude Code) que vai continuar o desenvolvimento a partir do v0.1
**De:** Rodrigo Bauer · Grupo VOW
**Data:** 03/09/2026
**Repositório:** `github.com/rodrobau-wq/VOW` · branch `main` · Node 20+, ESM, sem build
**Projeto de design de origem:** "Simulador AS IS TO BE Abras" (Claude Design)

Este documento é autossuficiente: descreve o que o produto é, o que já existe (desenho e código), as regras que não podem ser quebradas, e o que falta. Os arquivos citados existem no repositório.

---

## 1. O que é o projeto

O **Grupo VOW** é uma consultoria tributária para redes de supermercado. A reforma tributária (IBS/CBS, LC 214/2025) transfere ao varejista responsabilidades que eram do governo: o crédito do imposto passa a depender do comportamento do fornecedor (art. 47), a verba que a indústria paga ao varejo passa a ser tributada, e cada item vendido precisa de uma classificação tributária correta.

O projeto tem **três camadas** com públicos e ciclos diferentes:

| Camada | Público | Auth | Ciclo | Estado |
|---|---|---|---|---|
| **Pública** — landing, diagnósticos gratuitos, totem da feira | Prospect | nenhuma | segundos; objetivo é um lead | pronta |
| **Comercial** — leads, CRM, disparos, modo feira | Time VOW | login com sessão (Basic Auth em `/leads`) | diário | codada, sem desenho refinado |
| **SaaS** — Sistemas 1, 2 e 3 | Cliente pagante | login, tenant, papéis | anos | Fase 1 parcial (auth + painel) |

**Alvo:** Smart Market **ABRAS 2026**. Antes: piloto pago com clientes da base.

**Três produtos do SaaS**, em ordem de dependência:

| Sistema | Responde | Papel |
|---|---|---|
| 1 · Fornecedores | Este CNPJ está regular, e quanto do imposto que pago a ele volta como crédito? | Recorrência |
| 2 · Contratos | Meus contratos sustentam o crédito que estou tomando? | Retenção |
| 3 · Itens | Qual a alíquota certa de cada produto que eu vendo? | Aquisição |

O Sistema 3 define a alíquota efetiva; sem ela, crédito em risco (S1) e valor do contrato (S2) saem `null`, nunca estimados por cima.

---

## 2. Os dois diagnósticos (topo de funil)

São a peça central do totem, da landing, do e-mail e da página do QR.

**Revenda — verbas com a indústria.** O varejo *recebe*. 12 famílias de verba (Logística, Marketing, Comercial, Crescimento, Troca, Perecíveis, Fidelidade, Mídia Kit, Campanha, Inauguração, Ecommerce, CRM), cada uma com `peso` (mix padrão, soma 100) e `trib` (0 / 0,5 / 0,55 / 0,6 / 1). Σ peso × trib = **70,5%** tributável.
- `tributavel = verba × 0,705`
- `recomposicao = tributavel × 26,5%` → o que se pede à indústria (custo zero pra ela, credita integral)
- `perda = tributavel × 20,95%` (por dentro: 1 − 1/1,265) → o que sai do bolso do varejo se não recompuser
- Número publicado e travado em teste: R$ 300 mi × 3% → verba R$ 9.000.000 · tributável R$ 6.345.000 · recomposição R$ 1.681.425 · **perda R$ 1.329.190 = 22% do lucro** (margem 2%).
- **Número de controle:** `perda ÷ tributável = 20,95%`.

**Indiretos — serviços contratados.** O varejo *paga*. 7 famílias (Ocupação, Utilidades, Facilities, Logística e frota, Pessoas terceirizadas, Tecnologia, Serviços profissionais), cada uma com `peso`, `cred` (fração do IBS/CBS que volta) e `hojeCred`.
- `ganho_familia = valor × 20,95% × cred − valor × hojeCred`
- Extras da camada API: `ganhoMigracaoRegime = base × 0,28 × 0,02`, `saldoCredorAnual = ganho × parcelaCestaBasica (0,42)`, caixa preso 30/180 dias, `ganhoConformidade = (preso180 − preso30) × 14%`.
- Não tem número de referência no brief — é a parte que mais precisa de revisão fiscal.

**Caixa** (ambos): `caixaRevenda(r, {dReceb=45, dTrib=25, cc=0.14})` e `caixaIndiretos(r, {prazo=60, cc=0.14})`.

**Cuidado numérico (seção 4.4 do brief):** não repetir "Simples transfere 4%, você debita 27,9%". Sobre o mesmo líquido ao prestador, a vantagem do crédito integral é ~**2%** (`vantagemRegimeIntegral: 0.02`).

**⚠️ Todas as premissas estão pendentes de validação do time fiscal da VOW.** O que sai é ordem de grandeza, não parecer; as telas e o e-mail dizem isso.

---

## 3. Fonte única da aritmética: `motor.js`

Isomórfico (Node + browser, sem build), servido em `/motor.js`. **Nunca duplicar cálculo no frontend.**

Exporta:
- Constantes: `ALIQUOTA` 0.265, `MARGEM_LUCRO` 0.02, `POR_DENTRO`, `STORAGE_KEY`.
- `PRODUTOS` — copy aprovada: famílias, `hoje`/`muda`, 5 `etapas` de conformidade, `mecanismos`.
- `simular(produtoId, faturamento, pctEmPontos, ativas, pesos)` — motor do simulador (vocabulário do handoff). `ativas` = famílias que o varejista tem; `pesos` = `{nome: %}` sobrescrevendo o mix; cada linha independente, `baseRef = faturamento × pct`, `base` = soma das ativas.
- `caixaRevenda`, `caixaIndiretos`.
- Formatadores: `fmtBRL`, `fmtBRLc`, `fmtPct`, `fmtCNPJ`, `fmtFone`, `emailOk`, `soDigitos`; `buscarCNPJ` (BrasilAPI); `assuntoEmail`.
- **Camada de compatibilidade** (API/e-mail/painel falam em frações): `PORTES`, `PREMISSAS`, `diagnosticoRevenda({faturamento, percentualVerba, ativas, pesos})`, `diagnosticoIndiretos({faturamento, percentualBase, parcelaCestaBasica, ativas, pesos})`, `diagnosticar(tipo, entrada)`. Aliases antigos `brl`, `brlCurto`, `pct`.

**Atenção:** o nome `revenda` calcula **verbas**, não aquisição de mercadoria. É contrato público da API e está gravado nos leads — renomear exige migração. Fonte certa: `docs/ABRAS - Verbas Comerciais.md`.

---

## 4. Estado do repositório

```
motor.js              aritmética · isomórfico
email.js              HTML/texto do e-mail + envio Resend (montarHtml, enviarDiagnostico, enviarEmail, emailAcesso)
crm.js                ESTAGIOS (8), MOTIVOS_PERDA (6), TIPOS_INTERACAO, SLA 48h, montarPipeline/Hoje/Resultado
painel.js             os quatro números, CLASSES_CREDITO, RISCOS, CALENDARIO
store.js              persistência multi-tenant (Postgres; pglite em dev) — regras append-only e redeId
auth.js               sessão, senha, link mágico, papéis
projeto.js            projeto pós-fechamento (etapas)
leads-db.js           leads (arquivo → Postgres via migrar.js)
db.js · migrar.js · bootstrap.js · basic-auth.js · lib-url.js
server/index.js       camadas pública + comercial
server/app.js         camada SaaS + CRM (/app/*)
scripts/seed.js       carteira de demonstração (senha vow-piloto)
test/                 14 testes (node --test)
public/tokens.css     fonte única da linguagem visual (duas escalas)
public/*.html         uma tela por arquivo, HTML+CSS+JS inline, sem framework
public/abras/         protótipo .dc.html exportado do Claude Design (servido em /totem)
docs/                 briefs de conteúdo
render.yaml           blueprint Render (web + Postgres + disco de migração)
```

Dependências: express, pg, qrcode, resend (+ pglite em dev). Convenções: sem ponto e vírgula, 2 espaços, comentários em pt-BR só quando explicam *por quê*, textos em pt-BR, números `R$ 1.234.567,89` com `tabular-nums`.

### 4.1 Rotas

**Pública**
```
GET  /                  landing (public/landing.html) — hero, vertical/horizontal para painel do estande
GET  /site              site completo (public/site.html)
GET  /totem             protótipo de design (public/abras/totem.dc.html) — o que o cliente aprovou
GET  /totem-v1          totem codado, grava lead (public/index.html)
GET  /diagnostico       simulador AS IS → TO BE web, ligado ao backend (public/diagnostico.html)
GET  /d/:id             página do diagnóstico — destino do QR
GET  /motor.js
GET  /healthz           { ok, uptime, plataforma: { inicializada, persistencia, migracao } }
GET  /api/premissas     { premissas, portes }
POST /api/simular       { tipo, faturamento, percentualVerba | percentualBase, parcelaCestaBasica, ativas, pesos } → sem gravar
POST /api/lead          { nome, empresa, email, telefone, cnpj, tipos[], origem, agendar, ...entrada } → grava, e-mail, QR
POST /api/lead/:id/diagnostico   anexa/reescreve diagnóstico de lead já capturado
```
**Comercial (Basic Auth)**
```
GET  /leads · /api/leads · /api/leads.csv
```
**SaaS / CRM (`server/app.js`, sessão)**
```
/app/entrar · /app/entrar/:token · /app/primeiro-acesso · /app/senha/:token · /app/redes · /app/inicio
/app  → redireciona para /app/pipeline
/app/rede (painel dos 4 números, exige rede com base)
/app/pipeline · /app/hoje · /app/resultado · /app/leads · /app/leads/:id · /app/capturar · /app/feira
/app/projetos · /app/projetos/:id · /app/dados
API: /api/app/entrar, link-magico, senha/*, sair, contexto, redes, rede, painel, referencias,
     crm/referencias, crm/pipeline, crm/hoje, crm/resultado, crm/leads (GET/POST/PATCH), crm/leads/:id/interacoes,
     crm/sync (fila offline), crm/feira, dados, projetos, projetos/:id, crm/leads/:id/projeto, projetos/:id/etapas/:etapaId
```

**Env:** `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`, `LEADS_USER`, `LEADS_PASSWORD`, `PUBLIC_BASE_URL`, `DATABASE_URL`, `LEADS_DB`, `APP_DB`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_SENHA`, `PORT`. Sem `RESEND_API_KEY` o totem não quebra: grava o lead, gera QR e marca e-mail como pendente.

### 4.2 Modelo de dados

**Lead** (`leads-db.js`): `id, criadoEm, nome, empresa, email, telefone, cnpj, origem ('abras'|'site'), agendar, faturamento, fezOsDois, estagio, estagioDesde, diagnosticos[{tipo, destaque, entrada}], email_enviado, email_erro` + CRM: `responsavel, honorario, probabilidade, proximaAcao{texto,quando}, motivoPerda`.

**Coleções do store** (`registros` jsonb, coluna `colecao`): `rede, usuario, fornecedor, verificacao, item, contrato, excecao, interacao, projeto`.
- **Append-only:** `verificacao`, `interacao` — `atualizar()` recusa.
- **Tenant:** tudo que não é global exige `redeId`; `listar()` não atravessa tenant. Globais: `rede, usuario, interacao, projeto`.
- `rede.premissas` carrega alíquota e mix próprios.

**CRM — dois números, nunca somados:** `valorEmJogo` (do diagnóstico, prioriza) e `honorario` (digitado na proposta, é a previsão). Previsão = `honorario × probabilidade`.

Estágios: 01 Capturado (48h) · 02 Abordado (3d) · 03 Qualificado (7d) · 04 Reunião marcada (14d) · 05 Levantamento (30d) · 06 Proposta (21d) · 07 Fechado / Perdido (motivo obrigatório, lista fixa).

---

## 5. Design — o que já existe

### 5.1 Tokens (`public/tokens.css`)
Duas escalas, mesmos nomes semânticos. `:root` = camada pública (escura, cinematográfica); `body.paper` = interna (clara, papel — ferramenta de 8h/dia). Um componente escrito com `--surface/--ink/--line` funciona nas duas.

```
:root       --bg #0E1B14  --bg-deep #07110C  --surface #15261C  --raised #1C3225
            --ink #F3EEE2 --dim #C9D2C8 --muted #9FB0A2 --faint #6F8074
            --gold #E0C48C --gold-deep #B8934A --gold-wash rgba(224,196,140,.07) --gold-edge rgba(224,196,140,.30)
            --risk #E8906C --ok #7BD389  --line rgba(243,238,226,.10) --line-2 .18  --track #243B2E
            --paper #EFE9DB --paper-card #FBF8F1 --paper-ink #0E1B14
body.paper  --bg #EFE9DB --bg-deep #E4DCC9 --surface #FBF8F1 --raised #FFF
            --ink #0E1B14 --dim #2E4237 --muted #5C6F62 --faint #87988B
            --gold #8A6A2B --gold-deep #6E5320 --risk #A24A2C --ok #2F7A55
            --line rgba(14,27,20,.12) --line-2 .22 --track #D8CFBB
raios       --r-sm 12 --r-md 16 --r-lg 20 --r-xl 24 --r-2xl 32 --r-pill 999
fontes      --sans IBM Plex Sans · --serif Instrument Serif (títulos e números grandes) · --mono IBM Plex Mono
```
Primitivas: `.wrap .serif .tnum .eyebrow .logo .btn (.ghost .lg) .card .panel .chip .rule .fine`, casca `.appbar` (marca, abas roláveis, rede, quem, sair), `.app-main`, `.faixa-rede (off|esperando|ok)`, `.senha-campo`. Sem sombras; profundidade por contraste e bordas 1px.

**Acessibilidade:** cor nunca decide sozinha (vermelho tributado × verde não tributado = ΔE 7,6 em deuteranopia). Todo `--risk`/`--ok` carrega rótulo escrito.

### 5.2 Telas desenhadas (protótipos `.dc.html`, alta fidelidade, aprovadas)

**Totem VOW ABRAS** — kiosk touch, 1080×1920 vertical (padrão) ou 1920×1080 horizontal (seletor no cabeçalho, persistido). Fonte base 28px, botão primário 104px, alvos ≥ 56px, inatividade 120s → home, tela final reinicia em 30s.
1. **Home** — eyebrow "JBP 2027 · REFORMA TRIBUTÁRIA · IBS/CBS", H1 serif 112px "Já fez o seu JBP? *Planejou com as novas regras tributárias?*", dois cards-botão (Diagnóstico 01/02). Prop `produtoFixo` = ambos|revenda|indiretos.
2. **Lead (1/3)** — CNPJ opcional com máscara e auto-lookup BrasilAPI (borda verde/laranja + status), Nome, E-mail, Telefone. Libera com nome ≥ 3, e-mail válido, telefone ≥ 10 dígitos. Texto LGPD. Cria o lead ao continuar.
3. **Simulação (2/3)** — "Dois números bastam." Slider de faturamento **logarítmico** R$ 5 mi → R$ 50 bi (`5e6 × 10000^(v/1000)`, 2 algarismos significativos), chips 50 mi/300 mi/1 bi/5 bi/20 bi, padrão 300 mi. Slider de % (Revenda 1–8%, padrão 3; Indiretos 3–15%, padrão 8).
4. **Resultado (3/3) AS IS | TO BE** — herói serif 152px (perda em `--risk` / crédito em `--ok`); **três cenários** (Hoje · Depois sem mexer · Depois recomposta/revisada); callout; "← Voltar e ajustar"; **O que muda no caixa** (4 tiles, chips de prazo 30/45/60/90 ou 30/60/180); **linha a linha** calibrável (checkbox "não tenho", − / + 1 p.p. por família, independente, sem cascata, botão "Voltar à referência", mínimo 1%, não desmarcar a última); **5 etapas de conformidade** + chips de mecanismos; **Leve com você** (e-mail ao concluir + QR 180px); toggle "Quero conversar com a VOW"; disclaimer; **"Concluir e enviar"** — o e-mail só sai aqui.
5. **Fim** — "Obrigado, {Nome}.", status do envio, card **"Falta a outra metade"** → segundo diagnóstico pula o cadastro e usa o mesmo faturamento; com os dois feitos, "Encerrar".

**Plataforma VOW Leads** — desktop, tema papel, grid `248px 1fr`, sidebar escura. Abas **Leads** (4 KPIs, busca, filtros, tabela, painel de detalhe 400px com ambos os diagnósticos, prévia do e-mail, Reenviar, Marcar contatado), **Disparos** (fila de e-mails + fila comercial), **Configurações** (webhook, Resend via Render, premissas, exportar CSV `;` BOM UTF-8).

**Diagnóstico VOW** — página do QR, mobile ≤ 520px, coluna única, lê `#d=` base64 e recalcula com `motor.js`. No repo virou `/d/:id` (servidor) + `public/diagnostico.html`.

**Email Diagnóstico** — preview do HTML de `email.js`: 600px, tabelas, Georgia/Helvetica, header escuro, herói, Hoje/Depois, linha a linha (só ativas), 5 etapas, "Você também fez…"/"Falta a outra metade", CTA, descadastro. Assunto: `Diagnóstico VOW · R$ X em jogo nas verbas com a indústria` / `… R$ X de crédito que passa a voltar`.

Detalhe completo (medidas, cores por elemento, estados) em `docs/handoff-abras/README.md`.

### 5.3 Telas codadas sem desenho refinado (`public/app-*.html`)
`entrar, primeiro, senha, redes, inicio, painel, pipeline, hoje, resultado, leads, lead, capturar, feira, projetos, projeto, dados` — funcionam, seguem `tokens.css` e `.appbar`, mas foram feitas pelo Claude Code sem passar pelo design. São o material de partida do v0.1.

---

## 6. Mapa de telas do SaaS (o que falta desenhar e construir)

| Rota | Tela | Prioridade de desenho |
|---|---|---|
| `/app` | **Painel** — 4 números (crédito em risco, cobertura contratual, itens saneados, saldo credor na fila) + fila de exceções + o que mudou desde ontem | **1** |
| `/app/fornecedores/:cnpj` | **Ficha do fornecedor** — 7 blocos do Raio-X, score decomposto, histórico | **2** |
| `/app/fornecedores/mapa` | **Mapa da carteira** — matriz risco × classe de crédito, tamanho pela exposição | **3** |
| `/app/contratos` | **Cobertura** — todo CNPJ pago sem contrato, por valor | **4** |
| `/f/:token` | **Portal do fornecedor** — externo, sem login, celular em sinal ruim; declara regime, envia comprovante | **5** |
| `/app/fornecedores` · `/excecoes` | Carteira com semáforo + fila fato-causa-ação | |
| `/app/contratos/:id` · `/minutas` · `/verbas` · `/aprovacoes` | Sistema 2 | |
| `/app/itens` · `/:sku` · `/fila` · `/book` | Sistema 3 | |
| `/app/diagnosticos` · `/relatorios` · `/integracoes` · `/conta` | Transversais | |

**Dois eixos, não um semáforo:** risco ("o débito vai ser extinto?") e classe de crédito ("quanto volta?") são independentes — um MEI regular é verde em risco e zero em crédito. A interface mostra os dois separados; é a ideia mais original do produto.

**Por que o portal existe:** a opção do Simples pelo regime regular de IBS/CBS não é consultável por terceiros. Só quem fez a opção pode declarar, com data, e revalidar nas janelas de março e setembro.

### Ordem de construção
| Fase | Entrega | Pronto quando |
|---|---|---|
| 1 | Auth, tenant, painel | usuário entra, escolhe rede, vê 4 números — **parcial (feito exceto painel com dados reais)** |
| 2 | Sistema 1 + portal do fornecedor | carteira importada mostra semáforo e classe; fornecedor declara regime |
| 3 | Postgres | **já migrado** (render.yaml tem `vow-db`) |
| 4 | Sistema 2, começando pela cobertura | tela revela todo CNPJ pago sem contrato |
| 5 | Sistema 3, portando o protótipo | base importada, divergências com embasamento |

CRM (`docs/CRM-DESENHO.md`): fases e dono ✔ · histórico ✔ · fechado/perdido ✔ · PWA de campo com fila offline (`/api/app/crm/sync`) ✔ · modo feira (`/api/app/crm/feira`) ✔ — tudo codado, nada desenhado.

---

## 7. Pendências e decisões abertas

**Técnicas**
1. **Portar o protótipo do totem** (`public/abras/totem.dc.html`) para o motor da raiz + `POST /api/lead`. Hoje ele tem motor próprio e grava em `localStorage` — duas aritméticas no mesmo produto. Enquanto isso: `/totem` = protótipo aprovado, `/totem-v1` = codado com gravação. Ao substituir por nova exportação, reinserir `<base href="/abras/">` em cada `.dc.html`.
2. Deploy no Render: preencher `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`, `LEADS_USER`, `LEADS_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_SENHA`. Domínio do remetente verificado no Resend.
3. Apontar `baseUrlDiagnostico` do totem para a URL pública de `/d/:id`.
4. Webhook da plataforma → CRM/e-mail real (ou aposentar em favor do CRM interno).
5. Remover o disco `/var/data` do `render.yaml` depois de confirmada a migração para Postgres.
6. Corrigir o cabeçalho antigo do `motor.js` que citava `Contrato de Revenda.md` (fonte certa: `Verbas Comerciais.md`) — já corrigido na versão atual; conferir.

**De negócio (não são do dev)**
1. Validar premissas (26,5%, 70,5%, mix por família, crédito por regime, 28% guia única, 42% cesta) com o fiscal da VOW.
2. Auth própria ou por provedor.
3. Consultor VOW acessa a conta do cliente com papel próprio? O que enxerga?
4. Como a VOW cobra (% do recuperado, fixo, fixo + êxito) — define a fórmula da previsão.
5. Porte mínimo para qualificação.
6. Nomes e quantidade de responsáveis comerciais.
7. Texto LGPD final e link de descadastro real.

---

## 8. O que não fazer

1. Não prometer número — tudo sai de entrada do usuário ou cálculo sobre ela.
2. Não vender velocidade ("em segundos") — desvaloriza a consultoria.
3. Não duplicar aritmética — `motor.js` é a fonte única.
4. Não atualizar `verificacao` nem `interacao` — só inserir.
5. Não hardcodar premissa fora de `PREMISSAS` ou da rede.
6. Cor não decide sozinha — rótulo escrito sempre.
7. Não afirmar tratamento tributário como certeza onde os briefs marcam pendência.
8. Não usar frameworks no frontend — HTML/CSS/JS inline, um arquivo por tela (o Claude Design edita direto).

---

## 9. Como validar

- `node --check` nos arquivos alterados; `npm test` (14 testes).
- `POST /api/simular {tipo:"revenda", faturamento:300000000, percentualVerba:0.03}` → `perda: 1329189.72`, `perdaSobreLucro ≈ 0.2215`.
- `perda ÷ tributável = 20,95%`.
- Telas nos dois temas e no celular; portal do fornecedor em sinal ruim.

---

## 10. Onde está a regra completa (`docs/`)

| Arquivo | Assunto |
|---|---|
| `BRIEF-CLAUDE-CODE.md` | Brief de construção completo (arquitetura, modelo, fases, design, glossário) |
| `ABRAS - Plataforma - Arquitetura e Telas.md` | Mapa completo do SaaS e brief para o Claude Design |
| `CRM-DESENHO.md` | CRM e app de campo: dois números, pipeline, PWA |
| `ABRAS - Sistema 1 - Fornecedores.md` | Monitoramento, seis ganhos, Raio-X |
| `ABRAS - Sistema 2 - Contratos.md` | Oito tipos de contrato, gate de pagamento |
| `ABRAS - Sistema 3 - Itens.md` | Saneamento, base mestre, recuperação retroativa |
| `ABRAS - Verbas Comerciais.md` | Fonte do diagnóstico `revenda` |
| `ABRAS - Contrato de Indiretos.md` | Fonte do diagnóstico `indiretos` |
| `ABRAS - Contrato de Revenda.md` | Oito modalidades de aquisição de mercadoria |
| `jbp-sob-a-reforma.md` | Gancho do JBP usado na home do totem |
| `handoff-abras/README.md` | Handoff de design detalhado do totem, plataforma, QR e e-mail |

## Glossário curto
**cClassTrib** código de classificação tributária na NF-e (obrigatório desde 03/08/2026) · **CBS/IBS** novos tributos federal e estadual-municipal · **Classe de crédito** quanto do imposto pago volta · **Extinção do débito** condição do crédito (art. 47) · **Gate de pagamento** trava no ERP · **JBP** Joint Business Plan, acordo anual varejo–indústria · **RAD** recolhimento pelo adquirente · **Recomposição** reajuste da verba pelo tributo · **Saldo credor** crédito acumulado por quem vende a alíquota zero · **Split payment** tributo separado na liquidação (obrigatório 2028) · **Tenant/rede** cada cliente na plataforma.
