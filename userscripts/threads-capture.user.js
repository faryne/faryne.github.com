// ==UserScript==
// @name         Threads 截圖工具
// @namespace    https://faryne.dev/
// @version      1.0.0
// @description  在 Threads 頁面快速呼叫 faryne.dev 截圖 API，並下載產生的 PNG。
// @author       Faryne
// @match        https://www.threads.net/*
// @match        https://threads.net/*
// @match        https://*.threads.net/*
// @match        https://www.threads.com/*
// @match        https://threads.com/*
// @match        https://*.threads.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      faryne.dev
// @run-at       document-idle
// ==/UserScript==

(() => {
  "use strict";

  const API_URL =
    "https://faryne.dev/api-integration/tools/threads/oembed_capture";
  const FLOATING_ID = "faryne-threads-capture-floating";
  const NOTICE_ID = "faryne-threads-capture-notice";

  GM_addStyle(`
    #${FLOATING_ID} {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      z-index: 2147483647;
      border: 3px solid #000000;
      border-radius: 999px;
      background: #00e5ff;
      color: #000000;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 16px;
      font-weight: 900;
      line-height: 1;
      padding: 15px 22px;
      min-width: 188px;
      text-align: center;
      white-space: nowrap;
      box-shadow:
        0 0 0 3px #ffffff,
        0 0 0 7px #000000,
        0 14px 34px rgba(0, 0, 0, 0.38);
      transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    }

    #${FLOATING_ID}:hover {
      background: #fff200;
      transform: translate(-50%, -2px);
      box-shadow:
        0 0 0 3px #ffffff,
        0 0 0 7px #000000,
        0 18px 42px rgba(0, 0, 0, 0.44);
    }

    #${FLOATING_ID}:disabled {
      cursor: wait;
      opacity: 0.78;
      transform: translateX(-50%);
      background: #f4f4f5;
    }

    #${NOTICE_ID} {
      position: fixed;
      left: 50%;
      bottom: 92px;
      transform: translateX(-50%);
      z-index: 2147483647;
      width: min(360px, calc(100vw - 40px));
      border-radius: 12px;
      padding: 12px 14px;
      background: #101010;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.45;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.2);
      box-sizing: border-box;
      text-align: center;
    }

    #${NOTICE_ID}[data-kind="error"] {
      background: #b42318;
    }
  `);

  function isThreadsPostUrl(value) {
    if (!value) {
      return false;
    }

    try {
      const url = new URL(value, location.href);
      const host = url.hostname.toLowerCase();
      const isThreadsHost =
        host === "threads.net" ||
        host.endsWith(".threads.net") ||
        host === "threads.com" ||
        host.endsWith(".threads.com");

      return isThreadsHost && /\/@[^/]+\/post\//.test(url.pathname);
    } catch {
      return false;
    }
  }

  function normalizePostUrl(value) {
    const url = new URL(value, location.href);
    url.hash = "";
    url.search = "";
    return url.toString();
  }

  function getCurrentPostUrl() {
    if (isThreadsPostUrl(location.href)) {
      return normalizePostUrl(location.href);
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && isThreadsPostUrl(canonical.href)) {
      return normalizePostUrl(canonical.href);
    }

    return "";
  }

  function findPostUrl(root) {
    if (!root) {
      return "";
    }

    const links = root.querySelectorAll('a[href*="/post/"]');
    for (const link of links) {
      if (isThreadsPostUrl(link.href)) {
        return normalizePostUrl(link.href);
      }
    }

    return getCurrentPostUrl();
  }

  function getCenteredPostUrl() {
    const currentUrl = getCurrentPostUrl();
    if (currentUrl) {
      return currentUrl;
    }

    const viewportCenter = window.innerHeight / 2;
    const articles = Array.from(document.querySelectorAll("article"));
    let bestPostUrl = "";
    let bestDistance = Infinity;

    for (const article of articles) {
      const rect = article.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        continue;
      }

      const postUrl = findPostUrl(article);
      if (!postUrl) {
        continue;
      }

      const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPostUrl = postUrl;
      }
    }

    return bestPostUrl;
  }

  function makeFilename(postUrl) {
    try {
      const url = new URL(postUrl);
      const suffix = url.pathname
        .split("/")
        .filter(Boolean)
        .slice(-3)
        .join("-")
        .replace(/[^a-zA-Z0-9._-]/g, "-");

      return `threads-${suffix || Date.now()}.png`;
    } catch {
      return `threads-${Date.now()}.png`;
    }
  }

  function notify(message, kind = "info") {
    let notice = document.getElementById(NOTICE_ID);
    if (!notice) {
      notice = document.createElement("div");
      notice.id = NOTICE_ID;
      document.body.appendChild(notice);
    }

    notice.dataset.kind = kind;
    notice.textContent = message;
    clearTimeout(notice._faryneTimer);
    notice._faryneTimer = window.setTimeout(() => notice.remove(), 4500);
  }

  function requestCapture(postUrl) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: API_URL,
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify({ url: postUrl }),
        responseType: "json",
        timeout: 60000,
        onload: (response) => {
          let body = response.response;

          if (!body && response.responseText) {
            try {
              body = JSON.parse(response.responseText);
            } catch {
              reject(new Error("API 回傳的內容不是合法 JSON"));
              return;
            }
          }

          if (response.status < 200 || response.status >= 300) {
            reject(new Error(body?.message || `API 回傳 HTTP ${response.status}`));
            return;
          }

          if (!body?.data?.img) {
            reject(new Error(body?.message || "API 沒有回傳圖片內容"));
            return;
          }

          resolve(body.data.img);
        },
        ontimeout: () => reject(new Error("截圖逾時，請稍後再試")),
        onerror: () => reject(new Error("無法連線到截圖 API")),
      });
    });
  }

  function downloadBase64Png(base64, postUrl) {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${base64}`;
    link.download = makeFilename(postUrl);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function capturePost(postUrl, button) {
    if (!postUrl) {
      notify("找不到可截圖的 Threads 貼文網址。請先開啟單篇貼文，或把想截的貼文捲到畫面中央。", "error");
      return;
    }

    const originalText = button?.textContent;
    if (button) {
      button.disabled = true;
      button.textContent = "產生中...";
    }

    try {
      notify("正在產生 Threads 截圖...");
      const base64 = await requestCapture(postUrl);
      downloadBase64Png(base64, postUrl);
      notify("截圖已產生並開始下載。");
    } catch (error) {
      notify(error instanceof Error ? error.message : "截圖失敗", "error");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  function ensureFloatingButton() {
    if (document.getElementById(FLOATING_ID)) {
      return;
    }

    const button = document.createElement("button");
    button.id = FLOATING_ID;
    button.type = "button";
    button.textContent = "截圖這則貼文";
    button.title = "截圖目前單篇貼文，或列表中最靠近畫面中央的貼文";
    button.setAttribute("aria-label", "截圖這則 Threads 貼文");
    button.addEventListener("click", () => capturePost(getCenteredPostUrl(), button));
    document.body.appendChild(button);
  }

  function boot() {
    ensureFloatingButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
