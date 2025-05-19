import { createStore } from 'vuex'
import { topicsAPI, interviewsAPI, summariesAPI } from '@/services/api'

// Topics module (your original content)
const topics = {
  namespaced: true,
  state: {
    topics: [],
    currentTopic: null,
    loading: false,
    error: null
  },
  mutations: {
    SET_TOPICS(state, topics) { state.topics = topics; },
    SET_CURRENT_TOPIC(state, topic) { state.currentTopic = topic; },
    ADD_TOPIC(state, topic) { state.topics.unshift(topic); },
    UPDATE_TOPIC(state, updatedTopic) {
      const index = state.topics.findIndex(t => t._id === updatedTopic._id);
      if (index !== -1) { state.topics.splice(index, 1, updatedTopic); }
    },
    REMOVE_TOPIC(state, id) { state.topics = state.topics.filter(t => t._id !== id); },
    SET_LOADING(state, status) { state.loading = status; },
    SET_ERROR(state, error) { state.error = error; }
  },
  actions: {
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
    SET_CURRENT_INTERVIEW(state, interview) { state.currentInterview = interview; },
    SET_CURRENT_QUESTION(state, question) { state.currentQuestion = question; },
    SET_DIALOG_HISTORY(state, history) { state.dialogHistory = history; },
    ADD_TO_DIALOG(state, dialogEntry) { state.dialogHistory.push(dialogEntry); },
    SET_LOADING(state, status) { state.loading = status; },
    SET_ERROR(state, error) { state.error = error; }
  },
  actions: {
    async startInterview({ commit }, topicId) {
      commit('SET_LOADING', true);
      try {
        const response = await interviewsAPI.startInterview(topicId);
        commit('SET_CURRENT_INTERVIEW', response.data.data);
        commit('SET_DIALOG_HISTORY', response.data.data.dialogHistory || []);
        commit('SET_CURRENT_QUESTION', null);
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
    async getInterviewStatus({ commit }, id) {
      commit('SET_LOADING', true);
      try {
        const response = await interviewsAPI.getInterviewStatus(id);
        commit('SET_CURRENT_INTERVIEW', response.data.data);
        commit('SET_DIALOG_HISTORY', response.data.data.dialogHistory || []);
        const lastEntry = response.data.data.dialogHistory?.slice(-1)[0];
        if (lastEntry?.role === 'interviewer') {
          commit('SET_CURRENT_QUESTION', lastEntry.content);
        } else {
          commit('SET_CURRENT_QUESTION', null);
        }
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
    async submitResponse({ commit, state }, responseText) {
      commit('SET_LOADING', true);
      try {
        commit('ADD_TO_DIALOG', { role: 'interviewee', content: responseText, timestamp: new Date() });
        const apiResponse = await interviewsAPI.submitResponse(state.currentInterview._id, { response: responseText });
        if (apiResponse.data.data.nextQuestion) {
          commit('ADD_TO_DIALOG', { role: 'interviewer', content: apiResponse.data.data.nextQuestion, timestamp: new Date() });
          commit('SET_CURRENT_QUESTION', apiResponse.data.data.nextQuestion);
        } else {
          commit('SET_CURRENT_QUESTION', null);
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
    async getNextQuestion({ commit, state }) {
      commit('SET_LOADING', true);
      try {
        const response = await interviewsAPI.getNextQuestion(state.currentInterview._id);
        if (response.data.data.isCompleted) {
          commit('SET_CURRENT_QUESTION', null);
          commit('SET_CURRENT_INTERVIEW', { ...state.currentInterview, status: 'completed' });
        } else {
          commit('ADD_TO_DIALOG', { role: 'interviewer', content: response.data.data.fullText, timestamp: new Date() });
          commit('SET_CURRENT_QUESTION', response.data.data.fullText);
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
    async endInterview({ commit, state }) {
      commit('SET_LOADING', true);
      try {
        const response = await interviewsAPI.endInterview(state.currentInterview._id);
        commit('SET_CURRENT_INTERVIEW', { ...state.currentInterview, status: 'completed' });
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
    error: state => state.error,
  }
};

const summaries = {
  namespaced: true,
  state: {
    currentSummary: null,
    allSummaries: [], // Added for consistency, assuming you might list summaries
    loading: false,
    error: null
  },
  mutations: {
    SET_CURRENT_SUMMARY(state, summary) { state.currentSummary = summary; },
    SET_ALL_SUMMARIES(state, summaries) { state.allSummaries = summaries; }, // Added
    SET_LOADING(state, status) { state.loading = status; },
    SET_ERROR(state, error) { state.error = error; }
  },
  actions: {
    async getSummary({ commit }, interviewId) {
      commit('SET_LOADING', true);
      try {
        const response = await summariesAPI.getSummary(interviewId); // Assuming this API exists and is imported
        commit('SET_CURRENT_SUMMARY', response.data.data);
        commit('SET_ERROR', null);
        return response.data.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || '获取总结失败');
        console.error('Error getting summary:', error);
        return null;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    async exportSummary({ commit }, { interviewId, format }) {
      commit('SET_LOADING', true);
      try {
        const response = await summariesAPI.exportSummary(interviewId, format); // Assuming this API exists
        commit('SET_ERROR', null);
        return response.data.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || '导出总结失败');
        console.error('Error exporting summary:', error);
        return null;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    // Added for consistency, assuming you might list summaries
    async fetchAllSummaries({ commit }) {
      commit('SET_LOADING', true);
      try {
        const response = await summariesAPI.getAllSummaries(); // Assuming this API exists
        commit('SET_ALL_SUMMARIES', response.data.data);
        commit('SET_ERROR', null);
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || '获取所有总结失败');
        console.error('Error fetching all summaries:', error);
      } finally {
        commit('SET_LOADING', false);
      }
    }
  },
  getters: {
    currentSummary: state => state.currentSummary,
    allSummaries: state => state.allSummaries, // Added
    isLoading: state => state.loading,
    error: state => state.error
  }
};

export default createStore({
  state: {
  },
  getters: {
  },
  mutations: {
  },
  actions: {
  },
  modules: {
    topics,
    interview,
    summaries
  }
})
