const request = require('supertest');
const app = require('../src/app');
const Cart = require('../src/models/Cart');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const { startDb, stopDb, clearDb, createUser, createProduct, SHIPPING } = require('./helpers');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

let supplier;
let buyer;

beforeEach(async () => {
  supplier = await createUser('supplier');
  buyer = await createUser('buyer');
});

const addItem = (product, quantity, extra = {}) =>
  request(app).post('/api/cart/items').set(buyer.auth).send({ productId: product._id, quantity, ...extra }).expect(200);

const checkout = () => request(app).post('/api/orders/checkout').set(buyer.auth).send({ shippingInfo: SHIPPING });

describe('checkout pricing', () => {
  test('prices come from the catalog and bulk tiers, not the client', async () => {
    const product = await createProduct(supplier, { price: 100, priceTiers: [{ minQty: 100, price: 90 }] });
    await addItem(product, 100, { price: 1, priceAtAdd: 1 });

    const res = await checkout().expect(201);
    const [order] = res.body.orders;
    expect(order.items[0].price).toBe(90);
    expect(order.total).toBe(9000);
  });

  test('re-prices at checkout when the supplier changed the price', async () => {
    const product = await createProduct(supplier, { price: 100 });
    await addItem(product, 10);
    await Product.updateOne({ _id: product._id }, { price: 120 });

    const res = await checkout().expect(201);
    expect(res.body.orders[0].total).toBe(1200);
  });

  test('reserves stock and empties the cart', async () => {
    const product = await createProduct(supplier, { stock: 1000 });
    await addItem(product, 100);

    await checkout().expect(201);
    expect((await Product.findById(product._id).lean()).stock).toBe(900);
    const cart = await Cart.findOne({ buyerId: buyer.id }).lean();
    expect(cart.items).toHaveLength(0);
    expect(cart.checkoutLockedAt).toBeNull();
  });

  test('a failed checkout releases the cart for another attempt', async () => {
    const product = await createProduct(supplier, { stock: 1000 });
    await addItem(product, 100);
    await Product.updateOne({ _id: product._id }, { stock: 50 });

    await checkout().expect(400);
    const cart = await Cart.findOne({ buyerId: buyer.id }).lean();
    expect(cart.items).toHaveLength(1);
    expect(cart.checkoutLockedAt).toBeNull();
  });
});

describe('checkout concurrency', () => {
  test('simultaneous checkouts of one cart create exactly one order', async () => {
    const product = await createProduct(supplier, { stock: 1000 });
    await addItem(product, 100);

    const responses = await Promise.all([checkout(), checkout(), checkout()]);
    const statuses = responses.map((r) => r.status).sort();

    expect(statuses).toEqual([201, 409, 409]);
    expect(await Order.countDocuments({ buyerId: buyer.id })).toBe(1);
    expect((await Product.findById(product._id).lean()).stock).toBe(900);
  });

  test('an abandoned claim older than two minutes can be taken over', async () => {
    const product = await createProduct(supplier);
    await addItem(product, 10);
    await Cart.updateOne({ buyerId: buyer.id }, { checkoutLockedAt: new Date(Date.now() - 3 * 60 * 1000) });

    await checkout().expect(201);
  });
});
