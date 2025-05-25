<template>
  <div class="interview-container">
    <!-- AI思考中的全局提示 -->
    <el-card v-if="isAIThinking" class="ai-thinking-card">
      <div class="ai-thinking-global">
        <div class="thinking-indicator">
          <el-icon class="thinking-icon">
            <loading />
          </el-icon>
          <span class="thinking-text">AI访谈者思考中...</span>
        </div>
      </div>
    </el-card>

    <el-card v-if="loading && !isAIThinking" class="loading-card">
      <div class="loading-content">
        <el-skeleton :rows="5" animated />
      </div>
    </el-card>

    <el-card v-else-if="error" class="error-card">
      <el-alert
        :title="error"
        type="error"
        show-icon
      />
    </el-card>

    <template v-else>
      <el-card class="topic-card">
        <template #header>
          <div class="card-header">
            <h2>{{ topicTitle }}</h2>
            <div class="interview-progress">
              <el-progress 
                :percentage="progressPercentage" 
                :format="progressFormat"
                :status="isCompleted ? 'success' : ''"
              />
            </div>
          </div>
        </template>
        <div class="topic-content">
          <p class="topic-outline">{{ topicOutline }}</p>
        </div>
      </el-card>

      <el-card class="dialog-card">
        <div class="dialog-history">
          <div 
            v-for="(message, index) in dialogHistory" 
            :key="index" 
            :class="['message', message.role === 'interviewer' ? 'interviewer' : 'interviewee']"
          >
            <div class="message-content">
              <p>{{ message.content }}</p>
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
            </div>
          </div>
          
          <!-- AI思考中的提示 -->
          <div v-if="isAIThinking" class="message interviewer ai-thinking">
            <div class="message-content thinking-content">
              <div class="thinking-indicator">
                <el-icon class="thinking-icon">
                  <loading />
                </el-icon>
                <span class="thinking-text">AI访谈者思考中...</span>
              </div>
              <span class="message-time">{{ formatTime(new Date()) }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <el-card v-if="!isCompleted" class="response-card">
        <div class="current-question" v-if="currentQuestion">
          <h3>当前问题：</h3>
          <p>{{ currentQuestion }}</p>
        </div>
        
        <div class="response-form">
          <el-form @submit.prevent="submitResponse">
            <el-form-item>
              <el-input
                v-model="userResponse"
                type="textarea"
                :rows="4"
                placeholder="请输入您的回答..."
                :disabled="isSubmitting"
              />
            </el-form-item>
            <el-form-item>
              <div class="action-buttons">
                <el-button 
                  type="primary" 
                  @click="submitResponse" 
                  :loading="isSubmitting"
                  :disabled="!userResponse.trim()"
                >
                  提交回答
                </el-button>
                <el-button 
                  type="success" 
                  @click="getNextQuestion" 
                  :loading="isLoadingNext"
                  :disabled="isSubmitting"
                >
                  下一个问题
                </el-button>
                <el-button 
                  type="danger" 
                  @click="confirmEndInterview" 
                  :disabled="isSubmitting || isLoadingNext"
                >
                  结束访谈
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </el-card>

      <el-card v-else class="completed-card">
        <div class="completed-message">
          <el-result
            icon="success"
            title="访谈已完成"
            sub-title="感谢您的参与！"
          >
            <template #extra>
              <el-button type="primary" @click="viewSummary">查看总结</el-button>
              <el-button @click="backToHome">返回主页</el-button>
            </template>
          </el-result>
        </div>
      </el-card>
    </template>

    <!-- 结束访谈确认对话框 -->
    <el-dialog
      v-model="endDialogVisible"
      title="确认结束访谈"
      width="30%"
    >
      <span>确定要结束当前访谈吗？此操作不可撤销。</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="endDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="endInterview">确认结束</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 总结生成进度对话框 -->
    <el-dialog
      v-model="summaryGeneratingVisible"
      title="访谈总结生成中"
      width="40%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      center
    >
      <div class="summary-generating-content">
        <div class="summary-icon">
          <el-icon :size="48" color="#409EFF">
            <loading />
          </el-icon>
        </div>
        <h3>正在生成访谈总结</h3>
        <p class="summary-text">{{ summaryText }}</p>
        <el-progress 
          :percentage="summaryProgress" 
          :format="summaryFormat"
          :status="summaryProgress === 100 ? 'success' : ''"
          :stroke-width="8"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';

export default {
  name: 'InterviewView',
  components: {
    Loading
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const route = useRoute();
    
    const userResponse = ref('');
    const isSubmitting = ref(false);
    const isLoadingNext = ref(false);
    const endDialogVisible = ref(false);
    const summaryGeneratingVisible = ref(false);
    const summaryProgress = ref(0);
    const summaryText = ref('正在生成访谈总结...');
    const isAIThinking = ref(false);
    
    // 从store获取数据
    const currentInterview = computed(() => store.getters['interview/currentInterview']);
    const currentQuestion = computed(() => store.getters['interview/currentQuestion']);
    const dialogHistory = computed(() => store.getters['interview/dialogHistory']);
    const loading = computed(() => store.getters['interview/isLoading']);
    const error = computed(() => store.getters['interview/error']);
    const isCompleted = computed(() => store.getters['interview/isCompleted']);
    
    // 主题信息
    const topicTitle = computed(() => currentInterview.value?.topicId?.title || '');
    const topicOutline = computed(() => currentInterview.value?.topicId?.outline || '');
    
    // 进度计算
    const progressPercentage = computed(() => {
      if (!currentInterview.value || !currentInterview.value.topicId || !currentInterview.value.topicId.keyQuestions) return 0;
      
      const totalQuestions = currentInterview.value.topicId.keyQuestions.length;
      if (totalQuestions === 0) return 0;
      
      if (isCompleted.value) return 100;
      
      const currentIndex = currentInterview.value.currentQuestionIndex || 0;
      return Math.round((currentIndex / totalQuestions) * 100);
    });
    
    const progressFormat = () => {
      if (!currentInterview.value || !currentInterview.value.topicId || !currentInterview.value.topicId.keyQuestions) return '';
      
      const totalQuestions = currentInterview.value.topicId.keyQuestions.length;
      if (totalQuestions === 0) return '';
      
      const currentIndex = currentInterview.value.currentQuestionIndex || 0;
      return `${currentIndex}/${totalQuestions}`;
    };
    
    const summaryFormat = (percentage) => {
      return `${percentage}%`;
    };
    
    // 获取访谈状态
    onMounted(async () => {
      const interviewId = route.params.id;
      if (!interviewId) {
        ElMessage.error('访谈ID无效');
        router.push({ name: 'Home' });
        return;
      }
      
      await store.dispatch('interview/getInterviewStatus', interviewId);
      
      // 如果访谈已完成，显示完成状态
      if (isCompleted.value) {
        ElMessage.success('该访谈已完成');
      }
    });
    
    // 提交回答
    const submitResponse = async () => {
      if (!userResponse.value.trim()) {
        ElMessage.warning('请输入您的回答');
        return;
      }
      
      isSubmitting.value = true;
      isAIThinking.value = true; // 显示AI思考提示
      
      try {
        const result = await store.dispatch('interview/submitResponse', userResponse.value);
        if (result) {
          userResponse.value = ''; // 清空输入
          ElMessage.success('回答已提交');
        } else {
          ElMessage.error('提交回答失败');
        }
      } catch (error) {
        ElMessage.error('提交回答失败');
      } finally {
        isSubmitting.value = false;
        isAIThinking.value = false; // 隐藏AI思考提示
      }
    };
    
    // 获取下一个问题
    const getNextQuestion = async () => {
      isLoadingNext.value = true;
      isAIThinking.value = true; // 显示AI思考提示
      
      try {
        const result = await store.dispatch('interview/getNextQuestion');
        if (result) {
          if (result.isCompleted) {
            ElMessage.success('访谈已完成');
          } else {
            ElMessage.success('已进入下一个问题');
          }
        } else {
          ElMessage.error('获取下一个问题失败');
        }
      } catch (error) {
        ElMessage.error('获取下一个问题失败');
      } finally {
        isLoadingNext.value = false;
        isAIThinking.value = false; // 隐藏AI思考提示
      }
    };
    
    // 确认结束访谈
    const confirmEndInterview = () => {
      endDialogVisible.value = true;
    };
    
    // 结束访谈
    const endInterview = async () => {
      endDialogVisible.value = false;
      
      // 显示总结生成进度
      summaryGeneratingVisible.value = true;
      summaryProgress.value = 0;
      summaryText.value = '正在结束访谈...';
      
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        if (summaryProgress.value < 90) {
          summaryProgress.value += 15;
          
          if (summaryProgress.value === 15) {
            summaryText.value = '正在保存访谈记录...';
          } else if (summaryProgress.value === 30) {
            summaryText.value = '正在分析对话内容...';
          } else if (summaryProgress.value === 45) {
            summaryText.value = 'AI正在生成总结...';
          } else if (summaryProgress.value === 60) {
            summaryText.value = '正在计算评分...';
          } else if (summaryProgress.value === 75) {
            summaryText.value = '正在整理总结报告...';
          } else if (summaryProgress.value === 90) {
            summaryText.value = '即将完成...';
          }
        }
      }, 800);
      
      try {
        const result = await store.dispatch('interview/endInterview');
        
        clearInterval(progressInterval);
        
        if (result) {
          summaryProgress.value = 100;
          summaryText.value = '总结生成完成！';
          
          setTimeout(() => {
            summaryGeneratingVisible.value = false;
            ElMessage.success('访谈已结束，总结已生成');
          }, 1000);
        } else {
          summaryGeneratingVisible.value = false;
          ElMessage.error('结束访谈失败');
        }
      } catch (error) {
        clearInterval(progressInterval);
        summaryGeneratingVisible.value = false;
        ElMessage.error('结束访谈失败');
      }
    };
    
    // 查看总结
    const viewSummary = () => {
      router.push({ 
        name: 'summary', 
        params: { interviewId: currentInterview.value._id } 
      });
    };
    
    // 返回主页
    const backToHome = () => {
      router.push({ name: 'home' });
    };
    
    // 格式化时间
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    return {
      userResponse,
      currentInterview,
      currentQuestion,
      dialogHistory,
      loading,
      error,
      isCompleted,
      isSubmitting,
      isLoadingNext,
      isAIThinking,
      endDialogVisible,
      summaryGeneratingVisible,
      summaryProgress,
      summaryText,
      topicTitle,
      topicOutline,
      progressPercentage,
      progressFormat,
      summaryFormat,
      submitResponse,
      getNextQuestion,
      confirmEndInterview,
      endInterview,
      viewSummary,
      backToHome,
      formatTime
    };
  }
};
</script>

<style scoped>
.interview-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.loading-card,
.error-card {
  margin-bottom: 20px;
}

.topic-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  flex-direction: column;
}

.card-header h2 {
  margin: 0 0 10px 0;
  font-size: 20px;
  color: #303133;
}

.interview-progress {
  width: 100%;
}

.topic-content {
  margin-top: 10px;
}

.topic-outline {
  color: #606266;
  line-height: 1.6;
}

.dialog-card {
  margin-bottom: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.dialog-history {
  display: flex;
  flex-direction: column;
}

.message {
  margin-bottom: 15px;
  display: flex;
}

.message.interviewer {
  justify-content: flex-start;
}

.message.interviewee {
  justify-content: flex-end;
}

.message-content {
  max-width: 80%;
  padding: 10px 15px;
  border-radius: 8px;
  position: relative;
}

.message.interviewer .message-content {
  background-color: #f2f6fc;
  color: #303133;
}

.message.interviewee .message-content {
  background-color: #ecf5ff;
  color: #409eff;
}

.message-content p {
  margin: 0;
  line-height: 1.5;
}

.message-time {
  font-size: 12px;
  color: #909399;
  display: block;
  margin-top: 5px;
  text-align: right;
}

.response-card {
  margin-bottom: 20px;
}

.current-question {
  margin-bottom: 15px;
}

.current-question h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #303133;
}

.current-question p {
  color: #606266;
  line-height: 1.6;
  font-weight: bold;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
}

.completed-card {
  text-align: center;
}

.completed-message {
  padding: 20px 0;
}

/* AI思考提示样式 */
.ai-thinking-card {
  margin-bottom: 20px;
  border: 2px solid #409eff;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
}

.ai-thinking-global {
  text-align: center;
  padding: 20px;
}

.ai-thinking-global .thinking-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 16px;
}

.ai-thinking-global .thinking-icon {
  animation: spin 1s linear infinite;
  color: #409eff;
  font-size: 24px;
}

.ai-thinking-global .thinking-text {
  color: #409eff;
  font-weight: 600;
  font-style: italic;
}

/* 总结生成对话框样式 */
.summary-generating-content {
  text-align: center;
  padding: 20px;
}

.summary-icon {
  margin-bottom: 20px;
}

.summary-generating-content h3 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 18px;
}

.summary-text {
  color: #409eff;
  font-size: 14px;
  margin-bottom: 20px;
  font-weight: 500;
}

.ai-thinking .message-content {
  background-color: #f0f2f5 !important;
  border: 1px dashed #d1d5db;
  opacity: 0.8;
}

.thinking-content {
  position: relative;
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.thinking-icon {
  animation: spin 1s linear infinite;
  color: #409eff;
}

.thinking-text {
  color: #606266;
  font-style: italic;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
