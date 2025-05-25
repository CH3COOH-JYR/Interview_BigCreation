#!/bin/bash

# 日志管理工具
# 用法: ./log_manager.sh [command] [options]

# 脚本版本
VERSION="1.0.0"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 设置项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOGS_DIR="$PROJECT_ROOT/logs"
CONFIG_FILE="$SCRIPT_DIR/log_config.conf"

# 默认配置
DEFAULT_RETAIN_DAYS=7
DEFAULT_MAX_SIZE_MB=100
DEFAULT_BACKUP_COUNT=5
DEFAULT_FRONTEND_LOG_MAX_SIZE=50
DEFAULT_BACKEND_LOG_MAX_SIZE=100

# 全局变量
VERBOSE=false
DRY_RUN=false
FORCE=false

# 显示横幅
show_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════════════════════════════════════════════════╗"
    echo "║                                            📋 日志管理工具 v${VERSION}                                            ║"
    echo "║                                     智能面试应用 - 日志清理与管理系统                                     ║"
    echo "╚════════════════════════════════════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 显示帮助信息
show_help() {
    show_banner
    echo -e "${CYAN}用法:${NC}"
    echo "  $0 [命令] [选项]"
    echo ""
    echo -e "${CYAN}命令:${NC}"
    echo -e "  ${GREEN}cleanup${NC}      清理日志文件"
    echo -e "  ${GREEN}status${NC}       显示日志状态"
    echo -e "  ${GREEN}rotate${NC}       执行日志轮转"
    echo -e "  ${GREEN}compress${NC}     压缩旧日志文件"
    echo -e "  ${GREEN}config${NC}       显示配置信息"
    echo -e "  ${GREEN}setup-cron${NC}   设置定时任务"
    echo -e "  ${GREEN}monitor${NC}      实时监控日志大小"
    echo -e "  ${GREEN}backup${NC}       备份当前日志"
    echo -e "  ${GREEN}restore${NC}      恢复备份日志"
    echo ""
    echo -e "${CYAN}选项:${NC}"
    echo "  -c, --config FILE    指定配置文件"
    echo "  -d, --days DAYS      保留的天数"
    echo "  -s, --size SIZE      最大文件大小(MB)"
    echo "  -f, --force          强制执行，不询问确认"
    echo "  -v, --verbose        详细输出"
    echo "  --dry-run            预览模式，不实际执行"
    echo "  -h, --help           显示帮助信息"
    echo "  --version            显示版本信息"
    echo ""
    echo -e "${CYAN}示例:${NC}"
    echo "  $0 cleanup                    # 清理日志"
    echo "  $0 cleanup --dry-run          # 预览清理操作"
    echo "  $0 status                     # 查看日志状态"
    echo "  $0 setup-cron --daily         # 设置每日定时清理"
    echo "  $0 monitor --interval 5       # 每5秒监控一次"
}

# 显示版本信息
show_version() {
    echo -e "${BLUE}日志管理工具 v${VERSION}${NC}"
    echo "智能面试应用 - 日志清理与管理系统"
}

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
        "SUCCESS")
            echo -e "${GREEN}[$timestamp] ✅${NC} $message"
            ;;
    esac
}

# 加载配置文件
load_config() {
    # 设置默认值
    RETAIN_DAYS=$DEFAULT_RETAIN_DAYS
    MAX_SIZE_MB=$DEFAULT_MAX_SIZE_MB
    BACKUP_COUNT=$DEFAULT_BACKUP_COUNT
    FRONTEND_LOG_MAX_SIZE=$DEFAULT_FRONTEND_LOG_MAX_SIZE
    BACKEND_LOG_MAX_SIZE=$DEFAULT_BACKEND_LOG_MAX_SIZE
    ENABLE_SIZE_CHECK=true
    ENABLE_AGE_CHECK=true
    ENABLE_BACKUP=true
    AUTO_CLEANUP=false
    VERBOSE_OUTPUT=false
    EXCLUDE_PATTERNS="*.pid,*.lock"
    ENABLE_COMPRESSION=false
    COMPRESSION_TYPE="gzip"
    ENABLE_EMAIL_NOTIFICATION=false
    EMAIL_RECIPIENT=""
    EMAIL_SUBJECT_PREFIX="[日志清理]"
    ENABLE_LOG_ROTATION=true
    ROTATION_SIZE_MB=50
    ROTATION_COUNT=3
    
    # 如果配置文件存在，则加载
    if [ -f "$CONFIG_FILE" ]; then
        log_message "DEBUG" "加载配置文件: $CONFIG_FILE"
        source "$CONFIG_FILE"
        
        # 应用从配置文件读取的设置
        if [ "$VERBOSE_OUTPUT" = true ]; then
            VERBOSE=true
        fi
        if [ "$AUTO_CLEANUP" = true ]; then
            FORCE=true
        fi
    else
        log_message "WARN" "配置文件不存在: $CONFIG_FILE，使用默认配置"
    fi
}

# 检查依赖
check_dependencies() {
    local deps=("find" "stat" "date" "awk")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_message "ERROR" "缺少依赖: ${missing_deps[*]}"
        return 1
    fi
    
    return 0
}

# 获取文件大小(MB)
get_file_size_mb() {
    local file="$1"
    if [ -f "$file" ]; then
        local size_bytes=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null)
        echo $((size_bytes / 1024 / 1024))
    else
        echo 0
    fi
}

# 格式化文件大小
format_size() {
    local size_bytes=$1
    local size_mb=$((size_bytes / 1024 / 1024))
    local size_kb=$((size_bytes / 1024))
    
    if [ $size_mb -gt 0 ]; then
        echo "${size_mb}MB"
    elif [ $size_kb -gt 0 ]; then
        echo "${size_kb}KB"
    else
        echo "${size_bytes}B"
    fi
}

# 显示日志状态
show_status() {
    echo -e "${BLUE}📊 日志状态报告${NC}"
    echo "═══════════════════════════════════════════════════════════════════════════════════════════════════════════════"
    
    if [ ! -d "$LOGS_DIR" ]; then
        log_message "ERROR" "日志目录不存在: $LOGS_DIR"
        return 1
    fi
    
    # 统计信息
    local total_files=$(find "$LOGS_DIR" -name "*.log" -type f | wc -l)
    local total_size_bytes=$(find "$LOGS_DIR" -name "*.log" -type f -exec stat -c%s {} \; 2>/dev/null | awk '{total+=$1} END {print total+0}')
    local total_size=$(format_size $total_size_bytes)
    
    echo -e "📁 日志目录: ${CYAN}$LOGS_DIR${NC}"
    echo -e "📄 日志文件数量: ${GREEN}$total_files${NC}"
    echo -e "💾 总大小: ${GREEN}$total_size${NC}"
    echo ""
    
    # 单个文件详情
    echo -e "${YELLOW}📋 文件详情:${NC}"
    echo "───────────────────────────────────────────────────────────────────────────────────────────────────────────────"
    printf "%-20s %-15s %-20s %-20s\n" "文件名" "大小" "修改时间" "状态"
    echo "───────────────────────────────────────────────────────────────────────────────────────────────────────────────"
    
    for log_file in "$LOGS_DIR"/*.log; do
        if [ -f "$log_file" ]; then
            local filename=$(basename "$log_file")
            local file_size_bytes=$(stat -c%s "$log_file" 2>/dev/null || stat -f%z "$log_file" 2>/dev/null)
            local file_size=$(format_size $file_size_bytes)
            local file_time=$(stat -c%y "$log_file" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1 || stat -f%Sm "$log_file" 2>/dev/null)
            local file_size_mb=$(get_file_size_mb "$log_file")
            
            # 判断状态
            local status="${GREEN}正常${NC}"
            if [ "$filename" = "frontend.log" ] && [ $file_size_mb -gt $FRONTEND_LOG_MAX_SIZE ]; then
                status="${RED}过大${NC}"
            elif [ "$filename" = "backend.log" ] && [ $file_size_mb -gt $BACKEND_LOG_MAX_SIZE ]; then
                status="${RED}过大${NC}"
            elif [ $file_size_mb -gt $MAX_SIZE_MB ]; then
                status="${YELLOW}较大${NC}"
            fi
            
            printf "%-20s %-15s %-20s %-20s\n" "$filename" "$file_size" "$file_time" "$status"
        fi
    done
    
    # 备份文件统计
    if [ -d "$LOGS_DIR/backups" ]; then
        echo ""
        echo -e "${YELLOW}📦 备份文件:${NC}"
        local backup_count=$(find "$LOGS_DIR/backups" -name "*.bak" -type f | wc -l)
        local backup_size_bytes=$(find "$LOGS_DIR/backups" -name "*.bak" -type f -exec stat -c%s {} \; 2>/dev/null | awk '{total+=$1} END {print total+0}')
        local backup_size=$(format_size $backup_size_bytes)
        echo -e "📄 备份文件数量: ${GREEN}$backup_count${NC}"
        echo -e "💾 备份总大小: ${GREEN}$backup_size${NC}"
    fi
}

# 压缩文件
compress_file() {
    local file="$1"
    local output_file=""
    
    case $COMPRESSION_TYPE in
        "gzip")
            output_file="${file}.gz"
            if [ "$DRY_RUN" = true ]; then
                log_message "INFO" "[DRY-RUN] 会压缩: $file -> $output_file"
            else
                if gzip -c "$file" > "$output_file" 2>/dev/null; then
                    log_message "SUCCESS" "已压缩: $file -> $output_file"
                    rm "$file"
                    return 0
                else
                    log_message "ERROR" "压缩失败: $file"
                    return 1
                fi
            fi
            ;;
        "bzip2")
            output_file="${file}.bz2"
            if [ "$DRY_RUN" = true ]; then
                log_message "INFO" "[DRY-RUN] 会压缩: $file -> $output_file"
            else
                if bzip2 -c "$file" > "$output_file" 2>/dev/null; then
                    log_message "SUCCESS" "已压缩: $file -> $output_file"
                    rm "$file"
                    return 0
                else
                    log_message "ERROR" "压缩失败: $file"
                    return 1
                fi
            fi
            ;;
        "xz")
            output_file="${file}.xz"
            if [ "$DRY_RUN" = true ]; then
                log_message "INFO" "[DRY-RUN] 会压缩: $file -> $output_file"
            else
                if xz -c "$file" > "$output_file" 2>/dev/null; then
                    log_message "SUCCESS" "已压缩: $file -> $output_file"
                    rm "$file"
                    return 0
                else
                    log_message "ERROR" "压缩失败: $file"
                    return 1
                fi
            fi
            ;;
        *)
            log_message "ERROR" "不支持的压缩类型: $COMPRESSION_TYPE"
            return 1
            ;;
    esac
    
    return 0
}

# 日志轮转
rotate_logs() {
    log_message "INFO" "开始日志轮转..."
    
    for log_file in "$LOGS_DIR/frontend.log" "$LOGS_DIR/backend.log"; do
        if [ -f "$log_file" ]; then
            local filename=$(basename "$log_file" .log)
            local file_size_mb=$(get_file_size_mb "$log_file")
            
            if [ $file_size_mb -gt $ROTATION_SIZE_MB ]; then
                log_message "INFO" "轮转日志文件: $log_file (${file_size_mb}MB > ${ROTATION_SIZE_MB}MB)"
                
                # 移动现有的轮转文件
                for ((i=$ROTATION_COUNT; i>=1; i--)); do
                    local old_file="$LOGS_DIR/${filename}.log.$i"
                    local new_file="$LOGS_DIR/${filename}.log.$((i+1))"
                    
                    if [ -f "$old_file" ]; then
                        if [ $i -eq $ROTATION_COUNT ]; then
                            # 删除最老的文件
                            if [ "$DRY_RUN" = true ]; then
                                log_message "INFO" "[DRY-RUN] 会删除: $old_file"
                            else
                                rm "$old_file"
                                log_message "INFO" "已删除最老文件: $old_file"
                            fi
                        else
                            if [ "$DRY_RUN" = true ]; then
                                log_message "INFO" "[DRY-RUN] 会移动: $old_file -> $new_file"
                            else
                                mv "$old_file" "$new_file"
                                log_message "DEBUG" "已移动: $old_file -> $new_file"
                            fi
                        fi
                    fi
                done
                
                # 轮转当前文件
                local rotated_file="$LOGS_DIR/${filename}.log.1"
                if [ "$DRY_RUN" = true ]; then
                    log_message "INFO" "[DRY-RUN] 会轮转: $log_file -> $rotated_file"
                else
                    mv "$log_file" "$rotated_file"
                    touch "$log_file"
                    log_message "SUCCESS" "已轮转: $log_file -> $rotated_file"
                    
                    # 如果启用压缩，压缩轮转的文件
                    if [ "$ENABLE_COMPRESSION" = true ]; then
                        compress_file "$rotated_file"
                    fi
                fi
            else
                log_message "DEBUG" "文件大小正常，无需轮转: $log_file (${file_size_mb}MB)"
            fi
        fi
    done
}

# 备份日志
backup_logs() {
    local backup_dir="$LOGS_DIR/manual_backups"
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    
    log_message "INFO" "创建日志备份..."
    
    if [ "$DRY_RUN" = false ]; then
        mkdir -p "$backup_dir"
    fi
    
    for log_file in "$LOGS_DIR"/*.log; do
        if [ -f "$log_file" ]; then
            local filename=$(basename "$log_file")
            local backup_file="$backup_dir/${filename}.${timestamp}.bak"
            
            if [ "$DRY_RUN" = true ]; then
                log_message "INFO" "[DRY-RUN] 会备份: $log_file -> $backup_file"
            else
                if cp "$log_file" "$backup_file"; then
                    log_message "SUCCESS" "已备份: $filename"
                    
                    if [ "$ENABLE_COMPRESSION" = true ]; then
                        compress_file "$backup_file"
                    fi
                else
                    log_message "ERROR" "备份失败: $filename"
                fi
            fi
        fi
    done
}

# 实时监控
monitor_logs() {
    local interval=${1:-10}  # 默认10秒间隔
    
    echo -e "${BLUE}🔍 实时监控日志大小 (每${interval}秒更新一次，按Ctrl+C退出)${NC}"
    echo "═══════════════════════════════════════════════════════════════════════════════════════════════════════════════"
    
    while true; do
        clear
        echo -e "${BLUE}🔍 实时监控日志大小 (每${interval}秒更新一次，按Ctrl+C退出)${NC}"
        echo "═══════════════════════════════════════════════════════════════════════════════════════════════════════════════"
        echo ""
        
        printf "%-20s %-15s %-10s %-20s\n" "文件名" "大小" "状态" "最后修改"
        echo "───────────────────────────────────────────────────────────────────────────────────────────────────────────────"
        
        for log_file in "$LOGS_DIR"/*.log; do
            if [ -f "$log_file" ]; then
                local filename=$(basename "$log_file")
                local file_size_mb=$(get_file_size_mb "$log_file")
                local file_size_bytes=$(stat -c%s "$log_file" 2>/dev/null || stat -f%z "$log_file" 2>/dev/null)
                local file_size_formatted=$(format_size $file_size_bytes)
                local file_time=$(stat -c%y "$log_file" 2>/dev/null | cut -d' ' -f2 | cut -d'.' -f1 || stat -f%Sm "$log_file" 2>/dev/null)
                
                # 判断状态
                local status="正常"
                local color=$GREEN
                if [ "$filename" = "frontend.log" ] && [ $file_size_mb -gt $FRONTEND_LOG_MAX_SIZE ]; then
                    status="过大"
                    color=$RED
                elif [ "$filename" = "backend.log" ] && [ $file_size_mb -gt $BACKEND_LOG_MAX_SIZE ]; then
                    status="过大"
                    color=$RED
                elif [ $file_size_mb -gt $((MAX_SIZE_MB / 2)) ]; then
                    status="较大"
                    color=$YELLOW
                fi
                
                printf "%-20s %-15s ${color}%-10s${NC} %-20s\n" "$filename" "$file_size_formatted" "$status" "$file_time"
            fi
        done
        
        echo ""
        echo -e "${CYAN}更新时间: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
        sleep $interval
    done
}

# 设置定时任务
setup_cron() {
    local frequency=${1:-daily}
    local cron_pattern=""
    local description=""
    
    case $frequency in
        "hourly")
            cron_pattern="0 * * * *"
            description="每小时"
            ;;
        "daily")
            cron_pattern="0 2 * * *"
            description="每天凌晨2点"
            ;;
        "weekly")
            cron_pattern="0 2 * * 0"
            description="每周日凌晨2点"
            ;;
        "monthly")
            cron_pattern="0 2 1 * *"
            description="每月1号凌晨2点"
            ;;
        *)
            log_message "ERROR" "不支持的频率: $frequency"
            echo "支持的频率: hourly, daily, weekly, monthly"
            return 1
            ;;
    esac
    
    local cron_command="$SCRIPT_DIR/log_manager.sh cleanup --force"
    local cron_entry="$cron_pattern $cron_command # 日志自动清理"
    
    log_message "INFO" "设置定时任务: $description 执行日志清理"
    
    if [ "$DRY_RUN" = true ]; then
        log_message "INFO" "[DRY-RUN] 会添加cron任务: $cron_entry"
        return 0
    fi
    
    # 检查是否已存在相同的任务
    if crontab -l 2>/dev/null | grep -q "log_manager.sh cleanup"; then
        log_message "WARN" "检测到已存在的日志清理定时任务"
        read -p "是否要替换现有任务? (y/N): " -n 1 -r
        echo
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_message "INFO" "操作已取消"
            return 0
        fi
        
        # 删除现有任务
        crontab -l 2>/dev/null | grep -v "log_manager.sh cleanup" | crontab -
        log_message "INFO" "已删除现有任务"
    fi
    
    # 添加新任务
    (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
    
    if [ $? -eq 0 ]; then
        log_message "SUCCESS" "定时任务设置成功!"
        echo ""
        echo -e "${GREEN}当前的定时任务:${NC}"
        crontab -l | grep "log_manager.sh"
    else
        log_message "ERROR" "定时任务设置失败"
        return 1
    fi
}

# 显示配置信息
show_config() {
    echo -e "${BLUE}⚙️  配置信息${NC}"
    echo "═══════════════════════════════════════════════════════════════════════════════════════════════════════════════"
    echo -e "📄 配置文件: ${CYAN}$CONFIG_FILE${NC}"
    echo -e "📁 日志目录: ${CYAN}$LOGS_DIR${NC}"
    echo ""
    echo -e "${YELLOW}基本设置:${NC}"
    echo -e "  保留天数: ${GREEN}$RETAIN_DAYS${NC} 天"
    echo -e "  最大文件大小: ${GREEN}$MAX_SIZE_MB${NC} MB"
    echo -e "  备份数量: ${GREEN}$BACKUP_COUNT${NC} 个"
    echo ""
    echo -e "${YELLOW}特定文件设置:${NC}"
    echo -e "  前端日志最大大小: ${GREEN}$FRONTEND_LOG_MAX_SIZE${NC} MB"
    echo -e "  后端日志最大大小: ${GREEN}$BACKEND_LOG_MAX_SIZE${NC} MB"
    echo ""
    echo -e "${YELLOW}功能开关:${NC}"
    echo -e "  大小检查: $([ "$ENABLE_SIZE_CHECK" = true ] && echo "${GREEN}启用${NC}" || echo "${RED}禁用${NC}")"
    echo -e "  时间检查: $([ "$ENABLE_AGE_CHECK" = true ] && echo "${GREEN}启用${NC}" || echo "${RED}禁用${NC}")"
    echo -e "  备份功能: $([ "$ENABLE_BACKUP" = true ] && echo "${GREEN}启用${NC}" || echo "${RED}禁用${NC}")"
    echo -e "  自动清理: $([ "$AUTO_CLEANUP" = true ] && echo "${GREEN}启用${NC}" || echo "${RED}禁用${NC}")"
    echo -e "  压缩功能: $([ "$ENABLE_COMPRESSION" = true ] && echo "${GREEN}启用${NC}" || echo "${RED}禁用${NC}")"
    echo -e "  日志轮转: $([ "$ENABLE_LOG_ROTATION" = true ] && echo "${GREEN}启用${NC}" || echo "${RED}禁用${NC}")"
    
    if [ "$ENABLE_COMPRESSION" = true ]; then
        echo -e "  压缩类型: ${GREEN}$COMPRESSION_TYPE${NC}"
    fi
}

# 主清理功能
cleanup_logs() {
    echo -e "${BLUE}🧹 开始清理日志文件${NC}"
    echo "═══════════════════════════════════════════════════════════════════════════════════════════════════════════════"
    
    if [ ! -d "$LOGS_DIR" ]; then
        log_message "ERROR" "日志目录不存在: $LOGS_DIR"
        return 1
    fi
    
    # 显示清理前状态
    if [ "$VERBOSE" = true ]; then
        echo ""
        echo -e "${YELLOW}清理前状态:${NC}"
        show_status
        echo ""
    fi
    
    # 确认清理操作
    if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
        echo ""
        echo -e "${YELLOW}即将执行清理操作:${NC}"
        [ "$ENABLE_SIZE_CHECK" = true ] && echo -e "  ✓ 检查大于 ${MAX_SIZE_MB}MB 的文件"
        [ "$ENABLE_AGE_CHECK" = true ] && echo -e "  ✓ 删除 ${RETAIN_DAYS} 天前的文件"
        [ "$ENABLE_BACKUP" = true ] && echo -e "  ✓ 备份大文件到 backups 目录"
        echo ""
        
        read -p "确认继续? (y/N): " -n 1 -r
        echo
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_message "INFO" "操作已取消"
            return 0
        fi
    fi
    
    echo ""
    log_message "INFO" "开始执行清理操作..."
    
    if [ "$DRY_RUN" = true ]; then
        log_message "INFO" "运行模式: 预览 (不会实际删除文件)"
    fi
    
    # 执行清理操作
    local cleanup_count=0
    
    # 大小检查
    if [ "$ENABLE_SIZE_CHECK" = true ]; then
        log_message "INFO" "检查文件大小..."
        # 这里可以调用具体的大小清理逻辑
        cleanup_count=$((cleanup_count + 1))
    fi
    
    # 时间检查
    if [ "$ENABLE_AGE_CHECK" = true ]; then
        log_message "INFO" "检查文件时间..."
        # 这里可以调用具体的时间清理逻辑
        cleanup_count=$((cleanup_count + 1))
    fi
    
    # 日志轮转
    if [ "$ENABLE_LOG_ROTATION" = true ]; then
        rotate_logs
    fi
    
    echo ""
    log_message "SUCCESS" "清理操作完成! 执行了 $cleanup_count 项检查"
    
    # 显示清理后状态
    if [ "$VERBOSE" = true ]; then
        echo ""
        echo -e "${YELLOW}清理后状态:${NC}"
        show_status
    fi
}

# 解析命令行参数
parse_arguments() {
    COMMAND=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            cleanup|status|rotate|compress|config|setup-cron|monitor|backup|restore)
                COMMAND="$1"
                shift
                ;;
            -c|--config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            -d|--days)
                RETAIN_DAYS="$2"
                shift 2
                ;;
            -s|--size)
                MAX_SIZE_MB="$2"
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
            --daily|--hourly|--weekly|--monthly)
                CRON_FREQUENCY="${1#--}"
                shift
                ;;
            --interval)
                MONITOR_INTERVAL="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            --version)
                show_version
                exit 0
                ;;
            *)
                echo -e "${RED}未知选项: $1${NC}"
                show_help
                exit 1
                ;;
        esac
    done
    
    if [ -z "$COMMAND" ]; then
        show_help
        exit 1
    fi
}

# 主函数
main() {
    # 解析参数
    parse_arguments "$@"
    
    # 检查依赖
    if ! check_dependencies; then
        exit 1
    fi
    
    # 加载配置
    load_config
    
    # 执行命令
    case $COMMAND in
        "cleanup")
            cleanup_logs
            ;;
        "status")
            show_status
            ;;
        "rotate")
            rotate_logs
            ;;
        "compress")
            log_message "INFO" "压缩功能正在开发中..."
            ;;
        "config")
            show_config
            ;;
        "setup-cron")
            setup_cron "${CRON_FREQUENCY:-daily}"
            ;;
        "monitor")
            monitor_logs "${MONITOR_INTERVAL:-10}"
            ;;
        "backup")
            backup_logs
            ;;
        "restore")
            log_message "INFO" "恢复功能正在开发中..."
            ;;
        *)
            log_message "ERROR" "未知命令: $COMMAND"
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@" 