<template>
  <div class="storage-debugger">
    <el-card header="存储调试工具">
      <div class="debug-section">
        <h3>LocalStorage 测试</h3>
        <el-button @click="testLocalStorage" type="primary">
          <el-icon><Tools /></el-icon>
          测试 LocalStorage
        </el-button>

        <el-button @click="viewLocalStorage" type="info">
          <el-icon><View /></el-icon>
          查看 LocalStorage
        </el-button>

        <el-button @click="clearLocalStorage" type="danger">
          <el-icon><Delete /></el-icon>
          清空 LocalStorage
        </el-button>

        <div v-if="localStorageResult" class="test-result">
          <el-alert
            :title="localStorageResult.success ? '测试成功' : '测试失败'"
            :type="localStorageResult.success ? 'success' : 'error'"
            :description="localStorageResult.message"
            show-icon
            :closable="false"
          />
        </div>
      </div>

      <div class="debug-section">
        <h3>存储服务测试</h3>
        <el-button @click="testStorageService" type="success">
          <el-icon><Tools /></el-icon>
          测试存储服务
        </el-button>

        <el-button @click="directSaveTest" type="warning">
          <el-icon><Upload /></el-icon>
          直接保存测试
        </el-button>

        <div v-if="storageServiceResult" class="test-result">
          <el-alert
            :title="storageServiceResult.success ? '测试成功' : '测试失败'"
            :type="storageServiceResult.success ? 'success' : 'error'"
            :description="storageServiceResult.message"
            show-icon
            :closable="false"
          />

          <div v-if="storageServiceResult.details" class="result-details">
            <h4>详细信息</h4>
            <pre>{{
              JSON.stringify(storageServiceResult.details, null, 2)
            }}</pre>
          </div>
        </div>
      </div>

      <div class="debug-section">
        <h3>当前存储内容</h3>
        <el-button @click="refreshStorageContent" type="info">
          <el-icon><Refresh /></el-icon>
          刷新内容
        </el-button>

        <div v-if="storageContent" class="storage-content">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="Settings" name="settings">
              <div class="content-header">
                <strong>Key:</strong> {{ SETTINGS_FILE_NAME }}
              </div>
              <pre>{{ storageContent.settings || "(空)" }}</pre>
            </el-tab-pane>

            <el-tab-pane label="Connections" name="connections">
              <div class="content-header">
                <strong>Key:</strong> {{ DATA_FILE_NAME }}
              </div>
              <pre>{{ storageContent.connections || "(空)" }}</pre>
            </el-tab-pane>

            <el-tab-pane label="All Keys" name="all">
              <div class="all-keys">
                <div
                  v-for="(value, key) in allLocalStorageKeys"
                  :key="key"
                  class="key-item"
                >
                  <strong>{{ key }}:</strong>
                  <pre>{{ value }}</pre>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>

      <div class="debug-section">
        <h3>客户端配置专项测试</h3>
        <el-button
          @click="testClientConfigSave"
          type="primary"
          :loading="testing"
        >
          <el-icon><Setting /></el-icon>
          测试客户端配置保存
        </el-button>

        <el-button @click="testClientConfigLoad" type="success">
          <el-icon><Download /></el-icon>
          测试客户端配置加载
        </el-button>

        <el-button @click="quickConfigTest" type="warning">
          <el-icon><Check /></el-icon>
          快速配置测试
        </el-button>

        <div v-if="clientConfigResult" class="test-result">
          <el-alert
            :title="clientConfigResult.success ? '测试成功' : '测试失败'"
            :type="clientConfigResult.success ? 'success' : 'error'"
            :description="clientConfigResult.message"
            show-icon
            :closable="false"
          />

          <div v-if="clientConfigResult.details" class="result-details">
            <h4>客户端配置详情</h4>
            <pre>{{ JSON.stringify(clientConfigResult.details, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import {
  View,
  Delete,
  Tools,
  Upload,
  Refresh,
  Setting,
  Download,
  Check,
} from "@element-plus/icons-vue";
import { storageService } from "@/services/storage";
import {
  DEFAULT_SETTINGS,
  DEFAULT_CLIENT_CONFIGS,
  SETTINGS_FILE_NAME,
  DATA_FILE_NAME,
} from "@/utils/constants";

// 响应式数据
const testing = ref(false);
const activeTab = ref("settings");
const localStorageResult = ref<any>(null);
const storageServiceResult = ref<any>(null);
const clientConfigResult = ref<any>(null);
const storageContent = ref<any>(null);
const allLocalStorageKeys = ref<any>({});

// 方法
const testLocalStorage = () => {
  try {
    const testKey = "test-key-" + Date.now();
    const testValue = { test: true, timestamp: Date.now() };

    // 测试写入
    localStorage.setItem(testKey, JSON.stringify(testValue));

    // 测试读取
    const retrieved = localStorage.getItem(testKey);
    if (!retrieved) {
      throw new Error("无法读取刚写入的数据");
    }

    const parsed = JSON.parse(retrieved);
    if (parsed.test !== true) {
      throw new Error("读取的数据不正确");
    }

    // 清理测试数据
    localStorage.removeItem(testKey);

    localStorageResult.value = {
      success: true,
      message: "LocalStorage 工作正常",
    };

    ElMessage.success("LocalStorage 测试成功");
  } catch (error) {
    localStorageResult.value = {
      success: false,
      message: "LocalStorage 测试失败: " + (error as Error).message,
    };

    ElMessage.error("LocalStorage 测试失败");
  }
};

const viewLocalStorage = () => {
  refreshStorageContent();
};

const clearLocalStorage = () => {
  try {
    localStorage.removeItem(SETTINGS_FILE_NAME);
    localStorage.removeItem(DATA_FILE_NAME);
    ElMessage.success("LocalStorage 已清空");
    refreshStorageContent();
  } catch (error) {
    ElMessage.error("清空 LocalStorage 失败");
  }
};

const testStorageService = async () => {
  try {
    // 测试存储服务初始化
    await storageService.initialize();

    // 测试设置保存和加载
    const testSettings = {
      ...DEFAULT_SETTINGS,
      theme: "dark" as const,
      testFlag: true,
    };

    console.log("测试保存设置:", testSettings);
    const saveResult = await storageService.saveSettings(testSettings);
    console.log("保存结果:", saveResult);

    if (!saveResult.success) {
      throw new Error("保存失败: " + saveResult.error);
    }

    // 立即验证保存结果
    const loadResult = await storageService.loadSettings();
    console.log("加载结果:", loadResult);

    if (!loadResult.success) {
      throw new Error("加载失败: " + loadResult.error);
    }

    storageServiceResult.value = {
      success: true,
      message: "存储服务测试成功",
      details: {
        saved: testSettings,
        loaded: loadResult.data,
        match: loadResult.data?.theme === "dark",
      },
    };

    ElMessage.success("存储服务测试成功");
  } catch (error) {
    console.error("存储服务测试失败:", error);
    storageServiceResult.value = {
      success: false,
      message: "存储服务测试失败: " + (error as Error).message,
    };

    ElMessage.error("存储服务测试失败");
  }
};

const directSaveTest = () => {
  try {
    const testData = {
      ...DEFAULT_SETTINGS,
      clientPaths: {
        ...DEFAULT_CLIENT_CONFIGS,
        test_direct: {
          name: "直接测试客户端",
          executable: "test_direct",
          path: "/test/direct/path.exe",
          enabled: true,
          arguments: "--direct-test",
        },
      },
    };

    console.log("直接保存到 localStorage:", testData);
    localStorage.setItem(SETTINGS_FILE_NAME, JSON.stringify(testData, null, 2));

    // 立即验证
    const retrieved = localStorage.getItem(SETTINGS_FILE_NAME);
    if (retrieved) {
      const parsed = JSON.parse(retrieved);
      console.log("直接读取结果:", parsed);

      storageServiceResult.value = {
        success: true,
        message: "直接保存测试成功",
        details: {
          saved: testData,
          retrieved: parsed,
          hasTestClient: !!parsed.clientPaths?.test_direct,
        },
      };

      ElMessage.success("直接保存测试成功");
    } else {
      throw new Error("无法读取刚保存的数据");
    }
  } catch (error) {
    console.error("直接保存测试失败:", error);
    storageServiceResult.value = {
      success: false,
      message: "直接保存测试失败: " + (error as Error).message,
    };

    ElMessage.error("直接保存测试失败");
  }
};

const refreshStorageContent = () => {
  try {
    const settings = localStorage.getItem(SETTINGS_FILE_NAME);
    const connections = localStorage.getItem(DATA_FILE_NAME);

    // 获取所有 localStorage 键值对
    const allKeys: any = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        try {
          allKeys[key] = JSON.parse(value || "{}");
        } catch {
          allKeys[key] = value;
        }
      }
    }

    storageContent.value = {
      settings: settings ? JSON.parse(settings) : null,
      connections: connections ? JSON.parse(connections) : null,
    };

    allLocalStorageKeys.value = allKeys;

    ElMessage.success("存储内容已刷新");
  } catch (error) {
    console.error("刷新存储内容失败:", error);
    ElMessage.error("刷新存储内容失败");
  }
};

const testClientConfigSave = async () => {
  testing.value = true;
  try {
    const testClientConfigs = {
      ...DEFAULT_CLIENT_CONFIGS,
      test_client_save: {
        name: "测试保存客户端",
        executable: "test_save",
        path: "/test/save/client.exe",
        enabled: true,
        arguments: "--test-save {host} {port}",
      },
    };

    const testSettings = {
      ...DEFAULT_SETTINGS,
      clientPaths: testClientConfigs,
    };

    console.log("测试客户端配置保存:", testSettings);

    // 使用存储服务保存
    const saveResult = await storageService.saveSettings(testSettings);
    console.log("客户端配置保存结果:", saveResult);

    if (!saveResult.success) {
      throw new Error("保存失败: " + saveResult.error);
    }

    // 验证保存结果
    const loadResult = await storageService.loadSettings();
    console.log("客户端配置加载结果:", loadResult);

    if (!loadResult.success) {
      throw new Error("加载失败: " + loadResult.error);
    }

    const hasTestClient = loadResult.data?.clientPaths?.test_client_save;

    clientConfigResult.value = {
      success: hasTestClient ? true : false,
      message: hasTestClient
        ? "客户端配置保存成功"
        : "客户端配置保存失败，未找到测试客户端",
      details: {
        savedClientPaths: testClientConfigs,
        loadedClientPaths: loadResult.data?.clientPaths,
        testClientExists: !!hasTestClient,
      },
    };

    if (hasTestClient) {
      ElMessage.success("客户端配置保存测试成功");
    } else {
      ElMessage.error("客户端配置保存测试失败");
    }
  } catch (error) {
    console.error("客户端配置保存测试失败:", error);
    clientConfigResult.value = {
      success: false,
      message: "客户端配置保存测试失败: " + (error as Error).message,
    };

    ElMessage.error("客户端配置保存测试失败");
  } finally {
    testing.value = false;
  }
};

const testClientConfigLoad = async () => {
  try {
    const loadResult = await storageService.loadSettings();

    if (!loadResult.success) {
      throw new Error("加载失败: " + loadResult.error);
    }

    const clientPaths = loadResult.data?.clientPaths;
    const clientCount = clientPaths ? Object.keys(clientPaths).length : 0;

    clientConfigResult.value = {
      success: true,
      message: `客户端配置加载成功，共 ${clientCount} 个客户端`,
      details: {
        clientPaths: clientPaths,
        clientCount: clientCount,
        enabledClients: clientPaths
          ? Object.values(clientPaths).filter((config: any) => config.enabled)
              .length
          : 0,
      },
    };

    ElMessage.success("客户端配置加载测试成功");
  } catch (error) {
    console.error("客户端配置加载测试失败:", error);
    clientConfigResult.value = {
      success: false,
      message: "客户端配置加载测试失败: " + (error as Error).message,
    };

    ElMessage.error("客户端配置加载测试失败");
  }
};

const quickConfigTest = async () => {
  try {
    console.log("=== 快速配置测试开始 ===");

    // 1. 清空现有配置
    localStorage.removeItem(SETTINGS_FILE_NAME);
    console.log("1. 已清空现有配置");

    // 2. 创建测试配置
    const testConfig = {
      ...DEFAULT_SETTINGS,
      clientPaths: {
        ...DEFAULT_CLIENT_CONFIGS,
        quick_test: {
          name: "快速测试客户端",
          executable: "quick_test",
          path: "/quick/test/path.exe",
          enabled: true,
          arguments: "--quick-test {host} {port} {password}",
        },
      },
    };

    console.log("2. 创建测试配置:", testConfig);

    // 3. 直接保存到localStorage
    localStorage.setItem(
      SETTINGS_FILE_NAME,
      JSON.stringify(testConfig, null, 2)
    );
    console.log("3. 已保存到localStorage");

    // 4. 验证localStorage内容
    const stored = localStorage.getItem(SETTINGS_FILE_NAME);
    if (!stored) {
      throw new Error("localStorage保存失败");
    }

    const parsed = JSON.parse(stored);
    console.log("4. localStorage验证成功:", parsed);

    // 5. 使用存储服务加载
    const loadResult = await storageService.loadSettings();
    console.log("5. 存储服务加载结果:", loadResult);

    if (!loadResult.success) {
      throw new Error("存储服务加载失败: " + loadResult.error);
    }

    // 6. 检查快速测试客户端是否存在
    const hasQuickTest = loadResult.data?.clientPaths?.quick_test;
    console.log("6. 快速测试客户端存在:", !!hasQuickTest);

    if (!hasQuickTest) {
      throw new Error("快速测试客户端未找到");
    }

    clientConfigResult.value = {
      success: true,
      message: "快速配置测试成功！所有步骤都正常工作",
      details: {
        step1_clear: true,
        step2_create: true,
        step3_localStorage_save: true,
        step4_localStorage_verify: true,
        step5_service_load: loadResult.success,
        step6_quick_test_exists: !!hasQuickTest,
        final_config: loadResult.data?.clientPaths,
      },
    };

    console.log("=== 快速配置测试完成 ===");
    ElMessage.success("快速配置测试成功！");
  } catch (error) {
    console.error("快速配置测试失败:", error);
    clientConfigResult.value = {
      success: false,
      message: "快速配置测试异常: " + (error as Error).message,
    };
    ElMessage.error("快速配置测试异常");
  }
};
</script>

<style scoped lang="scss">
.storage-debugger {
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

    .storage-content {
      margin-top: 16px;

      .content-header {
        margin-bottom: 8px;
        color: #606266;
        font-size: 12px;
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

      .all-keys {
        .key-item {
          margin-bottom: 16px;
          padding: 12px;
          border: 1px solid #e4e7ed;
          border-radius: 4px;

          &:last-child {
            margin-bottom: 0;
          }

          strong {
            color: #303133;
            display: block;
            margin-bottom: 8px;
          }

          pre {
            margin: 0;
            background-color: #fafafa;
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
