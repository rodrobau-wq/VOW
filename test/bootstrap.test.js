/**
 * O primeiro acesso é a única porta que se abre sozinha — e por isso a que
 * mais precisa de trava.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
delete process.env.DATABASE_URL
const store = await import('../store.js')
const { primeiroAcesso } = await import('../bootstrap.js')
const { conferirSenha } = await import('../auth.js')


test('sem ADMIN_EMAIL não cria nada', async () => {
  delete process.env.ADMIN_EMAIL
  const r = await primeiroAcesso()
  assert.equal(r.criado, false)
  assert.equal((await store.listar('usuario')).length, 0)
})

test('cria o admin quando o banco está vazio', async () => {
  process.env.ADMIN_EMAIL = 'chefe@grupovow.com.br'
  process.env.ADMIN_SENHA = 'senha-do-piloto'
  const r = await primeiroAcesso()
  assert.equal(r.criado, true)

  const u = await store.achar('usuario', (x) => x.email === 'chefe@grupovow.com.br')
  assert.equal(u.papel, 'vow')
  assert.ok(conferirSenha('senha-do-piloto', u.senhaHash))
  // A senha nunca é gravada em claro.
  assert.ok(!JSON.stringify(u).includes('senha-do-piloto'))
})

test('com usuário existente vira no-op — não troca senha nem cria segundo acesso', async () => {
  process.env.ADMIN_EMAIL = 'invasor@exemplo.com'
  process.env.ADMIN_SENHA = 'outra-senha'
  const r = await primeiroAcesso()
  assert.equal(r.criado, false)

  const todos = await store.listar('usuario')
  assert.equal(todos.length, 1)
  assert.equal(todos[0].email, 'chefe@grupovow.com.br')
  // A senha do admin original continua valendo.
  assert.ok(conferirSenha('senha-do-piloto', todos[0].senhaHash))
})

test('a rede da própria VOW é criada quando não há nenhuma', async () => {
  const { garantirRedeVow } = await import('../bootstrap.js')
  const r = await garantirRedeVow()
  assert.equal(r.criada, true)

  const [rede] = await store.listar('rede')
  assert.equal(rede.razao, 'Grupo VOW')
  // `interna` separa a casa dos clientes atendidos: relatório de carteira
  // não pode somar a própria VOW junto com as redes.
  assert.equal(rede.interna, true)
  assert.ok(rede.premissas.aliquota > 0)
})

test('com rede existente vira no-op — não duplica a casa a cada deploy', async () => {
  const { garantirRedeVow } = await import('../bootstrap.js')
  const r = await garantirRedeVow()
  assert.equal(r.criada, false)
  assert.equal((await store.listar('rede')).length, 1)
})
