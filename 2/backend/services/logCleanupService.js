const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);

/**
 * 日志清理服务
 * 负责定期清理前后端日志文件
 */
class LogCleanupService {
    constructor(options = {}) {
        // 默认配置
        this.config = {
            logDir: path.join(__dirname, '../../logs'),
            retainDays: 7,
            maxSizeMB: 100,
            backupCount: 5,
            enableSizeCheck: true,
            enableAgeCheck: true,
            enableBackup: true,
            enableCompression: false,
            compressionType: 'gzip',
            enableRotation: true,
            rotationSizeMB: 50,
            rotationCount: 3,
            frontendLogMaxSize: 50,
            backendLogMaxSize: 100,
            excludePatterns: ['*.pid', '*.lock'],
            ...options
        };

        this.isRunning = false;
        this.stats = {
            lastCleanup: null,
            filesProcessed: 0,
            totalSizeRemoved: 0,
            backupsCreated: 0,
            errors: []
        };

        console.log('LogCleanupService initialized with config:', this.config);
    }

    /**
     * 启动日志清理服务
     */
    async start() {
        console.log('🚀 LogCleanupService starting...');

        try {
            await this.ensureLogDirectory();
            console.log('✅ LogCleanupService started successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to start LogCleanupService:', error);
            return false;
        }
    }

    /**
     * 确保日志目录存在
     */
    async ensureLogDirectory() {
        try {
            await fs.access(this.config.logDir);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.mkdir(this.config.logDir, { recursive: true });
                console.log(`📁 Created log directory: ${this.config.logDir}`);
            } else {
                throw error;
            }
        }
    }

    /**
     * 获取文件大小(MB)
     */
    async getFileSizeMB(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return Math.round(stats.size / (1024 * 1024));
        } catch (error) {
            return 0;
        }
    }

    /**
     * 格式化文件大小
     */
    formatSize(bytes) {
        if (bytes >= 1024 * 1024) {
            return `${Math.round(bytes / (1024 * 1024))}MB`;
        } else if (bytes >= 1024) {
            return `${Math.round(bytes / 1024)}KB`;
        } else {
            return `${bytes}B`;
        }
    }

    /**
     * 获取日志状态
     */
    async getLogStatus() {
        try {
            const files = await fs.readdir(this.config.logDir);
            const logFiles = files.filter(file => file.endsWith('.log'));

            const fileStats = await Promise.all(
                logFiles.map(async (file) => {
                    const filePath = path.join(this.config.logDir, file);
                    const stats = await fs.stat(filePath);
                    const sizeMB = Math.round(stats.size / (1024 * 1024));

                    let status = 'normal';
                    if (file === 'frontend.log' && sizeMB > this.config.frontendLogMaxSize) {
                        status = 'oversized';
                    } else if (file === 'backend.log' && sizeMB > this.config.backendLogMaxSize) {
                        status = 'oversized';
                    } else if (sizeMB > this.config.maxSizeMB) {
                        status = 'large';
                    }

                    return {
                        name: file,
                        size: stats.size,
                        sizeFormatted: this.formatSize(stats.size),
                        sizeMB,
                        modified: stats.mtime,
                        status
                    };
                })
            );

            const totalSize = fileStats.reduce((sum, file) => sum + file.size, 0);

            // 检查备份目录
            let backupStats = null;
            const backupDir = path.join(this.config.logDir, 'backups');
            try {
                await fs.access(backupDir);
                const backupFiles = await fs.readdir(backupDir);
                const backupFileStats = await Promise.all(
                    backupFiles
                        .filter(file => file.endsWith('.bak') || file.endsWith('.gz'))
                        .map(async (file) => {
                            const filePath = path.join(backupDir, file);
                            const stats = await fs.stat(filePath);
                            return stats.size;
                        })
                );

                backupStats = {
                    count: backupFileStats.length,
                    totalSize: backupFileStats.reduce((sum, size) => sum + size, 0)
                };
            } catch (error) {
                // 备份目录不存在或无法访问
            }

            return {
                logDirectory: this.config.logDir,
                totalFiles: logFiles.length,
                totalSize,
                totalSizeFormatted: this.formatSize(totalSize),
                files: fileStats,
                backups: backupStats,
                lastCleanup: this.stats.lastCleanup,
                cleanupStats: { ...this.stats }
            };
        } catch (error) {
            console.error('Error getting log status:', error);
            throw error;
        }
    }

    /**
     * 备份文件
     */
    async backupFile(filePath, options = {}) {
        const { compress = this.config.enableCompression } = options;

        try {
            const backupDir = path.join(this.config.logDir, 'backups');
            await fs.mkdir(backupDir, { recursive: true });

            const filename = path.basename(filePath);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `${filename}.${timestamp}.bak`;
            const backupPath = path.join(backupDir, backupFileName);

            // 复制文件
            await fs.copyFile(filePath, backupPath);
            console.log(`📦 Backed up: ${filename} -> ${backupFileName}`);

            // 压缩文件(如果启用)
            if (compress) {
                await this.compressFile(backupPath);
            }

            // 清空原文件
            await fs.writeFile(filePath, '');
            console.log(`🗑️  Cleared: ${filename}`);

            this.stats.backupsCreated++;
            return backupPath;
        } catch (error) {
            console.error(`Error backing up file ${filePath}:`, error);
            this.stats.errors.push(`Backup failed: ${filePath} - ${error.message}`);
            throw error;
        }
    }

    /**
     * 压缩文件
     */
    async compressFile(filePath) {
        try {
            const compressionCommands = {
                gzip: `gzip "${filePath}"`,
                bzip2: `bzip2 "${filePath}"`,
                xz: `xz "${filePath}"`
            };

            const command = compressionCommands[this.config.compressionType];
            if (!command) {
                throw new Error(`Unsupported compression type: ${this.config.compressionType}`);
            }

            await execAsync(command);
            console.log(`🗜️  Compressed: ${path.basename(filePath)}`);
        } catch (error) {
            console.error(`Error compressing file ${filePath}:`, error);
            // 压缩失败不应该阻止备份过程
        }
    }

    /**
     * 清理旧备份文件
     */
    async cleanupOldBackups() {
        try {
            const backupDir = path.join(this.config.logDir, 'backups');

            try {
                await fs.access(backupDir);
            } catch (error) {
                return; // 备份目录不存在
            }

            const files = await fs.readdir(backupDir);

            // 按日志类型分组清理
            for (const logType of ['frontend', 'backend']) {
                const backupFiles = files
                    .filter(file => file.startsWith(`${logType}.log.`) && (file.endsWith('.bak') || file.endsWith('.gz')))
                    .map(file => ({
                        name: file,
                        path: path.join(backupDir, file),
                        time: fs.stat(path.join(backupDir, file)).then(stats => stats.mtime)
                    }));

                const fileStats = await Promise.all(
                    backupFiles.map(async (file) => ({
                        ...file,
                        time: await file.time
                    }))
                );

                // 按时间排序，最新的在前
                fileStats.sort((a, b) => b.time - a.time);

                // 删除超过保留数量的文件
                if (fileStats.length > this.config.backupCount) {
                    const filesToDelete = fileStats.slice(this.config.backupCount);

                    for (const file of filesToDelete) {
                        await fs.unlink(file.path);
                        console.log(`🗑️  Deleted old backup: ${file.name}`);
                    }
                }
            }
        } catch (error) {
            console.error('Error cleaning up old backups:', error);
            this.stats.errors.push(`Backup cleanup failed: ${error.message}`);
        }
    }

    /**
     * 按年龄清理日志
     */
    async cleanupByAge() {
        if (!this.config.enableAgeCheck) {
            return;
        }

        try {
            const cutoffTime = new Date();
            cutoffTime.setDate(cutoffTime.getDate() - this.config.retainDays);

            const files = await fs.readdir(this.config.logDir);
            const logFiles = files.filter(file => file.endsWith('.log'));

            for (const file of logFiles) {
                const filePath = path.join(this.config.logDir, file);
                const stats = await fs.stat(filePath);

                if (stats.mtime < cutoffTime) {
                    await fs.unlink(filePath);
                    console.log(`🗑️  Deleted old file: ${file} (${Math.round((Date.now() - stats.mtime) / (1000 * 60 * 60 * 24))} days old)`);
                    this.stats.filesProcessed++;
                    this.stats.totalSizeRemoved += stats.size;
                }
            }
        } catch (error) {
            console.error('Error cleaning up by age:', error);
            this.stats.errors.push(`Age cleanup failed: ${error.message}`);
        }
    }

    /**
     * 按大小清理日志
     */
    async cleanupBySize() {
        if (!this.config.enableSizeCheck) {
            return;
        }

        try {
            const mainLogFiles = [
                { path: path.join(this.config.logDir, 'frontend.log'), maxSize: this.config.frontendLogMaxSize },
                { path: path.join(this.config.logDir, 'backend.log'), maxSize: this.config.backendLogMaxSize }
            ];

            for (const { path: filePath, maxSize } of mainLogFiles) {
                try {
                    await fs.access(filePath);
                    const sizeMB = await this.getFileSizeMB(filePath);

                    if (sizeMB > maxSize) {
                        console.log(`⚠️  File oversized: ${path.basename(filePath)} (${sizeMB}MB > ${maxSize}MB)`);

                        if (this.config.enableBackup) {
                            await this.backupFile(filePath);
                        } else {
                            // 如果不备份，直接清空文件
                            await fs.writeFile(filePath, '');
                            console.log(`🗑️  Cleared: ${path.basename(filePath)}`);
                        }

                        this.stats.filesProcessed++;
                        this.stats.totalSizeRemoved += sizeMB * 1024 * 1024;
                    }
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        throw error;
                    }
                    // 文件不存在，跳过
                }
            }
        } catch (error) {
            console.error('Error cleaning up by size:', error);
            this.stats.errors.push(`Size cleanup failed: ${error.message}`);
        }
    }

    /**
     * 日志轮转
     */
    async rotateLog(logFilePath) {
        try {
            const stats = await fs.stat(logFilePath);
            const sizeMB = Math.round(stats.size / (1024 * 1024));

            if (sizeMB <= this.config.rotationSizeMB) {
                return false; // 不需要轮转
            }

            const logDir = path.dirname(logFilePath);
            const filename = path.basename(logFilePath, '.log');

            // 移动现有的轮转文件
            for (let i = this.config.rotationCount; i >= 1; i--) {
                const oldFile = path.join(logDir, `${filename}.log.${i}`);
                const newFile = path.join(logDir, `${filename}.log.${i + 1}`);

                try {
                    await fs.access(oldFile);
                    if (i === this.config.rotationCount) {
                        // 删除最老的文件
                        await fs.unlink(oldFile);
                        console.log(`🗑️  Deleted oldest rotation: ${filename}.log.${i}`);
                    } else {
                        await fs.rename(oldFile, newFile);
                        console.log(`📁 Moved rotation: ${filename}.log.${i} -> ${filename}.log.${i + 1}`);
                    }
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        throw error;
                    }
                    // 文件不存在，跳过
                }
            }

            // 轮转当前文件
            const rotatedFile = path.join(logDir, `${filename}.log.1`);
            await fs.rename(logFilePath, rotatedFile);
            await fs.writeFile(logFilePath, ''); // 创建新的空文件

            console.log(`🔄 Rotated: ${path.basename(logFilePath)} -> ${filename}.log.1`);

            // 压缩轮转的文件
            if (this.config.enableCompression) {
                await this.compressFile(rotatedFile);
            }

            return true;
        } catch (error) {
            console.error(`Error rotating log ${logFilePath}:`, error);
            this.stats.errors.push(`Rotation failed: ${logFilePath} - ${error.message}`);
            return false;
        }
    }

    /**
     * 执行完整的日志清理
     */
    async performCleanup(options = {}) {
        if (this.isRunning) {
            console.log('⚠️  Cleanup already in progress, skipping...');
            return this.stats;
        }

        this.isRunning = true;
        console.log('🧹 Starting log cleanup...');

        // 重置统计
        this.stats = {
            lastCleanup: new Date(),
            filesProcessed: 0,
            totalSizeRemoved: 0,
            backupsCreated: 0,
            errors: []
        };

        try {
            // 确保日志目录存在
            await this.ensureLogDirectory();

            // 1. 日志轮转
            if (this.config.enableRotation) {
                console.log('🔄 Performing log rotation...');
                const logFiles = [
                    path.join(this.config.logDir, 'frontend.log'),
                    path.join(this.config.logDir, 'backend.log')
                ];

                for (const logFile of logFiles) {
                    try {
                        await fs.access(logFile);
                        await this.rotateLog(logFile);
                    } catch (error) {
                        if (error.code !== 'ENOENT') {
                            console.error(`Error rotating ${logFile}:`, error);
                        }
                    }
                }
            }

            // 2. 按大小清理
            if (this.config.enableSizeCheck) {
                console.log('📏 Checking file sizes...');
                await this.cleanupBySize();
            }

            // 3. 按年龄清理
            if (this.config.enableAgeCheck) {
                console.log('⏰ Checking file ages...');
                await this.cleanupByAge();
            }

            // 4. 清理旧备份
            console.log('🗂️  Cleaning up old backups...');
            await this.cleanupOldBackups();

            console.log('✅ Log cleanup completed successfully');
            console.log(`📊 Stats: ${this.stats.filesProcessed} files processed, ${this.formatSize(this.stats.totalSizeRemoved)} removed, ${this.stats.backupsCreated} backups created`);

            if (this.stats.errors.length > 0) {
                console.log(`⚠️  ${this.stats.errors.length} errors occurred during cleanup`);
                this.stats.errors.forEach(error => console.error(`   - ${error}`));
            }

        } catch (error) {
            console.error('❌ Log cleanup failed:', error);
            this.stats.errors.push(`General cleanup error: ${error.message}`);
        } finally {
            this.isRunning = false;
        }

        return this.stats;
    }

    /**
     * 设置定期清理
     */
    scheduleCleanup(intervalHours = 24) {
        console.log(`⏱️  Scheduling cleanup every ${intervalHours} hours`);

        setInterval(async () => {
            try {
                await this.performCleanup();
            } catch (error) {
                console.error('Scheduled cleanup failed:', error);
            }
        }, intervalHours * 60 * 60 * 1000);
    }

    /**
     * 手动触发清理
     */
    async triggerCleanup() {
        return await this.performCleanup();
    }

    /**
     * 获取清理统计
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('Configuration updated:', newConfig);
    }
}

module.exports = LogCleanupService; 