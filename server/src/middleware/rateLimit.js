const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const limitMessage = (message) => ({ error: message });

// Keys a limiter by the authenticated user when there is one, otherwise by IP,
// so one busy office NAT doesn't lock out every logged-in user behind it.
const userOrIpKey = (req) => (req.user?.userId ? `user:${req.user.userId}` : ipKeyGenerator(req.ip));

// Generous ceiling on the whole API — only stops runaway scripts.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limitMessage('Too many requests. Please slow down and try again shortly.'),
});

// Login: slows credential stuffing. Successful sign-ins don't count, so a
// buyer who logs in often is never locked out.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: limitMessage('Too many sign-in attempts. Please wait a few minutes and try again.'),
});

// Registration: every attempt counts, successful or not, so one client can't
// mass-create accounts.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limitMessage('Too many accounts created from this network. Please try again later.'),
});

// Every AI call costs real inference quota. Anonymous visitors get a small
// allowance; signed-in users get more, tracked per account.
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: (req) => (req.user ? 60 : 15),
  keyGenerator: userOrIpKey,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limitMessage('The assistant is getting a lot of requests from you. Please try again in a few minutes.'),
});

module.exports = { apiLimiter, loginLimiter, registerLimiter, aiLimiter };
