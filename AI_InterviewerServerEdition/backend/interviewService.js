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

  console.log('开始创建访谈，AI准备中...');

  // 同时生成背景问题和评分指标，确保AI充分准备
  const [backgroundQuestion, ratingMetrics] = await Promise.allSettled([
    modelService.generateBackgroundQuestion(topic.outline),
    modelService.analyzeInterviewOutline(topic.outline, topic.keyQuestions)
  ]);

  // 处理背景问题生成结果
  let finalBackgroundQuestion;
  if (backgroundQuestion.status === 'fulfilled' && backgroundQuestion.value) {
    finalBackgroundQuestion = backgroundQuestion.value;
    console.log('背景问题生成成功:', finalBackgroundQuestion);
  } else {
    console.error('背景问题生成失败，使用默认问题:', backgroundQuestion.reason);
    finalBackgroundQuestion = '欢迎参与本次访谈！请先简单介绍一下您的背景和与今天访谈主题的相关经验。';
  }

  // 处理评分指标生成结果
  let finalRatingMetrics;
  if (ratingMetrics.status === 'fulfilled' && ratingMetrics.value) {
    finalRatingMetrics = ratingMetrics.value;
    console.log('评分指标生成成功:', finalRatingMetrics);
  } else {
    console.error('评分指标生成失败，使用默认指标:', ratingMetrics.reason);
    finalRatingMetrics = [
      '回答完整性',
      '思考深度', 
      '逻辑清晰度',
      '个人见解',
      '表达能力'
    ];
  }

  // 创建新访谈，包含第一个问题
  const newInterview = new Interview({
    topicId,
    status: 'in-progress',
    currentQuestionIndex: 0,
    dialogHistory: [
      {
        role: 'interviewer',
        content: finalBackgroundQuestion,
        timestamp: new Date()
      }
    ],
    ratingMetrics: finalRatingMetrics,
    isAIReady: true // 标记AI已准备就绪
  });

  // 保存访谈记录
  const savedInterview = await newInterview.save();
  console.log('访谈创建完成，AI已准备就绪，ID:', savedInterview._id);
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

  // 获取当前问题
  const currentQuestion = getCurrentQuestion(interview);

  // 首先检查回答是否偏题
  const offTopicCheck = await modelService.checkOffTopicAndGuide(currentQuestion, response);

  if (offTopicCheck.isOffTopic && offTopicCheck.guidance) {
    console.log('检测到回答偏题，提供引导');

    // 添加引导解释到对话历史
    interview.dialogHistory.push({
      role: 'interviewer',
      content: offTopicCheck.guidance,
      timestamp: new Date()
    });

    // 保存访谈
    await interview.save();

    // 返回引导信息，不进行深度分析
    return {
      isOffTopic: true,
      nextQuestion: offTopicCheck.guidance,
      guidance: true,
      shouldMoveToNext: false
    };
  }

  // 如果回答切题，继续原有的深度分析逻辑
  const depth = await modelService.evaluateResponse(currentQuestion, response);

  let nextQuestion;
  const isBackgroundQuestion = interview.currentQuestionIndex === 0;
  const maxFollowUps = isBackgroundQuestion ? 2 : 4;

  // 根据回答深度和追问次数决定是否追问
  if ((depth === 'SURFACE' || depth === 'DEEPER') && interview.followUpCount < maxFollowUps) {
    // 生成深入问题
    nextQuestion = await modelService.generateDeeperQuestion(currentQuestion, response);

    // 增加追问计数
    interview.followUpCount++;

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
    isOffTopic: false,
    depth,
    nextQuestion: nextQuestion || null,
    guidance: false,
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
  const nextQuestionIndex = interview.currentQuestionIndex + 1;

  // 检查是否即将到达最后一个问题
  if (nextQuestionIndex >= topic.keyQuestions.length) {
    // 所有问题已问完，自然结束访谈
    return {
      isLastQuestion: true,
      needsConfirmation: false,
      message: '感谢您参加访谈，将在3秒后进入总结界面',
      shouldAutoEnd: true
    };
  }

  // 检查是否是最后一个问题
  const isLastQuestion = nextQuestionIndex === topic.keyQuestions.length - 1;

  if (isLastQuestion) {
    return {
      isLastQuestion: true,
      needsConfirmation: true,
      nextQuestion: topic.keyQuestions[nextQuestionIndex],
      questionIndex: nextQuestionIndex,
      totalQuestions: topic.keyQuestions.length,
      message: '这已经是最后一个问题了，确定要继续吗？'
    };
  }

  // 移动到下一个问题
  interview.currentQuestionIndex = nextQuestionIndex;
  interview.followUpCount = 0; // 为下一个主问题重置追问计数器

  // 获取当前问题
  const currentQuestion = topic.keyQuestions[interview.currentQuestionIndex];

  // 生成过渡语句，提供更多上下文
  const previousQuestion = interview.currentQuestionIndex > 0
    ? topic.keyQuestions[interview.currentQuestionIndex - 1]
    : null;

  // 获取最近的对话历史作为上下文
  const recentDialogHistory = interview.dialogHistory.slice(-4); // 最近4条对话
  const contextText = recentDialogHistory.map(d => `${d.role === 'interviewer' ? '访谈员' : '受访者'}: ${d.content}`).join('\n');

  const transition = await modelService.generateTransitionWithContext(
    previousQuestion, 
    currentQuestion, 
    contextText,
    interview.currentQuestionIndex,
    topic.keyQuestions.length
  );

  // 添加过渡语句和问题到对话历史
  const fullText = transition ? `${transition} ${currentQuestion}` : currentQuestion;
  interview.dialogHistory.push({
    role: 'interviewer',
    content: fullText,
    timestamp: new Date()
  });

  // 保存访谈
  await interview.save();

  // 返回结果
  return {
    question: currentQuestion,
    transition,
    fullText,
    questionIndex: interview.currentQuestionIndex,
    totalQuestions: topic.keyQuestions.length,
    isLastQuestion: false
  };
};

// 确认进入最后问题
exports.confirmLastQuestion = async (interviewId) => {
  const interview = await Interview.findById(interviewId).populate('topicId');
  if (!interview || interview.status === 'completed') {
    return null;
  }

  const topic = interview.topicId;
  const lastQuestionIndex = topic.keyQuestions.length - 1;

  // 移动到最后一个问题
  interview.currentQuestionIndex = lastQuestionIndex;
  interview.followUpCount = 0;

  const lastQuestion = topic.keyQuestions[lastQuestionIndex];
  const previousQuestion = lastQuestionIndex > 0 ? topic.keyQuestions[lastQuestionIndex - 1] : null;

  // 获取最近的对话历史作为上下文
  const recentDialogHistory = interview.dialogHistory.slice(-4);
  const contextText = recentDialogHistory.map(d => `${d.role === 'interviewer' ? '访谈员' : '受访者'}: ${d.content}`).join('\n');

  const transition = await modelService.generateTransitionWithContext(
    previousQuestion,
    lastQuestion,
    contextText,
    lastQuestionIndex,
    topic.keyQuestions.length
  );

  const fullText = transition ? `${transition} ${lastQuestion}` : lastQuestion;
  interview.dialogHistory.push({
    role: 'interviewer',
    content: fullText,
    timestamp: new Date()
  });

  await interview.save();

  return {
    question: lastQuestion,
    transition,
    fullText,
    questionIndex: lastQuestionIndex,
    totalQuestions: topic.keyQuestions.length,
    isLastQuestion: true
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
  // 只返回已完成且有关联总结的访谈
  return await Interview.find({ 
    topicId: topicId,
    status: 'completed',
    summary: { $exists: true, $ne: null } 
  }).populate('topicId').sort({ createdAt: -1 });
};
