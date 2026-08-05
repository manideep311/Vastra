const Category = require('../../models/Category');

const DEFAULT_CATEGORIES = [
  'Cotton', 'Linen', 'Silk', 'Wool', 'Polyester',
  'Denim', 'Blended', 'Organic Cotton', 'Technical Textiles', 'Home Textiles',
];

// Lazily seeds a sensible default taxonomy the first time anyone asks for
// the category list, so the directory is never empty on a fresh install.
const listCategories = async () => {
  const count = await Category.countDocuments();
  if (count === 0) {
    await Category.insertMany(DEFAULT_CATEGORIES.map((name) => ({ name })), { ordered: false }).catch(() => {});
  }
  return Category.find().sort({ name: 1 });
};

const createCategory = async ({ name, parentCategory }) => {
  const category = await Category.create({ name, parentCategory: parentCategory || null });
  return category;
};

module.exports = { listCategories, createCategory };
