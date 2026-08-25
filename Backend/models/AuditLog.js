const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g., 'PRODUCT_ARCHIVED', 'PRICE_CHANGED'
  entity: { type: String, default: 'PRODUCT' },
  entityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  details: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
