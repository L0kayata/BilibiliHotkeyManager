// 当前拦截的按键配置
let blockedKeys = {};

// 初始化
(async function init() {
    await loadBlockedKeys();
    setupKeyboardInterception();
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
}

// 处理keydown事件
function handleKeyDown(event) {
    if (shouldBlockKey(event)) {
        event.stopPropagation();
        event.preventDefault();
        console.log(`BilibiliHotkeyManager: 已拦截快捷键 ${event.key}`);
    }
}

// 处理keypress事件
function handleKeyPress(event) {
    if (shouldBlockKey(event)) {
        event.stopPropagation();
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