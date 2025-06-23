import {
  ConnectionItem,
  ConnectionType,
  RDPConnection,
  SSHConnection,
  VNCConnection,
  FTPConnection,
  TelnetConnection,
  OperationResult,
  ConnectionTestResult,
  ClientConfig,
} from "@/types/connection";
import { storageService } from "./storage";

/**
 * 连接服务类
 * 负责启动各种远程连接软件
 */
export class ConnectionService {
  private static instance: ConnectionService;
  private clientConfigs: Record<string, ClientConfig> = {};

  private constructor() {}

  /**
   * 获取连接服务单例
   */
  public static getInstance(): ConnectionService {
    if (!ConnectionService.instance) {
      ConnectionService.instance = new ConnectionService();
    }
    return ConnectionService.instance;
  }

  /**
   * 初始化客户端配置
   */
  public async initializeClients(): Promise<void> {
    try {
      const settingsResult = await storageService.loadSettings();
      if (settingsResult.success && settingsResult.data) {
        // 如果没有客户端配置，使用默认配置
        if (
          !settingsResult.data.clientPaths ||
          Object.keys(settingsResult.data.clientPaths).length === 0
        ) {
          const { DEFAULT_CLIENT_CONFIGS } = await import("../utils/constants");
          this.clientConfigs = { ...DEFAULT_CLIENT_CONFIGS };

          // 保存默认配置到存储
          const updatedSettings = {
            ...settingsResult.data,
            clientPaths: this.clientConfigs,
          };
          await storageService.saveSettings(updatedSettings);
          console.log("已初始化默认客户端配置");
        } else {
          this.clientConfigs = settingsResult.data.clientPaths;
        }
      }
    } catch (error) {
      console.error("初始化客户端配置失败:", error);
      // 如果加载失败，使用默认配置
      try {
        const { DEFAULT_CLIENT_CONFIGS } = await import("../utils/constants");
        this.clientConfigs = { ...DEFAULT_CLIENT_CONFIGS };
      } catch (importError) {
        console.error("加载默认配置失败:", importError);
      }
    }
  }

  /**
   * 获取可用的客户端配置
   */
  public getAvailableClientConfigs(): Record<string, ClientConfig> {
    return this.clientConfigs;
  }

  /**
   * 更新客户端配置
   */
  public updateClientConfigs(configs: Record<string, ClientConfig>): void {
    this.clientConfigs = configs;
  }

  /**
   * 连接到远程主机
   * @param connection 连接配置
   * @returns 操作结果
   */
  public async connect(connection: ConnectionItem): Promise<OperationResult> {
    try {
      switch (connection.type) {
        case ConnectionType.RDP:
          return await this.connectRDP(connection as RDPConnection);
        case ConnectionType.SSH:
          return await this.connectSSH(connection as SSHConnection);
        case ConnectionType.VNC:
          return await this.connectVNC(connection as VNCConnection);
        case ConnectionType.FTP:
        case ConnectionType.SFTP:
          return await this.connectFTP(connection as FTPConnection);
        case ConnectionType.TELNET:
          return await this.connectTelnet(connection as TelnetConnection);
        default:
          return { success: false, error: "不支持的连接类型" };
      }
    } catch (error) {
      console.error("连接失败:", error);
      return {
        success: false,
        error: "连接失败",
        message: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 测试连接
   * @param connection 连接配置
   * @returns 测试结果
   */
  public async testConnection(
    connection: ConnectionItem
  ): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      // 简单的端口连通性测试
      const isReachable = await this.checkPortConnectivity(
        connection.host,
        connection.port
      );
      const responseTime = Date.now() - startTime;

      if (isReachable) {
        return {
          success: true,
          responseTime,
          details: `主机 ${connection.host}:${connection.port} 可达`,
        };
      } else {
        return {
          success: false,
          responseTime,
          error: "连接超时或端口不可达",
          details: `无法连接到 ${connection.host}:${connection.port}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: "测试连接失败",
        details: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 连接RDP
   */
  private async connectRDP(
    connection: RDPConnection
  ): Promise<OperationResult> {
    try {
      const clientConfig = this.clientConfigs["mstsc"];
      if (!clientConfig || !clientConfig.enabled || !clientConfig.path) {
        return {
          success: false,
          error: "未配置RDP客户端，请在设置中配置MSTSC路径",
        };
      }

      return await this.launchClientWithConfig(clientConfig, connection);
    } catch (error) {
      return {
        success: false,
        error: "RDP连接失败",
        message: (error as Error).message,
      };
    }
  }

  /**
   * 连接SSH
   */
  private async connectSSH(
    connection: SSHConnection
  ): Promise<OperationResult> {
    try {
      // 按优先级获取可用的SSH客户端
      const sshClients = ["xshell", "securecrt", "putty", "kitty", "ssh"];

      for (const clientKey of sshClients) {
        const clientConfig = this.clientConfigs[clientKey];
        if (clientConfig && clientConfig.enabled && clientConfig.path) {
          return await this.launchClientWithConfig(clientConfig, connection);
        }
      }

      return {
        success: false,
        error: "未找到可用的SSH客户端，请在设置中配置客户端路径",
      };
    } catch (error) {
      return {
        success: false,
        error: "SSH连接失败",
        message: (error as Error).message,
      };
    }
  }

  /**
   * 使用配置启动客户端
   */
  private async launchClientWithConfig(
    clientConfig: ClientConfig,
    connection: ConnectionItem
  ): Promise<OperationResult> {
    try {
      // 解析参数模板
      const args = this.parseArguments(
        clientConfig.arguments || "",
        connection
      );

      // 启动客户端
      const result = await window.electronAPI?.launchProgram(
        clientConfig.path,
        args
      );

      if (result?.success) {
        return {
          success: true,
          message: `${connection.type.toUpperCase()}连接已启动 (${
            clientConfig.name
          })`,
        };
      } else {
        return {
          success: false,
          error: `${clientConfig.name}启动失败`,
          message: result?.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `启动${clientConfig.name}失败`,
        message: (error as Error).message,
      };
    }
  }

  /**
   * 解析参数模板
   */
  private parseArguments(
    template: string,
    connection: ConnectionItem
  ): string[] {
    if (!template) return [];

    // 替换模板变量
    let parsedTemplate = template
      .replace(/{host}/g, connection.host)
      .replace(/{port}/g, connection.port.toString())
      .replace(/{username}/g, connection.username)
      .replace(/{password}/g, connection.password);

    // 处理协议类型
    if (
      connection.type === ConnectionType.FTP ||
      connection.type === ConnectionType.SFTP
    ) {
      const protocol = connection.type === ConnectionType.SFTP ? "sftp" : "ftp";
      parsedTemplate = parsedTemplate.replace(/{protocol}/g, protocol);
    }

    // 分割参数并过滤空值
    return parsedTemplate.split(" ").filter((arg) => arg.trim().length > 0);
  }

  /**
   * 启动SSH客户端 (已弃用，保留兼容性)
   */
  private async launchSSHClient(
    client: string,
    connection: SSHConnection
  ): Promise<OperationResult> {
    const args: string[] = [];

    switch (client) {
      case "xshell":
        // Xshell 客户端
        args.push(
          "-url",
          `ssh://${connection.username}:${connection.password}@${connection.host}:${connection.port}`
        );
        if (connection.usePrivateKey && connection.privateKeyPath) {
          args.push("-i", connection.privateKeyPath);
        }
        break;

      case "securecrt":
        // SecureCRT 客户端
        args.push("/SSH2");
        args.push("/L", connection.username);
        args.push("/PASSWORD", connection.password);
        args.push("/P", connection.port.toString());
        if (connection.usePrivateKey && connection.privateKeyPath) {
          args.push("/I", connection.privateKeyPath);
        }
        args.push(connection.host);
        break;

      case "putty":
      case "kitty":
        // PuTTY/KiTTY客户端
        args.push("-ssh");
        args.push("-P", connection.port.toString());
        args.push("-l", connection.username);
        args.push("-pw", connection.password);
        if (connection.usePrivateKey && connection.privateKeyPath) {
          args.push("-i", connection.privateKeyPath);
        }
        if (connection.compression) {
          args.push("-C");
        }
        args.push(connection.host);
        break;

      case "ssh":
        // OpenSSH客户端
        args.push("-p", connection.port.toString());
        if (connection.usePrivateKey && connection.privateKeyPath) {
          args.push("-i", connection.privateKeyPath);
        }
        if (connection.compression) {
          args.push("-C");
        }
        args.push(`${connection.username}@${connection.host}`);
        break;

      default:
        return { success: false, error: `不支持的SSH客户端: ${client}` };
    }

    const result = await window.electronAPI?.launchProgram(client, args);

    if (result?.success) {
      return { success: true, message: `SSH连接已启动 (${client})` };
    } else {
      return {
        success: false,
        error: `${client}启动失败`,
        message: result?.error,
      };
    }
  }

  /**
   * 连接VNC
   */
  private async connectVNC(
    connection: VNCConnection
  ): Promise<OperationResult> {
    try {
      // 按优先级获取可用的VNC客户端
      const vncClients = [
        "radmin",
        "vncviewer",
        "realvnc-vncviewer",
        "tightvnc-vncviewer",
        "ultravnc",
        "turbovnc",
      ];

      for (const clientKey of vncClients) {
        const clientConfig = this.clientConfigs[clientKey];
        if (clientConfig && clientConfig.enabled && clientConfig.path) {
          return await this.launchClientWithConfig(clientConfig, connection);
        }
      }

      return {
        success: false,
        error: "未找到可用的VNC客户端，请在设置中配置客户端路径",
      };
    } catch (error) {
      return {
        success: false,
        error: "VNC连接失败",
        message: (error as Error).message,
      };
    }
  }

  /**
   * 启动VNC客户端
   */
  private async launchVNCClient(
    client: string,
    connection: VNCConnection
  ): Promise<OperationResult> {
    const args: string[] = [];

    switch (client) {
      case "radmin":
        // Radmin Viewer
        args.push("/connect:" + connection.host);
        args.push("/port:" + connection.port.toString());
        if (connection.password) {
          args.push("/password:" + connection.password);
        }
        break;

      case "vncviewer":
      case "realvnc-vncviewer":
        // RealVNC Viewer
        args.push(`${connection.host}:${connection.port}`);
        if (connection.password) {
          args.push("-passwd", connection.password);
        }
        if (connection.viewOnly) {
          args.push("-ViewOnly");
        }
        if (connection.sharedConnection) {
          args.push("-Shared");
        }
        if (connection.quality !== undefined) {
          args.push("-QualityLevel", connection.quality.toString());
        }
        break;

      case "tightvnc-vncviewer":
        // TightVNC Viewer
        args.push(`${connection.host}:${connection.port}`);
        if (connection.password) {
          args.push("-password", connection.password);
        }
        if (connection.viewOnly) {
          args.push("-viewonly");
        }
        if (connection.sharedConnection) {
          args.push("-shared");
        }
        break;

      case "ultravnc":
        // UltraVNC
        args.push("-connect", `${connection.host}:${connection.port}`);
        if (connection.password) {
          args.push("-password", connection.password);
        }
        if (connection.viewOnly) {
          args.push("-viewonly");
        }
        break;

      case "turbovnc":
        // TurboVNC
        args.push(`${connection.host}:${connection.port}`);
        if (connection.password) {
          args.push("-passwd", connection.password);
        }
        break;

      default:
        return { success: false, error: `不支持的VNC客户端: ${client}` };
    }

    const result = await window.electronAPI?.launchProgram(client, args);

    if (result?.success) {
      return { success: true, message: `VNC连接已启动 (${client})` };
    } else {
      return {
        success: false,
        error: `${client}启动失败`,
        message: result?.error,
      };
    }
  }

  /**
   * 连接FTP/SFTP
   */
  private async connectFTP(
    connection: FTPConnection
  ): Promise<OperationResult> {
    try {
      // 按优先级获取可用的FTP客户端
      const ftpClients = ["xftp", "winscp", "filezilla", "ftp"];

      for (const clientKey of ftpClients) {
        const clientConfig = this.clientConfigs[clientKey];
        if (clientConfig && clientConfig.enabled && clientConfig.path) {
          // 系统FTP不支持SFTP
          if (clientKey === "ftp" && connection.type === ConnectionType.SFTP) {
            continue;
          }
          return await this.launchClientWithConfig(clientConfig, connection);
        }
      }

      return {
        success: false,
        error: "未找到可用的FTP客户端，请在设置中配置客户端路径",
      };
    } catch (error) {
      return {
        success: false,
        error: "FTP连接失败",
        message: (error as Error).message,
      };
    }
  }

  /**
   * 启动FTP客户端
   */
  private async launchFTPClient(
    client: string,
    connection: FTPConnection
  ): Promise<OperationResult> {
    const args: string[] = [];

    switch (client) {
      case "xftp":
        // Xftp 客户端
        const xftpProtocol =
          connection.type === ConnectionType.SFTP ? "sftp" : "ftp";
        args.push(
          "-url",
          `${xftpProtocol}://${connection.username}:${connection.password}@${connection.host}:${connection.port}`
        );
        if (connection.initialPath) {
          args.push("-dir", connection.initialPath);
        }
        break;

      case "winscp":
        // WinSCP 客户端
        const winscpProtocol =
          connection.type === ConnectionType.SFTP ? "sftp" : "ftp";
        args.push(
          `${winscpProtocol}://${connection.username}:${connection.password}@${connection.host}:${connection.port}`
        );
        if (connection.initialPath) {
          args.push(`/${connection.initialPath}`);
        }
        break;

      case "filezilla":
        // FileZilla 客户端
        const filezillaProtocol =
          connection.type === ConnectionType.SFTP ? "sftp://" : "ftp://";
        const url = `${filezillaProtocol}${connection.username}:${connection.password}@${connection.host}:${connection.port}`;
        args.push(url);
        if (connection.initialPath) {
          args.push(connection.initialPath);
        }
        break;

      case "ftp":
        // 系统自带FTP（仅支持FTP，不支持SFTP）
        if (connection.type === ConnectionType.SFTP) {
          return { success: false, error: "系统FTP客户端不支持SFTP协议" };
        }
        args.push(connection.host);
        args.push(connection.port.toString());
        break;

      default:
        return { success: false, error: `不支持的FTP客户端: ${client}` };
    }

    const result = await window.electronAPI?.launchProgram(client, args);

    if (result?.success) {
      return {
        success: true,
        message: `${connection.type.toUpperCase()}连接已启动 (${client})`,
      };
    } else {
      return {
        success: false,
        error: `${client}启动失败`,
        message: result?.error,
      };
    }
  }

  /**
   * 连接Telnet
   */
  private async connectTelnet(
    connection: TelnetConnection
  ): Promise<OperationResult> {
    try {
      const clientConfig = this.clientConfigs["telnet"];
      if (!clientConfig || !clientConfig.enabled || !clientConfig.path) {
        return {
          success: false,
          error: "未配置Telnet客户端，请在设置中配置Telnet路径",
        };
      }

      return await this.launchClientWithConfig(clientConfig, connection);
    } catch (error) {
      return {
        success: false,
        error: "Telnet连接失败",
        message: (error as Error).message,
      };
    }
  }

  /**
   * 检查端口连通性
   */
  private async checkPortConnectivity(
    host: string,
    port: number
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = 5000; // 5秒超时
      const socket = new WebSocket(`ws://${host}:${port}`);

      const timer = setTimeout(() => {
        socket.close();
        resolve(false);
      }, timeout);

      socket.onopen = () => {
        clearTimeout(timer);
        socket.close();
        resolve(true);
      };

      socket.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
    });
  }

  /**
   * 获取可用的连接客户端（基于配置）
   */
  public getAvailableClients(): Record<ConnectionType, ClientConfig[]> {
    const clients: Record<ConnectionType, ClientConfig[]> = {
      [ConnectionType.RDP]: [],
      [ConnectionType.SSH]: [],
      [ConnectionType.VNC]: [],
      [ConnectionType.FTP]: [],
      [ConnectionType.SFTP]: [],
      [ConnectionType.TELNET]: [],
    };

    // 遍历所有客户端配置
    Object.values(this.clientConfigs).forEach((config) => {
      if (!config.enabled || !config.path) return;

      // 根据客户端类型分类
      switch (config.executable) {
        case "mstsc":
          clients[ConnectionType.RDP].push(config);
          break;
        case "xshell":
        case "securecrt":
        case "putty":
        case "kitty":
        case "ssh":
          clients[ConnectionType.SSH].push(config);
          break;
        case "radmin":
        case "vncviewer":
        case "realvnc-vncviewer":
        case "tightvnc-vncviewer":
        case "ultravnc":
        case "turbovnc":
          clients[ConnectionType.VNC].push(config);
          break;
        case "xftp":
        case "winscp":
        case "filezilla":
          clients[ConnectionType.FTP].push(config);
          clients[ConnectionType.SFTP].push(config);
          break;
        case "ftp":
          clients[ConnectionType.FTP].push(config);
          // 系统FTP不支持SFTP
          break;
        case "telnet":
          clients[ConnectionType.TELNET].push(config);
          break;
      }
    });

    return clients;
  }
}

// 导出单例实例
export const connectionService = ConnectionService.getInstance();
