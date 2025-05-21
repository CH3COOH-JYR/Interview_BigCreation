const Summary = require('./Summary');
const Interview = require('./Interview');

// 获取访谈总结
exports.getSummaryByInterviewId = async (interviewId) => {
  return await Summary.findOne({ interviewId });
};

// 创建访谈总结
exports.createSummary = async (summaryData) => {
  const newSummary = new Summary(summaryData);
  return await newSummary.save();
};

// 导出总结
exports.exportSummary = async (interviewId, format = 'json') => {
  const summary = await Summary.findOne({ interviewId });

  if (!summary) {
    return null;
  }

  const interview = await Interview.findById(interviewId).populate('topicId');

  if (!interview) {
    return null;
  }

  // 根据格式导出
  switch (format.toLowerCase()) {
    case 'json':
      return {
        topic: interview.topicId.title,
        outline: interview.topicId.outline,
        takeaways: summary.takeaways,
        points: summary.points,
        explanations: summary.explanations,
        exportedAt: new Date()
      };

    case 'text':
      let textContent = `访谈主题: ${interview.topicId.title}\n`;
      textContent += `访谈大纲: ${interview.topicId.outline}\n\n`;
      textContent += `主要收获:\n${summary.takeaways}\n\n`;
      textContent += `评分与说明:\n`;

      for (let i = 0; i < summary.points.length; i++) {
        textContent += `${i + 1}. 评分: ${summary.points[i]}\n   说明: ${summary.explanations[i]}\n\n`;
      }

      textContent += `导出时间: ${new Date().toLocaleString()}`;

      return { content: textContent };

    default:
      return {
        topic: interview.topicId.title,
        outline: interview.topicId.outline,
        takeaways: summary.takeaways,
        points: summary.points,
        explanations: summary.explanations,
        exportedAt: new Date()
      };
  }
};

// 获取所有总结
exports.getAllSummaries = async () => {
  return await Summary.find().populate({
    path: 'interviewId',
    populate: { path: 'topicId', select: 'title' }
  }).sort({ createdAt: -1 });
};
