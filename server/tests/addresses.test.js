const request = require('supertest');
const app = require('../src/app');
const { startDb, stopDb, clearDb, createUser } = require('./helpers');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

const onboard = (buyer) =>
  request(app).post('/api/buyer/onboarding').set(buyer.auth).send({ businessType: 'Manufacturer', industry: 'Apparel' }).expect(200);

const addAddress = async (buyer) => {
  const res = await request(app)
    .post('/api/buyer/addresses')
    .set(buyer.auth)
    .send({ address: '12 Mill Road, Tiruppur, Tamil Nadu', contact: '+91 9876543210', isDefault: true })
    .expect(201);
  return res.body.profile.addresses[0];
};

describe('saved delivery addresses', () => {
  test('a buyer can edit and delete their own address', async () => {
    const buyer = await createUser('buyer');
    await onboard(buyer);
    const saved = await addAddress(buyer);

    const edited = await request(app)
      .patch(`/api/buyer/addresses/${saved._id}`)
      .set(buyer.auth)
      .send({ address: '45 Weavers Street, Erode, Tamil Nadu' })
      .expect(200);
    expect(edited.body.profile.addresses[0]).toMatchObject({ address: '45 Weavers Street, Erode, Tamil Nadu', contact: '+91 9876543210' });

    const removed = await request(app).delete(`/api/buyer/addresses/${saved._id}`).set(buyer.auth).expect(200);
    expect(removed.body.profile.addresses).toEqual([]);
  });

  test('rejects an address that is too short', async () => {
    const buyer = await createUser('buyer');
    await onboard(buyer);
    const saved = await addAddress(buyer);
    await request(app).patch(`/api/buyer/addresses/${saved._id}`).set(buyer.auth).send({ address: 'short' }).expect(400);
  });

  test("a buyer cannot edit or delete another buyer's address", async () => {
    const owner = await createUser('buyer');
    const other = await createUser('buyer');
    await onboard(owner);
    await onboard(other);
    const saved = await addAddress(owner);

    await request(app).patch(`/api/buyer/addresses/${saved._id}`).set(other.auth).send({ address: '99 Somewhere Else Road, Surat' }).expect(404);
    await request(app).delete(`/api/buyer/addresses/${saved._id}`).set(other.auth).expect(200);

    const ownerProfile = await request(app).get('/api/buyer/profile').set(owner.auth).expect(200);
    expect(ownerProfile.body.profile.addresses).toHaveLength(1);
  });
});
