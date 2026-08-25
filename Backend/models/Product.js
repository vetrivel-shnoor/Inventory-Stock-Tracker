const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  category: {
    type: String,
    required: true,
    index: true,
  },
  price: {
    type: Number,
    required: true,
  },
  currentStock: {
    type: Number,
    default: 0,
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
  },
  image: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
