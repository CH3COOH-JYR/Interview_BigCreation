// 访谈相关API路由
const express = require('express');
const router = express.Router();
const interviewController = require('./interviewController');

// 开始新访谈
router.post('/', interviewController.startInterview);

// 获取访谈状态
router.get('/:id', interviewController.getInterviewStatus);

// 提交用户回答
router.post('/:id/response', interviewController.submitResponse);

// 获取下一个问题
router.post('/:id/next', interviewController.getNextQuestion);

// 结束访谈
router.post('/:id/end', interviewController.endInterview);

// 获取特定主题的所有访谈
router.get('/topic/:topicId', interviewController.getInterviewsByTopic);

module.exports = router;
