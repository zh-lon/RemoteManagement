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
import { ClientConfig, AppSettings } from "@/types/connection";
import { DEFAULT_CLIENT_CONFIGS, DEFAULT_SETTINGS } from "@/utils/constants";
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
onMounted(async () => {
  await loadConfigs();

  // 如果有未保存的更改（比如使用了默认配置），立即保存
  if (hasUnsavedChanges.value) {
    console.log("检测到未保存的更改，立即保存默认配置...");
    await autoSaveConfigs();
  }
});

// 方法
const loadConfigs = async () => {
  try {
    console.log("开始加载客户端配置...");
    const result = await storageService.loadSettings();
    console.log("加载设置结果:", result);

    if (result.success) {
      if (result.data?.clientPaths) {
        console.log("找到客户端配置:", result.data.clientPaths);
        clientConfigs.value = { ...result.data.clientPaths };
      } else {
        console.log("未找到客户端配置，使用默认配置");
        clientConfigs.value = { ...DEFAULT_CLIENT_CONFIGS };
        hasUnsavedChanges.value = true; // 标记需要保存
      }
    } else {
      console.log("加载设置失败，使用默认配置");
      clientConfigs.value = { ...DEFAULT_CLIENT_CONFIGS };
      hasUnsavedChanges.value = true; // 标记需要保存
    }

    console.log("最终客户端配置:", clientConfigs.value);
  } catch (error) {
    console.error("加载客户端配置失败:", error);
    ElMessage.error("加载客户端配置失败");
    // 即使出错也要设置默认配置
    clientConfigs.value = { ...DEFAULT_CLIENT_CONFIGS };
    hasUnsavedChanges.value = true;
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

      // 更新客户端配置，确保所有必需属性都存在
      const updatedSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        ...settingsResult.data,
        clientPaths: clientConfigs.value,
      };

      // 保存设置
      const saveResult = await storageService.saveSettings(updatedSettings);
      if (saveResult.success) {
        // 先更新连接服务的配置
        connectionService.updateClientConfigs(clientConfigs.value);
        console.log("自动保存：已更新连接服务的配置:", clientConfigs.value);
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
    console.log("开始保存客户端配置...");
    console.log("当前客户端配置:", clientConfigs.value);

    // 获取当前设置
    const settingsResult = await storageService.loadSettings();
    console.log("加载设置结果:", settingsResult);

    if (!settingsResult.success) {
      throw new Error("无法加载当前设置: " + settingsResult.error);
    }

    // 更新客户端配置，确保所有必需属性都存在
    const updatedSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...settingsResult.data,
      clientPaths: clientConfigs.value,
    };

    console.log("更新后的设置:", updatedSettings);

    // 保存设置
    const saveResult = await storageService.saveSettings(updatedSettings);
    console.log("保存结果:", saveResult);

    if (saveResult.success) {
      // 先更新连接服务的配置
      connectionService.updateClientConfigs(clientConfigs.value);
      console.log("已更新连接服务的配置:", clientConfigs.value);
      hasUnsavedChanges.value = false;

      // 验证保存是否成功
      const verifyResult = await storageService.loadSettings();
      console.log("验证加载结果:", verifyResult);

      if (verifyResult.success && verifyResult.data?.clientPaths) {
        console.log(
          "验证保存结果 - 客户端配置:",
          verifyResult.data.clientPaths
        );

        // 深度比较保存的配置是否与当前配置一致
        const savedConfigs = verifyResult.data.clientPaths;
        const currentConfigs = clientConfigs.value;

        // 检查关键配置是否匹配
        let configsMatch = true;
        const mismatchDetails: string[] = [];

        for (const [key, currentConfig] of Object.entries(currentConfigs)) {
          const savedConfig = savedConfigs[key];
          if (!savedConfig) {
            configsMatch = false;
            mismatchDetails.push(`缺少客户端: ${key}`);
            continue;
          }

          // 类型断言确保类型安全
          const current = currentConfig as ClientConfig;
          const saved = savedConfig as ClientConfig;

          // 检查关键属性
          if (saved.path !== current.path) {
            configsMatch = false;
            mismatchDetails.push(
              `${key}.path: 期望 "${current.path}", 实际 "${saved.path}"`
            );
          }
          if (saved.enabled !== current.enabled) {
            configsMatch = false;
            mismatchDetails.push(
              `${key}.enabled: 期望 ${current.enabled}, 实际 ${saved.enabled}`
            );
          }
          if (saved.arguments !== current.arguments) {
            configsMatch = false;
            mismatchDetails.push(
              `${key}.arguments: 期望 "${current.arguments}", 实际 "${saved.arguments}"`
            );
          }
        }

        if (configsMatch) {
          console.log("✅ 配置验证成功：保存的配置与当前配置完全一致");
          ElMessage.success("客户端配置保存成功并验证通过");
        } else {
          console.error("❌ 配置验证失败：保存的配置与当前配置不一致");
          console.error("不一致详情:", mismatchDetails);
          ElMessage.warning(
            "配置已保存，但验证发现不一致：" + mismatchDetails.join("; ")
          );
        }
      } else {
        console.error("❌ 验证失败：无法加载保存的配置");
        ElMessage.warning("配置可能已保存，但验证加载失败");
      }
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
