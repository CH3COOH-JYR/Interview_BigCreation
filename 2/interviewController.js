const interviewService = require('../services/interviewService');

// 开始新访谈
exports.startInterview = async (req, res) => {
  try {
    const { topicId } = req.body;
    
    if (!topicId) {
      return res.status(400).json({ 
        success: false, 
        message: '访谈主题ID是必需的' 
      });
    }
    
    const interview = await interviewService.startInterview(topicId);
    res.status(201).json({ success: true, data: interview });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 获取访谈状态
exports.getInterviewStatus = async (req, res) => {
  try {
    const interview = await interviewService.getInterviewById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ success: false, message: '未找到访谈' });
    }
    
    res.json({ success: true, data: interview });
  } catch (error) {
    console.error('Error getting interview status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 提交用户回答
exports.submitResponse = async (req, res) => {
  try {
    const { response } = req.body;
    
    if (!response) {
      return res.status(400).json({ 
        success: false, 
        message: '用户回答是必需的' 
      });
    }
    
    const result = await interviewService.submitResponse(req.params.id, response);
    
    if (!result) {
      return res.status(404).json({ success: false, message: '未找到访谈或访谈已结束' });
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error submitting response:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 获取下一个问题
exports.getNextQuestion = async (req, res) => {
  try {
    const result = await interviewService.getNextQuestion(req.params.id);
    
    if (!result) {
      return res.status(404).json({ success: false, message: '未找到访谈或访谈已结束' });
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting next question:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 结束访谈
exports.endInterview = async (req, res) => {
  try {
    const result = await interviewService.endInterview(req.params.id);
    
    if (!result) {
      return res.status(404).json({ success: false, message: '未找到访谈或访谈已结束' });
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error ending interview:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
