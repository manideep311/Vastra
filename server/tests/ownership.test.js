const request = require('supertest');
const app = require('../src/app');
const Product = require('../src/models/Product');
const { startDb, stopDb, clearDb, createUser, createProduct, SHIPPING } = require('./helpers');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

const placeOrder = async (buyer, product, quantity = 10) => {
  await request(app).post('/api/cart/items').set(buyer.auth).send({ productId: product._id, quantity }).expect(200);
  const res = await request(app).post('/api/orders/checkout').set(buyer.auth).send({ shippingInfo: SHIPPING }).expect(201);
  return res.body.orders[0];
};

describe('ownership', () => {
  test('a supplier cannot edit or delete another supplier’s product', async () => {
    const owner = await createUser('supplier');
    const other = await createUser('supplier');
    const product = await createProduct(owner);

    await request(app).patch(`/api/products/${product._id}`).set(other.auth).send({ price: 1 }).expect(403);
    await request(app).delete(`/api/products/${product._id}`).set(other.auth).expect(403);

    const unchanged = await Product.findById(product._id).lean();
    expect(unchanged.price).toBe(100);
  });

  test('a supplier can edit their own product', async () => {
    const owner = await createUser('supplier');
    const product = await createProduct(owner);

    await request(app).patch(`/api/products/${product._id}`).set(owner.auth).send({ price: 120 }).expect(200);
    expect((await Product.findById(product._id).lean()).price).toBe(120);
  });

  test('a buyer only sees their own orders', async () => {
    const supplier = await createUser('supplier');
    const buyer = await createUser('buyer');
    const otherBuyer = await createUser('buyer');
    const order = await placeOrder(buyer, await createProduct(supplier));

    const own = await request(app).get('/api/orders').set(buyer.auth).expect(200);
    expect(own.body.orders.map((o) => o._id)).toEqual([order._id]);
    const other = await request(app).get('/api/orders').set(otherBuyer.auth).expect(200);
    expect(other.body.orders).toEqual([]);
  });

  test('a supplier cannot see or update another supplier’s order', async () => {
    const supplier = await createUser('supplier');
    const otherSupplier = await createUser('supplier');
    const buyer = await createUser('buyer');
    const order = await placeOrder(buyer, await createProduct(supplier));

    const otherList = await request(app).get('/api/supplier/orders').set(otherSupplier.auth).expect(200);
    expect(otherList.body.orders).toEqual([]);
    await request(app)
      .patch(`/api/supplier/orders/${order._id}/status`)
      .set(otherSupplier.auth)
      .send({ status: 'accepted' })
      .expect(404);
    await request(app)
      .patch(`/api/supplier/orders/${order._id}/status`)
      .set(supplier.auth)
      .send({ status: 'accepted' })
      .expect(200);
  });
});
