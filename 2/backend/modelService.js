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
  console.log('开始生成总结，访谈ID:', interviewId);

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

    console.log('访谈记录获取成功，主题:', interview.topicId.title);

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
      ratingMetrics = [
        '回答完整性',
        '思考深度',
        '逻辑清晰度',
        '个人见解',
        '表达能力'
      ];
      // 保存评分指标到数据库
      interview.ratingMetrics = ratingMetrics;
      await interview.save();
    }

    console.log('评分指标:', ratingMetrics);

    // 准备AI调用
    const ratingMetricsStr = ratingMetrics.map(m => `- ${m}`).join('\n');
    const messages = [
      {
        role: "system",
        content: (
          "你是一位专业的访谈分析师。你需要客观分析完整的访谈记录并生成中文总结。"
          + "评分原则：\n"
          + "1. 基于访谈记录中的实际内容进行评分，不得进行假设或推测\n"
          + "2. 如果访谈中缺乏某项指标的相关信息，应给予低分（1-3分）\n"
          + "3. 只有当访谈记录中有充分证据支持时，才能给予高分\n"
          + "4. 评分必须为1-10的整数，不允许小数\n"
          + "5. 评分标准：1-2分（很差/无相关内容），3-4分（较差/信息不足），5-6分（一般/有基本信息），7-8分（良好/信息充分），9-10分（优秀/信息丰富且深入）\n\n"
          + "输出JSON格式：\n"
          + "{\n"
          + "  \"takeaways\": \"...\",      // 主要结论和访谈过程概述，必须使用中文\n"
          + "  \"points\": [...],           // 每个指标的整数评分 (1-10)\n"
          + "  \"explanations\": [...]      // 每个评分的客观解释，说明评分依据\n"
          + "}\n\n"
          + "只输出有效的JSON，所有内容必须使用中文。"
        )
      },
      {
        role: "user",
        content: (
          `访谈主题: ${interview.topicId.title}\n`
          + `访谈大纲: ${interview.topicId.outline}\n\n`
          + `访谈完整记录:\n${conversationText}\n\n`
          + `评分指标列表:\n${ratingMetricsStr}\n\n`
          + "请严格按照以下要求进行分析：\n"
          + "1. 仔细阅读访谈记录，寻找与每个评分指标相关的具体内容\n"
          + "2. 如果访谈记录中没有足够信息支持某个指标，必须给予低分（1-3分）\n"
          + "3. 不要进行任何假设或推测，严格基于访谈实际内容\n"
          + "4. 评分必须为1-10的整数\n"
          + "5. 在explanations中明确说明评分依据，引用访谈中的具体内容\n\n"
          + "输出格式：JSON字典，包含takeaways（中文总结）、points（整数评分数组）、explanations（评分依据说明数组）"
        )
      }
    ];

    console.log('开始调用AI生成总结...');
    const result = await callAI(messages, { ...DEFAULT_SAMPLING_PARAMS, max_tokens: 1024 });

    let parsedResult;

    // 如果AI调用成功，尝试解析结果
    if (result) {
      console.log('AI调用成功，解析结果...');

      // 清理JSON字符串
      let cleanedResult = result;
      const codeBlockMatch = cleanedResult.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleanedResult = codeBlockMatch[1].trim();
      }

      try {
        parsedResult = JSON.parse(cleanedResult);

        // 验证必要字段
        if (!parsedResult.takeaways || !Array.isArray(parsedResult.points) || !Array.isArray(parsedResult.explanations)) {
          throw new Error('Missing required fields in summary');
        }

        // 确保points数组长度匹配
        if (parsedResult.points.length !== ratingMetrics.length) {
          parsedResult.points = ratingMetrics.map(() => 3); // 信息不足给予低分
        }

        // 确保所有评分都是1-10的整数
        parsedResult.points = parsedResult.points.map(score => {
          let intScore = Math.round(Number(score));
          // 确保在1-10范围内
          if (intScore < 1) intScore = 1;
          if (intScore > 10) intScore = 10;
          return intScore;
        });

        // 确保explanations数组长度匹配
        if (parsedResult.explanations.length !== ratingMetrics.length) {
          parsedResult.explanations = ratingMetrics.map(() => "访谈信息不足，无法进行有效评估。");
        }

        // 确保takeaways包含对话记录
        if (!parsedResult.takeaways.includes('对话记录') && !parsedResult.takeaways.includes('访谈过程')) {
          // 如果对话记录很长，只取前500个字符作为摘要
          const conversationSummary = conversationText.length > 500
            ? conversationText.substring(0, 500) + '...\n\n（完整对话记录已保存）'
            : conversationText;
          parsedResult.takeaways += `\n\n访谈过程摘要：\n${conversationSummary}`;
        }

        console.log('AI总结解析成功');

      } catch (parseError) {
        console.error('Failed to parse AI summary JSON:', parseError);
        console.error('Raw result:', result);
        parsedResult = null;
      }
    } else {
      console.log('AI调用失败，使用默认总结');
    }

    // 如果AI调用失败或解析失败，使用默认总结
    if (!parsedResult) {
      parsedResult = {
        takeaways: `访谈主题：${interview.topicId.title}\n\n本次访谈已顺利完成，感谢受访者的积极参与和深入分享。通过与受访者的对话交流，我们获得了宝贵的见解和观点。\n\n访谈过程回顾：\n${conversationText}`,
        points: ratingMetrics.map(() => 3), // 信息不足给予低分
        explanations: ratingMetrics.map(() => "基于访谈内容进行评估。")
      };
      console.log('使用默认中文总结');
    }

    // 保存总结到数据库
    console.log('保存总结到数据库...');

    // 获取该主题下的总结数量，用于确定编号
    const existingSummariesCount = await Summary.countDocuments({
      topicId: interview.topicId._id
    });
    const summaryNumber = existingSummariesCount + 1;

    const summaryDoc = new Summary({
      interviewId,
      topicId: interview.topicId._id,
      topicTitle: interview.topicId.title,
      summaryNumber,
      takeaways: parsedResult.takeaways,
      points: parsedResult.points,
      explanations: parsedResult.explanations
    });

    await summaryDoc.save();
    console.log(`总结已保存到数据库，ID: ${summaryDoc._id}, 编号: ${summaryNumber}`);

    // 更新interview记录，添加summary引用
    interview.summary = summaryDoc._id;
    await interview.save();
    console.log('访谈记录已更新，添加总结引用');

    return summaryDoc;
  } catch (error) {
    console.error('Error generating summary:', error);

    // 即使出错，也尝试创建一个基本的总结
    try {
      const Summary = require('./Summary');
      const Interview = require('./Interview');
      const interview = await Interview.findById(interviewId).populate('topicId');

      if (interview) {
        console.log('创建紧急备用总结...');

        // 获取该主题下的总结数量，用于确定编号
        const existingSummariesCount = await Summary.countDocuments({
          topicId: interview.topicId._id
        });
        const summaryNumber = existingSummariesCount + 1;

        const emergencySummary = new Summary({
          interviewId,
          topicId: interview.topicId._id,
          topicTitle: interview.topicId?.title || '未知主题',
          summaryNumber,
          takeaways: `访谈主题：${interview.topicId?.title || '未知主题'}\n\n本次访谈已完成，但由于技术问题，无法生成详细的总结分析。访谈记录已保存完整。如需详细分析，请联系技术支持。`,
          points: [3, 3, 3, 3, 3], // 技术问题导致信息不足，给予低分
          explanations: ['由于技术问题无法生成详细评分，请手动评估', '由于技术问题无法生成详细评分，请手动评估', '由于技术问题无法生成详细评分，请手动评估', '由于技术问题无法生成详细评分，请手动评估', '由于技术问题无法生成详细评分，请手动评估']
        });

        await emergencySummary.save();
        console.log('紧急备用总结已保存，ID:', emergencySummary._id);

        interview.summary = emergencySummary._id;
        await interview.save();

        return emergencySummary;
      }
    } catch (emergencyError) {
      console.error('创建紧急备用总结也失败了:', emergencyError);
    }

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

// 判断回答是否偏题并生成引导
exports.checkOffTopicAndGuide = async (currentQuestion, userResponse) => {
  const messages = [
    {
      role: "system",
      content: (
        "你是一位经验丰富的访谈员。你需要判断受访者的回答是否偏离了问题主题。"
        + "判断标准：\n"
        + "1. 回答是否直接回应了问题的核心内容\n"
        + "2. 回答是否包含与问题相关的信息\n"
        + "3. 回答是否完全转移到了无关话题\n\n"
        + "如果回答明显偏题，返回JSON格式：\n"
        + "{\"isOffTopic\": true, \"guidance\": \"解释性引导文字\"}\n"
        + "如果回答基本切题，返回：\n"
        + "{\"isOffTopic\": false, \"guidance\": \"\"}\n"
        + "引导文字应该礼貌地重新解释问题的重点，帮助受访者理解问题意图。"
      )
    },
    {
      role: "user",
      content: (
        `问题: ${currentQuestion}\n`
        + `受访者回答: ${userResponse}\n\n`
        + "请判断这个回答是否偏离了问题主题。如果偏题，请生成一段礼貌的引导文字，"
        + "重新解释问题的核心要点，帮助受访者更好地理解问题意图。"
      )
    }
  ];

  const result = await callAI(messages);

  // 如果AI调用失败，使用简单的关键词匹配判断
  if (!result) {
    // 简单的偏题检测：如果回答太短或包含明显的转移话题词汇
    const responseLength = userResponse.trim().length;
    const deflectionKeywords = ['不知道', '不清楚', '换个话题', '我想说', '顺便说一下', '对了'];
    const hasDeflection = deflectionKeywords.some(keyword => userResponse.includes(keyword));

    if (responseLength < 10 || hasDeflection) {
      return {
        isOffTopic: true,
        guidance: `让我重新解释一下这个问题的重点：${currentQuestion}。请您围绕这个问题的核心内容进行回答，分享您的真实想法和经验。`
      };
    }

    return { isOffTopic: false, guidance: '' };
  }

  try {
    // 清理并解析JSON结果
    let cleanedResult = result.trim();
    const codeBlockMatch = cleanedResult.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleanedResult = codeBlockMatch[1].trim();
    }

    const parsed = JSON.parse(cleanedResult);

    return {
      isOffTopic: Boolean(parsed.isOffTopic),
      guidance: parsed.guidance || ''
    };
  } catch (parseError) {
    console.error('Failed to parse off-topic check result:', parseError);

    // 如果解析失败，基于结果文本进行简单判断
    const isOffTopicKeywords = ['偏题', '偏离', '无关', '转移', 'off-topic', 'off topic'];
    const isOffTopic = isOffTopicKeywords.some(keyword => result.toLowerCase().includes(keyword));

    if (isOffTopic) {
      return {
        isOffTopic: true,
        guidance: `让我重新解释一下这个问题：${currentQuestion}。请您结合这个问题的具体内容，分享您的观点和经验。`
      };
    }

    return { isOffTopic: false, guidance: '' };
  }
};
