const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const LogCleanupService = require('../services/logCleanupService');

// 创建日志清理服务实例
const logCleanupService = new LogCleanupService({
    // 可以在这里覆盖默认配置
    retainDays: 7,
    maxSizeMB: 100,
    frontendLogMaxSize: 50,
    backendLogMaxSize: 100,
    enableBackup: true,
    enableCompression: false
});

// 启动服务
logCleanupService.start();

/**
 * GET /api/logs/status
 * 获取日志状态
 */
router.get('/status', async (req, res) => {
    try {
        const status = await logCleanupService.getLogStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error getting log status:', error);
        res.status(500).json({
            success: false,
            message: '获取日志状态失败',
            error: error.message
        });
    }
});

/**
 * GET /api/logs/config
 * 获取当前配置
 */
router.get('/config', (req, res) => {
    try {
        res.json({
            success: true,
            data: logCleanupService.config
        });
    } catch (error) {
        console.error('Error getting log config:', error);
        res.status(500).json({
            success: false,
            message: '获取配置失败',
            error: error.message
        });
    }
});

/**
 * PUT /api/logs/config
 * 更新配置
 */
router.put('/config', (req, res) => {
    try {
        const newConfig = req.body;

        // 验证配置参数
        const allowedKeys = [
            'retainDays', 'maxSizeMB', 'backupCount', 'enableSizeCheck',
            'enableAgeCheck', 'enableBackup', 'enableCompression', 'compressionType',
            'enableRotation', 'rotationSizeMB', 'rotationCount',
            'frontendLogMaxSize', 'backendLogMaxSize'
        ];

        const validConfig = {};
        for (const key of allowedKeys) {
            if (newConfig.hasOwnProperty(key)) {
                validConfig[key] = newConfig[key];
            }
        }

        logCleanupService.updateConfig(validConfig);

        res.json({
            success: true,
            message: '配置更新成功',
            data: logCleanupService.config
        });
    } catch (error) {
        console.error('Error updating log config:', error);
        res.status(500).json({
            success: false,
            message: '更新配置失败',
            error: error.message
        });
    }
});

/**
 * POST /api/logs/cleanup
 * 手动触发日志清理
 */
router.post('/cleanup', async (req, res) => {
    try {
        const stats = await logCleanupService.triggerCleanup();

        res.json({
            success: true,
            message: '日志清理完成',
            data: stats
        });
    } catch (error) {
        console.error('Error performing log cleanup:', error);
        res.status(500).json({
            success: false,
            message: '日志清理失败',
            error: error.message
        });
    }
});

/**
 * GET /api/logs/stats
 * 获取清理统计信息
 */
router.get('/stats', (req, res) => {
    try {
        const stats = logCleanupService.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting log stats:', error);
        res.status(500).json({
            success: false,
            message: '获取统计信息失败',
            error: error.message
        });
    }
});

/**
 * POST /api/logs/schedule
 * 设置定期清理
 */
router.post('/schedule', (req, res) => {
    try {
        const { intervalHours = 24 } = req.body;

        // 验证参数
        if (typeof intervalHours !== 'number' || intervalHours < 1 || intervalHours > 168) {
            return res.status(400).json({
                success: false,
                message: '间隔时间必须是1-168小时之间的数字'
            });
        }

        logCleanupService.scheduleCleanup(intervalHours);

        res.json({
            success: true,
            message: `定时清理已设置，每${intervalHours}小时执行一次`,
            data: { intervalHours }
        });
    } catch (error) {
        console.error('Error scheduling log cleanup:', error);
        res.status(500).json({
            success: false,
            message: '设置定时清理失败',
            error: error.message
        });
    }
});

/**
 * GET /api/logs/download/:filename
 * 下载日志文件
 */
router.get('/download/:filename', async (req, res) => {
    try {
        const { filename } = req.params;

        // 验证文件名安全性
        if (!/^[a-zA-Z0-9._-]+\.log$/.test(filename)) {
            return res.status(400).json({
                success: false,
                message: '无效的文件名'
            });
        }

        const filePath = path.join(logCleanupService.config.logDir, filename);

        // 检查文件是否存在
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({
                success: false,
                message: '文件不存在'
            });
        }

        // 设置下载头
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/plain');

        // 发送文件
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error downloading log file:', error);
        res.status(500).json({
            success: false,
            message: '下载文件失败',
            error: error.message
        });
    }
});

/**
 * DELETE /api/logs/:filename
 * 删除指定的日志文件
 */
router.delete('/:filename', async (req, res) => {
    try {
        const { filename } = req.params;

        // 验证文件名安全性
        if (!/^[a-zA-Z0-9._-]+\.(log|bak|gz|bz2|xz)$/.test(filename)) {
            return res.status(400).json({
                success: false,
                message: '无效的文件名'
            });
        }

        // 不允许删除主要日志文件
        if (filename === 'frontend.log' || filename === 'backend.log') {
            return res.status(403).json({
                success: false,
                message: '不能删除主要日志文件'
            });
        }

        const filePath = path.join(logCleanupService.config.logDir, filename);

        // 检查文件是否存在
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({
                success: false,
                message: '文件不存在'
            });
        }

        // 删除文件
        await fs.unlink(filePath);

        res.json({
            success: true,
            message: `文件 ${filename} 已删除`
        });
    } catch (error) {
        console.error('Error deleting log file:', error);
        res.status(500).json({
            success: false,
            message: '删除文件失败',
            error: error.message
        });
    }
});

/**
 * POST /api/logs/backup
 * 手动创建备份
 */
router.post('/backup', async (req, res) => {
    try {
        const { files } = req.body;

        if (!files || !Array.isArray(files)) {
            return res.status(400).json({
                success: false,
                message: '请指定要备份的文件'
            });
        }

        const results = [];

        for (const filename of files) {
            try {
                // 验证文件名
                if (!/^[a-zA-Z0-9._-]+\.log$/.test(filename)) {
                    results.push({
                        file: filename,
                        success: false,
                        message: '无效的文件名'
                    });
                    continue;
                }

                const filePath = path.join(logCleanupService.config.logDir, filename);

                // 检查文件是否存在
                await fs.access(filePath);

                // 创建备份
                const backupPath = await logCleanupService.backupFile(filePath);

                results.push({
                    file: filename,
                    success: true,
                    backupPath: path.basename(backupPath)
                });
            } catch (error) {
                results.push({
                    file: filename,
                    success: false,
                    message: error.message
                });
            }
        }

        res.json({
            success: true,
            message: '备份操作完成',
            data: results
        });
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({
            success: false,
            message: '创建备份失败',
            error: error.message
        });
    }
});

/**
 * POST /api/logs/rotate
 * 手动轮转日志
 */
router.post('/rotate', async (req, res) => {
    try {
        const { files } = req.body;

        const filesToRotate = files || ['frontend.log', 'backend.log'];
        const results = [];

        for (const filename of filesToRotate) {
            try {
                // 验证文件名
                if (!/^[a-zA-Z0-9._-]+\.log$/.test(filename)) {
                    results.push({
                        file: filename,
                        success: false,
                        message: '无效的文件名'
                    });
                    continue;
                }

                const filePath = path.join(logCleanupService.config.logDir, filename);

                // 检查文件是否存在
                await fs.access(filePath);

                // 执行轮转
                const rotated = await logCleanupService.rotateLog(filePath);

                results.push({
                    file: filename,
                    success: true,
                    rotated
                });
            } catch (error) {
                if (error.code === 'ENOENT') {
                    results.push({
                        file: filename,
                        success: false,
                        message: '文件不存在'
                    });
                } else {
                    results.push({
                        file: filename,
                        success: false,
                        message: error.message
                    });
                }
            }
        }

        res.json({
            success: true,
            message: '轮转操作完成',
            data: results
        });
    } catch (error) {
        console.error('Error rotating logs:', error);
        res.status(500).json({
            success: false,
            message: '轮转操作失败',
            error: error.message
        });
    }
});

/**
 * GET /api/logs/health
 * 健康检查接口
 */
router.get('/health', async (req, res) => {
    try {
        const status = await logCleanupService.getLogStatus();
        const stats = logCleanupService.getStats();

        // 检查是否有问题
        const issues = [];

        // 检查大文件
        status.files.forEach(file => {
            if (file.status === 'oversized') {
                issues.push(`${file.name} 文件过大 (${file.sizeFormatted})`);
            }
        });

        // 检查错误
        if (stats.errors && stats.errors.length > 0) {
            issues.push(`${stats.errors.length} 个清理错误`);
        }

        const isHealthy = issues.length === 0;

        res.json({
            success: true,
            data: {
                healthy: isHealthy,
                issues,
                status,
                stats,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('Error checking log health:', error);
        res.status(500).json({
            success: false,
            message: '健康检查失败',
            error: error.message
        });
    }
});

module.exports = router; 