import { ConnectionType, AppSettings, ClientConfig } from "@/types/connection";

// 应用常量
export const APP_NAME = "远程管理系统";
export const APP_VERSION = "1.0.0";
export const DATA_FILE_NAME = "connections.json";
export const SETTINGS_FILE_NAME = "settings.json";
export const BACKUP_DIR_NAME = "backups";

// 加密相关常量
export const ENCRYPTION_KEY_LENGTH = 32;
export const ENCRYPTION_IV_LENGTH = 16;
export const ENCRYPTION_ALGORITHM = "AES";

// 默认客户端配置
export const DEFAULT_CLIENT_CONFIGS: Record<string, ClientConfig> = {
  // RDP 客户端
  mstsc: {
    name: "远程桌面连接",
    executable: "mstsc",
    path: "mstsc.exe",
    enabled: true,
    arguments: "/v:{host}:{port}",
  },

  // SSH 客户端
  xshell: {
    name: "Xshell",
    executable: "xshell",
    path: "",
    enabled: false,
    arguments: "-url ssh://{username}:{password}@{host}:{port}",
  },
  securecrt: {
    name: "SecureCRT",
    executable: "securecrt",
    path: "",
    enabled: false,
    arguments: "/SSH2 /L {username} /PASSWORD {password} /P {port} {host}",
  },
  putty: {
    name: "PuTTY",
    executable: "putty",
    path: "",
    enabled: false,
    arguments: "-ssh -P {port} -l {username} -pw {password} {host}",
  },
  kitty: {
    name: "KiTTY",
    executable: "kitty",
    path: "",
    enabled: false,
    arguments: "-ssh -P {port} -l {username} -pw {password} {host}",
  },
  ssh: {
    name: "OpenSSH",
    executable: "ssh",
    path: "ssh.exe",
    enabled: true,
    arguments: "-p {port} {username}@{host}",
  },

  // FTP 客户端
  xftp: {
    name: "Xftp",
    executable: "xftp",
    path: "",
    enabled: false,
    arguments: "-url {protocol}://{username}:{password}@{host}:{port}",
  },
  winscp: {
    name: "WinSCP",
    executable: "winscp",
    path: "",
    enabled: false,
    arguments: "{protocol}://{username}:{password}@{host}:{port}",
  },
  filezilla: {
    name: "FileZilla",
    executable: "filezilla",
    path: "",
    enabled: false,
    arguments: "{protocol}://{username}:{password}@{host}:{port}",
  },
  ftp: {
    name: "系统FTP",
    executable: "ftp",
    path: "ftp.exe",
    enabled: true,
    arguments: "{host} {port}",
  },

  // VNC 客户端
  radmin: {
    name: "Radmin Viewer",
    executable: "radmin",
    path: "",
    enabled: false,
    arguments: "/connect:{host} /port:{port} /password:{password}",
  },
  vncviewer: {
    name: "VNC Viewer",
    executable: "vncviewer",
    path: "",
    enabled: false,
    arguments: "{host}:{port} -passwd {password}",
  },
  "realvnc-vncviewer": {
    name: "RealVNC Viewer",
    executable: "realvnc-vncviewer",
    path: "",
    enabled: false,
    arguments: "{host}:{port} -passwd {password}",
  },
  "tightvnc-vncviewer": {
    name: "TightVNC Viewer",
    executable: "tightvnc-vncviewer",
    path: "",
    enabled: false,
    arguments: "{host}:{port} -password {password}",
  },
  ultravnc: {
    name: "UltraVNC",
    executable: "ultravnc",
    path: "",
    enabled: false,
    arguments: "-connect {host}:{port} -password {password}",
  },
  turbovnc: {
    name: "TurboVNC",
    executable: "turbovnc",
    path: "",
    enabled: false,
    arguments: "{host}:{port} -passwd {password}",
  },

  // Telnet 客户端
  telnet: {
    name: "Telnet",
    executable: "telnet",
    path: "telnet.exe",
    enabled: true,
    arguments: "{host} {port}",
  },
};

// 默认应用设置
export const DEFAULT_SETTINGS: AppSettings = {
  theme: "auto",
  language: "zh-CN",
  autoSave: true,
  confirmBeforeDelete: true,
  showConnectionCount: true,
  defaultConnectionType: ConnectionType.SSH,
  encryptionEnabled: true,
  backupEnabled: true,
  backupInterval: 24, // 24小时
  clientPaths: { ...DEFAULT_CLIENT_CONFIGS },
};

// 支持的文件扩展名
export const SUPPORTED_EXPORT_FORMATS = [
  { label: "JSON 文件", value: "json", extension: ".json" },
  { label: "CSV 文件", value: "csv", extension: ".csv" },
];

// 主题选项
export const THEME_OPTIONS = [
  { label: "浅色主题", value: "light" },
  { label: "深色主题", value: "dark" },
  { label: "跟随系统", value: "auto" },
];

// 语言选项
export const LANGUAGE_OPTIONS = [
  { label: "简体中文", value: "zh-CN" },
  { label: "English", value: "en-US" },
];

// 连接类型选项
export const CONNECTION_TYPE_OPTIONS = [
  { label: "Remote Desktop (RDP)", value: ConnectionType.RDP, icon: "Monitor" },
  { label: "SSH", value: ConnectionType.SSH, icon: "Terminal" },
  { label: "VNC", value: ConnectionType.VNC, icon: "View" },
  { label: "Telnet", value: ConnectionType.TELNET, icon: "ChatLineSquare" },
  { label: "FTP", value: ConnectionType.FTP, icon: "Folder" },
  { label: "SFTP", value: ConnectionType.SFTP, icon: "FolderOpened" },
];

// RDP 分辨率选项
export const RDP_RESOLUTION_OPTIONS = [
  { label: "800x600", value: "800x600" },
  { label: "1024x768", value: "1024x768" },
  { label: "1280x720", value: "1280x720" },
  { label: "1280x1024", value: "1280x1024" },
  { label: "1366x768", value: "1366x768" },
  { label: "1440x900", value: "1440x900" },
  { label: "1600x900", value: "1600x900" },
  { label: "1680x1050", value: "1680x1050" },
  { label: "1920x1080", value: "1920x1080" },
  { label: "1920x1200", value: "1920x1200" },
  { label: "2560x1440", value: "2560x1440" },
  { label: "全屏", value: "fullscreen" },
];

// RDP 颜色深度选项
export const RDP_COLOR_DEPTH_OPTIONS = [
  { label: "15位 (32K色)", value: 15 },
  { label: "16位 (64K色)", value: 16 },
  { label: "24位 (1600万色)", value: 24 },
  { label: "32位 (真彩色)", value: 32 },
];

// SSH 终端类型选项
export const SSH_TERMINAL_TYPE_OPTIONS = [
  { label: "xterm", value: "xterm" },
  { label: "xterm-256color", value: "xterm-256color" },
  { label: "vt100", value: "vt100" },
  { label: "vt220", value: "vt220" },
  { label: "linux", value: "linux" },
];

// 编码选项
export const ENCODING_OPTIONS = [
  { label: "UTF-8", value: "utf-8" },
  { label: "GBK", value: "gbk" },
  { label: "GB2312", value: "gb2312" },
  { label: "ASCII", value: "ascii" },
  { label: "ISO-8859-1", value: "iso-8859-1" },
];

// VNC 压缩级别选项
export const VNC_COMPRESSION_OPTIONS = [
  { label: "无压缩", value: 0 },
  { label: "最快", value: 1 },
  { label: "快速", value: 3 },
  { label: "平衡", value: 6 },
  { label: "最佳", value: 9 },
];

// VNC 质量选项
export const VNC_QUALITY_OPTIONS = [
  { label: "最低", value: 0 },
  { label: "低", value: 3 },
  { label: "中等", value: 6 },
  { label: "高", value: 8 },
  { label: "最高", value: 9 },
];

// 常用标签
export const COMMON_TAGS = [
  "生产环境",
  "测试环境",
  "开发环境",
  "数据库",
  "服务器",
  "工作站",
  "重要",
  "临时",
  "备份",
];

// 错误消息
export const ERROR_MESSAGES = {
  INVALID_HOST: "请输入有效的主机地址",
  INVALID_PORT: "端口号必须在1-65535之间",
  INVALID_USERNAME: "请输入用户名",
  INVALID_PASSWORD: "请输入密码",
  CONNECTION_FAILED: "连接失败",
  SAVE_FAILED: "保存失败",
  LOAD_FAILED: "加载失败",
  DELETE_FAILED: "删除失败",
  EXPORT_FAILED: "导出失败",
  IMPORT_FAILED: "导入失败",
  ENCRYPTION_FAILED: "加密失败",
  DECRYPTION_FAILED: "解密失败",
};

// 成功消息
export const SUCCESS_MESSAGES = {
  CONNECTION_SUCCESS: "连接成功",
  SAVE_SUCCESS: "保存成功",
  DELETE_SUCCESS: "删除成功",
  EXPORT_SUCCESS: "导出成功",
  IMPORT_SUCCESS: "导入成功",
  COPY_SUCCESS: "复制成功",
};

// 确认消息
export const CONFIRM_MESSAGES = {
  DELETE_CONNECTION: "确定要删除这个连接吗？",
  DELETE_GROUP: "确定要删除这个分组及其所有连接吗？",
  CLEAR_ALL: "确定要清空所有连接吗？",
  OVERWRITE_IMPORT: "导入的数据将覆盖现有数据，确定继续吗？",
};

// 文件过滤器（用于文件对话框）
export const FILE_FILTERS = {
  JSON: [{ name: "JSON 文件", extensions: ["json"] }],
  CSV: [{ name: "CSV 文件", extensions: ["csv"] }],
  ALL: [{ name: "所有文件", extensions: ["*"] }],
};

// 快捷键
export const SHORTCUTS = {
  NEW_CONNECTION: "Ctrl+N",
  NEW_GROUP: "Ctrl+Shift+N",
  SAVE: "Ctrl+S",
  DELETE: "Delete",
  COPY: "Ctrl+C",
  PASTE: "Ctrl+V",
  SEARCH: "Ctrl+F",
  REFRESH: "F5",
  SETTINGS: "Ctrl+,",
  EXPORT: "Ctrl+E",
  IMPORT: "Ctrl+I",
};

// 支持的远程连接客户端
export const SUPPORTED_CLIENTS = {
  RDP: [
    { name: "MSTSC", executable: "mstsc", description: "Windows 远程桌面连接" },
  ],
  SSH: [
    { name: "Xshell", executable: "xshell", description: "NetSarang Xshell" },
    {
      name: "SecureCRT",
      executable: "securecrt",
      description: "VanDyke SecureCRT",
    },
    { name: "PuTTY", executable: "putty", description: "PuTTY SSH客户端" },
    { name: "KiTTY", executable: "kitty", description: "KiTTY SSH客户端" },
    { name: "OpenSSH", executable: "ssh", description: "系统自带SSH客户端" },
  ],
  VNC: [
    {
      name: "Radmin Viewer",
      executable: "radmin",
      description: "Radmin 远程控制",
    },
    {
      name: "VNC Viewer",
      executable: "vncviewer",
      description: "通用VNC客户端",
    },
    {
      name: "RealVNC",
      executable: "realvnc-vncviewer",
      description: "RealVNC Viewer",
    },
    {
      name: "TightVNC",
      executable: "tightvnc-vncviewer",
      description: "TightVNC Viewer",
    },
    {
      name: "UltraVNC",
      executable: "ultravnc",
      description: "UltraVNC Viewer",
    },
    {
      name: "TurboVNC",
      executable: "turbovnc",
      description: "TurboVNC Viewer",
    },
  ],
  FTP: [
    { name: "Xftp", executable: "xftp", description: "NetSarang Xftp" },
    {
      name: "WinSCP",
      executable: "winscp",
      description: "WinSCP FTP/SFTP客户端",
    },
    {
      name: "FileZilla",
      executable: "filezilla",
      description: "FileZilla FTP客户端",
    },
    { name: "FTP", executable: "ftp", description: "系统自带FTP客户端" },
  ],
  TELNET: [
    {
      name: "Telnet",
      executable: "telnet",
      description: "系统自带Telnet客户端",
    },
  ],
};

// 客户端优先级（数字越小优先级越高）
export const CLIENT_PRIORITY = {
  // RDP客户端
  mstsc: 1,

  // SSH客户端
  xshell: 1,
  securecrt: 2,
  putty: 3,
  kitty: 4,
  ssh: 5,

  // VNC客户端
  radmin: 1,
  vncviewer: 2,
  "realvnc-vncviewer": 3,
  "tightvnc-vncviewer": 4,
  ultravnc: 5,
  turbovnc: 6,

  // FTP客户端
  xftp: 1,
  winscp: 2,
  filezilla: 3,
  ftp: 4,
};
