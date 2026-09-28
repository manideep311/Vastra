const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { httpError, oneOf } = require('../../utils/validate');

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128; // bcrypt ignores bytes past 72; this just bounds the work
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d', algorithm: 'HS256' }
  );
};

const normalizeEmail = (email) => {
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim()) || email.length > 254) {
    throw httpError(400, 'Enter a valid email address');
  }
  return email.trim().toLowerCase();
};

const registerUser = async ({ email, password, role }) => {
  const normalizedEmail = normalizeEmail(email);
  oneOf(role, ['buyer', 'supplier'], 'account type');
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw httpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw httpError(400, `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer`);
  }

  const existingUser = await User.exists({ email: normalizedEmail });
  if (existingUser) {
    throw httpError(409, 'An account with this email already exists. Try signing in instead.');
  }

  const passwordHash = await bcrypt.hash(password, 10); // 10 = salt rounds
  const user = await User.create({ email: normalizedEmail, passwordHash, role });

  const token = generateToken(user);
  return { user, token };
};

const loginUser = async ({ email, password }) => {
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw httpError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  // Same message for unknown email and wrong password — no account enumeration.
  if (!user || !(await user.comparePassword(password))) {
    throw httpError(401, 'Invalid email or password');
  }

  const token = generateToken(user);
  return { user, token };
};

// Confirms a token still maps to a real account with the role it claims.
// Lets the client drop a session whose user was deleted or changed.
const getSessionUser = async ({ userId, role }) => {
  const user = await User.findById(userId).select('email role onboardingComplete');
  if (!user || user.role !== role) throw httpError(401, 'Your session is no longer valid. Please sign in again.');
  return user;
};

module.exports = { registerUser, loginUser, generateToken, getSessionUser };
