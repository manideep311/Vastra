// Seeded demo accounts take their password from the environment, never from
// source code. Call after dotenv has loaded.
const readSeedPassword = () => {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 8) {
    console.error('SEED_DEMO_PASSWORD is not set or is shorter than 8 characters. Set it in server/.env before seeding.');
    process.exit(1);
  }
  return password;
};

module.exports = { readSeedPassword };
