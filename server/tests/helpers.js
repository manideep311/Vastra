const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const { generateToken } = require('../src/modules/auth/auth.service');

let mongod;

const startDb = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

const stopDb = async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
};

const clearDb = async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
};

let userCount = 0;

// Creates an account directly (skipping the registration rate limiter) and
// returns the auth header a client would send.
const createUser = async (role) => {
  userCount += 1;
  const user = await User.create({ email: `${role}${userCount}@example.test`, passwordHash: 'not-used', role });
  const token = generateToken(user);
  return { user, id: user._id.toString(), auth: { Authorization: `Bearer ${token}` } };
};

const createProduct = (supplier, overrides = {}) =>
  Product.create({
    supplierId: supplier.user._id,
    name: 'Cotton Poplin',
    category: 'Cotton',
    description: 'Plain-weave cotton for shirting.',
    price: 100,
    stock: 1000,
    unit: 'meter',
    moq: 10,
    ...overrides,
  });

const SHIPPING = { address: '12 Mill Road, Tiruppur, Tamil Nadu', contact: '9876543210' };

// Routes outbound fetch calls (embedding and chat APIs) to a test handler.
const mockFetch = (handler) => {
  globalThis.__fetchHandler = handler;
};
const resetFetch = () => {
  globalThis.__fetchHandler = globalThis.__offlineFetch;
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

module.exports = { startDb, stopDb, clearDb, createUser, createProduct, SHIPPING, mockFetch, resetFetch, jsonResponse };
