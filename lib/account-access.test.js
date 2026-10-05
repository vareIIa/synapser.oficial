import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
let query = '';
const sql = async (parts) => {
  query = parts.join('?');
  return [{ id: 'fixture-user', plan: 'free', role: 'admin' }];
};
mock.module('./db.js', { namedExports: { db: async () => sql } });
const { currentUser } = await import('./auth.js');
test('currentUser returns the database-owned Admin role without changing the plan', async () => {
  const result = await currentUser({ headers: { authorization: 'Bearer synthetic-test-session' } });
  assert.match(query, /case\s+when\s+u\.role\s*=\s*'admin'\s+then\s+'admin'\s+else\s+'user'\s+end\s+as\s+role/i);
  assert.equal(result.role, 'admin');
  assert.equal(result.plan, 'free');
});
test('missing session never exposes account access', async () => {
  assert.equal(await currentUser({ headers: {} }), null);
});
