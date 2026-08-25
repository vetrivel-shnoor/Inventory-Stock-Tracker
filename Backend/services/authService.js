const User = require("../models/userModel");
const AllowedEmail = require("../models/AllowedEmail");

/**
 * Checks if a given email is authorized to access the system.
 * 1. Superadmins (from ENV) are always allowed.
 * 2. Existing registered users are always allowed.
 * 3. New users must be present in the AllowedEmail collection (Pending Invites).
 */
async function isEmailAllowed(email) {
  if (!email) return false;
  const lowerEmail = email.toLowerCase().trim();
  
  // Superadmins are always allowed (from env)
  const superAdminEmails = (process.env.SUPERADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
  if (superAdminEmails.includes(lowerEmail)) return true;
  
  // If the user is already registered, they are inherently allowed
  const existingUser = await User.findOne({ email: lowerEmail });
  if (existingUser) return true;

  // Check the DB allowlist (pending invites)
  const allowed = await AllowedEmail.findOne({ email: lowerEmail });
  return !!allowed;
}

/**
 * Handles Google One Tap and OAuth login/signup.
 * Integrates with the Allowlist to reject unauthorized Google accounts.
 */
async function findOrCreateGoogleUser(profile) {
  // Check Allowlist first
  // Reject the Google Auth if they aren't invited/allowed
  const allowed = await isEmailAllowed(profile.email);
  if (!allowed) {
    throw new Error("Access Denied: Your email is not authorized by an administrator.");
  }

  // 1. Check by Google ID
  let user = await User.findOne({ googleId: profile.sub }); // Note: Google calls ID 'sub' in JWTs
  if (user) return user;

  // 2. Check by Email
  if (profile.email) {
    user = await User.findOne({ email: profile.email });
    if (user) {
      user.googleId = profile.sub;
      if (!user.profilePicture && profile.picture)
        user.profilePicture = profile.picture;
      await user.save();
      return user;
    }
  }

  // 3. Create New
  const newUser = await User.create({
    googleId: profile.sub,
    email: profile.email,
    fullname: profile.name,
    username: profile.email.split("@")[0],
    profilePicture: profile.picture,
    password: "google-onetap-" + Date.now(),
  });

  // Cleanup Allowlist (Pending Invites)
  // Remove the email from the allowlist since they successfully registered via Google
  await AllowedEmail.findOneAndDelete({ email: profile.email.toLowerCase().trim() });

  return newUser;
}

module.exports = { findOrCreateGoogleUser, isEmailAllowed };
