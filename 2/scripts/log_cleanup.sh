#!/bin/bash

# 日志清理脚本
# 用法: ./log_cleanup.sh [options]

# 默认配置
DEFAULT_RETAIN_DAYS=7      # 保留7天的日志
DEFAULT_MAX_SIZE=100       # 单个日志文件最大100MB
DEFAULT_BACKUP_COUNT=5     # 保留5个备份文件

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 设置项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGS_DIR="$PROJECT_ROOT/logs"

# 显示帮助信息
show_help() {
    echo -e "${BLUE}日志清理脚本${NC}"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -d, --days DAYS         保留的天数 (默认: $DEFAULT_RETAIN_DAYS)"
    echo "  -s, --size SIZE         单个文件最大大小(MB) (默认: $DEFAULT_MAX_SIZE)"
    echo "  -b, --backup COUNT      保留的备份数量 (默认: $DEFAULT_BACKUP_COUNT)"
    echo "  -f, --force             强制清理，不询问确认"
    echo "  -v, --verbose           详细输出"
    echo "  --dry-run               仅显示要删除的文件，不实际删除"
    echo "  -h, --help              显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                      # 使用默认设置清理"
    echo "  $0 -d 3 -s 50          # 保留3天，最大50MB"
    echo "  $0 --dry-run           # 预览要删除的文件"
}

# 解析命令行参数
RETAIN_DAYS=$DEFAULT_RETAIN_DAYS
MAX_SIZE=$DEFAULT_MAX_SIZE
BACKUP_COUNT=$DEFAULT_BACKUP_COUNT
FORCE=false
VERBOSE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--days)
            RETAIN_DAYS="$2"
            shift 2
            ;;
        -s|--size)
            MAX_SIZE="$2"
            shift 2
            ;;
        -b|--backup)
            BACKUP_COUNT="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 记录日志
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[$timestamp] INFO:${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[$timestamp] WARN:${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[$timestamp] ERROR:${NC} $message"
            ;;
        "DEBUG")
            if [ "$VERBOSE" = true ]; then
                echo -e "${BLUE}[$timestamp] DEBUG:${NC} $message"
            fi
            ;;
    esac
}

# 检查目录是否存在
check_logs_directory() {
    if [ ! -d "$LOGS_DIR" ]; then
        log_message "ERROR" "日志目录不存在: $LOGS_DIR"
        return 1
    fi
    
    log_message "INFO" "日志目录: $LOGS_DIR"
    return 0
}

# 获取文件大小(MB)
get_file_size_mb() {
    local file="$1"
    if [ -f "$file" ]; then
        local size_bytes=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        echo $((size_bytes / 1024 / 1024))
    else
        echo 0
    fi
}

# 备份大文件
backup_large_file() {
    local file="$1"
    local backup_dir="$LOGS_DIR/backups"
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local basename=$(basename "$file")
    local backup_file="$backup_dir/${basename}.${timestamp}.bak"
    
    # 创建备份目录
    if [ "$DRY_RUN" = false ]; then
        mkdir -p "$backup_dir"
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_message "INFO" "[DRY-RUN] 会备份: $file -> $backup_file"
    else
        if cp "$file" "$backup_file" 2>/dev/null; then
            log_message "INFO" "已备份: $file -> $backup_file"
            # 清空原文件内容
            > "$file"
            log_message "INFO" "已清空: $file"
        else
            log_message "ERROR" "备份失败: $file"
            return 1
        fi
    fi
    
    return 0
}

# 清理旧的备份文件
cleanup_old_backups() {
    local backup_dir="$LOGS_DIR/backups"
    
    if [ ! -d "$backup_dir" ]; then
        return 0
    fi
    
    log_message "INFO" "清理旧备份文件 (保留 $BACKUP_COUNT 个)"
    
    # 为每种日志类型清理备份
    for log_type in frontend backend; do
        log_message "DEBUG" "清理 $log_type 日志备份"
        
        # 找到所有该类型的备份文件，按时间排序
        local backup_files=($(find "$backup_dir" -name "${log_type}.log.*.bak" -type f | sort -r))
        
        if [ ${#backup_files[@]} -gt $BACKUP_COUNT ]; then
            local files_to_delete=("${backup_files[@]:$BACKUP_COUNT}")
            
            for file in "${files_to_delete[@]}"; do
                if [ "$DRY_RUN" = true ]; then
                    log_message "INFO" "[DRY-RUN] 会删除备份: $file"
                else
                    if rm "$file" 2>/dev/null; then
                        log_message "INFO" "已删除旧备份: $file"
                    else
                        log_message "WARN" "删除备份失败: $file"
                    fi
                fi
            done
        fi
    done
}

# 按时间清理日志
cleanup_by_age() {
    log_message "INFO" "清理 $RETAIN_DAYS 天前的日志文件"
    
    # 找到超过指定天数的日志文件
    local old_files=$(find "$LOGS_DIR" -name "*.log" -type f -mtime +$RETAIN_DAYS 2>/dev/null)
    
    if [ -z "$old_files" ]; then
        log_message "INFO" "没有找到超过 $RETAIN_DAYS 天的日志文件"
        return 0
    fi
    
    echo "$old_files" | while read -r file; do
        if [ -n "$file" ]; then
            local file_age_days=$(( ($(date +%s) - $(stat -f%m "$file" 2>/dev/null || stat -c%Y "$file" 2>/dev/null)) / 86400 ))
            
            if [ "$DRY_RUN" = true ]; then
                log_message "INFO" "[DRY-RUN] 会删除: $file (${file_age_days}天前)"
            else
                if rm "$file" 2>/dev/null; then
                    log_message "INFO" "已删除旧文件: $file (${file_age_days}天前)"
                else
                    log_message "ERROR" "删除失败: $file"
                fi
            fi
        fi
    done
}

# 按大小清理日志
cleanup_by_size() {
    log_message "INFO" "检查大于 ${MAX_SIZE}MB 的日志文件"
    
    # 检查主要日志文件
    for log_file in "$LOGS_DIR/frontend.log" "$LOGS_DIR/backend.log"; do
        if [ -f "$log_file" ]; then
            local file_size=$(get_file_size_mb "$log_file")
            
            log_message "DEBUG" "检查文件: $log_file (${file_size}MB)"
            
            if [ $file_size -gt $MAX_SIZE ]; then
                log_message "WARN" "文件过大: $log_file (${file_size}MB > ${MAX_SIZE}MB)"
                backup_large_file "$log_file"
            else
                log_message "DEBUG" "文件大小正常: $log_file (${file_size}MB)"
            fi
        fi
    done
}

# 显示清理统计
show_cleanup_stats() {
    log_message "INFO" "清理统计信息:"
    
    if [ -d "$LOGS_DIR" ]; then
        local total_files=$(find "$LOGS_DIR" -name "*.log" -type f | wc -l)
        local total_size=$(find "$LOGS_DIR" -name "*.log" -type f -exec stat -f%z {} \; 2>/dev/null | awk '{total+=$1} END {print int(total/1024/1024)}')
        
        echo -e "  📁 日志文件数量: ${total_files}"
        echo -e "  💾 日志总大小: ${total_size:-0}MB"
        
        if [ -d "$LOGS_DIR/backups" ]; then
            local backup_files=$(find "$LOGS_DIR/backups" -name "*.bak" -type f | wc -l)
            local backup_size=$(find "$LOGS_DIR/backups" -name "*.bak" -type f -exec stat -f%z {} \; 2>/dev/null | awk '{total+=$1} END {print int(total/1024/1024)}')
            echo -e "  📦 备份文件数量: ${backup_files}"
            echo -e "  💾 备份总大小: ${backup_size:-0}MB"
        fi
    fi
}

# 确认清理操作
confirm_cleanup() {
    if [ "$FORCE" = true ] || [ "$DRY_RUN" = true ]; then
        return 0
    fi
    
    echo ""
    echo -e "${YELLOW}即将执行日志清理操作:${NC}"
    echo -e "  保留天数: $RETAIN_DAYS 天"
    echo -e "  最大文件大小: ${MAX_SIZE}MB"
    echo -e "  备份保留数量: $BACKUP_COUNT 个"
    echo ""
    
    read -p "确认继续? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_message "INFO" "操作已取消"
        exit 0
    fi
}

# 主函数
main() {
    echo -e "${BLUE}🧹 日志清理工具${NC}"
    echo ""
    
    # 检查日志目录
    if ! check_logs_directory; then
        exit 1
    fi
    
    # 显示当前统计
    show_cleanup_stats
    
    # 确认清理操作
    confirm_cleanup
    
    echo ""
    log_message "INFO" "开始清理日志文件..."
    
    if [ "$DRY_RUN" = true ]; then
        log_message "INFO" "运行模式: 预览 (不会实际删除文件)"
    fi
    
    # 执行清理
    cleanup_by_size
    cleanup_by_age
    cleanup_old_backups
    
    echo ""
    log_message "INFO" "日志清理完成!"
    
    # 显示清理后的统计
    show_cleanup_stats
}

# 运行主函数
main "$@" 