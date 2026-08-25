const User = require('../models/userModel');
const AllowedEmail = require('../models/AllowedEmail');
const bcrypt = require('bcryptjs');

/**
 * Retrieve all users in the system (excluding their passwords).
 * Used by superadmins in the User Management dashboard.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments()
    ]);

    res.json({
      data: users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Create a new user account.
 * Hashes the provided password before saving.
 * Default role is 'user' if not specified.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.createUser = async (req, res) => {
  try {
    const { fullname, email, password, role } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      fullname,
      username: email.split('@')[0],
      email,
      password: hashedPassword,
      role: role || 'user',
    });

    await newUser.save();
    const userToReturn = newUser.toObject();
    delete userToReturn.password;

    res.status(201).json(userToReturn);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update a user's role (e.g., from 'user' to 'admin').
 * Protects 'superadmin' roles from being modified to prevent privilege escalation.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Prevent modifying other superadmins unless it's yourself (or just protect superadmins from being modified entirely via UI)
    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    if (targetUser.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot modify superadmin roles via this endpoint' });
    }

    targetUser.role = role;
    await targetUser.save();

    res.json(targetUser);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update comprehensive user details (name, email, role, password).
 * Hashes the new password if provided.
 * Contains safety checks to prevent modifying other superadmins.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullname, email, password, role } = req.body;

    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    if (targetUser.role === 'superadmin' && req.user && req.user._id.toString() !== id) {
       return res.status(403).json({ message: 'Cannot modify other superadmins' });
    }

    if (fullname) targetUser.fullname = fullname;
    if (email) targetUser.email = email;
    if (role && targetUser.role !== 'superadmin') targetUser.role = role;

    if (password) {
      targetUser.password = await bcrypt.hash(password, 10);
    }

    await targetUser.save();
    
    const userToReturn = targetUser.toObject();
    delete userToReturn.password;
    
    res.json(userToReturn);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Delete a user from the system.
 * Contains safety checks to prevent deleting a superadmin.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    if (targetUser.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete superadmins' });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Bulk delete users by an array of IDs.
 * Contains safety checks to prevent deleting superadmins.
 */
exports.deleteBulkUsers = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'Provide an array of user IDs' });
  }

  try {
    // Find all target users to check if any are superadmins
    const targetUsers = await User.find({ _id: { $in: ids } });
    const hasSuperadmin = targetUsers.some(u => u.role === 'superadmin');

    if (hasSuperadmin) {
      return res.status(403).json({ message: 'Cannot bulk delete superadmins. Operation aborted.' });
    }

    const result = await User.deleteMany({ _id: { $in: ids } });
    res.json({ message: `Successfully deleted ${result.deletedCount} users.` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get all allowed emails
 */
exports.getAllowedEmails = async (req, res) => {
  try {
    const emails = await AllowedEmail.find().populate('addedBy', 'fullname email').sort({ createdAt: -1 });
    res.json(emails);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Bulk add allowed emails
 */
exports.addAllowedEmailsBulk = async (req, res) => {
  try {
    const { emails } = req.body;
    if (!emails || typeof emails !== 'string') {
      return res.status(400).json({ message: 'Please provide a string of emails (comma or newline separated)' });
    }

    // Split by comma or newline, trim, and filter out empty
    const emailArray = emails.split(/[\n,]+/).map(e => e.trim().toLowerCase()).filter(e => e);
    
    if (emailArray.length === 0) {
      return res.status(400).json({ message: 'No valid emails found' });
    }

    let addedCount = 0;
    let duplicateCount = 0;

    for (const email of emailArray) {
      try {
        const existing = await AllowedEmail.findOne({ email });
        if (!existing) {
          await AllowedEmail.create({ email, addedBy: req.user._id });
          addedCount++;
        } else {
          duplicateCount++;
        }
      } catch (err) {
        console.error("Error adding allowed email:", err);
      }
    }

    res.status(201).json({ 
      message: `Successfully added ${addedCount} emails. ${duplicateCount > 0 ? `(${duplicateCount} were already allowed)` : ''}`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Delete an allowed email
 */
exports.deleteAllowedEmail = async (req, res) => {
  try {
    const { id } = req.params;
    await AllowedEmail.findByIdAndDelete(id);
    res.json({ message: 'Email removed from allowlist' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
