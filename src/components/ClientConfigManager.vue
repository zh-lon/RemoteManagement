<template>
  <div class="client-config-manager">
    <el-card header="客户端配置管理">
      <div class="config-tabs">
        <el-tabs v-model="activeTab" tab-position="left">
          <!-- RDP 客户端 -->
          <el-tab-pane label="RDP" name="rdp">
            <ClientConfigPanel
              :configs="rdpConfigs"
              title="RDP 客户端配置"
              @update="handleConfigUpdate"
            />
          </el-tab-pane>

          <!-- SSH 客户端 -->
          <el-tab-pane label="SSH" name="ssh">
            <ClientConfigPanel
              :configs="sshConfigs"
              title="SSH 客户端配置"
              @update="handleConfigUpdate"
            />
          </el-tab-pane>

          <!-- VNC 客户端 -->
          <el-tab-pane label="VNC" name="vnc">
            <ClientConfigPanel
              :configs="vncConfigs"
              title="VNC 客户端配置"
              @update="handleConfigUpdate"
            />
          </el-tab-pane>

          <!-- FTP 客户端 -->
          <el-tab-pane label="FTP/SFTP" name="ftp">
            <ClientConfigPanel
              :configs="ftpConfigs"
              title="FTP/SFTP 客户端配置"
              @update="handleConfigUpdate"
            />
          </el-tab-pane>

          <!-- Telnet 客户端 -->
          <el-tab-pane label="Telnet" name="telnet">
            <ClientConfigPanel
              :configs="telnetConfigs"
              title="Telnet 客户端配置"
              @update="handleConfigUpdate"
            />
          </el-tab-pane>
        </el-tabs>
      </div>

      <div class="config-actions">
        <div class="config-status">
          <el-tag v-if="hasUnsavedChanges" type="warning" size="small">
            <el-icon><Warning /></el-icon>
            有未保存的更改
          </el-tag>
          <el-tag v-else type="success" size="small">
            <el-icon><Check /></el-icon>
            配置已保存
          </el-tag>
        </div>

        <div class="action-buttons">
          <el-button @click="resetToDefaults" type="warning">
            <el-icon><RefreshLeft /></el-icon>
            重置为默认
          </el-button>

          <el-button @click="saveConfigs" type="primary" :loading="saving">
            <el-icon><Check /></el-icon>
            手动保存
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { RefreshLeft, Check, Warning } from "@element-plus/icons-vue";
import ClientConfigPanel from "./ClientConfigPanel.vue";
import { ClientConfig } from "@/types/connection";
import { DEFAULT_CLIENT_CONFIGS } from "@/utils/constants";
import { storageService } from "@/services/storage";
import { connectionService } from "@/services/connection";

// 响应式数据
const activeTab = ref("rdp");
const saving = ref(false);
const hasUnsavedChanges = ref(false);
const clientConfigs = ref<Record<string, ClientConfig>>({
  ...DEFAULT_CLIENT_CONFIGS,
});

// 计算属性 - 按类型分组的配置
const rdpConfigs = computed(() => {
  return Object.entries(clientConfigs.value)
    .filter(([key]) => key === "mstsc")
    .map(([key, config]) => ({ key, ...config }));
});

const sshConfigs = computed(() => {
  return Object.entries(clientConfigs.value)
    .filter(([key]) =>
      ["xshell", "securecrt", "putty", "kitty", "ssh"].includes(key)
    )
    .map(([key, config]) => ({ key, ...config }));
});

const vncConfigs = computed(() => {
  return Object.entries(clientConfigs.value)
    .filter(([key]) =>
      [
        "radmin",
        "vncviewer",
        "realvnc-vncviewer",
        "tightvnc-vncviewer",
        "ultravnc",
        "turbovnc",
      ].includes(key)
    )
    .map(([key, config]) => ({ key, ...config }));
});

const ftpConfigs = computed(() => {
  return Object.entries(clientConfigs.value)
    .filter(([key]) => ["xftp", "winscp", "filezilla", "ftp"].includes(key))
    .map(([key, config]) => ({ key, ...config }));
});

const telnetConfigs = computed(() => {
  return Object.entries(clientConfigs.value)
    .filter(([key]) => key === "telnet")
    .map(([key, config]) => ({ key, ...config }));
});

// 生命周期
onMounted(() => {
  loadConfigs();
});

// 方法
const loadConfigs = async () => {
  try {
    const result = await storageService.loadSettings();
    if (result.success && result.data?.clientPaths) {
      clientConfigs.value = { ...result.data.clientPaths };
    }
  } catch (error) {
    console.error("加载客户端配置失败:", error);
    ElMessage.error("加载客户端配置失败");
  }
};

const handleConfigUpdate = async (key: string, config: ClientConfig) => {
  clientConfigs.value[key] = config;
  hasUnsavedChanges.value = true;

  // 自动保存配置
  await autoSaveConfigs();
};

// 自动保存配置（防抖）
let saveTimeout: NodeJS.Timeout | null = null;
const autoSaveConfigs = async () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    try {
      // 获取当前设置
      const settingsResult = await storageService.loadSettings();
      if (!settingsResult.success) {
        console.error("自动保存失败：无法加载当前设置");
        return;
      }

      // 更新客户端配置
      const updatedSettings = {
        ...settingsResult.data,
        clientPaths: clientConfigs.value,
      };

      // 保存设置
      const saveResult = await storageService.saveSettings(updatedSettings);
      if (saveResult.success) {
        // 更新连接服务的配置
        connectionService.updateClientConfigs(clientConfigs.value);
        hasUnsavedChanges.value = false;
        console.log("客户端配置已自动保存");
      } else {
        console.error("自动保存失败:", saveResult.error);
      }
    } catch (error) {
      console.error("自动保存客户端配置失败:", error);
    }
  }, 1000); // 1秒防抖
};

const saveConfigs = async () => {
  saving.value = true;
  try {
    // 获取当前设置
    const settingsResult = await storageService.loadSettings();
    if (!settingsResult.success) {
      throw new Error("无法加载当前设置");
    }

    // 更新客户端配置
    const updatedSettings = {
      ...settingsResult.data,
      clientPaths: clientConfigs.value,
    };

    // 保存设置
    const saveResult = await storageService.saveSettings(updatedSettings);
    if (saveResult.success) {
      // 更新连接服务的配置
      connectionService.updateClientConfigs(clientConfigs.value);
      hasUnsavedChanges.value = false;
      ElMessage.success("客户端配置保存成功");
    } else {
      throw new Error(saveResult.error || "保存失败");
    }
  } catch (error) {
    console.error("保存客户端配置失败:", error);
    ElMessage.error("保存客户端配置失败: " + (error as Error).message);
  } finally {
    saving.value = false;
  }
};

const resetToDefaults = async () => {
  try {
    await ElMessageBox.confirm(
      "确定要重置所有客户端配置为默认值吗？此操作不可撤销。",
      "确认重置",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    clientConfigs.value = { ...DEFAULT_CLIENT_CONFIGS };
    hasUnsavedChanges.value = true;
    ElMessage.success("已重置为默认配置");
  } catch {
    // 用户取消操作
  }
};
</script>

<style scoped lang="scss">
.client-config-manager {
  .config-tabs {
    margin-bottom: 20px;
  }

  .config-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid #e4e7ed;

    .config-status {
      display: flex;
      align-items: center;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
    }
  }
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
