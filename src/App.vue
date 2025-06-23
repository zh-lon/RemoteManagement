<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { ElMessage } from "element-plus";
import ConnectionTree from "./components/ConnectionTree.vue";
import ConnectionDetail from "./components/ConnectionDetail.vue";
import ConnectionForm from "./components/ConnectionForm.vue";
import GroupForm from "./components/GroupForm.vue";
import SettingsDialog from "./components/SettingsDialog.vue";
import {
  ConnectionConfig,
  ConnectionGroup,
  ConnectionItem,
  TreeNode,
  isConnectionGroup,
  isConnectionItem,
  ConnectionType,
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

  // 测试加密解密功能
  testEncryptionDecryption();

  // 监听菜单事件
  if (window.ipcRenderer) {
    window.ipcRenderer.on("show-settings", () => {
      settingsVisible.value = true;
    });

    window.ipcRenderer.on("show-client-status", () => {
      settingsVisible.value = true;
      // 可以在这里设置默认标签页为客户端状态
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
    console.log("开始加载连接配置...");

    // 检查localStorage中的原始数据
    const rawData = localStorage.getItem("connections.json");
    if (rawData) {
      console.log("localStorage原始数据长度:", rawData.length);
      try {
        const parsed = JSON.parse(rawData);
        console.log("localStorage解析后的数据:", parsed);

        // 检查原始密码数据
        const checkRawPasswords = (groups: any[]) => {
          groups.forEach((group) => {
            if (group.children) {
              group.children.forEach((child: any) => {
                if (child.type && child.password !== undefined) {
                  console.log(`原始数据中连接 ${child.name} 的密码:`, {
                    length: child.password ? child.password.length : 0,
                    value: child.password
                      ? child.password.length > 20
                        ? "(加密数据)"
                        : child.password
                      : "(空)",
                  });
                }
                if (child.children) {
                  checkRawPasswords([child]);
                }
              });
            }
          });
        };

        if (parsed.groups) {
          checkRawPasswords(parsed.groups);
        }
      } catch (e) {
        console.error("解析localStorage数据失败:", e);
      }
    } else {
      console.log("localStorage中没有连接数据");
    }

    const result = await storageService.loadConnections();
    console.log("存储服务加载结果:", result);

    if (result.success && result.data) {
      console.log("加载的连接组数据:", result.data.groups);

      // 检查密码字段
      const checkPasswords = (groups: any[]) => {
        groups.forEach((group) => {
          if (group.children) {
            group.children.forEach((child: any) => {
              if (child.type && child.password !== undefined) {
                console.log(
                  `连接 ${child.name} 的密码:`,
                  child.password ? "***" : "(空)"
                );
              }
              if (child.children) {
                checkPasswords([child]);
              }
            });
          }
        });
      };

      checkPasswords(result.data.groups);
      treeData.value = result.data.groups;
    } else {
      console.log("未找到连接配置，创建默认分组");
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

// 测试加密解密功能
const testEncryptionDecryption = () => {
  try {
    console.log("=== 开始测试加密解密功能 ===");

    const testPassword = "test123";
    console.log("原始密码:", testPassword);

    // 测试加密
    const encrypted = encryptionService.encrypt(testPassword);
    console.log("加密后:", encrypted, "长度:", encrypted.length);

    // 测试解密
    const decrypted = encryptionService.decrypt(encrypted);
    console.log("解密后:", decrypted, "长度:", decrypted.length);

    // 验证结果
    const isMatch = testPassword === decrypted;
    console.log("加密解密是否一致:", isMatch);

    if (!isMatch) {
      console.error("❌ 加密解密测试失败！");
    } else {
      console.log("✅ 加密解密测试成功！");
    }

    console.log("=== 加密解密功能测试完成 ===");
  } catch (error) {
    console.error("加密解密测试异常:", error);
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
