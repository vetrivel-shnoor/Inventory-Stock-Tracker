const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");

let isSeeding = false;

const seedSuperAdmin = async () => {
  if (isSeeding) return;
  isSeeding = true;

  try {
    const email = process.env.DEFAULT_SUPERADMIN_EMAIL;
    const password = process.env.DEFAULT_SUPERADMIN_PASSWORD;

    if (!email || !password) {
      console.warn("⚠️ DEFAULT_SUPERADMIN_EMAIL or DEFAULT_SUPERADMIN_PASSWORD not set in env.");
      return;
    }

    const existingAdmins = await User.find({ email });

    if (existingAdmins.length > 1) {
      // Clean up duplicates if multiple exist
      const [keep, ...duplicates] = existingAdmins;
      await User.deleteMany({ _id: { $in: duplicates.map((d) => d._id) } });
      console.log(`🧹 Cleaned up ${duplicates.length} duplicate superadmin account(s).`);
    } else if (existingAdmins.length === 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({
        fullname: "System Admin",
        username: "superadmin",
        email: email,
        password: hashedPassword,
        role: "superadmin",
      });
      console.log(`✅ Default Superadmin seeded: ${email}`);
    }
  } catch (error) {
    console.error("❌ Error seeding superadmin:", error);
  } finally {
    isSeeding = false;
  }
};

module.exports = seedSuperAdmin;
