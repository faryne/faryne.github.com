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
     * 替換單個元素（img 或 source）
     * @param {HTMLElement} el 
     * @param {Object} sourceImages 
     */
    function replaceElement(el, sourceImages) {
        const currentVal = el.src || (el.srcset ? el.srcset.split(',')[0].split(' ')[0] : '');
        if (assignedUrls.get(el) === currentVal) return;

        const performReplacement = () => {
            const currentValNow = el.src || (el.srcset ? el.srcset.split(',')[0].split(' ')[0] : '');
            if (assignedUrls.get(el) === currentValNow) return;

            let w = 0, h = 0;
            let targetImg = null;

            if (el instanceof HTMLImageElement) {
                targetImg = el;
            } else if (el instanceof HTMLSourceElement && el.parentNode instanceof HTMLPictureElement) {
                targetImg = el.parentNode.querySelector('img');
            }

            if (targetImg) {
                w = targetImg.naturalWidth || targetImg.width;
                h = targetImg.naturalHeight || targetImg.height;
            }

            // 如果無法取得寬高，預設使用 wide 列表
            const list = (w !== 0 && h !== 0 && w < h) ? sourceImages.high : sourceImages.wide;
            const newSrc = getRandomElement(list);

            if (newSrc) {
                if (el instanceof HTMLImageElement) {
                    el.src = newSrc;
                    if (el.hasAttribute('srcset')) el.srcset = newSrc;
                } else if (el instanceof HTMLSourceElement) {
                    el.srcset = newSrc;
                }
                assignedUrls.set(el, newSrc);
            }
        };

        // 如果是 img 且尚未載入，等它載入後再判斷比例
        if (el instanceof HTMLImageElement && el.width === 0 && el.height === 0 && !el.complete) {
            el.addEventListener('load', performReplacement, { once: true });
        } else if (el instanceof HTMLSourceElement && el.parentNode instanceof HTMLPictureElement) {
            const img = el.parentNode.querySelector('img');
            if (img && img.width === 0 && img.height === 0 && !img.complete) {
                img.addEventListener('load', performReplacement, { once: true });
            } else {
                performReplacement();
            }
        } else {
            performReplacement();
        }
    }

    /**
     * 獲取所有可用的替代圖片
     */
    async function getSourceImages() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            
            const data = await response.json();
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

            return images;
        } catch (error) {
            console.error("[AV Extension] Failed to get source images:", error);
            return { wide: [], high: [] };
        }
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
            if (node instanceof HTMLImageElement || node instanceof HTMLSourceElement) {
                replaceElement(node, sourceImages);
            } else if (node instanceof HTMLElement) {
                const elements = node.querySelectorAll('img, source');
                elements.forEach(el => replaceElement(el, sourceImages));
            }
        };

        // 監聽動態加入的節點與屬性變化
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(processNode);
                } else if (mutation.type === 'attributes') {
                    const attr = mutation.attributeName;
                    const target = mutation.target;
                    const currentVal = target.src || (target.srcset ? target.srcset.split(',')[0].split(' ')[0] : '');
                    if (assignedUrls.get(target) !== currentVal) {
                        replaceElement(target, sourceImages);
                    }
                }
            }
        });

        // 開始監控整個文件
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'srcset']
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
