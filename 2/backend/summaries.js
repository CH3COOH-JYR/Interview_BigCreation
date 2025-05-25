// 总结相关API路由
const express = require('express');
const router = express.Router();
const summaryController = require('./summaryController');

// 获取所有总结
router.get('/', summaryController.getAllSummaries);

// 创建访谈总结
router.post('/', summaryController.createSummary);

// 获取访谈总结
router.get('/:interviewId', summaryController.getSummary);

// 导出总结
router.post('/:interviewId/export', summaryController.exportSummary);

// 删除总结
router.delete('/:interviewId', summaryController.deleteSummary);

module.exports = router;
