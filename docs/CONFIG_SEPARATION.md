# 配置文件分离实现

## 🎯 问题描述

用户在本地安装了打包后的生产版本，同时还在运行开发版本的代码。两个版本共享了同一个配置文件存储位置，导致配置冲突。

## 🔧 解决方案

实现了智能的环境检测机制，让开发版本和生产版本使用不同的数据目录，避免配置文件冲突。

## 📁 数据目录分离

### 目录结构对比

#### **生产环境（安装版）**
```
C:\Users\[用户名]\AppData\Roaming\remote-management\
├── connections.json          # 连接配置
├── settings.json            # 应用设置
└── temp\                    # 临时文件
    └── temp_rdp_*.rdp      # 临时RDP文件
```

#### **开发环境（代码运行）**
```
C:\Users\[用户名]\AppData\Roaming\remote-management-dev\
├── connections.json          # 开发环境连接配置
├── settings.json            # 开发环境应用设置
└── temp\                    # 开发环境临时文件
    └── temp_rdp_*.rdp      # 开发环境临时RDP文件
```

### 分离效果
- ✅ **生产版本**：使用 `remote-management` 目录
- ✅ **开发版本**：使用 `remote-management-dev` 目录
- ✅ **完全隔离**：两个版本的配置互不影响
- ✅ **独立管理**：可以分别配置不同的连接和设置

## 🔍 环境检测机制

### 多重检测方法

#### **1. URL检测（主要方法）**
```typescript
// 检查URL是否包含localhost或开发端口
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname.includes('localhost');

// 检查端口是否为开发端口
const devPorts = ['5173', '3000', '8080', '8081', '9000'];
const isDevPort = devPorts.includes(window.location.port);

if (isLocalhost && isDevPort) {
  return true; // 开发环境
}
```

#### **2. Node.js环境变量检测**
```typescript
if (typeof process !== 'undefined' && process.env) {
  return process.env.NODE_ENV === 'development';
}
```

#### **3. Vite环境标识检测**
```typescript
if (typeof import.meta !== 'undefined' && import.meta.env) {
  return import.meta.env.DEV === true;
}
```

#### **4. 用户代理检测**
```typescript
if (typeof navigator !== 'undefined') {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Electron') && userAgent.includes('dev')) {
    return true; // 开发环境的Electron
  }
}
```

### 检测逻辑
```typescript
private isDevelopmentMode(): boolean {
  try {
    // 多重检测方法
    // 1. URL检测（localhost + 开发端口）
    // 2. Node.js环境变量检测
    // 3. Vite环境标识检测
    // 4. 用户代理检测
    
    // 任何一种方法检测到开发环境就返回true
    // 默认为生产环境（安全策略）
    return false;
  } catch (error) {
    console.warn("检测开发环境时出错，默认为生产环境:", error);
    return false;
  }
}
```

## 🚀 实现细节

### 存储服务初始化

#### **修改前（冲突版本）**
```typescript
public async initialize(): Promise<void> {
  if (window.electronAPI) {
    this.dataPath = await window.electronAPI.getUserDataPath();
    // 所有版本都使用同一个目录 ❌
  } else {
    this.dataPath = "localStorage";
  }
}
```

#### **修改后（分离版本）**
```typescript
public async initialize(): Promise<void> {
  if (window.electronAPI) {
    const baseDataPath = await window.electronAPI.getUserDataPath();
    
    // 检查是否为开发环境
    const isDevelopment = this.isDevelopmentMode();
    
    if (isDevelopment) {
      // 开发环境使用单独的子目录
      this.dataPath = baseDataPath + "-dev";
      console.log("检测到开发环境，使用开发专用数据目录:", this.dataPath);
    } else {
      // 生产环境使用标准目录
      this.dataPath = baseDataPath;
      console.log("检测到生产环境，使用标准数据目录:", this.dataPath);
    }
  } else {
    // 浏览器环境使用localStorage
    this.dataPath = "localStorage";
    console.log("检测到浏览器环境，使用localStorage");
  }
}
```

### 日志输出示例

#### **开发环境启动日志**
```
检测到开发环境，使用开发专用数据目录: C:\Users\[用户名]\AppData\Roaming\remote-management-dev
存储服务初始化完成，数据路径: C:\Users\[用户名]\AppData\Roaming\remote-management-dev
```

#### **生产环境启动日志**
```
检测到生产环境，使用标准数据目录: C:\Users\[用户名]\AppData\Roaming\remote-management
存储服务初始化完成，数据路径: C:\Users\[用户名]\AppData\Roaming\remote-management
```

## 🎯 使用场景

### 典型使用情况

#### **场景1：开发者同时使用两个版本**
- **生产版本**：日常使用，存储真实的服务器连接
- **开发版本**：测试新功能，使用测试服务器连接
- **效果**：两个版本的配置完全独立，互不干扰

#### **场景2：团队开发**
- **每个开发者**：都有自己的开发环境配置
- **生产部署**：使用统一的生产环境配置
- **效果**：开发和生产环境配置分离，避免误操作

#### **场景3：功能测试**
- **稳定版本**：保持现有配置不变
- **测试版本**：可以安全地测试新功能
- **效果**：测试不会影响正常使用

## 🔒 安全特性

### 数据隔离
- ✅ **完全分离**：开发和生产数据完全独立
- ✅ **误操作防护**：开发环境的操作不会影响生产数据
- ✅ **配置安全**：敏感的生产配置不会被开发环境覆盖

### 默认策略
- ✅ **安全优先**：检测失败时默认为生产环境
- ✅ **向后兼容**：现有的生产安装不受影响
- ✅ **渐进升级**：可以逐步迁移到新的分离机制

## 📋 验证方法

### 检查数据目录

#### **1. 查看控制台日志**
打开开发者工具，查看控制台输出：
```
检测到开发环境，使用开发专用数据目录: C:\Users\...\remote-management-dev
```

#### **2. 检查文件系统**
在文件资源管理器中查看：
```
%APPDATA%\remote-management\      # 生产版本
%APPDATA%\remote-management-dev\  # 开发版本
```

#### **3. 测试配置独立性**
1. 在开发版本中创建测试连接
2. 在生产版本中检查是否存在该连接
3. 确认两个版本的配置完全独立

### 环境检测验证

#### **开发环境特征**
- URL包含 `localhost:5173`
- 控制台显示 "检测到开发环境"
- 数据目录包含 `-dev` 后缀

#### **生产环境特征**
- 运行在Electron应用中
- 控制台显示 "检测到生产环境"
- 数据目录为标准路径

## 🔄 迁移指南

### 现有用户迁移

#### **自动迁移**
- ✅ **生产版本**：继续使用原有配置，无需任何操作
- ✅ **开发版本**：自动使用新的开发目录，从空配置开始

#### **手动迁移（可选）**
如果需要将现有配置复制到开发环境：
1. 复制 `%APPDATA%\remote-management\connections.json`
2. 粘贴到 `%APPDATA%\remote-management-dev\connections.json`
3. 复制 `%APPDATA%\remote-management\settings.json`
4. 粘贴到 `%APPDATA%\remote-management-dev\settings.json`

### 团队协作

#### **开发环境同步**
- 每个开发者都有独立的开发配置
- 可以通过代码仓库共享默认配置模板
- 敏感信息（如密码）仍然本地存储

## 🎊 总结

### 解决的问题
- ✅ **配置冲突**：开发和生产版本不再共享配置
- ✅ **数据安全**：生产数据不会被开发环境影响
- ✅ **开发体验**：可以安全地测试新功能
- ✅ **部署简化**：生产部署不受开发环境影响

### 技术优势
- ✅ **智能检测**：多重方法确保环境检测准确性
- ✅ **向后兼容**：现有安装不受影响
- ✅ **安全默认**：检测失败时默认为生产环境
- ✅ **清晰日志**：详细的环境检测和路径日志

### 用户价值
- ✅ **无缝使用**：用户无需手动配置
- ✅ **数据保护**：重要配置不会被意外覆盖
- ✅ **灵活开发**：开发者可以安全地测试功能
- ✅ **专业体验**：类似企业级软件的环境管理

**现在开发版本和生产版本的配置完全分离，不会再发生冲突！** 🎉
