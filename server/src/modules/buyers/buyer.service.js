const BuyerProfile = require('../../models/BuyerProfile');
const User = require('../../models/User');
const { httpError, requireString, optionalString, stringList } = require('../../utils/validate');

const MAX_ADDRESSES = 20;

const sanitizeAddress = (input = {}, { partial = false } = {}) => {
  const out = {};
  if (!partial || input.address !== undefined) out.address = requireString(input.address, 'Address', { min: 10, max: 500 });
  if (!partial || input.contact !== undefined) out.contact = requireString(input.contact, 'Contact', { min: 7, max: 30 });
  if (input.label !== undefined) out.label = optionalString(input.label, 'Label', { max: 40 }) || 'Default';
  if (input.isDefault !== undefined) out.isDefault = Boolean(input.isDefault);
  return out;
};

const completeOnboarding = async (userId, onboardingData) => {
  const {
    businessType,
    industry,
    categoriesOfInterest,
    preferredFabricTypes,
    typicalOrderQuantity,
    budgetRange,
  } = onboardingData || {};

  // upsert: create the profile if it doesn't exist, update it if it does
  const profile = await BuyerProfile.findOneAndUpdate(
    { userId },
    {
      businessType: optionalString(businessType, 'Business type', { max: 60 }),
      industry: optionalString(industry, 'Industry', { max: 60 }),
      categoriesOfInterest: stringList(categoriesOfInterest, 'Categories') || [],
      preferredFabricTypes: stringList(preferredFabricTypes, 'Fabric types') || [],
      typicalOrderQuantity: optionalString(typicalOrderQuantity, 'Order quantity', { max: 60 }),
      budgetRange: optionalString(budgetRange, 'Budget range', { max: 60 }),
    },
    { returnDocument: 'after', upsert: true, runValidators: true }
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

const addAddress = async (userId, input) => {
  const address = sanitizeAddress(input);
  const existing = await BuyerProfile.findOne({ userId }).select('addresses').lean();
  if ((existing?.addresses?.length || 0) >= MAX_ADDRESSES) throw httpError(400, 'Address book is full');
  if (address.isDefault) {
    await BuyerProfile.updateOne({ userId }, { $set: { 'addresses.$[].isDefault': false } });
  }
  const profile = await BuyerProfile.findOneAndUpdate(
    { userId },
    { $push: { addresses: address } },
    { returnDocument: 'after', upsert: true, runValidators: true }
  );
  return profile;
};

const updateAddress = async (userId, addressId, input) => {
  const updates = sanitizeAddress(input, { partial: true });
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
    { returnDocument: 'after', runValidators: true }
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
    { returnDocument: 'after' }
  );
  if (!profile) {
    const error = new Error('Buyer profile not found');
    error.statusCode = 404;
    throw error;
  }
  return profile;
};

module.exports = { completeOnboarding, getProfile, addAddress, updateAddress, removeAddress };