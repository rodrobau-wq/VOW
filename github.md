repo: rodrobau-wq/VOW
branch: main

## Last sync
date: 2026-09-02

### Updated in this project
- Projeto implementado a partir dos briefs em `docs/`: motor, e-mail, servidor e as duas telas.
- Diagnóstico de Revenda validado contra os quatro números do brief (teste automatizado).
- Diagnóstico de Indiretos derivado das descrições qualitativas — pendente de revisão fiscal.
- Blueprint do Render pronto, com disco para os leads sobreviverem ao redeploy.

## Screen map
| Screen | Repo files |
|---|---|
| Totem VOW ABRAS | `public/index.html` · `motor.js` |
| Plataforma VOW Leads | `public/leads.html` · `server/index.js` |
| Diagnóstico VOW (e-mail e página do QR) | `email.js` · rota `GET /d/:id` |

## Fontes
| Origem | Vira |
|---|---|
| `docs/ABRAS - Contrato de Revenda.md` | `diagnosticoRevenda()` em `motor.js` |
| `docs/ABRAS - Contrato de Indiretos.md` | `diagnosticoIndiretos()` em `motor.js` |
