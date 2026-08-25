const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

exports.getStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    
    const lowStockCount = await Product.countDocuments({
      $expr: { $lte: ['$currentStock', '$lowStockThreshold'] }
    });

    const stockValueResult = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$currentStock', '$price'] } }
        }
      }
    ]);
    const totalStockValue = stockValueResult.length > 0 ? stockValueResult[0].totalValue : 0;

    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('product', 'name sku')
      .populate('performedBy', 'name');

    res.json({
      totalProducts,
      lowStockCount,
      totalStockValue,
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
