import { ConnectionType, AppSettings } from '@/types/connection';

// 应用常量
export const APP_NAME = '远程管理系统';
export const APP_VERSION = '1.0.0';
export const DATA_FILE_NAME = 'connections.json';
export const SETTINGS_FILE_NAME = 'settings.json';
export const BACKUP_DIR_NAME = 'backups';

// 加密相关常量
export const ENCRYPTION_KEY_LENGTH = 32;
export const ENCRYPTION_IV_LENGTH = 16;
export const ENCRYPTION_ALGORITHM = 'AES';

// 默认应用设置
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'auto',
  language: 'zh-CN',
  autoSave: true,
  confirmBeforeDelete: true,
  showConnectionCount: true,
  defaultConnectionType: ConnectionType.SSH,
  encryptionEnabled: true,
  backupEnabled: true,
  backupInterval: 24 // 24小时
};

// 支持的文件扩展名
export const SUPPORTED_EXPORT_FORMATS = [
  { label: 'JSON 文件', value: 'json', extension: '.json' },
  { label: 'CSV 文件', value: 'csv', extension: '.csv' }
];

// 主题选项
export const THEME_OPTIONS = [
  { label: '浅色主题', value: 'light' },
  { label: '深色主题', value: 'dark' },
  { label: '跟随系统', value: 'auto' }
];

// 语言选项
export const LANGUAGE_OPTIONS = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
];

// 连接类型选项
export const CONNECTION_TYPE_OPTIONS = [
  { label: 'Remote Desktop (RDP)', value: ConnectionType.RDP, icon: 'Monitor' },
  { label: 'SSH', value: ConnectionType.SSH, icon: 'Terminal' },
  { label: 'VNC', value: ConnectionType.VNC, icon: 'View' },
  { label: 'Telnet', value: ConnectionType.TELNET, icon: 'ChatLineSquare' },
  { label: 'FTP', value: ConnectionType.FTP, icon: 'Folder' },
  { label: 'SFTP', value: ConnectionType.SFTP, icon: 'FolderOpened' }
];

// RDP 分辨率选项
export const RDP_RESOLUTION_OPTIONS = [
  { label: '800x600', value: '800x600' },
  { label: '1024x768', value: '1024x768' },
  { label: '1280x720', value: '1280x720' },
  { label: '1280x1024', value: '1280x1024' },
  { label: '1366x768', value: '1366x768' },
  { label: '1440x900', value: '1440x900' },
  { label: '1600x900', value: '1600x900' },
  { label: '1680x1050', value: '1680x1050' },
  { label: '1920x1080', value: '1920x1080' },
  { label: '1920x1200', value: '1920x1200' },
  { label: '2560x1440', value: '2560x1440' },
  { label: '全屏', value: 'fullscreen' }
];

// RDP 颜色深度选项
export const RDP_COLOR_DEPTH_OPTIONS = [
  { label: '15位 (32K色)', value: 15 },
  { label: '16位 (64K色)', value: 16 },
  { label: '24位 (1600万色)', value: 24 },
  { label: '32位 (真彩色)', value: 32 }
];

// SSH 终端类型选项
export const SSH_TERMINAL_TYPE_OPTIONS = [
  { label: 'xterm', value: 'xterm' },
  { label: 'xterm-256color', value: 'xterm-256color' },
  { label: 'vt100', value: 'vt100' },
  { label: 'vt220', value: 'vt220' },
  { label: 'linux', value: 'linux' }
];

// 编码选项
export const ENCODING_OPTIONS = [
  { label: 'UTF-8', value: 'utf-8' },
  { label: 'GBK', value: 'gbk' },
  { label: 'GB2312', value: 'gb2312' },
  { label: 'ASCII', value: 'ascii' },
  { label: 'ISO-8859-1', value: 'iso-8859-1' }
];

// VNC 压缩级别选项
export const VNC_COMPRESSION_OPTIONS = [
  { label: '无压缩', value: 0 },
  { label: '最快', value: 1 },
  { label: '快速', value: 3 },
  { label: '平衡', value: 6 },
  { label: '最佳', value: 9 }
];

// VNC 质量选项
export const VNC_QUALITY_OPTIONS = [
  { label: '最低', value: 0 },
  { label: '低', value: 3 },
  { label: '中等', value: 6 },
  { label: '高', value: 8 },
  { label: '最高', value: 9 }
];

// 常用标签
export const COMMON_TAGS = [
  '生产环境',
  '测试环境',
  '开发环境',
  '数据库',
  '服务器',
  '工作站',
  '重要',
  '临时',
  '备份'
];

// 错误消息
export const ERROR_MESSAGES = {
  INVALID_HOST: '请输入有效的主机地址',
  INVALID_PORT: '端口号必须在1-65535之间',
  INVALID_USERNAME: '请输入用户名',
  INVALID_PASSWORD: '请输入密码',
  CONNECTION_FAILED: '连接失败',
  SAVE_FAILED: '保存失败',
  LOAD_FAILED: '加载失败',
  DELETE_FAILED: '删除失败',
  EXPORT_FAILED: '导出失败',
  IMPORT_FAILED: '导入失败',
  ENCRYPTION_FAILED: '加密失败',
  DECRYPTION_FAILED: '解密失败'
};

// 成功消息
export const SUCCESS_MESSAGES = {
  CONNECTION_SUCCESS: '连接成功',
  SAVE_SUCCESS: '保存成功',
  DELETE_SUCCESS: '删除成功',
  EXPORT_SUCCESS: '导出成功',
  IMPORT_SUCCESS: '导入成功',
  COPY_SUCCESS: '复制成功'
};

// 确认消息
export const CONFIRM_MESSAGES = {
  DELETE_CONNECTION: '确定要删除这个连接吗？',
  DELETE_GROUP: '确定要删除这个分组及其所有连接吗？',
  CLEAR_ALL: '确定要清空所有连接吗？',
  OVERWRITE_IMPORT: '导入的数据将覆盖现有数据，确定继续吗？'
};

// 文件过滤器（用于文件对话框）
export const FILE_FILTERS = {
  JSON: [{ name: 'JSON 文件', extensions: ['json'] }],
  CSV: [{ name: 'CSV 文件', extensions: ['csv'] }],
  ALL: [{ name: '所有文件', extensions: ['*'] }]
};

// 快捷键
export const SHORTCUTS = {
  NEW_CONNECTION: 'Ctrl+N',
  NEW_GROUP: 'Ctrl+Shift+N',
  SAVE: 'Ctrl+S',
  DELETE: 'Delete',
  COPY: 'Ctrl+C',
  PASTE: 'Ctrl+V',
  SEARCH: 'Ctrl+F',
  REFRESH: 'F5',
  SETTINGS: 'Ctrl+,',
  EXPORT: 'Ctrl+E',
  IMPORT: 'Ctrl+I'
};
