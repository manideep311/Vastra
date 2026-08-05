const { listProducts, getProductById, createProduct, updateProduct, deleteProduct, listMyProducts, addProductImages, getCategoryStats } = require('./product.service');

const getAll = async (req, res, next) => {
  try {
    const result = await listProducts(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getOne = async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id);
    res.status(200).json({ product });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const product = await createProduct(req.user.userId, req.body);
    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const product = await updateProduct(req.user.userId, req.params.id, req.body);
    res.status(200).json({ product });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await deleteProduct(req.user.userId, req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getMine = async (req, res, next) => {
  try {
    const products = await listMyProducts(req.user.userId);
    res.status(200).json({ products });
  } catch (error) {
    next(error);
  }
};

const uploadImages = async (req, res, next) => {
  try {
    const imagePaths = req.files.map((file) => `/uploads/${file.filename}`);
    const product = await addProductImages(req.user.userId, req.params.id, imagePaths);
    res.status(200).json({ product });
  } catch (error) {
    next(error);
  }
};
const getCategories = async (req, res, next) => {
  try {
    const categories = await getCategoryStats();
    res.status(200).json({ categories });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove, getMine, uploadImages, getCategories };