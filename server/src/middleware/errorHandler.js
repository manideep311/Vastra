const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(err.message);
  res.status(statusCode).json({
    error: err.message || 'Something went wrong',
  });
};

module.exports = errorHandler;