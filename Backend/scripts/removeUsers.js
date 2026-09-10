require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/userModel');

async function removeAllUsers() {
  try {
    console.log("🔌 Connecting to database...");
    await mongoose.connect(process.env.MONGO_DB);
    console.log("✅ Connected to MongoDB");

    console.log("🗑️ Deleting all users and superadmins...");
    const result = await User.deleteMany({});
    console.log(`✅ Successfully deleted ${result.deletedCount} users.`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error deleting users:", error);
    process.exit(1);
  }
}

removeAllUsers();
