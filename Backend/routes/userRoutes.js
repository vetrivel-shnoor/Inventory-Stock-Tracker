const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect({ superadmin: true })); // Only superadmins can access these routes

router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.post('/bulk-delete', userController.deleteBulkUsers);
router.put('/:id', userController.updateUser);
router.put('/:id/role', userController.updateUserRole);
router.delete('/:id', userController.deleteUser);

module.exports = router;
