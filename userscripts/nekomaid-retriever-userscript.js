// ==UserScript==
// @name           Indescribable Retriever (Modernized)
// @namespace      tw.maid.neko
// @description    Grab artwork and host on neko.maid.tw domain. Supports Pixiv, Nico Seiga, and Tinami.
// @description:zh 難以名狀的抓圖器：抓 Pixiv/Nico 靜畫/Tinami 作品的小工具 (現代化美化版)
// @version        2.3
// @match          *://www.pixiv.net/member_illust.php?*
// @match          *://www.pixiv.net/artworks/*
// @match          *://www.pixiv.com/en/artworks/*
// @match          *://www.pixiv.com/member_illust.php?*
// @match          *://seiga.nicovideo.jp/seiga/*
// @match          *://www.tinami.com/view/*
// @grant          GM_xmlhttpRequest
// @grant          GM_addStyle
// @require        https://code.jquery.com/jquery-3.6.0.min.js
// @copyright      Faryne, 2012-2026. <https://nekomaid.web.app/>
// ==/UserScript==

(function() {
  'use strict';

  const CONFIG = {
    name: "難以名狀的抓圖器",
    defaultText: "📥 抓取並備份作品",
    loadingText: "⌛ 正在處理中...",
    finishText: "✅ 抓取完成",
    hintText: "支援 Pixiv, Nico, Tinami",
    copyrightUrl: "https://nekomaid.web.app/",
    apiUrl: "https://neko.maid.tw/retrieve.json"
  };

  // 注入樣式
  GM_addStyle(`
    #ir-container {
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      padding: 16px;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      border: 1px solid rgba(255,255,255,0.4);
      transition: all 0.3s ease;
    }
    .ir-title {
      font-size: 12px;
      font-weight: 800;
      color: #0096fa;
      margin-bottom: 2px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.05);
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .ir-title:hover {
      opacity: 0.7;
      text-decoration: underline;
    }
    .ir-button {
      background: linear-gradient(135deg, #00b4ff 0%, #0096fa 100%);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 12px 24px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0,150,250,0.3);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 160px;
    }
    .ir-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,150,250,0.4);
      filter: brightness(1.1);
    }
    .ir-button:active {
      transform: translateY(0);
    }
    .ir-button:disabled {
      background: #ccc !important;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    .ir-hint {
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }
    .ir-result {
      background: white;
      padding: 12px 16px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      border-left: 4px solid #0096fa;
      font-size: 13px;
      width: 100%;
      box-sizing: border-box;
      word-break: break-all;
      animation: ir-slide-in 0.3s ease-out;
    }
    .ir-result a {
      color: #0096fa;
      text-decoration: none;
      font-weight: bold;
    }
    .ir-result a:hover {
      text-decoration: underline;
    }
    @keyframes ir-slide-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .ir-debug {
      margin-top: 10px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 11px;
      color: #444;
      white-space: pre-wrap;
      word-break: break-all;
      border: 1px solid rgba(0, 0, 0, 0.1);
      max-height: 200px;
      overflow-y: auto;
    }
  `);

  /**
   * 解析目前網頁的作品資訊
   */
  function parseArtworkInfo() {
    const url = new URL(location.href);
    const host = url.hostname;
    const path = url.pathname;
    
    if (host.includes('nicovideo.jp')) {
      const match = path.match(/\/seiga\/(im\d+)/);
      return match ? { site: 'nico', id: match[1] } : null;
    } 
    
    if (host.includes('pixiv')) {
      // 處理 /artworks/123
      const artMatch = path.match(/\/artworks\/(\d+)/);
      if (artMatch) return { site: 'pixiv', id: artMatch[1] };
      
      // 處理 member_illust.php?illust_id=123
      const id = url.searchParams.get('illust_id');
      if (id) return { site: 'pixiv', id: id };
    } 
    
    if (host.includes('tinami')) {
      const match = path.match(/\/view\/(\d+)/);
      return match ? { site: 'tinami', id: match[1] } : null;
    }

    return null;
  }

  /**
   * 封裝 GM_xmlhttpRequest 為 Promise
   */
  function request(options) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        ...options,
        onload: (res) => resolve(res),
        onerror: (err) => reject(err)
      });
    });
  }

  /**
   * 初始化介面
   */
  function init() {
    const info = parseArtworkInfo();
    const $existing = $('#ir-container');

    // 如果不在支援的作品頁面，隱藏或移除介面
    if (!info) {
      $existing.remove();
      return;
    }

    // 如果已經存在且 ID 相同，則不重複初始化
    if ($existing.length > 0 && $existing.data('artwork-id') === info.id) {
      return;
    }

    // 清除舊的（如果是切換不同作品）
    $existing.remove();

    const $container = $('<div id="ir-container"></div>')
      .data('artwork-id', info.id)
      .appendTo('body');
    
    // 標題 (連向官網)
    $('<a class="ir-title" target="_blank"></a>')
      .attr('href', CONFIG.copyrightUrl)
      .text(CONFIG.name)
      .appendTo($container);

    const $btn = $('<button class="ir-button"></button>')
      .text(CONFIG.defaultText)
      .appendTo($container);
    
    // 提示文字
    $('<div class="ir-hint"></div>').text(CONFIG.hintText).appendTo($container);
    
    const $result = $('<div class="ir-result" style="display:none;"></div>').appendTo($container);

    $btn.on('click', async () => {
      try {
        $btn.prop('disabled', true).text(CONFIG.loadingText);
        $result.hide();

        const params = new URLSearchParams({
          site: info.site,
          artwork_id: info.id,
          r: Math.random()
        });

        const response = await request({
          method: "POST",
          url: `${CONFIG.apiUrl}?${params.toString()}`,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });

        let data;
        try {
          data = JSON.parse(response.responseText);
        } catch (parseError) {
          const contentType = response.responseHeaders?.match(/content-type:\s*([^\r\n]+)/i)?.[1] || "unknown";
          const preview = String(response.responseText || "").slice(0, 120).trim();
          throw new Error(`API 回傳非 JSON（HTTP ${response.status || "unknown"}, ${contentType}）：${preview || "無內容"}`);
        }

        if (data.error) {
          throw new Error(data.error);
        }

        $btn.text(CONFIG.finishText);
        
        let resultHtml = `<strong>${CONFIG.finishText}</strong><br>`;
        const finalUrl = data.url || data.preview_url;

        if (finalUrl) {
          resultHtml += `<a href="${finalUrl}" target="_blank">${finalUrl}</a>`;
        } else {
          resultHtml += `<span style="color: #d93025;">⚠️ 找不到作品網址 (回傳資料不含 url)</span><div class="ir-debug"><strong>JSON 原始回傳：</strong><br>${JSON.stringify(data, null, 2)}</div>`;
        }
        
        $result.html(resultHtml).show();

      } catch (err) {
        alert(`抓取失敗: ${err.message || '未知錯誤'}`);
        $btn.prop('disabled', false).text(CONFIG.defaultText);
      }
    });
  }

  /**
   * 啟動 SPA 支援與事件監聽
   */
  function start() {
    init();

    // 監聽 SPA 導航 (Monkeypatch pushState/replaceState)
    const wrapHistory = (type) => {
      const orig = history[type];
      return function() {
        const res = orig.apply(this, arguments);
        const event = new Event(type);
        event.arguments = arguments;
        window.dispatchEvent(event);
        return res;
      };
    };

    if (!history.pushState.isWrapped) {
      history.pushState = wrapHistory('pushState');
      history.pushState.isWrapped = true;
    }
    if (!history.replaceState.isWrapped) {
      history.replaceState = wrapHistory('replaceState');
      history.replaceState.isWrapped = true;
    }

    // 監聽各種導航事件
    window.addEventListener('pushState', init);
    window.addEventListener('replaceState', init);
    window.addEventListener('popstate', init);

    // 額外增加一個定時檢查，作為 SPA 的最後保險
    setInterval(() => {
      const info = parseArtworkInfo();
      const $existing = $('#ir-container');
      if (info && ($existing.length === 0 || $existing.data('artwork-id') !== info.id)) {
        init();
      } else if (!info && $existing.length > 0) {
        init();
      }
    }, 2000);
  }

  // 啟動
  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('DOMContentLoaded', start);
    window.addEventListener('load', start);
  }

})();