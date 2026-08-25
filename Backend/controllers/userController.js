const User = require('../models/userModel');
const bcrypt = require('bcryptjs');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

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
