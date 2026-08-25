const mongoose = require("mongoose");
const Schema = mongoose.Schema;

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
