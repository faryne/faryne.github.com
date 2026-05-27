// ==UserScript==
// @name         AV 女優換圖
// @namespace    http://faryne.dev/
// @version      1.2.0
// @description  自動將網頁中的圖片隨機替換為 AV 女優圖庫圖片（純屬娛樂）。
// @author       Faryne
// @match        *://*.chinatimes.com/*
// @match        *://*.udn.com/*
// @match        *://tw.news.yahoo.com/*
// @grant        GM_xmlhttpRequest
// @connect      faryne.dev
// @run-at       document-idle
// ==/UserScript==

(() => {
    'use strict';

    const API_URL = "https://faryne.dev/api/opendata/dmm/video";
    
    /** 儲存已替換過的圖片 URL，用來避免重複處理與無限迴圈 */
    const assignedUrls = new WeakMap();

    /**
     * 隨機獲取陣列中的一個元素
     * @param {Array} arr 
     */
    function getRandomElement(arr) {
        if (!arr || arr.length === 0) return null;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * 替換單張圖片
     * @param {HTMLImageElement} img 
     * @param {Object} sourceImages 
     */
    function replaceImage(img, sourceImages) {
        // 如果目前圖片的 src 就是我們剛設定的，則跳過（避免無限迴圈）
        if (assignedUrls.get(img) === img.src) return;

        const performReplacement = () => {
            // 再次檢查，防止在等待 load 期間已經被處理過
            if (assignedUrls.get(img) === img.src) return;

            // 優先使用 naturalWidth/Height，如果還沒載入則使用 width/height
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;

            const list = (w < h) ? sourceImages.high : sourceImages.wide;
            const newSrc = getRandomElement(list);

            if (newSrc) {
                img.src = newSrc;
                assignedUrls.set(img, newSrc);
            }
        };

        // 如果圖片還沒載入且寬高都是 0，等它載入後再判斷比例
        if (img.width === 0 && img.height === 0 && !img.complete) {
            img.addEventListener('load', performReplacement, { once: true });
        } else {
            performReplacement();
        }
    }

    /**
     * 獲取所有可用的替代圖片
     */
    function getSourceImages() {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: API_URL,
                onload: (response) => {
                    try {
                        if (response.status !== 200) throw new Error(`Status ${response.status}`);
                        const data = JSON.parse(response.responseText);
                        const images = { wide: [], high: [] };

                        if (data.rows && Array.isArray(data.rows)) {
                            data.rows.forEach(row => {
                                if (row.thumb) images.high.push(row.thumb);
                                if (Array.isArray(row.images)) {
                                    row.images.forEach(img => {
                                        if (img.thumb) images.wide.push(img.thumb);
                                    });
                                }
                            });
                        }
                        resolve(images);
                    } catch (error) {
                        console.error("[AV Userscript] Parse error:", error);
                        resolve({ wide: [], high: [] });
                    }
                },
                onerror: (error) => {
                    console.error("[AV Userscript] Fetch error:", error);
                    resolve({ wide: [], high: [] });
                }
            });
        });
    }

    /**
     * 初始化套件邏輯
     */
    async function init() {
        const sourceImages = await getSourceImages();
        const hasImages = sourceImages.wide.length > 0 || sourceImages.high.length > 0;
        if (!hasImages) return;

        // 處理節點與其子節點中的所有圖片
        const processNode = (node) => {
            if (node instanceof HTMLImageElement) {
                replaceImage(node, sourceImages);
            } else if (node instanceof HTMLElement) {
                const images = node.querySelectorAll('img');
                images.forEach(img => replaceImage(img, sourceImages));
            }
        };

        // 監聽動態加入的節點與屬性變化
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(processNode);
                } else if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    // 只有當新設定的 src 不是我們自己設定的，才需要重新處理
                    if (assignedUrls.get(mutation.target) !== mutation.target.src) {
                        replaceImage(mutation.target, sourceImages);
                    }
                }
            }
        });

        // 開始監控整個文件
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src']
        });

        // 處理現有的圖片
        processNode(document.body || document.documentElement);
    }

    // 啟動
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
