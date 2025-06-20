import { 
  ConnectionItem, 
  ConnectionType, 
  RDPConnection, 
  SSHConnection, 
  VNCConnection, 
  FTPConnection, 
  TelnetConnection,
  OperationResult,
  ConnectionTestResult
} from '@/types/connection';

/**
 * 连接服务类
 * 负责启动各种远程连接软件
 */
export class ConnectionService {
  private static instance: ConnectionService;

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
          return { success: false, error: '不支持的连接类型' };
      }
    } catch (error) {
      console.error('连接失败:', error);
      return { 
        success: false, 
        error: '连接失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 测试连接
   * @param connection 连接配置
   * @returns 测试结果
   */
  public async testConnection(connection: ConnectionItem): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      // 简单的端口连通性测试
      const isReachable = await this.checkPortConnectivity(connection.host, connection.port);
      const responseTime = Date.now() - startTime;
      
      if (isReachable) {
        return {
          success: true,
          responseTime,
          details: `主机 ${connection.host}:${connection.port} 可达`
        };
      } else {
        return {
          success: false,
          responseTime,
          error: '连接超时或端口不可达',
          details: `无法连接到 ${connection.host}:${connection.port}`
        };
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: '测试连接失败',
        details: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 连接RDP
   */
  private async connectRDP(connection: RDPConnection): Promise<OperationResult> {
    try {
      const args: string[] = [];
      
      // 基本连接参数
      args.push('/v:' + connection.host + ':' + connection.port);
      args.push('/u:' + connection.username);
      args.push('/p:' + connection.password);
      
      // 域名
      if (connection.domain) {
        args.push('/d:' + connection.domain);
      }
      
      // 分辨率
      if (connection.resolution && connection.resolution !== 'fullscreen') {
        const [width, height] = connection.resolution.split('x');
        args.push('/w:' + width);
        args.push('/h:' + height);
      } else if (connection.fullScreen) {
        args.push('/f');
      }
      
      // 颜色深度
      if (connection.colorDepth) {
        args.push('/bpp:' + connection.colorDepth);
      }
      
      // 其他选项
      if (connection.enableClipboard) {
        args.push('+clipboard');
      }
      if (connection.enableDrives) {
        args.push('/drive:*');
      }
      if (connection.enablePrinters) {
        args.push('/printer:*');
      }
      if (!connection.enableSound) {
        args.push('/sound:off');
      }
      
      // 启动mstsc
      const result = await window.electronAPI?.launchProgram('mstsc', args);
      
      if (result?.success) {
        return { success: true, message: 'RDP连接已启动' };
      } else {
        return { success: false, error: 'RDP连接启动失败', message: result?.error };
      }
    } catch (error) {
      return { success: false, error: 'RDP连接失败', message: (error as Error).message };
    }
  }

  /**
   * 连接SSH
   */
  private async connectSSH(connection: SSHConnection): Promise<OperationResult> {
    try {
      // 尝试使用不同的SSH客户端
      const sshClients = ['ssh', 'putty', 'kitty'];
      
      for (const client of sshClients) {
        const isAvailable = await window.electronAPI?.checkProgram(client);
        if (isAvailable) {
          return await this.launchSSHClient(client, connection);
        }
      }
      
      return { success: false, error: '未找到可用的SSH客户端' };
    } catch (error) {
      return { success: false, error: 'SSH连接失败', message: (error as Error).message };
    }
  }

  /**
   * 启动SSH客户端
   */
  private async launchSSHClient(client: string, connection: SSHConnection): Promise<OperationResult> {
    const args: string[] = [];
    
    if (client === 'ssh') {
      // OpenSSH客户端
      args.push('-p', connection.port.toString());
      if (connection.usePrivateKey && connection.privateKeyPath) {
        args.push('-i', connection.privateKeyPath);
      }
      if (connection.compression) {
        args.push('-C');
      }
      args.push(`${connection.username}@${connection.host}`);
    } else if (client === 'putty' || client === 'kitty') {
      // PuTTY/KiTTY客户端
      args.push('-ssh');
      args.push('-P', connection.port.toString());
      args.push('-l', connection.username);
      args.push('-pw', connection.password);
      if (connection.usePrivateKey && connection.privateKeyPath) {
        args.push('-i', connection.privateKeyPath);
      }
      if (connection.compression) {
        args.push('-C');
      }
      args.push(connection.host);
    }
    
    const result = await window.electronAPI?.launchProgram(client, args);
    
    if (result?.success) {
      return { success: true, message: `SSH连接已启动 (${client})` };
    } else {
      return { success: false, error: `${client}启动失败`, message: result?.error };
    }
  }

  /**
   * 连接VNC
   */
  private async connectVNC(connection: VNCConnection): Promise<OperationResult> {
    try {
      // 尝试使用不同的VNC客户端
      const vncClients = ['vncviewer', 'realvnc-vncviewer', 'tightvnc-vncviewer'];
      
      for (const client of vncClients) {
        const isAvailable = await window.electronAPI?.checkProgram(client);
        if (isAvailable) {
          const args: string[] = [];
          
          // 基本连接参数
          args.push(`${connection.host}:${connection.port}`);
          
          // VNC特定选项
          if (connection.viewOnly) {
            args.push('-ViewOnly');
          }
          if (connection.sharedConnection) {
            args.push('-Shared');
          }
          if (connection.quality !== undefined) {
            args.push('-QualityLevel', connection.quality.toString());
          }
          
          const result = await window.electronAPI?.launchProgram(client, args);
          
          if (result?.success) {
            return { success: true, message: `VNC连接已启动 (${client})` };
          }
        }
      }
      
      return { success: false, error: '未找到可用的VNC客户端' };
    } catch (error) {
      return { success: false, error: 'VNC连接失败', message: (error as Error).message };
    }
  }

  /**
   * 连接FTP/SFTP
   */
  private async connectFTP(connection: FTPConnection): Promise<OperationResult> {
    try {
      // 尝试使用不同的FTP客户端
      const ftpClients = ['filezilla', 'winscp', 'ftp'];
      
      for (const client of ftpClients) {
        const isAvailable = await window.electronAPI?.checkProgram(client);
        if (isAvailable) {
          const args: string[] = [];
          
          if (client === 'filezilla') {
            const protocol = connection.type === ConnectionType.SFTP ? 'sftp://' : 'ftp://';
            const url = `${protocol}${connection.username}:${connection.password}@${connection.host}:${connection.port}`;
            args.push(url);
          } else if (client === 'winscp') {
            const protocol = connection.type === ConnectionType.SFTP ? 'sftp' : 'ftp';
            args.push(`${protocol}://${connection.username}:${connection.password}@${connection.host}:${connection.port}`);
          }
          
          const result = await window.electronAPI?.launchProgram(client, args);
          
          if (result?.success) {
            return { success: true, message: `${connection.type.toUpperCase()}连接已启动 (${client})` };
          }
        }
      }
      
      return { success: false, error: '未找到可用的FTP客户端' };
    } catch (error) {
      return { success: false, error: 'FTP连接失败', message: (error as Error).message };
    }
  }

  /**
   * 连接Telnet
   */
  private async connectTelnet(connection: TelnetConnection): Promise<OperationResult> {
    try {
      const args = [connection.host, connection.port.toString()];
      
      const result = await window.electronAPI?.launchProgram('telnet', args);
      
      if (result?.success) {
        return { success: true, message: 'Telnet连接已启动' };
      } else {
        return { success: false, error: 'Telnet连接启动失败', message: result?.error };
      }
    } catch (error) {
      return { success: false, error: 'Telnet连接失败', message: (error as Error).message };
    }
  }

  /**
   * 检查端口连通性
   */
  private async checkPortConnectivity(host: string, port: number): Promise<boolean> {
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
   * 获取可用的连接客户端
   */
  public async getAvailableClients(): Promise<Record<ConnectionType, string[]>> {
    const clients: Record<ConnectionType, string[]> = {
      [ConnectionType.RDP]: [],
      [ConnectionType.SSH]: [],
      [ConnectionType.VNC]: [],
      [ConnectionType.FTP]: [],
      [ConnectionType.SFTP]: [],
      [ConnectionType.TELNET]: []
    };

    // 检查RDP客户端
    if (await window.electronAPI?.checkProgram('mstsc')) {
      clients[ConnectionType.RDP].push('mstsc');
    }

    // 检查SSH客户端
    const sshClients = ['ssh', 'putty', 'kitty'];
    for (const client of sshClients) {
      if (await window.electronAPI?.checkProgram(client)) {
        clients[ConnectionType.SSH].push(client);
      }
    }

    // 检查VNC客户端
    const vncClients = ['vncviewer', 'realvnc-vncviewer', 'tightvnc-vncviewer'];
    for (const client of vncClients) {
      if (await window.electronAPI?.checkProgram(client)) {
        clients[ConnectionType.VNC].push(client);
      }
    }

    // 检查FTP客户端
    const ftpClients = ['filezilla', 'winscp', 'ftp'];
    for (const client of ftpClients) {
      if (await window.electronAPI?.checkProgram(client)) {
        clients[ConnectionType.FTP].push(client);
        clients[ConnectionType.SFTP].push(client);
      }
    }

    // 检查Telnet客户端
    if (await window.electronAPI?.checkProgram('telnet')) {
      clients[ConnectionType.TELNET].push('telnet');
    }

    return clients;
  }
}

// 导出单例实例
export const connectionService = ConnectionService.getInstance();
