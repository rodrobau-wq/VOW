// Gerador de QR Code (modo byte, correção M). Porte compacto do algoritmo de
// referência de Nayuki (MIT). Sem dependência externa: o pavilhão não tem rede
// garantida e a marca não carrega script de terceiros.
const ECC_M = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28]
const BLK_M = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49]

const rawModules = (v) => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36 } return r }
const dataCodewords = (v) => Math.floor(rawModules(v) / 8) - ECC_M[v] * BLK_M[v]
const bit = (x, i) => ((x >>> i) & 1) !== 0

const gfMul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x } return z }
function rsDivisor(deg) { const r = Array(deg).fill(0); r[deg - 1] = 1; let root = 1
  for (let i = 0; i < deg; i++) { for (let j = 0; j < deg; j++) { r[j] = gfMul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1] } root = gfMul(root, 2) } return r }
function rsRemainder(data, div) { const r = Array(div.length).fill(0)
  for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gfMul(c, f) }) } return r }

export function qrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(text))
  let ver = 1
  for (;; ver++) { if (ver > 40) throw new Error('texto longo demais para QR')
    const cc = ver < 10 ? 8 : 16; if (4 + cc + 8 * bytes.length <= dataCodewords(ver) * 8) break }
  const size = ver * 4 + 17, cap = dataCodewords(ver) * 8
  const bits = []; const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1) }
  push(4, 4); push(bytes.length, ver < 10 ? 8 : 16); bytes.forEach((b) => push(b, 8))
  push(0, Math.min(4, cap - bits.length)); push(0, (8 - bits.length % 8) % 8)
  for (let p = 0xec; bits.length < cap; p ^= 0xec ^ 0x11) push(p, 8)
  const data = []; bits.forEach((b, i) => { data[i >>> 3] = (data[i >>> 3] || 0) | (b << (7 - (i & 7))) })

  // Blocos + Reed-Solomon, intercalados
  const nb = BLK_M[ver], el = ECC_M[ver], raw = Math.floor(rawModules(ver) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb)
  const div = rsDivisor(el), blocks = []
  for (let i = 0, k = 0; i < nb; i++) { const dl = shortLen - el + (i < nShort ? 0 : 1); const dat = data.slice(k, k + dl); k += dl
    const ecc = rsRemainder(dat, div); if (i < nShort) dat.push(0); blocks.push(dat.concat(ecc)) }
  const cw = []; for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - el || j >= nShort) cw.push(b[i]) })

  const m = Array.from({ length: size }, () => Array(size).fill(false)), fn = Array.from({ length: size }, () => Array(size).fill(false))
  const set = (x, y, v) => { m[y][x] = v; fn[y][x] = true }
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0) }
  const finder = (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < size && yy < size) set(xx, yy, Math.max(Math.abs(dx), Math.abs(dy)) !== 2 && Math.max(Math.abs(dx), Math.abs(dy)) !== 4) } }
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4)
  let ap = []; if (ver > 1) { const n = Math.floor(ver / 7) + 2, step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2; ap = [6]; for (let p = size - 7; ap.length < n; p -= step) ap.splice(1, 0, p) }
  const na = ap.length
  for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) { if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1) }
  const format = (mask) => { const d = mask; let rem = d; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537); const f = ((d << 10) | rem) ^ 0x5412
    for (let i = 0; i <= 5; i++) set(8, i, bit(f, i)); set(8, 7, bit(f, 6)); set(8, 8, bit(f, 7)); set(7, 8, bit(f, 8)); for (let i = 9; i < 15; i++) set(14 - i, 8, bit(f, i))
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(f, i)); for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(f, i)); set(8, size - 8, true) }
  format(0)
  if (ver >= 7) { let rem = ver; for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25); const v = (ver << 12) | rem
    for (let i = 0; i < 18; i++) { const a = size - 11 + i % 3, b = Math.floor(i / 3); set(a, b, bit(v, i)); set(b, a, bit(v, i)) } }
  // Dados em zigue-zague
  let i = 0; for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) { const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert
      if (!fn[y][x] && i < cw.length * 8) { m[y][x] = bit(cw[i >>> 3], 7 - (i & 7)); i++ } } }
  const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0, (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0]
  const apply = (k) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[k](x, y)) m[y][x] = !m[y][x] }
  const penalty = () => { let p = 0
    const runs = (get) => { for (let a = 0; a < size; a++) { let run = 0, prev = null; for (let b = 0; b < size; b++) { const c = get(a, b); if (c === prev) { run++; if (run === 5) p += 3; else if (run > 5) p++ } else { prev = c; run = 1 } } } }
    runs((a, b) => m[a][b]); runs((a, b) => m[b][a])
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3 }
    let dark = 0; m.forEach((r) => r.forEach((c) => { if (c) dark++ })); const total = size * size
    p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10; return p }
  let best = 0, bestP = Infinity
  for (let k = 0; k < 8; k++) { apply(k); format(k); const p = penalty(); if (p < bestP) { bestP = p; best = k } apply(k) }
  apply(best); format(best)
  return m
}

/** Caminho SVG do QR (1 unidade por módulo). Use com viewBox="0 0 size size". */
export function qrPath(text) {
  const m = qrMatrix(text); let d = ''
  m.forEach((row, y) => row.forEach((c, x) => { if (c) d += `M${x} ${y}h1v1h-1z` }))
  return { d, size: m.length }
}
