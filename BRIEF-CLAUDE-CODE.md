# Brief de construção — Plataforma VOW

**Para:** Claude Code, no repositório `~/ClaudeCode/VOW`
**De:** Rodrigo Bauer · Grupo VOW
**Data:** 02/09/2026

Este documento é autossuficiente. Leia-o inteiro antes de escrever a primeira linha. Os documentos em `docs/` têm a profundidade; este tem o que você precisa para construir.

---

## 1. O que é

O Grupo VOW é uma consultoria tributária que atende redes de supermercado. A reforma tributária brasileira — IBS e CBS, LC 214/2025 — transfere ao varejista responsabilidades que eram do governo. A VOW resolve isso hoje à mão, cliente a cliente. O projeto é embarcar essa inteligência numa plataforma SaaS.

**Alvo:** Smart Market ABRAS, 12 e 13 de abril de 2027. Antes disso, piloto pago com clientes da base.

**Três produtos**, e a ordem entre eles importa:

| | Produto | Responde | Papel |
|---|---|---|---|
| Sistema 1 | **Fornecedores** | Este CNPJ está regular, e quanto do imposto que pago a ele volta como crédito? | Recorrência |
| Sistema 2 | **Contratos** | Meus contratos sustentam o crédito que estou tomando? | Retenção |
| Sistema 3 | **Itens** | Qual a alíquota certa de cada produto que eu vendo? | Aquisição |

**A dependência:** o Sistema 3 define a alíquota efetiva de cada item, e é ela que diz quanto crédito está em risco em cada fornecedor (Sistema 1) e quanto vale cada contrato (Sistema 2). Calcular com alíquota cheia sobre tudo produz número falso.

## 2. Estado do repositório

Tudo abaixo funciona. Não refaça — faça crescer.

```
motor.js              aritmética dos diagnósticos. Isomórfico: Node e browser, sem build
email.js              HTML do diagnóstico + disparo pelo Resend
server/index.js       Express: API + rotas das telas
public/landing.html   landing pública, servida em /
public/index.html     totem da feira, servido em /totem
public/leads.html     plataforma de leads, em /leads, Basic Auth
data/leads.json       persistência atual
docs/                 os briefs de conteúdo — leia quando precisar da regra tributária
render.yaml           deploy
```

**Rotas existentes:**

```
GET  /              landing
GET  /totem         kiosk
GET  /leads         plataforma de leads (protegida)
GET  /d/:id         página do diagnóstico — destino do QR
GET  /healthz       health check
GET  /api/premissas PREMISSAS e PORTES
POST /api/simular   { tipo, faturamento, percentualVerba | percentualBase } → diagnóstico, sem gravar
POST /api/lead      { nome, empresa, email, telefone, tipos[], ...entrada } → grava, envia e-mail, devolve QR
GET  /api/leads     lista (protegida)
GET  /api/leads.csv exporta (protegida)
```

**Variáveis de ambiente:** `RESEND_API_KEY`, `LEADS_USER`, `LEADS_PASSWORD`, `PUBLIC_BASE_URL`, `LEADS_DB`, `PORT`.

## 3. Convenções do código

Siga o que já está lá:

- **Node 20+, ESM** (`"type": "module"`). Sem TypeScript, sem build step.
- **Sem ponto e vírgula.** Indentação de 2 espaços.
- **Comentários em português**, e só onde explicam *por quê* — o código já diz o quê.
- **Frontend sem framework.** HTML com CSS e JS inline, um arquivo por tela. É deliberado: o Claude Design edita esses arquivos diretamente.
- **`motor.js` é a única fonte da aritmética.** Nunca duplique cálculo no frontend. Se o browser precisa da conta, ele importa `motor.js` ou chama `/api/simular`.
- **Textos em pt-BR**, incluindo mensagens de erro. Números no padrão brasileiro: `R$ 1.234.567,89`, `font-variant-numeric: tabular-nums`.
- Dependências novas exigem justificativa. Hoje são três: express, qrcode, resend.

## 4. As regras que o código precisa encodar

### 4.1 A mecânica

Três artigos da LC 214/2025 explicam o produto inteiro:

- **Art. 27** — o débito do fornecedor se extingue por cinco vias: compensação, pagamento, split payment, recolhimento pelo adquirente (RAD) e pagamento por responsável.
- **Art. 47** — o adquirente só apropria o crédito **quando o débito do fornecedor for extinto**. O crédito deixa de nascer com a nota e passa a nascer com o comportamento de um terceiro.
- **Art. 48** — o requisito fica dispensado enquanto split payment e RAD não estiverem implementados.

**Calendário:** 2026 é teste (CBS 0,9% + IBS 0,1%; desde 03/08/2026 nota sem os campos consistentes é rejeitada na origem). 2027 a CBS entra cheia e o split payment é opcional. 2028 o split payment vira obrigatório. 2033 acabam ICMS e ISS.

### 4.2 As fórmulas

Estão em `motor.js` e estão corretas. Não as altere sem falar com a VOW.

```
# Verbas (revenda)
tributavel    = verbaTotal × 0,705
recomposicao  = tributavel × aliquota           ← o que se pede à indústria; ela credita, custo zero pra ela
perda         = tributavel × aliquota/(1+aliquota)   ← o que sai do bolso do varejo se não recompuser

# Indiretos
ganho_familia = gasto × (aliquota × aproveitamento − creditoHoje)
saldoCredor   = ganhoCredito × parcelaCestaBasica
ganhoConformidade = (caixaPreso180 − caixaPreso30) × custoCapital
```

**Número de controle:** com alíquota de 26,5%, `perda ÷ tributável = 20,95%`. Se der outra coisa, algo quebrou.

### 4.3 As premissas

Todas vivem em `PREMISSAS`, no topo do `motor.js`, isoladas de propósito. Alíquota de referência 26,5% (trava legal; o Comitê Gestor estimou 27,91%). Parcela tributável da verba 70,5%. Margem líquida do varejo 2%. Sete famílias de indiretos com peso, crédito atual e aproveitamento.

**Toda premissa está pendente de validação do time fiscal da VOW.** O que sai da plataforma hoje é ordem de grandeza, não parecer — e a interface precisa dizer isso.

### 4.4 Um cuidado numérico

Não repita o argumento "o fornecedor do Simples transfere 4% e você debita 27,9%". É direcionalmente certo e numericamente exagerado: o preço de quem está na guia única já embute a carga dele a uma alíquota menor. Sobre o mesmo líquido ao fornecedor, a vantagem do crédito integral é de cerca de **2%** — um desconto de pouco mais de 2% empata. É por isso que `vantagemRegimeIntegral: 0.02` está no motor.

## 5. Arquitetura

Três camadas, com públicos e ciclos diferentes. O erro a evitar é tratar como um app só.

| Camada | Público | Auth | Existe? |
|---|---|---|---|
| Pública — landing, diagnósticos, totem | Prospect | nenhuma | **sim** |
| Comercial — leads, disparos, config | Time VOW | Basic Auth | parcial |
| **SaaS — os três sistemas** | Cliente pagante | login, conta, papéis | **não** |

Construir a terceira é o trabalho.

## 6. Modelo de dados

Sete entidades bastam para o primeiro corte:

```
rede         cnpj, razao, porte, plano, premissas próprias
usuario      nome, email, papel, redes[]
fornecedor   cnpj, regime, regime_declarado_em, score, classe_credito
verificacao  fornecedor, camada, fonte, resultado, ts
item         sku, ncm, cclasstrib, aliquota_efetiva, status, evidencia
contrato     fornecedor, tipo, vigencia, score, clausulas[], arquivo
excecao      origem, fato, causa, acao, responsavel, prazo, status
```

Duas regras não negociáveis:

**`verificacao` nunca é atualizada, só inserida.** É o log de diligência e a defesa em fiscalização. Um `UPDATE` ali destrói o valor da tabela.

**`rede` carrega premissas próprias.** Cada cliente vai querer a alíquota e o mix dele, não o padrão. Nunca hardcode premissa fora de `PREMISSAS` ou da rede.

**Persistência:** JSON em arquivo aguenta piloto. Troque por Postgres quando o primeiro contrato for assinado — não antes.

## 7. Mapa de telas do SaaS

### Entrada
| Rota | Tela |
|---|---|
| `/app/entrar` | Login — e-mail e senha, link mágico como alternativa |
| `/app/redes` | Escolher rede — só quando o usuário atende mais de uma |
| `/app/inicio` | Onboarding em três passos: conectar ERP ou subir arquivo, confirmar CNPJ, escolher por onde começar |

### Painel
| Rota | Tela |
|---|---|
| `/app` | Quatro números — crédito em risco, cobertura contratual, itens saneados, saldo credor na fila — mais a fila de exceções do dia e o que mudou desde ontem |

O painel responde "o que preciso olhar hoje", não "quanto de dado vocês têm". É a tela que justifica a assinatura.

### Sistema 1 · Fornecedores
| Rota | Tela |
|---|---|
| `/app/fornecedores` | Carteira com semáforo, classe de crédito, materialidade e exposição |
| `/app/fornecedores/:cnpj` | Ficha — sete blocos do Raio-X, score decomposto, histórico |
| `/app/fornecedores/mapa` | Matriz risco × classe de crédito, tamanho pela exposição |
| `/app/fornecedores/excecoes` | Fila fato-causa-ação, com responsável e prazo |
| `/f/:token` | **Portal do fornecedor — externo, sem login.** Ele vê a pendência, declara o regime, envia comprovante |

**Dois eixos, não um semáforo.** Risco ("o débito vai ser extinto?") e classe de crédito ("quanto volta pra mim?") são perguntas independentes. Um MEI perfeitamente regular é verde em risco e péssimo em crédito. A interface precisa mostrar os dois separados — é a ideia mais original do produto.

**Por que o portal existe:** a opção do Simples pelo regime regular de IBS/CBS **não é consultável por terceiros**. Só o próprio contribuinte vê. A resposta tem que vir declarada por quem a fez, com data, e ser revalidada nas janelas de março e setembro.

### Sistema 2 · Contratos
| Rota | Tela |
|---|---|
| `/app/contratos` | Cobertura — todo CNPJ pago sem contrato, priorizado por valor |
| `/app/contratos/:id` | Contrato — score, cláusulas presentes e ausentes, wizard |
| `/app/contratos/minutas` | Modelos VOW por tipo e regime |
| `/app/contratos/verbas` | Matriz de tratamento por linha do acordo, com cálculo de recomposição |
| `/app/contratos/aprovacoes` | Alçadas fiscal e jurídica em paralelo, com ressalva |

Três domínios dentro deste sistema, cada um com seu brief em `docs/`: **Revenda** (a mercadoria que entra), **Verbas Comerciais** (o dinheiro que entra da indústria), **Indiretos** (o serviço que o varejo contrata).

### Sistema 3 · Itens
| Rota | Tela |
|---|---|
| `/app/itens` | Base — percentual saneado, divergências, ganho identificado |
| `/app/itens/:sku` | Item — classificação atual e proposta, embasamento, evidência |
| `/app/itens/fila` | Correção priorizada por impacto, não por ordem alfabética |
| `/app/itens/book` | Relatório de entrega, gerado e versionado |

### Transversais
| Rota | Tela |
|---|---|
| `/app/diagnosticos` | Os dois da landing, agora sobre dados reais |
| `/app/relatorios` | O mensal que renova o contrato |
| `/app/integracoes` | ERP, webhook, chaves de API |
| `/app/conta` | Papéis: comprador, fiscal, jurídico, suprimentos, diretoria, consultor VOW |

## 8. Ordem de construção

| Fase | Entrega | Pronto quando |
|---|---|---|
| **1** | Auth, tenant e painel | Um usuário entra, escolhe a rede e vê quatro números vindos de arquivo |
| **2** | Sistema 1 completo, com o portal do fornecedor | Uma carteira importada mostra semáforo e classe de crédito, e um fornecedor declara o regime pelo portal |
| **3** | Postgres | No primeiro contrato assinado, não antes |
| **4** | Sistema 2, começando pela cobertura | A tela de cobertura revela todo CNPJ pago sem contrato |
| **5** | Sistema 3, portando o protótipo existente | Base importada, divergências apontadas com embasamento |

Fases 1 e 2 dão um produto vendável. O resto é expansão.

## 9. Design

A linguagem visual já existe, nas telas em `public/` e nos `.dc.html` do handoff.

```
--bg:#0E1B14   --bg-deep:#07110C   --surface:#15261C   --raised:#1C3225
--ink:#F3EEE2  --dim:#C9D2C8       --muted:#9FB0A2     --faint:#6F8074
--gold:#E0C48C --gold-deep:#B8934A --risk:#E8906C      --ok:#7BD389
--paper:#EFE9DB  --paper-card:#FBF8F1   --paper-ink:#0E1B14
--line:rgba(243,238,226,.10)   --line-2:rgba(243,238,226,.18)
```

IBM Plex Sans na interface, Instrument Serif nos números grandes e títulos. Raios de 14 a 32px.

**Regra de contraste entre camadas:** o público é escuro e cinematográfico; a plataforma interna é clara, sobre papel, porque é ferramenta de oito horas por dia.

**Primeira tarefa de design:** extrair esses tokens num arquivo único. Hoje estão repetidos inline em cada tela, e isso já começou a divergir.

## 10. O que não fazer

1. **Não prometa número.** Todo valor na tela sai de entrada do usuário ou de cálculo sobre ela. Nada de "empresas como a sua economizam X". Se precisar de valor inicial, marque como exemplo editável.
2. **Não venda velocidade.** Nada de "em segundos" ou "o que levava quinze dias". Desvaloriza a consultoria, que é o negócio principal.
3. **Não duplique aritmética.** `motor.js` é a fonte única.
4. **Não atualize `verificacao`.** Só insira.
5. **Não hardcode premissa** fora de `PREMISSAS` ou da rede.
6. **Não migre para Postgres** antes do primeiro cliente pagante.
7. **Cor não decide sozinha.** Vermelho de tributado e verde de não tributado é um par ruim para daltonismo — ΔE 7,6 em deuteranopia. Todo item colorido carrega o rótulo escrito.
8. **Não afirme tratamento tributário como certeza** onde os briefs marcam pendência. A interface ganha credibilidade dizendo o que ainda não sabe.

## 11. Como validar

- `node --check` em cada arquivo alterado do servidor.
- Subir na porta 4321 e conferir: `/` e `/totem` devolvem 200; `/api/simular` com `{tipo:"revenda", faturamento:300000000, percentualVerba:0.03}` devolve `perda: 1329189.72` e `perdaSobreLucro ≈ 0,2215`.
- Confirmar o número de controle: `perda ÷ tributável = 20,95%`.
- Testar as telas nos dois temas e no celular. O portal do fornecedor tem que funcionar em sinal ruim.

## 12. Onde está a regra completa

Em `docs/`, e vale ler quando a tarefa tocar o assunto:

| Arquivo | Assunto |
|---|---|
| `ABRAS - Sistema 1 - Fornecedores.md` | O produto de monitoramento, os seis ganhos, o Raio-X |
| `ABRAS - Sistema 2 - Contratos.md` | O produto de contratos, oito tipos, o gate de pagamento |
| `ABRAS - Sistema 3 - Itens.md` | Saneamento, base mestre, recuperação retroativa |
| `ABRAS - Contrato de Revenda.md` | Oito modalidades de aquisição de mercadoria |
| `ABRAS - Verbas Comerciais.md` | Oito contratos e sete verbas do acordo com a indústria |
| `ABRAS - Contrato de Indiretos.md` | Sete famílias de serviço, e o achado sobre terceirização |
| `ABRAS - Plataforma - Arquitetura e Telas.md` | O mapa completo, com mais detalhe que a seção 7 |
| `dossie-vow-consolidado.html` | A visão geral do projeto |

**Pendência a corrigir:** o cabeçalho do `motor.js` cita `docs/ABRAS - Contrato de Revenda.md` como fonte do diagnóstico de revenda, mas o cálculo é de verbas. A fonte certa é `ABRAS - Verbas Comerciais.md`.

---

## Glossário

| Termo | Significado |
|---|---|
| cClassTrib | Código de Classificação Tributária do item na NF-e; obrigatório desde 03/08/2026 |
| CBS / IBS | Novos tributos: federal (substitui PIS/Cofins) e estadual-municipal (substitui ICMS/ISS) |
| Classe de crédito | Quanto do imposto pago volta como crédito, conforme o regime do fornecedor |
| Diagnóstico | A simulação gratuita — topo de funil, não apuração fiscal |
| Extinção do débito | Quitação do IBS/CBS pelo fornecedor; condição do crédito do comprador (art. 47) |
| Gate de pagamento | Trava no ERP que retém título sem contrato vinculado ou com fornecedor irregular |
| Isomórfico | Código que roda igual no servidor e no browser |
| Janelas de março e setembro | Datas em que o optante do Simples pode rever o regime de IBS/CBS |
| Multi-tenant | Uma instalação que atende várias redes com dados isolados |
| Raio-X | O modelo de avaliação de fornecedor em sete blocos e dois eixos |
| RAD | Recolhimento pelo Adquirente |
| Recomposição | Reajuste da verba pelo valor do tributo, para preservar o líquido do varejo |
| Regime regular de IBS/CBS | Opção do Simples de recolher por fora da guia única, gerando crédito integral |
| Saldo credor | Crédito acumulado por quem vende a alíquota zero e compra tributado |
| Split payment | Separação e recolhimento do tributo na liquidação financeira da nota |
| Tenant | Cada rede cliente dentro da plataforma |
