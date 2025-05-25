const summaryService = require('./summaryService');

// 创建访谈总结
exports.createSummary = async (req, res) => {
  try {
    const { interviewId, topicId, topicTitle, summaryNumber, takeaways, points, explanations } = req.body;

    if (!interviewId || !topicId || !topicTitle || !summaryNumber || !takeaways || !points || !explanations) {
      return res.status(400).json({
        success: false,
        message: '缺少必要的总结数据'
      });
    }

    const summary = await summaryService.createSummary({
      interviewId,
      topicId,
      topicTitle,
      summaryNumber,
      takeaways,
      points,
      explanations
    });

    res.status(201).json({ success: true, data: summary });
  } catch (error) {
    console.error('Error creating summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 获取访谈总结
exports.getSummary = async (req, res) => {
  try {
    const summary = await summaryService.getSummaryByInterviewId(req.params.interviewId);

    if (!summary) {
      return res.status(404).json({ success: false, message: '未找到访谈总结' });
    }

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 导出总结
exports.exportSummary = async (req, res) => {
  try {
    const { format } = req.body;
    const result = await summaryService.exportSummary(req.params.interviewId, format || 'json');

    if (!result) {
      return res.status(404).json({ success: false, message: '未找到访谈总结' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error exporting summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 获取所有总结
exports.getAllSummaries = async (req, res) => {
  try {
    const summaries = await summaryService.getAllSummaries();
    res.json({ success: true, data: summaries });
  } catch (error) {
    console.error('Error getting all summaries:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
