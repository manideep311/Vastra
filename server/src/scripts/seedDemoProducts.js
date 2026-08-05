/**
 * Resets the marketplace's product catalog and repopulates it with realistic
 * demo suppliers and textile products — real (freely licensed, Wikimedia
 * Commons) fabric photos, Indian Rupee pricing, and proper fabric
 * measurements — so the app has something worth browsing out of the box.
 *
 * Run from the server/ directory:
 *   node src/scripts/seedDemoProducts.js
 *
 * This WIPES existing products, supplier accounts/profiles, and everything
 * that references them (carts, orders, quotes, sample requests, reviews,
 * wishlists, notifications) before reseeding — so it's safe to re-run any
 * time you want a clean catalog. Buyer accounts and buyer profiles are left
 * untouched.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const SupplierProfile = require('../models/SupplierProfile');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Quote = require('../models/Quote');
const SampleRequest = require('../models/SampleRequest');
const Review = require('../models/Review');
const Wishlist = require('../models/Wishlist');
const Notification = require('../models/Notification');
const { generateEmbedding } = require('../modules/ai/ai.service');

// Wikimedia Commons "Special:FilePath" is a stable, well-documented redirect
// to the underlying file — no need to know the internal hashed storage path.
const img = (filename, width = 900) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;

// Each fiber has two arrays — a base order and a reversed/alternate order —
// so that sibling products from the same supplier never show the exact same
// thumbnail (images[0]) as each other.
const IMAGES = {
  cotton: [img('Blue Cotton Fabric Texture Free Creative Commons (6962342861).jpg'), img('Cloth texture.jpg')],
  cottonAlt: [img('Cloth texture.jpg'), img('Blue Cotton Fabric Texture Free Creative Commons (6962342861).jpg')],
  linen: [img('Linen, Texture (2242358989).jpg'), img('Linen cloth.jpg')],
  linenAlt: [img('Linen cloth.jpg'), img('Linen, Texture (2242358989).jpg')],
  silk: [
    img('Pink Woven Cotton Silk Fabric Texture Free Creative Commons (6962346249).jpg'),
    img('Rajshahi silk fabric, Sopura Silk Mills Ltd (01).jpg'),
  ],
  silkAlt: [
    img('Rajshahi silk fabric, Sopura Silk Mills Ltd (01).jpg'),
    img('Pink Woven Cotton Silk Fabric Texture Free Creative Commons (6962346249).jpg'),
  ],
  wool: [img('Beige wool texture.jpg'), img('Red wool texture-2.png')],
  woolAlt: [img('Red wool texture-2.png'), img('Beige wool texture.jpg')],
  denim: [img('Denim texture 01.jpg'), img('Jeansfabric (cropped).jpg')],
  denimAlt: [img('Jeansfabric (cropped).jpg'), img('Close-Up of Denim Jeans.jpg')],
  // Replaced the old "water droplet" polyester photo — its macro water-bead
  // highlight read as a piece of jewelry rather than fabric.
  polyester: [img('Stretching Polyester.JPG'), img('FREE Wrinkled Fabric Paper Texture Creative Commons (4798631357).jpg')],
  polyesterAlt: [img('FREE Wrinkled Fabric Paper Texture Creative Commons (4798631357).jpg'), img('Stretching Polyester.JPG')],
  velvet: [img('Velvet Blanket (9093890698).jpg')],
  corduroy: [img('Corduroy fabric.jpg')],
  rayon: [img('Close up of rayon fabric from Blauwe japon zonder mouw.JPG')],
  chambray: [img('Chambray fabric.jpg'), img('Blue chambray cloth.JPG')],
  jute: [img('Jute nahtlos.png')],
  canvas: [img('Cloth texture.jpg')],
  tweed: [img('Tweed fabric.jpg'), img('Harris tweed.jpg')],
};

const DEMO_PASSWORD = 'Demo@1234';

const SUPPLIERS = [
  {
    email: 'ganges.cotton@demo.textilehub.in',
    businessName: 'Ganges Cotton Mills',
    businessType: 'Manufacturer',
    businessAddress: 'Sector 58, Industrial Area, Faridabad, Haryana',
    operatingHours: 'Mon-Sat 9am-6pm',
    productCategories: ['Cotton', 'Organic Cotton'],
    fabricTypesOffered: ['Cotton', 'Organic Cotton'],
    isVerified: true,
    verificationBadge: 'verified',
    about: 'Third-generation cotton weaving mill supplying premium greige and dyed cotton fabric across India.',
    products: [
      {
        name: 'Premium Combed Cotton Poplin',
        category: 'Cotton',
        description: 'Soft, breathable combed cotton poplin ideal for shirting and premium apparel. Consistent weave, low shrinkage, easy to dye.',
        colors: ['White', 'Sky Blue', 'Beige', 'Charcoal'],
        stock: 4200,
        price: 185,
        unit: 'meter',
        moq: 100,
        fabricWidth: '58 in',
        rollLength: '50 meters/roll',
        gsm: 120,
        fabricComposition: '100% Combed Cotton',
        leadTime: '7-10 days',
        tags: ['shirting', 'breathable', 'poplin'],
        images: IMAGES.cotton,
        priceTiers: [
          { minQty: 100, price: 185 },
          { minQty: 500, price: 165 },
          { minQty: 1000, price: 145 },
        ],
      },
      {
        name: 'GOTS Certified Organic Cotton Twill',
        category: 'Organic Cotton',
        description: 'GOTS-certified organic cotton twill for sustainable fashion brands. Naturally soft hand-feel with excellent durability.',
        colors: ['Natural', 'Off White', 'Indigo'],
        stock: 2600,
        price: 245,
        unit: 'meter',
        moq: 150,
        fabricWidth: '44 in',
        rollLength: '40 meters/roll',
        gsm: 220,
        fabricComposition: '100% Organic Cotton',
        leadTime: '12-15 days',
        tags: ['organic', 'sustainable', 'twill', 'GOTS'],
        images: IMAGES.cottonAlt,
      },
    ],
  },
  {
    email: 'kanchipuram.silks@demo.textilehub.in',
    businessName: 'Kanchipuram Silk House',
    businessType: 'Manufacturer',
    businessAddress: 'Gandhi Road, Kanchipuram, Tamil Nadu',
    operatingHours: 'Mon-Sat 10am-7pm',
    productCategories: ['Silk'],
    fabricTypesOffered: ['Silk'],
    isVerified: true,
    verificationBadge: 'premium',
    about: 'Traditional silk weavers producing pure mulberry silk fabric and sarees for over 40 years.',
    products: [
      {
        name: 'Pure Mulberry Silk Satin',
        category: 'Silk',
        description: 'Luxurious pure mulberry silk satin with a lustrous finish, perfect for premium eveningwear and bridal collections.',
        colors: ['Ivory', 'Wine Red', 'Emerald', 'Gold'],
        stock: 850,
        price: 1450,
        unit: 'meter',
        moq: 20,
        fabricWidth: '44 in',
        rollLength: '20 meters/roll',
        gsm: 90,
        fabricComposition: '100% Mulberry Silk',
        leadTime: '10-14 days',
        tags: ['silk', 'bridal', 'luxury', 'satin'],
        images: IMAGES.silk,
        priceTiers: [
          { minQty: 20, price: 1450 },
          { minQty: 50, price: 1300 },
          { minQty: 100, price: 1150 },
        ],
      },
      {
        name: 'Kanchipuram Handloom Silk Brocade',
        category: 'Silk',
        description: 'Traditional handloom-woven silk brocade with zari work, sourced directly from Kanchipuram weaver cooperatives.',
        colors: ['Maroon', 'Royal Blue', 'Peacock Green'],
        stock: 320,
        price: 2100,
        unit: 'meter',
        moq: 10,
        fabricWidth: '44 in',
        rollLength: '10 meters/roll',
        gsm: 140,
        fabricComposition: '100% Silk with Zari',
        leadTime: '15-20 days',
        tags: ['handloom', 'brocade', 'zari', 'traditional'],
        images: IMAGES.silkAlt,
      },
    ],
  },
  {
    email: 'ludhiana.wool@demo.textilehub.in',
    businessName: 'Ludhiana Wool & Woolens',
    businessType: 'Manufacturer',
    businessAddress: 'Industrial Focal Point, Ludhiana, Punjab',
    operatingHours: 'Mon-Sat 9am-6pm',
    productCategories: ['Wool'],
    fabricTypesOffered: ['Wool'],
    isVerified: true,
    verificationBadge: 'verified',
    about: 'North India\'s leading wool fabric mill, supplying to garment exporters and winterwear brands.',
    products: [
      {
        name: 'Merino Wool Blend Suiting',
        category: 'Wool',
        description: 'Fine merino wool blend suiting fabric with a smooth drape, suited for tailored jackets and formal wear.',
        colors: ['Charcoal Grey', 'Navy', 'Black'],
        stock: 1100,
        price: 780,
        unit: 'meter',
        moq: 50,
        fabricWidth: '58 in',
        rollLength: '30 meters/roll',
        gsm: 280,
        fabricComposition: '70% Wool, 30% Polyester',
        leadTime: '10-12 days',
        tags: ['suiting', 'formal', 'merino'],
        images: IMAGES.wool,
        priceTiers: [
          { minQty: 50, price: 780 },
          { minQty: 200, price: 690 },
        ],
      },
      {
        name: 'Heavy Wool Winter Coating',
        category: 'Wool',
        description: 'Heavyweight wool coating fabric with excellent insulation, ideal for winter jackets and outerwear.',
        colors: ['Camel', 'Grey Melange', 'Black'],
        stock: 640,
        price: 950,
        unit: 'meter',
        moq: 30,
        fabricWidth: '58 in',
        rollLength: '25 meters/roll',
        gsm: 420,
        fabricComposition: '80% Wool, 20% Nylon',
        leadTime: '14-18 days',
        tags: ['coating', 'winterwear', 'heavyweight'],
        images: IMAGES.woolAlt,
      },
    ],
  },
  {
    email: 'ahmedabad.denim@demo.textilehub.in',
    businessName: 'Ahmedabad Denim Works',
    businessType: 'Manufacturer',
    businessAddress: 'Narol Industrial Estate, Ahmedabad, Gujarat',
    operatingHours: 'Mon-Sat 9am-7pm',
    productCategories: ['Denim'],
    fabricTypesOffered: ['Denim'],
    isVerified: true,
    verificationBadge: 'verified',
    about: 'Vertically integrated denim manufacturer exporting to over 20 countries.',
    products: [
      {
        name: 'Stretch Denim 12oz',
        category: 'Denim',
        description: 'Comfort-stretch 12oz denim with excellent recovery, ideal for jeans and jackets. Ring-spun yarn for a premium look.',
        colors: ['Indigo Blue', 'Black', 'Light Wash'],
        stock: 3400,
        price: 320,
        unit: 'meter',
        moq: 200,
        fabricWidth: '58 in',
        rollLength: '50 meters/roll',
        gsm: 380,
        fabricComposition: '98% Cotton, 2% Elastane',
        leadTime: '10-15 days',
        tags: ['denim', 'stretch', 'ring-spun'],
        images: IMAGES.denim,
        priceTiers: [
          { minQty: 200, price: 320 },
          { minQty: 1000, price: 285 },
          { minQty: 5000, price: 255 },
        ],
      },
      {
        name: 'Raw Selvedge Denim 14oz',
        category: 'Denim',
        description: 'Premium raw selvedge denim woven on vintage shuttle looms for authentic character and durability.',
        colors: ['Raw Indigo'],
        stock: 900,
        price: 480,
        unit: 'meter',
        moq: 100,
        fabricWidth: '32 in',
        rollLength: '35 meters/roll',
        gsm: 470,
        fabricComposition: '100% Cotton',
        leadTime: '18-22 days',
        tags: ['selvedge', 'raw denim', 'premium'],
        images: IMAGES.denimAlt,
      },
    ],
  },
  {
    email: 'kolkata.linen@demo.textilehub.in',
    businessName: 'Kolkata Linen Co.',
    businessType: 'Wholesaler',
    businessAddress: 'Burrabazar, Kolkata, West Bengal',
    operatingHours: 'Mon-Sat 10am-7pm',
    productCategories: ['Linen', 'Home Textiles'],
    fabricTypesOffered: ['Linen'],
    isVerified: false,
    verificationBadge: 'none',
    about: 'Importers and wholesalers of European flax linen for apparel and home furnishing.',
    products: [
      {
        name: 'Pure European Flax Linen',
        category: 'Linen',
        description: 'Breathable, textured pure linen woven from European flax — ideal for summer apparel and loose-fit garments.',
        colors: ['Natural', 'Sand', 'Olive', 'White'],
        stock: 1800,
        price: 520,
        unit: 'meter',
        moq: 50,
        fabricWidth: '56 in',
        rollLength: '30 meters/roll',
        gsm: 180,
        fabricComposition: '100% Flax Linen',
        leadTime: '12-16 days',
        tags: ['linen', 'summer', 'breathable'],
        images: IMAGES.linen,
        priceTiers: [
          { minQty: 50, price: 520 },
          { minQty: 200, price: 470 },
        ],
      },
      {
        name: 'Linen-Cotton Blend Upholstery Fabric',
        category: 'Home Textiles',
        description: 'Durable linen-cotton blend suited for cushions, curtains, and light upholstery with a natural woven texture.',
        colors: ['Ecru', 'Grey', 'Terracotta'],
        stock: 1200,
        price: 410,
        unit: 'meter',
        moq: 30,
        fabricWidth: '54 in',
        rollLength: '25 meters/roll',
        gsm: 260,
        fabricComposition: '55% Linen, 45% Cotton',
        leadTime: '10-14 days',
        tags: ['home textile', 'upholstery', 'curtains'],
        images: IMAGES.linenAlt,
      },
    ],
  },
  {
    email: 'surat.polyester@demo.textilehub.in',
    businessName: 'Surat Synthetics & Blends',
    businessType: 'Manufacturer',
    businessAddress: 'Pandesara Industrial Estate, Surat, Gujarat',
    operatingHours: '24/7',
    productCategories: ['Polyester', 'Blended', 'Technical Textiles'],
    fabricTypesOffered: ['Polyester'],
    isVerified: true,
    verificationBadge: 'verified',
    about: "India's synthetic textile hub — high-volume polyester and blended fabric production with fast turnaround.",
    products: [
      {
        name: 'Water-Resistant Polyester Taffeta',
        category: 'Polyester',
        description: 'Lightweight, water-resistant polyester taffeta commonly used for linings, bags, and outdoor gear.',
        colors: ['Black', 'Navy', 'Red', 'Royal Blue'],
        stock: 5200,
        price: 95,
        unit: 'meter',
        moq: 300,
        fabricWidth: '58 in',
        rollLength: '100 meters/roll',
        gsm: 75,
        fabricComposition: '100% Polyester',
        leadTime: '5-8 days',
        tags: ['water-resistant', 'lining', 'taffeta'],
        images: IMAGES.polyester,
        priceTiers: [
          { minQty: 300, price: 95 },
          { minQty: 2000, price: 78 },
          { minQty: 10000, price: 65 },
        ],
      },
      {
        name: 'Poly-Cotton Blend Workwear Fabric',
        category: 'Blended',
        description: 'Rugged 65/35 poly-cotton blend engineered for industrial workwear and uniforms — easy care, long-lasting.',
        colors: ['Navy', 'Olive Green', 'Grey'],
        stock: 3600,
        price: 165,
        unit: 'meter',
        moq: 200,
        fabricWidth: '58 in',
        rollLength: '60 meters/roll',
        gsm: 210,
        fabricComposition: '65% Polyester, 35% Cotton',
        leadTime: '7-10 days',
        tags: ['workwear', 'uniform', 'durable'],
        images: IMAGES.polyesterAlt,
      },
    ],
  },
  {
    email: 'surat.velvet@demo.textilehub.in',
    businessName: 'Surat Velvet & Corduroy Weavers',
    businessType: 'Manufacturer',
    businessAddress: 'Katargam Industrial Estate, Surat, Gujarat',
    operatingHours: 'Mon-Sat 9am-7pm',
    productCategories: ['Velvet', 'Corduroy'],
    fabricTypesOffered: ['Velvet', 'Corduroy'],
    isVerified: true,
    verificationBadge: 'verified',
    about: 'Specialist pile-fabric mill producing plush velvets and ribbed corduroys for fashion and upholstery brands.',
    products: [
      {
        name: 'Premium Cotton Velvet',
        category: 'Velvet',
        description: 'Rich, plush cotton velvet with a dense pile and soft drape — a favourite for eveningwear, drapery, and upholstery.',
        colors: ['Wine', 'Emerald', 'Navy', 'Charcoal'],
        stock: 1400,
        price: 640,
        unit: 'meter',
        moq: 30,
        fabricWidth: '54 in',
        rollLength: '25 meters/roll',
        gsm: 340,
        fabricComposition: '100% Cotton Velvet',
        leadTime: '12-16 days',
        tags: ['velvet', 'pile', 'upholstery', 'eveningwear'],
        images: IMAGES.velvet,
        priceTiers: [
          { minQty: 30, price: 640 },
          { minQty: 150, price: 570 },
        ],
      },
      {
        name: 'Fine Wale Cotton Corduroy',
        category: 'Corduroy',
        description: 'Classic fine-wale corduroy with a soft hand-feel and durable ribbed texture, ideal for jackets, trousers, and accessories.',
        colors: ['Mustard', 'Olive', 'Rust', 'Stone'],
        stock: 1900,
        price: 340,
        unit: 'meter',
        moq: 100,
        fabricWidth: '56 in',
        rollLength: '40 meters/roll',
        gsm: 290,
        fabricComposition: '100% Cotton',
        leadTime: '10-14 days',
        tags: ['corduroy', 'wale', 'jackets'],
        images: IMAGES.corduroy,
      },
    ],
  },
  {
    email: 'bhilwara.textiles@demo.textilehub.in',
    businessName: 'Bhilwara Textile Exports',
    businessType: 'Manufacturer',
    businessAddress: 'RIICO Industrial Area, Bhilwara, Rajasthan',
    operatingHours: 'Mon-Sat 9am-6pm',
    productCategories: ['Rayon', 'Chambray'],
    fabricTypesOffered: ['Rayon', 'Chambray'],
    isVerified: true,
    verificationBadge: 'verified',
    about: 'Integrated spinning-to-fabric exporter specializing in viscose rayon and yarn-dyed chambray for global apparel brands.',
    products: [
      {
        name: 'Viscose Rayon Crepe',
        category: 'Rayon',
        description: 'Lightweight, fluid viscose rayon crepe with a soft drape and subtle sheen — popular for dresses and blouses.',
        colors: ['Blush', 'Sage', 'Ivory', 'Black'],
        stock: 2600,
        price: 175,
        unit: 'meter',
        moq: 150,
        fabricWidth: '44 in',
        rollLength: '45 meters/roll',
        gsm: 130,
        fabricComposition: '100% Viscose Rayon',
        leadTime: '8-12 days',
        tags: ['rayon', 'viscose', 'crepe', 'drape'],
        images: IMAGES.rayon,
        priceTiers: [
          { minQty: 150, price: 175 },
          { minQty: 600, price: 155 },
        ],
      },
      {
        name: 'Yarn-Dyed Cotton Chambray',
        category: 'Chambray',
        description: 'Soft yarn-dyed cotton chambray with a subtle heathered texture — a lightweight alternative to denim for shirting.',
        colors: ['Sky Blue', 'Slate', 'Powder Blue'],
        stock: 3100,
        price: 210,
        unit: 'meter',
        moq: 150,
        fabricWidth: '58 in',
        rollLength: '50 meters/roll',
        gsm: 135,
        fabricComposition: '100% Cotton',
        leadTime: '9-12 days',
        tags: ['chambray', 'shirting', 'lightweight'],
        images: IMAGES.chambray,
      },
    ],
  },
  {
    email: 'kolkata.jutecanvas@demo.textilehub.in',
    businessName: 'Kolkata Jute & Canvas Traders',
    businessType: 'Wholesaler',
    businessAddress: 'Strand Road, Kolkata, West Bengal',
    operatingHours: 'Mon-Sat 10am-6pm',
    productCategories: ['Jute', 'Canvas', 'Home Textiles'],
    fabricTypesOffered: ['Jute', 'Cotton Canvas'],
    isVerified: false,
    verificationBadge: 'none',
    about: 'Eastern India\'s trusted supplier of natural jute fabric and heavy cotton canvas for bags, packaging, and industrial use.',
    products: [
      {
        name: 'Natural Woven Jute Fabric',
        category: 'Jute',
        description: 'Eco-friendly, biodegradable jute fabric woven from natural fibres — widely used for bags, sacking, and rustic home decor.',
        colors: ['Natural', 'Bleached'],
        stock: 4800,
        price: 95,
        unit: 'meter',
        moq: 300,
        fabricWidth: '40 in',
        rollLength: '80 meters/roll',
        gsm: 310,
        fabricComposition: '100% Jute',
        leadTime: '10-14 days',
        tags: ['jute', 'eco-friendly', 'biodegradable', 'bags'],
        images: IMAGES.jute,
        priceTiers: [
          { minQty: 300, price: 95 },
          { minQty: 1500, price: 82 },
        ],
      },
      {
        name: 'Heavy Cotton Canvas Duck',
        category: 'Canvas',
        description: 'Rugged, tightly woven cotton canvas duck built for bags, tents, and industrial upholstery where durability matters most.',
        colors: ['Natural', 'Khaki', 'Black'],
        stock: 2200,
        price: 275,
        unit: 'meter',
        moq: 100,
        fabricWidth: '58 in',
        rollLength: '40 meters/roll',
        gsm: 400,
        fabricComposition: '100% Cotton',
        leadTime: '10-15 days',
        tags: ['canvas', 'duck', 'heavy-duty', 'bags'],
        images: IMAGES.canvas,
      },
    ],
  },
  {
    email: 'ludhiana.tweed@demo.textilehub.in',
    businessName: 'Ludhiana Tweed Mills',
    businessType: 'Manufacturer',
    businessAddress: 'Gill Road, Ludhiana, Punjab',
    operatingHours: 'Mon-Sat 9am-6pm',
    productCategories: ['Wool'],
    fabricTypesOffered: ['Wool', 'Tweed'],
    isVerified: true,
    verificationBadge: 'premium',
    about: 'Heritage tweed mill weaving heavyweight wool tweed for blazers, outerwear, and heritage fashion labels.',
    products: [
      {
        name: 'Herringbone Wool Tweed',
        category: 'Wool',
        description: 'Classic herringbone wool tweed with a rugged, textured surface — a staple for blazers, caps, and heritage outerwear.',
        colors: ['Heather Grey', 'Moss Green', 'Brown Fleck'],
        stock: 780,
        price: 890,
        unit: 'meter',
        moq: 30,
        fabricWidth: '58 in',
        rollLength: '25 meters/roll',
        gsm: 350,
        fabricComposition: '90% Wool, 10% Nylon',
        leadTime: '14-18 days',
        tags: ['tweed', 'herringbone', 'heritage', 'blazer'],
        images: IMAGES.tweed,
        priceTiers: [
          { minQty: 30, price: 890 },
          { minQty: 120, price: 810 },
        ],
      },
      {
        name: 'Donegal-Style Fleck Tweed',
        category: 'Wool',
        description: 'Textured wool tweed flecked with contrast colour nubs in the Donegal tradition — adds character to jackets and accessories.',
        colors: ['Oatmeal Fleck', 'Charcoal Fleck'],
        stock: 560,
        price: 950,
        unit: 'meter',
        moq: 25,
        fabricWidth: '58 in',
        rollLength: '20 meters/roll',
        gsm: 370,
        fabricComposition: '85% Wool, 15% Nylon',
        leadTime: '15-20 days',
        tags: ['tweed', 'donegal', 'fleck', 'jackets'],
        images: [img('Harris tweed.jpg'), img('Tweed fabric.jpg')],
      },
    ],
  },
];

async function seed() {
  await connectDB();

  console.log('Clearing existing product catalog and supplier accounts...');
  const supplierUsers = await User.find({ role: 'supplier' }).select('_id');
  const supplierIds = supplierUsers.map((u) => u._id);

  await Promise.all([
    Product.deleteMany({}),
    SupplierProfile.deleteMany({}),
    User.deleteMany({ role: 'supplier' }),
    Cart.deleteMany({}),
    Order.deleteMany({}),
    Quote.deleteMany({}),
    SampleRequest.deleteMany({}),
    Review.deleteMany({}),
    Wishlist.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  console.log(`  Removed ${supplierIds.length} old supplier account(s) and all products/orders/quotes tied to them.`);
  console.log('  Buyer accounts and buyer profiles were left untouched.\n');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  let totalProducts = 0;

  for (const supplierData of SUPPLIERS) {
    const user = await User.create({
      email: supplierData.email,
      passwordHash,
      role: 'supplier',
      onboardingComplete: true,
    });

    await SupplierProfile.create({
      userId: user._id,
      businessName: supplierData.businessName,
      businessType: supplierData.businessType,
      contactInfo: { phone: '+91 98765 43210', email: supplierData.email },
      businessAddress: supplierData.businessAddress,
      operatingHours: supplierData.operatingHours,
      productCategories: supplierData.productCategories,
      fabricTypesOffered: supplierData.fabricTypesOffered,
      moq: 50,
      isVerified: supplierData.isVerified,
      verificationBadge: supplierData.verificationBadge,
      about: supplierData.about,
    });

    for (const productData of supplierData.products) {
      let embeddingVector;
      try {
        embeddingVector = await generateEmbedding(
          `${productData.name} ${productData.category} ${productData.description}`
        );
      } catch (err) {
        console.warn(`  (embedding failed for "${productData.name}", continuing without it: ${err.message})`);
      }

      await Product.create({ ...productData, supplierId: user._id, embeddingVector });
      totalProducts += 1;
    }

    console.log(`Seeded supplier: ${supplierData.businessName} (${supplierData.products.length} products)`);
  }

  console.log(`\nDone — ${SUPPLIERS.length} suppliers, ${totalProducts} products seeded.`);
  console.log(`All demo suppliers use password: ${DEMO_PASSWORD}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
