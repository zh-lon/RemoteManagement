<template>
  <div class="config-test">
    <el-card header="配置持久化测试">
      <div class="test-section">
        <h3>当前客户端配置</h3>
        <el-button @click="loadCurrentConfig" type="primary">
          <el-icon><Refresh /></el-icon>
          加载当前配置
        </el-button>
        
        <div v-if="currentConfig" class="config-display">
          <pre>{{ JSON.stringify(currentConfig, null, 2) }}</pre>
        </div>
      </div>
      
      <div class="test-section">
        <h3>测试保存配置</h3>
        <el-button @click="testSaveConfig" type="success">
          <el-icon><Check /></el-icon>
          测试保存
        </el-button>
        
        <el-button @click="testLoadConfig" type="info">
          <el-icon><Download /></el-icon>
          测试加载
        </el-button>
      </div>
      
      <div class="test-section">
        <h3>测试结果</h3>
        <div class="test-results">
          <div v-for="result in testResults" :key="result.id" class="test-result">
            <el-tag :type="result.success ? 'success' : 'danger'">
              {{ result.success ? '成功' : '失败' }}
            </el-tag>
            <span class="result-message">{{ result.message }}</span>
            <span class="result-time">{{ result.time }}</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Check, Download } from '@element-plus/icons-vue'
import { storageService } from '@/services/storage'
import { connectionService } from '@/services/connection'
import { DEFAULT_CLIENT_CONFIGS } from '@/utils/constants'

// 响应式数据
const currentConfig = ref<any>(null)
const testResults = ref<Array<{
  id: number
  success: boolean
  message: string
  time: string
}>>([])

let testId = 0

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

const loadCurrentConfig = async () => {
  try {
    const result = await storageService.loadSettings()
    if (result.success && result.data) {
      currentConfig.value = result.data.clientPaths
      addTestResult(true, '成功加载当前配置')
      ElMessage.success('配置加载成功')
    } else {
      addTestResult(false, '加载配置失败: ' + result.error)
      ElMessage.error('配置加载失败')
    }
  } catch (error) {
    addTestResult(false, '加载配置异常: ' + (error as Error).message)
    ElMessage.error('配置加载异常')
  }
}

const testSaveConfig = async () => {
  try {
    // 创建测试配置
    const testConfig = {
      ...DEFAULT_CLIENT_CONFIGS,
      test_client: {
        name: '测试客户端',
        executable: 'test',
        path: '/test/path/test.exe',
        enabled: true,
        arguments: '--test {host} {port}'
      }
    }
    
    // 获取当前设置
    const settingsResult = await storageService.loadSettings()
    if (!settingsResult.success) {
      throw new Error('无法加载当前设置')
    }
    
    // 更新客户端配置
    const updatedSettings = {
      ...settingsResult.data,
      clientPaths: testConfig
    }
    
    // 保存设置
    const saveResult = await storageService.saveSettings(updatedSettings)
    if (saveResult.success) {
      // 更新连接服务的配置
      connectionService.updateClientConfigs(testConfig)
      addTestResult(true, '测试配置保存成功')
      ElMessage.success('测试配置保存成功')
    } else {
      throw new Error(saveResult.error || '保存失败')
    }
  } catch (error) {
    addTestResult(false, '保存配置失败: ' + (error as Error).message)
    ElMessage.error('保存配置失败')
  }
}

const testLoadConfig = async () => {
  try {
    // 重新初始化连接服务
    await connectionService.initializeClients()
    
    // 获取配置
    const configs = connectionService.getAvailableClientConfigs()
    
    if (configs && Object.keys(configs).length > 0) {
      addTestResult(true, `成功加载 ${Object.keys(configs).length} 个客户端配置`)
      ElMessage.success('配置加载成功')
      
      // 检查是否包含测试配置
      if (configs.test_client) {
        addTestResult(true, '测试客户端配置存在，持久化成功')
      }
    } else {
      addTestResult(false, '未找到任何客户端配置')
      ElMessage.warning('未找到配置')
    }
  } catch (error) {
    addTestResult(false, '加载配置失败: ' + (error as Error).message)
    ElMessage.error('加载配置失败')
  }
}
</script>

<style scoped lang="scss">
.config-test {
  .test-section {
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
    
    .config-display {
      margin-top: 16px;
      
      pre {
        background-color: #f5f5f5;
        padding: 12px;
        border-radius: 4px;
        font-size: 12px;
        max-height: 300px;
        overflow-y: auto;
      }
    }
    
    .test-results {
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
}

:deep(.el-card__header) {
  font-weight: 500;
  color: #303133;
}
</style>
