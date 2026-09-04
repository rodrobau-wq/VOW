/**
 * Um caminho de entrada só.
 *
 * Landing, site e totem tinham três comportamentos diferentes no mesmo link
 * "CRM": um ia direto para o funil, outro abria um modal que não chamava
 * nada. Este teste existe para que voltem a divergir só de propósito.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const ler = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8')
const PAGINAS = ['../public/site.html']

test('as páginas públicas abrem o modal, não pulam para o funil', () => {
  // O totem tem o modal do Claude Design, com o mesmo desenho e as mesmas
  // rotas — por isso ele não entra nesta lista, e sim no teste seguinte.
  for (const f of PAGINAS) {
    const html = ler(f)
    assert.match(html, /data-login-crm/, `${f} não marca o link do CRM`)
    assert.match(html, /login-crm\.js/, `${f} não carrega o modal`)
    // O link direto para o funil era o atalho que criava a divergência.
    assert.doesNotMatch(html, /href="\/app\/pipeline"/, `${f} ainda pula o login`)
  }
})

test('o modal e o totem apontam para o mesmo lugar depois de entrar', () => {
  const modal = ler('../public/login-crm.js')
  const totem = ler('../public/abras/abras.dc.html')
  // A guarda de sessão está montada em /app: fora dela o CRM ficaria aberto.
  assert.match(modal, /const DESTINO = '\/app\/crm'/)
  assert.match(totem, /CRM_URL = '\/app\/crm'/)
})

test('o modal chama as três rotas reais', () => {
  const modal = ler('../public/login-crm.js')
  for (const rota of ['/api/app/entrar', '/api/app/senha/esqueci', '/api/app/cadastro']) {
    assert.ok(modal.includes(rota), `o modal não chama ${rota}`)
  }
})

test('a senha do protótipo não vive fora do caminho sem servidor', () => {
  // 'vow2027' só pode existir no ramo que roda quando não há API — o editor
  // do Claude Design. No servidor a senha é hash, e no modal novo nem isso.
  assert.doesNotMatch(ler('../public/login-crm.js'), /vow2027/)
  for (const f of ['../server/app.js', '../server/index.js', '../auth.js', '../bootstrap.js']) {
    assert.doesNotMatch(ler(f), /vow2027/, `${f} carrega a senha do protótipo`)
  }
})
