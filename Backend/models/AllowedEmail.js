const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * AllowedEmail Schema
 * Acts as a "Pending Invites" list or whitelist.
 * Emails listed here are authorized to register a new account.
 * Upon successful registration, the email is automatically removed from this collection.
 */
const AllowedEmailSchema = new Schema(
  {
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    addedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AllowedEmail", AllowedEmailSchema);
