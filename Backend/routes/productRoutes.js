const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

router.post('/', protect({ admin: true }), upload.single('image'), productController.createProduct);
router.put('/:id', protect({ admin: true }), upload.single('image'), productController.updateProduct);
router.delete('/:id', protect({ admin: true }), productController.deleteProduct);

module.exports = router;
