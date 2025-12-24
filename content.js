let isScrolling = false;
let scrollInterval = null;
let clickInterval = null;
let noChangeCount = 0;

let waitingForLazyLoad = false;
let waitStartTime = null;
let lazyWaitRound = 0;

function startLazyWait() {
    waitingForLazyLoad = true;
    waitStartTime = Date.now();
    lazyWaitRound++;

    chrome.runtime.sendMessage({
        action: 'status',
        text: `⏳ صبر برای لود کامنت‌ها (${lazyWaitRound}/2) – ۱۵ ثانیه`
    });

    console.log('⏳ Lazy wait started, round:', lazyWaitRound);

    setTimeout(() => {
        waitingForLazyLoad = false;
    }, 15000);
}

function findCommentContainer() {

    /* 1️⃣ حالت Modal (فید) */
    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) {
        const scrollables = dialog.querySelectorAll('*');
        for (let el of scrollables) {
            const style = getComputedStyle(el);
            if (
                (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
                el.scrollHeight > el.clientHeight
            ) {
                return el;
            }
        }
    }

    /* 2️⃣ حالت تب مستقل (تشخیص هوشمند بدون کلاس) */
    const article = document.querySelector('article');
    if (article) {
        const candidates = article.querySelectorAll('div');

        for (let el of candidates) {
            if (
                el.scrollHeight > el.clientHeight &&
                el.querySelector('ul') &&
                el.innerText.match(/reply|repl|پاسخ|مشاهده پاسخ/i)
            ) {
                return el;
            }
        }
    }

    return null;
}

function clickAllLoadMoreButtons() {
    let clickCount = 0;

    document.querySelectorAll('div[role="button"]').forEach(btn => {
        const span = btn.querySelector('span');
        if (!span) return;

        const text = span.textContent.trim();
        if (
            /view .*repl/i.test(text) ||
            text.includes('مشاهده پاسخ') ||
            text.includes('نمایش پاسخ')
        ) {
            btn.click();
            clickCount++;
            console.log('Clicked REAL button:', text);
        }
    });

    return clickCount;
}

/*
// تابع برای پیدا کردن بخش کامنت‌ها
function findCommentContainer() {
    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) {
        const scrollables = dialog.querySelectorAll('*');
        for (let el of scrollables) {
            const style = window.getComputedStyle(el);
            const hasOverflow = style.overflowY === 'scroll' || style.overflowY === 'auto';
            const isScrollable = el.scrollHeight > el.clientHeight;
            const hasComments = el.querySelector('ul') || el.querySelector('li');

            if (hasOverflow && isScrollable && hasComments) {
                return el;
            }
        }
    }

    const selectors = [
        'div[role="dialog"] div[style*="overflow-y: auto"]',
        'div[role="dialog"] div[style*="overflow-y: scroll"]',
        'div[role="dialog"] ul'
    ];

    for (let selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.scrollHeight > element.clientHeight) {
            return element;
        }
    }

    return null;
}
*/
function scrollComments() {
    if (waitingForLazyLoad) return;

    const container = findCommentContainer();
    if (!container) {
        stopScrolling();
        return;
    }

    const previousScroll =
        container === document.body || container === document.documentElement
            ? window.scrollY
            : container.scrollTop;

    // ✅ اسکرول درست
    if (container === document.body || container === document.documentElement) {
        window.scrollBy(0, 400);
    } else {
        container.scrollTop += 400;
    }

    setTimeout(() => {
        const currentScroll =
            container === document.body || container === document.documentElement
                ? window.scrollY
                : container.scrollTop;

        if (Math.abs(currentScroll - previousScroll) < 5) {
            noChangeCount++;

            if (noChangeCount >= 2) {
                const clicked = clickAllLoadMoreButtons();

                if (clicked > 0 && lazyWaitRound < 2) {
                    noChangeCount = 0;
                    startLazyWait();
                    return;
                }

                if (lazyWaitRound >= 2) {
                    stopScrolling();
                    alert('✅ تمام کامنت‌ها لود شدند');
                }
            }
        } else {
            noChangeCount = 0;
        }
    }, 1500);
}


// شروع اسکرول
function startScrolling() {
    lazyWaitRound = 0;
    waitingForLazyLoad = false;
    if (isScrolling) {
        return { status: '⚠️ در حال اسکرول است' };
    }

    const container = findCommentContainer();
    if (!container) {
        alert('❌ بخش کامنت پیدا نشد!\n\nلطفاً روی یک پست کلیک کنید');
        return { status: '❌ بخش کامنت پیدا نشد' };
    }

    isScrolling = true;
    noChangeCount = 0;

    console.log('=== اسکرول شروع شد ===');

    // اسکرول مداوم - هر 600ms
    scrollInterval = setInterval(() => {
        scrollComments();
    }, 600);

    // کلیک دکمه‌های load more - هر 2 ثانیه
    clickInterval = setInterval(() => {
        const clicked = clickAllLoadMoreButtons();
        if (clicked > 0) {
            console.log(`${clicked} دکمه کلیک شد`);
        }
    }, 2000);

    alert('✅ اسکرول شروع شد!\n\n• هر 2 ثانیه دکمه‌های "View replies" کلیک می‌شوند\n• صبور باشید تا تمام کامنت‌ها لود شوند');
    return { status: '✅ در حال اسکرول و کلیک...' };
}

// stop scroll
function stopScrolling() {
    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
    }
    if (clickInterval) {
        clearInterval(clickInterval);
        clickInterval = null;
    }
    isScrolling = false;
    console.log('=== stop scrolling ===');
    return { status: '⏹️ stopping scroll' };
}

//  popup message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'start') {
        const response = startScrolling();
        sendResponse(response);
    } else if (request.action === 'stop') {
        const response = stopScrolling();
        sendResponse(response);
    }
    return true;
});
