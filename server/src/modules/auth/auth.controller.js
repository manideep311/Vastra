const { registerUser, loginUser, getSessionUser } = require('./auth.service');

const toPublicUser = (user) => ({
  id: user._id,
  email: user.email,
  role: user.role,
  onboardingComplete: user.onboardingComplete,
});

const register = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    const { user, token } = await registerUser({ email, password, role });
    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (error) {
    next(error); // hands off to the error-handling middleware
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await loginUser({ email, password });
    res.status(200).json({ token, user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await getSessionUser(req.user);
    res.status(200).json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
};

// JWTs are stateless — there's nothing to invalidate server-side without
// extra infrastructure (a token blacklist). Logout is a client-side action:
// the frontend discards the token. This endpoint exists for API completeness.
const logout = (req, res) => {
  res.status(200).json({ message: 'Logged out' });
};

module.exports = { register, login, me, logout };
