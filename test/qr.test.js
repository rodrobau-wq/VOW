/**
 * O QR impresso não pode virar lixo quando o destino mudar.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { qrMatrix, qrPath } from '../qr.js'

test('gera o QR do endereço curto, não do destino', () => {
  // É esta a regra: o código carrega /q/abras. Trocar para onde ele leva não
  // invalida o cartaz já impresso.
  const curto = 'https://vow-abras.onrender.com/q/abras'
  const m = qrMatrix(curto)
  assert.ok(Array.isArray(m) && m.length >= 21)
  assert.equal(m.length, m[0].length, 'o QR precisa ser quadrado')
  // Os três marcadores de posição ficam nos cantos.
  const n = m.length
  for (const [y, x] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    assert.equal(m[y][x], true, `faltou o marcador em ${y},${x}`)
  }
})

test('destinos diferentes geram QR diferentes', () => {
  const a = qrPath('https://vow-abras.onrender.com/q/abras')
  const b = qrPath('https://vow-abras.onrender.com/q/outro')
  assert.notEqual(a.d, b.d)
  assert.ok(a.d.startsWith('M'))
})

test('o caminho SVG cobre a matriz inteira', () => {
  const { d, size } = qrPath('teste')
  const m = qrMatrix('teste')
  const escuros = m.flat().filter(Boolean).length
  assert.equal(size, m.length)
  // Um "M...z" por módulo escuro.
  assert.equal((d.match(/z/g) || []).length, escuros)
})

test('texto longo demais é recusado em vez de gerar QR ilegível', () => {
  assert.throws(() => qrMatrix('x'.repeat(5000)), /longo demais/)
})
