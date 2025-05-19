const mongoose = require('mongoose');

const TopicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  outline: {
    type: String,
    required: true
  },
  keyQuestions: {
    type: [String],
    required: true
  },
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
TopicSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Topic', TopicSchema);
