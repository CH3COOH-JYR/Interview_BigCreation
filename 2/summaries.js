// 总结相关API路由
const express = require('express');
const router = express.Router();
const summaryController = require('../../controllers/summaryController');

// 获取访谈总结
router.get('/:interviewId', summaryController.getSummary);

// 导出总结
router.post('/:interviewId/export', summaryController.exportSummary);

// 获取所有总结
router.get('/', summaryController.getAllSummaries);

module.exports = router;
