const axios = require('axios');

// AI 模型配置 - 使用第三方API服务
const API_URL = process.env.AI_API_URL || "https://api2.aigcbest.top/v1/chat/completions";
const MODEL_NAME = process.env.AI_MODEL_NAME || "deepseek-ai/DeepSeek-V3"; // 切换到非推理模型，速度更快
const API_KEY = process.env.AI_API_KEY || "sk-RJmjnuTdambdnNkhEYE0trdjBC1p8S2PghXrxPCRq760JIqA"; // 临时API Key
const ENABLE_AI = process.env.ENABLE_AI !== 'false'; // 默认启用AI，可通过环境变量禁用

// 采样参数
const DEFAULT_SAMPLING_PARAMS = {
  temperature: 0.6,
  top_p: 0.9,
  repetition_penalty: 1.02,
  max_tokens: 512
};

// AI API 调用函数
async function callAI(messages, samplingParams = DEFAULT_SAMPLING_PARAMS) {
  // 如果AI功能被禁用，直接返回null
  if (!ENABLE_AI) {
    console.log('AI功能已禁用，使用降级模式');
    return null;
  }

  // 检查API_KEY是否有效（现在允许测试用的2连串key）
  if (API_KEY === 'your_actual_api_key_here' || API_KEY.length < 10) {
    console.log('API Key配置无效，使用降级模式');
    return null;
  }

  try {
    const requestData = {
      model: MODEL_NAME,
      messages: messages,
      temperature: samplingParams.temperature,
      top_p: samplingParams.top_p,
      max_tokens: samplingParams.max_tokens
    };

    const response = await axios.post(API_URL, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      timeout: 10000 // 减少到10秒，提高用户体验
    });

    if (response.status === 200 && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content.trim();
    } else {
      throw new Error(`API Error: Invalid response format`);
    }
  } catch (error) {
    console.error('AI API Error:', error.message);

    // 提供详细的错误信息便于调试
    if (error.response) {
      console.error('API Response Status:', error.response.status);
      console.error('API Response Data:', JSON.stringify(error.response.data, null, 2));

      // 检查是否是API Key相关的错误
      if (error.response.data && error.response.data.error) {
        const errorMsg = error.response.data.error.message || '';
        if (errorMsg.includes('令牌') || errorMsg.includes('token') || errorMsg.includes('key')) {
          console.error('API Key验证失败，请检查API Key是否正确');
        }
      }
    }

    // 返回null，触发降级模式
    return null;
  }
}

// 检查用户是否不愿回答
exports.checkUnanswerable = async (currentQuestion, userResponse) => {
  const messages = [
    {
      role: "system",
      content: (
        "You are an expert in analyzing user responses. The user might be reluctant or uncomfortable answering. "
        + "We want a YES/NO decision: \n"
        + " - YES: The user is unwilling, reluctant, or implicitly refusing to answer. \n"
        + " - NO: Otherwise.\n"
        + "Only output 'YES' or 'NO'."
      )
    },
    {
      role: "user",
      content: (
        `当前问题: ${currentQuestion}\n`
        + `用户回答: ${userResponse}\n\n`
        + "请判断：该用户是否不愿回答当前问题？"
      )
    }
  ];

  const result = await callAI(messages);
  const decision = result.toUpperCase();
  return decision.includes("YES") ? "YES" : "NO";
};

// 生成背景问题
exports.generateBackgroundQuestion = async (interviewOutline) => {
  const messages = [
    {
      role: "system",
      content: (
        "You are a skilled interviewer. Generate ONE short introductory question to learn about "
        + "the interviewee's overall background or personal connection with the interview theme. "
        + "ONLY output the question itself, without any explanations, analysis, or additional text."
      )
    },
    {
      role: "user",
      content: (
        `访谈大纲: ${interviewOutline}\n`
        + "请生成一个简短的问题，引导受访者谈谈与这个大纲相关的个人背景、经历或看法。"
        + "只输出问题本身，不要包含任何说明、分析或额外文字。"
      )
    }
  ];

  const result = await callAI(messages);

  // 如果AI调用失败，使用默认问题
  if (!result) {
    return '欢迎参与本次访谈！请先简单介绍一下您的背景和与今天访谈主题的相关经验。';
  }

  // 清理结果：提取第一个问题，移除多余说明
  let cleanedResult = result.trim();

  // 如果包含多行，只取第一行问题
  const lines = cleanedResult.split('\n');
  for (let line of lines) {
    line = line.trim();
    if (line && line.includes('？')) {
      // 找到第一个问题句子
      const questionMatch = line.match(/[^。！]*？/);
      if (questionMatch) {
        cleanedResult = questionMatch[0];
        break;
      }
    }
  }

  // 清理结果，保留中文、英文、数字、基本标点
  return cleanedResult.replace(/[^\u4e00-\u9fa5\w\s。，！？：；""''（）【】]/g, '').trim();
};

// 生成过渡语句
exports.generateTransition = async (previousQuestion, nextQuestion = null) => {
  let userContent;
  if (nextQuestion) {
    userContent = (
      `上一话题: ${previousQuestion}\n`
      + `下一话题: ${nextQuestion}\n`
      + "请生成一个自然的过渡语句，使访谈流畅，不要显得死板或机械。"
      + "只输出过渡语句本身，不要包含任何说明或额外文字。"
    );
  } else {
    userContent = (
      `上一话题: ${previousQuestion}\n`
      + "下一话题: （无）\n"
      + "请生成一个自然的结束语或过渡语，使访谈流畅。"
      + "只输出过渡语句本身，不要包含任何说明或额外文字。"
    );
  }

  const messages = [
    {
      role: "system",
      content: (
        "You are a skilled interviewer. Generate smooth, natural, and engaging transition statements. "
        + "ONLY output the transition statement itself, without any explanations or additional text."
      )
    },
    {
      role: "user",
      content: userContent
    }
  ];

  const result = await callAI(messages);

  // 如果AI调用失败，使用简单的过渡语句
  if (!result) {
    if (nextQuestion) {
      return `好的，让我们来谈谈下一个话题。${nextQuestion}`;
    } else {
      return '谢谢您的分享，让我们继续下一部分。';
    }
  }

  // 清理结果：只保留第一句完整的过渡语句
  let cleanedResult = result.trim();

  // 如果包含多行，只取第一行
  const firstLine = cleanedResult.split('\n')[0].trim();
  if (firstLine) {
    cleanedResult = firstLine;
  }

  return cleanedResult.replace(/[^\u4e00-\u9fa5\w\s。，！？：；""''（）【】]/g, '').trim();
};

// 评估回答深度
exports.evaluateResponse = async (currentQuestion, userResponse) => {
  const messages = [
    {
      role: "system",
      content: (
        "You are an expert in qualitative interviews. "
        + "Your task is to analyze the depth of the interviewee's response "
        + "based on four key criteria:\n"
        + "1. Multiple Perspectives\n"
        + "2. Personal Relevance\n"
        + "3. Impact or Future Outlook\n"
        + "4. Logical & Organized\n\n"
        + "Return 'SURFACE' if the response is lacking in detail.\n"
        + "Return 'DEEPER' if it is somewhat detailed but can be further explored.\n"
        + "Return 'ENOUGH' if it meets at least 3 out of 4 criteria above."
      )
    },
    {
      role: "user",
      content: (
        `当前问题: ${currentQuestion}\n`
        + `受访者的回答: ${userResponse}\n`
        + "请基于上述标准给出判断：'SURFACE'，'DEEPER' 或 'ENOUGH'。"
      )
    }
  ];

  const result = await callAI(messages);

  // 如果AI调用失败，使用基于回答长度的简单判断
  if (!result) {
    const responseLength = userResponse.trim().length;
    if (responseLength < 20) return 'SURFACE';
    if (responseLength < 100) return 'DEEPER';
    return 'ENOUGH';
  }

  const decision = result.toUpperCase();

  if (decision.includes('SURFACE')) return 'SURFACE';
  if (decision.includes('DEEPER')) return 'DEEPER';
  if (decision.includes('ENOUGH')) return 'ENOUGH';

  // 默认返回 DEEPER 如果无法识别
  return 'DEEPER';
};

// 生成深入问题
exports.generateDeeperQuestion = async (currentQuestion, userResponse) => {
  const messages = [
    {
      role: "system",
      content: (
        "You are a skilled qualitative researcher. Generate ONE open-ended question "
        + "to explore deeper. Ask about motivations, emotions, long-term impact, or alternative perspectives. "
        + "Do NOT generate yes/no questions. "
        + "ONLY output the question itself, without any explanations or additional text."
      )
    },
    {
      role: "user",
      content: (
        `当前问题: ${currentQuestion}\n`
        + `受访者的回答: ${userResponse}\n`
        + "请生成一个更深入的问题，引导受访者适度反思和阐述。"
        + "只输出问题本身，不要包含任何说明或额外文字。"
      )
    }
  ];

  const result = await callAI(messages);

  // 如果AI调用失败，使用预设的深入问题模板
  if (!result) {
    const templates = [
      '能否详细解释一下您刚才提到的观点？',
      '您认为这个问题背后的深层原因是什么？',
      '这个经历对您产生了什么样的影响？',
      '您是如何得出这个结论的？',
      '从长远来看，您认为会产生什么样的变化？'
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // 清理结果：提取第一个问题
  let cleanedResult = result.trim();

  // 如果包含多行，只取第一行问题
  const lines = cleanedResult.split('\n');
  for (let line of lines) {
    line = line.trim();
    if (line && line.includes('？')) {
      // 找到第一个问题句子
      const questionMatch = line.match(/[^。！]*？/);
      if (questionMatch) {
        cleanedResult = questionMatch[0];
        break;
      }
    }
  }

  return cleanedResult.replace(/[^\u4e00-\u9fa5\w\s。，！？：；""''（）【】]/g, '').trim();
};

// 处理不愿回答的情况
exports.handleUnanswerableResponse = async (currentQuestion) => {
  const messages = [
    {
      role: "system",
      content: (
        "You are a professional interviewer. "
        + "The interviewee is unable or unwilling to answer the current question. "
        + "Generate a new, related question that explores the same topic from a different angle."
      )
    },
    {
      role: "user",
      content: (
        `当前问题: ${currentQuestion}\n`
        + "受访者无法回答，请生成一个不同但仍然相关且可能更容易回答的问题。"
      )
    }
  ];

  const result = await callAI(messages);
  return result.replace(/[^\u4e00-\u9fa5\w\s。，！？：；""''（）【】]/g, '').trim();
};

// 分析访谈大纲并生成评分指标
exports.analyzeInterviewOutline = async (interviewOutline, keyQuestions) => {
  const messages = [
    {
      role: "system",
      content: (
        "You are in the 'analysis state' (step 4). "
        + "Based on the interview outline, propose a list of rating metrics. "
        + "These metrics will be used later to evaluate how well the interviewee meets certain criteria. "
        + "Only output them in plain text, one metric per line or a simple list."
      )
    },
    {
      role: "user",
      content: (
        `访谈大纲: ${interviewOutline}\n`
        + `关键问题: ${keyQuestions.join(', ')}\n`
        + "请提出与访谈主题相关的评分指标（数量与主题相近，或稍多）。"
      )
    }
  ];

  const result = await callAI(messages);

  // 如果AI调用失败，使用默认评分指标
  if (!result) {
    return [
      '回答完整性',
      '思考深度',
      '逻辑清晰度',
      '个人见解',
      '表达能力'
    ];
  }

  // 解析评分指标
  const ratingMetrics = [];
  const lines = result.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (line && !line.toLowerCase().startsWith("step") && !line.startsWith("---")) {
      // 清理行首的数字、符号等
      line = line.replace(/^[0-9]+[\.\)]\s*/, '').replace(/^[-*]\s*/, '').trim();
      if (line) {
        ratingMetrics.push(line);
      }
    }
  }

  // 如果解析后没有有效指标，使用默认的
  if (ratingMetrics.length === 0) {
    return [
      '回答完整性',
      '思考深度',
      '逻辑清晰度',
      '个人见解',
      '表达能力'
    ];
  }

  return ratingMetrics;
};

// 生成最终总结
exports.generateSummary = async (interviewId) => {
  try {
    // 检查是否已经有总结
    const Summary = require('./Summary');
    const existingSummary = await Summary.findOne({ interviewId });
    if (existingSummary) {
      console.log('总结已存在，直接返回:', existingSummary._id);
      return existingSummary;
    }

    // 从数据库获取完整的访谈记录
    const Interview = require('./Interview');
    const interview = await Interview.findById(interviewId).populate('topicId');

    if (!interview) {
      throw new Error('Interview not found');
    }

    // 构建对话历史文本（包含完整聊天记录）
    let conversationText = "";
    for (let turn of interview.dialogHistory) {
      const role = turn.role === 'interviewer' ? '访谈员' : '受访者';
      const time = new Date(turn.timestamp).toLocaleString('zh-CN');
      conversationText += `[${time}] ${role}: ${turn.content}\n`;
    }

    // 生成评分指标（如果还没有的话）
    let ratingMetrics;
    if (interview.ratingMetrics && interview.ratingMetrics.length > 0) {
      ratingMetrics = interview.ratingMetrics;
    } else {
      ratingMetrics = await exports.analyzeInterviewOutline(
        interview.topicId.outline,
        interview.topicId.keyQuestions
      );
      // 保存评分指标到数据库
      interview.ratingMetrics = ratingMetrics;
      await interview.save();
    }

    const ratingMetricsStr = ratingMetrics.map(m => `- ${m}`).join('\n');

    const messages = [
      {
        role: "system",
        content: (
          "You are now in the '总结状态'. You have the entire interview transcript. "
          + "You also have a set of rating metrics. "
          + "You will produce a final summary in JSON format with the structure:\n\n"
          + "{\n"
          + "  \"takeaways\": \"...\",      // main conclusions including chat history summary\n"
          + "  \"points\": [...],           // numeric scores for each metric (1-10)\n"
          + "  \"explanations\": [...]      // explanation for each score\n"
          + "}\n\n"
          + "Only output valid JSON with these three keys.\n\n"
          + "IMPORTANT: To avoid hallucinations, strictly adhere to these guidelines:\n"
          + "1. Only include conclusions that are directly supported by the interviewee's statements\n"
          + "2. Do not infer opinions, beliefs, or information that wasn't explicitly mentioned\n"
          + "3. If the interviewee's response was minimal or off-topic for a metric, reflect this in your scoring and explanations\n"
          + "4. Maintain factual accuracy - your summary must be grounded in the actual transcript\n"
          + "5. Use direct quotes or paraphrases when possible to support your conclusions\n"
          + "6. If certain metrics cannot be evaluated due to lack of relevant response, score them lower rather than fabricating an assessment\n"
          + "7. Include a summary of the dialogue flow and key interactions in takeaways"
        )
      },
      {
        role: "user",
        content: (
          `访谈主题: ${interview.topicId.title}\n`
          + `访谈大纲: ${interview.topicId.outline}\n\n`
          + `访谈完整记录（包含时间戳）:\n${conversationText}\n\n`
          + `评分指标列表:\n${ratingMetricsStr}\n\n`
          + "请根据以上信息，对受访者进行打分并生成总结。"
          + "takeaways字段应该包含：1）主要观点总结 2）访谈过程概述 3）关键对话摘要"
          + "将上述总结转换为json字典，第一个键是takeaways，"
          + "值是一个字符串，包含你从访谈中得到的结论和对话过程概述；"
          + "第二个键是points，值是一个列表，每个元素是对应的评分指标的分值（1-10分）；"
          + "第三个键是explanations，值是一个列表，对应每个评分指标的解释。"
          + "以文本形式输出这个json字典即可。"
        )
      }
    ];

    const result = await callAI(messages, { ...DEFAULT_SAMPLING_PARAMS, max_tokens: 1024 });

    // 如果AI调用失败，使用默认总结
    if (!result) {
      const defaultSummary = {
        takeaways: `访谈主题：${interview.topicId.title}\n访谈已完成，感谢受访者的参与。\n\n对话记录：\n${conversationText}`,
        points: ratingMetrics.map(() => 5), // 默认中等分数
        explanations: ratingMetrics.map(() => "基于访谈内容进行评估。")
      };

      // 保存到数据库
      const summaryDoc = new Summary({
        interviewId,
        ...defaultSummary
      });
      await summaryDoc.save();
      console.log('使用默认总结并保存到数据库:', summaryDoc._id);
      return summaryDoc;
    }

    // 清理JSON字符串
    let cleanedResult = result;
    // 移除Markdown代码块标记
    const codeBlockMatch = cleanedResult.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleanedResult = codeBlockMatch[1].trim();
    }

    // 验证JSON格式
    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedResult);

      // 确保结果包含必要的字段
      if (!parsedResult.takeaways || !parsedResult.points || !parsedResult.explanations) {
        throw new Error('Missing required fields in summary');
      }

      // 确保takeaways包含对话记录
      if (!parsedResult.takeaways.includes('对话记录') && !parsedResult.takeaways.includes('访谈过程')) {
        parsedResult.takeaways += `\n\n详细对话记录：\n${conversationText}`;
      }

    } catch (parseError) {
      console.error('Failed to parse AI summary JSON:', parseError);
      console.error('Raw result:', result);

      // 使用默认的总结，但包含对话记录
      parsedResult = {
        takeaways: `访谈主题：${interview.topicId.title}\n访谈已完成，感谢受访者的参与。\n\n详细对话记录：\n${conversationText}`,
        points: ratingMetrics.map(() => 5), // 默认中等分数
        explanations: ratingMetrics.map(() => "基于访谈内容进行评估。")
      };
    }

    // 保存总结到数据库
    const summaryDoc = new Summary({
      interviewId,
      takeaways: parsedResult.takeaways,
      points: parsedResult.points,
      explanations: parsedResult.explanations
    });

    await summaryDoc.save();
    console.log('总结已保存到数据库:', summaryDoc._id);

    // 更新interview记录，添加summary引用
    interview.summary = summaryDoc._id;
    await interview.save();

    return summaryDoc;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
};

// 预留：面部表情分析接口
exports.analyzeFacialExpression = async (imageData) => {
  try {
    const response = await axios.post(`${API_URL}/facial-analysis`, {
      imageData
    });

    return response.data.result;
  } catch (error) {
    console.error('Error analyzing facial expression:', error);
    return null;
  }
};

// 预留：声音分析接口
exports.analyzeVoice = async (audioData) => {
  try {
    const response = await axios.post(`${API_URL}/voice-analysis`, {
      audioData
    });

    return response.data.result;
  } catch (error) {
    console.error('Error analyzing voice:', error);
    return null;
  }
};
