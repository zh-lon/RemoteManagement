<template>
  <div class="password-debugger">
    <el-card header="密码调试工具">
      <div class="debug-section">
        <h3>密码流向追踪</h3>
        <el-button @click="tracePasswordFlow" type="primary">
          <el-icon><Search /></el-icon>
          追踪密码流向
        </el-button>
        
        <div v-if="traceResult" class="trace-result">
          <h4>追踪结果</h4>
          <div v-for="(step, index) in traceResult.steps" :key="index" class="trace-step">
            <div class="step-header">
              <el-tag :type="step.success ? 'success' : 'danger'">
                步骤 {{ index + 1 }}
              </el-tag>
              <strong>{{ step.name }}</strong>
            </div>
            <div class="step-content">
              <div class="step-description">{{ step.description }}</div>
              <div v-if="step.data" class="step-data">
                <strong>数据:</strong>
                <pre>{{ JSON.stringify(step.data, null, 2) }}</pre>
              </div>
              <div v-if="step.error" class="step-error">
                <strong>错误:</strong> {{ step.error }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="debug-section">
        <h3>密码加密/解密测试</h3>
        <el-form :model="testForm" label-width="100px" size="small">
          <el-form-item label="测试密码">
            <el-input
              v-model="testForm.password"
              type="password"
              placeholder="输入要测试的密码"
              show-password
            />
          </el-form-item>
          
          <el-form-item>
            <el-button @click="testEncryption" type="success">
              <el-icon><Lock /></el-icon>
              测试加密
            </el-button>
            
            <el-button @click="testDecryption" type="warning">
              <el-icon><Unlock /></el-icon>
              测试解密
            </el-button>
          </el-form-item>
        </el-form>
        
        <div v-if="encryptionResult" class="encryption-result">
          <h4>加密/解密结果</h4>
          <div class="result-item">
            <strong>原始密码:</strong> {{ encryptionResult.original }}
          </div>
          <div class="result-item">
            <strong>加密结果:</strong> {{ encryptionResult.encrypted }}
          </div>
          <div class="result-item">
            <strong>解密结果:</strong> {{ encryptionResult.decrypted }}
          </div>
          <div class="result-item">
            <strong>是否一致:</strong>
            <el-tag :type="encryptionResult.match ? 'success' : 'danger'">
              {{ encryptionResult.match ? '一致' : '不一致' }}
            </el-tag>
          </div>
        </div>
      </div>
      
      <div class="debug-section">
        <h3>存储数据检查</h3>
        <el-button @click="checkStorageData" type="info">
          <el-icon><View /></el-icon>
          检查存储数据
        </el-button>
        
        <div v-if="storageData" class="storage-data">
          <h4>存储中的连接数据</h4>
          <div v-for="connection in storageData.connections" :key="connection.id" class="connection-data">
            <div class="connection-header">
              <strong>{{ connection.name }}</strong>
              <el-tag size="small">{{ connection.type }}</el-tag>
            </div>
            <div class="connection-details">
              <div><strong>主机:</strong> {{ connection.host }}:{{ connection.port }}</div>
              <div><strong>用户名:</strong> {{ connection.username }}</div>
              <div><strong>密码(原始):</strong> {{ connection.passwordRaw || '(空)' }}</div>
              <div><strong>密码(长度):</strong> {{ connection.passwordRaw ? connection.passwordRaw.length : 0 }}</div>
              <div><strong>是否加密数据:</strong>
                <el-tag :type="connection.isEncrypted ? 'warning' : 'info'" size="small">
                  {{ connection.isEncrypted ? '是' : '否' }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="debug-section">
        <h3>前端数据检查</h3>
        <el-button @click="checkFrontendData" type="primary">
          <el-icon><Monitor /></el-icon>
          检查前端数据
        </el-button>
        
        <div v-if="frontendData" class="frontend-data">
          <h4>前端中的连接数据</h4>
          <div v-for="connection in frontendData.connections" :key="connection.id" class="connection-data">
            <div class="connection-header">
              <strong>{{ connection.name }}</strong>
              <el-tag size="small">{{ connection.type }}</el-tag>
            </div>
            <div class="connection-details">
              <div><strong>主机:</strong> {{ connection.host }}:{{ connection.port }}</div>
              <div><strong>用户名:</strong> {{ connection.username }}</div>
              <div><strong>密码:</strong> {{ connection.password || '(空)' }}</div>
              <div><strong>密码长度:</strong> {{ connection.password ? connection.password.length : 0 }}</div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Lock, Unlock, View, Monitor } from '@element-plus/icons-vue'
import { encryptionService } from '@/services/encryption'
import { storageService } from '@/services/storage'
import { ConnectionItem, ConnectionGroup, isConnectionItem } from '@/types/connection'

// 响应式数据
const traceResult = ref<any>(null)
const encryptionResult = ref<any>(null)
const storageData = ref<any>(null)
const frontendData = ref<any>(null)

const testForm = reactive({
  password: 'test123'
})

// 方法
const tracePasswordFlow = async () => {
  const steps: any[] = []
  
  try {
    // 步骤1: 检查加密服务状态
    steps.push({
      name: '检查加密服务状态',
      description: '验证加密服务是否正确初始化',
      success: true,
      data: {
        isReady: encryptionService.isReady(),
        fingerprintMatch: encryptionService.verifyKeyFingerprint()
      }
    })
    
    // 步骤2: 从存储加载原始数据
    const storageResult = await storageService.loadConnections()
    steps.push({
      name: '从存储加载数据',
      description: '直接从localStorage读取连接配置',
      success: storageResult.success,
      data: storageResult.success ? {
        hasData: !!storageResult.data,
        groupsCount: storageResult.data?.groups?.length || 0
      } : null,
      error: storageResult.success ? null : storageResult.error
    })
    
    // 步骤3: 检查解密过程
    if (storageResult.success && storageResult.data) {
      const connections = extractConnections(storageResult.data.groups)
      steps.push({
        name: '解密连接密码',
        description: '检查密码解密过程',
        success: true,
        data: {
          connectionsCount: connections.length,
          passwordStatus: connections.map(conn => ({
            name: conn.name,
            hasPassword: !!conn.password,
            passwordLength: conn.password ? conn.password.length : 0,
            looksEncrypted: conn.password && conn.password.length > 20 && /^[A-Za-z0-9+/]*={0,2}$/.test(conn.password)
          }))
        }
      })
    }
    
    // 步骤4: 检查前端数据
    const frontendConnections = getFrontendConnections()
    steps.push({
      name: '检查前端数据',
      description: '检查前端组件中的连接数据',
      success: true,
      data: {
        connectionsCount: frontendConnections.length,
        passwordStatus: frontendConnections.map(conn => ({
          name: conn.name,
          hasPassword: !!conn.password,
          passwordLength: conn.password ? conn.password.length : 0
        }))
      }
    })
    
    traceResult.value = { steps }
    ElMessage.success('密码流向追踪完成')
  } catch (error) {
    steps.push({
      name: '追踪过程异常',
      description: '追踪过程中发生错误',
      success: false,
      error: (error as Error).message
    })
    
    traceResult.value = { steps }
    ElMessage.error('密码流向追踪失败')
  }
}

const testEncryption = async () => {
  try {
    if (!testForm.password) {
      ElMessage.warning('请输入要测试的密码')
      return
    }
    
    const original = testForm.password
    const encrypted = encryptionService.encrypt(original)
    const decrypted = encryptionService.decrypt(encrypted)
    
    encryptionResult.value = {
      original,
      encrypted,
      decrypted,
      match: original === decrypted
    }
    
    ElMessage.success('加密/解密测试完成')
  } catch (error) {
    console.error('加密测试失败:', error)
    ElMessage.error('加密测试失败: ' + (error as Error).message)
  }
}

const testDecryption = async () => {
  try {
    if (!testForm.password) {
      ElMessage.warning('请输入要测试的密码')
      return
    }
    
    // 假设输入的是加密后的数据
    const encrypted = testForm.password
    const decrypted = encryptionService.decrypt(encrypted)
    
    encryptionResult.value = {
      original: '(加密数据)',
      encrypted,
      decrypted,
      match: true
    }
    
    ElMessage.success('解密测试完成')
  } catch (error) {
    console.error('解密测试失败:', error)
    ElMessage.error('解密测试失败: ' + (error as Error).message)
  }
}

const checkStorageData = async () => {
  try {
    // 直接从localStorage读取原始数据
    const rawData = localStorage.getItem('remote-management-connections')
    if (!rawData) {
      storageData.value = { connections: [] }
      ElMessage.info('存储中没有连接数据')
      return
    }
    
    const parsed = JSON.parse(rawData)
    const connections = extractConnectionsWithRawData(parsed.groups || [])
    
    storageData.value = { connections }
    ElMessage.success('存储数据检查完成')
  } catch (error) {
    console.error('检查存储数据失败:', error)
    ElMessage.error('检查存储数据失败')
  }
}

const checkFrontendData = () => {
  try {
    const connections = getFrontendConnections()
    frontendData.value = { connections }
    ElMessage.success('前端数据检查完成')
  } catch (error) {
    console.error('检查前端数据失败:', error)
    ElMessage.error('检查前端数据失败')
  }
}

// 辅助方法
const extractConnections = (groups: ConnectionGroup[]): ConnectionItem[] => {
  const connections: ConnectionItem[] = []
  
  const traverse = (items: Array<ConnectionGroup | ConnectionItem>) => {
    for (const item of items) {
      if (isConnectionItem(item)) {
        connections.push(item)
      } else {
        traverse(item.children)
      }
    }
  }
  
  traverse(groups)
  return connections
}

const extractConnectionsWithRawData = (groups: any[]): any[] => {
  const connections: any[] = []
  
  const traverse = (items: any[]) => {
    for (const item of items) {
      if (item.type) { // 是连接项
        connections.push({
          id: item.id,
          name: item.name,
          type: item.type,
          host: item.host,
          port: item.port,
          username: item.username,
          passwordRaw: item.password,
          isEncrypted: item.password && item.password.length > 20 && /^[A-Za-z0-9+/]*={0,2}$/.test(item.password)
        })
      } else if (item.children) {
        traverse(item.children)
      }
    }
  }
  
  traverse(groups)
  return connections
}

const getFrontendConnections = (): any[] => {
  // 从全局状态或父组件获取前端数据
  // 这里需要根据实际的数据流来实现
  // 暂时返回空数组，实际使用时需要注入数据
  return []
}
</script>

<style scoped lang="scss">
.password-debugger {
  .debug-section {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e4e7ed;
    
    &:last-child {
      margin-bottom: 0;
      border-bottom: none;
    }
    
    h3 {
      margin: 0 0 16px 0;
      color: #303133;
      font-size: 16px;
    }
    
    h4 {
      margin: 16px 0 8px 0;
      color: #606266;
      font-size: 14px;
    }
    
    .trace-result {
      margin-top: 16px;
      
      .trace-step {
        margin-bottom: 16px;
        padding: 12px;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .step-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .step-content {
          .step-description {
            color: #606266;
            margin-bottom: 8px;
          }
          
          .step-data,
          .step-error {
            margin-top: 8px;
            
            pre {
              background-color: #f5f5f5;
              padding: 8px;
              border-radius: 4px;
              font-size: 12px;
              max-height: 200px;
              overflow-y: auto;
            }
          }
          
          .step-error {
            color: #f56c6c;
          }
        }
      }
    }
    
    .encryption-result,
    .storage-data,
    .frontend-data {
      margin-top: 16px;
      
      .result-item {
        margin-bottom: 8px;
        color: #606266;
        
        strong {
          color: #303133;
        }
      }
      
      .connection-data {
        margin-bottom: 16px;
        padding: 12px;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .connection-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          
          strong {
            color: #303133;
          }
        }
        
        .connection-details {
          font-size: 12px;
          color: #606266;
          
          div {
            margin-bottom: 4px;
            
            &:last-child {
              margin-bottom: 0;
            }
            
            strong {
              color: #303133;
            }
          }
        }
      }
    }
  }
}

:deep(.el-card__header) {
  font-weight: 500;
  color: #303133;
}
</style>
