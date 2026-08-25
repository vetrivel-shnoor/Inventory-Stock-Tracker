const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const { mediaQueue } = require('../services/queue');
const fs = require('fs');
const path = require('path');

/**
 * Get all products with optional filtering (search, category, low stock).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.getProducts = async (req, res) => {
  try {
    const { search, category, lowStock } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }

    if (lowStock === 'true') {
      query.$expr = { $lte: ['$currentStock', '$lowStockThreshold'] };
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get a single product by its ID, along with its recent transactions.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    const recentTransactions = await Transaction.find({ product: product._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('performedBy', 'name email');

    res.json({ product, transactions: recentTransactions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Create a new product. Uses a MongoDB session transaction to ensure atomicity.
 * If initial stock is provided, it automatically records an "IN" transaction.
 * Queues image processing if an image file is uploaded.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.createProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { name, sku, category, price, initialStock, lowStockThreshold } = req.body;
    
    const parsedPrice = Number(price);
    const parsedInitialStock = Number(initialStock) || 0;
    const parsedLowStockThreshold = Number(lowStockThreshold) || 10;
    
    const existingProduct = await Product.findOne({ sku }).session(session);
    if (existingProduct) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'SKU already exists' });
    }

    const product = new Product({
      name,
      sku,
      category,
      price: parsedPrice,
      currentStock: parsedInitialStock,
      lowStockThreshold: parsedLowStockThreshold,
      createdBy: req.user ? req.user._id : null, // Fallback if no user middleware
    });
    
    await product.save({ session });

    if (parsedInitialStock > 0) {
      const transaction = new Transaction({
        product: product._id,
        type: 'IN',
        quantity: parsedInitialStock,
        unitPrice: parsedPrice,
        totalValue: parsedInitialStock * parsedPrice,
        reason: 'Initial Stock',
        performedBy: req.user ? req.user._id : product._id, // Fallback if no user
      });
      await transaction.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    if (req.file) {
      // dispatch to mediaQueue
      await mediaQueue.add('process-image', {
        fileId: product._id,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        outputDir: 'public/uploads/products',
        modelName: 'Product',
        fieldName: 'image'
      });
    }

    res.status(201).json(product);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update an existing product's details.
 * Queues image processing if a new image file is uploaded.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.updateProduct = async (req, res) => {
  try {
    const { name, category, price, lowStockThreshold } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (category) updateData.category = category;
    if (price) updateData.price = Number(price);
    if (lowStockThreshold !== undefined) updateData.lowStockThreshold = Number(lowStockThreshold);

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (req.file) {
      await mediaQueue.add('process-image', {
        fileId: product._id,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        outputDir: 'public/uploads/products',
        modelName: 'Product',
        fieldName: 'image'
      });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Delete a product by its ID. Uses a MongoDB session transaction to ensure
 * all related transactions are also deleted to maintain data integrity.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.deleteProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const product = await Product.findById(req.params.id).session(session);
    if (!product) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Product not found' });
    }

    await Transaction.deleteMany({ product: product._id }).session(session);
    await Product.findByIdAndDelete(product._id).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Product and related transactions deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
