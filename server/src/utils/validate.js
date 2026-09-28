const mongoose = require('mongoose');

// Small, dependency-free validation helpers. Services call these instead of
// trusting req.body directly — every value that affects money, stock,
// ownership or status is re-checked here on the server.

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isObjectId = (value) => typeof value === 'string' && mongoose.Types.ObjectId.isValid(value) && /^[a-f\d]{24}$/i.test(value);

const assertObjectId = (value, label = 'id') => {
  if (!isObjectId(value)) throw httpError(400, `Invalid ${label}`);
  return value;
};

// Accepts numbers or numeric strings (form inputs), rejects NaN/Infinity/bools.
const toNumber = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return NaN;
};

const requireNumber = (value, label, { min = -Infinity, max = Infinity, integer = false } = {}) => {
  const n = toNumber(value);
  if (!Number.isFinite(n)) throw httpError(400, `${label} must be a number`);
  if (integer && !Number.isInteger(n)) throw httpError(400, `${label} must be a whole number`);
  if (n < min) throw httpError(400, `${label} must be at least ${min}`);
  if (n > max) throw httpError(400, `${label} must be at most ${max}`);
  return n;
};

const optionalNumber = (value, label, opts) =>
  value === undefined || value === null || value === '' ? undefined : requireNumber(value, label, opts);

const requireString = (value, label, { max = 200, min = 1 } = {}) => {
  if (typeof value !== 'string') throw httpError(400, `${label} is required`);
  const trimmed = value.trim();
  if (trimmed.length < min) throw httpError(400, `${label} is required`);
  if (trimmed.length > max) throw httpError(400, `${label} must be ${max} characters or fewer`);
  return trimmed;
};

const optionalString = (value, label, { max = 200 } = {}) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw httpError(400, `${label} must be text`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw httpError(400, `${label} must be ${max} characters or fewer`);
  return trimmed;
};

const stringList = (value, label, { maxItems = 20, maxLength = 50 } = {}) => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw httpError(400, `${label} must be a list`);
  if (value.length > maxItems) throw httpError(400, `${label} can have at most ${maxItems} entries`);
  return [...new Set(value.map((v) => optionalString(v, label, { max: maxLength })).filter(Boolean))];
};

const oneOf = (value, allowed, label) => {
  if (!allowed.includes(value)) throw httpError(400, `Invalid ${label}`);
  return value;
};

// Clamps page/limit query params to sane bounds so a client can't request
// an unbounded page or a negative skip.
const pagination = (query = {}, { defaultLimit = 20, maxLimit = 50 } = {}) => {
  const page = Math.max(1, Math.floor(toNumber(query.page)) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(toNumber(query.limit)) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

module.exports = {
  httpError,
  isObjectId,
  assertObjectId,
  requireNumber,
  optionalNumber,
  requireString,
  optionalString,
  stringList,
  oneOf,
  pagination,
};
