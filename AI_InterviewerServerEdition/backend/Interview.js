const mongoose = require('mongoose');

const InterviewSchema = new mongoose.Schema({
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed'],
    default: 'in-progress'
  },
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  followUpCount: {
    type: Number,
    default: 0
  },
  dialogHistory: [{
    role: {
      type: String,
      enum: ['interviewer', 'interviewee'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  ratingMetrics: [{
    type: String
  }], // 存储评分指标
  summary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Summary'
  }, // 引用总结文档
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时自动更新updatedAt字段
InterviewSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Interview', InterviewSchema);
