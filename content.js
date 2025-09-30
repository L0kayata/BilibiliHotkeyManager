// 当前拦截的按键配置
let blockedKeys = {};

// 添加全屏状态跟踪
let isFullscreen = false;
let playerContainer = null;
let playerObserver = null;

// 初始化
(async function init() {
    await loadBlockedKeys();
    setupKeyboardInterception();
    setupWheelInterception(); 
    setupFullscreenDetection();
    setupMessageListener();
})();

// 从存储加载配置
async function loadBlockedKeys() {
    try {
        const result = await chrome.storage.sync.get(['blockedKeys']);
        blockedKeys = result.blockedKeys || {
            'g': false,
            'q': false,
            'w': false,
            'e': false,
            'r': false,
            'f': false,
            'd': false,
            'm': false,
            'arrows': false,
            'volume': false,
            'wheel': false,  
            'brackets': false
        };
    } catch (error) {
        console.error('BilibiliHotkeyManager: 载入配置失败', error);
    }
}

// 设置键盘事件拦截
function setupKeyboardInterception() {
    // 使用捕获阶段拦截，确保在网站脚本之前处理
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keypress', handleKeyPress, true);
    document.addEventListener('keyup', handleKeyUp, true);
}

// 处理keydown事件
function handleKeyDown(event) {
    if (shouldBlockKey(event)) {
        event.stopImmediatePropagation();
        event.preventDefault();
        console.log(`BilibiliHotkeyManager: 已拦截快捷键 ${event.key}`);
    }
}

// 处理keypress事件
function handleKeyPress(event) {
    if (shouldBlockKey(event)) {
        event.stopImmediatePropagation();
        event.preventDefault();
    }
}

// 新增 keyup 处理
function handleKeyUp(event) {
    if (shouldBlockKey(event)) {
        event.stopImmediatePropagation();
        event.preventDefault();
    }
}

// 判断是否应该拦截按键
function shouldBlockKey(event) {
    // 检查是否为目标按键
    const key = event.key.toLowerCase();
    let keyType = null;
    // 单个按键检测
    if (!blockedKeys.hasOwnProperty(key)) {
        keyType = key;
    }
    // 对键检测
    if ((key === 'arrowleft' || key === 'arrowright') && blockedKeys['arrows']) {
        keyType = 'arrows';
    } else if ((key === 'arrowup' || key === 'arrowdown') && blockedKeys['volume']) {
        keyType = 'volume';
    } else if ((key === '[' || key === ']') && blockedKeys['brackets']) {
        keyType = 'brackets';
    } else if (blockedKeys.hasOwnProperty(key)) {
        keyType = key;
    }

    if (!keyType) {
        return false;
    }

    // 检查是否启用拦截
    if (!blockedKeys[keyType]) {
        return false;
    }

    // 排除特殊情况：在输入框中
    const target = event.target;
    if (target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
    )) {
        return false;
    }

    // 排除组合键（如Ctrl+F等浏览器原生快捷键）
    if (event.ctrlKey || event.altKey || event.metaKey) {
        return false;
    }

    return true;
}

// 监听来自popup的消息
function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'UPDATE_BLOCKED_KEYS') {
            blockedKeys = request.blockedKeys;
            sendResponse({ success: true });
        }
    });
}

// 设置全屏状态检测
function setupFullscreenDetection() {
    // 等待页面加载完成后再查找播放器
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', findPlayerContainer);
    } else {
        findPlayerContainer();
    }
}

// 查找播放器容器并设置监听
function findPlayerContainer() {
    playerContainer = document.querySelector('.bpx-player-container');
    if (playerContainer) {
        // 初始检测全屏状态
        updateFullscreenState();
        
        // 设置观察者监听属性变化
        playerObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-screen') {
                    updateFullscreenState();
                }
            });
        });
        
        playerObserver.observe(playerContainer, {
            attributes: true,
            attributeFilter: ['data-screen']
        });
    } else {
        // 如果没找到播放器，延迟重试
        setTimeout(findPlayerContainer, 1000);
    }
}

// 更新全屏状态
function updateFullscreenState() {
    if (playerContainer) {
        const screenMode = playerContainer.getAttribute('data-screen');
        const newFullscreenState = screenMode === 'web' || screenMode === 'full';
        
        if (isFullscreen !== newFullscreenState) {
            isFullscreen = newFullscreenState;
            console.log(`BilibiliHotkeyManager: 全屏状态更新 - ${isFullscreen ? '是' : '否'} (${screenMode})`);
            // 全屏状态变化时，重新评估滚轮拦截
            updateWheelInterception();
        }
    }
}

// 滚轮监听器引用
let wheelListener = null;

// 设置滚轮事件拦截
function setupWheelInterception() {
    // 初始时不添加监听器，等需要时再添加
    updateWheelInterception();
}

// 更新滚轮拦截状态
function updateWheelInterception() {
    const needsInterception = blockedKeys['wheel'] && isFullscreen;
    
    if (needsInterception && !wheelListener) {
        // 需要拦截且还没有监听器时，添加监听器
        wheelListener = handleWheel;
        document.addEventListener('wheel', wheelListener, {
            passive: false,
            capture: true
        });
        console.log('BilibiliHotkeyManager: 已启用滚轮拦截');
    } else if (!needsInterception && wheelListener) {
        // 不需要拦截但有监听器时，移除监听器
        document.removeEventListener('wheel', wheelListener, {
            passive: false,
            capture: true
        });
        wheelListener = null;
        console.log('BilibiliHotkeyManager: 已停用滚轮拦截');
    }
}

// 处理滚轮事件（只有在需要拦截时才会被调用）
function handleWheel(event) {
    // 排除在输入框中的滚轮事件
    const target = event.target;
    if (target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
    )) {
        return;
    }
    
    event.stopPropagation();
    event.preventDefault();
    console.log('BilibiliHotkeyManager: 已拦截全屏滚轮事件');
}

// 扩展功能预留接口
function addNewKey(key, enabled = false) {
    if (!blockedKeys.hasOwnProperty(key)) {
        blockedKeys[key] = enabled;
        chrome.storage.sync.set({ blockedKeys });
    }
}

function removeKey(key) {
    if (blockedKeys.hasOwnProperty(key)) {
        delete blockedKeys[key];
        chrome.storage.sync.set({ blockedKeys });
    }
}

// 调试信息
console.log('BilibiliHotkeyManager: 内容脚本已加载');

// 清理观察者和监听器
function cleanup() {
    if (playerObserver) {
        playerObserver.disconnect();
    }
    
    // 清理滚轮监听器
    if (wheelListener) {
        document.removeEventListener('wheel', wheelListener, {
            passive: false,
            capture: true
        });
        wheelListener = null;
    }
}

// 页面卸载时清理
window.addEventListener('beforeunload', cleanup);