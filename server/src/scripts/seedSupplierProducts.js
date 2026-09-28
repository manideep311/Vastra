/**
 * Adds a fixed set of 10 realistic textile products to a specific supplier
 * account, identified by email. Unlike seedDemoProducts.js, this script is
 * purely additive — it never deletes or touches any existing data. Safe to
 * re-run: products are matched by (supplierId, name) so re-running just
 * skips ones that already exist instead of creating duplicates.
 *
 * If the supplier account doesn't exist yet, it's created (role: supplier,
 * onboarding marked complete) with a default password printed at the end.
 *
 * Run from the server/ directory:
 *   node src/scripts/seedSupplierProducts.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const SupplierProfile = require('../models/SupplierProfile');
const Product = require('../models/Product');
const { generateEmbedding } = require('../modules/ai/ai.service');

const SUPPLIER_EMAIL = 'test456@email.com';
const DEFAULT_PASSWORD = 'Demo@1234';

const img = (filename, width = 900) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;

const IMAGES = {
  cotton: [img('Blue Cotton Fabric Texture Free Creative Commons (6962342861).jpg'), img('Cloth texture.jpg')],
  cottonAlt: [img('Cloth texture.jpg'), img('Blue Cotton Fabric Texture Free Creative Commons (6962342861).jpg')],
  linen: [img('Linen, Texture (2242358989).jpg'), img('Linen cloth.jpg')],
  denim: [img('Denim texture 01.jpg'), img('Jeansfabric (cropped).jpg')],
  polyester: [img('Stretching Polyester.JPG'), img('FREE Wrinkled Fabric Paper Texture Creative Commons (4798631357).jpg')],
  polyesterAlt: [img('FREE Wrinkled Fabric Paper Texture Creative Commons (4798631357).jpg'), img('Stretching Polyester.JPG')],
  rayon: [img('Close up of rayon fabric from Blauwe japon zonder mouw.JPG')],
  silk: [
    img('Pink Woven Cotton Silk Fabric Texture Free Creative Commons (6962346249).jpg'),
    img('Rajshahi silk fabric, Sopura Silk Mills Ltd (01).jpg'),
  ],
  plush: [img('Velvet Blanket (9093890698).jpg')],
};

const PRODUCTS = [
  {
    name: 'Premium Cotton Shirting Fabric',
    category: 'Cotton',
    description:
      'Soft, breathable 100% cotton fabric suitable for formal shirts, uniforms, and casual wear. Comfortable for all seasons with excellent color retention.',
    tags: ['breathable', 'shirting', 'premium', 'soft', 'lightweight'],
    colors: ['White', 'Sky Blue', 'Navy Blue', 'Black', 'Grey'],
    stock: 500,
    price: 220,
    unit: 'meter',
    moq: 50,
    fabricWidth: '58 inches',
    rollLength: '100 meters',
    gsm: 140,
    leadTime: '5-7 days',
    fabricComposition: '100% Cotton',
    images: IMAGES.cotton,
  },
  {
    name: 'Cotton Lycra Knit Fabric',
    category: 'Knit',
    description:
      'Stretchable knit fabric ideal for T-shirts, leggings, sportswear, and casual apparel with excellent recovery.',
    tags: ['stretch', 'lycra', 't-shirt', 'activewear'],
    colors: ['Black', 'White', 'Olive Green', 'Maroon', 'Navy'],
    stock: 800,
    price: 260,
    unit: 'kg',
    moq: 30,
    fabricWidth: '72 inches',
    rollLength: '25 kg roll',
    gsm: 220,
    leadTime: '7 days',
    fabricComposition: '95% Cotton, 5% Lycra',
    images: IMAGES.cottonAlt,
  },
  {
    name: 'Linen Blend Fabric',
    category: 'Linen',
    description: 'Lightweight linen blend suitable for summer shirts, dresses, kurtas, and premium apparel.',
    tags: ['linen', 'breathable', 'summer', 'premium'],
    colors: ['Beige', 'Ivory', 'Olive', 'Mustard'],
    stock: 350,
    price: 340,
    unit: 'meter',
    moq: 25,
    fabricWidth: '56 inches',
    rollLength: '80 meters',
    gsm: 170,
    leadTime: '6-8 days',
    fabricComposition: '70% Linen, 30% Cotton',
    images: IMAGES.linen,
  },
  {
    name: 'Denim Fabric (12 Oz)',
    category: 'Denim',
    description: 'Durable denim fabric for jeans, jackets, bags, and workwear.',
    tags: ['denim', 'jeans', 'durable', 'heavy'],
    colors: ['Indigo Blue', 'Black', 'Grey'],
    stock: 1200,
    price: 280,
    unit: 'meter',
    moq: 100,
    fabricWidth: '60 inches',
    rollLength: '75 meters',
    gsm: 340,
    leadTime: '10 days',
    fabricComposition: '100% Cotton',
    images: IMAGES.denim,
  },
  {
    name: 'Polyester Suiting Fabric',
    category: 'Polyester',
    description: 'Wrinkle-resistant suiting fabric suitable for office wear, trousers, blazers, and uniforms.',
    tags: ['suiting', 'wrinkle-resistant', 'formal'],
    colors: ['Charcoal', 'Navy', 'Black', 'Brown'],
    stock: 900,
    price: 190,
    unit: 'meter',
    moq: 50,
    fabricWidth: '58 inches',
    rollLength: '100 meters',
    gsm: 180,
    leadTime: '5 days',
    fabricComposition: '100% Polyester',
    images: IMAGES.polyester,
  },
  {
    name: 'Rayon Printed Fabric',
    category: 'Rayon',
    description: 'Soft printed rayon fabric ideal for kurtis, dresses, tops, and ethnic wear.',
    tags: ['printed', 'rayon', 'ethnic', 'floral'],
    colors: ['Pink', 'Blue', 'Yellow', 'Green'],
    stock: 600,
    price: 175,
    unit: 'meter',
    moq: 40,
    fabricWidth: '44 inches',
    rollLength: '60 meters',
    gsm: 130,
    leadTime: '4-6 days',
    fabricComposition: '100% Rayon',
    images: IMAGES.rayon,
  },
  {
    name: 'Silk Satin Fabric',
    category: 'Silk',
    description: 'Premium satin fabric with luxurious shine for bridal wear, gowns, sarees, and fashion garments.',
    tags: ['satin', 'luxury', 'bridal', 'premium'],
    colors: ['Red', 'Gold', 'Emerald Green', 'Royal Blue'],
    stock: 200,
    price: 780,
    unit: 'meter',
    moq: 20,
    fabricWidth: '44 inches',
    rollLength: '40 meters',
    gsm: 110,
    leadTime: '12 days',
    fabricComposition: '100% Silk',
    images: IMAGES.silk,
  },
  {
    name: 'Terry Towel Fabric',
    category: 'Terry',
    description: 'Highly absorbent terry fabric for towels, bathrobes, and hotel linen.',
    tags: ['towel', 'absorbent', 'hotel', 'cotton'],
    colors: ['White', 'Cream', 'Blue'],
    stock: 700,
    price: 320,
    unit: 'kg',
    moq: 100,
    fabricWidth: '72 inches',
    rollLength: '30 kg roll',
    gsm: 420,
    leadTime: '8 days',
    fabricComposition: '100% Cotton',
    images: IMAGES.plush,
  },
  {
    name: 'Polyester Mesh Fabric',
    category: 'Mesh',
    description: 'Lightweight mesh fabric used for sportswear, bags, caps, and lining applications.',
    tags: ['sportswear', 'mesh', 'breathable'],
    colors: ['Black', 'White', 'Neon Green'],
    stock: 1000,
    price: 160,
    unit: 'meter',
    moq: 100,
    fabricWidth: '60 inches',
    rollLength: '100 meters',
    gsm: 90,
    leadTime: '5 days',
    fabricComposition: '100% Polyester',
    images: IMAGES.polyesterAlt,
  },
  {
    name: 'Organic Cotton Fabric',
    category: 'Organic Cotton',
    description:
      'Eco-friendly organic cotton fabric produced using sustainable farming practices, suitable for premium apparel and baby clothing.',
    tags: ['organic', 'eco-friendly', 'sustainable', 'babywear'],
    colors: ['Natural White', 'Beige'],
    stock: 400,
    price: 310,
    unit: 'meter',
    moq: 30,
    fabricWidth: '58 inches',
    rollLength: '80 meters',
    gsm: 160,
    leadTime: '7-10 days',
    fabricComposition: '100% Organic Cotton',
    images: IMAGES.cottonAlt,
  },
];

async function run() {
  await connectDB();

  let user = await User.findOne({ email: SUPPLIER_EMAIL });

  if (user && user.role !== 'supplier') {
    console.error(`"${SUPPLIER_EMAIL}" already exists but as a "${user.role}" account, not a supplier. Aborting.`);
    process.exit(1);
  }

  if (!user) {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    user = await User.create({
      email: SUPPLIER_EMAIL,
      passwordHash,
      role: 'supplier',
      onboardingComplete: true,
    });
    console.log(`Created new supplier account: ${SUPPLIER_EMAIL} (password: ${DEFAULT_PASSWORD})`);
  } else {
    console.log(`Using existing supplier account: ${SUPPLIER_EMAIL}`);
  }

  const existingProfile = await SupplierProfile.findOne({ userId: user._id });
  if (!existingProfile) {
    await SupplierProfile.create({
      userId: user._id,
      businessName: 'Test Textile Supplies',
      businessType: 'Wholesaler',
      contactInfo: { phone: '+91 98765 43210', email: SUPPLIER_EMAIL },
      businessAddress: 'Test Address',
      operatingHours: 'Mon-Sat 9am-6pm',
      productCategories: [...new Set(PRODUCTS.map((p) => p.category))],
      fabricTypesOffered: [...new Set(PRODUCTS.map((p) => p.category))],
      moq: 20,
      isVerified: true,
      verificationBadge: 'verified',
      about: 'Demo supplier account seeded for testing.',
    });
    console.log('Created a SupplierProfile for this account.');
  }

  let created = 0;
  let skipped = 0;

  for (const productData of PRODUCTS) {
    const existing = await Product.findOne({ supplierId: user._id, name: productData.name });
    if (existing) {
      console.log(`  Skipping "${productData.name}" — already exists for this supplier.`);
      skipped += 1;
      continue;
    }

    let embeddingVector;
    try {
      embeddingVector = await generateEmbedding(`${productData.name} ${productData.category} ${productData.description}`);
    } catch (err) {
      console.warn(`  (embedding failed for "${productData.name}", continuing without it: ${err.message})`);
    }

    await Product.create({ ...productData, supplierId: user._id, embeddingVector });
    console.log(`  Added: ${productData.name}`);
    created += 1;
  }

  console.log(`\nDone — ${created} product(s) added, ${skipped} skipped (already existed).`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
