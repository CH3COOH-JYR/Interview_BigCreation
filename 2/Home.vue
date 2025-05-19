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
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { More } from '@element-plus/icons-vue';

export default {
  name: 'HomeView',
  components: {
    More
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const deleteDialogVisible = ref(false);
    const topicToDelete = ref(null);
    
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
      router.push({ name: 'CreateTopic' });
    };
    
    // 开始访谈
    const startInterview = async (topicId) => {
      try {
        const result = await store.dispatch('interview/startInterview', topicId);
        if (result) {
          router.push({ 
            name: 'Interview', 
            params: { id: result._id } 
          });
        }
      } catch (error) {
        ElMessage.error('开始访谈失败');
      }
    };
    
    // 编辑主题
    const editTopic = (topic) => {
      router.push({ 
        name: 'EditTopic', 
        params: { id: topic._id } 
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
    
    return {
      topics,
      loading,
      error,
      deleteDialogVisible,
      topicToDelete,
      navigateToCreate,
      startInterview,
      editTopic,
      confirmDelete,
      deleteTopic,
      formatDate,
      truncateText
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
</style>
