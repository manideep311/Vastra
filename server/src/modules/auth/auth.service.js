const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

const registerUser = async ({ email, password, role }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error('Email already registered');
    error.statusCode = 409; // Conflict
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10); // 10 = salt rounds
  const user = await User.create({ email, passwordHash, role });

  const token = generateToken(user);
  return { user, token };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401; // Unauthorized
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user);
  return { user, token };
};

module.exports = { registerUser, loginUser, generateToken };