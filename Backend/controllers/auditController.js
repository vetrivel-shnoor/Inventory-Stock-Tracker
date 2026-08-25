const AuditLog = require('../models/AuditLog');

/**
 * Get all audit logs with pagination
 * @route GET /api/audit-logs
 * @access Private/SuperAdmin
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const logs = await AuditLog.find()
      .populate('performedBy', 'fullname email role')
      .populate('entityId', 'name sku')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments();

    res.json({
      data: logs,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalLogs: total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
