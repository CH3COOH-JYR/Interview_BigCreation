// Vuex store for topics
import { createStore } from 'vuex';
import { topicsAPI, interviewsAPI, summariesAPI } from '../services/api';

// Topics module
const topics = {
  namespaced: true,
  state: {
    topics: [],
    currentTopic: null,
    loading: false,
    error: null
  },
  mutations: {
    SET_TOPICS(state, topics) {
      state.topics = topics;
    },
    SET_CURRENT_TOPIC(state, topic) {
      state.currentTopic = topic;
    },
    ADD_TOPIC(state, topic) {
      state.topics.unshift(topic);
    },
    UPDATE_TOPIC(state, updatedTopic) {
      const index = state.topics.findIndex(t => t._id === updatedTopic._id);
      if (index !== -1) {
        state.topics.splice(index, 1, updatedTopic);
      }
    },
    REMOVE_TOPIC(state, id) {
      state.topics = state.topics.filter(t => t._id !== id);
    },
    SET_LOADING(state, status) {
      state.loading = status;
    },
    SET_ERROR(state, error) {
      state.error = error;
    }
  },
  actions: {
    // 获取所有主题
    async fetchTopics({ commit }) {
      commit('SET_LOADING', true);
      try {
        const response = await topicsAPI.getAllTopics();
        commit('SET_TOPICS', response.data.data);
        commit('SET_ERROR', null);
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || '获取主题列表失败');
        console.error('Error fetching topics:', error);
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 获取特定主题
    async fetchTopic({ commit }, id) {
      commit('SET_LOADING', true);
      try {
        const response = await topicsAPI.getTopic(id);
        commit('SET_CURRENT_TOPIC', response.data.data);
        commit('SET_ERROR', null);
        return response.data.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || '获取主题详情失败');
        console.error('Error fetching topic:', error);
        return null;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 创建新主题
    async createTopic({ commit }, topicData) {
      commit('SET_LOADING', true);
      try {
        const response = await topicsAPI.createTopic(topicData);
        commit('ADD_TOPIC', response.data.data);
        commit('SET_ERROR', null);
        return response.data.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || '创建主题失败');
        console.error('Error creating topic:', error);
        return null;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 更新主题
    async updateTopic({ commit }, { id, topicData }) {
      commit('SET_LOADING', true);
      try {
        const response = await topicsAPI.updateTopic(id, topicData);
        commit('UPDATE_TOPIC', response.data.data);
        commit('SET_ERROR', null);
        return response.data.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || '更新主题失败');
        console.error('Error updating topic:', error);
        return null;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 删除主题
    async deleteTopic({ commit }, id) {
      commit('SET_LOADING', true);
      try {
        await topicsAPI.deleteTopic(id);
        commit('REMOVE_TOPIC', id);
        commit('SET_ERROR', null);
        return true;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || '删除主题失败');
        console.error('Error deleting topic:', error);
        return false;
      } finally {
        commit('SET_LOADING', false);
      }
    }
  },
  getters: {
    allTopics: state => state.topics,
    currentTopic: state => state.currentTopic,
    isLoading: state => state.loading,
    error: state => state.error
  }
};

// Interview module
const interview = {
  namespaced: true,
  state: {
    currentInterview: null,
    currentQuestion: null,
    dialogHistory: [],
    loading: false,
    error: null
  },
  mutations: {
    SET_CURRENT_INTERVIEW(state, interview) {
      state.currentInterview = interview;
    },
    SET_CURRENT_QUESTION(state, question) {
      state.currentQuestion = question;
    },
    SET_DIALOG_HISTORY(state, history) {
      state.dialogHistory = history;
    },
    ADD_TO_DIALOG(state, dialogEntry) {
      state.dialogHistory.push(dialogEntry);
    },
    SET_LOADING(state, status) {
      state.loading = status;
    },
    SET_ERROR(state, error) {
      state.error = error;
    }
  },
  actions: {
    // 开始新访谈
    async startInterview({ commit }, topicId) {
      commit('SET_LOADING', true);
      try {
        const response = await interviewsAPI.startInterview(topicId);
        commit('SET_CURRENT_INTERVIEW', response.data.data);
        commit('SET_DIALOG_HISTORY', []);
        commit('SET_ERROR', null);
        return response.data.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || '开始访谈失败');
        console.error('Error starting interview:', error);
        return null;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 获取访谈状态
    async getInterviewStatus({ commit }, id) {
      commit('SET_LOADING', true);
      try {
        const response = await interviewsAPI.getInterviewStatus(id);
        commit('SET_CURRENT_INTERVIEW', response.data.data);
        commit('SET_DIALOG_HISTORY', response.data.data.dialogHistory || []);
        commit('SET_ERROR', null);
        return response.data.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || '获取访谈状态失败');
        console.error('Error getting interview status:', error);
        return null;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 提交用户回答
    async submitResponse({ commit, state }, response) {
      commit('SET_LOADING', true);
      try {
        // 添加用户回答到对话历史
        commit('ADD_TO_DIALOG', {
          role: 'interviewee',
          content: response,
          timestamp: new Date()
        });
        
        const apiResponse = await interviewsAPI.submitResponse(state.currentInterview._id, response);
        
        // 如果有追问，添加到对话历史
        if (apiResponse.data.data.nextQuestion) {
          commit('ADD_TO_DIALOG', {
            role: 'interviewer',
            content: apiResponse.data.data.nextQuestion,
            timestamp: new Date()
          });
          commit('SET_CURRENT_QUESTION', apiResponse.data.data.nextQuestion);
        }
        
        commit('SET_ERROR', null);
        return apiResponse.data.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || '提交回答失败');
        console.error('Error submitting response:', error);
        return null;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 获取下一个问题
    async getNextQuestion({ commit, state }) {
      commit('SET_LOADING', true);
      try {
        const response = await interviewsAPI.getNextQuestion(state.currentInterview._id);
        
        if (response.data.data.isCompleted) {
          // 访谈已完成
          commit('SET_CURRENT_QUESTION', null);
        } else {
          // 设置新问题
          commit('SET_CURRENT_QUESTION', response.data.data.fullText);
          
          // 添加到对话历史
          commit('ADD_TO_DIALOG', {
            role: 'interviewer',
            content: response.data.data.fullText,
            timestamp: new Date()
          });
        }
        
        commit('SET_ERROR', null);
        return response.data.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || '获取下一个问题失败');
        console.error('Error getting next question:', error);
        return null;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 结束访谈
    async endInterview({ commit, state }) {
      commit('SET_LOADING', true);
      try {
        const response = await interviewsAPI.endInterview(state.currentInterview._id);
        commit('SET_CURRENT_QUESTION', null);
        commit('SET_ERROR', null);
        return response.data.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || '结束访谈失败');
        console.error('Error ending interview:', error);
        return null;
      } finally {
        commit('SET_LOADING', false);
      }
    }
  },
  getters: {
    currentInterview: state => state.currentInterview,
    currentQuestion: state => state.currentQuestion,
    dialogHistory: state => state.dialogHistory,
    isLoading: state => state.loading,
    error: state => state.error
  }
};

// Summary module
const summary = {
  namespaced: true,
  state: {
    currentSummary: null,
    loading: false,
    error: null
  },
  mutations: {
    SET_CURRENT_SUMMARY(state, summary) {
      state.currentSummary = summary;
    },
    SET_LOADING(state, status) {
      state.loading = status;
    },
    SET_ERROR(state, error) {
      state.error = error;
    }
  },
  actions: {
    // 获取访谈总结
    async getSummary({ commit }, interviewId) {
      commit('SET_LOADING', true);
      try {
        const response = await summariesAPI.getSummary(interviewId);
        commit('SET_CURRENT_SUMMARY', response.data.data);
        commit('SET_ERROR', null);
        return response.data.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || '获取访谈总结失败');
        console.error('Error getting summary:', error);
        return null;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 导出总结
    async exportSummary({ commit, state }, { interviewId, format }) {
      commit('SET_LOADING', true);
      try {
        const response = await summariesAPI.exportSummary(interviewId, format);
        commit('SET_ERROR', null);
        return response.data.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || '导出总结失败');
        console.error('Error exporting summary:', error);
        return null;
      } finally {
        commit('SET_LOADING', false);
      }
    }
  },
  getters: {
    currentSummary: state => state.currentSummary,
    isLoading: state => state.loading,
    error: state => state.error
  }
};

// 创建并导出store
export default createStore({
  modules: {
    topics,
    interview,
    summary
  }
});
