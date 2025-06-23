<template>
  <el-card class="client-status-card" header="客户端状态">
    <div class="client-status">
      <div
        v-for="(typeClients, type) in clientStatus"
        :key="type"
        class="client-type"
      >
        <h4 class="type-title">
          <el-icon class="type-icon">
            <component :is="getTypeIcon(type)" />
          </el-icon>
          {{ getTypeName(type) }}
        </h4>

        <div class="client-list">
          <div
            v-for="client in typeClients"
            :key="client.executable"
            class="client-item"
            :class="{ available: client.available }"
          >
            <div class="client-info">
              <div class="client-name">{{ client.name }}</div>
              <div class="client-description">{{ client.description }}</div>
            </div>

            <div class="client-status-indicator">
              <el-tag
                :type="client.available ? 'success' : 'info'"
                size="small"
              >
                {{ client.available ? "已安装" : "未安装" }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="status-actions">
      <el-button @click="refreshStatus" :loading="checking">
        <el-icon><Refresh /></el-icon>
        刷新状态
      </el-button>

      <el-button type="primary" @click="showInstallGuide">
        <el-icon><QuestionFilled /></el-icon>
        安装指南
      </el-button>
    </div>

    <!-- 安装指南对话框 -->
    <el-dialog
      v-model="installGuideVisible"
      title="客户端安装指南"
      width="800px"
    >
      <div class="install-guide">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="SSH客户端" name="ssh">
            <div class="guide-content">
              <h3>推荐的SSH客户端</h3>
              <div class="client-guide">
                <div class="guide-item">
                  <h4>Xshell (推荐)</h4>
                  <p>功能强大的SSH客户端，支持多标签、会话管理等高级功能。</p>
                  <p>
                    <strong>下载地址：</strong>
                    <a
                      href="https://www.netsarang.com/zh/xshell/"
                      target="_blank"
                      >https://www.netsarang.com/zh/xshell/</a
                    >
                  </p>
                </div>

                <div class="guide-item">
                  <h4>SecureCRT</h4>
                  <p>专业的SSH/Telnet客户端，适合企业用户。</p>
                  <p>
                    <strong>下载地址：</strong>
                    <a
                      href="https://www.vandyke.com/products/securecrt/"
                      target="_blank"
                      >https://www.vandyke.com/products/securecrt/</a
                    >
                  </p>
                </div>

                <div class="guide-item">
                  <h4>PuTTY (免费)</h4>
                  <p>轻量级的SSH客户端，完全免费。</p>
                  <p>
                    <strong>下载地址：</strong>
                    <a href="https://www.putty.org/" target="_blank"
                      >https://www.putty.org/</a
                    >
                  </p>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="FTP客户端" name="ftp">
            <div class="guide-content">
              <h3>推荐的FTP/SFTP客户端</h3>
              <div class="client-guide">
                <div class="guide-item">
                  <h4>Xftp (推荐)</h4>
                  <p>与Xshell配套的FTP客户端，界面友好，功能完善。</p>
                  <p>
                    <strong>下载地址：</strong>
                    <a href="https://www.netsarang.com/zh/xftp/" target="_blank"
                      >https://www.netsarang.com/zh/xftp/</a
                    >
                  </p>
                </div>

                <div class="guide-item">
                  <h4>WinSCP (免费)</h4>
                  <p>Windows平台优秀的SFTP/FTP客户端，完全免费。</p>
                  <p>
                    <strong>下载地址：</strong>
                    <a href="https://winscp.net/" target="_blank"
                      >https://winscp.net/</a
                    >
                  </p>
                </div>

                <div class="guide-item">
                  <h4>FileZilla (免费)</h4>
                  <p>跨平台的FTP客户端，开源免费。</p>
                  <p>
                    <strong>下载地址：</strong>
                    <a href="https://filezilla-project.org/" target="_blank"
                      >https://filezilla-project.org/</a
                    >
                  </p>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="VNC客户端" name="vnc">
            <div class="guide-content">
              <h3>推荐的VNC/远程控制客户端</h3>
              <div class="client-guide">
                <div class="guide-item">
                  <h4>Radmin Viewer (推荐)</h4>
                  <p>专业的远程控制软件，速度快，画质清晰。</p>
                  <p>
                    <strong>下载地址：</strong>
                    <a href="https://www.radmin.com/" target="_blank"
                      >https://www.radmin.com/</a
                    >
                  </p>
                </div>

                <div class="guide-item">
                  <h4>RealVNC</h4>
                  <p>经典的VNC客户端，跨平台支持。</p>
                  <p>
                    <strong>下载地址：</strong>
                    <a href="https://www.realvnc.com/" target="_blank"
                      >https://www.realvnc.com/</a
                    >
                  </p>
                </div>

                <div class="guide-item">
                  <h4>TightVNC (免费)</h4>
                  <p>轻量级的VNC客户端，完全免费。</p>
                  <p>
                    <strong>下载地址：</strong>
                    <a href="https://www.tightvnc.com/" target="_blank"
                      >https://www.tightvnc.com/</a
                    >
                  </p>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import {
  Refresh,
  QuestionFilled,
  Monitor,
  Connection,
  View,
  ChatLineSquare,
  Folder,
} from "@element-plus/icons-vue";
import { ConnectionType } from "@/types/connection";
import { SUPPORTED_CLIENTS } from "@/utils/constants";
import { connectionService } from "@/services/connection";

// 响应式数据
const checking = ref(false);
const installGuideVisible = ref(false);
const activeTab = ref("ssh");
const clientStatus = ref<
  Record<
    string,
    Array<{
      name: string;
      executable: string;
      description: string;
      available: boolean;
    }>
  >
>({});

// 生命周期
onMounted(() => {
  refreshStatus();
});

// 方法
const refreshStatus = async () => {
  checking.value = true;
  try {
    const availableClients = connectionService.getAvailableClients();

    // 构建客户端状态
    const status: typeof clientStatus.value = {};

    // 处理每种连接类型
    Object.entries(SUPPORTED_CLIENTS).forEach(([type, clients]) => {
      const typeKey = type.toLowerCase();
      status[typeKey] = clients.map((client) => ({
        ...client,
        available:
          availableClients[type as ConnectionType]?.includes(
            client.executable
          ) || false,
      }));
    });

    clientStatus.value = status;
    ElMessage.success("客户端状态已更新");
  } catch (error) {
    console.error("检查客户端状态失败:", error);
    ElMessage.error("检查客户端状态失败");
  } finally {
    checking.value = false;
  }
};

const getTypeName = (type: string) => {
  const names: Record<string, string> = {
    rdp: "RDP (远程桌面)",
    ssh: "SSH (安全外壳)",
    vnc: "VNC (远程控制)",
    ftp: "FTP/SFTP (文件传输)",
    telnet: "Telnet (远程终端)",
  };
  return names[type] || type.toUpperCase();
};

const getTypeIcon = (type: string) => {
  const icons: Record<string, any> = {
    rdp: Monitor,
    ssh: Connection,
    vnc: View,
    ftp: Folder,
    telnet: ChatLineSquare,
  };
  return icons[type] || Connection;
};

const showInstallGuide = () => {
  installGuideVisible.value = true;
};
</script>

<style scoped lang="scss">
.client-status-card {
  margin-bottom: 16px;
}

.client-status {
  .client-type {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }

    .type-title {
      display: flex;
      align-items: center;
      margin: 0 0 12px 0;
      font-size: 16px;
      color: #303133;

      .type-icon {
        margin-right: 8px;
        font-size: 18px;
        color: #409eff;
      }
    }

    .client-list {
      .client-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        margin-bottom: 8px;
        border: 1px solid #e4e7ed;
        border-radius: 6px;
        transition: all 0.3s;

        &:last-child {
          margin-bottom: 0;
        }

        &.available {
          border-color: #67c23a;
          background-color: #f0f9ff;
        }

        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .client-info {
          flex: 1;

          .client-name {
            font-weight: 500;
            color: #303133;
            margin-bottom: 4px;
          }

          .client-description {
            font-size: 12px;
            color: #909399;
          }
        }

        .client-status-indicator {
          margin-left: 12px;
        }
      }
    }
  }
}

.status-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  gap: 8px;
}

.install-guide {
  .guide-content {
    h3 {
      margin: 0 0 16px 0;
      color: #303133;
    }

    .client-guide {
      .guide-item {
        margin-bottom: 20px;
        padding: 16px;
        border: 1px solid #e4e7ed;
        border-radius: 6px;

        &:last-child {
          margin-bottom: 0;
        }

        h4 {
          margin: 0 0 8px 0;
          color: #409eff;
        }

        p {
          margin: 0 0 8px 0;
          line-height: 1.6;

          &:last-child {
            margin-bottom: 0;
          }
        }

        a {
          color: #409eff;
          text-decoration: none;

          &:hover {
            text-decoration: underline;
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
