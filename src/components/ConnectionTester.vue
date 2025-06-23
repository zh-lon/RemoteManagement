<template>
  <div class="connection-tester">
    <el-card header="连接测试工具">
      <el-form :model="testConnection" label-width="100px" size="small">
        <el-form-item label="连接类型">
          <el-select v-model="testConnection.type" placeholder="选择连接类型">
            <el-option
              v-for="option in CONNECTION_TYPE_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="主机地址">
          <el-input v-model="testConnection.host" placeholder="请输入主机地址" />
        </el-form-item>
        
        <el-form-item label="端口">
          <el-input-number
            v-model="testConnection.port"
            :min="1"
            :max="65535"
            placeholder="端口号"
          />
        </el-form-item>
        
        <el-form-item label="用户名">
          <el-input v-model="testConnection.username" placeholder="请输入用户名" />
        </el-form-item>
        
        <el-form-item label="密码">
          <el-input
            v-model="testConnection.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button @click="testLaunch" type="primary" :loading="testing">
            <el-icon><VideoPlay /></el-icon>
            测试启动客户端
          </el-button>
          
          <el-button @click="showDebugInfo" type="info">
            <el-icon><View /></el-icon>
            显示调试信息
          </el-button>
        </el-form-item>
      </el-form>
      
      <div v-if="debugInfo" class="debug-info">
        <h3>调试信息</h3>
        <div class="debug-section">
          <h4>连接信息</h4>
          <pre>{{ JSON.stringify(testConnection, null, 2) }}</pre>
        </div>
        
        <div class="debug-section">
          <h4>可用客户端</h4>
          <div v-for="(clients, type) in availableClients" :key="type" class="client-type">
            <h5>{{ type }}</h5>
            <div v-if="clients.length === 0" class="no-clients">
              未配置可用客户端
            </div>
            <div v-else>
              <div v-for="client in clients" :key="client.executable" class="client-item">
                <strong>{{ client.name }}</strong>
                <div>路径: {{ client.path || '未配置' }}</div>
                <div>参数模板: {{ client.arguments || '无' }}</div>
                <div>状态: {{ client.enabled ? '启用' : '禁用' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="testResults.length > 0" class="test-results">
        <h3>测试结果</h3>
        <div v-for="result in testResults" :key="result.id" class="test-result">
          <el-tag :type="result.success ? 'success' : 'danger'">
            {{ result.success ? '成功' : '失败' }}
          </el-tag>
          <span class="result-message">{{ result.message }}</span>
          <span class="result-time">{{ result.time }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay, View } from '@element-plus/icons-vue'
import { ConnectionType, ConnectionItem } from '@/types/connection'
import { CONNECTION_TYPE_OPTIONS } from '@/utils/constants'
import { connectionService } from '@/services/connection'

// 响应式数据
const testing = ref(false)
const debugInfo = ref(false)
const availableClients = ref<any>({})
const testResults = ref<Array<{
  id: number
  success: boolean
  message: string
  time: string
}>>([])

const testConnection = reactive<ConnectionItem>({
  id: 'test-connection',
  name: '测试连接',
  type: ConnectionType.SSH,
  host: '127.0.0.1',
  port: 22,
  username: 'test',
  password: 'test123',
  groupId: '',
  tags: [],
  description: '用于测试的连接',
  createdAt: new Date(),
  updatedAt: new Date()
})

let testId = 0

// 生命周期
onMounted(async () => {
  await loadAvailableClients()
})

// 方法
const addTestResult = (success: boolean, message: string) => {
  testResults.value.unshift({
    id: ++testId,
    success,
    message,
    time: new Date().toLocaleTimeString()
  })
  
  // 只保留最近10条结果
  if (testResults.value.length > 10) {
    testResults.value = testResults.value.slice(0, 10)
  }
}

const loadAvailableClients = async () => {
  try {
    await connectionService.initializeClients()
    availableClients.value = connectionService.getAvailableClients()
  } catch (error) {
    console.error('加载可用客户端失败:', error)
    ElMessage.error('加载可用客户端失败')
  }
}

const testLaunch = async () => {
  testing.value = true
  try {
    console.log('开始测试连接启动...')
    console.log('测试连接信息:', testConnection)
    
    const result = await connectionService.connect(testConnection)
    
    if (result.success) {
      addTestResult(true, result.message || '客户端启动成功')
      ElMessage.success('客户端启动成功')
    } else {
      addTestResult(false, result.error || '客户端启动失败')
      ElMessage.error('客户端启动失败: ' + result.error)
    }
  } catch (error) {
    const errorMessage = (error as Error).message
    addTestResult(false, '测试异常: ' + errorMessage)
    ElMessage.error('测试异常: ' + errorMessage)
    console.error('测试连接失败:', error)
  } finally {
    testing.value = false
  }
}

const showDebugInfo = async () => {
  debugInfo.value = !debugInfo.value
  if (debugInfo.value) {
    await loadAvailableClients()
  }
}
</script>

<style scoped lang="scss">
.connection-tester {
  .debug-info {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e4e7ed;
    
    h3 {
      margin: 0 0 16px 0;
      color: #303133;
    }
    
    .debug-section {
      margin-bottom: 20px;
      
      h4, h5 {
        margin: 0 0 8px 0;
        color: #606266;
      }
      
      pre {
        background-color: #f5f5f5;
        padding: 12px;
        border-radius: 4px;
        font-size: 12px;
        max-height: 200px;
        overflow-y: auto;
      }
      
      .client-type {
        margin-bottom: 16px;
        
        .no-clients {
          color: #909399;
          font-style: italic;
        }
        
        .client-item {
          padding: 8px;
          margin-bottom: 8px;
          border: 1px solid #e4e7ed;
          border-radius: 4px;
          font-size: 12px;
          
          strong {
            color: #303133;
          }
          
          div {
            margin-top: 4px;
            color: #606266;
          }
        }
      }
    }
  }
  
  .test-results {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e4e7ed;
    
    h3 {
      margin: 0 0 16px 0;
      color: #303133;
    }
    
    .test-result {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      .result-message {
        flex: 1;
        color: #606266;
      }
      
      .result-time {
        color: #909399;
        font-size: 12px;
      }
    }
  }
}

:deep(.el-card__header) {
  font-weight: 500;
  color: #303133;
}
</style>
