<template>
  <div class="password-recovery">
    <el-card header="密码恢复工具">
      <div class="recovery-section">
        <h3>密码解密状态检查</h3>
        <el-button @click="checkEncryptionStatus" type="primary">
          <el-icon><Tools /></el-icon>
          检查加密状态
        </el-button>

        <div v-if="encryptionStatus" class="status-result">
          <el-alert
            :title="encryptionStatus.title"
            :type="encryptionStatus.type"
            :description="encryptionStatus.description"
            show-icon
            :closable="false"
          />

          <div v-if="encryptionStatus.details" class="status-details">
            <h4>详细信息</h4>
            <div
              v-for="(value, key) in encryptionStatus.details"
              :key="key"
              class="detail-item"
            >
              <strong>{{ key }}:</strong> {{ value }}
            </div>
          </div>
        </div>
      </div>

      <div class="recovery-section">
        <h3>密码恢复选项</h3>

        <div class="recovery-option">
          <h4>选项1: 重新生成加密密钥</h4>
          <p>这将清除所有已保存的密码，但保留连接配置的其他信息。</p>
          <el-button
            @click="regenerateKey"
            type="warning"
            :loading="regenerating"
          >
            <el-icon><Refresh /></el-icon>
            重新生成密钥
          </el-button>
        </div>

        <div class="recovery-option">
          <h4>选项2: 清除所有加密数据</h4>
          <p>这将删除所有连接配置和密码，重新开始。</p>
          <el-button @click="clearAllData" type="danger" :loading="clearing">
            <el-icon><Delete /></el-icon>
            清除所有数据
          </el-button>
        </div>

        <div class="recovery-option">
          <h4>选项3: 手动修复密码</h4>
          <p>查看和手动修复受影响的连接密码。</p>
          <el-button @click="showPasswordFixer" type="info">
            <el-icon><Edit /></el-icon>
            手动修复密码
          </el-button>
        </div>
      </div>

      <div v-if="showFixer" class="recovery-section">
        <h3>密码修复工具</h3>
        <div v-if="affectedConnections.length === 0" class="no-affected">
          <el-empty description="没有发现受影响的连接" />
        </div>
        <div v-else>
          <div
            v-for="connection in affectedConnections"
            :key="connection.id"
            class="connection-item"
          >
            <div class="connection-info">
              <strong>{{ connection.name }}</strong>
              <span class="connection-type">{{ connection.type }}</span>
              <span class="connection-host"
                >{{ connection.host }}:{{ connection.port }}</span
              >
            </div>
            <div class="password-fix">
              <el-input
                v-model="connection.newPassword"
                type="password"
                placeholder="输入新密码"
                show-password
                size="small"
              />
              <el-button
                @click="fixPassword(connection)"
                type="success"
                size="small"
              >
                修复
              </el-button>
            </div>
          </div>

          <div class="fix-actions">
            <el-button
              @click="fixAllPasswords"
              type="primary"
              :loading="fixingAll"
            >
              <el-icon><Check /></el-icon>
              保存所有修复
            </el-button>
          </div>
        </div>
      </div>

      <div v-if="recoveryResults.length > 0" class="recovery-section">
        <h3>操作结果</h3>
        <div
          v-for="result in recoveryResults"
          :key="result.id"
          class="recovery-result"
        >
          <el-tag :type="result.success ? 'success' : 'danger'">
            {{ result.success ? "成功" : "失败" }}
          </el-tag>
          <span class="result-message">{{ result.message }}</span>
          <span class="result-time">{{ result.time }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Tools, Refresh, Delete, Edit, Check } from "@element-plus/icons-vue";
import { encryptionService } from "@/services/encryption";
import { storageService } from "@/services/storage";
import {
  ConnectionItem,
  ConnectionGroup,
  isConnectionItem,
} from "@/types/connection";

// 响应式数据
const regenerating = ref(false);
const clearing = ref(false);
const fixingAll = ref(false);
const showFixer = ref(false);
const encryptionStatus = ref<any>(null);
const affectedConnections = ref<
  Array<ConnectionItem & { newPassword: string }>
>([]);
const recoveryResults = ref<
  Array<{
    id: number;
    success: boolean;
    message: string;
    time: string;
  }>
>([]);

let resultId = 0;

// 方法
const addResult = (success: boolean, message: string) => {
  recoveryResults.value.unshift({
    id: ++resultId,
    success,
    message,
    time: new Date().toLocaleTimeString(),
  });

  if (recoveryResults.value.length > 10) {
    recoveryResults.value = recoveryResults.value.slice(0, 10);
  }
};

const checkEncryptionStatus = async () => {
  try {
    const isReady = encryptionService.isReady();
    const fingerprintMatch = await encryptionService.verifyKeyFingerprint();

    // 检查存储的数据
    const connectionsResult = await storageService.loadConnections();

    let affectedCount = 0;
    if (connectionsResult.success && connectionsResult.data) {
      affectedCount = countAffectedConnections(connectionsResult.data.groups);
    }

    if (isReady && fingerprintMatch && affectedCount === 0) {
      encryptionStatus.value = {
        title: "加密状态正常",
        type: "success",
        description: "加密服务工作正常，所有密码都可以正确解密。",
        details: {
          加密服务状态: "已初始化",
          密钥指纹: "匹配",
          受影响的连接: "0个",
        },
      };
    } else {
      encryptionStatus.value = {
        title: "发现加密问题",
        type: "warning",
        description: `检测到 ${affectedCount} 个连接的密码可能无法正确解密。`,
        details: {
          加密服务状态: isReady ? "已初始化" : "未初始化",
          密钥指纹: fingerprintMatch ? "匹配" : "不匹配",
          受影响的连接: `${affectedCount}个`,
        },
      };
    }

    ElMessage.success("加密状态检查完成");
  } catch (error) {
    console.error("检查加密状态失败:", error);
    encryptionStatus.value = {
      title: "检查失败",
      type: "error",
      description: "无法检查加密状态: " + (error as Error).message,
    };
    ElMessage.error("检查加密状态失败");
  }
};

const countAffectedConnections = (groups: ConnectionGroup[]): number => {
  let count = 0;

  const traverse = (items: Array<ConnectionGroup | ConnectionItem>) => {
    for (const item of items) {
      if (isConnectionItem(item)) {
        // 检查密码是否为空或看起来像加密数据
        if (
          !item.password ||
          (item.password.length > 20 &&
            /^[A-Za-z0-9+/]*={0,2}$/.test(item.password))
        ) {
          count++;
        }
      } else {
        traverse(item.children);
      }
    }
  };

  traverse(groups);
  return count;
};

const regenerateKey = async () => {
  try {
    await ElMessageBox.confirm(
      "重新生成加密密钥将清除所有已保存的密码，但保留其他连接信息。确定继续吗？",
      "确认重新生成密钥",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    regenerating.value = true;

    // 重新初始化加密服务
    encryptionService.cleanup();
    await encryptionService.initialize();

    // 加载连接配置并清除密码
    const connectionsResult = await storageService.loadConnections();
    if (connectionsResult.success && connectionsResult.data) {
      const clearedGroups = clearPasswordsFromGroups(
        connectionsResult.data.groups
      );
      connectionsResult.data.groups = clearedGroups;

      await storageService.saveConnections(connectionsResult.data);
    }

    addResult(true, "加密密钥已重新生成，所有密码已清除");
    ElMessage.success("密钥重新生成成功");

    // 重新检查状态
    await checkEncryptionStatus();
  } catch (error) {
    if (error !== "cancel") {
      console.error("重新生成密钥失败:", error);
      addResult(false, "重新生成密钥失败: " + (error as Error).message);
      ElMessage.error("重新生成密钥失败");
    }
  } finally {
    regenerating.value = false;
  }
};

const clearPasswordsFromGroups = (
  groups: ConnectionGroup[]
): ConnectionGroup[] => {
  return groups.map((group) => ({
    ...group,
    children: group.children.map((child) => {
      if (isConnectionItem(child)) {
        return { ...child, password: "" };
      } else {
        return clearPasswordsFromGroups([child])[0];
      }
    }),
  }));
};

const clearAllData = async () => {
  try {
    await ElMessageBox.confirm(
      "这将删除所有连接配置和设置，无法恢复。确定继续吗？",
      "确认清除所有数据",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "error",
      }
    );

    clearing.value = true;

    // 清除所有数据文件
    try {
      if (window.electronAPI) {
        // 删除主要配置文件
        await window.electronAPI.writeFile("", "connections.json", "");
        await window.electronAPI.writeFile("", "settings.json", "");
        await window.electronAPI.writeFile(
          "",
          "encryption-key-fingerprint.txt",
          ""
        );
      }
    } catch (error) {
      console.warn("清除数据文件时出错:", error);
    }

    // 重新初始化服务
    encryptionService.cleanup();
    await encryptionService.initialize();

    addResult(true, "所有数据已清除，系统已重置");
    ElMessage.success("数据清除成功");

    // 刷新页面
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    if (error !== "cancel") {
      console.error("清除数据失败:", error);
      addResult(false, "清除数据失败: " + (error as Error).message);
      ElMessage.error("清除数据失败");
    }
  } finally {
    clearing.value = false;
  }
};

const showPasswordFixer = async () => {
  try {
    const connectionsResult = await storageService.loadConnections();
    if (connectionsResult.success && connectionsResult.data) {
      affectedConnections.value = [];
      collectAffectedConnections(connectionsResult.data.groups);
      showFixer.value = true;

      if (affectedConnections.value.length === 0) {
        ElMessage.info("没有发现需要修复的连接");
      } else {
        ElMessage.success(
          `发现 ${affectedConnections.value.length} 个需要修复的连接`
        );
      }
    }
  } catch (error) {
    console.error("加载连接配置失败:", error);
    ElMessage.error("加载连接配置失败");
  }
};

const collectAffectedConnections = (groups: ConnectionGroup[]) => {
  const traverse = (items: Array<ConnectionGroup | ConnectionItem>) => {
    for (const item of items) {
      if (isConnectionItem(item)) {
        // 检查密码是否为空或看起来像加密数据
        if (
          !item.password ||
          (item.password.length > 20 &&
            /^[A-Za-z0-9+/]*={0,2}$/.test(item.password))
        ) {
          affectedConnections.value.push({
            ...item,
            newPassword: "",
          });
        }
      } else {
        traverse(item.children);
      }
    }
  };

  traverse(groups);
};

const fixPassword = (connection: ConnectionItem & { newPassword: string }) => {
  if (!connection.newPassword.trim()) {
    ElMessage.warning("请输入新密码");
    return;
  }

  connection.password = connection.newPassword;
  ElMessage.success(`${connection.name} 的密码已修复`);
};

const fixAllPasswords = async () => {
  try {
    fixingAll.value = true;

    // 更新所有连接的密码
    const connectionsResult = await storageService.loadConnections();
    if (connectionsResult.success && connectionsResult.data) {
      updatePasswordsInGroups(connectionsResult.data.groups);
      await storageService.saveConnections(connectionsResult.data);

      addResult(
        true,
        `已修复 ${affectedConnections.value.length} 个连接的密码`
      );
      ElMessage.success("所有密码修复完成");

      // 清空修复列表
      affectedConnections.value = [];
      showFixer.value = false;
    }
  } catch (error) {
    console.error("修复密码失败:", error);
    addResult(false, "修复密码失败: " + (error as Error).message);
    ElMessage.error("修复密码失败");
  } finally {
    fixingAll.value = false;
  }
};

const updatePasswordsInGroups = (groups: ConnectionGroup[]) => {
  const traverse = (items: Array<ConnectionGroup | ConnectionItem>) => {
    for (const item of items) {
      if (isConnectionItem(item)) {
        const affected = affectedConnections.value.find(
          (conn) => conn.id === item.id
        );
        if (affected && affected.newPassword) {
          item.password = affected.newPassword;
        }
      } else {
        traverse(item.children);
      }
    }
  };

  traverse(groups);
};
</script>

<style scoped lang="scss">
.password-recovery {
  .recovery-section {
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

    .status-result {
      margin-top: 16px;

      .status-details {
        margin-top: 12px;

        .detail-item {
          margin-bottom: 8px;
          color: #606266;

          strong {
            color: #303133;
          }
        }
      }
    }

    .recovery-option {
      margin-bottom: 20px;
      padding: 16px;
      border: 1px solid #e4e7ed;
      border-radius: 4px;

      &:last-child {
        margin-bottom: 0;
      }

      h4 {
        margin: 0 0 8px 0;
        color: #303133;
      }

      p {
        margin: 0 0 12px 0;
        color: #606266;
        font-size: 14px;
      }
    }

    .connection-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      margin-bottom: 8px;
      border: 1px solid #e4e7ed;
      border-radius: 4px;

      .connection-info {
        flex: 1;

        strong {
          color: #303133;
          margin-right: 12px;
        }

        .connection-type {
          background-color: #f0f2f5;
          color: #606266;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          margin-right: 8px;
        }

        .connection-host {
          color: #909399;
          font-size: 12px;
        }
      }

      .password-fix {
        display: flex;
        align-items: center;
        gap: 8px;

        .el-input {
          width: 200px;
        }
      }
    }

    .fix-actions {
      margin-top: 16px;
      text-align: center;
    }

    .no-affected {
      text-align: center;
      padding: 40px 0;
    }

    .recovery-result {
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
