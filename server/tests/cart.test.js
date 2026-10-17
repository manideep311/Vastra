const request = require('supertest');
const app = require('../src/app');
const Cart = require('../src/models/Cart');
const { startDb, stopDb, clearDb, createUser, createProduct } = require('./helpers');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

let buyer;
let product;

beforeEach(async () => {
  const supplier = await createUser('supplier');
  buyer = await createUser('buyer');
  product = await createProduct(supplier, { moq: 10, stock: 100 });
});

const addItem = (quantity, productId = product._id) =>
  request(app).post('/api/cart/items').set(buyer.auth).send({ productId, quantity });

describe('cart MOQ and stock rules', () => {
  test('rejects a quantity below the minimum order', async () => {
    const res = await addItem(9).expect(400);
    expect(res.body.error).toMatch(/Minimum order is 10/);
  });

  test('accepts the minimum order quantity', async () => {
    await addItem(10).expect(200);
    const cart = await Cart.findOne({ buyerId: buyer.id }).lean();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(10);
  });

  test('rejects more than is in stock', async () => {
    const res = await addItem(101).expect(400);
    expect(res.body.error).toMatch(/Only 100/);
  });

  test('counts quantity already in the cart against stock', async () => {
    await addItem(60).expect(200);
    await addItem(60).expect(400);
  });

  test('rejects products that are out of stock', async () => {
    product.status = 'out_of_stock';
    await product.save();
    await addItem(10).expect(400);
  });

  test('rejects lowering a line below the minimum order', async () => {
    await addItem(20).expect(200);
    await request(app).patch(`/api/cart/items/${product._id}`).set(buyer.auth).send({ quantity: 5 }).expect(400);
  });

  test('blocks cart edits while a checkout holds the cart', async () => {
    await addItem(10).expect(200);
    await Cart.updateOne({ buyerId: buyer.id }, { checkoutLockedAt: new Date() });
    await addItem(10).expect(409);
  });
});
