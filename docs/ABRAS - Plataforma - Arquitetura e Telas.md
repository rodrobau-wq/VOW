# ABRAS · Plataforma — arquitetura e mapa de telas

**Data:** 02/09/2026 · Grupo VOW × Rodrigo Bauer
**Estado:** landing codada e no ar em `/`; totem movido para `/totem`. Este documento é o mapa do que falta e o brief para refinar no Claude Design.

---

## 1. O que já existe

O backend está pronto e é bom. Não precisa ser refeito — precisa crescer.

| Peça | Onde | O que faz |
|---|---|---|
| `motor.js` | raiz | A aritmética dos dois diagnósticos. Isomórfico: roda no Node e no browser, sem build |
| `email.js` | raiz | Monta o HTML do diagnóstico e dispara pelo Resend |
| `server/index.js` | — | Express: `/api/simular`, `/api/lead`, `/api/leads`, `/api/leads.csv`, `/d/:id`, `/healthz` |
| `public/landing.html` | `/` | **Novo.** Landing pública com os dois diagnósticos ao vivo |
| `public/index.html` | `/totem` | Kiosk da feira |
| `public/leads.html` | `/leads` | Plataforma de leads, protegida por Basic Auth |

**O que a landing reaproveita sem duplicar nada:** `POST /api/simular` calcula sem gravar; `POST /api/lead` grava, dispara o e-mail e devolve o QR. A landing chama os dois. Uma mudança de premissa no `motor.js` muda totem, landing, e-mail e plataforma ao mesmo tempo.

## 2. As três camadas

O erro a evitar é tratar tudo como um app só. São três, com públicos e ciclos de vida diferentes:

| Camada | Público | Autenticação | Ciclo |
|---|---|---|---|
| **Público** — landing, diagnósticos, totem | Prospect | Nenhuma | Segundos. Objetivo: um lead |
| **Comercial** — leads, disparos, configurações | Time VOW | Basic Auth hoje; login próprio depois | Diário |
| **SaaS** — os três sistemas | Cliente pagante | Login, conta, papéis | Anos |

A camada pública existe hoje. A comercial existe parcialmente. **A camada SaaS não existe** — é o que falta construir, e é onde o mapa de telas abaixo mora.

## 3. Mapa de telas do SaaS

### 3.1 Entrada

| Tela | Rota | O que faz |
|---|---|---|
| Login | `/app/entrar` | E-mail e senha, com link mágico como alternativa |
| Escolher rede | `/app/redes` | Só aparece quando o usuário atende mais de uma rede — consultor da VOW, ou grupo com várias bandeiras |
| Onboarding | `/app/inicio` | Três passos: conectar o ERP ou subir o arquivo, confirmar o CNPJ, escolher por onde começar |

### 3.2 Painel

| Tela | Rota | O que mostra |
|---|---|---|
| **Painel** | `/app` | Quatro números: crédito em risco, cobertura contratual, itens saneados, saldo credor na fila. Mais a fila de exceções do dia e o que mudou desde ontem |

O painel é a tela que justifica a assinatura. Ele responde "o que preciso olhar hoje", não "quanto de dado vocês têm".

### 3.3 Sistema 1 · Fornecedores

| Tela | Rota | O que faz |
|---|---|---|
| Carteira | `/app/fornecedores` | Lista com semáforo, classe de crédito, materialidade e exposição. Filtros por faixa, regime e categoria |
| Ficha | `/app/fornecedores/:cnpj` | Os sete blocos do Raio-X, o score decomposto e o histórico de verificações |
| Mapa da carteira | `/app/fornecedores/mapa` | Matriz risco × classe de crédito, tamanho pela exposição de imposto |
| Exceções | `/app/fornecedores/exceçoes` | Fila em formato fato-causa-ação, com responsável e prazo |
| Portal do fornecedor | `/f/:token` | **Externo, sem login.** O fornecedor vê a pendência, declara o regime e envia o comprovante |

O portal do fornecedor é a peça que resolve o ponto cego: a opção do Simples não é consultável por terceiros, então a resposta vem declarada por quem a fez.

### 3.4 Sistema 2 · Contratos

| Tela | Rota | O que faz |
|---|---|---|
| Cobertura | `/app/contratos` | Todo CNPJ pago sem contrato, priorizado por valor. É a tela que revela o buraco |
| Contrato | `/app/contratos/:id` | Score, cláusulas presentes e ausentes, wizard de adequação |
| Minutas | `/app/contratos/minutas` | Modelos VOW por tipo e regime |
| Verbas | `/app/contratos/verbas` | A matriz de tratamento por linha do acordo, com o cálculo de recomposição |
| Aprovações | `/app/contratos/aprovacoes` | Alçadas fiscal e jurídica em paralelo, com ressalva |

### 3.5 Sistema 3 · Itens

| Tela | Rota | O que faz |
|---|---|---|
| Base | `/app/itens` | Percentual saneado, divergências, ganho identificado |
| Item | `/app/itens/:sku` | Classificação atual e proposta, com embasamento legal e a evidência |
| Fila de correção | `/app/itens/fila` | Priorizada por impacto, não por ordem alfabética |
| Book | `/app/itens/book` | O relatório de entrega, gerado e versionado |

### 3.6 Transversais

| Tela | Rota | O que faz |
|---|---|---|
| Diagnósticos | `/app/diagnosticos` | Os mesmos dois da landing, agora sobre dados reais em vez de premissas |
| Relatórios | `/app/relatorios` | O mensal que renova o contrato: crédito preservado, rupturas evitadas, horas liberadas |
| Integrações | `/app/integracoes` | ERP, webhook, chaves de API |
| Conta e equipe | `/app/conta` | Papéis: comprador, fiscal, jurídico, suprimentos, diretoria, consultor VOW |

## 4. Modelo de dados

Sete entidades bastam para o primeiro corte:

```
rede        (tenant)  → cnpj, razão, porte, plano, premissas próprias
usuario               → nome, email, papel, redes[]
fornecedor            → cnpj, regime, regime_declarado_em, score, classe_credito
verificacao           → fornecedor, camada, fonte, resultado, ts   ← imutável, é a defesa
item                  → sku, ncm, cclasstrib, aliquota_efetiva, status, evidencia
contrato              → fornecedor, tipo, vigencia, score, clausulas[], arquivo
excecao               → origem, fato, causa, acao, responsavel, prazo, status
```

Duas decisões que valem registrar: `verificacao` **nunca é atualizada, só inserida** — é o log de diligência e a defesa em fiscalização; e `rede` carrega premissas próprias, porque cada cliente vai querer a alíquota e o mix dele, não o padrão.

O JSON em arquivo aguenta a feira. **Trocar por Postgres quando o primeiro cliente pagante entrar** — o comentário no `server/index.js` já diz isso, e ele está certo.

## 5. Ordem de construção

| Fase | O que | Por quê |
|---|---|---|
| **Agora** | Landing no ar, totem em `/totem` | Feito. Topo de funil funcionando |
| **1** | Auth, tenant e o painel com dados carregados de arquivo | Sem conta não há SaaS. Painel primeiro porque é o que se demonstra |
| **2** | Sistema 1 completo, incluindo o portal do fornecedor | É a base; e o portal resolve o ponto cego do regime |
| **3** | Postgres, no primeiro cliente pagante | Não antes: o arquivo aguenta piloto |
| **4** | Sistema 2, começando pela tela de cobertura | Cobertura é o que vende o resto |
| **5** | Sistema 3, com o protótipo existente portado | Já existe fora do repositório; portar é integração, não construção |

Fase 1 e 2 dão um produto vendável. As demais são expansão.

## 6. Brief para o Claude Design

O que levar, por tela, para o refino visual:

**Sistema de design.** A linguagem já está definida nas quatro telas que você desenhou: fundo `#0E1B14`, superfícies `#15261C` e `#1C3225`, texto `#F3EEE2`, dourado `#E0C48C`, risco `#E8906C`, sucesso `#7BD389`, papel `#EFE9DB` para as telas internas claras. IBM Plex Sans na interface, Instrument Serif nos números grandes e nos títulos. Raios generosos, de 14 a 32px. Vale extrair isso num arquivo de tokens antes de desenhar mais telas — hoje está repetido inline em cada `.dc.html`.

**Contraste entre camadas.** Público é escuro e cinematográfico; plataforma interna é clara, sobre papel, porque é ferramenta de trabalho de oito horas. A `Plataforma VOW Leads` já acertou isso. Manter a regra.

**As telas que mais precisam de desenho, em ordem:**

1. **Painel** — quatro números e uma fila. É a tela mais difícil de acertar e a que mais vende.
2. **Ficha do fornecedor** — sete blocos e um score decomposto num espaço que caiba na cabeça de um comprador com pressa.
3. **Mapa da carteira** — a matriz risco × crédito. É o "uau" da demonstração.
4. **Cobertura contratual** — uma lista longa que precisa dar vontade de agir, não de fechar a aba.
5. **Portal do fornecedor** — a única tela externa. Tem que funcionar no celular de um vendedor de câmara fria, num sinal ruim.

**O que não precisa de desenho novo:** totem, diagnóstico mobile e e-mail estão prontos. A landing precisa de uma passada de refino, não de redesenho.

## 7. Pendências

1. Definir se a autenticação é própria ou por provedor — muda a fase 1 inteira.
2. Decidir se o consultor da VOW acessa a conta do cliente com papel próprio, e o que ele enxerga.
3. Definir o gatilho de troca do arquivo JSON por Postgres — sugestão: o primeiro contrato assinado.
4. Extrair os tokens de design num arquivo único antes de desenhar as telas do SaaS.
5. Corrigir a referência no `motor.js`: ele cita `ABRAS - Contrato de Revenda.md` como fonte do diagnóstico de revenda, mas o cálculo é de verbas — a fonte certa agora é `ABRAS - Verbas Comerciais.md`.

---

## Glossário

| Termo | Significado |
|---|---|
| Basic Auth | Autenticação simples por usuário e senha no cabeçalho HTTP |
| Camada pública | Landing, diagnósticos e totem — sem login, feita para gerar lead |
| Isomórfico | Código que roda igual no servidor e no browser |
| Multi-tenant | Uma instalação que atende várias redes com dados isolados |
| Portal do fornecedor | Tela externa onde o fornecedor declara o próprio regime |
| Tenant | Cada rede cliente dentro da plataforma |
| Tokens de design | Arquivo único com cores, tipografia e espaçamentos reutilizados |
