const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
  deleteBulkUsers,
  getAllowedEmails,
  addAllowedEmailsBulk,
  deleteAllowedEmail
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect({ admin: true })); // Superadmins and Admins can access

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.put("/:id/role", updateUserRole);
router.delete("/:id", deleteUser);
router.delete("/", deleteBulkUsers);

// Allowlist Routes (Only Superadmins and Admins)
router.get("/allowlist/emails", getAllowedEmails);
router.post("/allowlist/bulk", addAllowedEmailsBulk);
router.delete("/allowlist/:id", deleteAllowedEmail);

module.exports = router;
