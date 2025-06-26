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
  private isUpdating: boolean = false; // 防止在更新过程中重新初始化

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
    // 如果正在更新配置，跳过初始化
    if (this.isUpdating) {
      console.log("ConnectionService: 跳过初始化，正在更新配置中");
      return;
    }

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
    this.isUpdating = true;
    this.clientConfigs = configs;
    console.log("ConnectionService: 配置已更新", configs);
    // 短暂延迟后解除锁定，防止立即重新初始化
    setTimeout(() => {
      this.isUpdating = false;
    }, 100);
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
   * 创建RDP配置文件
   */
  private async createRDPFile(
    connection: RDPConnection,
    includePassword: boolean = true
  ): Promise<string | null> {
    try {
      console.log("开始创建RDP配置文件，连接信息:", {
        host: connection.host,
        port: connection.port,
        username: connection.username,
        domain: connection.domain,
      });

      // 检查Electron API是否可用
      if (!window.electronAPI) {
        console.error("Electron API不可用");
        return null;
      }

      // 生成临时文件名
      const timestamp = Date.now();
      const fileName = `${connection.name}.rdp`;
      console.log("生成RDP文件名:", fileName);

      // 构建RDP文件内容
      let rdpContent = `screen mode id:i:2
use multimon:i:0
desktopwidth:i:1024
desktopheight:i:768
session bpp:i:32
winposstr:s:0,3,0,0,800,600
compression:i:1
keyboardhook:i:2
audiocapturemode:i:0
videoplaybackmode:i:1
connection type:i:7
networkautodetect:i:1
bandwidthautodetect:i:1
displayconnectionbar:i:1
enableworkspacereconnect:i:0
disable wallpaper:i:0
allow font smoothing:i:0
allow desktop composition:i:0
disable full window drag:i:1
disable menu anims:i:1
disable themes:i:0
disable cursor setting:i:0
bitmapcachepersistenable:i:1
full address:s:${connection.host}:${connection.port}
audiomode:i:0
redirectprinters:i:1
redirectcomports:i:0
redirectsmartcards:i:1
redirectclipboard:i:1
redirectposdevices:i:0
autoreconnection enabled:i:1
authentication level:i:2
prompt for credentials:i:0
negotiate security layer:i:1
remoteapplicationmode:i:0
alternate shell:s:
shell working directory:s:
gatewayhostname:s:
gatewayusagemethod:i:4
gatewaycredentialssource:i:4
gatewayprofileusagemethod:i:0
promptcredentialonce:i:0
gatewaybrokeringtype:i:0
use redirection server name:i:0
rdgiskdcproxy:i:0
kdcproxyname:s:`;

      // 添加用户名（如果提供）
      if (connection.username) {
        rdpContent += `\nusername:s:${connection.username}`;
        console.log("添加用户名到RDP文件:", connection.username);
      }

      // 添加域名（如果提供）
      if (connection.domain) {
        rdpContent += `\ndomain:s:${connection.domain}`;
        console.log("添加域名到RDP文件:", connection.domain);
      }

      // 注意：当使用cmdkey存储凭据时，不在RDP文件中包含密码
      // 密码通过cmdkey命令预先存储在Windows凭据管理器中
      if (includePassword) {
        console.log("RDP文件模式：用户需要手动输入密码");
      } else {
        console.log("cmdkey模式：密码已通过cmdkey预先存储");
      }

      // 添加分辨率设置
      if (connection.resolution && connection.resolution !== "fullscreen") {
        const [width, height] = connection.resolution.split("x");
        rdpContent += `\ndesktopwidth:i:${width}`;
        rdpContent += `\ndesktopheight:i:${height}`;
        console.log("添加分辨率设置:", connection.resolution);
      } else if (connection.resolution === "fullscreen") {
        rdpContent += `\nscreen mode id:i:2`;
        console.log("设置为全屏模式");
      }

      // 添加颜色深度
      if (connection.colorDepth) {
        rdpContent += `\nsession bpp:i:${connection.colorDepth}`;
        console.log("添加颜色深度:", connection.colorDepth);
      }

      // 添加其他设置
      if (connection.enableClipboard !== undefined) {
        rdpContent += `\nredirectclipboard:i:${
          connection.enableClipboard ? 1 : 0
        }`;
      }

      if (connection.enableDrives !== undefined) {
        rdpContent += `\nredirectdrives:i:${connection.enableDrives ? 1 : 0}`;
      }

      if (connection.enablePrinters !== undefined) {
        rdpContent += `\nredirectprinters:i:${
          connection.enablePrinters ? 1 : 0
        }`;
      }

      if (connection.enableSound !== undefined) {
        rdpContent += `\naudiomode:i:${connection.enableSound ? 0 : 2}`;
      }

      console.log("RDP文件内容长度:", rdpContent.length);

      // 获取用户数据路径
      const userDataPath = await window.electronAPI.getUserDataPath();
      console.log("用户数据路径:", userDataPath);

      // 保存RDP文件
      console.log("开始保存RDP文件...");
      const result = await window.electronAPI.writeFile(
        "temp",
        fileName,
        rdpContent
      );

      console.log("RDP文件保存结果:", result);

      if (result?.success) {
        // 返回完整路径
        const fullPath = `${userDataPath}/temp/${fileName}`;
        console.log("RDP文件创建成功，路径:", fullPath);
        return fullPath;
      } else {
        console.error("RDP文件保存失败:", result?.error);
        return null;
      }
    } catch (error) {
      console.error("创建RDP文件异常:", error);
      return null;
    }
  }

  /**
   * 使用cmdkey + mstsc方式连接RDP
   */
  private async connectRDPWithCmdkey(
    connection: RDPConnection,
    clientConfig: ClientConfig
  ): Promise<OperationResult> {
    try {
      // 构建服务器地址
      const serverAddress =
        connection.port === 3389
          ? connection.host
          : `${connection.host}:${connection.port}`;

      console.log("使用cmdkey存储凭据:", {
        serverAddress,
        username: connection.username,
        hasPassword: !!connection.password,
      });

      // 第一步：使用cmdkey存储凭据
      const cmdkeyArgs = [
        "/generic:TERMSRV/" + serverAddress,
        "/user:" + connection.username,
        "/pass:" + connection.password,
      ];

      console.log("执行cmdkey命令...");
      const cmdkeyResult = await window.electronAPI?.launchProgram(
        "cmdkey",
        cmdkeyArgs
      );

      if (!cmdkeyResult?.success) {
        console.error("cmdkey命令执行失败:", cmdkeyResult?.error);
        return {
          success: false,
          error: "存储凭据失败",
          message: cmdkeyResult?.error || "cmdkey命令执行失败",
        };
      }

      console.log("凭据存储成功，准备启动mstsc...");

      // 第二步：创建RDP文件或使用基本连接
      let mstscArgs: string[] = [];

      if (window.electronAPI?.writeFile) {
        // 创建RDP文件（不包含密码，因为已通过cmdkey存储）
        const rdpFilePath = await this.createRDPFile(connection, false);
        if (rdpFilePath) {
          console.log("使用RDP文件启动mstsc:", rdpFilePath);
          mstscArgs = [rdpFilePath];
        } else {
          console.warn("RDP文件创建失败，使用基本连接参数");
          mstscArgs = [`/v:${serverAddress}`];
        }
      } else {
        console.log("使用基本连接参数");
        mstscArgs = [`/v:${serverAddress}`];
      }

      // 第三步：启动mstsc
      console.log("启动mstsc:", { args: mstscArgs });
      const mstscResult = await window.electronAPI?.launchProgram(
        clientConfig.path,
        mstscArgs
      );

      if (mstscResult?.success) {
        return {
          success: true,
          message: `RDP连接已启动 (${clientConfig.name}) - 自动登录`,
        };
      } else {
        return {
          success: false,
          error: `${clientConfig.name}启动失败`,
          message: mstscResult?.error,
        };
      }
    } catch (error) {
      console.error("cmdkey + mstsc连接失败:", error);
      return {
        success: false,
        error: "RDP连接失败",
        message: (error as Error).message,
      };
    }
  }

  /**
   * 为SSH连接启动SFTP客户端
   */
  public async connectSftp(
    sshConnection: SSHConnection
  ): Promise<OperationResult> {
    try {
      // 创建一个临时的SFTP连接配置
      const sftpConnection: FTPConnection = {
        ...sshConnection,
        type: ConnectionType.SFTP,
        // SFTP通常使用SSH端口22，但如果SSH使用了其他端口，保持一致
        port: sshConnection.port,
        // SFTP特有的配置
        passiveMode: false, // SFTP不使用被动模式
        encoding: sshConnection.encoding || "UTF-8",
        initialPath: "/", // 默认根目录
      };

      // 按优先级获取可用的SFTP客户端
      const sftpClients = ["xftp", "winscp", "filezilla"];

      for (const clientKey of sftpClients) {
        const clientConfig = this.clientConfigs[clientKey];
        if (clientConfig && clientConfig.enabled && clientConfig.path) {
          console.log(`使用 ${clientConfig.name} 启动SFTP连接`);
          return await this.launchClientWithConfig(
            clientConfig,
            sftpConnection
          );
        }
      }

      return {
        success: false,
        error:
          "未找到可用的SFTP客户端，请在设置中配置Xftp、WinSCP或FileZilla客户端路径",
      };
    } catch (error) {
      return {
        success: false,
        error: "SFTP连接失败",
        message: (error as Error).message,
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

      console.log("开始RDP连接:", {
        host: connection.host,
        port: connection.port,
        username: connection.username,
      });

      // 优先使用cmdkey + mstsc方式连接（有用户名密码时）
      if (connection.username && connection.password) {
        console.log("使用cmdkey + mstsc方式连接...");
        return await this.connectRDPWithCmdkey(connection, clientConfig);
      }

      // 回退到RDP文件方式（无密码时）
      if (window.electronAPI?.writeFile) {
        console.log("无密码，尝试使用RDP文件方式连接...");
        const rdpFilePath = await this.createRDPFile(connection);
        if (rdpFilePath) {
          console.log("RDP文件创建成功，启动连接...");
          const result = await this.launchClientWithConfig(
            clientConfig,
            connection,
            [rdpFilePath]
          );
          return result;
        } else {
          console.warn("RDP文件创建失败，使用基本连接方式...");
        }
      }

      // 最后回退到基本连接方式（仅主机和端口）
      console.log("使用基本mstsc连接方式...");
      return await this.launchClientWithConfig(clientConfig, connection);
    } catch (error) {
      console.error("RDP连接失败:", error);
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
    connection: ConnectionItem,
    customArgs?: string[]
  ): Promise<OperationResult> {
    try {
      // 如果提供了自定义参数，使用自定义参数；否则解析参数模板
      const args =
        customArgs ||
        this.parseArguments(clientConfig.arguments || "", connection);

      // 调试信息：记录启动参数
      console.log(`启动客户端: ${clientConfig.name}`);
      console.log(`可执行文件路径: ${clientConfig.path}`);
      if (customArgs) {
        console.log(`使用自定义参数:`, args);
      } else {
        console.log(`参数模板: ${clientConfig.arguments}`);
        console.log(`解析后的参数:`, args);
      }
      console.log(`连接信息:`, {
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: connection.password ? "***" : "(空)",
        type: connection.type,
      });

      // 检查Electron API是否可用
      if (!window.electronAPI?.launchProgram) {
        console.error("Electron API launchProgram 方法不可用");
        return {
          success: false,
          error: "系统API不可用，无法启动客户端",
        };
      }

      // 启动客户端
      const result = await window.electronAPI.launchProgram(
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
      console.error("启动客户端异常:", error);
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

    // 安全地处理密码中的特殊字符
    const safePassword = this.escapePassword(connection.password);
    const safeUsername = this.escapeUsername(connection.username);

    // 替换模板变量
    let parsedTemplate = template
      .replace(/{host}/g, connection.host)
      .replace(/{port}/g, connection.port.toString())
      .replace(/{username}/g, safeUsername)
      .replace(/{password}/g, safePassword);

    // 处理协议类型
    if (
      connection.type === ConnectionType.FTP ||
      connection.type === ConnectionType.SFTP
    ) {
      const protocol = connection.type === ConnectionType.SFTP ? "sftp" : "ftp";
      parsedTemplate = parsedTemplate.replace(/{protocol}/g, protocol);
    }

    // 处理SSH特有的变量
    if (connection.type === ConnectionType.SSH) {
      const sshConnection = connection as SSHConnection;
      if (sshConnection.usePrivateKey && sshConnection.privateKeyPath) {
        parsedTemplate = parsedTemplate.replace(
          /{privatekey}/g,
          sshConnection.privateKeyPath
        );
      }
      if (sshConnection.compression) {
        parsedTemplate = parsedTemplate.replace(/{compression}/g, "-C");
      } else {
        parsedTemplate = parsedTemplate.replace(/{compression}/g, "");
      }
    }

    // 处理FTP特有的变量
    if (
      connection.type === ConnectionType.FTP ||
      connection.type === ConnectionType.SFTP
    ) {
      const ftpConnection = connection as FTPConnection;
      if (ftpConnection.initialPath) {
        parsedTemplate = parsedTemplate.replace(
          /{initialpath}/g,
          ftpConnection.initialPath
        );
      } else {
        parsedTemplate = parsedTemplate.replace(/{initialpath}/g, "");
      }
    }

    // 智能分割参数
    return this.smartSplitArguments(parsedTemplate);
  }

  /**
   * 转义密码中的特殊字符
   */
  private escapePassword(password: string): string {
    if (!password) return "";

    // 对于包含空格或特殊字符的密码，需要用引号包围
    if (
      password.includes(" ") ||
      password.includes("&") ||
      password.includes("|") ||
      password.includes("<") ||
      password.includes(">") ||
      password.includes("^")
    ) {
      return `"${password.replace(/"/g, '\\"')}"`;
    }

    return password;
  }

  /**
   * 转义用户名中的特殊字符
   */
  private escapeUsername(username: string): string {
    if (!username) return "";

    // 对于包含空格的用户名，需要用引号包围
    if (username.includes(" ")) {
      return `"${username}"`;
    }

    return username;
  }

  /**
   * 智能分割参数字符串
   */
  private smartSplitArguments(template: string): string[] {
    const args: string[] = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < template.length; i++) {
      const char = template[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = "";
        current += char;
      } else if (char === " " && !inQuotes) {
        if (current.trim()) {
          args.push(current.trim());
          current = "";
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(current.trim());
    }

    // 过滤空参数并清理引号
    return args
      .filter((arg) => arg.length > 0)
      .map((arg) => {
        // 移除外层引号但保留内容
        if (
          (arg.startsWith('"') && arg.endsWith('"')) ||
          (arg.startsWith("'") && arg.endsWith("'"))
        ) {
          return arg.slice(1, -1);
        }
        return arg;
      });
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
