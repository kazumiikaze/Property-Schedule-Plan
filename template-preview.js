"use strict";

/* =========================================================
   TEMPLATE-PREVIEW.JS — ภาพตัวอย่างเทมเพลต (เหมือนชุดสำเร็จ)
   - เมนู 📋 เทมเพลต: เอาเมาส์ชี้ชื่อเทมเพลต → ภาพตัวอย่างแผนทั้งแผนโผล่ข้างเมนู
   - ปุ่ม 👁 ข้างชื่อ / ปุ่ม "🔍 ดูขนาดจริง" → เปิดภาพขนาดจริง (เท่าที่เห็นบนจอ) เลื่อนดูได้
   - ภาพวาดจากเทมเพลตจริง: เปิดเว็บนี้ในกรอบซ่อน (?zgPreview=1 — preview-guard.js
     กันไม่ให้บันทึกอะไรทับแผนจริง) ใส่เทมเพลต แล้วถ่ายภาพแบบเดียวกับ Export
   - ภาพที่ทำแล้วจำไว้ (เปิดซ้ำเร็ว) · เปิดไฟล์ index.html ตรง ๆ (file://) จะดูตัวอย่างไม่ได้
   - ไม่แก้ app.js / style.css — โหลดหลัง templates.js, export-compact.js
========================================================= */

(function () {

    if (window.ZG_PREVIEW_MODE) return;   // อยู่ในกรอบตัวอย่างเอง → ไม่ต้องทำ

    if (!window.ZGTemplates || typeof window.ZGTemplates.list !== "function") {
        console.warn("[template-preview.js] ต้องโหลดหลัง templates.js");
        return;
    }

    const L = (th, en, ja) => {
        const lang = window.ZGLang && typeof window.ZGLang.get === "function" ? window.ZGLang.get() : "th";
        return lang === "en" ? en : lang === "ja" ? ja : th;
    };

    const style = document.createElement("style");

    style.textContent = `
/* รายชื่อเทมเพลต: เห็นทีละ 5 อัน ที่เหลือเลื่อนด้วย scrollbar (เห็น scrollbar ตลอด) */
.zg-tpl-menu .zg-tpl-list {
    max-height: calc(5 * 48px) !important; overflow-y: auto !important;
    scrollbar-width: thin; scrollbar-color: #b9c4be transparent; scrollbar-gutter: stable;
    padding-right: 2px;
}
.zg-tpl-menu .zg-tpl-list::-webkit-scrollbar { width: 8px; }
.zg-tpl-menu .zg-tpl-list::-webkit-scrollbar-thumb { background: #c3ccc7; border-radius: 8px; }
.zg-tpl-menu .zg-tpl-list::-webkit-scrollbar-thumb:hover { background: #9eaaa4; }
.zg-tpl-more { padding: 3px 4px 0; color: #8a948f; font-size: 10px; text-align: center; }

.zg-tpl-eye { opacity: .75; }
.zg-tpl-eye:hover { opacity: 1; }

.zg-tpv {
    position: fixed; z-index: 30500; width: 560px; max-width: calc(100vw - 16px);
    padding: 10px; border-radius: 12px; background: #ffffff; border: 1px solid #dfe5e1;
    box-shadow: 0 12px 32px rgba(0, 0, 0, .18); font-size: 12px; color: #26302b;
}
.zg-tpv-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.zg-tpv-name { font-size: 14px; font-weight: 700; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zg-tpv-sub { font-size: 11px; color: #8a948f; white-space: nowrap; }
.zg-tpv-box {
    display: flex; align-items: center; justify-content: center; min-height: 180px;
    border: 1px solid #eef1ef; border-radius: 10px; background: #fafbfa; overflow: hidden;
}
.zg-tpv-box img { display: block; width: 100%; height: auto; }
.zg-tpv-wait { color: #8a948f; padding: 24px; text-align: center; line-height: 1.6; }
.zg-tpv-wait::before {
    content: ""; display: block; width: 22px; height: 22px; margin: 0 auto 8px; border-radius: 50%;
    border: 3px solid #dfe8e2; border-top-color: #3a8a4f; animation: zgTpvSpin .8s linear infinite;
}
.zg-tpv-wait.is-error::before { display: none; }
@keyframes zgTpvSpin { to { transform: rotate(360deg); } }
.zg-tpv-actions { display: flex; gap: 6px; margin-top: 8px; }
.zg-tpv-actions button {
    height: 28px; padding: 0 10px; border: 1px solid #d5dad7; border-radius: 7px; background: #fff;
    color: #2f3a34; font: inherit; font-size: 12px; cursor: pointer;
}
.zg-tpv-actions button:hover { background: #eef6f0; }
.zg-tpv-actions button[disabled] { opacity: .45; cursor: default; }
.zg-tpv-actions .zg-tpv-use { margin-left: auto; background: #3a8a4f; border-color: #3a8a4f; color: #fff; font-weight: 700; }
.zg-tpv-actions .zg-tpv-use:hover { background: #2f7442; }

.zg-tpv-full {
    position: fixed; inset: 0; z-index: 31000; background: rgba(20, 28, 24, .72);
    display: flex; flex-direction: column;
}
.zg-tpv-full-bar {
    display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #ffffff;
    border-bottom: 1px solid #dfe5e1; font-size: 13px;
}
.zg-tpv-full-bar b { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zg-tpv-full-bar button {
    height: 30px; padding: 0 12px; border: 1px solid #d5dad7; border-radius: 7px; background: #fff;
    font: inherit; cursor: pointer;
}
.zg-tpv-full-bar button.is-on { background: #e5f0e9; border-color: #3a8a4f; color: #1e7a46; font-weight: 700; }
.zg-tpv-full-bar .zg-tpv-use { background: #3a8a4f; border-color: #3a8a4f; color: #fff; font-weight: 700; }
.zg-tpv-full-scroll { flex: 1; overflow: auto; padding: 16px; }
.zg-tpv-full-scroll img { display: block; margin: 0 auto; background: #fff; box-shadow: 0 6px 24px rgba(0,0,0,.3); }
.zg-tpv-full-scroll.is-fit img { max-width: 100%; max-height: 100%; }

.zg-tpv-frame {
    position: fixed; left: -30000px; top: 0; border: 0; pointer-events: none;
    opacity: 0; z-index: -1;
}

body.zg-dark .zg-tpv, body.zg-dark .zg-tpv-full-bar { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-tpv-box { background: #1b2220; border-color: #3a4440; }
body.zg-dark .zg-tpv-actions button, body.zg-dark .zg-tpv-full-bar button { background: #2b3330; border-color: #3a4440; color: inherit; }
body.zg-exporting .zg-tpv, body.zg-exporting .zg-tpv-full { display: none !important; }
`;

    document.head.appendChild(style);


    /* =====================================================
       กรอบซ่อนสำหรับวาดเทมเพลต
    ===================================================== */

    let frame = null;
    let framePromise = null;

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function frameReady() {

        if (framePromise) return framePromise;

        framePromise = new Promise((resolve, reject) => {

            if (location.protocol === "file:") {
                reject(new Error(L(
                    "เปิดไฟล์ index.html ตรง ๆ ดูตัวอย่างไม่ได้ — เปิดผ่านเว็บ (Vercel / Live Server)",
                    "Preview needs the web version (Vercel / Live Server), not a local file",
                    "プレビューは Web 版で表示できます")));
                return;
            }

            frame = document.createElement("iframe");
            frame.className = "zg-tpv-frame";
            frame.setAttribute("aria-hidden", "true");
            frame.tabIndex = -1;
            frame.style.width = `${window.innerWidth}px`;
            frame.style.height = `${window.innerHeight}px`;

            const url = new URL(location.href);
            url.hash = "";
            url.searchParams.set("zgPreview", "1");
            frame.src = url.toString();

            const timer = setTimeout(() => reject(new Error(L("โหลดตัวอย่างไม่ทัน", "Preview timed out", "タイムアウト"))), 30000);

            frame.addEventListener("load", async () => {
                try {
                    const win = frame.contentWindow;
                    /* รอให้สคริปต์ทุกไฟล์ในกรอบเริ่มงานเสร็จ (plans.js เริ่มหลังโหลด 4 เฟรม) */
                    for (let i = 0; i < 100 && !(win.ZGPlanIO && win.ZGExportImage); i += 1) await wait(100);
                    await wait(500);
                    if (!win.ZGPlanIO || !win.ZGExportImage) throw new Error("preview frame not ready");
                    try { if (win.ZGStart) win.ZGStart.close(); } catch (error) { /* ไม่เป็นไร */ }
                    clearTimeout(timer);
                    resolve(win);
                } catch (error) {
                    clearTimeout(timer);
                    reject(error);
                }
            }, { once: true });

            document.body.appendChild(frame);
        });

        /* พลาด → ครั้งหน้าลองใหม่ได้ */
        framePromise.catch(() => {
            setTimeout(() => {
                if (frame) frame.remove();
                frame = null;
                framePromise = null;
            }, 0);
        });

        return framePromise;
    }


    /* =====================================================
       ถ่ายภาพเทมเพลต (ทีละอัน · จำผลไว้)
    ===================================================== */

    const cache = new Map();
    let queue = Promise.resolve();

    function keyOf(template) {
        return `${template.id}|${template.createdAt || ""}|${window.innerWidth}x${window.innerHeight}`;
    }

    function render(template) {

        const key = keyOf(template);

        if (cache.has(key)) return cache.get(key);

        const job = queue.then(async () => {

            const win = await frameReady();

            /* ขนาดกรอบ = ขนาดหน้าจอจริงตอนนี้ (ภาพตัวอย่างขนาดเท่าของจริง) */
            if (frame.offsetWidth !== window.innerWidth || frame.offsetHeight !== window.innerHeight) {
                frame.style.width = `${window.innerWidth}px`;
                frame.style.height = `${window.innerHeight}px`;
                await wait(300);
            }

            const data = win.JSON.parse(JSON.stringify(template.data));

            win.ZGPlanIO.apply(data);

            try { if (win.ZGStart) win.ZGStart.close(); } catch (error) { /* ไม่เป็นไร */ }

            /* รอรูปภาพ / เลย์เอาต์ในกรอบวาดเสร็จ */
            await wait(450);

            let canvas = await win.ZGExportImage.capture("board", { pixelRatio: 1.5 });

            try {
                if (win.ZGExportCompact && typeof win.ZGExportCompact.process === "function") {
                    canvas = win.ZGExportCompact.process(canvas);
                }
            } catch (error) { /* ใช้ภาพเดิม */ }

            return {
                src: canvas.toDataURL("image/png"),
                width: Math.round(canvas.width / 1.5),
                height: Math.round(canvas.height / 1.5)
            };
        });

        /* ต่อคิว (ถ่ายพร้อมกันไม่ได้) — งานพลาดไม่ทำให้คิวค้าง */
        queue = job.catch(() => null);

        job.catch(() => cache.delete(key));

        cache.set(key, job);

        return job;
    }


    /* =====================================================
       ภาพตัวอย่างข้างเมนู
    ===================================================== */

    let peek = null;
    let peekId = null;
    let hideTimer = null;
    let showTimer = null;

    function findTemplate(id) {
        return window.ZGTemplates.list().find(item => item.id === id) || null;
    }

    function countOf(data) {
        const objects = Array.isArray(data && data.objects) ? data.objects.length : 0;
        const categories = Array.isArray(data && data.categories) ? data.categories.length : 0;
        return L(`${categories} หมวด · ${objects} object`, `${categories} categories · ${objects} objects`, `${categories} カテゴリ · ${objects} 個`);
    }

    function escapeHtml(text) {
        return String(text || "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function positionPeek(menu) {

        if (!peek || !menu) return;

        const rect = menu.getBoundingClientRect();
        const width = Math.min(560, window.innerWidth - 16);

        peek.style.width = `${width}px`;

        let left = rect.right + 10;
        if (left + width > window.innerWidth - 8) left = rect.left - width - 10;
        if (left < 8) left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left));

        const height = peek.offsetHeight;
        const top = Math.max(8, Math.min(rect.top, window.innerHeight - height - 8));

        peek.style.left = `${left}px`;
        peek.style.top = `${top}px`;
    }

    function hidePeek() {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        if (peek) peek.remove();
        peek = null;
        peekId = null;
    }

    function useTemplate(id) {
        /* ใช้ขั้นตอนเดิมของ templates.js: คลิกชื่อเทมเพลตในเมนู → หน้าต่าง "ใช้เทมเพลต" */
        let menu = document.querySelector(".zg-tpl-menu");
        if (!menu && window.ZGTemplates.open) {
            window.ZGTemplates.open();
            menu = document.querySelector(".zg-tpl-menu");
        }
        const item = menu && menu.querySelector(`.zg-tpl-item[data-id="${CSS.escape(id)}"] .zg-tpl-item-text`);
        if (item) item.click();
    }

    function showPeek(template, menu) {

        clearTimeout(hideTimer);

        if (!peek) {
            peek = document.createElement("div");
            peek.className = "zg-tpv";
            ["mousedown", "pointerdown"].forEach(type => peek.addEventListener(type, event => event.stopPropagation()));
            peek.addEventListener("mouseenter", () => clearTimeout(hideTimer));
            peek.addEventListener("mouseleave", scheduleHide);
            document.body.appendChild(peek);
        }

        if (peekId === template.id) {
            positionPeek(menu);
            return;
        }

        peekId = template.id;

        peek.innerHTML = `
            <div class="zg-tpv-head">
                <span class="zg-tpv-name">📋 ${escapeHtml(template.name)}</span>
                <span class="zg-tpv-sub">${escapeHtml(countOf(template.data))}</span>
            </div>
            <div class="zg-tpv-box"><div class="zg-tpv-wait">${escapeHtml(L("กำลังสร้างภาพตัวอย่าง…", "Building preview…", "プレビュー作成中…"))}</div></div>
            <div class="zg-tpv-actions">
                <button type="button" data-tpv="full" disabled>🔍 ${escapeHtml(L("ดูขนาดจริง", "Actual size", "実寸で見る"))}</button>
                <button type="button" class="zg-tpv-use" data-tpv="use">${escapeHtml(L("ใช้เทมเพลตนี้", "Use this template", "このテンプレートを使う"))}</button>
            </div>`;

        peek.querySelector("[data-tpv='full']").addEventListener("click", () => openFull(template));
        peek.querySelector("[data-tpv='use']").addEventListener("click", () => { const id = template.id; hidePeek(); useTemplate(id); });

        positionPeek(menu);

        const id = template.id;

        render(template).then(result => {
            if (!peek || peekId !== id) return;
            const box = peek.querySelector(".zg-tpv-box");
            box.innerHTML = `<img alt="" src="${result.src}">`;
            peek.querySelector("[data-tpv='full']").disabled = false;
            requestAnimationFrame(() => positionPeek(document.querySelector(".zg-tpl-menu") || menu));
        }).catch(error => {
            if (!peek || peekId !== id) return;
            const wait = peek.querySelector(".zg-tpv-wait");
            if (wait) {
                wait.classList.add("is-error");
                wait.textContent = `${L("สร้างภาพตัวอย่างไม่ได้", "Could not build preview", "プレビューを作成できません")} — ${error && error.message ? error.message : error}`;
            }
        });
    }

    function scheduleHide() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hidePeek, 250);
    }


    /* =====================================================
       ภาพขนาดจริง (เต็มจอ)
    ===================================================== */

    let full = null;

    function closeFull() {
        if (full) full.remove();
        full = null;
    }

    async function openFull(template) {

        closeFull();

        full = document.createElement("div");
        full.className = "zg-tpv-full";
        full.innerHTML = `
            <div class="zg-tpv-full-bar">
                <b>📋 ${escapeHtml(template.name)}</b>
                <button type="button" data-full="real" class="is-on">${escapeHtml(L("ขนาดจริง", "Actual size", "実寸"))}</button>
                <button type="button" data-full="fit">${escapeHtml(L("พอดีจอ", "Fit", "画面に合わせる"))}</button>
                <button type="button" class="zg-tpv-use" data-full="use">${escapeHtml(L("ใช้เทมเพลตนี้", "Use this template", "このテンプレートを使う"))}</button>
                <button type="button" data-full="close">✕ ${escapeHtml(L("ปิด", "Close", "閉じる"))}</button>
            </div>
            <div class="zg-tpv-full-scroll"><div class="zg-tpv-wait">${escapeHtml(L("กำลังสร้างภาพตัวอย่าง…", "Building preview…", "プレビュー作成中…"))}</div></div>`;

        ["mousedown", "pointerdown"].forEach(type => full.addEventListener(type, event => event.stopPropagation()));

        const scroller = full.querySelector(".zg-tpv-full-scroll");

        full.addEventListener("click", event => {
            const button = event.target.closest("[data-full]");
            if (!button) {
                if (event.target === scroller) closeFull();
                return;
            }
            const action = button.dataset.full;
            if (action === "close") closeFull();
            else if (action === "use") { const id = template.id; closeFull(); hidePeek(); useTemplate(id); }
            else {
                scroller.classList.toggle("is-fit", action === "fit");
                full.querySelectorAll("[data-full='real'], [data-full='fit']").forEach(item => item.classList.toggle("is-on", item === button));
            }
        });

        document.body.appendChild(full);

        try {
            const result = await render(template);
            if (!full) return;
            scroller.innerHTML = `<img alt="" src="${result.src}" style="width:${result.width}px">`;
            const img = scroller.querySelector("img");
            /* พอดีจอ: ยกเลิกความกว้างตายตัว */
            new MutationObserver(() => {
                img.style.width = scroller.classList.contains("is-fit") ? "" : `${result.width}px`;
            }).observe(scroller, { attributes: true, attributeFilter: ["class"] });
        } catch (error) {
            if (!full) return;
            scroller.innerHTML = `<div class="zg-tpv-wait is-error" style="color:#fff">${escapeHtml(L("สร้างภาพตัวอย่างไม่ได้", "Could not build preview", "プレビューを作成できません"))} — ${escapeHtml(error && error.message ? error.message : String(error))}</div>`;
        }
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && full) {
            event.stopPropagation();
            closeFull();
        }
    }, true);


    /* =====================================================
       ต่อกับเมนูเทมเพลต (templates.js)
    ===================================================== */

    function enhanceMenu(menu) {

        if (menu.dataset.zgTpv) return;
        menu.dataset.zgTpv = "1";

        /* ปุ่ม 👁 ข้างชื่อเทมเพลต */
        menu.querySelectorAll(".zg-tpl-item[data-id]").forEach(item => {
            if (item.querySelector(".zg-tpl-eye")) return;
            const eye = document.createElement("button");
            eye.type = "button";
            eye.className = "zg-tpl-icon-btn zg-tpl-eye";
            eye.title = L("ดูตัวอย่างขนาดจริง", "Preview at actual size", "実寸プレビュー");
            eye.textContent = "👁";
            eye.addEventListener("click", event => {
                event.stopPropagation();
                const template = findTemplate(item.dataset.id);
                if (template) openFull(template);
            });
            const exportBtn = item.querySelector("[data-action='export']");
            item.insertBefore(eye, exportBtn || null);
        });

        /* บอกว่ามีอีกกี่อัน (เกิน 5) */
        const list = menu.querySelector(".zg-tpl-list");
        const count = menu.querySelectorAll(".zg-tpl-item[data-id]").length;
        if (list && count > 5 && !menu.querySelector(".zg-tpl-more")) {
            const more = document.createElement("div");
            more.className = "zg-tpl-more";
            more.textContent = L(`ทั้งหมด ${count} อัน — เลื่อนลงเพื่อดูเพิ่ม`, `${count} templates — scroll for more`, `全 ${count} 件 — スクロールで表示`);
            list.after(more);
        }

        menu.addEventListener("mouseover", event => {
            const item = event.target.closest(".zg-tpl-item[data-id]");
            if (!item || item.hidden || item.style.display === "none") return;
            clearTimeout(hideTimer);
            clearTimeout(showTimer);
            const template = findTemplate(item.dataset.id);
            if (!template) return;
            showTimer = setTimeout(() => showPeek(template, menu), peek ? 60 : 280);
        });

        menu.addEventListener("mouseleave", () => {
            clearTimeout(showTimer);
            scheduleHide();
        });

        /* เปิดเมนู → เตรียมกรอบล่วงหน้า (ภาพแรกเร็วขึ้น) */
        frameReady().catch(() => { /* ค่อยแจ้งตอนชี้ */ });
    }

    new MutationObserver(records => {
        records.forEach(record => {
            record.addedNodes.forEach(node => {
                if (node instanceof Element && node.classList.contains("zg-tpl-menu")) enhanceMenu(node);
            });
            record.removedNodes.forEach(node => {
                if (node instanceof Element && node.classList.contains("zg-tpl-menu")) hidePeek();
            });
        });
    }).observe(document.body, { childList: true });

    window.addEventListener("resize", () => { hidePeek(); });

    window.ZGTemplatePreview = { render, open: id => { const t = findTemplate(id); if (t) openFull(t); } };

})();
