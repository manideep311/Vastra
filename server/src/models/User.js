const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['buyer', 'supplier'],
      required: true,
    },
    onboardingComplete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

// Instance method: check a plain-text password against the stored hash
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);