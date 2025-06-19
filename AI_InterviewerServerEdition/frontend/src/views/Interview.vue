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
            <!-- 输入方式切换 -->
            <el-form-item>
              <div class="input-mode-switch">
                <el-radio-group v-model="inputMode" size="small">
                  <el-radio-button label="text">打字输入</el-radio-button>
                  <el-radio-button label="voice" :disabled="!speechSupported">语音输入</el-radio-button>
                </el-radio-group>
                <el-tag v-if="!speechSupported" type="warning" size="small" style="margin-left: 10px;">
                  浏览器不支持语音识别
                </el-tag>
                <!-- 语言选择 -->
                <div v-if="speechSupported && inputMode === 'voice'" class="language-selector">
                  <el-select 
                    v-model="selectedLanguage" 
                    size="small" 
                    @change="changeLanguage"
                    :disabled="isListening"
                    style="width: 140px; margin-left: 15px;"
                  >
                    <el-option
                      v-for="lang in supportedLanguages"
                      :key="lang.code"
                      :label="lang.name"
                      :value="lang.code"
                    />
                  </el-select>
                </div>
              </div>
            </el-form-item>
            
            <!-- 文字输入区域 -->
            <el-form-item v-if="inputMode === 'text'">
              <el-input
                v-model="userResponse"
                type="textarea"
                :rows="4"
                placeholder="请输入您的回答..."
                :disabled="isSubmitting"
              />
            </el-form-item>
            
            <!-- 语音输入区域 -->
            <el-form-item v-if="inputMode === 'voice'">
              <div class="voice-input-area">
                <el-input
                  v-model="userResponse"
                  type="textarea"
                  :rows="4"
                  :placeholder="isListening ? '正在听取您的语音...' : '点击下方麦克风按钮开始语音输入'"
                  :disabled="isSubmitting"
                  readonly
                  class="voice-textarea"
                />
                <div class="voice-controls">
                  <!-- 主控制按钮区域 -->
                  <div class="voice-main-controls">
                    <el-button
                      v-if="!isListening"
                      type="primary"
                      size="default"
                      @click="startContinuousVoiceInput"
                      :disabled="isSubmitting"
                      class="voice-button continuous"
                    >
                      <el-icon :size="12"><microphone /></el-icon>
                      开始说话
                    </el-button>
                    
                    <el-button
                      v-else
                      type="danger"
                      size="default"
                      @click="stopVoiceInput"
                      class="voice-button listening"
                    >
                      <el-icon :size="12"><microphone /></el-icon>
                      停止录音
                    </el-button>
                    
                    <!-- 继续说话按钮 -->
                    <el-button
                      v-if="!isListening && userResponse.trim()"
                      type="success"
                      size="default"
                      @click="continueVoiceInput"
                      :disabled="isSubmitting"
                      class="voice-button continue"
                      style="margin-left: 10px;"
                    >
                      <el-icon :size="12"><microphone /></el-icon>
                      继续说话
                    </el-button>
                  </div>
                  
                  <div class="voice-status">
                    <span v-if="isListening && isContinuousMode" class="listening-text continuous">
                      <el-icon class="pulse-icon"><microphone /></el-icon>
                      持续录音中...（再次点击停止）
                    </span>
                    <span v-else-if="isListening" class="listening-text">
                      <el-icon class="pulse-icon"><microphone /></el-icon>
                      正在听取语音...
                    </span>
                    <span v-else-if="speechSupported && userResponse.trim()" class="ready-text">
                      点击"开始说话"进行录音，或点击"继续说话"追加内容
                    </span>
                    <span v-else-if="speechSupported" class="ready-text">
                      点击"开始说话"进行持续录音
                    </span>
                    <span v-else class="unsupported-text">
                      当前浏览器不支持语音识别
                    </span>
                  </div>
                  
                  <el-button 
                    v-if="userResponse.trim()" 
                    type="info" 
                    size="small" 
                    @click="clearVoiceInput"
                    style="margin-left: 10px;"
                  >
                                         清空
                   </el-button>
                   
                   <el-button 
                     type="warning" 
                     size="small" 
                     @click="testMicrophone"
                     style="margin-left: 10px;"
                   >
                     测试麦克风
                   </el-button>
                   
                   <el-button 
                     type="info" 
                     size="small" 
                     @click="showDiagnostics"
                     style="margin-left: 10px;"
                   >
                     详细诊断
                   </el-button>
                 </div>
               </div>
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

    <!-- 最后问题确认对话框 -->
    <el-dialog
      v-model="lastQuestionDialogVisible"
      title="访谈即将结束"
      width="40%"
    >
      <div class="last-question-content">
        <el-icon :size="48" color="#E6A23C" style="margin-bottom: 16px;">
          <warning />
        </el-icon>
        <p>{{ lastQuestionMessage }}</p>
        <p v-if="nextQuestionText" class="next-question-preview">
          下一个问题：{{ nextQuestionText }}
        </p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelLastQuestion">取消</el-button>
          <el-button type="primary" @click="proceedToLastQuestion">确定继续</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 自动结束提示对话框 -->
    <el-dialog
      v-model="autoEndDialogVisible"
      title="访谈结束提示"
      width="40%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      center
    >
      <div class="auto-end-content">
        <el-icon :size="48" color="#67C23A" style="margin-bottom: 16px;">
          <success-filled />
        </el-icon>
        <h3>{{ autoEndMessage }}</h3>
        <div class="countdown-container">
          <el-progress 
            type="circle" 
            :percentage="countdownPercentage"
            :format="countdownFormat"
            :status="countdownPercentage === 100 ? 'success' : ''"
          />
        </div>
      </div>
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

    <!-- 语音诊断对话框 -->
    <el-dialog
      v-model="diagnosticsVisible"
      title="🔍 语音识别详细诊断"
      width="70%"
      :close-on-click-modal="false"
    >
      <div v-if="diagnosticsLoading" class="diagnostics-loading">
        <el-icon class="is-loading"><loading /></el-icon>
        <span style="margin-left: 10px;">正在进行诊断检测...</span>
      </div>
      
      <div v-else-if="diagnosticsData" class="diagnostics-content">
        <el-collapse>
          <el-collapse-item title="🌐 浏览器环境" name="browser">
            <div class="diagnostic-item">
              <strong>用户代理:</strong> {{ diagnosticsData.browser.userAgent }}
            </div>
            <div class="diagnostic-item">
              <strong>浏览器语言:</strong> {{ diagnosticsData.browser.language }}
            </div>
            <div class="diagnostic-item">
              <strong>操作系统:</strong> {{ diagnosticsData.browser.platform }}
            </div>
          </el-collapse-item>
          
          <el-collapse-item title="🎤 Web Speech API" name="speechapi">
            <div class="diagnostic-item">
              <strong>API支持:</strong> 
              <el-tag :type="diagnosticsData.webSpeechAPI.supported ? 'success' : 'danger'">
                {{ diagnosticsData.webSpeechAPI.supported ? '✅ 支持' : '❌ 不支持' }}
              </el-tag>
            </div>
            <div class="diagnostic-item">
              <strong>标准API:</strong> 
              <el-tag :type="diagnosticsData.webSpeechAPI.standardAPI ? 'success' : 'info'">
                {{ diagnosticsData.webSpeechAPI.standardAPI ? '✅ 可用' : '❌ 不可用' }}
              </el-tag>
            </div>
            <div class="diagnostic-item">
              <strong>WebKit API:</strong> 
              <el-tag :type="diagnosticsData.webSpeechAPI.webkitAPI ? 'success' : 'info'">
                {{ diagnosticsData.webSpeechAPI.webkitAPI ? '✅ 可用' : '❌ 不可用' }}
              </el-tag>
            </div>
            <div class="diagnostic-item">
              <strong>实例创建:</strong> 
              <el-tag :type="diagnosticsData.webSpeechAPI.canCreateInstance ? 'success' : 'danger'">
                {{ diagnosticsData.webSpeechAPI.canCreateInstance ? '✅ 正常' : '❌ 失败' }}
              </el-tag>
            </div>
            <div v-if="diagnosticsData.webSpeechAPI.error" class="diagnostic-item error">
              <strong>错误信息:</strong> {{ diagnosticsData.webSpeechAPI.error }}
            </div>
          </el-collapse-item>
          
          <el-collapse-item title="🎙️ 麦克风设备" name="microphone">
            <div class="diagnostic-item">
              <strong>权限状态:</strong> 
              <el-tag :type="diagnosticsData.microphone.permission === 'granted' ? 'success' : 'danger'">
                {{ diagnosticsData.microphone.permission === 'granted' ? '✅ 已授权' : '❌ 被拒绝' }}
              </el-tag>
            </div>
            <div v-if="diagnosticsData.microphone.devices.length > 0">
              <strong>检测到的设备:</strong>
              <div v-for="(device, index) in diagnosticsData.microphone.devices" :key="index" class="device-item">
                • {{ device.label || '默认麦克风' }} ({{ device.readyState }})
              </div>
            </div>
            <div v-if="diagnosticsData.microphone.error" class="diagnostic-item error">
              <strong>错误信息:</strong> {{ diagnosticsData.microphone.error }}
            </div>
          </el-collapse-item>
          
          <el-collapse-item title="🌍 语言支持" name="language">
            <div class="diagnostic-item">
              <strong>当前语言:</strong> {{ diagnosticsData.languageSupport.currentLanguage || '未设置' }}
            </div>
            <div v-if="diagnosticsData.languageSupport.testResults.length > 0">
              <strong>语言测试结果:</strong>
              <div v-for="result in diagnosticsData.languageSupport.testResults" :key="result.language" class="language-test">
                <el-tag :type="result.status === 'configurable' ? 'success' : 'danger'" size="small">
                  {{ result.language }}
                </el-tag>
                <span class="language-status">{{ result.status === 'configurable' ? '可配置' : '出错' }}</span>
                <span v-if="result.error" class="language-error">{{ result.error }}</span>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
        
        <div class="diagnostics-summary">
          <el-alert
            v-if="getDiagnosticsSummary().type === 'success'"
            title="✅ 语音识别环境正常"
            :description="getDiagnosticsSummary().message"
            type="success"
            :closable="false"
          />
          <el-alert
            v-else-if="getDiagnosticsSummary().type === 'warning'"
            title="⚠️ 检测到潜在问题"
            :description="getDiagnosticsSummary().message"
            type="warning"
            :closable="false"
          />
          <el-alert
            v-else
            title="❌ 语音识别环境异常"
            :description="getDiagnosticsSummary().message"
            type="error"
            :closable="false"
          />
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="diagnosticsVisible = false">关闭</el-button>
          <el-button type="primary" @click="runDiagnostics">重新诊断</el-button>
          <el-button type="success" @click="copyDiagnostics">复制诊断信息</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Loading, Warning, SuccessFilled, Microphone } from '@element-plus/icons-vue';
import { interviewsAPI } from '../services/api';
import speechService from '../services/speechService';

export default {
  name: 'InterviewView',
  components: {
    Loading,
    Warning,
    SuccessFilled,
    Microphone
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
    
    // 新增状态
    const lastQuestionDialogVisible = ref(false);
    const lastQuestionMessage = ref('');
    const nextQuestionText = ref('');
    const autoEndDialogVisible = ref(false);
    const autoEndMessage = ref('');
    const countdownPercentage = ref(0);
    const countdownSeconds = ref(3);
    
    // 语音输入相关状态
    const inputMode = ref('text'); // 'text' 或 'voice'
    const speechSupported = ref(false);
    const isListening = ref(false);
    const isContinuousMode = ref(false); // 是否为持续录音模式
    const selectedLanguage = ref('zh-CN');
    const supportedLanguages = ref([]);
    
    // 诊断相关状态
    const diagnosticsVisible = ref(false);
    const diagnosticsLoading = ref(false);
    const diagnosticsData = ref(null);
    
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
      
      // 初始化语音识别
      initializeSpeechService();
    });
    
    // 组件卸载时清理语音识别
    onUnmounted(() => {
      if (speechService) {
        speechService.abortListening();
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
          // 处理最后一个问题的情况
          if (result.isLastQuestion && result.needsConfirmation) {
            // 显示确认对话框
            lastQuestionMessage.value = result.message;
            nextQuestionText.value = result.nextQuestion;
            lastQuestionDialogVisible.value = true;
          } else if (result.shouldAutoEnd) {
            // 自动结束访谈
            autoEndMessage.value = result.message;
            autoEndDialogVisible.value = true;
            startCountdown();
          } else if (result.isCompleted) {
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
    
    // 取消最后问题
    const cancelLastQuestion = () => {
      lastQuestionDialogVisible.value = false;
      lastQuestionMessage.value = '';
      nextQuestionText.value = '';
    };
    
    // 确认进入最后问题
    const proceedToLastQuestion = async () => {
      lastQuestionDialogVisible.value = false;
      isLoadingNext.value = true;
      isAIThinking.value = true;
      
      try {
        const response = await interviewsAPI.confirmLastQuestion(currentInterview.value._id);
        if (response.data.success) {
          // 更新store中的访谈状态
          await store.dispatch('interview/getInterviewStatus', currentInterview.value._id);
          ElMessage.success('已进入最后一个问题');
        } else {
          ElMessage.error('进入最后问题失败');
        }
      } catch (error) {
        ElMessage.error('进入最后问题失败');
      } finally {
        isLoadingNext.value = false;
        isAIThinking.value = false;
      }
    };
    
    // 开始倒计时
    const startCountdown = () => {
      countdownSeconds.value = 3;
      countdownPercentage.value = 0;
      
      const countdownInterval = setInterval(() => {
        countdownSeconds.value--;
        countdownPercentage.value = ((3 - countdownSeconds.value) / 3) * 100;
        
        if (countdownSeconds.value <= 0) {
          clearInterval(countdownInterval);
          autoEndDialogVisible.value = false;
          // 直接调用结束访谈
          endInterview();
        }
      }, 1000);
    };
    
    // 倒计时格式化
    const countdownFormat = () => {
      return `${countdownSeconds.value}`;
    };
    
    // 初始化语音识别服务
    const initializeSpeechService = async () => {
      // 检查安全上下文
      if (!window.isSecureContext) {
        console.error('🔒 警告：非安全上下文检测！', {
          isSecureContext: window.isSecureContext,
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          origin: window.location.origin
        });
        
        // 如果是通过IP访问，提示用户
        if (window.location.hostname !== 'localhost' && window.location.protocol === 'http:') {
          ElMessage.warning({
            message: '⚠️ 检测到HTTP协议访问！语音识别需要HTTPS或localhost环境。建议使用 http://localhost:5000 访问。',
            duration: 15000,
            showClose: true
          });
        }
      }
      
      const status = speechService.getStatus();
      speechSupported.value = status.isSupported;
      
      if (status.isSupported) {
        // 获取支持的语言列表
        supportedLanguages.value = speechService.getSupportedLanguages();
        
        // 设置当前语言
        selectedLanguage.value = status.currentLanguage || 'zh-CN';
        
        // 设置实时结果回调
        speechService.setInterimResultCallback((transcript) => {
          userResponse.value = transcript;
        });
        
        console.log('语音识别功能已启用', {
          当前语言: selectedLanguage.value,
          安全上下文: window.isSecureContext,
          协议: window.location.protocol,
          主机名: window.location.hostname
        });
      } else {
        console.warn('浏览器不支持语音识别，语音输入功能将不可用');
      }
    };
    
    // 开始持续语音输入
    const startContinuousVoiceInput = async () => {
      if (!speechSupported.value) {
        ElMessage.error('当前浏览器不支持语音识别');
        console.error('浏览器不支持语音识别，当前UA:', navigator.userAgent);
        return;
      }
      
      try {
        console.log('🚀 开始持续语音输入流程');
        
        isListening.value = true;
        isContinuousMode.value = true;
        userResponse.value = ''; // 清空之前的内容
        
        // 显示友好提示
        ElMessage.info({
          message: '🎤 开始持续录音，请允许麦克风权限并开始说话。说完后点击"停止录音"按钮。',
          duration: 4000
        });
        
        console.log('🎤 启动持续语音识别...');
        const transcript = await speechService.startContinuousListening(false);
        console.log('📝 持续语音识别结果:', transcript);
        
        if (transcript && transcript.trim()) {
          userResponse.value = transcript;
          ElMessage.success({
            message: `✅ 录音完成，识别到 ${transcript.length} 个字符`,
            duration: 3000
          });
          console.log('✅ 持续语音识别成功，内容:', transcript);
        } else {
          ElMessage.info({
            message: '🎤 录音已结束，但未识别到语音内容',
            duration: 3000
          });
          console.log('ℹ️ 持续录音结束，无内容');
        }
        
      } catch (error) {
        console.error('❌ 持续语音识别过程出错:', error);
        handleVoiceInputError(error);
      } finally {
        isListening.value = false;
        isContinuousMode.value = false;
        console.log('🏁 持续语音输入流程结束');
      }
    };

    // 继续语音输入（追加模式）
    const continueVoiceInput = async () => {
      if (!speechSupported.value) {
        ElMessage.error('当前浏览器不支持语音识别');
        return;
      }
      
      try {
        console.log('🚀 开始追加语音输入流程');
        
        isListening.value = true;
        isContinuousMode.value = true;
        
        // 保存当前内容
        const currentText = userResponse.value;
        
        // 显示友好提示
        ElMessage.info({
          message: '🎤 继续录音模式，新的语音内容将追加到现有内容后面',
          duration: 4000
        });
        
        console.log('🎤 启动追加语音识别（使用独立录音模式）...');
        // 使用独立的持续录音，不使用追加模式，避免内容重复
        const transcript = await speechService.startContinuousListening(false);
        console.log('📝 追加语音识别结果:', transcript);
        
        if (transcript && transcript.trim()) {
          // 将新内容追加到原有内容
          const separator = currentText.trim() ? ' ' : '';
          userResponse.value = currentText + separator + transcript;
          
          ElMessage.success({
            message: `✅ 追加录音完成，新增 ${transcript.length} 个字符`,
            duration: 3000
          });
          console.log('✅ 追加语音识别成功，新内容:', transcript);
        } else {
          ElMessage.info({
            message: '🎤 追加录音已结束，但未识别到新的语音内容',
            duration: 3000
          });
          console.log('ℹ️ 追加录音结束，无新内容');
        }
        
      } catch (error) {
        console.error('❌ 追加语音识别过程出错:', error);
        handleVoiceInputError(error);
      } finally {
        isListening.value = false;
        isContinuousMode.value = false;
        console.log('🏁 追加语音输入流程结束');
      }
    };

    // 语音输入错误处理
    const handleVoiceInputError = (error) => {
      console.error('❌ 错误详情:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // 在控制台输出调试信息供用户查看
      console.log('🔍 请将上述错误信息截图反馈给开发者');
      
      // 根据错误类型给出不同的提示
      if (error.message.includes('未检测到音频输入')) {
        ElMessage.error({
          message: '🎤 未检测到音频输入，请点击"测试麦克风"按钮检查设备和权限',
          duration: 5000
        });
      } else if (error.message.includes('语音识别启动异常')) {
        ElMessage.warning({
          message: '⚠️ 语音识别启动异常，请稍等片刻后重试',
          duration: 4000
        });
      } else if (error.message.includes('not-allowed') || error.message.includes('权限被拒绝')) {
        ElMessage.error({
          message: '🔒 麦克风权限被拒绝，请点击地址栏左侧的🎤图标允许权限',
          duration: 6000
        });
      } else if (error.message.includes('audio-capture') || error.message.includes('无法访问麦克风')) {
        ElMessage.error({
          message: '🎤 无法访问麦克风，请检查设备连接和权限设置',
          duration: 5000
        });
      } else if (error.message.includes('当前环境不支持语音识别')) {
        ElMessage.error({
          message: '🌐 ' + error.message,
          duration: 8000
        });
      } else if (error.message.includes('网络')) {
        ElMessage.error({
          message: '🌐 网络连接问题，请检查网络后重试',
          duration: 4000
        });
      } else {
        ElMessage.error({
          message: '❌ 语音识别失败：' + error.message + ' (请按F12查看控制台详情)',
          duration: 6000
        });
      }
    };
    
    // 停止语音输入
    const stopVoiceInput = () => {
      if (speechService && isListening.value) {
        console.log('🛑 用户手动停止语音输入');
        speechService.stopListening();
        isListening.value = false;
        isContinuousMode.value = false;
        
        ElMessage.info({
          message: '🎤 录音已停止',
          duration: 2000
        });
      }
    };
    
    // 清空语音输入
    const clearVoiceInput = () => {
      userResponse.value = '';
    };
    
    // 更改语音识别语言
    const changeLanguage = (newLanguage) => {
      if (speechService.setLanguage(newLanguage)) {
        selectedLanguage.value = newLanguage;
        ElMessage.success(`已切换到${supportedLanguages.value.find(l => l.code === newLanguage)?.name}`);
        console.log('语音识别语言已切换到:', newLanguage);
      } else {
        ElMessage.error('切换语言失败，请在录音结束后重试');
      }
    };
    
    // 测试麦克风
    const testMicrophone = async () => {
      try {
        console.log('开始测试麦克风...');
        ElMessage.info('正在测试麦克风权限...');
        
        // 直接请求麦克风权限
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('麦克风权限测试成功');
        
        // 立即停止流
        stream.getTracks().forEach(track => track.stop());
        
        ElMessage.success('麦克风权限正常！您可以正常使用语音输入功能');
        
        // 显示一些有用的信息
        console.log('麦克风设备信息:', stream.getTracks().map(track => ({
          label: track.label,
          kind: track.kind,
          enabled: track.enabled
        })));
        
      } catch (error) {
        console.error('麦克风测试失败:', error);
        
        let errorMessage = '麦克风测试失败';
        
        if (error.name === 'NotAllowedError') {
          errorMessage = '麦克风权限被拒绝。请点击浏览器地址栏左侧的麦克风图标，选择"允许"，然后重试';
        } else if (error.name === 'NotFoundError') {
          errorMessage = '未找到麦克风设备，请检查麦克风是否正确连接';
        } else if (error.name === 'NotReadableError') {
          errorMessage = '麦克风被其他应用占用，请关闭其他使用麦克风的应用后重试';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = '麦克风设备不满足要求';
        } else if (error.name === 'SecurityError') {
          errorMessage = '安全限制：请确保在HTTPS环境下使用语音功能';
        } else {
          errorMessage = `麦克风测试失败: ${error.message}`;
        }
        
        ElMessage.error(errorMessage);
      }
    };
    
    // 显示诊断对话框
    const showDiagnostics = () => {
      diagnosticsVisible.value = true;
      if (!diagnosticsData.value) {
        runDiagnostics();
      }
    };
    
    // 运行诊断
    const runDiagnostics = async () => {
      diagnosticsLoading.value = true;
      diagnosticsData.value = null;
      
      try {
        console.log('🔍 开始详细诊断...');
        const results = await speechService.performDiagnostics();
        diagnosticsData.value = results;
        console.log('✅ 诊断完成:', results);
      } catch (error) {
        console.error('❌ 诊断失败:', error);
        ElMessage.error('诊断失败：' + error.message);
      } finally {
        diagnosticsLoading.value = false;
      }
    };
    
    // 获取诊断总结
    const getDiagnosticsSummary = () => {
      if (!diagnosticsData.value) {
        return { type: 'info', message: '正在诊断中...' };
      }
      
      const data = diagnosticsData.value;
      
      // 检查关键功能
      const apiSupported = data.webSpeechAPI.supported;
      const canCreateInstance = data.webSpeechAPI.canCreateInstance;
      const microphoneGranted = data.microphone.permission === 'granted';
      
      if (apiSupported && canCreateInstance && microphoneGranted) {
        return {
          type: 'success',
          message: '语音识别功能完全正常，您可以正常使用语音输入功能。'
        };
      } else if (apiSupported && canCreateInstance && !microphoneGranted) {
        return {
          type: 'warning',
          message: '语音识别API可用，但麦克风权限有问题。请点击地址栏左侧的麦克风图标允许权限。'
        };
      } else if (apiSupported && !canCreateInstance) {
        return {
          type: 'error',
          message: '浏览器支持语音识别API，但无法创建识别实例。可能是浏览器版本或系统配置问题。'
        };
      } else {
        return {
          type: 'error',
          message: '浏览器不支持Web Speech API。请使用Chrome或Edge最新版本，或更新您的浏览器。'
        };
      }
    };
    
    // 复制诊断信息
    const copyDiagnostics = async () => {
      if (!diagnosticsData.value) return;
      
      const diagnosticsText = `
语音识别诊断报告
================
时间: ${diagnosticsData.value.timestamp}

浏览器环境:
- 用户代理: ${diagnosticsData.value.browser.userAgent}
- 浏览器语言: ${diagnosticsData.value.browser.language}
- 操作系统: ${diagnosticsData.value.browser.platform}

Web Speech API:
- API支持: ${diagnosticsData.value.webSpeechAPI.supported ? '✅ 支持' : '❌ 不支持'}
- 标准API: ${diagnosticsData.value.webSpeechAPI.standardAPI ? '✅ 可用' : '❌ 不可用'}
- WebKit API: ${diagnosticsData.value.webSpeechAPI.webkitAPI ? '✅ 可用' : '❌ 不可用'}
- 实例创建: ${diagnosticsData.value.webSpeechAPI.canCreateInstance ? '✅ 正常' : '❌ 失败'}
${diagnosticsData.value.webSpeechAPI.error ? `- 错误信息: ${diagnosticsData.value.webSpeechAPI.error}` : ''}

麦克风设备:
- 权限状态: ${diagnosticsData.value.microphone.permission === 'granted' ? '✅ 已授权' : '❌ 被拒绝'}
- 设备数量: ${diagnosticsData.value.microphone.devices.length}
${diagnosticsData.value.microphone.error ? `- 错误信息: ${diagnosticsData.value.microphone.error}` : ''}

语言支持:
- 当前语言: ${diagnosticsData.value.languageSupport.currentLanguage || '未设置'}
- 测试结果: ${diagnosticsData.value.languageSupport.testResults.map(r => `${r.language}(${r.status})`).join(', ')}

诊断结论:
${getDiagnosticsSummary().message}
`.trim();
      
      try {
        await navigator.clipboard.writeText(diagnosticsText);
        ElMessage.success('诊断信息已复制到剪贴板');
      } catch (error) {
        console.error('复制失败:', error);
        ElMessage.error('复制失败，请手动复制');
      }
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
      // 新增的状态和方法
      lastQuestionDialogVisible,
      lastQuestionMessage,
      nextQuestionText,
      autoEndDialogVisible,
      autoEndMessage,
      countdownPercentage,
      countdownFormat,
      cancelLastQuestion,
      proceedToLastQuestion,
      startCountdown,
      // 语音输入相关
      inputMode,
      speechSupported,
      isListening,
      isContinuousMode,
      selectedLanguage,
      supportedLanguages,
      startContinuousVoiceInput,
      continueVoiceInput,
      stopVoiceInput,
      clearVoiceInput,
      changeLanguage,
      testMicrophone,
      // 诊断相关
      diagnosticsVisible,
      diagnosticsLoading,
      diagnosticsData,
      showDiagnostics,
      runDiagnostics,
      getDiagnosticsSummary,
      copyDiagnostics,
      // 原有方法
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

/* 语音控制样式 */
.voice-main-controls {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.voice-button.continuous {
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border: none;
  box-shadow: 0 3px 8px rgba(64, 158, 255, 0.3);
  white-space: nowrap;
  min-width: auto;
  padding: 4px 20px;
  height: 28px;
  font-size: 10px;
  border-radius: 14px;
}

.voice-button.continue {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  border: none;
  box-shadow: 0 3px 8px rgba(103, 194, 58, 0.3);
  white-space: nowrap;
  min-width: auto;
  padding: 4px 20px;
  height: 28px;
  font-size: 10px;
  border-radius: 14px;
}

.voice-button.listening {
  background: linear-gradient(135deg, #f56c6c 0%, #f89898 100%);
  border: none;
  box-shadow: 0 3px 8px rgba(245, 108, 108, 0.3);
  animation: pulse 2s infinite;
  white-space: nowrap;
  min-width: auto;
  padding: 4px 20px;
  height: 28px;
  font-size: 10px;
  border-radius: 14px;
}

.voice-status .listening-text.continuous {
  color: #67c23a;
  font-weight: bold;
}

@keyframes pulse {
  0% {
    box-shadow: 0 3px 8px rgba(245, 108, 108, 0.3);
  }
  50% {
    box-shadow: 0 3px 15px rgba(245, 108, 108, 0.6);
  }
  100% {
    box-shadow: 0 3px 8px rgba(245, 108, 108, 0.3);
  }
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

/* 新增对话框样式 */
.last-question-content {
  text-align: center;
  padding: 20px;
}

.last-question-content p {
  margin: 10px 0;
  color: #606266;
  line-height: 1.6;
}

.next-question-preview {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #409EFF;
  margin-top: 15px !important;
  font-weight: 500;
  text-align: left;
}

.auto-end-content {
  text-align: center;
  padding: 30px 20px;
}

.auto-end-content h3 {
  margin: 15px 0 25px 0;
  color: #303133;
}

.countdown-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 语音输入样式 */
.input-mode-switch {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.language-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.voice-input-area {
  position: relative;
}

.voice-textarea {
  background-color: #f8f9fa;
  border: 2px dashed #e9ecef;
}

.voice-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  gap: 16px;
}

.voice-button {
  width: 60px;
  height: 60px;
  font-size: 24px;
  transition: all 0.3s ease;
}

.voice-button.listening {
  animation: pulse 1.5s infinite;
  box-shadow: 0 0 20px rgba(245, 108, 108, 0.5);
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.voice-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 150px;
}

.listening-text {
  color: #f56c6c;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ready-text {
  color: #409eff;
  font-size: 14px;
}

.unsupported-text {
  color: #909399;
  font-size: 14px;
}

.pulse-icon {
  animation: iconPulse 1s infinite;
}

@keyframes iconPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 诊断对话框样式 */
.diagnostics-loading {
  text-align: center;
  padding: 40px 20px;
  color: #409eff;
  font-size: 16px;
}

.diagnostics-content {
  max-height: 60vh;
  overflow-y: auto;
}

.diagnostic-item {
  margin: 10px 0;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.diagnostic-item:last-child {
  border-bottom: none;
}

.diagnostic-item.error {
  color: #f56c6c;
  background-color: #fef0f0;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #fbc4c4;
}

.device-item {
  margin: 5px 0 5px 20px;
  color: #666;
  font-size: 14px;
}

.language-test {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 5px 0;
  padding: 5px 0;
}

.language-status {
  font-size: 14px;
  color: #666;
}

.language-error {
  font-size: 12px;
  color: #f56c6c;
}

.diagnostics-summary {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #f0f0f0;
}
</style>
