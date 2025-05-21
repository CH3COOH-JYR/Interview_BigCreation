const { VLLMAdapter } = require('../utils/vllmAdapter');
const { SamplingParams } = require('../utils/samplingParams');
const axios = require('axios');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

// 创建连接池配置
const MAX_CONCURRENT_REQUESTS = 10;
const REQUEST_TIMEOUT = 30000; // 30秒
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

// 创建vLLM适配器实例
const vllmAdapter = new VLLMAdapter(process.env.MODEL_PATH || '/path/to/model');

// 创建采样参数
const defaultSamplingParams = new SamplingParams({
  temperature: 0.6,
  top_p: 0.9,
  repetition_penalty: 1.02,
  max_tokens: 512
});

// 请求队列
let requestQueue = [];
let activeRequests = 0;

// 处理队列中的请求
async function processQueue() {
  if (requestQueue.length === 0 || activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return;
  }

  const { prompts, samplingParams, resolve, reject, retries } = requestQueue.shift();
  activeRequests++;

  try {
    const result = await vllmAdapter.generate(prompts, samplingParams);
    resolve(result);
  } catch (error) {
    console.error('Error in vLLM generation:', error);
    
    // 重试逻辑
    if (retries < MAX_RETRIES) {
      console.log(`Retrying request (${retries + 1}/${MAX_RETRIES})...`);
      await sleep(RETRY_DELAY);
      requestQueue.push({ prompts, samplingParams, resolve, reject, retries: retries + 1 });
    } else {
      reject(error);
    }
  } finally {
    activeRequests--;
    // 继续处理队列
    processQueue();
  }
}

// LLM服务
class LLMService {
  constructor() {
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:5000/api';
  }

  // 将请求添加到队列
  async queueRequest(prompts, samplingParams = defaultSamplingParams) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // 从队列中移除请求
        requestQueue = requestQueue.filter(req => req.resolve !== resolve);
        reject(new Error('Request timeout'));
      }, REQUEST_TIMEOUT);

      requestQueue.push({
        prompts,
        samplingParams,
        resolve: (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        retries: 0
      });

      // 尝试处理队列
      processQueue();
    });
  }

  // 评估用户回答深度
  async evaluateResponse(currentQuestion, userResponse) {
    const messages = [
      {
        "role": "system",
        "content": (
          "You are an expert in analyzing user responses. "
          "Your task is to analyze the depth of the interviewee's response "
          "based on four key criteria:\n"
          "1. Multiple Perspectives\n"
          "2. Personal Relevance\n"
          "3. Impact or Future Outlook\n"
          "4. Logical & Organized\n\n"
          "Return 'SURFACE' if the response is lacking in detail.\n"
          "Return 'DEEPER' if it is somewhat detailed but can be further explored.\n"
          "Return 'ENOUGH' if it meets at least 3 out of 4 criteria above."
        )
      },
      {
        "role": "user",
        "content": (
          `当前问题: ${currentQuestion}\n`
          `受访者的回答: ${userResponse}\n`
          "请基于上述标准给出判断：'SURFACE'，'DEEPER' 或 'ENOUGH'。"
        )
      }
    ];

    try {
      const result = await this.queueRequest([messages], defaultSamplingParams);
      const decision = result[0].outputs[0].text.trim().toUpperCase();
      
      // 验证结果
      if (['SURFACE', 'DEEPER', 'ENOUGH'].includes(decision)) {
        return decision;
      } else {
        // 如果结果不符合预期，返回默认值
        console.warn('Unexpected evaluation result:', decision);
        return 'DEEPER';
      }
    } catch (error) {
      console.error('Error evaluating response:', error);
      return 'DEEPER'; // 默认值
    }
  }

  // 生成深入问题
  async generateDeeperQuestion(currentQuestion, userResponse) {
    const messages = [
      {
        "role": "system",
        "content": (
          "You are a skilled qualitative researcher. Generate one open-ended question "
          "to explore deeper. Ask about motivations, emotions, long-term impact, or alternative perspectives. "
          "Do NOT generate yes/no questions."
        )
      },
      {
        "role": "user",
        "content": (
          `当前问题: ${currentQuestion}\n`
          `受访者的回答: ${userResponse}\n`
          "请生成一个更深入的问题，引导受访者适度反思和阐述。"
        )
      }
    ];

    try {
      const result = await this.queueRequest([messages], defaultSamplingParams);
      let deeperQuestion = result[0].outputs[0].text.trim();
      
      // 清理结果
      deeperQuestion = deeperQuestion.replace(/[^\w\s。，！？]/g, '');
      
      return deeperQuestion;
    } catch (error) {
      console.error('Error generating deeper question:', error);
      return '能否详细解释一下您的观点？';
    }
  }

  // 生成过渡语句
  async generateTransition(previousQuestion, nextQuestion) {
    let userContent;
    
    if (nextQuestion) {
      userContent = (
        `上一话题: ${previousQuestion}\n`
        `下一话题: ${nextQuestion}\n`
        "请生成一个自然的过渡语句，使访谈流畅，不要显得死板或机械。"
      );
    } else {
      userContent = (
        `上一话题: ${previousQuestion}\n`
        "下一话题: （无）\n"
        "请生成一个自然的结束语或过渡语，使访谈流畅。"
      );
    }
    
    const messages = [
      {
        "role": "system",
        "content": "You are a skilled interviewer. Generate smooth, natural, and engaging transition statements."
      },
      {
        "role": "user",
        "content": userContent
      }
    ];

    try {
      const result = await this.queueRequest([messages], defaultSamplingParams);
      let transition = result[0].outputs[0].text.trim();
      
      // 清理结果
      transition = transition.replace(/[^\w\s。，！？]/g, '');
      
      return transition;
    } catch (error) {
      console.error('Error generating transition:', error);
      return nextQuestion ? '让我们继续下一个问题。' : '感谢您的参与，我们的访谈到此结束。';
    }
  }

  // 分析访谈大纲
  async analyzeInterviewOutline(outline, keyQuestions) {
    const messages = [
      {
        "role": "system",
        "content": (
          "You are in the 'analysis state' (step 4). "
          "Based on the interview outline, propose a list of rating metrics. "
          "These metrics will be used later to evaluate how well the interviewee meets certain criteria. "
          "Only output them in plain text, one metric per line or a simple list."
        )
      },
      {
        "role": "user",
        "content": (
          `访谈大纲: ${outline}\n`
          `关键问题: ${keyQuestions.join(', ')}\n`
          "请提出与访谈主题相关的评分指标（数量与主题相近，或稍多）。"
        )
      }
    ];

    try {
      const result = await this.queueRequest([messages], defaultSamplingParams);
      const metricsText = result[0].outputs[0].text.trim();
      
      // 解析评分指标
      const ratingMetricsList = [];
      for (const line of metricsText.split('\n')) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.toLowerCase().startsWith("step") && !trimmedLine.startsWith("---")) {
          ratingMetricsList.push(trimmedLine);
        }
      }
      
      return ratingMetricsList;
    } catch (error) {
      console.error('Error analyzing interview outline:', error);
      return [
        '对主题的理解深度',
        '回答的全面性',
        '观点的独特性',
        '论述的逻辑性',
        '实例的相关性'
      ];
    }
  }

  // 生成访谈总结
  async generateSummary(interviewId) {
    try {
      // 从后端获取访谈数据
      const response = await axios.get(`${this.backendUrl}/interviews/${interviewId}`);
      const interview = response.data.data;
      
      if (!interview) {
        throw new Error('未找到访谈数据');
      }
      
      // 获取主题信息
      const topic = interview.topicId;
      
      // 分析大纲，获取评分指标
      const ratingMetrics = await this.analyzeInterviewOutline(topic.outline, topic.keyQuestions);
      
      // 将对话转成文本
      const dialogHistory = interview.dialogHistory;
      let conversationText = "";
      for (const turn of dialogHistory) {
        conversationText += `${turn.role}: ${turn.content}\n`;
      }
      
      // 将评分指标也传给大模型
      const ratingMetricsStr = ratingMetrics.map(m => `- ${m}`).join('\n');
      
      const messages = [
        {
          "role": "system",
          "content": (
            "You are now in the '总结状态'. You have the entire interview transcript. "
            "You also have a set of rating metrics. "
            "You will produce a final summary in JSON format with the structure:\n\n"
            "{\n"
            "  \"takeaways\": \"...\",      // main conclusions\n"
            "  \"points\": [...],           // numeric scores for each metric\n"
            "  \"explanations\": [...]      // explanation for each score\n"
            "}\n\n"
            "Only output valid JSON with these three keys.\n\n"
            "IMPORTANT: To avoid hallucinations, strictly adhere to these guidelines:\n"
            "1. Only include conclusions that are directly supported by the interviewee's statements\n"
            "2. Do not infer opinions, beliefs, or information that wasn't explicitly mentioned\n"
            "3. If the interviewee's response was minimal or off-topic for a metric, reflect this in your scoring and explanations\n"
            "4. Maintain factual accuracy - your summary must be grounded in the actual transcript\n"
            "5. Use direct quotes or paraphrases when possible to support your conclusions\n"
            "6. If certain metrics cannot be evaluated due to lack of relevant response, score them lower rather than fabricating an assessment"
          )
        },
        {
          "role": "user",
          "content": (
            `访谈大纲: ${topic.outline}\n`
            `访谈完整记录:\n${conversationText}\n\n`
            `评分指标列表:\n${ratingMetricsStr}\n\n`
            "请根据以上信息，对受访者进行打分。"
            "将上述总结转换为json字典，第一个键是takeaways，"
            "值是一个字符串，包含你从访谈中得到的结论；"
            "第二个键是points，值是一个列表，每个元素是对应的评分指标的分值；"
            "第三个键是explanations，值是一个列表，对应每个评分指标的解释。"
            "以文本形式输出这个json字典即可。"
          )
        }
      ];
      
      // 使用更长的上下文窗口和生成长度
      const summarySamplingParams = new SamplingParams({
        temperature: 0.7,
        top_p: 0.9,
        repetition_penalty: 1.0,
        max_tokens: 1024
      });
      
      const result = await this.queueRequest([messages], summarySamplingParams);
      const summaryJson = result[0].outputs[0].text.trim();
      
      try {
        // 解析JSON
        const summaryData = JSON.parse(summaryJson);
        
        // 验证JSON结构
        if (!summaryData.takeaways || !Array.isArray(summaryData.points) || !Array.isArray(summaryData.explanations)) {
          throw new Error('生成的总结格式不正确');
        }
        
        // 创建总结
        const summaryResponse = await axios.post(`${this.backendUrl}/summaries`, {
          interviewId,
          takeaways: summaryData.takeaways,
          points: summaryData.points,
          explanations: summaryData.explanations
        });
        
        return summaryResponse.data.data;
      } catch (parseError) {
        console.error('Error parsing summary JSON:', parseError);
        throw new Error('生成的总结格式不正确');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }
}

module.exports = new LLMService();
