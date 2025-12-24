document.getElementById('startBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];

        // بررسی که آیا در صفحه اینستاگرام هستیم
        if (!tab.url || !tab.url.includes('instagram.com')) {
            document.getElementById('status').textContent = '❌ لطفاً صفحه اینستاگرام را باز کنید';
            return;
        }

        chrome.tabs.sendMessage(tab.id, { action: 'start' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Error:', chrome.runtime.lastError.message);
                document.getElementById('status').textContent = '🔄 در حال بارگذاری...';

                // اگر content script لود نشده، صفحه را refresh کنید
                setTimeout(() => {
                    document.getElementById('status').textContent = '⚠️ لطفاً صفحه را refresh کنید';
                }, 1000);
            } else if (response && response.status) {
                document.getElementById('status').textContent = response.status;
            }
        });
    });
});

document.getElementById('stopBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];

        if (!tab.url || !tab.url.includes('instagram.com')) {
            document.getElementById('status').textContent = '❌ لطفاً صفحه اینستاگرام را باز کنید';
            return;
        }

        chrome.tabs.sendMessage(tab.id, { action: 'stop' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Error:', chrome.runtime.lastError.message);
                document.getElementById('status').textContent = '⚠️ اسکرولی در حال اجرا نیست';
            } else if (response && response.status) {
                document.getElementById('status').textContent = response.status;
            }
        });
    });
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'status') {
        document.getElementById('status').textContent = msg.text;
    }
});
