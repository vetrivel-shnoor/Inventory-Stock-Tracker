const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect({ superadmin: true }), getAuditLogs);

module.exports = router;
