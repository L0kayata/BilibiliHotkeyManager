// 默认配置
const DEFAULT_KEYS = {
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

// 初始化popup
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    bindEvents();
});

// 加载设置
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get(['blockedKeys']);
        const blockedKeys = result.blockedKeys || DEFAULT_KEYS;

        // 更新开关状态
        Object.keys(blockedKeys).forEach(key => {
            const checkbox = document.querySelector(`[data-key="${key}"]`);
            if (checkbox) {
                checkbox.checked = !blockedKeys[key];
            }
        });
    } catch (error) {
        console.error('载入设置失败:', error);
    }
}

// 绑定事件
function bindEvents() {
    // 单个开关变化
    document.querySelectorAll('[data-key]').forEach(checkbox => {
        checkbox.addEventListener('change', handleKeyToggle);
    });

    // 全部开启
    document.getElementById('enable-all').addEventListener('click', () => {
        toggleAllKeys(true);
    });

    // 全部关闭
    document.getElementById('disable-all').addEventListener('click', () => {
        toggleAllKeys(false);
    });
}

// 处理单个按键开关
async function handleKeyToggle(event) {
    const key = event.target.getAttribute('data-key');
    const isBlocked = !event.target.checked;

    try {
        const result = await chrome.storage.sync.get(['blockedKeys']);
        const blockedKeys = result.blockedKeys || DEFAULT_KEYS;

        blockedKeys[key] = isBlocked;
        await chrome.storage.sync.set({ blockedKeys });

        // 通知content script更新
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url.includes('bilibili.com')) {
            chrome.tabs.sendMessage(tab.id, {
                type: 'UPDATE_BLOCKED_KEYS',
                blockedKeys
            });
        }
    } catch (error) {
        console.error('保存设置失败:', error);
    }
}

// 切换全部按键
async function toggleAllKeys(enabled) {
    try {
        const blockedKeys = { ...DEFAULT_KEYS };
        Object.keys(blockedKeys).forEach(key => {
            blockedKeys[key] = enabled;
        });

        await chrome.storage.sync.set({ blockedKeys });

        // 更新UI
        document.querySelectorAll('[data-key]').forEach(checkbox => {
            checkbox.checked = !enabled;
        });

        // 通知content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url.includes('bilibili.com')) {
            chrome.tabs.sendMessage(tab.id, {
                type: 'UPDATE_BLOCKED_KEYS',
                blockedKeys
            });
        }
    } catch (error) {
        console.error('批量设置失败:', error);
    }
}