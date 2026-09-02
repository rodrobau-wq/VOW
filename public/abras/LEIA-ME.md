# public/abras — protótipo de design

Cópia do pacote `Simulador AS IS TO BE Abras.zip`, exportado do Claude Design.
Servido em produção: `/totem` → `totem.dc.html`.

## Ao substituir por uma exportação nova

Reponha os arquivos e **reinsira o `<base href="/abras/">`** logo depois do
`<head>` de cada `.dc.html`. Sem ele o `./support.js` do protótipo resolve
para `/support.js` e a tela abre em branco, porque a rota é `/totem` e os
assets vivem em `/abras/`.

## O que ainda não está integrado

Este protótipo tem **motor próprio** (`abras/motor.js`, API `PRODUTOS` e
`simular()`), diferente do motor da casa na raiz (`diagnosticoRevenda`,
`diagnosticoIndiretos`). São duas aritméticas no mesmo produto — a mesma
duplicação que a landing tinha e que foi removida. Resolver na portabilidade.

E ele grava lead em `localStorage`, não em `POST /api/lead`. Enquanto isso:

- `/totem`    protótipo de design, sem gravação no servidor
- `/totem-v1` totem codado, grava lead e marca a origem (`?e=abras`)
