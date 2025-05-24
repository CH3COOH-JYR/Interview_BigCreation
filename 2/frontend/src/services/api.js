// 前端API服务
import axios from 'axios';

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:5000/api';

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 主题相关API
export const topicsAPI = {
  // 获取所有主题
  getAllTopics() {
    return apiClient.get('/topics');
  },

  // 获取特定主题
  getTopic(id) {
    return apiClient.get(`/topics/${id}`);
  },

  // 创建新主题
  createTopic(topicData) {
    return apiClient.post('/topics', topicData);
  },

  // 更新主题
  updateTopic(id, topicData) {
    return apiClient.put(`/topics/${id}`, topicData);
  },

  // 删除主题
  deleteTopic(id) {
    return apiClient.delete(`/topics/${id}`);
  }
};

// 访谈相关API
export const interviewsAPI = {
  // 开始新访谈
  startInterview(topicId) {
    return apiClient.post('/interviews', { topicId });
  },

  // 获取访谈状态
  getInterviewStatus(id) {
    return apiClient.get(`/interviews/${id}`);
  },

  // 提交用户回答
  submitResponse(id, response) {
    return apiClient.post(`/interviews/${id}/response`, { response });
  },

  // 获取下一个问题
  getNextQuestion(id) {
    return apiClient.post(`/interviews/${id}/next`);
  },

  // 结束访谈
  endInterview(id) {
    return apiClient.post(`/interviews/${id}/end`);
  }
};

// 总结相关API
export const summariesAPI = {
  // 获取访谈总结
  getSummary(interviewId) {
    return apiClient.get(`/summaries/${interviewId}`);
  },

  // 导出总结
  exportSummary(interviewId, format = 'json') {
    return apiClient.post(`/summaries/${interviewId}/export`, { format });
  },

  // 获取所有总结
  getAllSummaries() {
    return apiClient.get('/summaries');
  }
};

export default {
  topics: topicsAPI,
  interviews: interviewsAPI,
  summaries: summariesAPI
};
