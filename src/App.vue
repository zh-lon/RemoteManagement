<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { ElMessage } from "element-plus";
import ConnectionTree from "./components/ConnectionTree.vue";
import ConnectionDetail from "./components/ConnectionDetail.vue";
import ConnectionForm from "./components/ConnectionForm.vue";
import GroupForm from "./components/GroupForm.vue";
import SettingsDialog from "./components/SettingsDialog.vue";
import ConflictDialog from "./components/ConflictDialog.vue";
import {
  ConnectionConfig,
  ConnectionGroup,
  ConnectionItem,
  TreeNode,
  ConflictInfo,
  isConnectionGroup,
} from "./types/connection";
import { storageService } from "./services/storage";
import { connectionService } from "./services/connection";
import { encryptionService } from "./services/encryption";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_SETTINGS } from "./utils/constants";

// 响应式数据
const treeData = ref<ConnectionGroup[]>([]);
const selectedNode = ref<TreeNode | null>(null);
const loading = ref(true);

// 表单相关
const connectionFormVisible = ref(false);
const groupFormVisible = ref(false);
const editingConnection = ref<ConnectionItem | null>(null);
const editingGroup = ref<ConnectionGroup | null>(null);
const editingParentGroup = ref<ConnectionGroup | null>(null);
const settingsVisible = ref(false);

// 导入相关
const importing = ref(false);
const importConflicts = ref<ConflictInfo[]>([]);
const showConflictDialog = ref(false);

// 计算属性
const groupTreeData = computed(() => {
  const convertToTreeData = (groups: ConnectionGroup[]): any[] => {
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      children: convertToTreeData(
        group.children.filter((child) =>
          isConnectionGroup(child)
        ) as ConnectionGroup[]
      ),
    }));
  };
  return convertToTreeData(treeData.value);
});

// 生命周期
onMounted(async () => {
  await initializeApp();

  // 初始化连接服务
  await connectionService.initializeClients();

  // 监听菜单事件
  if (window.ipcRenderer) {
    window.ipcRenderer.on("show-settings", () => {
      settingsVisible.value = true;
    });
  }
});

// 方法
const initializeApp = async () => {
  try {
    // 初始化加密服务
    await encryptionService.initialize();

    // 初始化存储服务
    await storageService.initialize();

    // 加载连接配置
    await loadConnections();

    loading.value = false;
  } catch (error) {
    console.error("应用初始化失败:", error);
    ElMessage.error("应用初始化失败");
    loading.value = false;
  }
};

const loadConnections = async () => {
  try {
    const result = await storageService.loadConnections();

    if (result.success && result.data) {
      treeData.value = result.data.groups;
    } else {
      // 创建默认分组
      treeData.value = [
        {
          id: uuidv4(),
          name: "我的连接",
          children: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    }
  } catch (error) {
    console.error("加载连接配置失败:", error);
    ElMessage.error("加载连接配置失败");
  }
};

const saveConnections = async () => {
  try {
    const config: ConnectionConfig = {
      version: "1.0.0",
      groups: treeData.value,
      settings: DEFAULT_SETTINGS,
    };

    const result = await storageService.saveConnections(config);
    if (result.success) {
      ElMessage.success("保存成功");
    } else {
      ElMessage.error("保存失败: " + result.error);
    }
  } catch (error) {
    console.error("保存连接配置失败:", error);
    ElMessage.error("保存失败");
  }
};

const handleNodeSelect = (node: TreeNode) => {
  selectedNode.value = node;
};

const handleAddGroup = (parentGroup?: ConnectionGroup) => {
  editingGroup.value = null;
  editingParentGroup.value = parentGroup || null;
  groupFormVisible.value = true;
};

const handleAddConnection = (parentGroup?: ConnectionGroup) => {
  editingConnection.value = null;
  editingParentGroup.value = parentGroup || null;
  connectionFormVisible.value = true;
};

const handleEditNode = (node: TreeNode) => {
  if (isConnectionGroup(node)) {
    editingGroup.value = node;
    editingParentGroup.value = null;
    groupFormVisible.value = true;
  } else {
    editingConnection.value = node;
    editingParentGroup.value = null;
    connectionFormVisible.value = true;
  }
};

const handleDeleteNode = (node: TreeNode) => {
  const deleteFromGroup = (group: ConnectionGroup): boolean => {
    const index = group.children.findIndex((child) => child.id === node.id);
    if (index !== -1) {
      group.children.splice(index, 1);
      return true;
    }

    for (const child of group.children) {
      if (isConnectionGroup(child) && deleteFromGroup(child)) {
        return true;
      }
    }

    return false;
  };

  // 从根级别删除
  const rootIndex = treeData.value.findIndex((group) => group.id === node.id);
  if (rootIndex !== -1) {
    treeData.value.splice(rootIndex, 1);
  } else {
    // 从子级别删除
    for (const group of treeData.value) {
      if (deleteFromGroup(group)) {
        break;
      }
    }
  }

  if (selectedNode.value?.id === node.id) {
    selectedNode.value = null;
  }

  saveConnections();
};

const handleConnectToHost = async (connection: ConnectionItem) => {
  try {
    const result = await connectionService.connect(connection);
    if (result.success) {
      ElMessage.success(result.message || "连接已启动");

      // 更新连接统计
      connection.connectionCount = (connection.connectionCount || 0) + 1;
      connection.lastConnected = new Date();
      saveConnections();
    } else {
      ElMessage.error(result.error || "连接失败");
    }
  } catch (error) {
    console.error("连接失败:", error);
    ElMessage.error("连接失败");
  }
};

const handleTestConnection = async (connection: ConnectionItem) => {
  try {
    const result = await connectionService.testConnection(connection);
    if (result.success) {
      ElMessage.success(`连接测试成功 (${result.responseTime}ms)`);
    } else {
      ElMessage.error(`连接测试失败: ${result.error}`);
    }
  } catch (error) {
    console.error("连接测试失败:", error);
    ElMessage.error("连接测试失败");
  }
};

// 表单提交处理
const handleConnectionSubmit = (connection: ConnectionItem) => {
  if (editingConnection.value) {
    // 编辑模式：更新现有连接
    updateConnectionInTree(connection);
  } else {
    // 新建模式：添加新连接
    addConnectionToTree(connection);
  }

  saveConnections();
  selectedNode.value = connection;
  connectionFormVisible.value = false;
};

const handleGroupSubmit = (group: ConnectionGroup, parentId?: string) => {
  if (editingGroup.value) {
    // 编辑模式：更新现有分组
    updateGroupInTree(group);
  } else {
    // 新建模式：添加新分组
    addGroupToTree(group, parentId);
  }

  saveConnections();
  selectedNode.value = group;
  groupFormVisible.value = false;
};

// 辅助方法
const addConnectionToTree = (connection: ConnectionItem) => {
  connection.id = uuidv4();

  if (editingParentGroup.value) {
    editingParentGroup.value.children.push(connection);
  } else if (treeData.value.length > 0) {
    treeData.value[0].children.push(connection);
  } else {
    // 创建默认分组
    const defaultGroup: ConnectionGroup = {
      id: uuidv4(),
      name: "我的连接",
      children: [connection],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    treeData.value.push(defaultGroup);
  }
};

const addGroupToTree = (group: ConnectionGroup, parentId?: string) => {
  group.id = uuidv4();

  if (parentId) {
    const parentGroup = findGroupById(parentId);
    if (parentGroup) {
      parentGroup.children.push(group);
    } else {
      treeData.value.push(group);
    }
  } else {
    treeData.value.push(group);
  }
};

const updateConnectionInTree = (connection: ConnectionItem) => {
  const updateInGroup = (group: ConnectionGroup): boolean => {
    const index = group.children.findIndex(
      (child) => child.id === connection.id
    );
    if (index !== -1) {
      group.children[index] = connection;
      return true;
    }

    for (const child of group.children) {
      if (isConnectionGroup(child) && updateInGroup(child)) {
        return true;
      }
    }

    return false;
  };

  for (const group of treeData.value) {
    if (updateInGroup(group)) {
      break;
    }
  }
};

const updateGroupInTree = (group: ConnectionGroup) => {
  const updateInGroup = (parentGroup: ConnectionGroup): boolean => {
    const index = parentGroup.children.findIndex(
      (child) => child.id === group.id
    );
    if (index !== -1) {
      // 保持原有的children
      group.children = (
        parentGroup.children[index] as ConnectionGroup
      ).children;
      parentGroup.children[index] = group;
      return true;
    }

    for (const child of parentGroup.children) {
      if (isConnectionGroup(child) && updateInGroup(child)) {
        return true;
      }
    }

    return false;
  };

  // 检查根级别
  const rootIndex = treeData.value.findIndex((g) => g.id === group.id);
  if (rootIndex !== -1) {
    group.children = treeData.value[rootIndex].children;
    treeData.value[rootIndex] = group;
  } else {
    // 检查子级别
    for (const rootGroup of treeData.value) {
      if (updateInGroup(rootGroup)) {
        break;
      }
    }
  }
};

const findGroupById = (id: string): ConnectionGroup | null => {
  const searchInGroup = (group: ConnectionGroup): ConnectionGroup | null => {
    if (group.id === id) {
      return group;
    }

    for (const child of group.children) {
      if (isConnectionGroup(child)) {
        const found = searchInGroup(child);
        if (found) {
          return found;
        }
      }
    }

    return null;
  };

  for (const group of treeData.value) {
    const found = searchInGroup(group);
    if (found) {
      return found;
    }
  }

  return null;
};

// 导入相关方法
const handleImportConnections = async () => {
  try {
    importing.value = true;

    // 选择导入文件
    const fileResult = await window.electronAPI?.selectFile([
      { name: "JSON Files", extensions: ["json"] },
    ]);

    if (
      !fileResult ||
      fileResult.canceled ||
      !fileResult.filePaths ||
      fileResult.filePaths.length === 0
    ) {
      return; // 用户取消了选择
    }

    const filePath = fileResult.filePaths[0];
    console.log("📥 选择导入文件:", filePath);

    // 执行导入
    const result = await storageService.importConnections(filePath);

    if (result.success && result.data) {
      const { conflicts, imported } = result.data;

      if (conflicts.length > 0) {
        // 有冲突，显示冲突处理对话框
        importConflicts.value = conflicts;
        showConflictDialog.value = true;
        ElMessage.warning(`导入完成，发现 ${conflicts.length} 个冲突需要处理`);
      } else {
        // 无冲突，直接完成
        ElMessage.success(`导入成功！共导入 ${imported} 个项目`);
      }

      // 重新加载连接数据以获取最新的解密状态
      await loadConnections();
    } else {
      ElMessage.error("导入失败: " + (result.error || "未知错误"));
    }
  } catch (error) {
    console.error("导入连接配置失败:", error);
    ElMessage.error("导入失败");
  } finally {
    importing.value = false;
  }
};

const handleConflictResolution = async (conflicts: ConflictInfo[]) => {
  try {
    // 这里可以根据用户选择的冲突解决方案重新处理
    // 目前先简单关闭对话框
    showConflictDialog.value = false;

    const skippedCount = conflicts.filter((c) => c.action === "skip").length;
    const replacedCount = conflicts.filter(
      (c) => c.action === "replace"
    ).length;

    ElMessage.success(
      `冲突处理完成！跳过 ${skippedCount} 个，替换 ${replacedCount} 个`
    );
  } catch (error) {
    console.error("处理冲突失败:", error);
    ElMessage.error("处理冲突失败");
  }
};
</script>

<template>
  <div class="app">
    <el-container v-loading="loading" class="app-container">
      <!-- 左侧菜单树 -->
      <el-aside width="350px" class="sidebar">
        <ConnectionTree
          :tree-data="treeData"
          :selected-node="selectedNode"
          @node-select="handleNodeSelect"
          @add-group="handleAddGroup"
          @add-connection="handleAddConnection"
          @edit-node="handleEditNode"
          @delete-node="handleDeleteNode"
          @connect-to-host="handleConnectToHost"
          @test-connection="handleTestConnection"
          @import-connections="handleImportConnections"
        />
      </el-aside>

      <!-- 右侧详情面板 -->
      <el-main class="main-content">
        <ConnectionDetail
          :selected-node="selectedNode"
          @add-connection="handleAddConnection"
          @edit-node="handleEditNode"
          @connect-to-host="handleConnectToHost"
          @test-connection="handleTestConnection"
        />
      </el-main>
    </el-container>

    <!-- 连接编辑表单 -->
    <ConnectionForm
      v-model:visible="connectionFormVisible"
      :connection="editingConnection"
      @submit="handleConnectionSubmit"
    />

    <!-- 分组编辑表单 -->
    <GroupForm
      v-model:visible="groupFormVisible"
      :group="editingGroup"
      :group-tree-data="groupTreeData"
      :parent-group="editingParentGroup"
      @submit="handleGroupSubmit"
    />

    <!-- 设置对话框 -->
    <SettingsDialog v-model:visible="settingsVisible" />

    <!-- 冲突处理对话框 -->
    <ConflictDialog
      v-model:visible="showConflictDialog"
      :conflicts="importConflicts"
      @confirm="handleConflictResolution"
      @cancel="showConflictDialog = false"
    />
  </div>
</template>

<style scoped lang="scss">
.app {
  height: 100vh;
  overflow: hidden;
}

.app-container {
  height: 100%;
}

.sidebar {
  border-right: 1px solid #e4e7ed;
  background: #fff;
}

.main-content {
  padding: 0;
  background: #f5f7fa;
}
</style>
