const { listCategories, createCategory } = require('./category.service');

const getAll = async (req, res, next) => {
  try {
    const categories = await listCategories();
    res.status(200).json({ categories });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const category = await createCategory(req.body);
    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create };
