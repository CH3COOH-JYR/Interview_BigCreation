# 日志清理系统使用说明

## 概述

这是一个完整的前后端日志管理和清理系统，支持自动和手动清理、日志轮转、备份、压缩等功能。

## 功能特性

### 🧹 主要功能
- **自动清理**: 按时间和大小自动清理日志文件
- **日志轮转**: 当文件过大时自动轮转到新文件
- **备份机制**: 清理前自动备份重要日志
- **压缩支持**: 支持gzip、bzip2、xz压缩格式
- **定时任务**: 支持cron定时自动执行
- **实时监控**: 实时监控日志文件大小和状态
- **API接口**: 提供REST API用于程序化管理
- **Web界面**: (可选) 通过前端界面管理

### 📊 监控指标
- 文件大小监控
- 文件数量统计
- 清理历史记录
- 错误日志跟踪
- 备份状态监控

## 系统组件

```
logs/
├── frontend.log          # 前端日志文件
├── backend.log           # 后端日志文件
├── backups/              # 自动备份目录
│   ├── frontend.log.*.bak
│   └── backend.log.*.bak
└── manual_backups/       # 手动备份目录

scripts/
├── log_cleanup.sh        # 基础清理脚本
├── log_manager.sh        # 完整管理工具
└── log_config.conf       # 配置文件

backend/
├── services/
│   └── logCleanupService.js  # Node.js服务
└── routes/
    └── logs.js           # API路由
```

## 安装和配置

### 1. 确保依赖安装

```bash
# 检查系统工具
which find stat date awk gzip

# Node.js依赖已包含在项目中
```

### 2. 配置文件设置

编辑 `scripts/log_config.conf`:

```bash
# 基本设置
RETAIN_DAYS=7              # 保留日志的天数
MAX_SIZE_MB=100            # 单个日志文件最大大小(MB)
BACKUP_COUNT=5             # 保留的备份文件数量

# 特定文件设置
FRONTEND_LOG_MAX_SIZE=50   # 前端日志文件最大大小(MB)
BACKEND_LOG_MAX_SIZE=100   # 后端日志文件最大大小(MB)

# 功能开关
ENABLE_SIZE_CHECK=true     # 是否启用文件大小检查
ENABLE_AGE_CHECK=true      # 是否启用文件时间检查
ENABLE_BACKUP=true         # 是否启用备份功能
ENABLE_COMPRESSION=false   # 是否压缩备份文件
```

## 使用方法

### 命令行工具

#### 1. 基础清理脚本

```bash
# 使用默认设置清理
./scripts/log_cleanup.sh

# 自定义参数清理
./scripts/log_cleanup.sh -d 3 -s 50

# 预览模式（不实际删除）
./scripts/log_cleanup.sh --dry-run

# 强制清理（不询问确认）
./scripts/log_cleanup.sh --force

# 详细输出
./scripts/log_cleanup.sh --verbose
```

#### 2. 完整管理工具

```bash
# 查看帮助
./scripts/log_manager.sh --help

# 查看日志状态
./scripts/log_manager.sh status

# 执行清理
./scripts/log_manager.sh cleanup

# 预览清理操作
./scripts/log_manager.sh cleanup --dry-run

# 手动轮转日志
./scripts/log_manager.sh rotate

# 创建备份
./scripts/log_manager.sh backup

# 实时监控
./scripts/log_manager.sh monitor

# 每5秒监控一次
./scripts/log_manager.sh monitor --interval 5

# 查看配置
./scripts/log_manager.sh config

# 设置定时任务
./scripts/log_manager.sh setup-cron --daily
```

### 定时任务设置

#### 1. 使用管理工具设置

```bash
# 每天凌晨2点执行
./scripts/log_manager.sh setup-cron --daily

# 每小时执行
./scripts/log_manager.sh setup-cron --hourly

# 每周执行
./scripts/log_manager.sh setup-cron --weekly

# 每月执行
./scripts/log_manager.sh setup-cron --monthly
```

#### 2. 手动设置cron

```bash
# 编辑crontab
crontab -e

# 添加以下行（每天凌晨2点执行）
0 2 * * * /path/to/scripts/log_manager.sh cleanup --force

# 查看当前定时任务
crontab -l
```

### API接口使用

#### 1. 集成到后端应用

在 `backend/app.js` 中添加路由：

```javascript
const logRoutes = require('./routes/logs');
app.use('/api/logs', logRoutes);
```

#### 2. API端点

```bash
# 获取日志状态
GET /api/logs/status

# 获取配置
GET /api/logs/config

# 更新配置
PUT /api/logs/config

# 手动清理
POST /api/logs/cleanup

# 获取统计信息
GET /api/logs/stats

# 设置定时清理
POST /api/logs/schedule

# 下载日志文件
GET /api/logs/download/:filename

# 删除日志文件
DELETE /api/logs/:filename

# 手动备份
POST /api/logs/backup

# 手动轮转
POST /api/logs/rotate

# 健康检查
GET /api/logs/health
```

#### 3. API使用示例

```javascript
// 获取日志状态
fetch('/api/logs/status')
  .then(response => response.json())
  .then(data => console.log(data));

// 手动触发清理
fetch('/api/logs/cleanup', { method: 'POST' })
  .then(response => response.json())
  .then(data => console.log(data));

// 更新配置
fetch('/api/logs/config', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    retainDays: 5,
    maxSizeMB: 80,
    enableCompression: true
  })
});
```

## 监控和维护

### 1. 日志状态检查

```bash
# 查看详细状态
./scripts/log_manager.sh status

# 实时监控
./scripts/log_manager.sh monitor
```

### 2. 健康检查

```bash
# 通过API检查
curl http://localhost:5000/api/logs/health

# 检查清理统计
curl http://localhost:5000/api/logs/stats
```

### 3. 备份管理

```bash
# 查看备份文件
ls -la logs/backups/

# 手动创建备份
./scripts/log_manager.sh backup

# 通过API备份
curl -X POST http://localhost:5000/api/logs/backup \
  -H "Content-Type: application/json" \
  -d '{"files": ["frontend.log", "backend.log"]}'
```

## 故障排除

### 常见问题

1. **权限问题**
   ```bash
   # 确保脚本有执行权限
   chmod +x scripts/log_manager.sh
   
   # 确保日志目录可写
   chmod 755 logs/
   ```

2. **磁盘空间不足**
   ```bash
   # 强制清理释放空间
   ./scripts/log_manager.sh cleanup --force
   
   # 检查磁盘使用情况
   df -h
   ```

3. **定时任务未执行**
   ```bash
   # 检查cron服务状态
   systemctl status cron
   
   # 查看cron日志
   grep CRON /var/log/syslog
   ```

4. **备份失败**
   ```bash
   # 检查备份目录权限
   ls -la logs/backups/
   
   # 手动测试备份
   ./scripts/log_manager.sh backup --dry-run
   ```

### 调试模式

```bash
# 启用详细输出
./scripts/log_manager.sh cleanup --verbose

# 使用预览模式
./scripts/log_manager.sh cleanup --dry-run

# 检查配置
./scripts/log_manager.sh config
```

## 性能优化

### 1. 配置优化

```conf
# 针对高频日志应用的优化配置
RETAIN_DAYS=3
MAX_SIZE_MB=50
FRONTEND_LOG_MAX_SIZE=20
BACKEND_LOG_MAX_SIZE=30
ENABLE_COMPRESSION=true
ROTATION_SIZE_MB=25
```

### 2. 定时策略

- **高频应用**: 每6小时清理一次
- **中频应用**: 每天清理一次
- **低频应用**: 每周清理一次

### 3. 存储优化

- 启用压缩功能减少存储空间
- 定期清理旧备份文件
- 考虑将日志存储到独立分区

## 安全考虑

1. **文件权限**: 确保日志文件和脚本的适当权限
2. **路径安全**: API接口验证文件名防止路径遍历
3. **访问控制**: 限制API接口的访问权限
4. **备份加密**: 考虑对重要日志备份进行加密

## 扩展功能

### 1. 邮件通知

可以扩展脚本添加邮件通知功能：

```bash
# 在配置文件中启用
ENABLE_EMAIL_NOTIFICATION=true
EMAIL_RECIPIENT="admin@example.com"
```

### 2. 日志分析

集成日志分析工具：

```bash
# 错误统计
grep "ERROR" logs/backend.log | wc -l

# 最新错误
tail -n 100 logs/backend.log | grep "ERROR"
```

### 3. 远程存储

支持将备份上传到云存储：

```bash
# 示例：上传到AWS S3
aws s3 cp logs/backups/ s3://my-log-backups/ --recursive
```

## 总结

这个日志清理系统提供了完整的日志管理解决方案，包括：

- ✅ 自动化清理和维护
- ✅ 多种清理策略支持
- ✅ 完整的备份机制
- ✅ 实时监控能力
- ✅ 程序化API接口
- ✅ 灵活的配置选项
- ✅ 详细的日志记录

通过合理配置和使用，可以有效管理应用日志，防止磁盘空间问题，同时保证重要日志的安全性。 