const { registerUser, loginUser } = require('./auth.service');

const register = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    const { user, token } = await registerUser({ email, password, role });
    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, role: user.role, onboardingComplete: user.onboardingComplete },
    });
  } catch (error) {
    next(error); // hands off to the error-handling middleware
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await loginUser({ email, password });
    res.status(200).json({
      token,
      user: { id: user._id, email: user.email, role: user.role, onboardingComplete: user.onboardingComplete },
    });
  } catch (error) {
    next(error);
  }
};

// JWTs are stateless — there's nothing to invalidate server-side without
// extra infrastructure (a token blacklist). For this prototype, logout
// is a client-side action: the frontend just discards the token.
// This endpoint exists for API completeness / future extension.
const logout = (req, res) => {
  res.status(200).json({ message: 'Logged out' });
};

module.exports = { register, login, logout };