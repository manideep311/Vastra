const BuyerProfile = require('../../models/BuyerProfile');
const User = require('../../models/User');

const completeOnboarding = async (userId, onboardingData) => {
  const {
    businessType,
    industry,
    categoriesOfInterest,
    preferredFabricTypes,
    typicalOrderQuantity,
    budgetRange,
  } = onboardingData;

  // upsert: create the profile if it doesn't exist, update it if it does
  const profile = await BuyerProfile.findOneAndUpdate(
    { userId },
    { businessType, industry, categoriesOfInterest, preferredFabricTypes, typicalOrderQuantity, budgetRange },
    { new: true, upsert: true, runValidators: true }
  );

  await User.findByIdAndUpdate(userId, { onboardingComplete: true });

  return profile;
};

const getProfile = async (userId) => {
  const profile = await BuyerProfile.findOne({ userId });
  if (!profile) {
    const error = new Error('Buyer profile not found');
    error.statusCode = 404;
    throw error;
  }
  return profile;
};

// --- Address book (additive) ---

const addAddress = async (userId, address) => {
  if (address.isDefault) {
    await BuyerProfile.updateOne({ userId }, { $set: { 'addresses.$[].isDefault': false } });
  }
  const profile = await BuyerProfile.findOneAndUpdate(
    { userId },
    { $push: { addresses: address } },
    { new: true, upsert: true, runValidators: true }
  );
  return profile;
};

const updateAddress = async (userId, addressId, updates) => {
  if (updates.isDefault) {
    await BuyerProfile.updateOne({ userId }, { $set: { 'addresses.$[].isDefault': false } });
  }
  const profile = await BuyerProfile.findOneAndUpdate(
    { userId, 'addresses._id': addressId },
    {
      $set: {
        ...(updates.label !== undefined && { 'addresses.$.label': updates.label }),
        ...(updates.address !== undefined && { 'addresses.$.address': updates.address }),
        ...(updates.contact !== undefined && { 'addresses.$.contact': updates.contact }),
        ...(updates.isDefault !== undefined && { 'addresses.$.isDefault': updates.isDefault }),
      },
    },
    { new: true, runValidators: true }
  );
  if (!profile) {
    const error = new Error('Address not found');
    error.statusCode = 404;
    throw error;
  }
  return profile;
};

const removeAddress = async (userId, addressId) => {
  const profile = await BuyerProfile.findOneAndUpdate(
    { userId },
    { $pull: { addresses: { _id: addressId } } },
    { new: true }
  );
  if (!profile) {
    const error = new Error('Buyer profile not found');
    error.statusCode = 404;
    throw error;
  }
  return profile;
};

module.exports = { completeOnboarding, getProfile, addAddress, updateAddress, removeAddress };