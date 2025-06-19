const mongoose = require('mongoose');

const SummarySchema = new mongoose.Schema({
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: true
  },
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true
  },
  topicTitle: {
    type: String,
    required: true
  },
  summaryNumber: {
    type: Number,
    required: true
  },
  takeaways: {
    type: String,
    required: true
  },
  points: {
    type: [Number],
    required: true
  },
  explanations: {
    type: [String],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 创建复合索引，确保同一主题下的总结编号唯一
SummarySchema.index({ topicId: 1, summaryNumber: 1 }, { unique: true });

module.exports = mongoose.model('Summary', SummarySchema);
