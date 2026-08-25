const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const mongoose = require('mongoose');

exports.createTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { productId, type, quantity, reason } = req.body;
    
    const parsedQuantity = Number(quantity);
    if (parsedQuantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    const product = await Product.findById(productId).session(session);
    if (!product) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Product not found' });
    }

    if (type === 'OUT' && product.currentStock < parsedQuantity) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Insufficient stock for this transaction' });
    }

    // Update product stock
    if (type === 'IN') {
      product.currentStock += parsedQuantity;
    } else if (type === 'OUT') {
      product.currentStock -= parsedQuantity;
    } else {
      throw new Error('Invalid transaction type');
    }
    
    await product.save({ session });

    // Create transaction record
    const transaction = new Transaction({
      product: product._id,
      type,
      quantity: parsedQuantity,
      unitPrice: product.price,
      totalValue: parsedQuantity * product.price,
      reason,
      performedBy: req.user ? req.user._id : product._id, // Fallback if no user
    });
    
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(transaction);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const query = {};
    if (req.query.productId) {
      query.product = req.query.productId;
    }
    if (req.query.type) {
      query.type = req.query.type;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('product', 'name sku category price')
      .populate('performedBy', 'name email');
      
    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
