# Handoff: Simulador AS IS → TO BE · VOW × ABRAS 2026

## Overview
Dois produtos para a feira da ABRAS, no mesmo pacote:

1. **Totem** (kiosk, touch): captura de lead → simulação em dois números → resultado AS IS / TO BE → e-mail + QR code → convite para o segundo diagnóstico. Um totem pode rodar só *Revenda*, só *Indiretos* ou os dois (a landing do totem mostra os dois cards e o varejista escolhe).
2. **Plataforma de leads** (uso interno VOW): recebe cada lead/simulação automaticamente, mostra o diagnóstico, dispara e reenvia o e-mail via Resend, fila comercial de quem pediu conversa, exportação CSV.

Mais dois entregáveis de apoio: a **página que o QR abre no celular** (`Diagnóstico VOW.dc.html`) e o **modelo de e-mail** (`email.js` + preview `Email Diagnóstico.dc.html`), e o **serviço de envio no Render** (`server/`).

Conteúdo de domínio (famílias, o que muda, impacto, etapas de conformidade) vem de `uploads/ABRAS - Contrato de Revenda.md` e `uploads/ABRAS - Contrato de Indiretos.md`. Trate os textos desses arquivos e do `motor.js` como copy aprovada.

## About the Design Files
Os arquivos `.dc.html` são **referências de design em HTML** (protótipos funcionais mostrando aparência e comportamento), não código de produção para copiar. A tarefa é **recriar estas telas no ambiente do produto** (React/Next, Vue, etc.). Se não houver stack definida, sugestão: **Next.js + React**, front hospedado no Render (Static Site) e API no Render (Web Service). `motor.js`, `email.js` e `server/index.js` são JS puro e **podem ser reaproveitados diretamente** (motor de cálculo, HTML do e-mail e proxy do Resend).

## Fidelity
**Alta fidelidade.** Cores, tipografia, espaçamentos, copy e interações são finais. Recriar pixel a pixel; substituir apenas o que o stack exigir (ex.: componentes de input).

## Arquitetura
```
Totem (kiosk)  ──salva lead──▶ localStorage (vow_abras_leads)  ◀── Plataforma (poll 3s + evento storage)
      │                                   │
      ├──POST JSON (webhookUrl)──────────▶ CRM / Sheets / automação (opcional)
      └──ao Concluir: POST /send ───────▶ Render (server/index.js) ──▶ Resend API ──▶ e-mail do varejista
QR code ──▶ Diagnóstico VOW.dc.html#d=<base64 JSON> (recalcula no celular, sem backend)
```
Em produção, substituir o `localStorage` compartilhado por um banco (Postgres no Render, Supabase…) com a mesma forma de dado (ver *Modelo de dados*). O totem deve continuar funcionando com fila local caso a rede da feira caia, sincronizando depois.

## Modelo de dados (lead)
```json
{
  "id": "LMFX2K9A", "ts": 1788356000000, "origem": "Totem ABRAS", "status": "lead|simulado|contatado",
  "produto": "revenda|indiretos",
  "nome": "Mariana Costa", "email": "…", "telefone": "(11) 98765-0001",
  "cnpj": "12.345.678/0001-90",
  "empresa": { "razao": "…", "fantasia": "…", "municipio": "Campinas", "uf": "SP", "porte": "…", "cnae": "…" },
  "faturamento": 300000000, "pct": 3,
  "resultado": { "...saída de simular()", "ativas": ["Logística", "Marketing", "…"] },
  "simulacoes": { "revenda": {…}, "indiretos": {…} },
  "entregas": {
    "email": { "status": "enviando|enviado|erro", "modo": "demo|resend", "ts": 0, "resendId": "…", "erro": "…", "reenvios": 0 },
    "qr": true, "agendar": true
  }
}
```
Busca de CNPJ: `GET https://brasilapi.com.br/api/cnpj/v1/{14 dígitos}` (campos usados: razao_social, nome_fantasia, municipio, uf, porte, cnae_fiscal_descricao).

## Motor de cálculo (`motor.js`)
Premissas do estudo: alíquota de referência **26,5%**, tributo "por dentro" = 1 − 1/1,265 = **20,95%**, margem líquida **2%**. `simular(produtoId, faturamento, pct, ativas)`:
- **Revenda**: base = faturamento × pct. Cada família tem `peso` (mix padrão, soma 100) e `trib` (0, 0,5, 0,55, 0,6 ou 1). Tributável = Σ valor×trib; **perda** = tributável × 20,95%; **recomposição** = tributável × 26,5%; % do lucro = perda ÷ (faturamento × 2%). Com R$ 300 mi e 3%: verba R$ 9 mi, tributável R$ 6,345 mi (70,5%), perda R$ 1.329.190 (22% do lucro) — bate com o documento.
- **Indiretos**: cada família tem `peso`, `cred` (fração do IBS/CBS que volta) e `hojeCred`. Ganho = Σ(valor×20,95%×cred) − Σ(valor×hojeCred).
- **`ativas`**: lista de nomes de famílias que o varejista tem (null = todas). **`pesos`**: `{ nome: % }` sobrescrevendo o peso padrão. Cada família vale `baseRef × peso/100`, independente das outras; `base` (total efetivo) = soma das ativas; `baseRef` = faturamento × pct fica como referência exibida.
- **Caixa**: `caixaRevenda(r, {dReceb, dTrib=25, cc=0.14})` → tributo mensal, defasagem em dias, capital imobilizado (tributoMês × gap/30) e carrego anual (× cc). `caixaIndiretos(r, {prazo, cc})` → crédito mensal, saldo preso (créditoMês × prazo/30) e carrego.
- Serviços financeiros ficam fora do motor (regime específico da LC 214) — mostrar a nota.

## Screens / Views

### Totem — geral
- Canvas fixo, **vertical 1080×1920** (padrão) ou **horizontal 1920×1080**. Seletor no cabeçalho (segmented "Vertical | Horizontal"), persistido em `localStorage.vow_abras_orientacao`; também prop `orientacao`.
- Layout de cada tela é um grid com áreas `a` (introdução/título), `b` (corpo) e `c` (rodapé/ação). Vertical: `"a" "b" "c"`, rows `auto 1fr auto`, padding `80px 72px 64px`, gap `48px 0`. Horizontal: `"a b" "c b"`, cols `1fr 1fr`, rows `1fr auto`, padding `48px 64px 40px`, gap `32px 72px`. Na tela de resultado, `a` = herói + cards Hoje/Depois (fixo à esquerda no horizontal) e `b` = conteúdo rolável.
- Cabeçalho: 128px (vertical) / 96px (horizontal). Esquerda: "VOW" Instrument Serif 44px + "DIAGNÓSTICO · ABRAS 2026" 22px #9FB0A2 tracking 0.14em uppercase. Direita: 3 pílulas de progresso (10px altura, ativa 40px de largura #E0C48C, demais 14px rgba(243,238,226,.18)), botão "Recomeçar" outline 56px, seletor de orientação.
- Fundo `#0E1B14`; cards `#15261C` com borda `rgba(243,238,226,0.10)` e raio 32px; card destaque `#1C3225` com borda `rgba(224,196,140,0.35)`.
- Fonte base 28px. Botão primário: 104px de altura, raio 24px, fundo `#E0C48C`, texto `#0E1B14` 30px/500. Botão secundário: outline `rgba(243,238,226,0.22)`, texto `#F3EEE2`. Alvos de toque ≥ 56px.
- Inatividade: volta à home após 120s sem toque (prop `inatividadeSeg`). Tela final reinicia em 30s.
- Animação de entrada por tela: `fadeUp` 0.4–0.5s ease (opacity 0→1, translateY 24px→0).

### 1. Home
- Eyebrow "JBP 2027 · REFORMA TRIBUTÁRIA · IBS/CBS" 24px #E0C48C. H1 Instrument Serif 112px (horiz. 88px), line-height 1.02: "Já fez o seu JBP? *Planejou com as novas regras tributárias?*" (itálico em #E0C48C). Parágrafo 34px #C9D2C8: "A reforma já está no seu contrato com a indústria e nos seus contratos de serviço. Escolha um diagnóstico: em três minutos você vê o que muda, quanto custa e o que levar para a mesa do JBP."
- Dois cards-botão (um por diagnóstico; prop `produtoFixo` = ambos|revenda|indiretos): eyebrow "DIAGNÓSTICO 01/02", título serif 72px (horiz. 60px), pergunta 28px, rodapé com subtítulo dourado e círculo 88px #E0C48C com "→". Active: scale .985, fundo #1C3225.
- Rodapé: "Grupo VOW · Consultoria para o varejo" e "Toque em um diagnóstico e leve o número para o seu JBP" (pulse 2s).
- Cabeçalho: no vertical o seletor de orientação mostra só os ícones (retângulo 14×24 / 24×14); no horizontal, ícone + rótulo.

### 2. Lead (Passo 1 de 3)
- Título "Antes de simular, quem é você?" serif 88px (horiz. 76px). Sub: "O diagnóstico vai para o seu e-mail ao final. O CNPJ é opcional, mas preenche o resto sozinho."
- Campos (96px altura, fundo #15261C, borda 2px rgba(243,238,226,.14), raio 20px, texto 34px, labels 24px #9FB0A2): CNPJ (opcional, máscara `00.000.000/0000-00`, ao completar 14 dígitos busca na BrasilAPI; borda verde #7BD389 se achou, laranja #E8906C se erro; status abaixo com bolinha colorida "Buscando dados da empresa…" / "Razão Social · Cidade/UF" / "CNPJ não encontrado. Pode seguir sem ele."), Nome, E-mail (borda #E8906C se inválido), Telefone (máscara `(00) 00000-0000`).
- Validação para liberar "Continuar para a simulação": nome ≥ 3 caracteres, e-mail válido, telefone ≥ 10 dígitos. Botão desabilitado: fundo #243B2E, texto #6F8074.
- Texto LGPD 22px #9FB0A2: "Usamos seus dados só para enviar este diagnóstico e falar com você sobre ele."
- Ao continuar: cria o lead (`status: lead`) e já salva/envia ao webhook.

### 3. Simulação (Passo 2 de 3)
- Título "Dois números bastam." Sub: "Arraste ou toque nos valores. Pode ser aproximado: na próxima tela você marca quais contratos tem."
- Card Faturamento: label 26px, valor serif 72px #E0C48C à direita; slider 0–1000 em **escala logarítmica** de R$ 5 mi a R$ 50 bi (`fat = 5e6 × 10000^(v/1000)` arredondado a 2 algarismos significativos); chips 64px: R$ 50 mi, 300 mi, 1 bi, 5 bi, 20 bi. Padrão R$ 300 mi.
- Card %: "Verba recebida da indústria" (Revenda, 1–8%, passo 0,5, chips 1,5/2/3/4/6, padrão 3) ou "Gasto com serviços e indiretos" (Indiretos, 3–15%, chips 4/6/8/10/12, padrão 8).
- Slider: trilho 12px #243B2E, thumb 64px #E0C48C com anel #0E1B14 8px e borda #E0C48C 2px.
- Rodapé: "Verba estimada no ano" / "Gasto estimado com indiretos no ano" + valor serif 52px; botão "Ver o diagnóstico".

### 4. Resultado (Passo 3 de 3) — AS IS | TO BE
Estrutura inspirada no simulador de verbas já existente no repositório VOW (`docs/simulador-verbas.html`): três cenários, impacto no caixa, linha a linha calibrável, e volta para ajustar antes de enviar.
- Eyebrow "{Produto} · {Empresa ou nome}". Herói: label 28px + número serif 152px (horiz. 120px). Revenda: "Perda anual se a verba não for recomposta" em `#E8906C`, sub com % do lucro e % tributável. Indiretos: "Crédito que passa a voltar por ano" em `#7BD389`.
- **Três cenários** (título "O ANTES E O DEPOIS · TRÊS CENÁRIOS", 3 colunas, cards raio 24px com borda superior de 5px): Cenário 1 "Hoje" (fundo #122019, topo cinza), Cenário 2 "Depois, sem mexer no acordo" / "sem revisar a carteira" (topo #E8906C), Cenário 3 "Depois, com a verba recomposta" / "com a carteira revisada" (topo #E0C48C). Cada card: 3 linhas (Revenda: verba negociada, tributo sobre a verba, custo para a indústria; Indiretos: gasto, crédito recuperado, critério de compra) e número grande serif 40px "Fica com o varejo" / "Custo líquido" com nota. Cenário 2 de Indiretos usa 60% do crédito potencial (crédito parcial).
- Callout com borda esquerda dourada (rgba(224,196,140,.08)): Revenda: "Leia a linha custo para a indústria: no cenário 3 a verba sobe, mas a indústria credita integralmente o imposto que paga…"; Indiretos: "Duas propostas com o mesmo preço não são mais a mesma proposta…".
- Botão outline **"← Voltar e ajustar os números"** (80px) → volta à Simulação preservando a calibração (ativas/pesos); ao ver o diagnóstico de novo o motor reaplica.
- **O que muda no caixa** (`caixaRevenda` / `caixaIndiretos` em motor.js, custo de capital 14% a.a.): 4 tiles 2×2 (label 17px uppercase, valor serif 40px, nota 19px; 4º tile em #1C3225 dourado). Revenda: tributo a recolher por mês (= recomposição/12), defasagem (prazo de receber − 25 dias), capital de giro imobilizado, custo anual do carrego; chips "Prazo para receber a verba: 30 / 45 / 60 / 90 dias" (padrão 45). Indiretos: crédito acumulado por mês, prazo de ressarcimento, saldo preso na fila, custo anual do carrego; chips "Prazo de ressarcimento: 30 / 60 / 180 dias" (padrão 60, faixas da LC 214 conforme conformidade).
- **Linha a linha**: título serif 52px + legenda ("valor que passa a tributar" / "crédito potencial por ano") e legenda de barras (colorida = passa a tributar / volta como crédito; #3A4F42 = fora da incidência / sem crédito). Texto: "Toque nas linhas que **você não tem** para tirá-las da conta e use **− +** para calibrar cada uma. Cada linha é independente: ajustar uma não mexe nas outras." Faixa-resumo: "Todas as N famílias na conta." · "Referência inicial: R$ X · Total calibrado: R$ Y" + botão "Voltar à referência" quando calibrado.
- Cada família é uma linha clicável (raio 20px, padding 24/28): checkbox 44px (marcado: fundo e borda #E0C48C com ✓), nome 30px/500, tag 18px (Revenda: Tributa #E8906C / Não tributa #7BD389 / Depende do documento #E0C48C; Indiretos: Crédito integral #7BD389 / Crédito alto / Depende do regime #E0C48C; desmarcada: "Não tenho" #9FB0A2), valor serif 36px à direita e abaixo dele os controles **− / +** (56px redondos) com "P% da verba · R$ V"; barra 12px (largura relativa ao maior valor; parte colorida proporcional a trib/cred); "hoje → o que muda" em 21px. Desmarcada: opacity .45, fundo transparente, valor "—", sem controles.
- **Regra de calibração**: o faturamento × % informado é a **referência** (`baseRef`). Cada família tem um peso em % dessa referência (mix padrão soma 100). − / + move 1 p.p. **apenas naquela família** (mínimo 1%); as demais não mudam e o total passa a ser a soma das linhas ativas (`base`). Desmarcar retira a linha do total. Cada toque recalcula herói, cenários, caixa, barras e QR, e salva o lead (`resultado.ativas`, `resultado.pesos`). Não permitir desmarcar a última linha.
- Indiretos: nota tracejada sobre serviços financeiros fora do cálculo.
- **Como ficar em conformidade**: frase de ordem ("Classificar antes de renegociar…" / "Classificar antes de sentar…") + 5 etapas numeradas (01–05 serif 40px dourado, título 28px, descrição 22px) + chips de mecanismos ("Gate de pagamento no ERP", "Fila de exceção com responsável e prazo", "Revisão em março e setembro").
- **Leve o diagnóstico com você**: card "AO CONCLUIR · Diagnóstico completo por e-mail, já com as linhas que você marcou" com o e-mail; card com **QR code 180px** (URL da página de diagnóstico com `#d=` base64 de `{id,p,f,pc,a,n,e,s}`) e "Aponte a câmera para abrir este diagnóstico no celular".
- Botão toggle "Quero conversar com a VOW sobre este diagnóstico" → estado "✓ Conversa com a VOW solicitada. Entramos em contato." (borda/texto #7BD389, fundo rgba(123,211,137,.14)); grava `entregas.agendar`.
- Disclaimer 19px #6F8074 (alíquota 26,5%, mix padrão, margem 2%, a validar com o fiscal VOW). Botão primário **"Concluir e enviar"** → dispara o e-mail e vai para Fim.

### 5. Fim
- Eyebrow "DIAGNÓSTICO {enviado|a caminho|registrado}". "Obrigado, {Primeiro nome}." serif 112px. Frase (varia se pediu conversa). Linha de status com bolinha: "Enviando para … " (#E0C48C) / "Enviado para … às HH:MM" (#7BD389) / "Registrado para …" (modo demo) / "Não conseguimos enviar agora (…). A VOW reenvia pela plataforma." (#E8906C). "Assunto: …".
- Card **"Falta a outra metade"** (borda dourada) quando o outro diagnóstico ainda não foi feito: nome do outro produto serif 56px, frase explicativa, botão "Fazer o diagnóstico de {Indiretos|Revenda} com os mesmos dados" → pula o cadastro e vai direto à Simulação com o mesmo faturamento; o resultado entra em `simulacoes` do mesmo lead e o segundo e-mail menciona o primeiro.
- Quando os dois foram feitos: card "Você fez os dois diagnósticos. Os dois estão no seu e-mail." Botão "Encerrar". "O totem reinicia em Ns".

### Plataforma VOW Leads (desktop, tema claro)
- Grid `248px 1fr`. Sidebar `#0E1B14` com abas Leads / Disparos / Configurações (badge com contagem), card "ABRAS 2026 · Totens sincronizando ao vivo" e link "Abrir totem →". Fundo `#EFE9DB`, cards `#FBF8F1` borda rgba(14,27,20,.08) raio 14px. Fonte base 14px; títulos serif 40px.
- **Leads**: KPIs (Leads capturados / hoje; Por diagnóstico R·I; Pediram conversa e %; Valor em jogo somado e nº de diagnósticos enviados); busca + filtros Todos/Revenda/Indiretos; tabela `64px 1.6fr 1.4fr 110px 120px 130px 120px 90px` (Hora, Contato com e-mail, Empresa ou "Sem CNPJ", Diagnóstico com tag colorida, Faturamento, Impacto −R$ vermelho #9A4A2C ou +R$ verde #1F6B33, E-mail com status Aguardando/Enviando/Enviado/Registrado/Falhou, Conversa Pediu/Contatado/—). Clique abre painel de detalhe 400px sticky: empresa (CNPJ, cidade, porte), inputs, herói escuro com o número, 4 linhas do resultado (+ linha do outro diagnóstico se fez os dois), entregas automáticas, prévia do e-mail (assunto + corpo), botões "Reenviar e-mail" (chama o Resend) e "Marcar como contatado".
- **Disparos**: lista de e-mails (hora, assunto, para, status) e fila comercial (quem pediu conversa, telefone, produto, impacto, Aguardando contato/Contatado).
- **Configurações**: Webhook de leads; **Envio de e-mail · Resend via Render** (endpoint, remetente, responder-para, e-mail de teste + botão "Enviar e-mail de teste", link "Ver modelo"); premissas do motor; exportar CSV (`;` separado, BOM UTF-8, colunas id, data, hora, produto, nome, email, telefone, cnpj, empresa, municipio, uf, faturamento, pct, impacto, email_enviado, pediu_conversa, status).
- Botão "Exportar CSV" no topo e nas configurações.

### Diagnóstico VOW (página do QR, mobile ≤ 520px)
Mesmo conteúdo do resultado do totem, em coluna única: herói 64px, premissas (faturamento, %, "X de N famílias"), Hoje/Depois, linha a linha, 5 etapas, botão "Conversar com a VOW sobre este diagnóstico" (`mailto:` ou WhatsApp via prop `linkContato`), disclaimer. Lê `location.hash` (`#d=` base64 JSON) e recalcula localmente com `motor.js`; sem hash mostra aviso. Hospedar em URL pública e configurar essa URL na prop `baseUrlDiagnostico` do totem.

### E-mail de diagnóstico (`email.js` → `emailHtml(lead, {linkDiagnostico, linkContato, linkDescadastro})`)
HTML de e-mail com tabelas, 600px, fontes seguras (Georgia / Helvetica): header escuro com VOW, produto, herói (label, número em #E8906C ou #7BD389, sub, premissas), colunas Hoje/Depois, saudação com o primeiro nome, linha a linha (só famílias ativas), 5 etapas, bloco "Você também fez…" ou "Falta a outra metade", CTA "Conversar com a VOW sobre este diagnóstico", link "Abrir o diagnóstico no navegador", rodapé com disclaimer e descadastro. Assunto: `Diagnóstico VOW · R$ X em jogo nas verbas com a indústria` / `Diagnóstico VOW · R$ X de crédito que passa a voltar`. `emailText()` gera a versão texto.

## Interactions & Behavior
- Fluxo: Home → Lead → Simulação → Resultado → Fim (→ Simulação do outro produto → Resultado → Fim). "Recomeçar" a qualquer momento limpa tudo.
- O lead é salvo em 4 momentos: ao continuar do cadastro, ao ver o diagnóstico, a cada toque no linha a linha / conversa, e ao concluir (com status do e-mail). Cada save também faz `POST webhookUrl` (JSON completo do lead, `mode: no-cors`).
- Envio de e-mail: `POST {endpoint}` com `{to, from, reply_to, subject, html, text, tags, leadId}`; resposta `{ok, id}`; erro → `entregas.email.status = 'erro'` e a plataforma permite reenviar. Sem endpoint configurado, status `modo: demo`.
- QR: `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=12&bgcolor=0E1B14&color=F3EEE2&data=…` — trocar por geração local (ex.: lib `qrcode`) em produção.
- Estados: botão desabilitado, CNPJ buscando/ok/erro, e-mail enviando/enviado/erro, check/uncheck de famílias, toggle de conversa, contador de reinício.

## State Management
Totem: `screen, produto, cnpj, empresa, buscando, cnpjErro, nome, email, telefone, fatSlider, pct, ativas, resultado, lead, agendar, segundos, caixa{dReceb,prazo}, orient`. Plataforma: `leads, aba, filtro, busca, selId, webhook, rs{endpoint,from,replyTo}, rsTeste, rsMsg`. Chaves de localStorage: `vow_abras_leads`, `vow_abras_webhook`, `vow_abras_resend`, `vow_abras_orientacao`.

## Backend no Render (`server/`, `render.yaml`)
Web Service Node ≥ 18 sem dependências. `GET /` health; `POST /send` valida e repassa ao Resend (`https://api.resend.com/emails`) com `Authorization: Bearer RESEND_API_KEY`. Env: `RESEND_API_KEY` (obrigatória), `RESEND_FROM`, `RESEND_REPLY_TO`, `ALLOW_ORIGIN`. Domínio do remetente precisa estar verificado no Resend. Evoluções recomendadas: endpoint `POST /leads` para persistir em Postgres (substituindo o localStorage), `GET /leads` para a plataforma, rate limit simples, e log dos ids do Resend.

## Design Tokens
- Cores escuras (totem, página QR): fundo `#0E1B14`, card `#15261C`, card destaque `#1C3225`, trilho `#243B2E`, texto `#F3EEE2`, texto 2 `#C9D2C8`, texto 3 `#9FB0A2`, mudo `#6F8074`, dourado `#E0C48C`, perda `#E8906C`, ganho `#7BD389`, bordas `rgba(243,238,226,0.10/0.14/0.18/0.22)`.
- Cores claras (plataforma, e-mail): fundo `#EFE9DB`, card `#FBF8F1`, tinta `#0E1B14`, tinta 2 `#5C6A5F`, mudo `#8A9389`, dourado escuro `#B8934A`, vermelho `#9A4A2C`, verde `#1F6B33`/`#2F8A47`, borda `rgba(14,27,20,0.08/0.10/0.14)`.
- Tipografia: **IBM Plex Sans** 400/500/600 (UI) e **Instrument Serif** 400 (+ itálico) para títulos e números. Google Fonts. Totem: 112/88/72/56/52/34/30/28/24/22/21/19px. Plataforma: 40/36/28/15/14/13/12/11px. E-mail: Georgia/Helvetica.
- Raios: 32 (cards totem), 28, 24 (botões), 20 (inputs/linhas), 16, 14 (plataforma), 12, 10. Pílulas: 50%.
- Sem sombras; profundidade por contraste de fundo e bordas de 1px.

## Assets
Nenhuma imagem. Fontes via Google Fonts. Logo VOW é texto (Instrument Serif) — substituir pelo logotipo oficial se houver.

## Files
- `Totem VOW ABRAS.dc.html` — totem (5 telas, vertical/horizontal).
- `Plataforma VOW Leads.dc.html` — plataforma interna.
- `Diagnóstico VOW.dc.html` — página aberta pelo QR.
- `Email Diagnóstico.dc.html` — preview do e-mail (usa `email.js`).
- `motor.js` — produtos, famílias, copy, motor de cálculo, formatadores, CNPJ, persistência, link do QR, envio.
- `email.js` — HTML/texto do e-mail.
- `server/index.js`, `server/package.json`, `render.yaml` — serviço de envio no Render.
- `uploads/*.md` — briefs de conteúdo (fonte da copy).
- Referência de produto existente no repositório VOW: `docs/simulador-verbas.html` (simulador de verbas; a tela de resultado do totem segue sua estrutura de três cenários + caixa).
- Os `.dc.html` dependem de `support.js` (runtime do protótipo) — ignorar na implementação.

## Pendências (não são bugs, são decisões abertas)
1. Validação das premissas (alíquota, mix por família, crédito por regime) com o time fiscal da VOW.
2. Persistência real dos leads (Postgres no Render ou Supabase) e sincronização offline do totem.
3. Base legal / texto LGPD final e link de descadastro real no e-mail.
4. URL pública da página de diagnóstico (para o QR) e domínio verificado no Resend.
