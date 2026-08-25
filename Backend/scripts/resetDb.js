require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const AllowedEmail = require('../models/AllowedEmail');

async function resetDb() {
  try {
    console.log("🌱 Connecting to database...");
    const uri = process.env.MONGO_DB?.trim() || "mongodb://127.0.0.1:27017/sass";
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    console.log("🗑️ Wiping all data from collections...");
    await Product.deleteMany({});
    await Transaction.deleteMany({});
    await AuditLog.deleteMany({});
    if (AllowedEmail) {
      await AllowedEmail.deleteMany({});
    }
    
    // Clear all users except superadmin
    await User.deleteMany({ role: { $ne: 'superadmin' } });
    console.log("✅ Cleared Products, Transactions, Audit Logs, and non-superadmin Users.");

    console.log("🎉 Database reset complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Reset DB Error:", error);
    process.exit(1);
  }
}

resetDb();
