// 连接类型枚举
export enum ConnectionType {
  RDP = "rdp",
  SSH = "ssh",
  VNC = "vnc",
  TELNET = "telnet",
  FTP = "ftp",
  SFTP = "sftp",
}

// 连接状态枚举
export enum ConnectionStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  ERROR = "error",
}

// 基础连接配置接口
export interface BaseConnection {
  id: string;
  name: string;
  type: ConnectionType;
  host: string;
  port: number;
  username: string;
  password: string; // 加密存储
  description?: string;
  icon?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  lastConnected?: Date;
  connectionCount: number;
}

// RDP连接特有配置
export interface RDPConnection extends BaseConnection {
  type: ConnectionType.RDP;
  domain?: string;
  resolution?: string;
  colorDepth?: number;
  fullScreen?: boolean;
  enableClipboard?: boolean;
  enableDrives?: boolean;
  enablePrinters?: boolean;
  enableSound?: boolean;
}

// SSH连接特有配置
export interface SSHConnection extends BaseConnection {
  type: ConnectionType.SSH;
  privateKeyPath?: string;
  usePrivateKey?: boolean;
  terminalType?: string;
  encoding?: string;
  keepAlive?: boolean;
  compression?: boolean;
}

// VNC连接特有配置
export interface VNCConnection extends BaseConnection {
  type: ConnectionType.VNC;
  viewOnly?: boolean;
  sharedConnection?: boolean;
  colorDepth?: number;
  compression?: number;
  quality?: number;
}

// FTP/SFTP连接特有配置
export interface FTPConnection extends BaseConnection {
  type: ConnectionType.FTP | ConnectionType.SFTP;
  passiveMode?: boolean;
  encoding?: string;
  initialPath?: string;
}

// Telnet连接特有配置
export interface TelnetConnection extends BaseConnection {
  type: ConnectionType.TELNET;
  terminalType?: string;
  encoding?: string;
}

// 联合类型：所有连接类型
export type ConnectionItem =
  | RDPConnection
  | SSHConnection
  | VNCConnection
  | FTPConnection
  | TelnetConnection;

// 连接分组接口
export interface ConnectionGroup {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  expanded?: boolean;
  children: (ConnectionGroup | ConnectionItem)[];
  createdAt: Date;
  updatedAt: Date;
}

// 树节点类型（分组或连接项）
export type TreeNode = ConnectionGroup | ConnectionItem;

// 连接配置数据结构
export interface ConnectionConfig {
  version: string;
  groups: ConnectionGroup[];
  settings: AppSettings;
}

// 客户端配置接口
export interface ClientConfig {
  name: string;
  executable: string;
  path: string;
  enabled: boolean;
  arguments?: string; // 自定义参数模板
}

// 应用设置接口
export interface AppSettings {
  theme: "light" | "dark" | "auto";
  language: "zh-CN" | "en-US";
  autoSave: boolean;
  confirmBeforeDelete: boolean;
  showConnectionCount: boolean;
  defaultConnectionType: ConnectionType;
  encryptionEnabled: boolean;
  backupEnabled: boolean;
  backupInterval: number; // 小时
  clientPaths: Record<string, ClientConfig>; // 客户端路径配置
}

// 连接历史记录
export interface ConnectionHistory {
  connectionId: string;
  connectedAt: Date;
  disconnectedAt?: Date;
  duration?: number; // 秒
  status: ConnectionStatus;
  errorMessage?: string;
}

// 搜索过滤器
export interface SearchFilter {
  keyword?: string;
  type?: ConnectionType;
  tags?: string[];
  groupId?: string;
}

// 导入/导出格式
export interface ExportData {
  version: string;
  exportedAt: Date;
  groups: ConnectionGroup[];
  includePasswords: boolean;
}

// 连接表单数据
export interface ConnectionFormData {
  name: string;
  type: ConnectionType;
  host: string;
  port: number;
  username: string;
  password: string;
  description?: string;
  groupId?: string;
  tags?: string[];
  // 类型特定配置
  rdpConfig?: Partial<RDPConnection>;
  sshConfig?: Partial<SSHConnection>;
  vncConfig?: Partial<VNCConnection>;
  ftpConfig?: Partial<FTPConnection>;
  telnetConfig?: Partial<TelnetConnection>;
}

// 操作结果接口
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 连接测试结果
export interface ConnectionTestResult {
  success: boolean;
  responseTime?: number;
  error?: string;
  details?: string;
}

// 类型守卫函数
export function isConnectionGroup(node: TreeNode): node is ConnectionGroup {
  return "children" in node;
}

export function isConnectionItem(node: TreeNode): node is ConnectionItem {
  return "type" in node && "host" in node;
}

// 默认端口映射
export const DEFAULT_PORTS: Record<ConnectionType, number> = {
  [ConnectionType.RDP]: 3389,
  [ConnectionType.SSH]: 22,
  [ConnectionType.VNC]: 5900,
  [ConnectionType.TELNET]: 23,
  [ConnectionType.FTP]: 21,
  [ConnectionType.SFTP]: 22,
};

// 连接类型显示名称
export const CONNECTION_TYPE_NAMES: Record<ConnectionType, string> = {
  [ConnectionType.RDP]: "Remote Desktop",
  [ConnectionType.SSH]: "SSH",
  [ConnectionType.VNC]: "VNC",
  [ConnectionType.TELNET]: "Telnet",
  [ConnectionType.FTP]: "FTP",
  [ConnectionType.SFTP]: "SFTP",
};

// 连接类型图标
export const CONNECTION_TYPE_ICONS: Record<ConnectionType, string> = {
  [ConnectionType.RDP]: "Monitor",
  [ConnectionType.SSH]: "Terminal",
  [ConnectionType.VNC]: "View",
  [ConnectionType.TELNET]: "ChatLineSquare",
  [ConnectionType.FTP]: "Folder",
  [ConnectionType.SFTP]: "FolderOpened",
};
