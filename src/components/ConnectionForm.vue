<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="isEdit ? '编辑连接' : '新建连接'"
    width="800px"
    :before-close="handleClose"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
      label-position="left"
    >
      <!-- 基本信息 -->
      <el-card header="基本信息" class="form-card">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="连接名称" prop="name">
              <el-input v-model="formData.name" placeholder="请输入连接名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="连接类型" prop="type">
              <el-select
                v-model="formData.type"
                placeholder="请选择连接类型"
                @change="handleTypeChange"
              >
                <el-option
                  v-for="option in CONNECTION_TYPE_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                >
                  <div class="type-option">
                    <el-icon
                      ><component :is="getTypeIcon(option.value)"
                    /></el-icon>
                    <span>{{ option.label }}</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="主机地址" prop="host">
              <el-input
                v-model="formData.host"
                placeholder="请输入主机地址或IP"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="端口" prop="port">
              <el-input-number
                v-model="formData.port"
                :min="1"
                :max="65535"
                placeholder="端口号"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input
                v-model="formData.username"
                placeholder="请输入用户名"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="formData.password"
                type="password"
                placeholder="请输入密码"
                show-password
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入连接描述（可选）"
          />
        </el-form-item>

        <el-form-item label="标签">
          <el-select
            v-model="formData.tags"
            multiple
            filterable
            allow-create
            placeholder="请选择或输入标签"
            style="width: 100%"
          >
            <el-option
              v-for="tag in COMMON_TAGS"
              :key="tag"
              :label="tag"
              :value="tag"
            />
          </el-select>
        </el-form-item>
      </el-card>

      <!-- RDP 特定配置 -->
      <el-card
        v-if="formData.type === ConnectionType.RDP"
        header="RDP 配置"
        class="form-card"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="域名">
              <el-input
                v-model="formData.rdpConfig.domain"
                placeholder="域名（可选）"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分辨率">
              <el-select
                v-model="formData.rdpConfig.resolution"
                placeholder="选择分辨率"
              >
                <el-option
                  v-for="option in RDP_RESOLUTION_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="颜色深度">
              <el-select
                v-model="formData.rdpConfig.colorDepth"
                placeholder="选择颜色深度"
              >
                <el-option
                  v-for="option in RDP_COLOR_DEPTH_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="全屏模式">
              <el-switch v-model="formData.rdpConfig.fullScreen" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="剪贴板">
              <el-switch v-model="formData.rdpConfig.enableClipboard" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="驱动器">
              <el-switch v-model="formData.rdpConfig.enableDrives" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="打印机">
              <el-switch v-model="formData.rdpConfig.enablePrinters" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="声音">
              <el-switch v-model="formData.rdpConfig.enableSound" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- SSH 特定配置 -->
      <el-card
        v-if="formData.type === ConnectionType.SSH"
        header="SSH 配置"
        class="form-card"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="终端类型">
              <el-select
                v-model="formData.sshConfig.terminalType"
                placeholder="选择终端类型"
              >
                <el-option
                  v-for="option in SSH_TERMINAL_TYPE_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="编码">
              <el-select
                v-model="formData.sshConfig.encoding"
                placeholder="选择编码"
              >
                <el-option
                  v-for="option in ENCODING_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="私钥认证">
              <el-switch v-model="formData.sshConfig.usePrivateKey" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="压缩">
              <el-switch v-model="formData.sshConfig.compression" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item v-if="formData.sshConfig.usePrivateKey" label="私钥路径">
          <el-input
            v-model="formData.sshConfig.privateKeyPath"
            placeholder="私钥文件路径"
          >
            <template #append>
              <el-button @click="selectPrivateKey">浏览</el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="保持连接">
              <el-switch v-model="formData.sshConfig.keepAlive" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- VNC 特定配置 -->
      <el-card
        v-if="formData.type === ConnectionType.VNC"
        header="VNC 配置"
        class="form-card"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="只读模式">
              <el-switch v-model="formData.vncConfig.viewOnly" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="共享连接">
              <el-switch v-model="formData.vncConfig.sharedConnection" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="颜色深度">
              <el-select
                v-model="formData.vncConfig.colorDepth"
                placeholder="颜色深度"
              >
                <el-option
                  v-for="option in RDP_COLOR_DEPTH_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="压缩级别">
              <el-select
                v-model="formData.vncConfig.compression"
                placeholder="压缩级别"
              >
                <el-option
                  v-for="option in VNC_COMPRESSION_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="图像质量">
              <el-select
                v-model="formData.vncConfig.quality"
                placeholder="图像质量"
              >
                <el-option
                  v-for="option in VNC_QUALITY_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- FTP/SFTP 特定配置 -->
      <el-card
        v-if="
          formData.type === ConnectionType.FTP ||
          formData.type === ConnectionType.SFTP
        "
        header="FTP 配置"
        class="form-card"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="被动模式">
              <el-switch v-model="formData.ftpConfig.passiveMode" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="编码">
              <el-select
                v-model="formData.ftpConfig.encoding"
                placeholder="选择编码"
              >
                <el-option
                  v-for="option in ENCODING_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="初始路径">
          <el-input
            v-model="formData.ftpConfig.initialPath"
            placeholder="初始目录路径"
          />
        </el-form-item>
      </el-card>

      <!-- Telnet 特定配置 -->
      <el-card
        v-if="formData.type === ConnectionType.TELNET"
        header="Telnet 配置"
        class="form-card"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="终端类型">
              <el-select
                v-model="formData.telnetConfig.terminalType"
                placeholder="选择终端类型"
              >
                <el-option
                  v-for="option in SSH_TERMINAL_TYPE_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="编码">
              <el-select
                v-model="formData.telnetConfig.encoding"
                placeholder="选择编码"
              >
                <el-option
                  v-for="option in ENCODING_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? "保存" : "创建" }}
        </el-button>
        <el-button
          v-if="!isEdit"
          @click="handleTestConnection"
          :loading="testing"
        >
          测试连接
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Monitor,
  Connection,
  View,
  ChatLineSquare,
  Folder,
  FolderOpened,
} from "@element-plus/icons-vue";
import {
  ConnectionItem,
  ConnectionType,
  ConnectionFormData,
  DEFAULT_PORTS,
  RDPConnection,
  SSHConnection,
  VNCConnection,
  FTPConnection,
  TelnetConnection,
} from "@/types/connection";
import {
  CONNECTION_TYPE_OPTIONS,
  RDP_RESOLUTION_OPTIONS,
  RDP_COLOR_DEPTH_OPTIONS,
  SSH_TERMINAL_TYPE_OPTIONS,
  ENCODING_OPTIONS,
  VNC_COMPRESSION_OPTIONS,
  VNC_QUALITY_OPTIONS,
  COMMON_TAGS,
} from "@/utils/constants";
import { connectionService } from "@/services/connection";

// Props
interface Props {
  visible: boolean;
  connection?: ConnectionItem | null;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  connection: null,
});

// Emits
const emit = defineEmits<{
  "update:visible": [value: boolean];
  submit: [connection: ConnectionItem];
}>();

// 响应式数据
const formRef = ref();
const submitting = ref(false);
const testing = ref(false);

// 计算属性
const isEdit = computed(() => !!props.connection);

// 表单数据
const formData = reactive<ConnectionFormData>({
  name: "",
  type: ConnectionType.SSH,
  host: "",
  port: 22,
  username: "",
  password: "",
  description: "",
  tags: [],
  rdpConfig: {
    domain: "",
    resolution: "1920x1080",
    colorDepth: 32,
    fullScreen: false,
    enableClipboard: true,
    enableDrives: false,
    enablePrinters: false,
    enableSound: true,
  },
  sshConfig: {
    usePrivateKey: false,
    privateKeyPath: "",
    terminalType: "xterm-256color",
    encoding: "utf-8",
    keepAlive: true,
    compression: false,
  },
  vncConfig: {
    viewOnly: false,
    sharedConnection: false,
    colorDepth: 32,
    compression: 6,
    quality: 6,
  },
  ftpConfig: {
    passiveMode: true,
    encoding: "utf-8",
    initialPath: "/",
  },
  telnetConfig: {
    terminalType: "vt100",
    encoding: "utf-8",
  },
});

// 表单验证规则
const rules = {
  name: [{ required: true, message: "请输入连接名称", trigger: "blur" }],
  type: [{ required: true, message: "请选择连接类型", trigger: "change" }],
  host: [{ required: true, message: "请输入主机地址", trigger: "blur" }],
  port: [
    { required: true, message: "请输入端口号", trigger: "blur" },
    {
      type: "number",
      min: 1,
      max: 65535,
      message: "端口号必须在1-65535之间",
      trigger: "blur",
    },
  ],
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  password: [{ required: true, message: "请输入密码", trigger: "blur" }],
};

// 监听器
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      initForm();
    }
  }
);

watch(
  () => props.connection,
  (newVal) => {
    if (newVal && props.visible) {
      initForm();
    }
  }
);

// 方法
const initForm = () => {
  if (props.connection) {
    console.log("ConnectionForm: 初始化表单，连接数据:", props.connection);
    console.log(
      "ConnectionForm: 连接密码:",
      props.connection.password ? "***" : "(空)"
    );

    // 编辑模式，填充现有数据
    Object.assign(formData, {
      name: props.connection.name,
      type: props.connection.type,
      host: props.connection.host,
      port: props.connection.port,
      username: props.connection.username,
      password: props.connection.password,
      description: props.connection.description || "",
      tags: props.connection.tags || [],
    });

    console.log("ConnectionForm: 表单数据填充后:", {
      name: formData.name,
      username: formData.username,
      password: formData.password ? "***" : "(空)",
    });

    // 填充类型特定配置
    if (props.connection.type === ConnectionType.RDP) {
      const rdp = props.connection as RDPConnection;
      Object.assign(formData.rdpConfig, {
        domain: rdp.domain || "",
        resolution: rdp.resolution || "1920x1080",
        colorDepth: rdp.colorDepth || 32,
        fullScreen: rdp.fullScreen || false,
        enableClipboard: rdp.enableClipboard !== false,
        enableDrives: rdp.enableDrives || false,
        enablePrinters: rdp.enablePrinters || false,
        enableSound: rdp.enableSound !== false,
      });
    }
    // 其他类型的配置填充...
  } else {
    // 新建模式，重置表单
    resetForm();
  }
};

const resetForm = () => {
  Object.assign(formData, {
    name: "",
    type: ConnectionType.SSH,
    host: "",
    port: DEFAULT_PORTS[ConnectionType.SSH],
    username: "",
    password: "",
    description: "",
    tags: [],
  });
  formRef.value?.clearValidate();
};

const handleTypeChange = (type: ConnectionType) => {
  formData.port = DEFAULT_PORTS[type];
};

const getTypeIcon = (type: ConnectionType) => {
  switch (type) {
    case ConnectionType.RDP:
      return Monitor;
    case ConnectionType.SSH:
      return Connection;
    case ConnectionType.VNC:
      return View;
    case ConnectionType.TELNET:
      return ChatLineSquare;
    case ConnectionType.FTP:
    case ConnectionType.SFTP:
      return Folder;
    default:
      return Connection;
  }
};

const selectPrivateKey = async () => {
  try {
    const filePath = await window.electronAPI?.selectFile([
      { name: "私钥文件", extensions: ["pem", "key", "ppk"] },
      { name: "所有文件", extensions: ["*"] },
    ]);
    if (filePath) {
      formData.sshConfig.privateKeyPath = filePath;
    }
  } catch (error) {
    ElMessage.error("选择文件失败");
  }
};

const handleTestConnection = async () => {
  try {
    await formRef.value.validate();
    testing.value = true;

    const testConnection = createConnectionFromForm();
    const result = await connectionService.testConnection(testConnection);

    if (result.success) {
      ElMessage.success(`连接测试成功 (${result.responseTime}ms)`);
    } else {
      ElMessage.error(`连接测试失败: ${result.error}`);
    }
  } catch (error) {
    // 表单验证失败或其他错误
  } finally {
    testing.value = false;
  }
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    submitting.value = true;

    const connection = createConnectionFromForm();
    emit("submit", connection);

    ElMessage.success(isEdit.value ? "连接更新成功" : "连接创建成功");
    handleClose();
  } catch (error) {
    // 表单验证失败
  } finally {
    submitting.value = false;
  }
};

const createConnectionFromForm = (): ConnectionItem => {
  const baseConnection = {
    id: props.connection?.id || "",
    name: formData.name,
    type: formData.type,
    host: formData.host,
    port: formData.port,
    username: formData.username,
    password: formData.password,
    description: formData.description,
    tags: formData.tags,
    createdAt: props.connection?.createdAt || new Date(),
    updatedAt: new Date(),
    connectionCount: props.connection?.connectionCount || 0,
    lastConnected: props.connection?.lastConnected,
  };

  // 根据类型添加特定配置
  switch (formData.type) {
    case ConnectionType.RDP:
      return {
        ...baseConnection,
        ...formData.rdpConfig,
      } as RDPConnection;

    case ConnectionType.SSH:
      return {
        ...baseConnection,
        ...formData.sshConfig,
      } as SSHConnection;

    case ConnectionType.VNC:
      return {
        ...baseConnection,
        ...formData.vncConfig,
      } as VNCConnection;

    case ConnectionType.FTP:
    case ConnectionType.SFTP:
      return {
        ...baseConnection,
        ...formData.ftpConfig,
      } as FTPConnection;

    case ConnectionType.TELNET:
      return {
        ...baseConnection,
        ...formData.telnetConfig,
      } as TelnetConnection;

    default:
      return baseConnection as ConnectionItem;
  }
};

const handleClose = () => {
  emit("update:visible", false);
};
</script>

<style scoped lang="scss">
.form-card {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.type-option {
  display: flex;
  align-items: center;
  gap: 8px;
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

:deep(.el-form-item__label) {
  font-weight: 500;
}
</style>
