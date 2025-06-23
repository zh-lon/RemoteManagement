<template>
  <div class="client-config-panel">
    <h3 class="panel-title">{{ title }}</h3>
    
    <div class="config-list">
      <div
        v-for="config in configs"
        :key="config.key"
        class="config-item"
        :class="{ 'enabled': config.enabled }"
      >
        <div class="config-header">
          <div class="config-info">
            <h4 class="config-name">{{ config.name }}</h4>
            <span class="config-executable">{{ config.executable }}</span>
          </div>
          
          <el-switch
            :model-value="config.enabled"
            @update:model-value="(value) => updateConfig(config.key, { ...config, enabled: value })"
            size="small"
          />
        </div>
        
        <div v-if="config.enabled" class="config-details">
          <el-form :model="config" label-width="80px" size="small">
            <el-form-item label="路径">
              <div class="path-input">
                <el-input
                  :model-value="config.path"
                  @update:model-value="(value) => updateConfig(config.key, { ...config, path: value })"
                  placeholder="请输入客户端可执行文件的完整路径"
                  clearable
                />
                <el-button @click="selectPath(config)" type="primary" size="small">
                  <el-icon><FolderOpened /></el-icon>
                  浏览
                </el-button>
              </div>
            </el-form-item>
            
            <el-form-item label="参数模板">
              <el-input
                :model-value="config.arguments"
                @update:model-value="(value) => updateConfig(config.key, { ...config, arguments: value })"
                type="textarea"
                :rows="2"
                placeholder="参数模板，支持变量: {host}, {port}, {username}, {password}, {protocol}"
              />
            </el-form-item>
            
            <div class="config-help">
              <el-alert
                title="参数模板说明"
                type="info"
                :closable="false"
                show-icon
              >
                <template #default>
                  <p>可用变量：</p>
                  <ul>
                    <li><code>{host}</code> - 主机地址</li>
                    <li><code>{port}</code> - 端口号</li>
                    <li><code>{username}</code> - 用户名</li>
                    <li><code>{password}</code> - 密码</li>
                    <li><code>{protocol}</code> - 协议类型（仅FTP/SFTP）</li>
                  </ul>
                </template>
              </el-alert>
            </div>
            
            <div class="config-test">
              <el-button @click="testClient(config)" size="small" type="success">
                <el-icon><VideoPlay /></el-icon>
                测试启动
              </el-button>
            </div>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { FolderOpened, VideoPlay } from '@element-plus/icons-vue'
import { ClientConfig } from '@/types/connection'

// Props
interface Props {
  configs: Array<ClientConfig & { key: string }>
  title: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  update: [key: string, config: ClientConfig]
}>()

// 方法
const updateConfig = (key: string, config: ClientConfig) => {
  emit('update', key, config)
}

const selectPath = async (config: ClientConfig & { key: string }) => {
  try {
    const filters = [
      { name: '可执行文件', extensions: ['exe'] },
      { name: '所有文件', extensions: ['*'] }
    ]
    
    const filePath = await window.electronAPI?.selectFile(filters)
    if (filePath) {
      updateConfig(config.key, { ...config, path: filePath })
      ElMessage.success('路径选择成功')
    }
  } catch (error) {
    console.error('选择文件失败:', error)
    ElMessage.error('选择文件失败')
  }
}

const testClient = async (config: ClientConfig & { key: string }) => {
  if (!config.path) {
    ElMessage.warning('请先配置客户端路径')
    return
  }
  
  try {
    // 简单测试：尝试启动客户端的帮助或版本信息
    const result = await window.electronAPI?.launchProgram(config.path, ['--help'])
    if (result?.success) {
      ElMessage.success(`${config.name} 测试启动成功`)
    } else {
      ElMessage.warning(`${config.name} 测试启动失败，请检查路径是否正确`)
    }
  } catch (error) {
    console.error('测试客户端失败:', error)
    ElMessage.error(`测试 ${config.name} 失败`)
  }
}
</script>

<style scoped lang="scss">
.client-config-panel {
  .panel-title {
    margin: 0 0 20px 0;
    color: #303133;
    font-size: 16px;
    font-weight: 500;
  }
  
  .config-list {
    .config-item {
      margin-bottom: 16px;
      padding: 16px;
      border: 1px solid #e4e7ed;
      border-radius: 8px;
      transition: all 0.3s;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      &.enabled {
        border-color: #409eff;
        background-color: #f0f9ff;
      }
      
      .config-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        
        .config-info {
          flex: 1;
          
          .config-name {
            margin: 0 0 4px 0;
            color: #303133;
            font-size: 14px;
            font-weight: 500;
          }
          
          .config-executable {
            color: #909399;
            font-size: 12px;
            font-family: 'Courier New', monospace;
          }
        }
      }
      
      .config-details {
        .path-input {
          display: flex;
          gap: 8px;
          
          .el-input {
            flex: 1;
          }
        }
        
        .config-help {
          margin: 12px 0;
          
          ul {
            margin: 8px 0 0 0;
            padding-left: 20px;
            
            li {
              margin-bottom: 4px;
              font-size: 12px;
              
              code {
                background-color: #f5f5f5;
                padding: 2px 4px;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
              }
            }
          }
        }
        
        .config-test {
          margin-top: 12px;
          text-align: right;
        }
      }
    }
  }
}

:deep(.el-form-item) {
  margin-bottom: 12px;
}

:deep(.el-form-item__label) {
  font-size: 12px;
  color: #606266;
}

:deep(.el-alert) {
  padding: 8px 12px;
  
  .el-alert__title {
    font-size: 12px;
  }
  
  .el-alert__content {
    font-size: 12px;
    
    p {
      margin: 0 0 4px 0;
    }
  }
}
</style>
