<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="设置"
    width="900px"
    :before-close="handleClose"
  >
    <el-tabs v-model="activeTab" tab-position="left">
      <!-- 客户端配置 -->
      <el-tab-pane label="客户端配置" name="clients">
        <ClientConfigManager />
      </el-tab-pane>

      <!-- 密码恢复 -->
      <el-tab-pane label="密码恢复" name="recovery">
        <PasswordRecovery />
      </el-tab-pane>

      <!-- 应用设置 -->
      <el-tab-pane label="应用设置" name="app">
        <div class="settings-content">
          <el-form :model="settings" label-width="120px">
            <el-card header="界面设置" class="settings-card">
              <el-form-item label="主题">
                <el-select v-model="settings.theme" placeholder="选择主题">
                  <el-option
                    v-for="option in THEME_OPTIONS"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="语言">
                <el-select v-model="settings.language" placeholder="选择语言">
                  <el-option
                    v-for="option in LANGUAGE_OPTIONS"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="显示连接数量">
                <el-switch v-model="settings.showConnectionCount" />
              </el-form-item>
            </el-card>

            <el-card header="连接设置" class="settings-card">
              <el-form-item label="默认连接类型">
                <el-select
                  v-model="settings.defaultConnectionType"
                  placeholder="选择默认连接类型"
                >
                  <el-option
                    v-for="option in CONNECTION_TYPE_OPTIONS"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="删除前确认">
                <el-switch v-model="settings.confirmBeforeDelete" />
              </el-form-item>
            </el-card>

            <el-card header="安全设置" class="settings-card">
              <el-form-item label="启用密码加密">
                <el-switch v-model="settings.encryptionEnabled" />
              </el-form-item>

              <el-form-item label="自动保存">
                <el-switch v-model="settings.autoSave" />
              </el-form-item>
            </el-card>

            <el-card header="备份设置" class="settings-card">
              <el-form-item label="启用自动备份">
                <el-switch v-model="settings.backupEnabled" />
              </el-form-item>

              <el-form-item
                label="备份间隔(小时)"
                v-if="settings.backupEnabled"
              >
                <el-input-number
                  v-model="settings.backupInterval"
                  :min="1"
                  :max="168"
                  placeholder="备份间隔"
                />
              </el-form-item>

              <el-divider content-position="left">数据导出</el-divider>

              <el-form-item>
                <div class="export-buttons">
                  <el-button
                    type="primary"
                    :icon="Download"
                    @click="exportWithPasswords"
                    :loading="exporting"
                  >
                    导出配置（含密码）
                  </el-button>
                  <el-button
                    type="default"
                    :icon="Download"
                    @click="exportWithoutPasswords"
                    :loading="exporting"
                  >
                    导出配置（不含密码）
                  </el-button>
                </div>
                <div class="export-note">
                  <el-text type="info" size="small">
                    • 含密码导出：包含明文密码，可在其他机器上直接导入使用<br />
                    • 不含密码导出：仅导出连接信息，需要重新输入密码
                  </el-text>
                </div>
              </el-form-item>
            </el-card>
          </el-form>
        </div>
      </el-tab-pane>

      <!-- 关于 -->
      <el-tab-pane label="关于" name="about">
        <div class="about-content">
          <div class="app-info">
            <div class="app-icon">
              <el-icon size="64"><Monitor /></el-icon>
            </div>
            <h2>远程管理系统</h2>
            <p class="version">版本 {{ APP_VERSION }}</p>
            <p class="description">
              一个功能强大的远程连接管理工具，支持 RDP、SSH、VNC、FTP
              等多种协议。 提供安全的密码加密存储和便捷的连接管理功能。
            </p>
          </div>

          <div class="features">
            <h3>主要功能</h3>
            <ul>
              <li>支持多种远程连接协议（RDP、SSH、VNC、FTP、SFTP、Telnet）</li>
              <li>分组管理和树形结构组织</li>
              <li>密码加密存储，保障数据安全</li>
              <li>一键连接，自动启动对应客户端</li>
              <li>连接测试和状态监控</li>
              <li>导入导出配置文件</li>
              <li>多种主题和界面定制</li>
            </ul>
          </div>

          <div class="supported-clients">
            <h3>支持的客户端</h3>
            <div class="client-categories">
              <div class="client-category">
                <h4>SSH客户端</h4>
                <p>Xshell, SecureCRT, PuTTY, KiTTY, OpenSSH</p>
              </div>
              <div class="client-category">
                <h4>FTP客户端</h4>
                <p>Xftp, WinSCP, FileZilla</p>
              </div>
              <div class="client-category">
                <h4>VNC客户端</h4>
                <p>Radmin Viewer, RealVNC, TightVNC, UltraVNC</p>
              </div>
              <div class="client-category">
                <h4>RDP客户端</h4>
                <p>Windows 远程桌面连接 (MSTSC)</p>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">
          保存设置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { Monitor, Download } from "@element-plus/icons-vue";
import ClientConfigManager from "./ClientConfigManager.vue";
import PasswordRecovery from "./PasswordRecovery.vue";
import { AppSettings } from "@/types/connection";
import {
  DEFAULT_SETTINGS,
  THEME_OPTIONS,
  LANGUAGE_OPTIONS,
  CONNECTION_TYPE_OPTIONS,
  APP_VERSION,
} from "@/utils/constants";
import { storageService } from "@/services/storage";

// Props
interface Props {
  visible: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
});

// Emits
const emit = defineEmits<{
  "update:visible": [value: boolean];
}>();

// 响应式数据
const activeTab = ref("clients");
const saving = ref(false);
const exporting = ref(false);
const settings = reactive<AppSettings>({ ...DEFAULT_SETTINGS });

// 生命周期
onMounted(() => {
  loadSettings();
});

// 监听器
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      loadSettings();
    }
  }
);

// 方法
const loadSettings = async () => {
  try {
    const result = await storageService.loadSettings();
    if (result.success && result.data) {
      Object.assign(settings, result.data);
    }
  } catch (error) {
    console.error("加载设置失败:", error);
  }
};

const handleSave = async () => {
  saving.value = true;
  try {
    const result = await storageService.saveSettings(settings);
    if (result.success) {
      ElMessage.success("设置保存成功");
      handleClose();
    } else {
      ElMessage.error("设置保存失败: " + result.error);
    }
  } catch (error) {
    console.error("保存设置失败:", error);
    ElMessage.error("保存设置失败");
  } finally {
    saving.value = false;
  }
};

const handleClose = () => {
  emit("update:visible", false);
};

// 导出方法
const exportWithPasswords = async () => {
  exporting.value = true;
  try {
    // 加载当前连接配置
    console.log("🔍 开始加载连接配置...");
    const connectionsResult = await storageService.loadConnections();
    console.log("📋 连接配置加载结果:", {
      success: connectionsResult.success,
      hasData: !!connectionsResult.data,
      groupsCount: connectionsResult.data?.groups?.length || 0,
      version: connectionsResult.data?.version,
      error: connectionsResult.error,
    });

    if (!connectionsResult.success || !connectionsResult.data) {
      console.error("❌ 加载连接配置失败:", connectionsResult.error);
      ElMessage.error(
        "加载连接配置失败: " + (connectionsResult.error || "未知错误")
      );
      return;
    }

    if (
      !connectionsResult.data.groups ||
      connectionsResult.data.groups.length === 0
    ) {
      console.warn("⚠️ 连接配置中没有分组数据");
      ElMessage.warning("当前没有连接数据可以导出");
      return;
    }

    // 生成默认文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const defaultFileName = `connections-with-passwords-${timestamp}.json`;

    // 选择保存路径
    const savePathResult = await window.electronAPI?.selectSavePath(
      defaultFileName,
      [{ name: "JSON Files", extensions: ["json"] }]
    );

    console.log("文件对话框返回结果:", savePathResult);

    if (!savePathResult || savePathResult.canceled) {
      return; // 用户取消了选择
    }

    if (!savePathResult.filePath) {
      ElMessage.error("未选择有效的保存路径");
      return;
    }

    console.log("导出配置数据:", {
      hasGroups: !!connectionsResult.data.groups,
      groupsLength: connectionsResult.data.groups?.length,
      version: connectionsResult.data.version,
    });

    // 导出包含密码的配置
    const result = await storageService.exportConnectionsWithPasswords(
      connectionsResult.data,
      savePathResult.filePath
    );

    if (result.success) {
      ElMessage.success(`导出成功！文件已保存到: ${savePathResult.filePath}`);
    } else {
      ElMessage.error("导出失败: " + result.error);
    }
  } catch (error) {
    console.error("导出失败:", error);
    ElMessage.error("导出失败");
  } finally {
    exporting.value = false;
  }
};

const exportWithoutPasswords = async () => {
  exporting.value = true;
  try {
    // 加载当前连接配置
    console.log("🔍 开始加载连接配置（不含密码）...");
    const connectionsResult = await storageService.loadConnections();
    console.log("📋 连接配置加载结果（不含密码）:", {
      success: connectionsResult.success,
      hasData: !!connectionsResult.data,
      groupsCount: connectionsResult.data?.groups?.length || 0,
      version: connectionsResult.data?.version,
      error: connectionsResult.error,
    });

    if (!connectionsResult.success || !connectionsResult.data) {
      console.error("❌ 加载连接配置失败:", connectionsResult.error);
      ElMessage.error(
        "加载连接配置失败: " + (connectionsResult.error || "未知错误")
      );
      return;
    }

    if (
      !connectionsResult.data.groups ||
      connectionsResult.data.groups.length === 0
    ) {
      console.warn("⚠️ 连接配置中没有分组数据");
      ElMessage.warning("当前没有连接数据可以导出");
      return;
    }

    // 生成默认文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const defaultFileName = `connections-no-passwords-${timestamp}.json`;

    // 选择保存路径
    const savePathResult = await window.electronAPI?.selectSavePath(
      defaultFileName,
      [{ name: "JSON Files", extensions: ["json"] }]
    );

    console.log("文件对话框返回结果:", savePathResult);

    if (!savePathResult || savePathResult.canceled) {
      return; // 用户取消了选择
    }

    if (!savePathResult.filePath) {
      ElMessage.error("未选择有效的保存路径");
      return;
    }

    // 导出不含密码的配置
    const result = await storageService.exportConnections(
      connectionsResult.data,
      savePathResult.filePath,
      false
    );

    if (result.success) {
      ElMessage.success(`导出成功！文件已保存到: ${savePathResult.filePath}`);
    } else {
      ElMessage.error("导出失败: " + result.error);
    }
  } catch (error) {
    console.error("导出失败:", error);
    ElMessage.error("导出失败");
  } finally {
    exporting.value = false;
  }
};
</script>

<style scoped lang="scss">
.settings-content {
  .settings-card {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .export-buttons {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
  }

  .export-note {
    padding: 8px 12px;
    background-color: #f5f7fa;
    border-radius: 4px;
    border-left: 3px solid #409eff;
  }
}

.about-content {
  padding: 20px;

  .app-info {
    text-align: center;
    margin-bottom: 32px;

    .app-icon {
      margin-bottom: 16px;
      color: #409eff;
    }

    h2 {
      margin: 0 0 8px 0;
      color: #303133;
    }

    .version {
      margin: 0 0 16px 0;
      color: #909399;
      font-size: 14px;
    }

    .description {
      margin: 0;
      color: #606266;
      line-height: 1.6;
      max-width: 500px;
      margin: 0 auto;
    }
  }

  .features {
    margin-bottom: 32px;

    h3 {
      margin: 0 0 16px 0;
      color: #303133;
    }

    ul {
      margin: 0;
      padding-left: 20px;

      li {
        margin-bottom: 8px;
        color: #606266;
        line-height: 1.6;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }

  .supported-clients {
    h3 {
      margin: 0 0 16px 0;
      color: #303133;
    }

    .client-categories {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;

      .client-category {
        padding: 16px;
        border: 1px solid #e4e7ed;
        border-radius: 6px;

        h4 {
          margin: 0 0 8px 0;
          color: #409eff;
          font-size: 14px;
        }

        p {
          margin: 0;
          color: #606266;
          font-size: 12px;
          line-height: 1.5;
        }
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.el-card__header) {
  font-weight: 500;
  color: #303133;
}

:deep(.el-tabs__content) {
  padding: 0;
}

:deep(.el-tabs--left .el-tabs__content) {
  padding-left: 20px;
}
</style>
