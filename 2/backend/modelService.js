const axios = require('axios');

// 模型服务接口
class ModelService {
  constructor() {
    this.apiUrl = process.env.MODEL_SERVICE_URL || 'http://localhost:5001/api';
  }

  // 评估用户回答深度
  async evaluateResponse(currentQuestion, userResponse) {
    try {
      const response = await axios.post(`${this.apiUrl}/analyze`, {
        type: 'evaluate_response',
        data: {
          currentQuestion,
          userResponse
        }
      });
      
      return response.data.result;
    } catch (error) {
      console.error('Error evaluating response:', error);
      // 默认返回DEEPER，确保访谈可以继续
      return 'DEEPER';
    }
  }

  // 生成深入问题
  async generateDeeperQuestion(currentQuestion, userResponse) {
    try {
      const response = await axios.post(`${this.apiUrl}/generate`, {
        type: 'deeper_question',
        data: {
          currentQuestion,
          userResponse
        }
      });
      
      return response.data.result;
    } catch (error) {
      console.error('Error generating deeper question:', error);
      return '能否详细解释一下您的观点？';
    }
  }

  // 生成过渡语句
  async generateTransition(previousQuestion, nextQuestion) {
    try {
      const response = await axios.post(`${this.apiUrl}/generate`, {
        type: 'transition',
        data: {
          previousQuestion,
          nextQuestion
        }
      });
      
      return response.data.result;
    } catch (error) {
      console.error('Error generating transition:', error);
      return '让我们继续下一个问题。';
    }
  }

  // 生成访谈总结
  async generateSummary(interviewId) {
    try {
      const response = await axios.post(`${this.apiUrl}/summarize`, {
        interviewId
      });
      
      return response.data.result;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('生成访谈总结失败');
    }
  }

  // 分析访谈大纲
  async analyzeInterviewOutline(outline, keyQuestions) {
    try {
      const response = await axios.post(`${this.apiUrl}/analyze`, {
        type: 'outline_analysis',
        data: {
          outline,
          keyQuestions
        }
      });
      
      return response.data.result;
    } catch (error) {
      console.error('Error analyzing interview outline:', error);
      return [];
    }
  }

  // 预留：面部表情分析接口
  async analyzeFacialExpression(imageData) {
    try {
      const response = await axios.post(`${this.apiUrl}/facial-analysis`, {
        imageData
      });
      
      return response.data.result;
    } catch (error) {
      console.error('Error analyzing facial expression:', error);
      return null;
    }
  }

  // 预留：声音分析接口
  async analyzeVoice(audioData) {
    try {
      const response = await axios.post(`${this.apiUrl}/voice-analysis`, {
        audioData
      });
      
      return response.data.result;
    } catch (error) {
      console.error('Error analyzing voice:', error);
      return null;
    }
  }
}

module.exports = new ModelService();
