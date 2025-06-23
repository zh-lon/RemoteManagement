<template>
  <div class="config-validator">
    <el-card header="配置验证工具">
      <div class="validator-section">
        <h3>当前存储状态</h3>
        <el-button @click="checkStorage" type="primary">
          <el-icon><Search /></el-icon>
          检查存储状态
        </el-button>
        
        <div v-if="storageInfo" class="storage-info">
          <div class="info-item">
            <strong>存储路径:</strong> {{ storageInfo.dataPath }}
          </div>
          <div class="info-item">
            <strong>初始化状态:</strong> {{ storageInfo.isInitialized ? '已初始化' : '未初始化' }}
          </div>
          <div class="info-item">
            <strong>设置文件存在:</strong> {{ storageInfo.settingsExists ? '是' : '否' }}
          </div>
          <div class="info-item">
            <strong>连接文件存在:</strong> {{ storageInfo.connectionsExists ? '是' : '否' }}
          </div>
        </div>
      </div>
      
      <div class="validator-section">
        <h3>配置内容验证</h3>
        <el-button @click="validateConfigs" type="success">
          <el-icon><CircleCheck /></el-icon>
          验证配置内容
        </el-button>
        
        <div v-if="validationResult" class="validation-result">
          <el-alert
            :title="validationResult.success ? '验证成功' : '验证失败'"
            :type="validationResult.success ? 'success' : 'error'"
            :description="validationResult.message"
            show-icon
            :closable="false"
          />
          
          <div v-if="validationResult.details" class="validation-details">
            <h4>详细信息</h4>
            <pre>{{ JSON.stringify(validationResult.details, null, 2) }}</pre>
          </div>
        </div>
      </div>
      
      <div class="validator-section">
        <h3>手动保存测试</h3>
        <el-button @click="testSave" type="warning" :loading="testing">
          <el-icon><Upload /></el-icon>
          测试保存配置
        </el-button>
        
        <el-button @click="testLoad" type="info">
          <el-icon><Download /></el-icon>
          测试加载配置
        </el-button>
        
        <div v-if="testResults.length > 0" class="test-results">
          <h4>测试结果</h4>
          <div v-for="result in testResults" :key="result.id" class="test-result">
            <el-tag :type="result.success ? 'success' : 'danger'">
              {{ result.success ? '成功' : '失败' }}
            </el-tag>
            <span class="result-message">{{ result.message }}</span>
            <span class="result-time">{{ result.time }}</span>
          </div>
        </div>
      </div>
      
      <div class="validator-section">
        <h3>存储内容查看</h3>
        <el-button @click="viewStorageContent" type="info">
          <el-icon><View /></el-icon>
          查看存储内容
        </el-button>
        
        <div v-if="storageContent" class="storage-content">
          <el-tabs v-model="activeContentTab">
            <el-tab-pane label="设置文件" name="settings">
              <pre>{{ storageContent.settings || '无内容' }}</pre>
            </el-tab-pane>
            <el-tab-pane label="连接文件" name="connections">
              <pre>{{ storageContent.connections || '无内容' }}</pre>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, CircleCheck, Upload, Download, View } from '@element-plus/icons-vue'
import { storageService } from '@/services/storage'
import { connectionService } from '@/services/connection'
import { DEFAULT_SETTINGS, DEFAULT_CLIENT_CONFIGS } from '@/utils/constants'

// 响应式数据
const testing = ref(false)
const activeContentTab = ref('settings')
const storageInfo = ref<any>(null)
const validationResult = ref<any>(null)
const storageContent = ref<any>(null)
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
  
  if (testResults.value.length > 10) {
    testResults.value = testResults.value.slice(0, 10)
  }
}

const checkStorage = async () => {
  try {
    // 检查存储服务状态
    const settingsResult = await storageService.loadSettings()
    const connectionsResult = await storageService.loadConnections()
    
    storageInfo.value = {
      dataPath: (storageService as any).dataPath || 'localStorage',
      isInitialized: (storageService as any).isInitialized || false,
      settingsExists: settingsResult.success,
      connectionsExists: connectionsResult.success
    }
    
    ElMessage.success('存储状态检查完成')
  } catch (error) {
    console.error('检查存储状态失败:', error)
    ElMessage.error('检查存储状态失败')
  }
}

const validateConfigs = async () => {
  try {
    const result = await storageService.loadSettings()
    
    if (!result.success) {
      validationResult.value = {
        success: false,
        message: '无法加载设置文件: ' + result.error,
        details: null
      }
      return
    }
    
    const settings = result.data
    const requiredKeys = ['theme', 'language', 'autoSave', 'confirmBeforeDelete', 'showConnectionCount', 'defaultConnectionType', 'encryptionEnabled', 'backupEnabled', 'backupInterval', 'clientPaths']
    const missingKeys = requiredKeys.filter(key => !(key in settings))
    
    if (missingKeys.length > 0) {
      validationResult.value = {
        success: false,
        message: `缺少必需的配置项: ${missingKeys.join(', ')}`,
        details: settings
      }
    } else {
      validationResult.value = {
        success: true,
        message: '配置验证通过，所有必需项都存在',
        details: {
          clientPathsCount: Object.keys(settings.clientPaths || {}).length,
          enabledClients: Object.values(settings.clientPaths || {}).filter((config: any) => config.enabled).length
        }
      }
    }
  } catch (error) {
    validationResult.value = {
      success: false,
      message: '验证过程中发生错误: ' + (error as Error).message,
      details: null
    }
  }
}

const testSave = async () => {
  testing.value = true
  try {
    // 创建测试配置
    const testSettings = {
      ...DEFAULT_SETTINGS,
      clientPaths: {
        ...DEFAULT_CLIENT_CONFIGS,
        test_save: {
          name: '测试保存客户端',
          executable: 'test_save',
          path: '/test/save/path.exe',
          enabled: true,
          arguments: '--test-save {host} {port}'
        }
      }
    }
    
    console.log('测试保存配置:', testSettings)
    
    const result = await storageService.saveSettings(testSettings)
    
    if (result.success) {
      addTestResult(true, '测试配置保存成功')
      ElMessage.success('测试保存成功')
      
      // 验证保存结果
      const verifyResult = await storageService.loadSettings()
      if (verifyResult.success && verifyResult.data?.clientPaths?.test_save) {
        addTestResult(true, '保存验证成功，测试配置已正确保存')
      } else {
        addTestResult(false, '保存验证失败，测试配置未找到')
      }
    } else {
      addTestResult(false, '测试保存失败: ' + result.error)
      ElMessage.error('测试保存失败')
    }
  } catch (error) {
    addTestResult(false, '测试保存异常: ' + (error as Error).message)
    ElMessage.error('测试保存异常')
  } finally {
    testing.value = false
  }
}

const testLoad = async () => {
  try {
    const result = await storageService.loadSettings()
    
    if (result.success) {
      addTestResult(true, `配置加载成功，包含 ${Object.keys(result.data?.clientPaths || {}).length} 个客户端配置`)
      ElMessage.success('测试加载成功')
    } else {
      addTestResult(false, '测试加载失败: ' + result.error)
      ElMessage.error('测试加载失败')
    }
  } catch (error) {
    addTestResult(false, '测试加载异常: ' + (error as Error).message)
    ElMessage.error('测试加载异常')
  }
}

const viewStorageContent = async () => {
  try {
    const settingsResult = await storageService.loadSettings()
    const connectionsResult = await storageService.loadConnections()
    
    storageContent.value = {
      settings: settingsResult.success ? JSON.stringify(settingsResult.data, null, 2) : settingsResult.error,
      connections: connectionsResult.success ? JSON.stringify(connectionsResult.data, null, 2) : connectionsResult.error
    }
    
    ElMessage.success('存储内容加载完成')
  } catch (error) {
    console.error('查看存储内容失败:', error)
    ElMessage.error('查看存储内容失败')
  }
}
</script>

<style scoped lang="scss">
.config-validator {
  .validator-section {
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
    
    .storage-info,
    .validation-details,
    .storage-content {
      margin-top: 16px;
      
      .info-item {
        margin-bottom: 8px;
        color: #606266;
        
        strong {
          color: #303133;
        }
      }
      
      pre {
        background-color: #f5f5f5;
        padding: 12px;
        border-radius: 4px;
        font-size: 12px;
        max-height: 400px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-all;
      }
    }
    
    .test-results {
      margin-top: 16px;
      
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
