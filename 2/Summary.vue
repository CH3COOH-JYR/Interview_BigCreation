<template>
  <div class="summary-container">
    <el-card v-if="loading" class="loading-card">
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

    <template v-else-if="summary">
      <el-card class="summary-card">
        <template #header>
          <div class="card-header">
            <h2>访谈总结</h2>
          </div>
        </template>
        <div class="summary-content">
          <h3>主要收获</h3>
          <div class="takeaways">
            <p>{{ summary.takeaways }}</p>
          </div>
          
          <h3>评分与说明</h3>
          <div class="ratings">
            <el-table :data="ratingsData" style="width: 100%">
              <el-table-column prop="index" label="序号" width="80" />
              <el-table-column prop="score" label="评分" width="120">
                <template #default="scope">
                  <el-rate
                    v-model="scope.row.score"
                    disabled
                    show-score
                    text-color="#ff9900"
                  />
                </template>
              </el-table-column>
              <el-table-column prop="explanation" label="说明" />
            </el-table>
          </div>
          
          <div class="actions">
            <el-button type="primary" @click="exportSummary('json')">导出JSON</el-button>
            <el-button type="success" @click="exportSummary('text')">导出文本</el-button>
            <el-button @click="backToHome">返回主页</el-button>
          </div>
        </div>
      </el-card>
      
      <el-card v-if="exportedSummary" class="export-card">
        <template #header>
          <div class="card-header">
            <h3>导出结果</h3>
          </div>
        </template>
        <div class="export-content">
          <template v-if="exportFormat === 'json'">
            <pre>{{ JSON.stringify(exportedSummary, null, 2) }}</pre>
          </template>
          <template v-else>
            <p style="white-space: pre-line">{{ exportedSummary.content }}</p>
          </template>
          
          <div class="copy-action">
            <el-button type="primary" @click="copyExport">复制内容</el-button>
          </div>
        </div>
      </el-card>
    </template>
    
    <el-card v-else class="no-summary-card">
      <el-result
        icon="warning"
        title="暂无总结"
        sub-title="总结正在生成中，请稍后再试..."
      >
        <template #extra>
          <el-button type="primary" @click="refreshSummary">刷新</el-button>
          <el-button @click="backToHome">返回主页</el-button>
        </template>
      </el-result>
    </el-card>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';

export default {
  name: 'SummaryView',
  setup() {
    const store = useStore();
    const router = useRouter();
    const route = useRoute();
    
    const exportFormat = ref('');
    
    // 从store获取数据
    const summary = computed(() => store.getters['summary/currentSummary']);
    const exportedSummary = computed(() => store.getters['summary/exportedSummary']);
    const loading = computed(() => store.getters['summary/isLoading']);
    const error = computed(() => store.getters['summary/error']);
    
    // 评分数据
    const ratingsData = computed(() => {
      if (!summary.value) return [];
      
      return summary.value.points.map((point, index) => ({
        index: index + 1,
        score: point,
        explanation: summary.value.explanations[index]
      }));
    });
    
    // 获取总结
    onMounted(async () => {
      const interviewId = route.params.id;
      if (!interviewId) {
        ElMessage.error('访谈ID无效');
        router.push({ name: 'Home' });
        return;
      }
      
      await store.dispatch('summary/getSummary', interviewId);
    });
    
    // 刷新总结
    const refreshSummary = async () => {
      const interviewId = route.params.id;
      if (!interviewId) return;
      
      await store.dispatch('summary/getSummary', interviewId);
    };
    
    // 导出总结
    const exportSummary = async (format) => {
      const interviewId = route.params.id;
      if (!interviewId) return;
      
      try {
        await store.dispatch('summary/exportSummary', {
          interviewId,
          format
        });
        
        exportFormat.value = format;
        ElMessage.success('总结导出成功');
      } catch (error) {
        ElMessage.error('导出总结失败');
      }
    };
    
    // 复制导出内容
    const copyExport = () => {
      let content = '';
      
      if (exportFormat.value === 'json') {
        content = JSON.stringify(exportedSummary.value, null, 2);
      } else {
        content = exportedSummary.value.content;
      }
      
      navigator.clipboard.writeText(content)
        .then(() => {
          ElMessage.success('已复制到剪贴板');
        })
        .catch(() => {
          ElMessage.error('复制失败');
        });
    };
    
    // 返回主页
    const backToHome = () => {
      router.push({ name: 'Home' });
    };
    
    return {
      summary,
      exportedSummary,
      loading,
      error,
      ratingsData,
      exportFormat,
      refreshSummary,
      exportSummary,
      copyExport,
      backToHome
    };
  }
};
</script>

<style scoped>
.summary-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.loading-card,
.error-card,
.no-summary-card {
  margin-bottom: 20px;
}

.summary-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2,
.card-header h3 {
  margin: 0;
  color: #303133;
}

.summary-content {
  margin-top: 20px;
}

.summary-content h3 {
  margin: 20px 0 10px 0;
  font-size: 18px;
  color: #303133;
}

.takeaways {
  background-color: #f8f8f8;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.takeaways p {
  margin: 0;
  line-height: 1.6;
  color: #606266;
}

.ratings {
  margin-bottom: 30px;
}

.actions {
  margin-top: 30px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.export-card {
  margin-top: 30px;
}

.export-content {
  background-color: #f8f8f8;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
}

.export-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.copy-action {
  margin-top: 15px;
  text-align: right;
}
</style>
