const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');
const { mediaQueue } = require('../services/queue');
const fs = require('fs');
const path = require('path');
const cacheService = require('../services/cacheService');

/**
 * Get distinct product categories (from Cache or DB if expired).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await cacheService.getCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get all products with optional filtering (search, category, low stock).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.getProducts = async (req, res) => {
  try {
    const { search, category, lowStock } = req.query;
    let query = { isArchived: false };

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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(query)
    ]);
    
    res.json({
      data: products,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
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

    // Invalidate categories cache to ensure the new category is picked up
    await cacheService.invalidateCategories();

    // Audit Log
    if (req.user) {
      await AuditLog.create({
        action: 'PRODUCT_CREATED',
        entity: 'PRODUCT',
        entityId: product._id,
        performedBy: req.user._id,
        details: { sku, name, initialStock }
      });
    }

    res.status(201).json(product);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    if (error.code === 11000 && error.keyPattern && error.keyPattern.sku) {
      return res.status(400).json({ message: 'A product with this SKU already exists' });
    }
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

    // Invalidate cache in case a category was changed/added
    if (category) {
      await cacheService.invalidateCategories();
    }

    // Audit Log
    if (req.user) {
      await AuditLog.create({
        action: 'PRODUCT_UPDATED',
        entity: 'PRODUCT',
        entityId: product._id,
        performedBy: req.user._id,
        details: updateData
      });
    }

    res.json(product);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.sku) {
      return res.status(400).json({ message: 'A product with this SKU already exists' });
    }
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
  try {
    const product = await Product.findById(req.params.id);
    if (!product || product.isArchived) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.isArchived = true;
    await product.save();

    if (req.user) {
      await AuditLog.create({
        action: 'PRODUCT_ARCHIVED',
        entity: 'PRODUCT',
        entityId: product._id,
        performedBy: req.user._id,
        details: { sku: product.sku }
      });
    }

    res.json({ message: 'Product archived successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Bulk delete products by an array of IDs.
 */
exports.deleteBulkProducts = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'Provide an array of product IDs' });
  }

  try {
    const result = await Product.updateMany(
      { _id: { $in: ids } }, 
      { isArchived: true }
    );

    if (req.user) {
      await AuditLog.create({
        action: 'PRODUCT_BULK_ARCHIVED',
        entity: 'PRODUCT',
        performedBy: req.user._id,
        details: { archivedCount: result.modifiedCount, ids }
      });
    }

    res.json({ message: `Successfully archived ${result.modifiedCount} products.` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
