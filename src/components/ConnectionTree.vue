<template>
  <div class="connection-tree">
    <!-- 工具栏 -->
    <div class="tree-toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索连接..."
        size="small"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <div class="toolbar-buttons">
        <el-button type="primary" size="small" @click="handleAddGroup">
          <el-icon><FolderAdd /></el-icon>
          新建分组
        </el-button>

        <el-button type="success" size="small" @click="handleAddConnection">
          <el-icon><Plus /></el-icon>
          新建连接
        </el-button>

        <el-button type="info" size="small" @click="handleImportConnections">
          <el-icon><Upload /></el-icon>
          导入配置
        </el-button>
      </div>
    </div>

    <!-- 树形菜单 -->
    <div class="tree-container">
      <el-tree
        ref="treeRef"
        :data="filteredTreeData"
        :props="treeProps"
        :expand-on-click-node="false"
        :default-expand-all="false"
        :filter-node-method="filterNode"
        node-key="id"
        @node-click="handleNodeClick"
        @node-contextmenu="handleContextMenu"
        :current-node-key="selectedNode?.id"
      >
        <template #default="{ node, data }">
          <div
            class="tree-node"
            :class="{
              'is-group': isConnectionGroup(data),
              'is-selected': selectedNode?.id === data.id,
            }"
            @dblclick="handleNodeDoubleClick(data)"
          >
            <div class="node-content">
              <!-- 层级连接线 -->
              <div class="level-lines" v-if="node.level > 1">
                <div
                  class="level-line"
                  v-for="i in node.level - 1"
                  :key="i"
                  :class="{ 'has-sibling': hasNextSibling(node, i) }"
                ></div>
                <div class="node-connector"></div>
              </div>

              <!-- 图标 -->
              <el-icon class="node-icon" :class="getNodeIconClass(data)">
                <component :is="getNodeIcon(data)" />
              </el-icon>

              <!-- 名称 -->
              <span class="node-label">{{ node.label }}</span>

              <!-- 连接状态指示器 -->
              <div
                v-if="isConnectionItem(data)"
                class="connection-status"
                :class="getConnectionStatusClass(data)"
              ></div>

              <!-- 连接计数 -->
              <span
                v-if="
                  isConnectionGroup(data) && getGroupConnectionCount(data) > 0
                "
                class="connection-count"
              >
                {{ getGroupConnectionCount(data) }}
              </span>
            </div>

            <!-- 操作按钮 -->
            <div class="node-actions" @click.stop>
              <el-button
                v-if="isConnectionItem(data)"
                type="primary"
                size="small"
                circle
                @click="handleConnect(data)"
                :loading="connectingItems.has(data.id)"
              >
                <el-icon><Connection /></el-icon>
              </el-button>

              <el-dropdown
                trigger="click"
                @command="(command) => handleAction(command, data)"
              >
                <el-button type="info" size="small" circle>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-if="isConnectionItem(data)"
                      command="test"
                      :icon="Connection"
                    >
                      测试连接
                    </el-dropdown-item>
                    <el-dropdown-item command="edit" :icon="Edit">
                      编辑
                    </el-dropdown-item>
                    <el-dropdown-item command="copy" :icon="CopyDocument">
                      复制
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="isConnectionGroup(data)"
                      command="addConnection"
                      :icon="Plus"
                    >
                      添加连接
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="isConnectionGroup(data)"
                      command="addGroup"
                      :icon="FolderAdd"
                    >
                      添加子分组
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" :icon="Delete" divided>
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </template>
      </el-tree>
    </div>

    <!-- 右键菜单 -->
    <el-menu
      v-show="contextMenuVisible"
      :style="contextMenuStyle"
      class="context-menu"
      @select="handleContextMenuSelect"
    >
      <el-menu-item
        index="connect"
        v-if="contextMenuData && isConnectionItem(contextMenuData)"
      >
        <el-icon><Connection /></el-icon>
        连接
      </el-menu-item>
      <el-menu-item
        index="test"
        v-if="contextMenuData && isConnectionItem(contextMenuData)"
      >
        <el-icon><Connection /></el-icon>
        测试连接
      </el-menu-item>
      <el-menu-item index="edit">
        <el-icon><Edit /></el-icon>
        编辑
      </el-menu-item>
      <el-menu-item index="copy">
        <el-icon><CopyDocument /></el-icon>
        复制
      </el-menu-item>
      <el-menu-item
        index="addConnection"
        v-if="contextMenuData && isConnectionGroup(contextMenuData)"
      >
        <el-icon><Plus /></el-icon>
        添加连接
      </el-menu-item>
      <el-menu-item
        index="addGroup"
        v-if="contextMenuData && isConnectionGroup(contextMenuData)"
      >
        <el-icon><FolderAdd /></el-icon>
        添加子分组
      </el-menu-item>
      <el-menu-item index="delete" divided>
        <el-icon><Delete /></el-icon>
        删除
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Search,
  FolderAdd,
  Plus,
  Upload,
  Connection,
  MoreFilled,
  Edit,
  CopyDocument,
  Delete,
  Folder,
  FolderOpened,
  Monitor,
  View,
  ChatLineSquare,
} from "@element-plus/icons-vue";
import {
  ConnectionGroup,
  ConnectionItem,
  TreeNode,
  isConnectionGroup,
  isConnectionItem,
  ConnectionType,
  CONNECTION_TYPE_ICONS,
} from "@/types/connection";
import { connectionService } from "@/services/connection";

// Props
interface Props {
  treeData: ConnectionGroup[];
  selectedNode?: TreeNode | null;
}

const props = withDefaults(defineProps<Props>(), {
  selectedNode: null,
});

// Emits
const emit = defineEmits<{
  nodeSelect: [node: TreeNode];
  addGroup: [parentGroup?: ConnectionGroup];
  addConnection: [parentGroup?: ConnectionGroup];
  editNode: [node: TreeNode];
  deleteNode: [node: TreeNode];
  connectToHost: [connection: ConnectionItem];
  testConnection: [connection: ConnectionItem];
  importConnections: [];
}>();

// 响应式数据
const searchKeyword = ref("");
const treeRef = ref();
const connectingItems = ref(new Set<string>());
const contextMenuVisible = ref(false);
const contextMenuData = ref<TreeNode | null>(null);
const contextMenuStyle = ref({});

// 树形组件配置
const treeProps = {
  children: "children",
  label: "name",
};

// 计算属性
const filteredTreeData = computed(() => {
  if (!searchKeyword.value) {
    return props.treeData;
  }
  return filterTreeData(props.treeData, searchKeyword.value);
});

// 方法
const handleSearch = () => {
  nextTick(() => {
    treeRef.value?.filter(searchKeyword.value);
  });
};

const filterNode = (value: string, data: TreeNode) => {
  if (!value) return true;
  return data.name.toLowerCase().includes(value.toLowerCase());
};

const filterTreeData = (
  data: ConnectionGroup[],
  keyword: string
): ConnectionGroup[] => {
  return data
    .map((group) => ({
      ...group,
      children: group.children.filter((child) => {
        if (isConnectionGroup(child)) {
          const filteredChildren = filterTreeData([child], keyword);
          return (
            filteredChildren.length > 0 ||
            child.name.toLowerCase().includes(keyword.toLowerCase())
          );
        } else {
          return (
            child.name.toLowerCase().includes(keyword.toLowerCase()) ||
            child.host.toLowerCase().includes(keyword.toLowerCase())
          );
        }
      }),
    }))
    .filter(
      (group) =>
        group.children.length > 0 ||
        group.name.toLowerCase().includes(keyword.toLowerCase())
    );
};

const handleNodeClick = (data: TreeNode) => {
  emit("nodeSelect", data);
};

const handleNodeDoubleClick = (data: TreeNode) => {
  // 如果双击的是连接项，直接进行连接
  if (isConnectionItem(data)) {
    handleConnect(data);
  }
};

const handleConnect = async (connection: ConnectionItem) => {
  connectingItems.value.add(connection.id);
  try {
    emit("connectToHost", connection);
  } finally {
    connectingItems.value.delete(connection.id);
  }
};

const handleAction = (command: string, data: TreeNode) => {
  switch (command) {
    case "connect":
      if (isConnectionItem(data)) {
        handleConnect(data);
      }
      break;
    case "test":
      if (isConnectionItem(data)) {
        emit("testConnection", data);
      }
      break;
    case "edit":
      emit("editNode", data);
      break;
    case "copy":
      // TODO: 实现复制功能
      ElMessage.success("复制成功");
      break;
    case "addConnection":
      emit("addConnection", isConnectionGroup(data) ? data : undefined);
      break;
    case "addGroup":
      emit("addGroup", isConnectionGroup(data) ? data : undefined);
      break;
    case "delete":
      handleDelete(data);
      break;
  }
};

const handleDelete = async (data: TreeNode) => {
  const type = isConnectionGroup(data) ? "分组" : "连接";
  const message = isConnectionGroup(data)
    ? `确定要删除分组"${data.name}"及其所有子项吗？`
    : `确定要删除连接"${data.name}"吗？`;

  try {
    await ElMessageBox.confirm(message, `删除${type}`, {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    emit("deleteNode", data);
    ElMessage.success(`${type}删除成功`);
  } catch {
    // 用户取消删除
  }
};

const handleAddGroup = () => {
  emit("addGroup");
};

const handleAddConnection = () => {
  emit("addConnection");
};

const handleImportConnections = () => {
  emit("importConnections");
};

// 判断节点在指定层级是否有下一个兄弟节点
const hasNextSibling = (node: any, level: number): boolean => {
  let currentNode = node;

  // 向上遍历到指定层级
  for (let i = node.level; i > level; i--) {
    currentNode = currentNode.parent;
  }

  if (!currentNode || !currentNode.parent) {
    return false;
  }

  const siblings = currentNode.parent.childNodes;
  const currentIndex = siblings.indexOf(currentNode);

  return currentIndex < siblings.length - 1;
};

const handleContextMenu = (event: MouseEvent, data: TreeNode) => {
  event.preventDefault();
  contextMenuData.value = data;
  contextMenuStyle.value = {
    position: "fixed",
    left: event.clientX + "px",
    top: event.clientY + "px",
    zIndex: 9999,
  };
  contextMenuVisible.value = true;
};

const handleContextMenuSelect = (index: string) => {
  if (contextMenuData.value) {
    handleAction(index, contextMenuData.value);
  }
  contextMenuVisible.value = false;
};

const hideContextMenu = () => {
  contextMenuVisible.value = false;
};

const getNodeIcon = (data: TreeNode) => {
  if (isConnectionGroup(data)) {
    return data.expanded ? FolderOpened : Folder;
  } else {
    const iconName = CONNECTION_TYPE_ICONS[data.type];
    switch (iconName) {
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
  }
};

const getNodeIconClass = (data: TreeNode) => {
  if (isConnectionGroup(data)) {
    return "group-icon";
  } else {
    return `connection-icon connection-${data.type}`;
  }
};

const getConnectionStatusClass = (connection: ConnectionItem) => {
  // TODO: 实现连接状态检测
  return "status-disconnected";
};

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

// 生命周期
onMounted(() => {
  document.addEventListener("click", hideContextMenu);
});

onUnmounted(() => {
  document.removeEventListener("click", hideContextMenu);
});
</script>

<style scoped lang="scss">
.connection-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e4e7ed;
}

.tree-toolbar {
  padding: 12px;
  border-bottom: 1px solid #e4e7ed;

  .toolbar-buttons {
    margin-top: 8px;
    display: flex;
    gap: 8px;
  }
}

.tree-container {
  flex: 1;
  overflow: auto;
  padding: 8px;
  user-select: none;
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 1px 0;
  user-select: none;

  .node-content {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    position: relative;
    padding: 2px 6px;
    border-radius: 4px;
    transition: background-color 0.2s ease;

    .level-lines {
      display: flex;
      align-items: center;
      margin-right: 2px;

      .level-line {
        width: 16px;
        height: 18px;
        position: relative;
        flex-shrink: 0;

        &.has-sibling::before {
          content: "";
          position: absolute;
          left: 8px;
          top: 0;
          bottom: 0;
          width: 1px;
          background: #dcdfe6;
        }
      }

      .node-connector {
        position: relative;
        width: 12px;
        height: 18px;
        flex-shrink: 0;

        &::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 50%;
          width: 1px;
          background: #dcdfe6;
        }

        &::after {
          content: "";
          position: absolute;
          left: 0;
          top: 50%;
          width: 12px;
          height: 1px;
          background: #dcdfe6;
        }
      }
    }

    .node-icon {
      margin-right: 6px;
      font-size: 16px;

      &.group-icon {
        color: #409eff;
      }

      &.connection-icon {
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

    .node-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .connection-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-left: 8px;

      &.status-connected {
        background-color: #67c23a;
      }
      &.status-connecting {
        background-color: #e6a23c;
      }
      &.status-disconnected {
        background-color: #909399;
      }
      &.status-error {
        background-color: #f56c6c;
      }
    }

    .connection-count {
      margin-left: 8px;
      padding: 2px 6px;
      background-color: #f0f2f5;
      border-radius: 10px;
      font-size: 12px;
      color: #606266;
    }
  }

  .node-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover .node-actions {
    opacity: 1;
  }

  // 分组节点样式
  &.is-group {
    .node-content {
      &:hover {
        background-color: #f5f7fa;
      }
    }

    .node-label {
      font-weight: 600;
      color: #303133;
      font-size: 14px;
    }

    .node-icon {
      color: #409eff;
      font-size: 16px;
    }
  }

  // 连接节点样式
  &:not(.is-group) {
    .node-content {
      &:hover {
        background-color: #f5f7fa;
      }
    }

    .node-label {
      color: #606266;
      font-size: 14px;
    }

    .node-icon {
      font-size: 14px;
    }
  }

  // 选中状态样式
  &.is-selected {
    .node-content {
      background-color: #e6f7ff;
      border-left: 3px solid #409eff;
    }

    .node-label {
      color: #409eff;
      font-weight: 600;
    }
  }
}

.context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 4px 0;
  min-width: 120px;
}

// Element Plus 树形组件样式覆盖
:deep(.el-tree) {
  background: transparent;
}

:deep(.el-tree-node__content) {
  height: auto;
  padding: 0;
  background: transparent !important;
  border: none !important;

  &:hover {
    background: transparent !important;
  }

  &.is-current {
    background: transparent !important;
  }
}

:deep(.el-tree-node__expand-icon) {
  color: #909399;
  font-size: 12px;
  margin-right: 2px;

  &:hover {
    color: #409eff;
  }

  &.is-leaf {
    color: transparent;
  }
}
</style>
