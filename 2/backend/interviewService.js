const Interview = require('./Interview');
const Topic = require('./Topic');
const modelService = require('./modelService');

// 开始新访谈
exports.startInterview = async (topicId) => {
  // 检查主题是否存在
  const topic = await Topic.findById(topicId);
  if (!topic) {
    throw new Error('访谈主题不存在');
  }

  console.log('开始创建访谈，同步生成背景问题...');

  // 先生成背景问题
  let backgroundQuestion;
  try {
    backgroundQuestion = await modelService.generateBackgroundQuestion(topic.outline);
    console.log('背景问题生成成功:', backgroundQuestion);
  } catch (error) {
    console.error('背景问题生成失败，使用默认问题:', error);
    backgroundQuestion = '欢迎参与本次访谈！请先简单介绍一下您的背景和与今天访谈主题的相关经验。';
  }

  // 创建新访谈，包含第一个问题
  const newInterview = new Interview({
    topicId,
    status: 'in-progress',
    currentQuestionIndex: 0,
    dialogHistory: [
      {
        role: 'interviewer',
        content: backgroundQuestion,
        timestamp: new Date()
      }
    ],
    ratingMetrics: [
      '回答完整性',
      '思考深度',
      '逻辑清晰度',
      '个人见解',
      '表达能力'
    ] // 使用默认评分指标，避免启动时的AI调用延迟
  });

  // 保存访谈记录
  const savedInterview = await newInterview.save();

  // 异步生成评分指标（不阻塞主流程）
  setImmediate(async () => {
    try {
      const ratingMetrics = await modelService.analyzeInterviewOutline(topic.outline, topic.keyQuestions);
      const interview = await Interview.findById(savedInterview._id);
      interview.ratingMetrics = ratingMetrics;
      await interview.save();
      console.log('评分指标生成成功:', ratingMetrics);
    } catch (metricsError) {
      console.error('评分指标生成失败，使用默认指标:', metricsError);
    }
  });

  console.log('访谈创建完成，ID:', savedInterview._id);
  return savedInterview;
};

// 获取访谈信息
exports.getInterviewById = async (id) => {
  return await Interview.findById(id).populate('topicId');
};

// 提交用户回答
exports.submitResponse = async (interviewId, response) => {
  // 获取访谈
  const interview = await Interview.findById(interviewId).populate('topicId');
  if (!interview || interview.status === 'completed') {
    return null;
  }

  // 添加用户回答到对话历史
  interview.dialogHistory.push({
    role: 'interviewee',
    content: response,
    timestamp: new Date()
  });

  // 分析回答深度
  const currentQuestion = getCurrentQuestion(interview);
  const depth = await modelService.evaluateResponse(currentQuestion, response);

  let nextQuestion;

  // 根据回答深度决定是否追问
  if (depth === 'SURFACE' || depth === 'DEEPER') {
    // 生成深入问题
    nextQuestion = await modelService.generateDeeperQuestion(currentQuestion, response);

    // 添加追问到对话历史
    interview.dialogHistory.push({
      role: 'interviewer',
      content: nextQuestion,
      timestamp: new Date()
    });
  }

  // 保存访谈
  await interview.save();

  // 返回结果
  return {
    depth,
    nextQuestion: nextQuestion || null,
    shouldMoveToNext: !nextQuestion
  };
};

// 获取下一个问题
exports.getNextQuestion = async (interviewId) => {
  // 获取访谈
  const interview = await Interview.findById(interviewId).populate('topicId');
  if (!interview || interview.status === 'completed') {
    return null;
  }

  const topic = interview.topicId;

  // 移动到下一个问题
  interview.currentQuestionIndex++;

  // 检查是否已经问完所有问题
  if (interview.currentQuestionIndex >= topic.keyQuestions.length) {
    // 所有问题已问完，结束访谈
    interview.status = 'completed';
    await interview.save();

    // 生成访谈总结
    await modelService.generateSummary(interviewId);

    return {
      isCompleted: true,
      message: '访谈已完成'
    };
  }

  // 获取当前问题
  const currentQuestion = topic.keyQuestions[interview.currentQuestionIndex];

  // 生成过渡语句
  const previousQuestion = interview.currentQuestionIndex > 0
    ? topic.keyQuestions[interview.currentQuestionIndex - 1]
    : null;

  const transition = await modelService.generateTransition(previousQuestion, currentQuestion);

  // 添加过渡语句和问题到对话历史
  interview.dialogHistory.push({
    role: 'interviewer',
    content: `${transition} ${currentQuestion}`,
    timestamp: new Date()
  });

  // 保存访谈
  await interview.save();

  // 返回结果
  return {
    question: currentQuestion,
    transition,
    fullText: `${transition} ${currentQuestion}`,
    questionIndex: interview.currentQuestionIndex,
    totalQuestions: topic.keyQuestions.length
  };
};

// 结束访谈
exports.endInterview = async (interviewId) => {
  // 获取访谈
  const interview = await Interview.findById(interviewId);
  if (!interview || interview.status === 'completed') {
    return null;
  }

  // 更新状态
  interview.status = 'completed';
  await interview.save();

  // 生成访谈总结
  const summary = await modelService.generateSummary(interviewId);

  return {
    isCompleted: true,
    summaryId: summary._id
  };
};

// 辅助函数：获取当前问题
function getCurrentQuestion(interview) {
  const topic = interview.topicId;
  return topic.keyQuestions[interview.currentQuestionIndex];
}

// 获取特定主题的所有访谈
exports.getInterviewsByTopic = async (topicId) => {
  return await Interview.find({ topicId: topicId }).populate('topicId').sort({ createdAt: -1 });
};
