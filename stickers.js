"use strict";

/* =========================================================
   STICKERS.JS — แถบรูปแปะบน Toolbar
   - ปุ่ม "🏷 แปะรูป ▾" ข้างปุ่ม 🖼 รูปภาพ
   - เก็บไฟล์ PNG (หรือรูปอื่น) เป็นคลังรูปแปะในเบราว์เซอร์นี้ (IndexedDB)
     ใช้ได้ทุกแผน · เพิ่ม / ลบ ได้
   - แสดงตัวอย่าง 6 รูป (3 × 2) เกินนั้นเลื่อนลงด้วย scrollbar
   - คลิก = แปะกลางตารางที่มองเห็น · ลากไปวาง = แปะตรงจุดที่ปล่อย
   - รูปแปะที่แปะแล้วเป็น "รูปในตาราง" (image-board.js):
     เลื่อนตามตาราง ซ่อนหลังเส้น ลากย้าย ลากมุมย่อขยาย ลบได้ บันทึกไปกับแผน
   - ชุดรูปแปะของทีม: ไฟล์ stickers/stickers1.png … stickers10.png ในเว็บ
     (ไฟล์ไหนยังไม่มี = ไม่แสดง) ทุกคนเห็นชุดเดียวกัน ลบจากแถบไม่ได้
   - ไม่แก้ app.js / style.css
========================================================= */

(function () {

    const Z = window.ZGImage;
    const board = window.ZGBoardImages;

    if (!Z || !board || typeof board.addSticker !== "function") {
        console.warn("[stickers.js] ต้องโหลดหลัง image-board.js");
        return;
    }

    const DB_NAME = "zg-stickers";
    const STORE = "items";
    const LIBRARY_SIDE = 512;
    const PLACE_WIDTH = 96;

    /* ชุดรูปแปะของทีม — ใส่ไฟล์ PNG ในโฟลเดอร์ stickers/ ของเว็บ แล้ว push */
    const TEAM_COUNT = 10;
    const TEAM = Array.from({ length: TEAM_COUNT }, (_, index) => ({
        id: `team-${index + 1}`,
        name: `stickers${index + 1}`,
        src: `stickers/stickers${index + 1}.png`,
        team: true
    }));

    /* เช็กว่าไฟล์ไหนมีอยู่จริง (โหลดไม่ขึ้น = ข้าม) — เช็กครั้งเดียวต่อการเปิดหน้า */
    let teamPromise = null;

    function loadTeam() {

        if (teamPromise) return teamPromise;

        teamPromise = Promise.all(TEAM.map(item => new Promise(resolve => {
            const image = new Image();
            image.onload = () => resolve(image.naturalWidth > 0 ? item : null);
            image.onerror = () => resolve(null);
            image.src = item.src;
        }))).then(list => list.filter(Boolean));

        return teamPromise;
    }


    /* =====================================================
       STORAGE (IndexedDB — ไม่กินพื้นที่ของแผน)
    ===================================================== */

    let dbPromise = null;

    function openDb() {

        if (dbPromise) return dbPromise;

        dbPromise = new Promise((resolve, reject) => {

            if (!window.indexedDB) {
                reject(new Error("เบราว์เซอร์นี้เก็บรูปแปะไม่ได้"));
                return;
            }

            const request = indexedDB.open(DB_NAME, 1);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("เปิดคลังรูปแปะไม่ได้"));
        });

        dbPromise.catch(() => { dbPromise = null; });

        return dbPromise;
    }

    async function tx(mode, run) {

        const db = await openDb();

        return new Promise((resolve, reject) => {

            const transaction = db.transaction(STORE, mode);
            const store = transaction.objectStore(STORE);

            let result;

            Promise.resolve(run(store)).then(value => { result = value; });

            transaction.oncomplete = () => resolve(result);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error || new Error("บันทึกรูปแปะไม่สำเร็จ"));
        });
    }

    function getAll() {

        return tx("readonly", store => new Promise(resolve => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve([]);
        })).then(list => (list || []).sort((a, b) => (a.added || 0) - (b.added || 0)));
    }

    function putItem(item) {
        return tx("readwrite", store => { store.put(item); });
    }

    function deleteItem(id) {
        return tx("readwrite", store => { store.delete(id); });
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.zg-stk-btn { white-space: nowrap; }
.zg-stk-btn.is-open { background: #eef6ea; border-color: #9fd17a; }

.zg-stk {
    position: fixed;
    z-index: 26000;
    width: 304px;
    padding: 12px;
    box-sizing: border-box;
    border: 1px solid #dfe5e1;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 16px 44px rgba(10, 30, 20, .2);
    font-family: Arial, Helvetica, sans-serif;
    color: #1e2924;
}
.zg-stk-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.zg-stk-title { font-size: 13px; font-weight: 700; }
.zg-stk-count { font-size: 11px; color: #8a948f; }
.zg-stk-add {
    margin-left: auto;
    height: 28px;
    padding: 0 11px;
    border: 0;
    border-radius: 8px;
    background: #7ac143;
    color: #ffffff;
    font: 700 12px Arial, Helvetica, sans-serif;
    cursor: pointer;
}
.zg-stk-add:hover { background: #69ad37; }

/* 3 คอลัมน์ × 2 แถว แล้วเลื่อนลง */
.zg-stk-grid {
    display: grid;
    grid-template-columns: repeat(3, 84px);
    grid-auto-rows: 84px;
    gap: 8px;
    max-height: calc(84px * 2 + 8px);
    overflow-y: auto;
    padding-right: 4px;
    margin-right: -4px;
    scrollbar-width: thin;
    scrollbar-color: #c7d0cb transparent;
}
.zg-stk-grid::-webkit-scrollbar { width: 6px; }
.zg-stk-grid::-webkit-scrollbar-thumb { background: #c7d0cb; border-radius: 6px; }

.zg-stk-tile {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    box-sizing: border-box;
    border: 1px solid #e3e8e5;
    border-radius: 10px;
    background-color: #ffffff;
    background-image:
        linear-gradient(45deg, #f1f4f2 25%, transparent 25%),
        linear-gradient(-45deg, #f1f4f2 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #f1f4f2 75%),
        linear-gradient(-45deg, transparent 75%, #f1f4f2 75%);
    background-size: 12px 12px;
    background-position: 0 0, 0 6px, 6px -6px, -6px 0;
    cursor: grab;
    touch-action: none;
    transition: border-color .12s ease, transform .12s ease, box-shadow .12s ease;
}
.zg-stk-tile:hover { border-color: #9fd17a; box-shadow: 0 3px 10px rgba(0, 0, 0, .08); transform: translateY(-1px); }
.zg-stk-tile img { max-width: 100%; max-height: 100%; object-fit: contain; pointer-events: none; -webkit-user-drag: none; user-select: none; }
.zg-stk-del {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 1px solid #f0c9c9;
    border-radius: 50%;
    background: #ffffff;
    color: #d9363e;
    font-size: 11px;
    line-height: 18px;
    cursor: pointer;
    opacity: 0;
    transition: opacity .12s ease;
    box-shadow: 0 1px 4px rgba(0, 0, 0, .12);
}
.zg-stk-team {
    position: absolute;
    left: 5px;
    bottom: 5px;
    padding: 0 5px;
    border-radius: 6px;
    background: rgba(122, 193, 67, .9);
    color: #ffffff;
    font: 700 9px/15px Arial, Helvetica, sans-serif;
    pointer-events: none;
}
.zg-stk-tile:hover .zg-stk-del,
.zg-stk-del:focus-visible { opacity: 1; }
.zg-stk-del:hover { background: #d9363e; color: #ffffff; }

.zg-stk-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: calc(84px * 2 + 8px);
    border: 2px dashed #d3dbd6;
    border-radius: 12px;
    color: #7d8781;
    font-size: 12px;
    text-align: center;
    cursor: pointer;
}
.zg-stk-empty b { font-size: 26px; line-height: 1; }
.zg-stk.is-drop .zg-stk-grid,
.zg-stk.is-drop .zg-stk-empty { outline: 2px dashed #7ac143; outline-offset: 3px; border-radius: 10px; }

.zg-stk-foot { margin-top: 10px; font-size: 10.5px; color: #8a948f; line-height: 1.5; }

/* ลากรูปแปะ */
.zg-stk-ghost {
    position: fixed;
    z-index: 27000;
    width: 72px;
    height: 72px;
    object-fit: contain;
    pointer-events: none;
    opacity: .85;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 6px 12px rgba(0, 0, 0, .25));
}
body.zg-stk-dragging, body.zg-stk-dragging * { cursor: grabbing !important; user-select: none !important; }

body.zg-exporting .zg-stk, body.zg-exporting .zg-stk-ghost { display: none !important; }

body.zg-dark .zg-stk { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-stk-tile { background-color: #2b3330; border-color: #3a4440; background-image: none; }
body.zg-dark .zg-stk-empty { border-color: #3a4440; color: #a9b3ae; }
`;

    document.head.appendChild(style);


    /* =====================================================
       TOOLBAR BUTTON
    ===================================================== */

    const button = document.createElement("button");

    button.type = "button";
    button.className = "toolbar-control zg-stk-btn";
    button.textContent = "🏷 แปะรูป ▾";
    button.title = "แปะรูป: เก็บรูป PNG ไว้แปะบนตาราง";

    const imageButton = document.getElementById("addImageBtn");

    if (imageButton && imageButton.parentNode) {
        imageButton.parentNode.insertBefore(button, imageButton.nextSibling);
    } else {
        const toolbar = document.querySelector(".toolbar-group--insert, .workspace-toolbar, .toolbar");
        if (toolbar) toolbar.appendChild(button);
    }


    /* =====================================================
       PANEL
    ===================================================== */

    let panel = null;
    let items = [];

    function closePanel() {
        if (panel) {
            panel.remove();
            panel = null;
        }
        button.classList.remove("is-open");
    }

    function positionPanel() {

        if (!panel) return;

        const rect = button.getBoundingClientRect();

        const left = Math.max(8, Math.min(rect.left, window.innerWidth - panel.offsetWidth - 8));
        let top = rect.bottom + 6;

        if (top + panel.offsetHeight > window.innerHeight - 8) top = Math.max(8, rect.top - panel.offsetHeight - 6);

        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
    }

    function renderPanel() {

        if (!panel) return;

        const escape = Z.escapeHtml;

        panel.querySelector(".zg-stk-count").textContent = items.length ? `(${items.length})` : "";

        const body = panel.querySelector(".zg-stk-body");

        if (!items.length) {

            body.innerHTML = `
                <div class="zg-stk-empty" data-stk="pick">
                    <b>🏷</b>
                    <span>ยังไม่มีรูปแปะ</span>
                    <span>กด ＋ เพิ่ม หรือลากไฟล์ PNG มาวางที่นี่</span>
                </div>`;

        } else {

            body.innerHTML = `
                <div class="zg-stk-grid">
                    ${items.map(item => `
                        <div class="zg-stk-tile" data-stk-id="${escape(item.id)}" title="${escape(item.name || "รูปแปะ")} — คลิกเพื่อแปะ หรือลากไปวางบนตาราง">
                            <img src="${item.src}" alt="">
                            ${item.team
                                ? `<span class="zg-stk-team" title="ชุดรูปแปะของทีม (อยู่ในเว็บ)">ทีม</span>`
                                : `<button type="button" class="zg-stk-del" data-stk-del="${escape(item.id)}" title="ลบออกจากคลัง">✕</button>`}
                        </div>`).join("")}
                </div>`;
        }

        positionPanel();
    }

    async function refresh() {

        try {
            const [team, mine] = await Promise.all([loadTeam(), getAll().catch(error => {
                Z.toast(error.message || "เปิดคลังรูปแปะไม่ได้", true);
                return [];
            })]);
            items = [...team, ...mine];
        } catch (error) {
            items = [];
            Z.toast(error.message || "เปิดคลังรูปแปะไม่ได้", true);
        }

        renderPanel();
    }

    function openPanel() {

        closePanel();

        if (Z.closeMenu) Z.closeMenu();
        if (typeof closeObjectMenu === "function") closeObjectMenu();

        panel = document.createElement("div");

        panel.className = "zg-stk";
        panel.innerHTML = `
            <div class="zg-stk-head">
                <span class="zg-stk-title">🏷 แปะรูป</span>
                <span class="zg-stk-count"></span>
                <button type="button" class="zg-stk-add" data-stk="pick">＋ เพิ่ม</button>
            </div>
            <div class="zg-stk-body"></div>
            <div class="zg-stk-foot">คลิก = แปะกลางตาราง · ลากไปวางตรงไหนก็ได้<br>แปะแล้ว: ลากย้าย · ลากมุมเพื่อย่อขยาย · Delete = ลบ</div>`;

        panel.addEventListener("mousedown", event => event.stopPropagation());

        panel.addEventListener("click", onPanelClick);
        panel.addEventListener("pointerdown", onTileDown);

        /* ลากไฟล์มาวางที่แถบ = เพิ่มเข้าคลัง (ไม่ไปวางในตาราง) */
        panel.addEventListener("dragover", event => {
            if (!Z.transferHasFiles(event.dataTransfer)) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = "copy";
            panel.classList.add("is-drop");
        });

        panel.addEventListener("dragleave", event => {
            if (!panel.contains(event.relatedTarget)) panel.classList.remove("is-drop");
        });

        panel.addEventListener("drop", event => {
            if (!Z.transferHasFiles(event.dataTransfer)) return;
            event.preventDefault();
            event.stopPropagation();
            panel.classList.remove("is-drop");
            addToLibrary(Z.filesFromTransfer(event.dataTransfer));
        });

        document.body.appendChild(panel);

        button.classList.add("is-open");

        renderPanel();
        refresh();
    }

    async function addToLibrary(files) {

        const list = Array.from(files || []).filter(file => Z.isImageFile(file) || Z.isHeic(file));

        if (!list.length) {
            Z.toast("เลือกได้เฉพาะไฟล์รูป (แนะนำ PNG พื้นใส)", true);
            return;
        }

        let added = 0;

        for (const file of list) {

            try {

                const result = await Z.processImage(file, { maxSide: LIBRARY_SIDE, keepBelowChars: 400000 });

                await putItem({
                    id: Z.createLocalId("stk"),
                    name: (file.name || "").replace(/\.[^.]+$/, "").slice(0, 60),
                    src: result.src,
                    w: result.width,
                    h: result.height,
                    added: Date.now() + added
                });

                added += 1;

            } catch (error) {

                Z.toast(`${file.name || "รูป"}: ${error.message}`, true);
            }
        }

        if (added) {

            await refresh();

            Z.toast(added > 1 ? `เพิ่มรูปแปะ ${added} รูปแล้ว` : "เพิ่มรูปแปะแล้ว");

            const grid = panel && panel.querySelector(".zg-stk-grid");
            if (grid) grid.scrollTop = grid.scrollHeight;
        }
    }

    async function pickFiles() {

        const input = document.createElement("input");

        input.type = "file";
        input.accept = "image/png,image/webp,image/gif,image/svg+xml,image/jpeg";
        input.multiple = true;

        input.addEventListener("change", () => addToLibrary(input.files));

        input.click();
    }

    async function place(item, point) {

        try {

            await board.addSticker(item.src, {
                point,
                width: PLACE_WIDTH,
                name: item.name || "รูปแปะ"
            });

            Z.toast("แปะรูปแล้ว — ลากมุมเพื่อย่อขยาย · Delete = ลบ");

        } catch (error) {

            Z.toast(error.message || "แปะรูปไม่ได้", true);
        }
    }

    async function onPanelClick(event) {

        const del = event.target.closest("[data-stk-del]");

        if (del) {

            event.stopPropagation();

            const id = del.dataset.stkDel;

            try {
                await deleteItem(id);
                items = items.filter(item => item.id !== id);
                renderPanel();
                Z.toast("ลบรูปแปะออกจากคลังแล้ว (รูปที่แปะไว้ในแผนยังอยู่)");
            } catch (error) {
                Z.toast("ลบรูปแปะไม่สำเร็จ", true);
            }

            return;
        }

        if (event.target.closest("[data-stk='pick']")) {
            pickFiles();
            return;
        }
    }


    /* =====================================================
       คลิก / ลากรูปแปะไปวาง
    ===================================================== */

    let drag = null;

    function onTileDown(event) {

        const tile = event.target.closest(".zg-stk-tile");

        if (!tile || event.target.closest("[data-stk-del]") || event.button !== 0) return;

        const item = items.find(entry => entry.id === tile.dataset.stkId);

        if (!item) return;

        event.preventDefault();

        drag = { item, x: event.clientX, y: event.clientY, moved: false, ghost: null };
    }

    function overTable(x, y) {

        const inside = element => {
            if (!element) return false;
            const rect = element.getBoundingClientRect();
            return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        };

        /* ตาราง หรือ ช่องเส้นวันที่ */
        return inside(typeof objectLayerViewport !== "undefined" ? objectLayerViewport : null) ||
            inside(document.getElementById("bracketViewport"));
    }

    window.addEventListener("pointermove", event => {

        if (!drag) return;

        if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return;

        if (!drag.moved) {

            drag.moved = true;

            drag.ghost = document.createElement("img");
            drag.ghost.className = "zg-stk-ghost";
            drag.ghost.src = drag.item.src;

            document.body.appendChild(drag.ghost);
            document.body.classList.add("zg-stk-dragging");

            /* ซ่อนแถบชั่วคราว เพื่อให้เห็นตารางตอนวาง */
            if (panel) panel.style.opacity = ".25";
        }

        drag.ghost.style.left = `${event.clientX}px`;
        drag.ghost.style.top = `${event.clientY}px`;
        drag.ghost.style.opacity = overTable(event.clientX, event.clientY) ? ".95" : ".45";
    });

    function endDrag(event, cancelled) {

        if (!drag) return;

        const current = drag;

        drag = null;

        if (current.ghost) current.ghost.remove();

        document.body.classList.remove("zg-stk-dragging");

        if (panel) panel.style.opacity = "";

        if (cancelled) return;

        if (!current.moved) {
            place(current.item, null);
            return;
        }

        if (event && overTable(event.clientX, event.clientY)) {
            place(current.item, { clientX: event.clientX, clientY: event.clientY });
        }
    }

    window.addEventListener("pointerup", event => endDrag(event, false));
    window.addEventListener("pointercancel", () => endDrag(null, true));


    /* =====================================================
       OPEN / CLOSE
    ===================================================== */

    button.addEventListener("click", event => {
        event.stopPropagation();
        if (panel) closePanel(); else openPanel();
    });

    document.addEventListener("mousedown", event => {
        if (panel && !drag && !panel.contains(event.target) && !button.contains(event.target)) closePanel();
    });

    document.addEventListener("keydown", event => {
        if (panel && event.key === "Escape" && !drag) closePanel();
        if (drag && event.key === "Escape") endDrag(null, true);
    });

    window.addEventListener("resize", positionPanel);


    window.ZGStickers = {
        open: openPanel,
        close: closePanel,
        list: () => getAll(),
        addFiles: addToLibrary
    };

})();
