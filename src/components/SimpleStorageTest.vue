<template>
  <div class="simple-storage-test">
    <el-card header="简单存储测试">
      <div class="test-section">
        <h3>直接 localStorage 测试</h3>
        <el-button @click="testDirectStorage" type="primary">
          <el-icon><Tools /></el-icon>
          测试直接存储
        </el-button>
        
        <div v-if="directTestResult" class="test-result">
          <el-alert
            :title="directTestResult.success ? '测试成功' : '测试失败'"
            :type="directTestResult.success ? 'success' : 'error'"
            :description="directTestResult.message"
            show-icon
            :closable="false"
          />
          
          <div v-if="directTestResult.details" class="result-details">
            <h4>测试详情</h4>
            <pre>{{ JSON.stringify(directTestResult.details, null, 2) }}</pre>
          </div>
        </div>
      </div>
      
      <div class="test-section">
        <h3>客户端配置直接测试</h3>
        <el-form :model="testConfig" label-width="120px" size="small">
          <el-form-item label="客户端名称">
            <el-input v-model="testConfig.name" placeholder="输入客户端名称" />
          </el-form-item>
          
          <el-form-item label="可执行文件">
            <el-input v-model="testConfig.executable" placeholder="输入可执行文件名" />
          </el-form-item>
          
          <el-form-item label="文件路径">
            <el-input v-model="testConfig.path" placeholder="输入文件路径" />
          </el-form-item>
          
          <el-form-item label="启用状态">
            <el-switch v-model="testConfig.enabled" />
          </el-form-item>
          
          <el-form-item label="启动参数">
            <el-input v-model="testConfig.arguments" placeholder="输入启动参数" />
          </el-form-item>
          
          <el-form-item>
            <el-button @click="saveTestConfig" type="success">
              <el-icon><Upload /></el-icon>
              保存测试配置
            </el-button>
            
            <el-button @click="loadTestConfig" type="info">
              <el-icon><Download /></el-icon>
              加载测试配置
            </el-button>
            
            <el-button @click="clearTestConfig" type="danger">
              <el-icon><Delete /></el-icon>
              清空测试配置
            </el-button>
          </el-form-item>
        </el-form>
        
        <div v-if="configTestResult" class="test-result">
          <el-alert
            :title="configTestResult.success ? '操作成功' : '操作失败'"
            :type="configTestResult.success ? 'success' : 'error'"
            :description="configTestResult.message"
            show-icon
            :closable="false"
          />
          
          <div v-if="configTestResult.details" class="result-details">
            <h4>配置详情</h4>
            <pre>{{ JSON.stringify(configTestResult.details, null, 2) }}</pre>
          </div>
        </div>
      </div>
      
      <div class="test-section">
        <h3>当前 localStorage 内容</h3>
        <el-button @click="viewCurrentStorage" type="info">
          <el-icon><View /></el-icon>
          查看当前存储
        </el-button>
        
        <div v-if="currentStorage" class="storage-view">
          <div v-for="(value, key) in currentStorage" :key="key" class="storage-item">
            <h4>{{ key }}</h4>
            <pre>{{ typeof value === 'string' ? value : JSON.stringify(value, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Tools, Upload, Download, Delete, View } from '@element-plus/icons-vue'
import { SETTINGS_FILE_NAME } from '@/utils/constants'

// 响应式数据
const directTestResult = ref<any>(null)
const configTestResult = ref<any>(null)
const currentStorage = ref<any>(null)

const testConfig = reactive({
  name: '测试客户端',
  executable: 'test_client',
  path: '/test/client/path.exe',
  enabled: true,
  arguments: '--test {host} {port} {password}'
})

// 方法
const testDirectStorage = () => {
  try {
    const testKey = 'direct-test-' + Date.now()
    const testData = {
      timestamp: Date.now(),
      message: 'Hello localStorage',
      number: 42,
      boolean: true,
      array: [1, 2, 3],
      object: { nested: 'value' }
    }
    
    console.log('开始直接存储测试...')
    console.log('测试数据:', testData)
    
    // 1. 保存数据
    localStorage.setItem(testKey, JSON.stringify(testData))
    console.log('1. 数据已保存到 localStorage')
    
    // 2. 立即读取
    const retrieved = localStorage.getItem(testKey)
    if (!retrieved) {
      throw new Error('无法读取刚保存的数据')
    }
    console.log('2. 原始读取结果:', retrieved)
    
    // 3. 解析数据
    const parsed = JSON.parse(retrieved)
    console.log('3. 解析后的数据:', parsed)
    
    // 4. 验证数据完整性
    const isValid = (
      parsed.timestamp === testData.timestamp &&
      parsed.message === testData.message &&
      parsed.number === testData.number &&
      parsed.boolean === testData.boolean &&
      JSON.stringify(parsed.array) === JSON.stringify(testData.array) &&
      JSON.stringify(parsed.object) === JSON.stringify(testData.object)
    )
    
    if (!isValid) {
      throw new Error('数据验证失败，保存和读取的数据不一致')
    }
    
    // 5. 清理测试数据
    localStorage.removeItem(testKey)
    console.log('4. 测试数据已清理')
    
    directTestResult.value = {
      success: true,
      message: '直接存储测试完全成功！localStorage 工作正常',
      details: {
        saved: testData,
        retrieved: parsed,
        validation: 'passed'
      }
    }
    
    ElMessage.success('直接存储测试成功')
  } catch (error) {
    console.error('直接存储测试失败:', error)
    directTestResult.value = {
      success: false,
      message: '直接存储测试失败: ' + (error as Error).message
    }
    
    ElMessage.error('直接存储测试失败')
  }
}

const saveTestConfig = () => {
  try {
    const configData = {
      test_client: {
        name: testConfig.name,
        executable: testConfig.executable,
        path: testConfig.path,
        enabled: testConfig.enabled,
        arguments: testConfig.arguments
      }
    }
    
    console.log('保存测试配置:', configData)
    
    // 直接保存到 localStorage
    localStorage.setItem('test-client-config', JSON.stringify(configData))
    
    // 立即验证
    const saved = localStorage.getItem('test-client-config')
    if (!saved) {
      throw new Error('保存失败，无法读取数据')
    }
    
    const parsed = JSON.parse(saved)
    console.log('验证保存结果:', parsed)
    
    configTestResult.value = {
      success: true,
      message: '测试配置保存成功',
      details: {
        saved: configData,
        verified: parsed
      }
    }
    
    ElMessage.success('测试配置保存成功')
  } catch (error) {
    console.error('保存测试配置失败:', error)
    configTestResult.value = {
      success: false,
      message: '保存测试配置失败: ' + (error as Error).message
    }
    
    ElMessage.error('保存测试配置失败')
  }
}

const loadTestConfig = () => {
  try {
    const saved = localStorage.getItem('test-client-config')
    if (!saved) {
      throw new Error('没有找到保存的测试配置')
    }
    
    const parsed = JSON.parse(saved)
    console.log('加载的测试配置:', parsed)
    
    if (parsed.test_client) {
      const config = parsed.test_client
      testConfig.name = config.name || ''
      testConfig.executable = config.executable || ''
      testConfig.path = config.path || ''
      testConfig.enabled = config.enabled || false
      testConfig.arguments = config.arguments || ''
    }
    
    configTestResult.value = {
      success: true,
      message: '测试配置加载成功',
      details: {
        loaded: parsed,
        applied: { ...testConfig }
      }
    }
    
    ElMessage.success('测试配置加载成功')
  } catch (error) {
    console.error('加载测试配置失败:', error)
    configTestResult.value = {
      success: false,
      message: '加载测试配置失败: ' + (error as Error).message
    }
    
    ElMessage.error('加载测试配置失败')
  }
}

const clearTestConfig = () => {
  try {
    localStorage.removeItem('test-client-config')
    
    configTestResult.value = {
      success: true,
      message: '测试配置已清空'
    }
    
    ElMessage.success('测试配置已清空')
  } catch (error) {
    console.error('清空测试配置失败:', error)
    configTestResult.value = {
      success: false,
      message: '清空测试配置失败: ' + (error as Error).message
    }
    
    ElMessage.error('清空测试配置失败')
  }
}

const viewCurrentStorage = () => {
  try {
    const storage: any = {}
    
    // 获取所有 localStorage 项
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        try {
          storage[key] = JSON.parse(value || '{}')
        } catch {
          storage[key] = value
        }
      }
    }
    
    currentStorage.value = storage
    console.log('当前 localStorage 内容:', storage)
    
    ElMessage.success('存储内容已刷新')
  } catch (error) {
    console.error('查看存储内容失败:', error)
    ElMessage.error('查看存储内容失败')
  }
}
</script>

<style scoped lang="scss">
.simple-storage-test {
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
    
    h4 {
      margin: 16px 0 8px 0;
      color: #606266;
      font-size: 14px;
    }
    
    .test-result {
      margin-top: 16px;
      
      .result-details {
        margin-top: 12px;
        
        pre {
          background-color: #f5f5f5;
          padding: 12px;
          border-radius: 4px;
          font-size: 12px;
          max-height: 300px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }
      }
    }
    
    .storage-view {
      margin-top: 16px;
      
      .storage-item {
        margin-bottom: 16px;
        padding: 12px;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        h4 {
          margin: 0 0 8px 0;
          color: #303133;
          font-size: 14px;
          font-weight: 500;
        }
        
        pre {
          margin: 0;
          background-color: #fafafa;
          padding: 8px;
          border-radius: 4px;
          font-size: 12px;
          max-height: 200px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-all;
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
