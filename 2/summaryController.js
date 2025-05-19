const summaryService = require('../services/summaryService');

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
