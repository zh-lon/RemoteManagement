# RDP连接实现指南

## 问题说明

根据微软官方文档，`mstsc`（Microsoft Terminal Services Client）不能直接通过命令行参数传递用户名和密码。这是出于安全考虑的设计。

## 官方文档参考

- [Microsoft Learn - mstsc 命令](https://learn.microsoft.com/zh-cn/windows-server/administration/windows-commands/mstsc)

## 支持的mstsc参数

### ✅ 支持的参数
```bash
mstsc /v:server[:port]          # 指定远程计算机和端口
mstsc /admin                    # 连接到管理会话
mstsc /f                        # 全屏模式启动
mstsc /w:width /h:height        # 指定窗口宽度和高度
mstsc /public                   # 在公共模式下运行
mstsc /span                     # 跨多个监视器
mstsc /multimon                 # 配置多监视器布局
mstsc /edit:filename.rdp        # 编辑RDP文件
mstsc filename.rdp              # 使用RDP文件连接
```

### ❌ 不支持的参数
```bash
mstsc /u:username               # ❌ 不支持用户名参数
mstsc /p:password               # ❌ 不支持密码参数
mstsc /domain:domain            # ❌ 不支持域名参数
```

## 正确的实现方式

### 方案1：使用RDP文件（推荐）

创建临时的`.rdp`文件，包含连接配置，然后使用`mstsc filename.rdp`启动。

#### RDP文件格式示例
```ini
screen mode id:i:2
use multimon:i:0
desktopwidth:i:1920
desktopheight:i:1080
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
full address:s:192.168.1.100:3389
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
kdcproxyname:s:
username:s:administrator
domain:s:
```

#### 实现代码
```typescript
/**
 * 创建RDP配置文件
 */
private async createRDPFile(connection: RDPConnection): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const fileName = `temp_rdp_${timestamp}.rdp`;
    
    // 构建RDP文件内容
    let rdpContent = `screen mode id:i:2
use multimon:i:0
desktopwidth:i:1024
desktopheight:i:768
session bpp:i:32
compression:i:1
keyboardhook:i:2
full address:s:${connection.host}:${connection.port}
audiomode:i:0
redirectprinters:i:1
redirectclipboard:i:1
autoreconnection enabled:i:1
authentication level:i:2
prompt for credentials:i:0`;

    // 添加用户名（如果提供）
    if (connection.username) {
      rdpContent += `\nusername:s:${connection.username}`;
    }

    // 添加域名（如果提供）
    if (connection.domain) {
      rdpContent += `\ndomain:s:${connection.domain}`;
    }

    // 保存RDP文件
    const result = await window.electronAPI?.writeFile('temp', fileName, rdpContent);
    if (result?.success) {
      const userDataPath = await window.electronAPI?.getUserDataPath();
      return `${userDataPath}/temp/${fileName}`;
    }

    return null;
  } catch (error) {
    console.error('创建RDP文件失败:', error);
    return null;
  }
}

/**
 * 连接RDP
 */
private async connectRDP(connection: RDPConnection): Promise<OperationResult> {
  try {
    // 创建临时RDP文件
    const rdpFilePath = await this.createRDPFile(connection);
    if (!rdpFilePath) {
      return {
        success: false,
        error: "创建RDP配置文件失败",
      };
    }

    // 使用RDP文件启动连接
    const result = await window.electronAPI?.launchProgram(
      "mstsc.exe",
      [rdpFilePath]
    );

    if (result?.success) {
      return {
        success: true,
        message: "RDP连接已启动",
      };
    } else {
      return {
        success: false,
        error: "RDP启动失败",
        message: result?.error,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: "RDP连接失败",
      message: (error as Error).message,
    };
  }
}
```

### 方案2：仅传递主机地址

如果不需要预设用户名，可以只传递主机地址，让用户在连接时手动输入凭据。

```typescript
// 简化的RDP连接
const result = await window.electronAPI?.launchProgram(
  "mstsc.exe",
  [`/v:${connection.host}:${connection.port}`]
);
```

### 方案3：使用第三方RDP客户端

考虑支持其他RDP客户端，它们可能支持命令行传递凭据：

#### Remote Desktop Manager
```bash
rdm.exe /host:192.168.1.100 /username:admin /password:pass123
```

#### FreeRDP
```bash
xfreerdp /v:192.168.1.100:3389 /u:admin /p:pass123
```

#### Remmina (Linux)
```bash
remmina -c rdp://admin:pass123@192.168.1.100:3389
```

## RDP文件参数说明

### 基本连接参数
- `full address:s:host:port` - 服务器地址和端口
- `username:s:username` - 用户名
- `domain:s:domain` - 域名

### 显示设置
- `screen mode id:i:2` - 全屏模式 (1=窗口, 2=全屏)
- `desktopwidth:i:1920` - 桌面宽度
- `desktopheight:i:1080` - 桌面高度
- `session bpp:i:32` - 颜色深度 (8, 15, 16, 24, 32)

### 资源重定向
- `redirectclipboard:i:1` - 剪贴板重定向 (0=禁用, 1=启用)
- `redirectprinters:i:1` - 打印机重定向
- `redirectdrives:i:1` - 驱动器重定向
- `redirectcomports:i:1` - COM端口重定向
- `redirectsmartcards:i:1` - 智能卡重定向

### 音频设置
- `audiomode:i:0` - 音频模式 (0=本地播放, 1=远程播放, 2=禁用)
- `audiocapturemode:i:0` - 音频捕获模式

### 性能设置
- `compression:i:1` - 启用压缩
- `disable wallpaper:i:1` - 禁用壁纸
- `disable full window drag:i:1` - 禁用完整窗口拖拽
- `disable menu anims:i:1` - 禁用菜单动画
- `disable themes:i:1` - 禁用主题

### 安全设置
- `authentication level:i:2` - 身份验证级别
- `prompt for credentials:i:0` - 提示输入凭据
- `negotiate security layer:i:1` - 协商安全层

## 实现建议

### 1. 用户体验优化
- **预填用户名**：在RDP文件中包含用户名，减少用户输入
- **记住凭据**：利用Windows凭据管理器存储密码
- **快速连接**：提供"仅主机地址"的快速连接选项

### 2. 安全考虑
- **临时文件清理**：连接后删除临时RDP文件
- **密码保护**：不在RDP文件中明文存储密码
- **权限控制**：确保临时文件的访问权限

### 3. 错误处理
- **文件创建失败**：提供备用连接方案
- **权限不足**：指导用户解决权限问题
- **网络连接**：提供网络诊断建议

## 配置更新

### 更新前的错误配置
```typescript
mstsc: {
  name: "远程桌面连接",
  executable: "mstsc",
  path: "mstsc.exe",
  enabled: true,
  arguments: "/v:{host}:{port} /u:{username} /p:{password}", // ❌ 错误
}
```

### 更新后的正确配置
```typescript
mstsc: {
  name: "远程桌面连接",
  executable: "mstsc",
  path: "mstsc.exe",
  enabled: true,
  arguments: "/v:{host}:{port}", // ✅ 正确
}
```

## 总结

1. **mstsc不支持命令行传递用户名密码**
2. **使用RDP文件是最佳实践**
3. **可以预设用户名，密码由用户输入**
4. **考虑支持第三方RDP客户端**
5. **注意临时文件的安全性和清理**

这种实现方式既符合微软的安全设计，又能提供良好的用户体验。
