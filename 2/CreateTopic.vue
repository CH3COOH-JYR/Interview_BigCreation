<template>
  <div class="create-topic">
    <h1>{{ isEditing ? '编辑访谈主题' : '创建新访谈主题' }}</h1>
    
    <el-form 
      ref="formRef" 
      :model="form" 
      :rules="rules" 
      label-width="120px"
      class="topic-form"
    >
      <el-form-item label="主题标题" prop="title">
        <el-input v-model="form.title" placeholder="请输入主题标题" />
      </el-form-item>
      
      <el-form-item label="访谈大纲" prop="outline">
        <el-input 
          v-model="form.outline" 
          type="textarea" 
          :rows="5" 
          placeholder="请输入访谈大纲"
        />
      </el-form-item>
      
      <el-form-item label="关键问题" prop="keyQuestions">
        <div v-for="(question, index) in form.keyQuestions" :key="index" class="question-item">
          <el-input 
            v-model="form.keyQuestions[index]" 
            placeholder="请输入关键问题"
            class="question-input"
          >
            <template #append>
              <el-button @click="removeQuestion(index)" :disabled="form.keyQuestions.length <= 1">
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-input>
        </div>
        
        <div class="add-question">
          <el-button type="primary" plain @click="addQuestion">
            添加更多问题
          </el-button>
        </div>
      </el-form-item>
      
      <el-form-item>
        <el-button type="primary" @click="submitForm" :loading="loading">
          {{ isEditing ? '更新' : '创建' }}
        </el-button>
        <el-button @click="cancel">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import { computed, onMounted, reactive, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Delete } from '@element-plus/icons-vue';

export default {
  name: 'CreateTopicView',
  components: {
    Delete
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const route = useRoute();
    const formRef = ref(null);
    
    // 判断是否为编辑模式
    const isEditing = computed(() => !!route.params.id);
    
    // 表单数据
    const form = reactive({
      title: '',
      outline: '',
      keyQuestions: ['']
    });
    
    // 表单验证规则
    const rules = {
      title: [
        { required: true, message: '请输入主题标题', trigger: 'blur' },
        { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
      ],
      outline: [
        { required: true, message: '请输入访谈大纲', trigger: 'blur' },
        { min: 10, message: '大纲至少需要 10 个字符', trigger: 'blur' }
      ],
      keyQuestions: [
        { 
          type: 'array', 
          required: true, 
          message: '请至少添加一个关键问题', 
          trigger: 'change' 
        }
      ]
    };
    
    // 从store获取数据
    const loading = computed(() => store.getters['topics/isLoading']);
    const error = computed(() => store.getters['topics/error']);
    
    // 如果是编辑模式，获取主题数据
    onMounted(async () => {
      if (isEditing.value) {
        try {
          const topic = await store.dispatch('topics/fetchTopic', route.params.id);
          if (topic) {
            form.title = topic.title;
            form.outline = topic.outline;
            form.keyQuestions = [...topic.keyQuestions];
            
            // 确保至少有一个问题
            if (form.keyQuestions.length === 0) {
              form.keyQuestions = [''];
            }
          } else {
            ElMessage.error('获取主题数据失败');
            router.push({ name: 'Home' });
          }
        } catch (error) {
          ElMessage.error('获取主题数据失败');
          router.push({ name: 'Home' });
        }
      }
    });
    
    // 添加问题
    const addQuestion = () => {
      form.keyQuestions.push('');
    };
    
    // 移除问题
    const removeQuestion = (index) => {
      if (form.keyQuestions.length > 1) {
        form.keyQuestions.splice(index, 1);
      }
    };
    
    // 提交表单
    const submitForm = async () => {
      if (!formRef.value) return;
      
      await formRef.value.validate(async (valid) => {
        if (valid) {
          // 过滤掉空问题
          const filteredQuestions = form.keyQuestions.filter(q => q.trim() !== '');
          
          if (filteredQuestions.length === 0) {
            ElMessage.warning('请至少添加一个关键问题');
            return;
          }
          
          const topicData = {
            title: form.title,
            outline: form.outline,
            keyQuestions: filteredQuestions
          };
          
          try {
            let result;
            
            if (isEditing.value) {
              // 更新主题
              result = await store.dispatch('topics/updateTopic', {
                id: route.params.id,
                topicData
              });
              
              if (result) {
                ElMessage.success('主题更新成功');
                router.push({ name: 'Home' });
              } else {
                ElMessage.error(error.value || '更新主题失败');
              }
            } else {
              // 创建新主题
              result = await store.dispatch('topics/createTopic', topicData);
              
              if (result) {
                ElMessage.success('主题创建成功');
                router.push({ name: 'Home' });
              } else {
                ElMessage.error(error.value || '创建主题失败');
              }
            }
          } catch (err) {
            ElMessage.error('操作失败，请重试');
          }
        } else {
          ElMessage.warning('请完善表单信息');
        }
      });
    };
    
    // 取消
    const cancel = () => {
      router.push({ name: 'Home' });
    };
    
    return {
      formRef,
      form,
      rules,
      loading,
      isEditing,
      addQuestion,
      removeQuestion,
      submitForm,
      cancel
    };
  }
};
</script>

<style scoped>
.create-topic {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.topic-form {
  margin-top: 20px;
}

.question-item {
  margin-bottom: 10px;
}

.question-input {
  width: 100%;
}

.add-question {
  margin-top: 15px;
}
</style>
