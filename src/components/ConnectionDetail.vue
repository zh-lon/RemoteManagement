<template>
  <div class="connection-detail">
    <!-- 空状态 -->
    <div v-if="!selectedNode" class="empty-state">
      <el-empty description="请选择一个连接或分组">
        <el-button type="primary" @click="$emit('addConnection')">
          <el-icon><Plus /></el-icon>
          创建新连接
        </el-button>
      </el-empty>
    </div>

    <!-- 分组详情 -->
    <div v-else-if="isConnectionGroup(selectedNode)" class="group-detail">
      <div class="detail-header">
        <div class="header-content">
          <el-icon class="header-icon"><Folder /></el-icon>
          <div class="header-text">
            <h2>{{ selectedNode.name }}</h2>
            <p class="header-subtitle">
              分组 · {{ getGroupConnectionCount(selectedNode) }} 个连接
            </p>
          </div>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="$emit('editNode', selectedNode)">
            <el-icon><Edit /></el-icon>
            编辑分组
          </el-button>
          <el-button @click="$emit('addConnection', selectedNode)">
            <el-icon><Plus /></el-icon>
            添加连接
          </el-button>
        </div>
      </div>

      <div class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="分组名称">{{
            selectedNode.name
          }}</el-descriptions-item>
          <el-descriptions-item label="连接数量">{{
            getGroupConnectionCount(selectedNode)
          }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{
            formatDate(selectedNode.createdAt)
          }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{
            formatDate(selectedNode.updatedAt)
          }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ selectedNode.description || "无描述" }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 分组内连接列表 -->
        <div class="group-connections">
          <h3>连接列表</h3>
          <el-table :data="getGroupConnections(selectedNode)" stripe>
            <el-table-column prop="name" label="名称" min-width="120">
              <template #default="{ row }">
                <div class="connection-name">
                  <el-icon class="connection-type-icon">
                    <component :is="getConnectionTypeIcon(row.type)" />
                  </el-icon>
                  {{ row.name }}
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="80">
              <template #default="{ row }">
                <el-tag :type="getConnectionTypeTagType(row.type)">
                  {{ row.type.toUpperCase() }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="host" label="主机" min-width="120" />
            <el-table-column prop="port" label="端口" width="80" />
            <el-table-column prop="username" label="用户名" min-width="100" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  size="small"
                  @click="$emit('connectToHost', row)"
                >
                  连接
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>

    <!-- 连接详情 -->
    <div v-else class="connection-detail-view">
      <div class="detail-header">
        <div class="header-content">
          <el-icon class="header-icon connection-type-icon">
            <component :is="getConnectionTypeIcon(selectedNode.type)" />
          </el-icon>
          <div class="header-text">
            <h2>{{ selectedNode.name }}</h2>
            <p class="header-subtitle">
              {{ CONNECTION_TYPE_NAMES[selectedNode.type] }} ·
              {{ selectedNode.host }}:{{ selectedNode.port }}
            </p>
          </div>
        </div>
        <div class="header-actions">
          <el-button
            type="primary"
            @click="$emit('connectToHost', selectedNode)"
            :loading="connecting"
          >
            <el-icon><Connection /></el-icon>
            连接
          </el-button>
          <el-button @click="handleTestConnection">
            <el-icon><Connection /></el-icon>
            测试连接
          </el-button>
          <el-button @click="$emit('editNode', selectedNode)">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
        </div>
      </div>

      <div class="detail-content">
        <!-- 基本信息 -->
        <el-card class="info-card" header="基本信息">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="连接名称">{{
              selectedNode.name
            }}</el-descriptions-item>
            <el-descriptions-item label="连接类型">
              <el-tag :type="getConnectionTypeTagType(selectedNode.type)">
                {{ CONNECTION_TYPE_NAMES[selectedNode.type] }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="主机地址">{{
              selectedNode.host
            }}</el-descriptions-item>
            <el-descriptions-item label="端口">{{
              selectedNode.port
            }}</el-descriptions-item>
            <el-descriptions-item label="用户名">{{
              selectedNode.username
            }}</el-descriptions-item>
            <el-descriptions-item label="密码">
              <span class="password-field">
                {{ showPassword ? selectedNode.password : "••••••••" }}
                <el-button
                  type="text"
                  size="small"
                  @click="showPassword = !showPassword"
                >
                  <el-icon>
                    <component :is="showPassword ? 'Hide' : 'View'" />
                  </el-icon>
                </el-button>
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="描述" :span="2">
              {{ selectedNode.description || "无描述" }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 连接统计 -->
        <el-card class="info-card" header="连接统计">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="连接次数">{{
              selectedNode.connectionCount || 0
            }}</el-descriptions-item>
            <el-descriptions-item label="最后连接">
              {{
                selectedNode.lastConnected
                  ? formatDate(selectedNode.lastConnected)
                  : "从未连接"
              }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{
              formatDate(selectedNode.createdAt)
            }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{
              formatDate(selectedNode.updatedAt)
            }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 类型特定配置 -->
        <el-card
          v-if="hasTypeSpecificConfig(selectedNode)"
          class="info-card"
          header="高级配置"
        >
          <!-- RDP配置 -->
          <template v-if="selectedNode.type === ConnectionType.RDP">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="域名">{{
                selectedNode.domain || "无"
              }}</el-descriptions-item>
              <el-descriptions-item label="分辨率">{{
                selectedNode.resolution || "默认"
              }}</el-descriptions-item>
              <el-descriptions-item label="颜色深度"
                >{{ selectedNode.colorDepth || "默认" }}位</el-descriptions-item
              >
              <el-descriptions-item label="全屏模式">{{
                selectedNode.fullScreen ? "是" : "否"
              }}</el-descriptions-item>
              <el-descriptions-item label="剪贴板">{{
                selectedNode.enableClipboard ? "启用" : "禁用"
              }}</el-descriptions-item>
              <el-descriptions-item label="驱动器共享">{{
                selectedNode.enableDrives ? "启用" : "禁用"
              }}</el-descriptions-item>
              <el-descriptions-item label="打印机共享">{{
                selectedNode.enablePrinters ? "启用" : "禁用"
              }}</el-descriptions-item>
              <el-descriptions-item label="声音">{{
                selectedNode.enableSound ? "启用" : "禁用"
              }}</el-descriptions-item>
            </el-descriptions>
          </template>

          <!-- SSH配置 -->
          <template v-else-if="selectedNode.type === ConnectionType.SSH">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="私钥认证">{{
                selectedNode.usePrivateKey ? "是" : "否"
              }}</el-descriptions-item>
              <el-descriptions-item label="私钥路径">{{
                selectedNode.privateKeyPath || "无"
              }}</el-descriptions-item>
              <el-descriptions-item label="终端类型">{{
                selectedNode.terminalType || "xterm"
              }}</el-descriptions-item>
              <el-descriptions-item label="编码">{{
                selectedNode.encoding || "UTF-8"
              }}</el-descriptions-item>
              <el-descriptions-item label="保持连接">{{
                selectedNode.keepAlive ? "是" : "否"
              }}</el-descriptions-item>
              <el-descriptions-item label="压缩">{{
                selectedNode.compression ? "启用" : "禁用"
              }}</el-descriptions-item>
            </el-descriptions>
          </template>

          <!-- VNC配置 -->
          <template v-else-if="selectedNode.type === ConnectionType.VNC">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="只读模式">{{
                selectedNode.viewOnly ? "是" : "否"
              }}</el-descriptions-item>
              <el-descriptions-item label="共享连接">{{
                selectedNode.sharedConnection ? "是" : "否"
              }}</el-descriptions-item>
              <el-descriptions-item label="颜色深度"
                >{{ selectedNode.colorDepth || "默认" }}位</el-descriptions-item
              >
              <el-descriptions-item label="压缩级别">{{
                selectedNode.compression || "默认"
              }}</el-descriptions-item>
              <el-descriptions-item label="图像质量">{{
                selectedNode.quality || "默认"
              }}</el-descriptions-item>
            </el-descriptions>
          </template>

          <!-- FTP/SFTP配置 -->
          <template
            v-else-if="
              selectedNode.type === ConnectionType.FTP ||
              selectedNode.type === ConnectionType.SFTP
            "
          >
            <el-descriptions :column="2" border>
              <el-descriptions-item label="被动模式">{{
                selectedNode.passiveMode ? "是" : "否"
              }}</el-descriptions-item>
              <el-descriptions-item label="编码">{{
                selectedNode.encoding || "UTF-8"
              }}</el-descriptions-item>
              <el-descriptions-item label="初始路径">{{
                selectedNode.initialPath || "/"
              }}</el-descriptions-item>
            </el-descriptions>
          </template>

          <!-- Telnet配置 -->
          <template v-else-if="selectedNode.type === ConnectionType.TELNET">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="终端类型">{{
                selectedNode.terminalType || "vt100"
              }}</el-descriptions-item>
              <el-descriptions-item label="编码">{{
                selectedNode.encoding || "UTF-8"
              }}</el-descriptions-item>
            </el-descriptions>
          </template>
        </el-card>

        <!-- 标签 -->
        <el-card
          v-if="selectedNode.tags && selectedNode.tags.length > 0"
          class="info-card"
          header="标签"
        >
          <div class="tags-container">
            <el-tag
              v-for="tag in selectedNode.tags"
              :key="tag"
              class="tag-item"
              type="info"
            >
              {{ tag }}
            </el-tag>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { ElMessage } from "element-plus";
import {
  Plus,
  Folder,
  Edit,
  Connection,
  Monitor,
  View,
  ChatLineSquare,
  FolderOpened,
  Hide,
} from "@element-plus/icons-vue";
import {
  ConnectionGroup,
  ConnectionItem,
  TreeNode,
  isConnectionGroup,
  isConnectionItem,
  ConnectionType,
  CONNECTION_TYPE_NAMES,
  CONNECTION_TYPE_ICONS,
} from "@/types/connection";
import { connectionService } from "@/services/connection";

// Props
interface Props {
  selectedNode?: TreeNode | null;
}

const props = withDefaults(defineProps<Props>(), {
  selectedNode: null,
});

// Emits
const emit = defineEmits<{
  addConnection: [parentGroup?: ConnectionGroup];
  editNode: [node: TreeNode];
  connectToHost: [connection: ConnectionItem];
  testConnection: [connection: ConnectionItem];
}>();

// 响应式数据
const connecting = ref(false);
const showPassword = ref(false);

// 方法
const getGroupConnectionCount = (group: ConnectionGroup): number => {
  let count = 0;
  for (const child of group.children) {
    if (isConnectionGroup(child)) {
      count += getGroupConnectionCount(child);
    } else {
      count++;
    }
  }
  return count;
};

const getGroupConnections = (group: ConnectionGroup): ConnectionItem[] => {
  const connections: ConnectionItem[] = [];
  for (const child of group.children) {
    if (isConnectionGroup(child)) {
      connections.push(...getGroupConnections(child));
    } else {
      connections.push(child);
    }
  }
  return connections;
};

const getConnectionTypeIcon = (type: ConnectionType) => {
  switch (CONNECTION_TYPE_ICONS[type]) {
    case "Monitor":
      return Monitor;
    case "Terminal":
      return Connection;
    case "View":
      return View;
    case "ChatLineSquare":
      return ChatLineSquare;
    case "Folder":
      return Folder;
    case "FolderOpened":
      return FolderOpened;
    default:
      return Connection;
  }
};

const getConnectionTypeTagType = (type: ConnectionType) => {
  switch (type) {
    case ConnectionType.RDP:
      return "success";
    case ConnectionType.SSH:
      return "warning";
    case ConnectionType.VNC:
      return "danger";
    case ConnectionType.TELNET:
      return "info";
    case ConnectionType.FTP:
    case ConnectionType.SFTP:
      return "primary";
    default:
      return "info";
  }
};

const hasTypeSpecificConfig = (connection: ConnectionItem): boolean => {
  switch (connection.type) {
    case ConnectionType.RDP:
      return !!(
        connection.domain ||
        connection.resolution ||
        connection.colorDepth
      );
    case ConnectionType.SSH:
      return !!(
        connection.usePrivateKey ||
        connection.terminalType ||
        connection.encoding
      );
    case ConnectionType.VNC:
      return !!(
        connection.viewOnly ||
        connection.sharedConnection ||
        connection.colorDepth
      );
    case ConnectionType.FTP:
    case ConnectionType.SFTP:
      return !!(
        connection.passiveMode ||
        connection.encoding ||
        connection.initialPath
      );
    case ConnectionType.TELNET:
      return !!(connection.terminalType || connection.encoding);
    default:
      return false;
  }
};

const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleString("zh-CN");
};

const handleTestConnection = async () => {
  if (!props.selectedNode || isConnectionGroup(props.selectedNode)) return;

  try {
    const result = await connectionService.testConnection(props.selectedNode);
    if (result.success) {
      ElMessage.success(`连接测试成功 (${result.responseTime}ms)`);
    } else {
      ElMessage.error(`连接测试失败: ${result.error}`);
    }
  } catch (error) {
    ElMessage.error("连接测试失败");
  }
};
</script>

<style scoped lang="scss">
.connection-detail {
  height: 100%;
  overflow: auto;
  background: #f5f7fa;
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.group-detail,
.connection-detail-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-header {
  background: #fff;
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-content {
    display: flex;
    align-items: center;

    .header-icon {
      font-size: 32px;
      margin-right: 16px;
      color: #409eff;

      &.connection-type-icon {
        &.connection-rdp {
          color: #67c23a;
        }
        &.connection-ssh {
          color: #e6a23c;
        }
        &.connection-vnc {
          color: #f56c6c;
        }
        &.connection-telnet {
          color: #909399;
        }
        &.connection-ftp,
        &.connection-sftp {
          color: #409eff;
        }
      }
    }

    .header-text {
      h2 {
        margin: 0 0 4px 0;
        font-size: 24px;
        color: #303133;
      }

      .header-subtitle {
        margin: 0;
        color: #909399;
        font-size: 14px;
      }
    }
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }
}

.detail-content {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

.info-card {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.group-connections {
  margin-top: 20px;

  h3 {
    margin: 0 0 16px 0;
    color: #303133;
  }
}

.connection-name {
  display: flex;
  align-items: center;

  .connection-type-icon {
    margin-right: 8px;
    font-size: 16px;
  }
}

.password-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .tag-item {
    margin: 0;
  }
}

:deep(.el-descriptions__label) {
  font-weight: 500;
}

:deep(.el-card__header) {
  font-weight: 500;
  color: #303133;
}
</style>
