// 语音识别服务
class SpeechService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isSupported = false;
    this.platformInfo = this.detectPlatform();

    // 新增状态
    this.continuousMode = false; // 是否为持续录音模式
    this.appendMode = false; // 是否为追加模式
    this.accumulatedText = ''; // 累积的文本

    // 检查浏览器支持
    this.initializeSpeechRecognition();
  }

  // 检测平台和浏览器信息
  detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    const info = {
      isMac: platform.includes('mac') || userAgent.includes('macintosh'),
      isWindows: platform.includes('win') || userAgent.includes('windows'),
      isEdge: userAgent.includes('edge') || userAgent.includes('edg/'),
      isChrome: userAgent.includes('chrome') && !userAgent.includes('edge'),
      isSafari: userAgent.includes('safari') && !userAgent.includes('chrome'),
      isFirefox: userAgent.includes('firefox'),
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };

    console.log('🔍 平台检测结果:', info);
    return info;
  }

  // 初始化语音识别
  initializeSpeechRecognition() {
    // 首先检测安全上下文
    if (!window.isSecureContext) {
      console.error('⚠️ 安全上下文检测失败！', {
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        origin: window.location.origin
      });

      // 特殊处理：即使不在安全上下文，也尝试继续（某些浏览器可能允许）
      console.warn('警告：当前不在安全上下文中，语音识别可能无法正常工作！');
    }

    // 检查浏览器是否支持语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.isSupported = true;

      try {
        this.recognition = new SpeechRecognition();

        // 根据平台配置语音识别参数
        if (this.platformInfo.isMac && this.platformInfo.isEdge) {
          // macOS Edge 使用更保守的配置
          console.log('🍎 为 macOS Edge 应用特殊配置');
          this.recognition.continuous = false; // 默认单次识别，可动态配置
          this.recognition.interimResults = false; // 禁用中间结果，减少兼容性问题
          this.recognition.maxAlternatives = 1; // 最多1个候选结果
        } else {
          // 其他平台使用标准配置
          this.recognition.continuous = false; // 默认单次识别，可动态配置
          this.recognition.interimResults = true; // 获取中间结果
          this.recognition.maxAlternatives = 1; // 最多1个候选结果
        }

        // 智能语言设置
        this.setupLanguage();

        console.log('✅ 语音识别服务初始化成功', {
          平台: `${this.platformInfo.isMac ? 'macOS' : 'Other'} ${this.platformInfo.isEdge ? 'Edge' : 'Browser'}`,
          语言设置: this.recognition.lang,
          中间结果: this.recognition.interimResults,
          安全上下文: window.isSecureContext,
          协议: window.location.protocol
        });
      } catch (error) {
        console.error('❌ 创建语音识别实例失败:', error);
        this.isSupported = false;
      }
    } else {
      console.warn('当前浏览器不支持语音识别');
    }
  }

  // 智能语言设置 - 针对不同平台和浏览器优化
  setupLanguage() {
    const browserLang = navigator.language || navigator.userLanguage || 'zh-CN';

    console.log('🌐 检测到浏览器语言:', browserLang);
    console.log('🌐 平台信息:', this.platformInfo);

    // 针对 macOS Edge 的特殊处理
    if (this.platformInfo.isMac && this.platformInfo.isEdge) {
      console.log('🍎 macOS Edge 浏览器，使用优化的语言配置策略');

      // macOS Edge 更兼容标准的语言代码，避免使用过于简化的代码
      if (browserLang.includes('zh') || browserLang.includes('cn')) {
        // 优先使用最兼容的中文代码
        this.recognition.lang = 'zh-CN';
        console.log('🍎 macOS Edge 设置为中文简体 (zh-CN)');
      } else {
        // 其他语言使用最兼容的英文设置
        this.recognition.lang = 'en-US';
        console.log('🍎 macOS Edge 设置为美式英语 (en-US)');
      }
    } else {
      // 其他平台使用原有策略
      if (browserLang.startsWith('zh')) {
        this.recognition.lang = 'zh-CN';
      } else if (browserLang.startsWith('en')) {
        this.recognition.lang = 'en-US';
      } else {
        this.recognition.lang = 'en-US';
      }
    }

    console.log('🎯 设置语音识别语言为:', this.recognition.lang);

    // 验证语言设置
    try {
      const testRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      testRecognition.lang = this.recognition.lang;
      console.log('✅ 语言设置验证通过');
    } catch (error) {
      console.warn('⚠️ 语言设置验证失败，使用默认设置:', error);
      // 使用最安全的后备设置
      this.recognition.lang = 'en-US';
    }
  }

  // 尝试后备语言 - 针对不同平台优化的后备机制
  tryFallbackLanguage() {
    const currentLang = this.recognition.lang;

    console.log('🔄 尝试后备语言，当前语言:', currentLang);

    // 根据平台选择不同的后备语言策略
    let fallbackLanguages;

    if (this.platformInfo.isMac && this.platformInfo.isEdge) {
      // macOS Edge 专用后备序列 - 使用最兼容的语言代码
      console.log('🍎 使用 macOS Edge 专用后备语言序列');
      fallbackLanguages = [
        'zh-CN',    // 中文简体 - 最兼容
        'en-US',    // 美式英语 - 最兼容  
        'en-GB',    // 英式英语 - 备选
        'en'        // 通用英文 - 最后备选
      ];
    } else {
      // 其他平台使用原有策略
      fallbackLanguages = [
        'zh-CN',    // 中文简体 - 最常用
        'en-US',    // 美式英语 - 最兼容
        'zh',       // 通用中文
        'en'        // 通用英文
      ];
    }

    const currentIndex = fallbackLanguages.indexOf(currentLang);

    if (currentIndex >= 0 && currentIndex < fallbackLanguages.length - 1) {
      // 还有后备语言可用
      this.recognition.lang = fallbackLanguages[currentIndex + 1];
      console.log('✅ 切换到后备语言:', this.recognition.lang);
      return true;
    } else if (currentIndex === -1) {
      // 当前语言不在列表中，使用最兼容的设置
      const safestLang = 'en-US'; // 统一使用最安全的语言代码
      this.recognition.lang = safestLang;
      console.log('✅ 使用最兼容的后备语言:', this.recognition.lang);
      return true;
    }

    console.log('❌ 所有后备语言已尝试完毕');
    return false; // 没有更多后备语言
  }

  // 开始语音识别
  async startListening(continuous = false, appendMode = false) {
    // 预先处理 macOS Edge 的权限检查
    if (this.platformInfo.isMac && this.platformInfo.isEdge) {
      console.log('🍎 macOS Edge 预检查权限');
      try {
        const permission = await this.checkMicrophonePermission();
        if (permission === 'denied') {
          throw new Error('macOS Edge 麦克风权限被拒绝，请检查系统和浏览器权限设置');
        } else if (permission === 'granted') {
          console.log('✅ macOS Edge 权限已确认，等待系统稳定...');
          // 权限确认后等待一下，让系统稳定
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        if (error.message.includes('权限被拒绝')) {
          throw error;
        }
        // 其他错误继续处理
        console.warn('⚠️ macOS Edge 权限预检查出错，继续尝试:', error);
      }
    }

    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject(new Error('浏览器不支持语音识别'));
        return;
      }

      if (this.isListening) {
        reject(new Error('语音识别正在进行中'));
        return;
      }

      // 配置模式
      this.continuousMode = continuous;
      this.appendMode = appendMode;

      // 如果不是追加模式，清空累积文本
      if (!appendMode) {
        this.accumulatedText = '';
      }

      // 动态设置continuous模式
      this.recognition.continuous = continuous;

      console.log('🚀 开始语音识别', {
        language: this.recognition.lang,
        continuous: continuous,
        appendMode: appendMode,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      this.isListening = true;
      let finalTranscript = '';
      let interimTranscript = '';
      let hasReceivedSpeech = false;
      let hasReceivedAudio = false;
      let startTime = Date.now();

      // 识别开始事件
      this.recognition.onstart = () => {
        console.log('✅ 语音识别已启动', {
          language: this.recognition.lang,
          continuous: this.recognition.continuous,
          interimResults: this.recognition.interimResults
        });
      };

      // 音频开始事件
      this.recognition.onaudiostart = () => {
        hasReceivedAudio = true;
        console.log('🎤 音频捕获已开始，开始监听麦克风');
      };

      // 音频结束事件  
      this.recognition.onaudioend = () => {
        console.log('🎤 音频捕获已结束');
      };

      // 语音开始事件
      this.recognition.onspeechstart = () => {
        console.log('🗣️ 检测到语音输入');
        hasReceivedSpeech = true;
      };

      // 语音结束事件
      this.recognition.onspeechend = () => {
        console.log('🗣️ 语音输入结束');
      };

      // 声音开始事件
      this.recognition.onsoundstart = () => {
        console.log('🔊 检测到声音输入');
      };

      // 声音结束事件
      this.recognition.onsoundend = () => {
        console.log('🔊 声音输入结束');
      };

      // 识别结果事件
      this.recognition.onresult = (event) => {
        console.log('收到识别结果:', event.results);
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          console.log(`结果 ${i}: "${transcript}", 是否最终: ${event.results[i].isFinal}`);

          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        // 在持续模式下累积最终结果
        if (final && this.continuousMode) {
          this.accumulatedText += final;
          console.log('累积文本更新:', this.accumulatedText);
        }

        finalTranscript = final;
        interimTranscript = interim;

        // 触发实时结果回调
        if (this.onInterimResult) {
          const displayText = this.continuousMode
            ? this.accumulatedText + interimTranscript
            : finalTranscript + interimTranscript;
          this.onInterimResult(displayText);
        }
      };

      // 识别结束事件
      this.recognition.onend = () => {
        const duration = Date.now() - startTime;
        const resultText = this.continuousMode ? this.accumulatedText : finalTranscript;

        console.log('🏁 语音识别结束', {
          duration: `${duration}ms`,
          finalTranscript,
          accumulatedText: this.accumulatedText,
          resultText,
          hasReceivedSpeech,
          hasReceivedAudio,
          continuousMode: this.continuousMode,
          transcriptLength: resultText.length
        });

        this.isListening = false;

        // 在持续模式下，只要不是立即结束，都认为是正常的
        if (this.continuousMode) {
          console.log('✅ 持续模式识别结束:', resultText.trim());
          resolve(resultText.trim());
          return;
        }

        // 单次模式的判断逻辑
        if (finalTranscript && finalTranscript.trim()) {
          // 有识别结果，正常返回
          console.log('✅ 识别成功:', finalTranscript.trim());
          resolve(finalTranscript.trim());
        } else if (duration < 50) {
          // 极短时间，明显异常
          console.warn('⚠️ 语音识别立即结束（<50ms），可能是权限或配置问题');
          reject(new Error('语音识别启动异常，请稍等片刻后重试'));
        } else {
          // 所有其他情况都当作正常，即使是权限对话框导致的中断
          console.log('ℹ️ 语音识别正常结束，可能是权限确认中断或无语音内容');
          resolve(''); // 返回空字符串，让用户重新尝试
        }
      };

      // 识别错误事件
      this.recognition.onerror = (event) => {
        const errorDetails = {
          error: event.error,
          timeStamp: event.timeStamp,
          duration: Date.now() - startTime + 'ms',
          currentLanguage: this.recognition.lang,
          hasReceivedSpeech: hasReceivedSpeech,
          hasReceivedAudio: hasReceivedAudio,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        };

        console.error('🚨 语音识别错误事件触发！');
        console.error('📋 错误详情:', errorDetails);
        console.log('🔍 请将上述错误信息截图反馈以便调试');

        this.isListening = false;
        let errorMessage = '语音识别失败';

        switch (event.error) {
          case 'no-speech':
            errorMessage = '未检测到语音，请确保麦克风正常并重试';
            break;
          case 'audio-capture':
            errorMessage = '无法访问麦克风，请检查麦克风是否正常连接';
            break;
          case 'not-allowed': {
            // 权限被拒绝 - 检查是否是权限对话框期间的误报
            const duration = Date.now() - startTime;
            if (duration < 1000) {
              // 很快就出现not-allowed，可能是权限对话框还在处理中
              console.log('⚠️ 权限错误出现过快，可能是权限对话框期间的误报，等待重试');
              errorMessage = '请在权限对话框中点击"允许"，然后重新尝试';
            } else {
              // 时间较长后的权限拒绝，根据平台给出具体指导
              if (this.platformInfo.isMac && this.platformInfo.isEdge) {
                errorMessage = 'macOS Edge 麦克风权限被拒绝。请按以下步骤操作：\n' +
                  '1. 点击地址栏左侧的麦克风图标\n' +
                  '2. 选择"允许"\n' +
                  '3. 检查 macOS 系统偏好设置 > 安全性与隐私 > 麦克风\n' +
                  '4. 确保 Microsoft Edge 已被允许访问麦克风\n' +
                  '5. 重新加载页面后重试';
              } else if (this.platformInfo.isEdge) {
                errorMessage = '麦克风权限被拒绝。请点击地址栏左侧的麦克风图标，选择"允许"，然后重试';
              } else if (this.platformInfo.isChrome) {
                errorMessage = '麦克风权限被拒绝。请点击地址栏左侧的麦克风图标，选择"始终允许"，然后刷新页面';
              } else {
                errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问';
              }
            }
            break;
          }
          case 'network':
            errorMessage = '网络错误，请检查网络连接';
            break;
          case 'language-not-supported': {
            console.log('🔄 语言不支持，尝试后备语言');
            // 尝试使用后备语言，但限制重试次数
            if (!this.retryCount) this.retryCount = 0;
            this.retryCount++;

            // macOS Edge 需要更长的重试间隔和更多尝试次数
            const maxRetries = (this.platformInfo.isMac && this.platformInfo.isEdge) ? 3 : 2;
            const baseDelay = (this.platformInfo.isMac && this.platformInfo.isEdge) ? 800 : 300;

            if (this.retryCount <= maxRetries && this.tryFallbackLanguage()) {
              console.log(`🔄 第${this.retryCount}次重试，使用后备语言:`, this.recognition.lang);

              // macOS Edge 的特殊提示
              if (this.platformInfo.isMac && this.platformInfo.isEdge && this.retryCount === 1) {
                console.log('🍎 macOS Edge 第一次重试，这可能需要稍长时间...');
              }

              // 重新启动识别，使用递增的等待时间
              setTimeout(() => {
                try {
                  this.isListening = true; // 重置状态
                  this.recognition.start();
                } catch (restartError) {
                  console.error('❌ 重启语音识别失败:', restartError);
                  this.isListening = false;
                  reject(new Error('语音识别重启失败：' + restartError.message));
                }
              }, baseDelay * this.retryCount); // 递增等待时间
              return;
            } else {
              this.retryCount = 0; // 重置重试计数
              console.error('❌ 语言支持问题，已尝试多种配置');

              // 为 macOS Edge 提供更具体的错误信息
              if (this.platformInfo.isMac && this.platformInfo.isEdge) {
                errorMessage = 'macOS Edge 语音识别配置问题。请尝试：\n' +
                  '1. 刷新页面后重试\n' +
                  '2. 检查 Edge 浏览器是否为最新版本\n' +
                  '3. 在系统偏好设置中确认麦克风权限\n' +
                  '4. 或者尝试使用 Chrome/Safari 浏览器';
              } else {
                errorMessage = '您的浏览器或系统暂时无法使用语音识别。建议：1) 检查浏览器是否为最新版本 2) 尝试刷新页面 3) 切换到Chrome浏览器';
              }
            }
            break;
          }
          case 'service-not-allowed':
            errorMessage = '语音识别服务不可用，请检查网络连接或稍后重试';
            break;
          case 'aborted':
            errorMessage = '语音识别被中断';
            break;
          default:
            errorMessage = `语音识别错误: ${event.error}`;
            console.error('未知的语音识别错误:', event.error);
        }

        reject(new Error(errorMessage));
      };

      // 配置权限请求处理
      let permissionHandled = false;
      let recognitionStarted = false;

      // 监听权限变化（如果支持）
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'microphone' }).then((permissionStatus) => {
          console.log('📱 初始权限状态:', permissionStatus.state);

          permissionStatus.onchange = () => {
            console.log('📱 权限状态变更:', permissionStatus.state);
            permissionHandled = true;
          };
        }).catch(err => {
          console.log('⚠️ 无法查询权限状态:', err);
        });
      }

      // 启动语音识别，并处理权限请求
      try {
        console.log('🚀 准备启动语音识别...');

        // macOS Edge 需要特殊的启动策略
        if (this.platformInfo.isMac && this.platformInfo.isEdge) {
          console.log('🍎 macOS Edge 使用特殊启动策略');

          // 给 macOS Edge 更多时间处理权限
          setTimeout(() => {
            if (!recognitionStarted && !permissionHandled) {
              console.log('⏰ macOS Edge 权限处理中，请耐心等待...');
            }
          }, 1000);

          // macOS Edge 延迟启动，避免权限冲突
          setTimeout(() => {
            try {
              this.recognition.start();
              recognitionStarted = true;
              console.log('✅ macOS Edge 语音识别延迟启动成功');
            } catch (delayedError) {
              console.error('❌ macOS Edge 延迟启动失败:', delayedError);
              this.isListening = false;
              reject(new Error(`macOS Edge 启动失败: ${delayedError.message}`));
            }
          }, 200); // 延迟200ms启动
        } else {
          // 其他平台使用较短的超时
          setTimeout(() => {
            if (!recognitionStarted && !permissionHandled) {
              console.log('⏰ 权限可能仍在处理中...');
            }
          }, 500);

          // 立即启动语音识别
          this.recognition.start();
          recognitionStarted = true;
          console.log('✅ 语音识别启动成功');
        }

      } catch (error) {
        console.error('❌ 启动语音识别异常:', error);
        this.isListening = false;

        // 特殊处理不同类型的错误
        if (error.name === 'SecurityError') {
          reject(new Error('安全限制：请通过HTTPS或localhost访问以使用语音功能'));
        } else if (this.platformInfo.isMac && this.platformInfo.isEdge && error.name === 'InvalidStateError') {
          // macOS Edge 可能出现的状态错误，尝试重新初始化
          console.log('🔄 macOS Edge 状态错误，尝试重新初始化...');
          setTimeout(() => {
            this.initializeSpeechRecognition();
            // 延迟重试
            setTimeout(() => {
              if (!this.isListening) {
                console.log('🔄 重新尝试启动语音识别');
                this.startListening().then(resolve).catch(reject);
              }
            }, 1000);
          }, 500);
          return; // 不立即拒绝，等待重试
        } else {
          reject(new Error(`启动失败: ${error.message}`));
        }
      }
    });
  }

  // 停止语音识别
  stopListening() {
    if (this.recognition && this.isListening) {
      console.log('🛑 手动停止语音识别', {
        continuousMode: this.continuousMode,
        accumulatedText: this.accumulatedText
      });
      this.recognition.stop();
    }
  }

  // 中断语音识别
  abortListening() {
    if (this.recognition && this.isListening) {
      console.log('⏹️ 中断语音识别');
      this.recognition.abort();
      this.isListening = false;
      this.continuousMode = false;
    }
  }

  // 开始持续录音
  async startContinuousListening(appendMode = false) {
    console.log('🔄 开始持续录音模式', { appendMode });
    return this.startListening(true, appendMode);
  }

  // 开始追加录音（继续说话）
  async startAppendListening() {
    console.log('➕ 开始追加录音模式');
    return this.startListening(true, true);
  }

  // 获取当前累积的文本
  getAccumulatedText() {
    return this.accumulatedText;
  }

  // 清空累积文本
  clearAccumulatedText() {
    this.accumulatedText = '';
    console.log('🗑️ 已清空累积文本');
  }

  // 检查是否在持续模式中
  isContinuousMode() {
    return this.continuousMode;
  }

  // 设置实时结果回调
  setInterimResultCallback(callback) {
    this.onInterimResult = callback;
  }

  // 检查麦克风权限 - 针对不同平台优化
  async checkMicrophonePermission() {
    try {
      // macOS Edge 需要特殊处理
      if (this.platformInfo.isMac && this.platformInfo.isEdge) {
        console.log('🍎 macOS Edge 浏览器，使用特殊权限检查策略');

        // macOS Edge 的权限查询可能不稳定，先尝试直接获取媒体流
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          console.log('✅ macOS Edge 直接获取麦克风权限成功');
          stream.getTracks().forEach(track => track.stop());
          return 'granted';
        } catch (mediaError) {
          console.log('⚠️ macOS Edge 直接权限获取失败:', mediaError.name);
          if (mediaError.name === 'NotAllowedError') {
            return 'denied';
          } else if (mediaError.name === 'NotFoundError') {
            return 'denied'; // 没有找到麦克风设备
          } else {
            return 'prompt'; // 其他错误假设需要提示
          }
        }
      }

      // 其他 Edge 浏览器的处理
      if (this.platformInfo.isEdge) {
        console.log('🔄 其他 Edge 浏览器，跳过权限预检查');
        return 'prompt';
      }

      // 非 Edge 浏览器尝试权限查询
      if (navigator.permissions && navigator.permissions.query) {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        console.log('权限查询结果:', permission.state);
        return permission.state;
      }

      // 如果不支持权限查询，返回prompt让后续处理
      console.log('浏览器不支持权限查询，返回prompt');
      return 'prompt';
    } catch (error) {
      console.log('权限检查出错，返回prompt:', error);
      return 'prompt';
    }
  }

  // 请求麦克风权限 - 直接在语音识别中处理
  async requestMicrophonePermission() {
    try {
      console.log('尝试获取麦克风权限');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('麦克风权限获取成功');
      stream.getTracks().forEach(track => track.stop()); // 立即停止
      return true;
    } catch (error) {
      console.error('获取麦克风权限失败:', error.name, error.message);
      return false;
    }
  }

  // 手动设置语言
  setLanguage(language) {
    if (this.recognition && !this.isListening) {
      this.recognition.lang = language;
      console.log('手动设置语音识别语言为:', language);
      return true;
    } else if (this.isListening) {
      console.warn('语音识别进行中，无法更改语言');
      return false;
    }
    return false;
  }

  // 获取当前语言
  getCurrentLanguage() {
    return this.recognition ? this.recognition.lang : null;
  }

  // 获取支持的语言列表
  getSupportedLanguages() {
    return [
      { code: 'zh-CN', name: '中文（简体）' },
      { code: 'zh-TW', name: '中文（繁体）' },
      { code: 'zh-HK', name: '中文（香港）' },
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'ja-JP', name: '日本語' },
      { code: 'ko-KR', name: '한국어' }
    ];
  }

  // macOS Edge 专用诊断
  async diagnoseMacOSEdge() {
    if (!(this.platformInfo.isMac && this.platformInfo.isEdge)) {
      return { applicable: false, message: '此诊断仅适用于 macOS Edge 浏览器' };
    }

    const diagnosis = {
      applicable: true,
      timestamp: new Date().toISOString(),
      platform: this.platformInfo,
      issues: [],
      suggestions: []
    };

    // 检查 macOS 系统权限
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      diagnosis.systemPermission = 'granted';
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      diagnosis.systemPermission = 'denied';
      diagnosis.issues.push(`系统麦克风权限问题: ${error.name}`);
      diagnosis.suggestions.push('请检查 macOS 系统偏好设置 > 安全性与隐私 > 麦克风，确保 Microsoft Edge 已被允许');
    }

    // 检查语音识别 API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      diagnosis.issues.push('Web Speech API 不可用');
      diagnosis.suggestions.push('请更新 Microsoft Edge 到最新版本');
    } else {
      try {
        const testRec = new SpeechRecognition();
        testRec.lang = 'en';
        diagnosis.speechAPIWorking = true;
      } catch (error) {
        diagnosis.speechAPIWorking = false;
        diagnosis.issues.push(`语音识别 API 创建失败: ${error.message}`);
      }
    }

    // 检查安全上下文
    if (!window.isSecureContext) {
      diagnosis.issues.push('非安全上下文（需要 HTTPS）');
      diagnosis.suggestions.push('请通过 HTTPS 或 localhost 访问');
    }

    return diagnosis;
  }

  // 详细诊断功能
  async performDiagnostics() {
    const results = {
      timestamp: new Date().toISOString(),
      browser: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform
      },
      webSpeechAPI: {
        supported: false,
        standardAPI: !!window.SpeechRecognition,
        webkitAPI: !!window.webkitSpeechRecognition,
        canCreateInstance: false
      },
      microphone: {
        permission: 'unknown',
        devices: [],
        error: null
      },
      languageSupport: {
        currentLanguage: null,
        testResults: []
      }
    };

    // 1. 检测 Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      results.webSpeechAPI.supported = true;

      try {
        const testRecognition = new SpeechRecognition();
        results.webSpeechAPI.canCreateInstance = true;
        results.languageSupport.currentLanguage = testRecognition.lang;
      } catch (error) {
        results.webSpeechAPI.error = error.message;
      }
    }

    // 2. 检测麦克风权限和设备
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      results.microphone.permission = 'granted';

      const audioTracks = stream.getAudioTracks();
      results.microphone.devices = audioTracks.map(track => ({
        label: track.label,
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState
      }));

      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      results.microphone.permission = 'denied';
      results.microphone.error = `${error.name}: ${error.message}`;
    }

    // 3. 测试语言支持
    if (results.webSpeechAPI.canCreateInstance) {
      const testLanguages = ['zh-CN', 'zh', 'en-US', 'en'];

      for (const lang of testLanguages) {
        try {
          const testRecognition = new SpeechRecognition();
          testRecognition.lang = lang;
          results.languageSupport.testResults.push({
            language: lang,
            status: 'configurable'
          });
        } catch (error) {
          results.languageSupport.testResults.push({
            language: lang,
            status: 'error',
            error: error.message
          });
        }
      }
    }

    return results;
  }

  // 获取当前状态
  getStatus() {
    const status = {
      isSupported: this.isSupported,
      isListening: this.isListening,
      currentLanguage: this.getCurrentLanguage(),
      platform: this.platformInfo
    };

    // 为 macOS Edge 添加额外状态信息
    if (this.platformInfo.isMac && this.platformInfo.isEdge) {
      status.macOSEdgeOptimizations = {
        specialLanguageHandling: true,
        conservativeConfig: this.recognition ? !this.recognition.interimResults : false,
        enhancedErrorHandling: true
      };
    }

    return status;
  }

  // 快速检查是否为 macOS Edge
  isMacOSEdge() {
    return this.platformInfo.isMac && this.platformInfo.isEdge;
  }

  // 获取针对 macOS Edge 的使用建议
  getMacOSEdgeGuidance() {
    if (!this.isMacOSEdge()) {
      return null;
    }

    return {
      setup: [
        '确保 macOS 系统偏好设置中已允许 Microsoft Edge 访问麦克风',
        '在浏览器地址栏中允许麦克风权限',
        '建议使用 HTTPS 连接以获得最佳兼容性'
      ],
      troubleshooting: [
        '如果遇到权限问题，请重新加载页面',
        '确保没有其他应用程序正在使用麦克风',
        '尝试在 Chrome 或 Safari 中测试以排除系统问题',
        '检查 Edge 浏览器是否为最新版本'
      ],
      technicalNotes: [
        'macOS Edge 使用了优化的语言设置策略',
        '中间结果功能已禁用以提高稳定性',
        '增强了错误处理和重试机制'
      ]
    };
  }
}

// 创建单例实例
const speechService = new SpeechService();

export default speechService; 