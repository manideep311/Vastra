const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { startDb, stopDb, clearDb, createUser } = require('./helpers');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

describe('role isolation', () => {
  test('protected routes reject requests without a token', async () => {
    await request(app).get('/api/cart').expect(401);
    await request(app).get('/api/orders').expect(401);
    await request(app).get('/api/supplier/dashboard').expect(401);
  });

  test('a buyer token cannot reach supplier routes', async () => {
    const buyer = await createUser('buyer');

    await request(app).get('/api/supplier/dashboard').set(buyer.auth).expect(403);
    await request(app).get('/api/supplier/orders').set(buyer.auth).expect(403);
    await request(app)
      .post('/api/products')
      .set(buyer.auth)
      .send({ name: 'Linen', category: 'Linen', price: 100, stock: 10 })
      .expect(403);
    await request(app).post('/api/ai/suggest-quote').set(buyer.auth).send({}).expect(403);
  });

  test('a supplier token cannot reach buyer routes', async () => {
    const supplier = await createUser('supplier');

    await request(app).get('/api/cart').set(supplier.auth).expect(403);
    await request(app).post('/api/orders/checkout').set(supplier.auth).send({}).expect(403);
    await request(app).get('/api/quotes').set(supplier.auth).expect(403);
    await request(app).get('/api/ai/recommendations').set(supplier.auth).expect(403);
  });

  test('a token signed with another secret is rejected', async () => {
    const buyer = await createUser('buyer');
    const forged = jwt.sign({ userId: buyer.id, role: 'supplier' }, 'not-the-server-secret');

    await request(app).get('/api/supplier/dashboard').set('Authorization', `Bearer ${forged}`).expect(401);
  });

  test('registration only creates buyer or supplier accounts', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'admin@example.test', password: 'long-enough-password', role: 'admin' })
      .expect(400);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new-buyer@example.test', password: 'long-enough-password', role: 'buyer' })
      .expect(201);

    expect(jwt.decode(res.body.token).role).toBe('buyer');
    expect(res.body.user.passwordHash).toBeUndefined();
  });
});
