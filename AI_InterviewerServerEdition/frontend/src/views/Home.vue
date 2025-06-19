<template>
  <div class="home">
    <h1>访谈主题列表</h1>
    
    <el-row :gutter="20" class="action-row">
      <el-col :span="24">
        <el-button type="primary" @click="navigateToCreate">
          创建新主题
        </el-button>
      </el-col>
    </el-row>
    
    <el-row v-if="loading" class="loading-row">
      <el-col :span="24" class="text-center">
        <el-skeleton :rows="5" animated />
      </el-col>
    </el-row>
    
    <el-row v-else-if="error" class="error-row">
      <el-col :span="24">
        <el-alert
          :title="error"
          type="error"
          show-icon
        />
      </el-col>
    </el-row>
    
    <el-row v-else-if="topics.length === 0" class="empty-row">
      <el-col :span="24" class="text-center">
        <el-empty description="暂无访谈主题" />
      </el-col>
    </el-row>
    
    <el-row v-else :gutter="20" class="topics-row">
      <el-col v-for="topic in topics" :key="topic._id" :xs="24" :sm="12" :md="8" :lg="6" class="topic-col">
        <el-card class="topic-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <h3>{{ topic.title }}</h3>
              <div class="card-actions">
                <el-button-group>
                  <el-button size="small" @click="startInterview(topic._id)">
                    开始访谈
                  </el-button>
                  <el-button size="small" @click="viewTopicSummaries(topic._id)" type="info">
                    查看总结
                  </el-button>
                  <el-dropdown trigger="click">
                    <el-button size="small">
                      <el-icon><more /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item @click="editTopic(topic)">
                          编辑
                        </el-dropdown-item>
                        <el-dropdown-item @click="confirmDelete(topic)">
                          删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </el-button-group>
              </div>
            </div>
          </template>
          <div class="topic-content">
            <p class="outline">{{ truncateText(topic.outline, 100) }}</p>
            <p class="questions-count">
              <el-tag size="small">{{ topic.keyQuestions.length }} 个问题</el-tag>
            </p>
            <p class="created-at">
              创建于: {{ formatDate(topic.createdAt) }}
            </p>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 访谈准备对话框 -->
    <el-dialog
      v-model="preparingDialogVisible"
      title="访谈准备中"
      width="40%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      center
    >
      <div class="preparing-content">
        <div class="preparing-icon">
          <el-icon :size="48" color="#409EFF">
            <loading />
          </el-icon>
        </div>
        <h3>正在为您准备访谈</h3>
        <p class="preparing-text">{{ preparingText }}</p>
        <el-progress 
          :percentage="preparingProgress" 
          :status="preparingProgress === 100 ? 'success' : ''"
          :stroke-width="8"
        />
      </div>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      width="30%"
    >
      <span>确定要删除主题 "{{ topicToDelete?.title }}" 吗？此操作不可撤销。</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="deleteTopic">确认删除</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 访谈选择对话框 -->
    <el-dialog
      v-model="showInterviewSelectionDialog"
      title="访谈记录管理"
      width="60%"
    >
      <div class="interview-selection">
        <div class="selection-header">
          <p>该主题下有 {{ selectedTopicInterviews.length }} 个已完成的访谈：</p>
          <div class="batch-actions">
            <el-checkbox 
              v-model="selectAll" 
              @change="handleSelectAll"
              :indeterminate="isIndeterminate"
            >
              全选
            </el-checkbox>
            <el-button 
              type="primary" 
              size="small" 
              @click="batchDownload"
              :disabled="selectedInterviewIds.length === 0"
            >
              批量下载 ({{ selectedInterviewIds.length }})
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="batchDelete"
              :disabled="selectedInterviewIds.length === 0"
            >
              批量删除 ({{ selectedInterviewIds.length }})
            </el-button>
          </div>
        </div>
        
        <el-table :data="selectedTopicInterviews" style="width: 100%">
          <el-table-column type="selection" width="55" @selection-change="handleSelectionChange" />
          
          <el-table-column prop="createdAt" label="访谈时间" width="180">
            <template #default="scope">
              {{ new Date(scope.row.createdAt).toLocaleString() }}
            </template>
          </el-table-column>
          
          <el-table-column prop="dialogHistory" label="对话轮数" width="100">
            <template #default="scope">
              {{ scope.row.dialogHistory?.length || 0 }} 轮
            </template>
          </el-table-column>
          
          <el-table-column prop="status" label="状态" width="80">
            <template #default>
              <el-tag type="success">已完成</el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="200">
            <template #default="scope">
              <el-button 
                type="primary" 
                size="small" 
                @click="viewSummary(scope.row._id)"
              >
                查看总结
              </el-button>
              <el-button 
                type="info" 
                size="small" 
                @click="downloadSummary(scope.row._id)"
              >
                下载
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                @click="deleteSummary(scope.row._id)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelViewSummary">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ElMessageBox } from 'element-plus';
import { More, Loading } from '@element-plus/icons-vue';
import { summariesAPI, interviewsAPI } from '../services/api';

export default {
  name: 'HomeView',
  components: {
    More,
    Loading
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const deleteDialogVisible = ref(false);
    const topicToDelete = ref(null);
    
    // 访谈选择对话框相关状态
    const showInterviewSelectionDialog = ref(false);
    const selectedTopicInterviews = ref([]);
    const currentTopicForSummary = ref(null);
    const selectedInterviewId = ref('');
    
    // 批量操作相关状态
    const selectedInterviewIds = ref([]);
    const selectAll = ref(false);
    const isIndeterminate = ref(false);
    
    // 访谈准备相关状态
    const preparingDialogVisible = ref(false);
    const preparingProgress = ref(0);
    const preparingText = ref('初始化访谈...');
    
    // 从store获取数据
    const topics = computed(() => store.getters['topics/allTopics']);
    const loading = computed(() => store.getters['topics/isLoading']);
    const error = computed(() => store.getters['topics/error']);
    
    // 获取主题列表
    onMounted(async () => {
      await store.dispatch('topics/fetchTopics');
    });
    
    // 导航到创建页面
    const navigateToCreate = () => {
      router.push({ name: 'createTopic' });
    };
    
    // 开始访谈
    const startInterview = async (topicId) => {
      // 显示准备对话框
      preparingDialogVisible.value = true;
      preparingProgress.value = 0;
      preparingText.value = '正在初始化AI访谈系统...';
      
      // 声明progressInterval，让它在整个函数作用域内可用
      let progressInterval = null;
      
      try {
        // 更慢的进度更新，给AI更多时间准备
        progressInterval = setInterval(() => {
          if (preparingProgress.value < 80) {
            preparingProgress.value += 8;
            
            if (preparingProgress.value === 8) {
              preparingText.value = '正在加载主题信息...';
            } else if (preparingProgress.value === 16) {
              preparingText.value = '正在分析访谈大纲...';
            } else if (preparingProgress.value === 24) {
              preparingText.value = '正在生成评分指标...';
            } else if (preparingProgress.value === 32) {
              preparingText.value = '正在生成个性化背景问题...';
            } else if (preparingProgress.value === 40) {
              preparingText.value = '正在配置AI访谈助手...';
            } else if (preparingProgress.value === 48) {
              preparingText.value = '正在优化对话策略...';
            } else if (preparingProgress.value === 56) {
              preparingText.value = '正在准备深度分析模块...';
            } else if (preparingProgress.value === 64) {
              preparingText.value = '正在初始化访谈环境...';
            } else if (preparingProgress.value === 72) {
              preparingText.value = '正在完成最后准备...';
            } else if (preparingProgress.value === 80) {
              preparingText.value = 'AI准备就绪，即将开始访谈...';
            }
          }
        }, 400); // 改为400ms间隔，给AI更多时间
        
        const result = await store.dispatch('interview/startInterview', topicId);
        
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        
        if (result) {
          // 确保AI已准备就绪
          preparingProgress.value = 100;
          preparingText.value = 'AI已准备就绪！正在进入访谈...';
          
          // 延长等待时间，确保用户感受到AI确实已准备好
          setTimeout(() => {
            preparingDialogVisible.value = false;
            router.push({ 
              name: 'interview', 
              params: { id: result._id } 
            });
          }, 1500); // 增加到1.5秒
        } else {
          preparingDialogVisible.value = false;
          ElMessage.error('AI初始化失败，请重试');
        }
      } catch (error) {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        preparingDialogVisible.value = false;
        ElMessage.error('AI初始化失败，请重试');
      }
    };
    
    // 查看主题的所有总结
    const viewTopicSummaries = async (topicId) => {
      try {
        const response = await interviewsAPI.getInterviewsByTopic(topicId);
        const interviews = response.data.data;

        if (!interviews || interviews.length === 0) {
          ElMessage.info('该主题下暂无已完成的访谈总结');
          return;
        }
        
        // 如果只有一个访谈，直接跳转
        if (interviews.length === 1) {
          router.push({
            name: 'summary',
            params: { interviewId: interviews[0]._id }
          });
          return;
        }
        
        // 如果有多个，显示选择对话框
        showInterviewSelectionDialog.value = true;
        selectedTopicInterviews.value = interviews;
        currentTopicForSummary.value = topicId;
        
      } catch (error) {
        console.error('获取主题访谈失败:', error);
        ElMessage.error('获取访谈列表失败');
      }
    };

    // 编辑主题
    const editTopic = (topic) => {
      ElMessage.info('编辑功能开发中，将重定向到创建页面');
      router.push({ 
        name: 'createTopic',
        query: { edit: topic._id }
      });
    };
    
    // 确认删除
    const confirmDelete = (topic) => {
      topicToDelete.value = topic;
      deleteDialogVisible.value = true;
    };
    
    // 删除主题
    const deleteTopic = async () => {
      if (!topicToDelete.value) return;
      
      try {
        const success = await store.dispatch('topics/deleteTopic', topicToDelete.value._id);
        if (success) {
          ElMessage.success('主题已成功删除');
          deleteDialogVisible.value = false;
          topicToDelete.value = null;
        } else {
          ElMessage.error('删除主题失败');
        }
      } catch (error) {
        ElMessage.error('删除主题失败');
      }
    };
    
    // 格式化日期
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    };
    
    // 截断文本
    const truncateText = (text, maxLength) => {
      if (!text) return '';
      return text.length > maxLength 
        ? text.substring(0, maxLength) + '...' 
        : text;
    };
    
    // 取消选择访谈
    const cancelViewSummary = () => {
      showInterviewSelectionDialog.value = false;
      selectedInterviewId.value = '';
      selectedTopicInterviews.value = [];
      currentTopicForSummary.value = null;
      selectedInterviewIds.value = [];
      selectAll.value = false;
      isIndeterminate.value = false;
    };
    
    // 处理表格选择变化
    const handleSelectionChange = (selection) => {
      selectedInterviewIds.value = selection.map(item => item._id);
      const total = selectedTopicInterviews.value.length;
      const selected = selectedInterviewIds.value.length;
      
      selectAll.value = selected === total;
      isIndeterminate.value = selected > 0 && selected < total;
    };
    
    // 处理全选
    const handleSelectAll = (val) => {
      if (val) {
        selectedInterviewIds.value = selectedTopicInterviews.value.map(item => item._id);
      } else {
        selectedInterviewIds.value = [];
      }
      isIndeterminate.value = false;
    };
    
    // 查看单个总结
    const viewSummary = (interviewId) => {
      showInterviewSelectionDialog.value = false;
      router.push({
        name: 'summary',
        params: { interviewId }
      });
    };
    
    // 下载单个总结
    const downloadSummary = async (interviewId) => {
      try {
        const response = await fetch(`http://localhost:5000/api/summaries/${interviewId}/export`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ format: 'json' })
        });
        
        const data = await response.json();
        if (data.success) {
          // 创建下载链接
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `interview_summary_${interviewId}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          ElMessage.success('总结下载成功');
        } else {
          ElMessage.error('下载失败：' + data.message);
        }
      } catch (error) {
        console.error('下载总结失败:', error);
        ElMessage.error('下载失败');
      }
    };
    
    // 删除单个总结
    const deleteSummary = async (interviewId) => {
      try {
        await ElMessageBox.confirm(
          '确定要删除这个访谈总结吗？此操作不可撤销。',
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        );
        
        const response = await summariesAPI.deleteSummary(interviewId);
        
        if (response.data.success) {
          // 从列表中移除已删除的访谈
          selectedTopicInterviews.value = selectedTopicInterviews.value.filter(
            interview => interview._id !== interviewId
          );
          
          // 清空选择状态
          selectedInterviewIds.value = selectedInterviewIds.value.filter(id => id !== interviewId);
          
          // 重新计算选择状态
          const total = selectedTopicInterviews.value.length;
          const selected = selectedInterviewIds.value.length;
          selectAll.value = selected === total && total > 0;
          isIndeterminate.value = selected > 0 && selected < total;
          
          ElMessage.success('总结删除成功');
          
          // 如果列表为空，关闭对话框
          if (selectedTopicInterviews.value.length === 0) {
            cancelViewSummary();
          }
        } else {
          ElMessage.error('删除失败：' + response.data.message);
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除总结失败:', error);
          ElMessage.error('删除失败');
        }
      }
    };
    
    // 批量下载
    const batchDownload = async () => {
      if (selectedInterviewIds.value.length === 0) {
        ElMessage.warning('请选择要下载的访谈');
        return;
      }
      
      try {
        for (const interviewId of selectedInterviewIds.value) {
          await downloadSummary(interviewId);
          // 添加延迟以避免同时下载过多文件
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error('批量下载失败:', error);
      }
    };
    
    // 批量删除
    const batchDelete = async () => {
      if (selectedInterviewIds.value.length === 0) {
        ElMessage.warning('请选择要删除的访谈');
        return;
      }
      
      try {
        await ElMessageBox.confirm(
          `确定要删除选中的 ${selectedInterviewIds.value.length} 个访谈总结吗？此操作不可撤销。`,
          '确认批量删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        );
        
        let successCount = 0;
        let failCount = 0;
        
        for (const interviewId of selectedInterviewIds.value) {
          try {
            const response = await summariesAPI.deleteSummary(interviewId);
            
            if (response.data.success) {
              successCount++;
            } else {
              failCount++;
            }
          } catch (error) {
            failCount++;
          }
        }
        
        // 刷新列表
        selectedTopicInterviews.value = selectedTopicInterviews.value.filter(
          interview => !selectedInterviewIds.value.includes(interview._id)
        );
        
        // 清空选择
        selectedInterviewIds.value = [];
        selectAll.value = false;
        isIndeterminate.value = false;
        
        if (successCount > 0) {
          ElMessage.success(`成功删除 ${successCount} 个总结${failCount > 0 ? `，${failCount} 个删除失败` : ''}`);
        }
        
        if (failCount > 0 && successCount === 0) {
          ElMessage.error('批量删除失败');
        }
        
        // 如果列表为空，关闭对话框
        if (selectedTopicInterviews.value.length === 0) {
          cancelViewSummary();
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量删除失败:', error);
          ElMessage.error('批量删除失败');
        }
      }
    };
    
    return {
      topics,
      loading,
      error,
      deleteDialogVisible,
      topicToDelete,
      showInterviewSelectionDialog,
      selectedTopicInterviews,
      currentTopicForSummary,
      selectedInterviewId,
      selectedInterviewIds,
      selectAll,
      isIndeterminate,
      preparingDialogVisible,
      preparingProgress,
      preparingText,
      navigateToCreate,
      startInterview,
      viewTopicSummaries,
      editTopic,
      confirmDelete,
      deleteTopic,
      formatDate,
      truncateText,
      cancelViewSummary,
      handleSelectionChange,
      handleSelectAll,
      viewSummary,
      downloadSummary,
      deleteSummary,
      batchDownload,
      batchDelete
    };
  }
};
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.action-row {
  margin-bottom: 20px;
}

.loading-row, .error-row, .empty-row {
  margin-top: 40px;
}

.text-center {
  text-align: center;
}

.topics-row {
  margin-top: 20px;
}

.topic-col {
  margin-bottom: 20px;
}

.topic-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.outline {
  flex: 1;
  margin-bottom: 10px;
  color: #606266;
}

.questions-count {
  margin-bottom: 5px;
}

.created-at {
  font-size: 12px;
  color: #909399;
  margin: 0;
}

/* 访谈准备对话框样式 */
.preparing-content {
  text-align: center;
  padding: 20px;
}

.preparing-icon {
  margin-bottom: 20px;
}

.preparing-content h3 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 18px;
}

.preparing-text {
  color: #409eff;
  font-size: 14px;
  margin-bottom: 20px;
}

/* 访谈选择对话框样式 */
.interview-selection {
  padding: 20px 0;
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e4e7ed;
}

.selection-header p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.interview-list {
  width: 100%;
}

.interview-item {
  width: 100%;
  margin-bottom: 15px;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  transition: all 0.3s;
}

.interview-item:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.interview-item.is-checked {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.interview-info {
  width: 100%;
  margin-left: 25px;
}

.interview-date {
  font-weight: 600;
  color: #303133;
  margin-bottom: 5px;
}

.interview-details {
  font-size: 14px;
  color: #909399;
}
</style>
