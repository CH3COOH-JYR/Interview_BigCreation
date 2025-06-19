const topicService = require('./topicService');

// 获取所有访谈主题
exports.getAllTopics = async (req, res) => {
  try {
    const topics = await topicService.getAllTopics();
    res.json({ success: true, data: topics });
  } catch (error) {
    console.error('Error getting topics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 创建新访谈主题
exports.createTopic = async (req, res) => {
  try {
    const { title, outline, keyQuestions } = req.body;

    // 验证必要字段
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: '主题标题是必需的'
      });
    }

    if (!outline || !outline.trim()) {
      return res.status(400).json({
        success: false,
        message: '访谈大纲是必需的'
      });
    }

    if (!keyQuestions || !Array.isArray(keyQuestions) || keyQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: '至少需要一个关键问题'
      });
    }

    // 过滤掉空的问题
    const filteredQuestions = keyQuestions.filter(q => q && q.trim() !== '');
    if (filteredQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: '至少需要一个有效的关键问题'
      });
    }

    const newTopic = await topicService.createTopic({
      title: title.trim(),
      outline: outline.trim(),
      keyQuestions: filteredQuestions
    });

    res.status(201).json({ success: true, data: newTopic });
  } catch (error) {
    console.error('Error creating topic:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 获取特定访谈主题
exports.getTopicById = async (req, res) => {
  try {
    const topic = await topicService.getTopicById(req.params.id);
    if (!topic) {
      return res.status(404).json({ success: false, message: '未找到访谈主题' });
    }
    res.json({ success: true, data: topic });
  } catch (error) {
    console.error('Error getting topic:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 更新访谈主题
exports.updateTopic = async (req, res) => {
  try {
    const { title, outline, keyQuestions } = req.body;
    const updatedTopic = await topicService.updateTopic(req.params.id, {
      title,
      outline,
      keyQuestions
    });

    if (!updatedTopic) {
      return res.status(404).json({ success: false, message: '未找到访谈主题' });
    }

    res.json({ success: true, data: updatedTopic });
  } catch (error) {
    console.error('Error updating topic:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 删除访谈主题
exports.deleteTopic = async (req, res) => {
  try {
    const result = await topicService.deleteTopic(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: '未找到访谈主题' });
    }
    res.json({ success: true, message: '访谈主题已成功删除' });
  } catch (error) {
    console.error('Error deleting topic:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
