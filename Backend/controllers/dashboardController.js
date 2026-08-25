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

    // 1. Category Distribution
    const categoryDistribution = await Product.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: '$category', count: { $sum: 1 }, value: { $sum: { $multiply: ['$currentStock', '$price'] } } } },
      { $sort: { value: -1 } }
    ]);

    // 2. Critical Low Stock
    const urgentLowStock = await Product.find({
      isArchived: false,
      $expr: { $lte: ['$currentStock', '$lowStockThreshold'] }
    })
    .sort({ currentStock: 1 })
    .limit(5)
    .select('name sku currentStock lowStockThreshold');

    // 3. Recent Transactions
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('product', 'name sku price')
      .populate('performedBy', 'name');

    // 4. 7-Day Stock Flow
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const flowData = await Transaction.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { 
        $group: {
          _id: { 
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            type: "$type"
          },
          totalValue: { $sum: "$totalValue" },
          totalQuantity: { $sum: "$quantity" }
        }
      }
    ]);
    
    // Process flow data into a continuous 7-day array
    const sevenDayFlow = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const inData = flowData.find(f => f._id.date === dateStr && f._id.type === 'IN');
      const outData = flowData.find(f => f._id.date === dateStr && f._id.type === 'OUT');
      
      sevenDayFlow.push({
        date: dateStr,
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        inValue: inData ? inData.totalValue : 0,
        outValue: outData ? outData.totalValue : 0,
        inQuantity: inData ? inData.totalQuantity : 0,
        outQuantity: outData ? outData.totalQuantity : 0,
      });
    }

    res.json({
      totalProducts,
      lowStockCount,
      totalStockValue,
      recentTransactions,
      categoryDistribution,
      urgentLowStock,
      sevenDayFlow
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
