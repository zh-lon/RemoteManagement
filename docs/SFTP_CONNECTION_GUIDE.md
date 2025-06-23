# SSH连接的SFTP功能使用指南

## 功能概述

为SSH连接类型添加了SFTP连接方法，允许用户在SSH连接的基础上快速启动SFTP文件传输客户端。

## 功能特性

### ✅ 支持的SFTP客户端
- **Xftp** - NetSarang Xftp (优先级最高)
- **WinSCP** - 免费的SFTP/SCP客户端
- **FileZilla** - 开源FTP/SFTP客户端

### ✅ 自动配置转换
- 自动将SSH连接配置转换为SFTP连接配置
- 保持相同的主机、端口、用户名、密码
- 自动设置SFTP协议类型
- 默认初始路径为根目录 "/"

### ✅ 智能客户端选择
- 按优先级自动选择可用的SFTP客户端
- 如果首选客户端不可用，自动尝试下一个
- 提供详细的错误信息和配置建议

## 使用方法

### 步骤1：配置SFTP客户端
1. **打开设置** → **工具** → **设置** → **客户端配置**
2. **配置至少一个SFTP客户端**：

#### Xftp配置示例
```
客户端名称: Xftp
可执行文件路径: C:\Program Files (x86)\NetSarang\Xftp 7\Xftp.exe
参数模板: -url {protocol}://{username}:{password}@{host}:{port} -dir {initialpath}
启用状态: ✅ 启用
```

#### WinSCP配置示例
```
客户端名称: WinSCP
可执行文件路径: C:\Program Files (x86)\WinSCP\WinSCP.exe
参数模板: {protocol}://{username}:{password}@{host}:{port}/{initialpath}
启用状态: ✅ 启用
```

#### FileZilla配置示例
```
客户端名称: FileZilla
可执行文件路径: C:\Program Files\FileZilla FTP Client\filezilla.exe
参数模板: --site=0/{protocol}://{username}:{password}@{host}:{port}
启用状态: ✅ 启用
```

### 步骤2：使用SFTP连接
1. **选择SSH连接** - 在左侧树形菜单中选择一个SSH连接
2. **查看连接详情** - 右侧面板显示连接详细信息
3. **点击SFTP按钮** - 在操作按钮区域点击绿色的"SFTP"按钮
4. **自动启动客户端** - 系统会自动启动配置的SFTP客户端

## 参数模板变量

### 通用变量
- `{host}` - 主机地址
- `{port}` - 端口号
- `{username}` - 用户名
- `{password}` - 密码
- `{protocol}` - 协议类型 (sftp)
- `{initialpath}` - 初始路径 (默认为 "/")

### SSH特有变量
- `{privatekey}` - 私钥文件路径 (如果使用私钥认证)
- `{compression}` - 压缩选项 (如果启用压缩)

## 工作原理

### 配置转换过程
```typescript
// 原始SSH连接
const sshConnection = {
  type: "ssh",
  host: "192.168.1.100",
  port: 22,
  username: "admin",
  password: "password123",
  encoding: "UTF-8"
}

// 自动转换为SFTP连接
const sftpConnection = {
  type: "sftp",           // 协议类型改为SFTP
  host: "192.168.1.100",  // 保持相同
  port: 22,               // 保持相同
  username: "admin",      // 保持相同
  password: "password123", // 保持相同
  passiveMode: false,     // SFTP不使用被动模式
  encoding: "UTF-8",      // 保持相同
  initialPath: "/"        // 默认根目录
}
```

### 客户端启动流程
1. **检查SSH连接类型** - 确认选中的是SSH连接
2. **转换连接配置** - 将SSH配置转换为SFTP配置
3. **查找可用客户端** - 按优先级查找已配置的SFTP客户端
4. **解析参数模板** - 使用连接信息替换参数模板中的变量
5. **启动客户端程序** - 调用Electron API启动外部程序
6. **显示结果反馈** - 显示成功或失败消息

## 错误处理

### 常见错误及解决方案

#### 错误1：未找到可用的SFTP客户端
```
错误信息: "未找到可用的SFTP客户端，请在设置中配置Xftp、WinSCP或FileZilla客户端路径"

解决方案:
1. 打开设置 → 客户端配置
2. 配置至少一个SFTP客户端的路径
3. 确保客户端程序已安装
4. 确保路径正确且文件存在
```

#### 错误2：客户端启动失败
```
错误信息: "Xftp启动失败"

解决方案:
1. 检查客户端路径是否正确
2. 检查参数模板是否正确
3. 确保客户端程序有执行权限
4. 查看控制台日志获取详细错误信息
```

#### 错误3：连接参数错误
```
错误信息: 客户端启动但无法连接

解决方案:
1. 检查SSH连接的主机、端口、用户名、密码是否正确
2. 确保SFTP服务在目标主机上已启用
3. 检查防火墙设置
4. 验证SSH连接本身是否正常工作
```

## 调试信息

### 控制台日志
启动SFTP连接时，控制台会输出详细的调试信息：

```javascript
// 连接开始
"开始SFTP连接:" {连接配置}

// 客户端选择
"使用 Xftp 启动SFTP连接"

// 参数解析
"启动客户端: Xftp"
"可执行文件路径: C:\Program Files (x86)\NetSarang\Xftp 7\Xftp.exe"
"参数模板: -url {protocol}://{username}:{password}@{host}:{port}"
"解析后的参数: ['-url', 'sftp://admin:password123@192.168.1.100:22']"

// 连接结果
"SFTP连接结果:" {success: true, message: "SFTP连接已启动 (Xftp)"}
```

## 最佳实践

### 1. 客户端配置建议
- **优先配置Xftp** - 功能最全面，参数支持最好
- **备用配置WinSCP** - 免费且稳定
- **最后配置FileZilla** - 开源选择

### 2. 安全考虑
- **避免在参数模板中明文显示密码** - 系统会自动处理密码传递
- **使用私钥认证** - 比密码认证更安全
- **定期更新客户端程序** - 确保安全性

### 3. 性能优化
- **启用压缩** - 在SSH连接配置中启用压缩可提高传输速度
- **选择合适的初始路径** - 可以在客户端配置中自定义初始路径

## 技术实现

### 核心代码结构
```typescript
// 连接服务中的SFTP方法
public async connectSftp(sshConnection: SSHConnection): Promise<OperationResult>

// 连接详情组件中的处理方法
const handleSftpConnect = async () => { ... }

// 参数模板解析
private parseArguments(template: string, connection: ConnectionItem): string[]
```

### 支持的参数模板格式
- **Xftp格式**: `-url {protocol}://{username}:{password}@{host}:{port}`
- **WinSCP格式**: `{protocol}://{username}:{password}@{host}:{port}`
- **FileZilla格式**: `--site=0/{protocol}://{username}:{password}@{host}:{port}`

## 更新日志

### v1.0.0 (2025-06-23)
- ✅ 添加SSH连接的SFTP功能
- ✅ 支持Xftp、WinSCP、FileZilla客户端
- ✅ 自动配置转换和参数解析
- ✅ 智能客户端选择和错误处理
- ✅ 详细的调试信息和日志记录

## 后续计划

### 计划中的功能
- [ ] 支持更多SFTP客户端 (如MobaXterm、Termius)
- [ ] 添加SFTP连接历史记录
- [ ] 支持自定义SFTP连接配置
- [ ] 添加文件传输进度监控
- [ ] 支持SFTP连接的书签管理

---

**注意**: 此功能需要在Electron环境中运行，并且需要配置相应的SFTP客户端程序。
