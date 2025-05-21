const mongoose = require('mongoose');

const SummarySchema = new mongoose.Schema({
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
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

module.exports = mongoose.model('Summary', SummarySchema);
