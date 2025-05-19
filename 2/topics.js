const express = require('express');
const router = express.Router();
const topicController = require('../../controllers/topicController');

// 获取所有访谈主题
router.get('/', topicController.getAllTopics);

// 创建新访谈主题
router.post('/', topicController.createTopic);

// 获取特定访谈主题
router.get('/:id', topicController.getTopicById);

// 更新访谈主题
router.put('/:id', topicController.updateTopic);

// 删除访谈主题
router.delete('/:id', topicController.deleteTopic);

module.exports = router;
