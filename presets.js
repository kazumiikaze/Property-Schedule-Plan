"use strict";

/* =========================================================
   PRESETS.JS — ⭐ ชุดสำเร็จ (จัดกลุ่ม object ไว้กดใช้ซ้ำ)
   1) ลากคลุม object → ⭐ ชุดสำเร็จ ▾ → "＋ บันทึกที่เลือกเป็นชุด"
      จำตำแหน่งแบบเทียบกัน (ห่างกี่วัน / ห่างกี่แถว) ไม่ได้จำวันที่จริง
      เก็บได้: กล่องงาน, เส้นวันที่, เส้นแนวตั้ง, เส้นแนวนอน (ช่วงเวลา),
      รูป / รูปแปะ และกล่องข้อความ
   2) แผงเลือกชุด: รูปตัวอย่างย่อ · คลิก = วางตรงช่วงที่เห็นบนจอ
      · ลากไปวาง = เริ่มที่วัน + แถวที่ปล่อยเมาส์
   3) วางแล้วติดกันเป็นกลุ่ม: คลิกชิ้นไหนก็เลือกทั้งชุด ลากย้ายไปด้วยกัน
      · Alt + คลิก = เลือกชิ้นเดียว · ปุ่ม "✂ แยกกลุ่ม" · ↶ ย้อนกลับได้
   6) ชุดของทีม: ไฟล์ presets/preset1.json, preset2.json … ในเว็บ
      (ทุกเครื่องเห็นเหมือนกัน ลบจากแผงไม่ได้)
      ชุดของฉัน: เก็บในเบราว์เซอร์ · ⬆ Export / ⬇ Import เป็นไฟล์ได้
   - ไม่แก้ app.js / style.css — โหลดหลัง stickers.js, object-precise.js
     และก่อน marquee-select.js
========================================================= */

(function () {

    if (typeof timelineObjects === "undefined" || typeof renderObjects !== "function") {
        console.warn("[presets.js] ต้องโหลดหลัง app.js");
        return;
    }

    const LOCAL_KEY = "zg-presets-v1";
    const GROUPS_KEY = "zg-preset-groups-v1";
    const FOLDER = "presets/";
    const MAX_TEAM_FILES = 50;
    const FILE_TYPE = "zg-property-schedule-presets";
    const DAY_MS = 86400000;


    /* =====================================================
       HELPERS
    ===================================================== */

    function toast(message, isError) {
        if (window.ZGImage && typeof window.ZGImage.toast === "function") window.ZGImage.toast(message, isError);
    }

    function lang() {
        try { return (window.ZGLang && window.ZGLang.get && window.ZGLang.get()) || "th"; } catch (error) { return "th"; }
    }

    function L(th, en, ja) {
        const current = lang();
        return current === "en" ? en : current === "ja" ? ja : th;
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function uid(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            toast(L("บันทึกไม่ได้: พื้นที่ในเบราว์เซอร์เต็ม", "Cannot save: browser storage is full", "保存できません：ブラウザの容量不足"), true);
            return false;
        }
    }

    function dayNumber(date) {
        return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
    }

    function toDate(value) {
        if (value instanceof Date) return value;
        if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            const [y, m, d] = value.slice(0, 10).split("-").map(Number);
            return new Date(y, m - 1, d);
        }
        return null;
    }

    function startDay() {
        return dayNumber(timelineStartDate);
    }

    function ppd() {
        return pxPerDay > 0 ? pxPerDay : 8;
    }

    function rowUnit() {
        return categoryHeight > 0 ? categoryHeight : 120;
    }

    /* ขอบบนของทุกแถว (px ในเนื้อหาตาราง) */
    function rowTops() {
        const tops = [];
        const unit = rowUnit();
        (Array.isArray(categories) ? categories : []).forEach((category, index) => {
            const count = Math.max(1, (category.rows || []).length);
            for (let row = 0; row < count; row += 1) tops.push(index * unit + row * unit / count);
        });
        return tops.length ? tops : [0];
    }

    function rowTopAtOrAbove(y) {
        const tops = rowTops();
        let best = tops[0];
        tops.forEach(top => { if (top <= y + 0.5) best = top; });
        return best;
    }

    function rowTopAtOrBelow(y) {
        const tops = rowTops();
        const found = tops.find(top => top >= y - 0.5);
        return found === undefined ? tops[tops.length - 1] : found;
    }

    function viewportRect() {
        return timelineViewport.getBoundingClientRect();
    }

    function findObject(id) {
        return timelineObjects.find(object => object.id === id);
    }

    function boardImages() {
        return window.ZGBoardImages && typeof window.ZGBoardImages.list === "function" ? window.ZGBoardImages.list() : [];
    }

    function textBoxes() {
        return window.ZGTextBoxes && typeof window.ZGTextBoxes.serialize === "function" ? window.ZGTextBoxes.serialize() : [];
    }

    function record() {
        if (window.ZGHistory && typeof window.ZGHistory.record === "function") window.ZGHistory.record();
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.zg-pre-btn { white-space: nowrap; }
.zg-pre-btn.is-open { background: #fff6dc; border-color: #f2c94c; }
.zg-pre {
    position: fixed; z-index: 26000; width: 344px; padding: 12px; box-sizing: border-box;
    border: 1px solid #dfe5e1; border-radius: 14px; background: #fff;
    box-shadow: 0 16px 44px rgba(10,30,20,.2); color: #1e2924; font-size: 12px;
}
.zg-pre-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.zg-pre-title { font-size: 13px; font-weight: 700; }
.zg-pre-count { font-size: 11px; color: #8a948f; }
.zg-pre-save {
    width: 100%; height: 32px; border: 0; border-radius: 9px; margin-bottom: 10px;
    background: #f2b705; color: #fff; font-weight: 700; font-size: 12.5px; cursor: pointer;
}
.zg-pre-save:hover:not(:disabled) { background: #dca503; }
.zg-pre-save:disabled { background: #e7e1cf; color: #9a927a; cursor: default; }
.zg-pre-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
    max-height: 292px; overflow-y: auto; padding: 2px 4px 2px 2px; margin-right: -4px;
    scrollbar-width: thin; scrollbar-color: #c7d0cb transparent;
}
.zg-pre-card {
    position: relative; border: 1px solid #e3e8e5; border-radius: 10px; background: #fbfcfb;
    cursor: grab; touch-action: none; overflow: hidden;
    transition: border-color .12s, box-shadow .12s, transform .12s;
}
.zg-pre-card:hover { border-color: #f2c94c; box-shadow: 0 4px 12px rgba(0,0,0,.08); transform: translateY(-1px); }
.zg-pre-card img { display: block; width: 100%; height: 86px; object-fit: contain; background: #fff; pointer-events: none; -webkit-user-drag: none; }
.zg-pre-name { padding: 5px 7px 6px; font-weight: 700; font-size: 11.5px; line-height: 1.3; border-top: 1px solid #eef1ef;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zg-pre-meta { padding: 0 7px 6px; margin-top: -3px; font-size: 10px; color: #8a948f; }
.zg-pre-team { position: absolute; left: 5px; top: 5px; padding: 0 6px; border-radius: 6px; background: rgba(242,183,5,.92); color: #fff; font: 700 9px/15px Arial, sans-serif; }
.zg-pre-del {
    position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; padding: 0;
    border: 1px solid #f0c9c9; border-radius: 50%; background: #fff; color: #d9363e; font-size: 11px; cursor: pointer;
    opacity: 0; transition: opacity .12s;
}
.zg-pre-card:hover .zg-pre-del { opacity: 1; }
.zg-pre-del:hover { background: #d9363e; color: #fff; }
.zg-pre-empty { padding: 22px 12px; border: 2px dashed #e6dcbc; border-radius: 12px; color: #7d8781; text-align: center; line-height: 1.6; }
.zg-pre-foot { display: flex; gap: 6px; align-items: center; margin-top: 10px; }
.zg-pre-foot button { height: 26px; padding: 0 9px; border: 1px solid #dfe5e1; border-radius: 7px; background: #fff; font-size: 11.5px; cursor: pointer; color: inherit; }
.zg-pre-foot button:hover { border-color: #f2c94c; }
.zg-pre-hint { margin-top: 8px; font-size: 10.5px; color: #8a948f; line-height: 1.5; }

.zg-pre-ask { display: flex; flex-direction: column; gap: 8px; padding: 10px; margin-bottom: 10px; border-radius: 10px; background: #fff9e6; border: 1px solid #f4e2a6; }
.zg-pre-ask input { height: 30px; padding: 0 8px; border: 1px solid #d9cfa8; border-radius: 7px; font: inherit; font-size: 12.5px; }
.zg-pre-ask-row { display: flex; gap: 6px; justify-content: flex-end; }
.zg-pre-ask-row button { height: 28px; padding: 0 12px; border-radius: 7px; border: 1px solid #dfe5e1; background: #fff; cursor: pointer; font-size: 12px; }
.zg-pre-ask-row button.ok { background: #f2b705; border-color: #f2b705; color: #fff; font-weight: 700; }
.zg-pre-ask small { color: #8a7b4a; }

.zg-pre-peek {
    position: fixed; z-index: 26800; width: 586px; max-width: calc(100vw - 16px); padding: 12px; box-sizing: border-box;
    border: 1px solid #f2c94c; border-radius: 14px; background: #fff; color: #1e2924; font-size: 12px;
    box-shadow: 0 18px 46px rgba(10,30,20,.22); pointer-events: none;
    animation: zgPeekIn .16s ease-out;
}
@keyframes zgPeekIn { from { opacity: 0; transform: translateX(-6px); } }
.zg-pre-peek-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.zg-pre-peek-name { font-size: 14px; font-weight: 700; }
.zg-pre-peek-sub { font-size: 11px; color: #8a948f; }
.zg-pre-peek canvas { display: block; max-width: 100%; border: 1px solid #eef1ef; border-radius: 10px; background: #fff; }
.zg-pre-peek-drop { margin-top: 8px; padding: 6px 9px; border-radius: 8px; background: #fff6dc; color: #7a5d00; font-weight: 700; }
.zg-pre-peek-drop.out { background: #f3f5f4; color: #7d8781; font-weight: 400; }
.zg-pre-peek-list { margin: 8px 0 0; padding: 0; list-style: none; max-height: 168px; overflow: hidden; }
.zg-pre-peek-list li { display: flex; gap: 7px; align-items: baseline; padding: 3px 0; border-bottom: 1px solid #f2f4f3; }
.zg-pre-peek-list li:last-child { border-bottom: 0; }
.zg-pre-peek-list b { flex: none; width: 18px; text-align: center; font-weight: 400; }
.zg-pre-peek-list span { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zg-pre-peek-list em { flex: none; font-style: normal; color: #8a948f; font-size: 11px; }
/* ระหว่างลาก: ย่อเล็กลง ไม่บังตาราง */
.zg-pre-peek.is-drag { width: 420px; padding: 9px; opacity: .97; }
.zg-pre-peek.is-drag canvas { width: 100% !important; height: auto !important; }
.zg-pre-peek.is-drag .zg-pre-peek-list { display: none; }
.zg-pre-peek.is-drag .zg-pre-peek-name { font-size: 12.5px; }
body.zg-exporting .zg-pre-peek { display: none !important; }
body.zg-dark .zg-pre-peek { background: #222a27; border-color: #8a7420; color: #e3e9e5; }
body.zg-dark .zg-pre-peek-list li { border-color: #3a4440; }
body.zg-dark .zg-pre-peek-drop { background: #3a3220; color: #f2d27a; }
.zg-pre-onboard { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; z-index: 24000; pointer-events: none; }
body.zg-exporting .zg-pre-onboard { display: none !important; }
.zg-pre-ghost { position: fixed; z-index: 27000; width: 150px; pointer-events: none; opacity: .9; transform: translate(-20px, -20px);
    border-radius: 8px; box-shadow: 0 10px 24px rgba(0,0,0,.25); background: #fff; }
.zg-pre-drop { position: fixed; z-index: 26500; pointer-events: none; border: 2px dashed #f2b705; border-radius: 6px; background: rgba(242,183,5,.08); }
body.zg-pre-dragging, body.zg-pre-dragging * { cursor: grabbing !important; user-select: none !important; }

.zg-pre-pill {
    position: fixed; z-index: 25000; display: flex; align-items: center; gap: 6px;
    padding: 3px 4px 3px 9px; border-radius: 99px; background: #1e2924; color: #fff; font-size: 11px;
    box-shadow: 0 6px 16px rgba(0,0,0,.2); transform: translateY(-100%); white-space: nowrap;
}
.zg-pre-pill button { border: 0; border-radius: 99px; padding: 3px 9px; background: #f2b705; color: #fff; font-size: 11px; font-weight: 700; cursor: pointer; }
.zg-pre-pill button:hover { background: #dca503; }
.zg-pre-quick {
    position: fixed; z-index: 25000; display: flex; align-items: center; gap: 5px;
    padding: 3px; border-radius: 99px; background: #fff; border: 1px solid #f2c94c;
    box-shadow: 0 6px 16px rgba(0,0,0,.16); transform: translateY(-100%); white-space: nowrap; font-size: 11px;
}
.zg-pre-quick button { border: 0; border-radius: 99px; padding: 3px 10px; background: #f2b705; color: #fff; font-size: 11px; font-weight: 700; cursor: pointer; }
.zg-pre-quick button:hover { background: #dca503; }
.zg-pre-quick button.ghost { background: transparent; color: #7d8781; padding: 3px 7px; }
.zg-pre-quick input { width: 190px; height: 24px; padding: 0 8px; border: 1px solid #e6dcbc; border-radius: 99px; font: inherit; font-size: 12px; }
body.zg-dark .zg-pre-quick { background: #222a27; border-color: #8a7420; }

body.zg-exporting .zg-pre, body.zg-exporting .zg-pre-pill, body.zg-exporting .zg-pre-quick, body.zg-exporting .zg-pre-ghost, body.zg-exporting .zg-pre-drop { display: none !important; }
body.zg-dark .zg-pre { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-pre-card { background: #2b3330; border-color: #3a4440; }
body.zg-dark .zg-pre-name { border-color: #3a4440; }
body.zg-dark .zg-pre-foot button { background: #2b3330; border-color: #3a4440; }
body.zg-dark .zg-pre-ask { background: #2f2a1c; border-color: #5a4f2a; }
`;

    document.head.appendChild(style);


    /* =====================================================
       STORAGE: ชุดของฉัน + ชุดของทีม
    ===================================================== */

    /* ชุดของฉันเก็บใน IndexedDB (ไม่แย่งพื้นที่ 5 MB ของ localStorage ที่แผนทั้งหมดใช้อยู่)
       เปิดหน้า → โหลดมาไว้ในหน่วยความจำ · บันทึก → เขียนลง IndexedDB */
    const DB_NAME = "zg-presets";
    const DB_STORE = "kv";
    const DB_KEY = "local";

    let localCache = [];
    let localReady = null;

    function openDb() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) { reject(new Error("NO_IDB")); return; }
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("IDB_OPEN"));
        });
    }

    async function idbGet() {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const request = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(DB_KEY);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function idbPut(value) {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, "readwrite");
            tx.objectStore(DB_STORE).put(value, DB_KEY);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error || new Error("IDB_WRITE"));
            tx.onabort = () => reject(tx.error || new Error("IDB_ABORT"));
        });
    }

    function cleanList(list) {
        return Array.isArray(list) ? list.filter(item => item && item.id && Array.isArray(item.objects)) : [];
    }

    function loadLocal() {

        if (localReady) return localReady;

        localReady = (async () => {

            let stored = null;

            try { stored = await idbGet(); } catch (error) { stored = null; }

            /* ย้ายชุดเก่าที่เคยเก็บใน localStorage มารวม */
            const legacy = cleanList(readJson(LOCAL_KEY, []));
            const list = cleanList(stored);

            legacy.forEach(item => { if (!list.some(existing => existing.id === item.id)) list.push(item); });

            localCache = list;

            if (legacy.length) {
                try {
                    await idbPut(localCache);
                    localStorage.removeItem(LOCAL_KEY);
                } catch (error) { /* เก็บไว้ที่เดิมก่อน */ }
            }

            return localCache;
        })();

        return localReady;
    }

    function localPresets() {
        return localCache.slice();
    }

    async function saveLocal(list) {

        const previous = localCache;
        localCache = cleanList(list);

        try {
            await idbPut(localCache);
            return true;
        } catch (error) {
            console.error("[presets.js]", error);
            /* IndexedDB ใช้ไม่ได้ → ลอง localStorage */
            try {
                localStorage.setItem(LOCAL_KEY, JSON.stringify(localCache));
                return true;
            } catch (storageError) {
                localCache = previous;
                toast(L("บันทึกชุดไม่ได้: พื้นที่ในเบราว์เซอร์เต็ม — ลองลบชุดที่ไม่ใช้ หรือลดขนาดรูปในชุด",
                    "Cannot save the set: browser storage is full",
                    "セットを保存できません：ブラウザの容量不足"), true);
                return false;
            }
        }
    }

    loadLocal();

    let teamPresets = [];
    let teamLoaded = false;

    function toPresetList(json) {
        if (!json || typeof json !== "object") return [];
        if (Array.isArray(json.presets)) return json.presets.filter(item => item && Array.isArray(item.objects));
        if (Array.isArray(json.objects) && json.anchor) return [json];
        return [];
    }

    async function loadTeam() {

        if (teamLoaded || location.protocol === "file:") {
            teamLoaded = true;
            return teamPresets;
        }

        const found = [];

        for (let i = 1; i <= MAX_TEAM_FILES; i += 1) {
            let response;
            try {
                response = await fetch(`${FOLDER}preset${i}.json`, { cache: "no-cache" });
                /* ตั้งชื่อเป็น presets1.json (มี s) ก็ใช้ได้ */
                if (!response.ok) response = await fetch(`${FOLDER}presets${i}.json`, { cache: "no-cache" });
            } catch (error) {
                break;
            }
            if (!response.ok) break;
            try {
                toPresetList(await response.json()).forEach((item, n) => {
                    found.push({ ...item, id: `team-${i}-${n}-${item.id || ""}`, srcId: item.id || "", team: true });
                });
            } catch (error) {
                console.warn(`[presets.js] preset${i}.json ไม่ใช่ JSON ที่ถูกต้อง`);
            }
        }

        teamPresets = found;
        teamLoaded = true;

        return teamPresets;
    }

    function allPresets() {
        /* ชุดของฉันที่เป็นชุดเดียวกับชุดของทีม (Export ไปใส่โฟลเดอร์ presets/) → แสดงอันเดียว */
        const teamIds = new Set(teamPresets.map(item => item.srcId).filter(Boolean));
        return [...teamPresets, ...localPresets().filter(item => !teamIds.has(item.id))];
    }

    function findPreset(id) {
        return allPresets().find(item => item.id === id);
    }


    /* =====================================================
       GROUPS: ชุดที่วางแล้วติดกันเป็นกลุ่ม
       object → ช่อง zgGroup (บันทึกไปกับแผน)
       รูป / กล่องข้อความ → จำ id ไว้ในเบราว์เซอร์
    ===================================================== */

    function groupsStore() {
        const store = readJson(GROUPS_KEY, {});
        return store && typeof store === "object" ? store : {};
    }

    function saveGroups(store) {
        writeJson(GROUPS_KEY, store);
    }

    function groupMembers(groupId) {

        const extra = groupsStore()[groupId] || {};
        const imageIds = new Set(boardImages().map(item => item.id));
        const textIds = new Set(textBoxes().map(item => item.id));

        return {
            ids: timelineObjects.filter(object => object.zgGroup === groupId).map(object => object.id),
            images: (extra.images || []).filter(id => imageIds.has(id)),
            texts: (extra.texts || []).filter(id => textIds.has(id)),
            name: extra.name || (timelineObjects.find(object => object.zgGroup === groupId) || {}).zgGroupName || ""
        };
    }

    function groupOfImage(id) {
        const store = groupsStore();
        return Object.keys(store).find(key => (store[key].images || []).includes(id)) || null;
    }

    function groupOfText(id) {
        const store = groupsStore();
        return Object.keys(store).find(key => (store[key].texts || []).includes(id)) || null;
    }

    function ungroup(groupId) {

        timelineObjects.forEach(object => {
            if (object.zgGroup === groupId) {
                delete object.zgGroup;
                delete object.zgGroupName;
            }
        });

        const store = groupsStore();
        delete store[groupId];
        saveGroups(store);

        activeGroup = null;
        paintPill();
        record();

        toast(L("แยกกลุ่มแล้ว — แก้ทีละชิ้นได้", "Ungrouped — edit pieces one by one", "グループを解除しました"));
    }


    /* =====================================================
       1) บันทึกที่เลือกเป็นชุด
    ===================================================== */

    function currentSelection() {

        const P = window.ZGObjectPrecise;
        const M = window.ZGMarquee;

        return {
            ids: P && P.getSelectedIds ? P.getSelectedIds() : [],
            images: M && M.selectedImages ? M.selectedImages() : [],
            texts: M && M.selectedTexts ? M.selectedTexts() : []
        };
    }

    function selectionCount(selection = currentSelection()) {
        return selection.ids.length + selection.images.length + selection.texts.length;
    }

    function textStyleOf(id) {
        const api = window.ZGTextSize;
        return api && typeof api.getStyle === "function" && id ? api.getStyle(`text:${id}`) : null;
    }

    function buildPreset(name, selection) {

        const unit = rowUnit();
        const perDay = ppd();
        const sDay = startDay();

        const objects = selection.ids.map(findObject).filter(Boolean);
        const objectIds = new Set(objects.map(object => object.id));
        const images = boardImages().filter(item => selection.images.includes(item.id));

        /* กล่องข้อความที่ติดแม่เหล็กกับรูปในชุด → ติดไปด้วย */
        images.forEach(item => objectIds.add(item.id));

        /* กล่องข้อความ: ใส่ทั้งที่เลือก + ที่ติดแม่เหล็กกับ object ในชุด */
        const texts = textBoxes().filter(item =>
            selection.texts.includes(item.id) || (item.attach && objectIds.has(item.attach.objectId)));

        /* จุดอ้างอิง: วันแรกสุด + แถวบนสุด */
        const days = [];
        const tops = [];

        objects.forEach(object => {
            if (object.type === "dateline" || object.type === "vline") {
                const date = toDate(object.linkedHeaderDate);
                if (date) days.push(dayNumber(date) - sDay);
            } else {
                days.push(object.x / perDay);
                if (object.type !== "hline") tops.push(object.y);
            }
        });

        images.forEach(item => {
            days.push(item.day - sDay);
            tops.push(item.row * unit);
        });

        if (!days.length) days.push(timelineViewport.scrollLeft / perDay);

        const anchorDay = Math.floor(Math.min(...days) + 1e-6);
        const anchorTop = tops.length ? rowTopAtOrAbove(Math.min(...tops)) : rowTopAtOrBelow(verticalScrollY);

        /* จุดอ้างอิงบนจอ (สำหรับกล่องข้อความที่ไม่ได้ติดกับ object) */
        const rect = viewportRect();
        const screenX = rect.left + anchorDay * perDay - timelineViewport.scrollLeft;
        const screenY = rect.top + anchorTop - verticalScrollY;

        const roleIds = new Set(objects.map(object => object.roleId).filter(Boolean));

        return {
            id: uid("preset"),
            name,
            createdAt: new Date().toISOString(),
            version: 1,
            anchor: { rowUnit: unit },

            objects: objects.map(source => {
                const object = clone(source);
                delete object.zgGroup;
                delete object.zgGroupName;
                const item = { data: object };
                if (object.type === "dateline" || object.type === "vline") {
                    const date = toDate(source.linkedHeaderDate);
                    item.dateOff = date ? dayNumber(date) - sDay - anchorDay : 0;
                } else {
                    item.dayOff = object.x / perDay - anchorDay;
                    item.wDays = object.width / perDay;
                    if (object.type !== "hline") {
                        item.rowOff = (object.y - anchorTop) / unit;
                        item.hRows = object.height / unit;
                    }
                }
                return item;
            }),

            images: images.map(source => ({
                ...clone(source),
                day: source.day - sDay - anchorDay,
                row: source.row - anchorTop / unit
            })),

            texts: texts.map(source => {
                const text = clone(source);
                /* ขนาด / ตัวหนา / แนวตั้ง ของกล่องข้อความ (เก็บแยกไว้ใน text-size.js) → เก็บไปกับชุด */
                const style = textStyleOf(source.id);
                if (text.attach && objectIds.has(text.attach.objectId)) return style ? { data: text, style } : { data: text };
                text.attach = null;
                const item = { data: text, dx: source.x - screenX, dy: source.y - screenY,
                    dayOff: (source.x - screenX) / perDay, rowOff: (source.y - screenY) / unit, wDays: (Number(source.w) || 160) / perDay };
                if (style) item.style = style;
                return item;
            }),

            roles: (Array.isArray(objectRoles) ? objectRoles : []).filter(role => roleIds.has(role.id)).map(clone)
        };
    }


    /* รูปตัวอย่างย่อ: วาดจากข้อมูล (เร็ว ไม่ต้องถ่ายภาพหน้าจอ) */
    function loadImage(src) {
        return new Promise(resolve => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => resolve(null);
            image.src = src;
        });
    }

    async function drawThumb(preset, W = 300, H = 172) {

        const pad = 10, band = 40;
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);

        const items = preset.objects;
        let minD = 0, maxD = 1, maxR = 0.6;

        items.forEach(item => {
            if (item.dateOff !== undefined) maxD = Math.max(maxD, item.dateOff + 1);
            else maxD = Math.max(maxD, item.dayOff + item.wDays);
            if (item.rowOff !== undefined) maxR = Math.max(maxR, item.rowOff + item.hRows);
            if (item.dayOff !== undefined) minD = Math.min(minD, item.dayOff);
        });
        preset.images.forEach(item => {
            minD = Math.min(minD, item.day);
            maxD = Math.max(maxD, item.day + item.wDays);
            maxR = Math.max(maxR, item.row + item.hRows);
        });
        (preset.texts || []).forEach(item => {
            if (item.dayOff === undefined) return;
            minD = Math.min(minD, item.dayOff);
            maxD = Math.max(maxD, item.dayOff + item.wDays);
            maxR = Math.max(maxR, item.rowOff + 0.25);
        });

        const hasBracket = items.some(item => item.data.type === "dateline" || item.data.type === "hline");
        const tableH = H - pad * 2 - (hasBracket ? band : 0);
        const sx = (W - pad * 2) / Math.max(1, maxD - minD);
        const sy = tableH / Math.max(0.6, maxR);
        const X = day => pad + (day - minD) * sx;
        const Y = row => pad + row * sy;

        /* เส้นตารางจาง ๆ */
        ctx.strokeStyle = "#eef1ef";
        ctx.lineWidth = 1;
        for (let r = 0; r <= maxR + 0.01; r += 0.5) {
            ctx.beginPath(); ctx.moveTo(pad, Y(r)); ctx.lineTo(W - pad, Y(r)); ctx.stroke();
        }

        function roundRect(x, y, w, h, radius) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.arcTo(x + w, y, x + w, y + h, radius);
            ctx.arcTo(x + w, y + h, x, y + h, radius);
            ctx.arcTo(x, y + h, x, y, radius);
            ctx.arcTo(x, y, x + w, y, radius);
            ctx.closePath();
        }

        const roleColor = id => ((preset.roles || []).find(role => role.id === id) || {}).color;
        const font = getComputedStyle(document.body).fontFamily || "sans-serif";

        items.forEach(item => {
            const o = item.data;
            if (o.type === "task") {
                const x = X(item.dayOff), y = Y(item.rowOff), w = Math.max(6, item.wDays * sx), h = Math.max(6, item.hRows * sy);
                ctx.fillStyle = o.color || roleColor(o.roleId) || "#93d6e3";
                roundRect(x, y, w, h, Math.min(8, h / 3));
                ctx.fill();
                ctx.fillStyle = o.textColorMode === "light" ? "#ffffff" : "#1e2924";
                ctx.font = `700 11px ${font}`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.save();
                ctx.beginPath(); ctx.rect(x + 3, y, w - 6, h); ctx.clip();
                String(o.text || "").split(/\n/).slice(0, 3).forEach((line, index, lines) => {
                    ctx.fillText(line, x + w / 2, y + h / 2 + (index - (lines.length - 1) / 2) * 13, w - 6);
                });
                ctx.restore();
            }
        });

        for (const item of preset.images) {
            const image = item.src ? await loadImage(item.src) : null;
            if (image) ctx.drawImage(image, X(item.day), Y(item.row), item.wDays * sx, item.hRows * sy);
        }

        (preset.texts || []).forEach(item => {
            if (item.dayOff === undefined) return;
            const x = X(item.dayOff), y = Y(item.rowOff), w = Math.max(20, item.wDays * sx);
            ctx.strokeStyle = "#7ac143";
            ctx.lineWidth = 1;
            roundRect(x, y, w, 16, 3);
            ctx.stroke();
            ctx.fillStyle = "#1e2924";
            ctx.font = `10px ${font}`;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(String(item.data.text || "").split("\n")[0], x + 3, y + 8, w - 6);
        });

        const bandTop = H - pad - band;

        items.forEach(item => {
            const o = item.data;
            if (o.type === "dateline" || o.type === "vline") {
                const x = X(item.dateOff);
                ctx.save();
                ctx.setLineDash([4, 3]);
                ctx.strokeStyle = o.lineColor || (o.type === "vline" ? "#8e44ad" : "#d9363e");
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, o.type === "dateline" ? bandTop + 8 : H - pad); ctx.stroke();
                ctx.restore();
                if (o.type === "dateline") {
                    ctx.fillStyle = "#ffffff";
                    ctx.strokeStyle = "#d9363e";
                    roundRect(x - 26, bandTop + 8, 52, 14, 4);
                    ctx.fill(); ctx.stroke();
                    ctx.fillStyle = "#1e2924";
                    ctx.font = `9px ${font}`;
                    ctx.textAlign = "center";
                    ctx.fillText(String(o.text || "").slice(0, 12), x, bandTop + 15, 50);
                }
            } else if (o.type === "hline") {
                const x1 = X(item.dayOff), x2 = X(item.dayOff + item.wDays), y = bandTop + 30;
                ctx.strokeStyle = o.lineColor || "#8e44ad";
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
                ctx.fillStyle = o.lineColor || "#8e44ad";
                ctx.font = `9px ${font}`;
                ctx.textAlign = "center";
                ctx.fillText(String(o.text || "").slice(0, 30), (x1 + x2) / 2, y - 5, x2 - x1);
            }
        });

        return canvas.toDataURL("image/png");
    }

    async function saveSelection(name) {

        const selection = currentSelection();

        if (!selectionCount(selection)) {
            toast(L("ลากคลุม object ที่ต้องการก่อน", "Select objects first (drag a box around them)", "先にオブジェクトを選択してください"), true);
            return false;
        }

        let preset;

        try {
            preset = buildPreset(name, selection);
        } catch (error) {
            console.error("[presets.js]", error);
            toast(L("บันทึกชุดไม่สำเร็จ: อ่านข้อมูล object ที่เลือกไม่ได้", "Could not save the set", "セットを保存できませんでした"), true);
            return false;
        }

        try {
            preset.thumb = await drawThumb(preset);
        } catch (error) {
            preset.thumb = "";
        }

        await loadLocal();

        const list = localPresets();
        list.unshift(preset);

        if (!(await saveLocal(list))) return false;

        toast(L(`บันทึกชุด "${name}" แล้ว`, `Saved set "${name}"`, `セット「${name}」を保存しました`));

        return true;
    }


    /* =====================================================
       2) วางชุดลงตาราง
    ===================================================== */

    function ensureRoles(roles) {

        if (!Array.isArray(objectRoles) || !Array.isArray(roles)) return;

        roles.forEach(role => {
            if (role && role.id && !objectRoles.some(existing => existing.id === role.id)) {
                objectRoles.push(clone(role));
            }
        });
    }

    /* day = วันที่ (นับจากวันเริ่มตาราง), top = ขอบบนของแถว (px ในเนื้อหาตาราง) */
    function placePreset(preset, day, top) {

        const unit = rowUnit();
        const perDay = ppd();
        const sDay = startDay();
        const groupId = uid("group");
        const idMap = {};
        const added = [];

        ensureRoles(preset.roles);

        preset.objects.forEach(item => {
            idMap[item.data.id] = (typeof createObjectId === "function") ? createObjectId() : uid("object");
        });

        preset.objects.forEach(item => {

            const object = clone(item.data);

            object.id = idMap[item.data.id];
            object.zgGroup = groupId;
            object.zgGroupName = preset.name;

            if (object.anchorStartId) object.anchorStartId = idMap[object.anchorStartId] || null;
            if (object.anchorEndId) object.anchorEndId = idMap[object.anchorEndId] || null;

            if (item.dateOff !== undefined) {

                const date = new Date(timelineStartDate);
                date.setHours(0, 0, 0, 0);
                date.setDate(date.getDate() + day + item.dateOff);
                object.linkedHeaderDate = date;

            } else {

                object.x = (day + item.dayOff) * perDay;
                object.width = Math.max(4, item.wDays * perDay);

                if (item.rowOff !== undefined) {
                    object.y = top + item.rowOff * unit;
                    object.height = Math.max(8, item.hRows * unit);
                }
            }

            added.push(object);
        });

        timelineObjects.push(...added);

        renderObjects();

        /* รูป / รูปแปะ */
        const newImages = [];

        if (preset.images.length && window.ZGBoardImages) {

            const images = preset.images.map(item => {
                const entry = { ...clone(item), id: uid("img"), day: sDay + day + item.day, row: top / unit + item.row, locked: false };
                if (item.id) idMap[item.id] = entry.id;
                return window.ZGBoardImages.makeEntry ? window.ZGBoardImages.makeEntry(entry) : entry;
            }).filter(Boolean);

            images.forEach(item => newImages.push(item.id));

            window.ZGBoardImages.load([...boardImages(), ...images]);
        }

        /* กล่องข้อความ (รอ object วาดเสร็จก่อน เพราะบางกล่องติดกับ object) */
        const newTexts = [];

        const finish = () => {

            if (preset.texts.length && window.ZGTextBoxes) {

                const rect = viewportRect();
                const screenX = rect.left + day * perDay - timelineViewport.scrollLeft;
                const screenY = rect.top + top - verticalScrollY;

                const styles = [];

                const texts = preset.texts.map(item => {
                    const text = clone(item.data);
                    /* ชุดเก่าที่ยังไม่ได้เก็บตัวหนา/ขนาด → ลองใช้ของกล่องต้นฉบับในแผนนี้ (ถ้ายังมี) */
                    const style = item.style || textStyleOf(text.id);
                    text.id = uid("text");
                    if (style) styles.push([text.id, style]);
                    if (text.attach) {
                        text.attach.objectId = idMap[text.attach.objectId];
                    } else {
                        text.x = screenX + (item.dx || 0);
                        text.y = screenY + (item.dy || 0);
                    }
                    newTexts.push(text.id);
                    return text;
                });

                window.ZGTextBoxes.load([...textBoxes(), ...texts]);

                const api = window.ZGTextSize;
                if (api && typeof api.setStyle === "function") {
                    styles.forEach(([id, style]) => api.setStyle(`text:${id}`, style));
                }
            }

            const store = groupsStore();
            store[groupId] = { name: preset.name, images: newImages, texts: newTexts, at: Date.now() };
            saveGroups(store);

            selectGroup(groupId);
            record();
        };

        requestAnimationFrame(() => requestAnimationFrame(finish));

        toast(L(`วางชุด "${preset.name}" แล้ว — ลากย้ายได้ทั้งชุด · Ctrl+Z ย้อนกลับ`,
            `Placed "${preset.name}" — drag to move the whole set · Ctrl+Z to undo`,
            `「${preset.name}」を配置しました — まとめて移動できます · Ctrl+Z で元に戻す`));
    }

    /* คลิกการ์ด = วางตรงช่วงที่เห็นบนจอ (เว้นจากขอบซ้ายนิดหน่อย) */
    function placeInView(preset) {
        const perDay = ppd();
        const day = Math.round((timelineViewport.scrollLeft + Math.min(120, timelineViewport.clientWidth * 0.12)) / perDay);
        const top = rowTopAtOrBelow(verticalScrollY);
        placePreset(preset, day, top);
    }

    /* จุดบนจอ → วัน + แถว */
    function dropTarget(clientX, clientY) {

        const rect = viewportRect();

        if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;

        const day = Math.round((clientX - rect.left + timelineViewport.scrollLeft) / ppd());
        const top = rowTopAtOrAbove(clientY - rect.top + verticalScrollY);

        return { day, top, rect };
    }


    /* =====================================================
       3) คลิกชิ้นไหนก็เลือกทั้งชุด
    ===================================================== */

    let activeGroup = null;

    function selectGroup(groupId) {

        const members = groupMembers(groupId);

        if (!members.ids.length && !members.images.length && !members.texts.length) {
            activeGroup = null;
            paintPill();
            return;
        }

        if (window.ZGMarquee && typeof window.ZGMarquee.select === "function") {
            window.ZGMarquee.select(members);
        } else if (window.ZGObjectPrecise) {
            window.ZGObjectPrecise.setSelection(members.ids);
        }

        activeGroup = groupId;
        paintPill();
    }

    /* ต้องดักก่อน marquee-select.js / object-precise.js (ไฟล์นี้โหลดก่อน) */
    window.addEventListener("pointerdown", event => {

        if (event.button !== 0 || event.altKey || event.shiftKey) {
            if (event.altKey) { activeGroup = null; paintPill(); }
            return;
        }

        const target = event.target instanceof Element ? event.target : null;
        if (!target || target.closest(".zg-pre, .zg-pre-pill, .zg-pre-quick")) return;

        if (target.closest(".canvas-object-handle, .zg-bimg-handle, [class*='resize']")) return;

        let groupId = null;

        const element = target.closest(".canvas-object[data-object-id]");
        if (element) {
            const object = findObject(element.dataset.objectId);
            groupId = object && object.zgGroup ? object.zgGroup : null;
        }

        if (!groupId) {
            const image = target.closest(".zg-img-layer .zg-bimg");
            if (image) groupId = groupOfImage(image.dataset.imgId);
        }

        if (!groupId) {
            const text = target.closest(".zg-text-box[data-text-id]");
            if (text && !text.contains(document.activeElement)) groupId = groupOfText(text.dataset.textId);
        }

        if (!groupId) {
            if (activeGroup && !target.closest(".object-menu, .workspace-toolbar")) {
                activeGroup = null;
                paintPill();
            }
            return;
        }

        const selected = currentSelection();
        const members = groupMembers(groupId);
        const already = members.ids.every(id => selected.ids.includes(id)) &&
            members.images.every(id => selected.images.includes(id)) &&
            members.texts.every(id => selected.texts.includes(id));

        if (!already) selectGroup(groupId);
        else { activeGroup = groupId; paintPill(); }

    }, true);


    /* กดในแผง / ป้ายกลุ่ม → ไม่ให้ระบบเลือก object ล้างสิ่งที่เลือกไว้ (ตัวอื่นดักที่ document capture) */
    window.addEventListener("mousedown", event => {
        const target = event.target instanceof Element ? event.target : null;
        if (target && target.closest(".zg-pre, .zg-pre-pill, .zg-pre-quick")) event.stopPropagation();
    }, true);

    /* ป้ายลอยเหนือกลุ่ม: ชื่อชุด + ✂ แยกกลุ่ม */
    let pill = null;

    function groupRect(groupId) {
        return membersRect(groupMembers(groupId));
    }

    function membersRect(members) {

        const nodes = [
            ...members.ids.map(id => document.querySelector(`.canvas-object[data-object-id="${CSS.escape(id)}"]`)),
            ...members.images.map(id => document.querySelector(`.zg-img-layer .zg-bimg[data-img-id="${CSS.escape(id)}"]`)),
            ...members.texts.map(id => document.querySelector(`.zg-text-box[data-text-id="${CSS.escape(id)}"]`))
        ].filter(node => node && node.offsetParent !== null);

        if (!nodes.length) return null;

        const rects = nodes.map(node => node.getBoundingClientRect()).filter(rect => rect.width || rect.height);
        if (!rects.length) return null;

        return {
            left: Math.min(...rects.map(rect => rect.left)),
            top: Math.min(...rects.map(rect => rect.top)),
            right: Math.max(...rects.map(rect => rect.right))
        };
    }

    function paintPill() {

        if (!activeGroup) {
            if (pill) pill.remove();
            pill = null;
            return;
        }

        const rect = groupRect(activeGroup);

        if (!rect) {
            if (pill) pill.style.display = "none";
            return;
        }

        if (!pill) {
            pill = document.createElement("div");
            pill.className = "zg-pre-pill";
            pill.innerHTML = `<span data-name></span><button type="button" data-ungroup>✂ ${L("แยกกลุ่ม", "Ungroup", "グループ解除")}</button>`;
            pill.addEventListener("pointerdown", event => event.stopPropagation());
            pill.addEventListener("click", event => {
                if (event.target.closest("[data-ungroup]") && activeGroup) ungroup(activeGroup);
            });
            document.body.appendChild(pill);
        }

        const members = groupMembers(activeGroup);
        pill.querySelector("[data-name]").textContent = `⭐ ${members.name || L("ชุดสำเร็จ", "Preset set", "セット")}`;
        pill.style.display = "";
        pill.style.left = `${Math.max(6, rect.left)}px`;
        pill.style.top = `${Math.max(30, rect.top - 6)}px`;
    }

    /* ตามตำแหน่งกลุ่มตอนลาก / เลื่อน */
    (function follow() {
        if (activeGroup) {
            const selected = currentSelection();
            const members = groupMembers(activeGroup);
            if (!members.ids.some(id => selected.ids.includes(id)) &&
                !members.images.some(id => selected.images.includes(id)) &&
                !members.texts.some(id => selected.texts.includes(id))) {
                activeGroup = null;
            }
            paintPill();
        }
        requestAnimationFrame(follow);
    })();


    /* =====================================================
       บันทึกตรงบริเวณ object: เลือกแล้วมีปุ่ม ⭐ ลอยเหนือที่เลือก
    ===================================================== */

    let quick = null;
    let quickNaming = false;
    let mouseHeld = false;

    /* กดค้างในตาราง (กำลังลาก) → ซ่อนปุ่ม · กดที่ปุ่มเองต้องไม่ซ่อน ไม่งั้นคลิกไม่โดน */
    window.addEventListener("pointerdown", event => {
        const target = event.target instanceof Element ? event.target : null;
        mouseHeld = !(target && target.closest(".zg-pre-quick, .zg-pre, .zg-pre-pill"));
    }, true);
    window.addEventListener("pointerup", () => { mouseHeld = false; }, true);

    function closeQuick() {
        if (quick) quick.remove();
        quick = null;
        quickNaming = false;
    }

    function paintQuick() {

        const selection = currentSelection();
        const count = selectionCount(selection);

        /* ไม่โชว์: ไม่ได้เลือก / เลือกชุดที่วางแล้ว (มีป้ายกลุ่มอยู่) / กำลังลาก / Export */
        if (!quickNaming && (!count || activeGroup || mouseHeld || document.body.classList.contains("zg-exporting"))) {
            if (quick) quick.style.display = "none";
            return;
        }

        const rect = membersRect(selection);

        if (!rect) {
            if (quick) quick.style.display = "none";
            return;
        }

        if (!quick) {

            quick = document.createElement("div");
            quick.className = "zg-pre-quick";
            quick.addEventListener("pointerdown", event => event.stopPropagation());

            quick.addEventListener("click", async event => {

                const target = event.target instanceof Element ? event.target : null;
                if (!target) return;

                if (target.closest("[data-q-start]")) {
                    quickNaming = true;
                    renderQuick();
                    return;
                }

                if (target.closest("[data-q-cancel]")) {
                    quickNaming = false;
                    renderQuick();
                    return;
                }

                if (target.closest("[data-q-ok]")) quickSave();
            });

            document.body.appendChild(quick);
            renderQuick();
        }

        if (!quickNaming) {
            const label = quick.querySelector("[data-q-count]");
            if (label) label.textContent = `(${count})`;
        }

        quick.style.display = "";
        quick.style.left = `${Math.max(6, Math.min(rect.left, window.innerWidth - quick.offsetWidth - 6))}px`;
        quick.style.top = `${Math.max(quick.offsetHeight + 4, rect.top - 6)}px`;
    }

    function renderQuick() {

        if (!quick) return;

        if (!quickNaming) {
            quick.innerHTML = `<button type="button" data-q-start title="บันทึกที่เลือกเป็นชุดสำเร็จ">⭐ ${escapeHtml(L("บันทึกเป็นชุด", "Save as set", "セットに保存"))} <span data-q-count></span></button>`;
            return;
        }

        quick.innerHTML = `<input type="text" maxlength="60" data-q-name placeholder="ตั้งชื่อชุด เช่น IEAT EPP Synchronize">
            <button type="button" data-q-ok>⭐ บันทึก</button>
            <button type="button" class="ghost" data-q-cancel title="ยกเลิก">✕</button>`;

        const input = quick.querySelector("[data-q-name]");

        input.addEventListener("keydown", event => {
            event.stopPropagation();
            if (event.key === "Enter") { event.preventDefault(); quickSave(); }
            if (event.key === "Escape") { quickNaming = false; renderQuick(); }
        });

        setTimeout(() => input.focus(), 0);
    }

    async function quickSave() {

        const input = quick && quick.querySelector("[data-q-name]");
        const name = input ? input.value.trim().slice(0, 60) : "";

        if (!name) {
            if (input) { input.focus(); input.style.borderColor = "#d9363e"; }
            return;
        }

        if (await saveSelection(name)) {
            quickNaming = false;
            renderQuick();
            if (panel) renderPanel();
        }
    }

    (function followQuick() {
        try { paintQuick(); } catch (error) { /* ไม่เป็นไร */ }
        requestAnimationFrame(followQuick);
    })();


    /* =====================================================
       TOOLBAR BUTTON + PANEL
    ===================================================== */

    const button = document.createElement("button");
    button.type = "button";
    button.className = "toolbar-control zg-pre-btn";
    button.textContent = "⭐ ชุดสำเร็จ ▾";
    button.title = "ชุดสำเร็จ: เก็บกลุ่ม object ไว้กดวางซ้ำ";

    /* อยู่ข้างปุ่ม 📋 เทมเพลต */
    const anchorButton = document.getElementById("templateBtn") || document.querySelector(".zg-tpl-btn") || document.querySelector(".zg-stk-btn");

    if (anchorButton && anchorButton.parentNode) {
        anchorButton.parentNode.insertBefore(button, anchorButton.nextSibling);
    } else {
        const toolbar = document.querySelector(".toolbar-group--insert, .workspace-toolbar");
        if (toolbar) toolbar.appendChild(button);
    }

    let panel = null;
    let asking = false;

    /* =====================================================
       หน้าต่างลอยด้านข้าง: ดูทั้งชุดก่อนวาง (ชี้การ์ด / ระหว่างลาก)
    ===================================================== */

    let peek = null;
    let peekId = null;
    const bigThumbs = new Map();

    const MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

    function dayLabel(day) {
        const date = new Date(timelineStartDate);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + day);
        return L(`${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear() + 543}`,
            date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
            `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`);
    }

    function rowLabel(top) {
        const unit = rowUnit();
        const index = Math.floor((top + 0.5) / unit);
        const category = (Array.isArray(categories) ? categories : [])[index];
        if (!category) return "";
        const rows = category.rows || [];
        const rowIndex = Math.min(rows.length - 1, Math.floor(((top - index * unit) + 0.5) / (unit / Math.max(1, rows.length))));
        const row = rows[rowIndex];
        const rowText = row && row.text && !/^type\.\.\.$/.test(row.text) ? ` · ${row.text}` : "";
        return `${category.name || ""}${rowText}`;
    }

    function presetSpan(preset) {
        let min = 0, max = 0;
        preset.objects.forEach(item => {
            if (item.dateOff !== undefined) { min = Math.min(min, item.dateOff); max = Math.max(max, item.dateOff); }
            else { min = Math.min(min, item.dayOff); max = Math.max(max, item.dayOff + item.wDays); }
        });
        (preset.images || []).forEach(item => { max = Math.max(max, item.day + item.wDays); });
        return Math.max(1, Math.round(max - min));
    }

    function itemRows(preset) {
        const rows = [];
        const icon = { task: "📦", dateline: "📍", hline: "↔", vline: "│" };
        const kind = {
            task: L("งาน", "Task", "タスク"), dateline: L("เส้นวันที่", "Date line", "日付線"),
            hline: L("ช่วงเวลา", "Span", "期間"), vline: L("เส้นแนวตั้ง", "Vertical line", "縦線")
        };
        preset.objects.forEach(item => {
            const o = item.data;
            const offset = item.dateOff !== undefined ? item.dateOff : item.dayOff;
            const length = item.dateOff === undefined && o.type !== "vline" ? item.wDays : null;
            rows.push({
                icon: icon[o.type] || "•",
                text: String(o.text || "").replace(/\s+/g, " ").trim() || kind[o.type] || o.type,
                meta: L(`วันที่ +${Math.round(offset)}`, `day +${Math.round(offset)}`, `+${Math.round(offset)}日`) +
                    (length ? L(` · ${Math.round(length)} วัน`, ` · ${Math.round(length)} d`, ` · ${Math.round(length)}日間`) : "")
            });
        });
        (preset.images || []).forEach(item => rows.push({ icon: "🖼", text: item.name || L("รูป / รูปแปะ", "Image", "画像"), meta: "" }));
        (preset.texts || []).forEach(item => rows.push({ icon: "🔤", text: String(item.data.text || "").replace(/\s+/g, " ").trim() || L("กล่องข้อความ", "Text box", "テキスト"), meta: "" }));
        return rows;
    }

    async function bigThumb(preset) {
        if (bigThumbs.has(preset.id)) return bigThumbs.get(preset.id);
        let src = preset.thumb || "";
        try { src = await drawThumb(preset, 640, 300); } catch (error) { /* ใช้รูปเล็กแทน */ }
        bigThumbs.set(preset.id, src);
        return src;
    }

    function positionPeek(anchorX, anchorY) {

        if (!peek) return;

        const width = peek.offsetWidth;
        const height = peek.offsetHeight;
        let left;
        let top;

        if (panel && !dragging) {
            const rect = panel.getBoundingClientRect();
            left = rect.right + 10 + width <= window.innerWidth - 6 ? rect.right + 10 : rect.left - 10 - width;
            top = rect.top;
        } else {
            /* ระหว่างลาก: ลอยข้างเมาส์ (ฝั่งที่มีที่ว่าง) */
            /* ป้ายบอกจุดวาง: ลอยเหนือเมาส์ ไม่บังภาพจำลองที่อยู่ขวา-ล่างของเมาส์ */
            left = Math.min(anchorX - 20, window.innerWidth - width - 6);
            top = anchorY - height - 26;
            if (top < 6) top = anchorY + 30;
        }

        peek.style.left = `${Math.max(6, left)}px`;
        peek.style.top = `${Math.max(6, Math.min(top, window.innerHeight - height - 6))}px`;
    }

    /* วาดตัวอย่างให้หน้าตาเหมือนตารางจริง: หัวเดือน/วันที่, แถว, กล่องงาน,
       เส้นวันที่ประสีแดงตัดยาวถึงช่องล่าง, ป้ายวันที่, เส้นช่วงเวลา */
    const imageCache = new Map();

    function cachedImage(src) {
        if (!src) return null;
        if (imageCache.has(src)) return imageCache.get(src);
        const image = new Image();
        image.onload = () => { if (peekState) renderPeekCanvas(); if (ghostState) ghostKey = ""; };
        image.src = src;
        imageCache.set(src, image);
        return image;
    }

    function thaiDate(date) {
        return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear() + 543}`;
    }

    function drawRealPreview(canvas, preset, day, top) {

        const cssW = 560;
        const dpr = 2;
        const perDay = ppd();
        const unit = rowUnit();
        const font = getComputedStyle(document.body).fontFamily || "sans-serif";
        const roleColor = id => ((preset.roles || []).find(role => role.id === id) || (Array.isArray(objectRoles) ? objectRoles : []).find(role => role.id === id) || {}).color;

        /* ช่วงวัน + แถวที่ชุดใช้ */
        let minD = 0, maxD = 1, maxRow = 0.3;
        preset.objects.forEach(item => {
            if (item.dateOff !== undefined) { minD = Math.min(minD, item.dateOff); maxD = Math.max(maxD, item.dateOff + 1); }
            else { minD = Math.min(minD, item.dayOff); maxD = Math.max(maxD, item.dayOff + item.wDays); }
            if (item.rowOff !== undefined) maxRow = Math.max(maxRow, item.rowOff + item.hRows);
        });
        (preset.images || []).forEach(item => { minD = Math.min(minD, item.day); maxD = Math.max(maxD, item.day + item.wDays); maxRow = Math.max(maxRow, item.row + item.hRows); });


        /* แถวจริงของตารางตั้งแต่แถวที่วาง */
        const tops = rowTops();
        const tableTopPx = top;
        const tableBottomPx = Math.max(top + maxRow * unit, ...tops.filter(t => t > top && t <= top + maxRow * unit + 1));
        const endRow = tops.find(t => t >= tableBottomPx - 0.5);
        const tableEnd = endRow !== undefined ? endRow : top + Math.ceil(maxRow * 2) / 2 * unit;

        const bracketH = (typeof bracketContent !== "undefined" && bracketContent && bracketContent.clientHeight) || 90;

        /* สเกลเดียวกันทั้งแนวนอนแนวตั้ง (หน้าตาเหมือนจริง) */
        const spanPx = Math.max(1, maxD - minD) * perDay;
        const tablePx = tableEnd - tableTopPx;
        const headerH = 40;
        const gapH = 22;
        /* เว้นซ้าย-ขวาให้ป้ายวันที่ไม่ล้นขอบ */
        let k = (cssW - 160) / spanPx;
        k = Math.min(k, 260 / Math.max(40, tablePx));
        k = Math.max(k, 0.25);

        const visibleDays = cssW / (perDay * k);
        const startDay = day + minD - (visibleDays - (maxD - minD)) / 2;
        const X = d => (d - startDay) * perDay * k;

        /* แสดงแถวถัดไปเพิ่มให้ตารางสูงอย่างน้อย ~180px เหมือนเห็นบนจอ */
        let shownEnd = tableEnd;
        for (const t of tops) {
            if ((shownEnd - tableTopPx) * k >= 180) break;
            if (t > shownEnd + 0.5) shownEnd = t;
        }
        if ((shownEnd - tableTopPx) * k < 180) {
            const last = tops[tops.length - 1];
            const lastEnd = Math.max(shownEnd, (Array.isArray(categories) ? categories.length : 1) * unit, last);
            shownEnd = Math.min(lastEnd, tableTopPx + 180 / k);
        }

        const tableH = Math.max(tablePx, shownEnd - tableTopPx) * k;
        const bracketHs = Math.min(96, Math.max(70, bracketH * k));
        const cssH = Math.round(headerH + tableH + gapH + bracketHs);

        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;

        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cssW, cssH);

        const tableY = headerH;
        const bracketY = headerH + tableH + gapH;
        const base = new Date(timelineStartDate);
        base.setHours(0, 0, 0, 0);
        const dateAt = d => { const date = new Date(base); date.setDate(date.getDate() + d); return date; };

        /* วันที่ที่มีเส้นวันที่ → ตัวเลขสีแดง */
        const redDays = new Set();
        preset.objects.forEach(item => { if (item.dateOff !== undefined) redDays.add(Math.round(day + item.dateOff)); });

        /* หัวเดือน + วันที่ */
        const dayW = perDay * k;
        const step = dayW >= 15 ? 1 : dayW >= 7 ? 2 : dayW >= 3 ? 5 : 7;
        ctx.textBaseline = "middle";

        for (let d = Math.floor(startDay); X(d) < cssW; d += 1) {
            const date = dateAt(d);
            const x = X(d);
            /* เส้นวันจาง ๆ */
            ctx.strokeStyle = "#eef0ef";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x + 0.5, tableY); ctx.lineTo(x + 0.5, tableY + tableH); ctx.stroke();

            const nextMonthX = X(d + (new Date(date.getFullYear(), date.getMonth() + 1, 1) - date) / 86400000);
            if (date.getDate() === 1 || (d === Math.floor(startDay) && nextMonthX > 80)) {
                if (date.getDate() === 1) {
                    ctx.strokeStyle = "#9aa19e";
                    ctx.beginPath(); ctx.moveTo(x + 0.5, 8); ctx.lineTo(x + 0.5, tableY + tableH); ctx.stroke();
                }
                ctx.fillStyle = "#444";
                ctx.font = `700 12px ${font}`;
                ctx.textAlign = "left";
                ctx.fillText(`${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`, Math.max(4, x + 5), 12);
            }

            const red = redDays.has(d);
            if (red || (date.getDate() - 1) % step === 0) {
                ctx.font = red ? `700 13px ${font}` : `10px ${font}`;
                ctx.fillStyle = red ? "#d33b43" : "#888";
                ctx.textAlign = "center";
                ctx.fillText(String(date.getDate()), x + dayW / 2, 30);
            }
        }

        /* เส้นแถว */
        ctx.strokeStyle = "#777";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, tableY + 0.5); ctx.lineTo(cssW, tableY + 0.5); ctx.stroke();
        tops.filter(t => t > tableTopPx + 0.5 && t <= tableTopPx + tableH / k + 0.5).forEach(t => {
            const ratio = t / unit;
            const isCategory = Math.abs(ratio - Math.round(ratio)) < 0.001;
            ctx.strokeStyle = isCategory ? "#777" : "#c3cac7";
            const y = tableY + (t - tableTopPx) * k;
            ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(cssW, y + 0.5); ctx.stroke();
        });

        /* ช่องล่าง (bracket) */
        ctx.strokeStyle = "#d6dbd8";
        ctx.strokeRect(0.5, bracketY + 0.5, cssW - 1, bracketHs - 1);

        function roundRect(x, y, w, h, radius) {
            const r = Math.max(0, Math.min(radius, w / 2, h / 2));
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        }

        function wrapText(text, maxWidth) {
            const lines = [];
            String(text || "").split(/\n/).forEach(paragraph => {
                let line = "";
                Array.from(paragraph).forEach(ch => {
                    const next = line + ch;
                    if (ctx.measureText(next).width > maxWidth && line) {
                        const cut = line.lastIndexOf(" ");
                        if (cut > 0) { lines.push(line.slice(0, cut)); line = line.slice(cut + 1) + ch; }
                        else { lines.push(line); line = ch; }
                    } else {
                        line = next;
                    }
                });
                lines.push(line);
            });
            return lines;
        }

        /* กล่องงาน */
        preset.objects.forEach(item => {
            const o = item.data;
            if (o.type !== "task") return;
            const x = X(day + item.dayOff), y = tableY + item.rowOff * unit * k;
            const w = Math.max(6, item.wDays * perDay * k), h = Math.max(6, item.hRows * unit * k);
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,.18)";
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 1;
            ctx.fillStyle = o.color || roleColor(o.roleId) || "#f0f0f0";
            roundRect(x, y, w, h, 6);
            ctx.fill();
            ctx.restore();
            ctx.save();
            roundRect(x, y, w, h, 6);
            ctx.clip();
            const size = Math.max(9, Math.min(14, 14 * Math.sqrt(k)));
            ctx.font = `${size}px ${font}`;
            ctx.fillStyle = o.textColorMode === "light" ? "#ffffff" : "#333333";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const label = `${o.iconKey ? o.iconKey + " " : ""}${o.text || ""}`;
            const lines = wrapText(label, w - 10).slice(0, Math.max(1, Math.floor(h / (size * 1.25))));
            lines.forEach((line, index) => ctx.fillText(line, x + w / 2, y + h / 2 + (index - (lines.length - 1) / 2) * size * 1.25));
            ctx.restore();
        });

        /* รูป / รูปแปะ */
        (preset.images || []).forEach(item => {
            const image = cachedImage(item.src);
            if (image && image.complete && image.naturalWidth) {
                ctx.drawImage(image, X(day + item.day), tableY + item.row * unit * k, item.wDays * perDay * k, item.hRows * unit * k);
            }
        });

        /* เส้นแนวนอน (ช่วงเวลา) ในช่องล่าง */
        preset.objects.forEach(item => {
            const o = item.data;
            if (o.type !== "hline") return;
            let x1 = X(day + item.dayOff), x2 = X(day + item.dayOff + item.wDays);
            /* ผูกกับเส้นวันที่ในชุด → ลากระหว่างเส้นวันที่พอดี */
            const anchorX = id => {
                const found = id && preset.objects.find(other => other.data.id === id && other.dateOff !== undefined);
                return found ? X(Math.round(day + found.dateOff)) + dayW / 2 : null;
            };
            const ax1 = anchorX(o.anchorStartId), ax2 = anchorX(o.anchorEndId);
            if (ax1 !== null) x1 = ax1;
            if (ax2 !== null) x2 = ax2;
            const y = bracketY + bracketHs - 46;
            ctx.strokeStyle = o.lineColor || roleColor(o.roleId) || "#d0342c";
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
            if (o.text) {
                ctx.fillStyle = ctx.strokeStyle;
                ctx.font = `${Math.max(9, 11 * Math.sqrt(k))}px ${font}`;
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillText(o.text, (x1 + x2) / 2, y - 3, Math.max(20, x2 - x1));
            }
        });

        /* เส้นวันที่ + ป้าย / เส้นแนวตั้ง */
        preset.objects.forEach(item => {
            const o = item.data;
            if (o.type !== "dateline" && o.type !== "vline") return;
            const d = Math.round(day + item.dateOff);
            const x = X(d) + dayW / 2;
            const color = o.lineColor || (o.type === "vline" ? "#8e44ad" : (roleColor(o.roleId) || "#d0342c"));
            const chipTop = bracketY + bracketHs - 38;

            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, o.type === "dateline" ? chipTop : bracketY + bracketHs); ctx.stroke();
            ctx.restore();

            if (o.type !== "dateline") return;

            const date = dateAt(d);
            ctx.font = `11px ${font}`;
            const title = String(o.text || "").split("\n")[0];
            const chipW = Math.min(170, Math.max(70, ctx.measureText(title).width + 22, 80));
            const chipH = 30;

            /* หัวลูกศร */
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.moveTo(x - 6, chipTop); ctx.lineTo(x + 6, chipTop); ctx.lineTo(x, chipTop - 8); ctx.closePath(); ctx.fill();

            ctx.save();
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 3]);
            roundRect(x - chipW / 2, chipTop, chipW, chipH, 7);
            ctx.fill(); ctx.stroke();
            ctx.restore();

            ctx.fillStyle = "#333";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `11px ${font}`;
            ctx.fillText(title, x, chipTop + 10, chipW - 8);
            ctx.fillStyle = "#666";
            ctx.font = `9px ${font}`;
            ctx.fillText(thaiDate(date), x, chipTop + 22, chipW - 8);
        });

        /* กล่องข้อความ */
        (preset.texts || []).forEach(item => {
            if (item.dayOff === undefined) return;
            const x = X(day + item.dayOff), y = tableY + item.rowOff * unit * k;
            const w = Math.max(30, item.wDays * perDay * k);
            ctx.strokeStyle = "#7ac143";
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            roundRect(x, y, w, 18, 4);
            ctx.stroke();
            ctx.fillStyle = "#1e2924";
            ctx.font = `11px ${font}`;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(String(item.data.text || "").split("\n")[0], x + 4, y + 9, w - 8);
        });
    }

    let peekState = null;

    function renderPeekCanvas() {
        if (!peek || !peekState) return;
        const canvas = peek.querySelector("canvas");
        if (!canvas) return;
        try {
            drawRealPreview(canvas, peekState.preset, peekState.day, peekState.top);
        } catch (error) {
            console.error("[presets.js] preview", error);
        }
    }

    function defaultPlace() {
        const perDay = ppd();
        return {
            day: Math.round((timelineViewport.scrollLeft + Math.min(120, timelineViewport.clientWidth * 0.12)) / perDay),
            top: rowTopAtOrBelow(verticalScrollY)
        };
    }

    async function showPeek(preset, anchorX, anchorY, place) {

        if (!peek) {
            peek = document.createElement("div");
            peek.className = "zg-pre-peek";
            document.body.appendChild(peek);
        }

        if (peekId !== preset.id) {

            peekId = preset.id;

            const rows = itemRows(preset);
            const span = presetSpan(preset);

            peek.innerHTML = `
                <div class="zg-pre-peek-head">
                    <span class="zg-pre-peek-name">⭐ ${escapeHtml(preset.name)}</span>
                    <span class="zg-pre-peek-sub">${escapeHtml(L(`${rows.length} ชิ้น · ยาว ${span} วัน`, `${rows.length} pieces · ${span} days`, `${rows.length} 個 · ${span} 日間`))}${preset.team ? " · ทีม" : ""}</span>
                </div>
                <div class="zg-pre-peek-drop out" data-peek-drop>${escapeHtml(L("ลากไปปล่อยบนตาราง หรือคลิกเพื่อวางตรงช่วงที่เห็น", "Drag onto the table, or click to place in view", "表へドラッグ、またはクリックで配置"))}</div>
                <ul class="zg-pre-peek-list">${rows.slice(0, 8).map(row => `<li><b>${row.icon}</b><span>${escapeHtml(row.text)}</span><em>${escapeHtml(row.meta)}</em></li>`).join("")}
                ${rows.length > 8 ? `<li><b></b><span>${escapeHtml(L(`… อีก ${rows.length - 8} ชิ้น`, `… ${rows.length - 8} more`, `… 他 ${rows.length - 8} 個`))}</span><em></em></li>` : ""}</ul>`;

            peekState = null;
        }

        if (dragging && !place) {
            /* ลากอยู่นอกตาราง → ไม่ต้องแสดงภาพจำลองบนตาราง */
            hideGhost();
            peekState = null;
            peek.classList.toggle("is-drag", true);
            positionPeek(anchorX, anchorY);
            return;
        }

        const where = place || defaultPlace();

        if (!peekState || peekState.preset !== preset || peekState.day !== where.day || peekState.top !== where.top) {
            peekState = { preset, day: where.day, top: where.top };
            showGhost(preset, where.day, where.top);
        }

        peek.classList.toggle("is-drag", Boolean(dragging));
        positionPeek(anchorX, anchorY);
    }

    function setPeekDrop(text, inside) {
        const box = peek && peek.querySelector("[data-peek-drop]");
        if (!box) return;
        box.textContent = text;
        box.classList.toggle("out", !inside);
    }

    /* =====================================================
       ภาพจำลองขนาดจริงบนตาราง: เห็นเลยว่าจะลงช่องไหน แถวไหน
    ===================================================== */

    let ghost = null;
    let ghostState = null;
    let ghostKey = "";
    let ghostLoop = 0;

    function showGhost(preset, day, top) {

        if (!ghost) {
            ghost = document.createElement("canvas");
            ghost.className = "zg-pre-onboard";
            document.body.appendChild(ghost);
        }

        ghostState = { preset, day, top };
        ghostKey = "";

        if (!ghostLoop) {
            const tick = () => {
                if (!ghost) { ghostLoop = 0; return; }
                drawGhost();
                ghostLoop = requestAnimationFrame(tick);
            };
            ghostLoop = requestAnimationFrame(tick);
        }
    }

    function hideGhost() {
        if (ghost) ghost.remove();
        ghost = null;
        ghostState = null;
        if (ghostLoop) cancelAnimationFrame(ghostLoop);
        ghostLoop = 0;
    }

    function drawGhost() {

        if (!ghost || !ghostState) return;

        const { preset, day, top } = ghostState;
        const perDay = ppd();
        const unit = rowUnit();
        const scrollX = timelineViewport.scrollLeft;
        const scrollY = verticalScrollY;

        const key = [day, top, scrollX, scrollY, perDay, unit, window.innerWidth, window.innerHeight].join("|");
        if (key === ghostKey) return;
        ghostKey = key;

        const dpr = window.devicePixelRatio || 1;
        const W = window.innerWidth, H = window.innerHeight;
        if (ghost.width !== Math.round(W * dpr) || ghost.height !== Math.round(H * dpr)) {
            ghost.width = Math.round(W * dpr);
            ghost.height = Math.round(H * dpr);
        }

        const ctx = ghost.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        const vp = viewportRect();
        const headerEl = document.getElementById("timelineHeader");
        const hdr = headerEl ? headerEl.getBoundingClientRect() : { top: vp.top - 40, bottom: vp.top };
        const bracketView = typeof bracketViewport !== "undefined" ? bracketViewport : null;
        const br = bracketView ? bracketView.getBoundingClientRect() : null;
        const brContent = typeof bracketContent !== "undefined" && bracketContent ? bracketContent.getBoundingClientRect() : null;
        const font = getComputedStyle(document.body).fontFamily || "sans-serif";
        const roleColor = id => ((Array.isArray(objectRoles) ? objectRoles : []).find(role => role.id === id) || (preset.roles || []).find(role => role.id === id) || {}).color;

        const SX = d => vp.left + d * perDay - scrollX;
        const SY = y => vp.top + y - scrollY;
        const BX = d => (brContent ? brContent.left : vp.left - scrollX) + d * perDay;

        function roundRect(x, y, w, h, radius) {
            const r = Math.max(0, Math.min(radius, w / 2, h / 2));
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        }

        /* ช่วงวัน / แถวที่ชุดจะใช้ */
        let minD = Infinity, maxD = -Infinity, maxRow = 0;
        preset.objects.forEach(item => {
            if (item.dateOff !== undefined) { minD = Math.min(minD, item.dateOff); maxD = Math.max(maxD, item.dateOff); }
            else { minD = Math.min(minD, item.dayOff); maxD = Math.max(maxD, item.dayOff + item.wDays); }
            if (item.rowOff !== undefined) maxRow = Math.max(maxRow, item.rowOff + item.hRows);
        });
        (preset.images || []).forEach(item => { minD = Math.min(minD, item.day); maxD = Math.max(maxD, item.day + item.wDays); maxRow = Math.max(maxRow, item.row + item.hRows); });
        if (!isFinite(minD)) { minD = 0; maxD = 1; }

        /* แถบไฮไลต์: แถวที่จะลง + ช่วงวันที่จะลง */
        ctx.save();
        ctx.beginPath(); ctx.rect(vp.left, vp.top, vp.width, vp.height); ctx.clip();
        if (maxRow > 0) {
            const tops = rowTops();
            const end = tops.find(t => t >= top + maxRow * unit - 1) ?? (top + maxRow * unit);
            ctx.fillStyle = "rgba(242, 183, 5, .10)";
            ctx.fillRect(vp.left, SY(top), vp.width, Math.max(8, end - top));
        }
        ctx.restore();

        ctx.save();
        ctx.beginPath(); ctx.rect(vp.left, hdr.top, vp.width, Math.max(0, vp.bottom - hdr.top)); ctx.clip();
        ctx.fillStyle = "rgba(242, 183, 5, .10)";
        ctx.fillRect(SX(day + minD), hdr.top, Math.max(4, (maxD - minD) * perDay), vp.bottom - hdr.top);
        ctx.restore();

        /* กล่องงาน + รูป (ขนาดจริง โปร่งใสเล็กน้อย) */
        ctx.save();
        ctx.beginPath(); ctx.rect(vp.left, vp.top, vp.width, vp.height); ctx.clip();
        ctx.globalAlpha = .82;

        preset.objects.forEach(item => {
            const o = item.data;
            if (o.type !== "task") return;
            const x = SX(day + item.dayOff), y = SY(top + item.rowOff * unit);
            const w = Math.max(4, item.wDays * perDay), h = Math.max(6, item.hRows * unit);
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,.25)";
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 3;
            ctx.fillStyle = o.color || roleColor(o.roleId) || "#f0f0f0";
            roundRect(x, y, w, h, 5);
            ctx.fill();
            ctx.restore();
            ctx.save();
            roundRect(x, y, w, h, 5);
            ctx.clip();
            ctx.fillStyle = o.textColorMode === "light" ? "#ffffff" : "#333333";
            ctx.font = `13px ${font}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const words = `${o.iconKey ? o.iconKey + " " : ""}${o.text || ""}`.split(/\s+/);
            const lines = [];
            let line = "";
            words.forEach(word => {
                const next = line ? `${line} ${word}` : word;
                if (ctx.measureText(next).width > w - 12 && line) { lines.push(line); line = word; } else line = next;
            });
            if (line) lines.push(line);
            const show = lines.slice(0, Math.max(1, Math.floor(h / 16)));
            show.forEach((text, index) => ctx.fillText(text, x + w / 2, y + h / 2 + (index - (show.length - 1) / 2) * 16, w - 8));
            ctx.restore();
        });

        (preset.images || []).forEach(item => {
            const image = cachedImage(item.src);
            if (image && image.complete && image.naturalWidth) {
                ctx.drawImage(image, SX(day + item.day), SY(top + item.row * unit), item.wDays * perDay, item.hRows * unit);
            }
        });

        ctx.restore();

        /* เส้นช่วงเวลาในช่องล่าง */
        if (br) {
            ctx.save();
            ctx.beginPath(); ctx.rect(br.left, br.top, br.width, br.height); ctx.clip();
            ctx.globalAlpha = .85;
            preset.objects.forEach(item => {
                const o = item.data;
                if (o.type !== "hline") return;
                const anchorDay = id => {
                    const found = id && preset.objects.find(other => other.data.id === id && other.dateOff !== undefined);
                    return found ? Math.round(day + found.dateOff) : null;
                };
                const a = anchorDay(o.anchorStartId), b = anchorDay(o.anchorEndId);
                const x1 = a !== null ? BX(a) : BX(day + item.dayOff);
                const x2 = b !== null ? BX(b) : BX(day + item.dayOff + item.wDays);
                const y = (brContent ? brContent.top : br.top) + (Number(o.y) || 20);
                ctx.strokeStyle = o.lineColor || roleColor(o.roleId) || "#d0342c";
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
                if (o.text) {
                    ctx.fillStyle = ctx.strokeStyle;
                    ctx.font = `11px ${font}`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "bottom";
                    ctx.fillText(o.text, (x1 + x2) / 2, y - 3, Math.max(20, x2 - x1));
                }
            });
            ctx.restore();
        }

        /* เส้นวันที่ (ประแดงยาวตลอด) + ป้ายวันที่ + ตัวเลขวันสีแดงบนหัวตาราง */
        ctx.save();
        ctx.beginPath(); ctx.rect(vp.left, 0, vp.width, H); ctx.clip();
        preset.objects.forEach(item => {
            const o = item.data;
            if (o.type !== "dateline" && o.type !== "vline") return;
            const d = Math.round(day + item.dateOff);
            const x = SX(d);
            const color = o.lineColor || (o.type === "vline" ? "#8e44ad" : (roleColor(o.roleId) || "#d0342c"));
            const chipTop = (brContent ? brContent.top : vp.bottom + 30) + (Number(o.y) || 30);
            const bottom = o.type === "dateline" ? chipTop : (br ? br.bottom : vp.bottom);

            ctx.save();
            ctx.globalAlpha = .9;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.beginPath(); ctx.moveTo(x, hdr.top + 4); ctx.lineTo(x, bottom); ctx.stroke();
            ctx.restore();

            /* ป้ายวันที่บนหัวตาราง */
            const date = new Date(timelineStartDate);
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() + d);
            const tag = String(date.getDate());
            ctx.font = `700 12px ${font}`;
            const tw = ctx.measureText(tag).width + 10;
            ctx.fillStyle = color;
            roundRect(x - tw / 2, hdr.top + 2, tw, 17, 8);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(tag, x, hdr.top + 10.5);

            if (o.type !== "dateline" || !br) return;

            const chipW = Math.max(24, Number(o.width) || 150);
            const chipH = Math.max(30, Math.min(60, Number(o.height) || 46));
            ctx.save();
            ctx.beginPath(); ctx.rect(br.left, br.top, br.width, br.height); ctx.clip();
            ctx.globalAlpha = .92;
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.moveTo(x - 6, chipTop); ctx.lineTo(x + 6, chipTop); ctx.lineTo(x, chipTop - 8); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 3]);
            roundRect(x - chipW / 2, chipTop, chipW, chipH, 8);
            ctx.fill(); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = "#333";
            ctx.font = `10px ${font}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(o.text || "").split("\n")[0], x, chipTop + chipH / 2 - 6, chipW - 10);
            ctx.fillStyle = "#666";
            ctx.font = `9px ${font}`;
            ctx.fillText(thaiDate(date), x, chipTop + chipH / 2 + 7, chipW - 10);
            ctx.restore();
        });
        ctx.restore();

        /* กล่องข้อความ (ตำแหน่งบนจอเทียบกับจุดเริ่มชุด) */
        const anchorX = SX(day), anchorY = SY(top);
        (preset.texts || []).forEach(item => {
            if (item.dx === undefined) return;
            const x = anchorX + item.dx, y = anchorY + item.dy;
            const w = Math.max(40, Number(item.data.w) || 160);
            ctx.save();
            ctx.globalAlpha = .85;
            ctx.fillStyle = "rgba(255,255,255,.9)";
            ctx.strokeStyle = "#7ac143";
            ctx.lineWidth = 1.5;
            roundRect(x, y, w, 22, 4);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#1e2924";
            ctx.font = `12px ${font}`;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(String(item.data.text || "").split("\n")[0], x + 5, y + 11, w - 10);
            ctx.restore();
        });

        /* กรอบรอบทั้งชุด + ป้ายชื่อ */
        const boxL = SX(day + minD) - 4, boxR = SX(day + maxD) + 4;
        const boxT = maxRow > 0 ? SY(top) - 4 : hdr.top;
        ctx.save();
        ctx.strokeStyle = "#f2b705";
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 5]);
        ctx.strokeRect(boxL, boxT, Math.max(8, boxR - boxL), Math.max(8, (maxRow > 0 ? SY(top + maxRow * unit) + 4 : vp.bottom) - boxT));
        ctx.restore();
    }

    function hidePeek() {
        hideGhost();
        if (peek) peek.remove();
        peek = null;
        peekId = null;
        peekState = null;
    }

    function closePanel() {
        hidePeek();
        if (panel) panel.remove();
        panel = null;
        asking = false;
        button.classList.remove("is-open");
    }

    function positionPanel() {
        if (!panel) return;
        const rect = button.getBoundingClientRect();
        const left = Math.max(6, Math.min(rect.left, window.innerWidth - panel.offsetWidth - 6));
        panel.style.left = `${left}px`;
        panel.style.top = `${rect.bottom + 6}px`;
    }

    function renderPanel() {

        if (!panel) return;

        const list = allPresets();
        const count = selectionCount();

        panel.innerHTML = `
            <div class="zg-pre-head">
                <span class="zg-pre-title">⭐ ชุดสำเร็จ</span>
                <span class="zg-pre-count">${escapeHtml(L(`${list.length} ชุด`, `${list.length} set(s)`, `${list.length} セット`))}</span>
            </div>
            ${asking ? `
            <div class="zg-pre-ask">
                <small>${escapeHtml(L(`ชิ้นที่เลือก ${count} ชิ้น`, `${count} piece(s) selected`, `選択中 ${count} 個`))}</small>
                <input type="text" maxlength="60" data-name placeholder="ตั้งชื่อชุด เช่น IEAT EPP Synchronize">
                <div class="zg-pre-ask-row">
                    <button type="button" data-cancel>ยกเลิก</button>
                    <button type="button" class="ok" data-ok>⭐ บันทึก</button>
                </div>
            </div>` : `
            <button type="button" class="zg-pre-save" data-save ${count ? "" : "disabled"}>${escapeHtml(count
                ? L(`＋ บันทึกที่เลือกเป็นชุด (${count} ชิ้น)`, `＋ Save selection as a set (${count})`, `＋ 選択をセットとして保存 (${count})`)
                : L("ลากคลุม object ในตารางก่อน แล้วกดบันทึก", "Drag a box around objects first, then save", "先に範囲選択してから保存"))}</button>`}
            ${list.length ? `<div class="zg-pre-grid">${list.map(item => `
                <div class="zg-pre-card" data-id="${escapeHtml(item.id)}">
                    ${item.thumb ? `<img src="${escapeHtml(item.thumb)}" alt="">` : `<img alt="">`}
                    ${item.team ? `<span class="zg-pre-team">ทีม</span>` : `<button type="button" class="zg-pre-del" data-del title="ลบชุดนี้">✕</button>`}
                    <div class="zg-pre-name">${escapeHtml(item.name)}</div>
                    <div class="zg-pre-meta">${escapeHtml(L(`${item.objects.length + (item.images || []).length + (item.texts || []).length} ชิ้น`, `${item.objects.length + (item.images || []).length + (item.texts || []).length} pieces`, `${item.objects.length + (item.images || []).length + (item.texts || []).length} 個`))}</div>
                </div>`).join("")}</div>`
                : `<div class="zg-pre-empty">ยังไม่มีชุดสำเร็จ<br>ลากคลุมกล่องงาน เส้น รูป ข้อความ แล้วกดบันทึกด้านบน</div>`}
            <div class="zg-pre-foot">
                <button type="button" data-export title="ดาวน์โหลดชุดของฉันเป็นไฟล์">⬆ Export</button>
                <button type="button" data-import title="เพิ่มชุดจากไฟล์">⬇ Import</button>
            </div>
            <div class="zg-pre-hint">คลิก = วางตรงช่วงที่เห็น · ลากไปวาง = วางตรงวัน / แถวที่ปล่อย<br>วางแล้วลากย้ายได้ทั้งชุด · Alt + คลิก = เลือกชิ้นเดียว</div>`;

        if (asking) {
            const input = panel.querySelector("[data-name]");
            setTimeout(() => input.focus(), 0);
            input.addEventListener("keydown", event => {
                if (event.key === "Enter") { event.preventDefault(); confirmSave(); }
                if (event.key === "Escape") { event.stopPropagation(); asking = false; renderPanel(); }
            });
        }

        positionPanel();
    }

    async function confirmSave() {

        const input = panel && panel.querySelector("[data-name]");
        const name = input ? input.value.trim().slice(0, 60) : "";

        if (!name) {
            if (input) { input.focus(); input.style.borderColor = "#d9363e"; }
            return;
        }

        if (await saveSelection(name)) {
            asking = false;
            renderPanel();
        }
    }

    async function openPanel() {

        closePanel();

        panel = document.createElement("div");
        panel.className = "zg-pre";
        document.body.appendChild(panel);
        button.classList.add("is-open");

        /* กดในแผงไม่ให้ล้างสิ่งที่เลือกไว้ในตาราง */
        panel.addEventListener("pointerdown", event => event.stopPropagation());
        panel.addEventListener("mousedown", event => event.stopPropagation());

        panel.addEventListener("click", event => {

            const target = event.target instanceof Element ? event.target : null;
            if (!target) return;

            if (target.closest("[data-save]")) { asking = true; renderPanel(); return; }
            if (target.closest("[data-cancel]")) { asking = false; renderPanel(); return; }
            if (target.closest("[data-ok]")) { confirmSave(); return; }
            if (target.closest("[data-export]")) { exportLocal(); return; }
            if (target.closest("[data-import]")) { importFile(); return; }

            const del = target.closest("[data-del]");
            if (del) {
                const card = del.closest(".zg-pre-card");
                const preset = findPreset(card.dataset.id);
                if (preset && !preset.team) {
                    saveLocal(localPresets().filter(item => item.id !== preset.id)).then(() => renderPanel());
                    toast(L(`ลบชุด "${preset.name}" แล้ว`, `Deleted "${preset.name}"`, `「${preset.name}」を削除しました`));
                }
            }
        });

        panel.addEventListener("pointerdown", startCardDrag);

        /* ชี้การ์ด → ดูทั้งชุดในหน้าต่างลอยด้านข้าง */
        panel.addEventListener("mouseover", event => {
            if (dragging) return;
            const card = event.target instanceof Element ? event.target.closest(".zg-pre-card") : null;
            if (!card) return;
            const preset = findPreset(card.dataset.id);
            if (preset) showPeek(preset);
        });

        panel.addEventListener("mouseout", event => {
            if (dragging) return;
            const from = event.target instanceof Element ? event.target.closest(".zg-pre-card") : null;
            const to = event.relatedTarget instanceof Element ? event.relatedTarget.closest(".zg-pre-card") : null;
            if (from && from !== to) hidePeek();
        });

        renderPanel();

        await loadLocal();
        if (panel) renderPanel();

        if (!teamLoaded) {
            await loadTeam();
            if (panel) renderPanel();
        }
    }

    button.addEventListener("click", event => {
        event.stopPropagation();
        if (panel) closePanel();
        else openPanel();
    });

    /* เลือกเพิ่ม/ลดในตารางขณะแผงเปิด → อัปเดตปุ่มบันทึก */
    let lastCount = -1;
    setInterval(() => {
        if (!panel || asking) return;
        const count = selectionCount();
        if (count !== lastCount) {
            lastCount = count;
            const save = panel.querySelector("[data-save]");
            if (save) renderPanel();
        }
    }, 400);

    document.addEventListener("mousedown", event => {
        if (!panel || dragging) return;
        const target = event.target instanceof Element ? event.target : null;
        if (target && (target.closest(".zg-pre") || target.closest(".zg-pre-btn"))) return;
        /* คลิกในตาราง (เลือก object เพิ่ม) ไม่ต้องปิด */
        if (target && target.closest("#timelineViewport, #bracketViewport, .object-layer-viewport, .zg-img-layer, .zg-text-box")) return;
        closePanel();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && panel && !asking) closePanel();
    });

    window.addEventListener("resize", positionPanel);


    /* ลากการ์ดไปวางบนตาราง */
    let dragging = null;

    function startCardDrag(event) {

        const card = event.target instanceof Element ? event.target.closest(".zg-pre-card") : null;
        if (!card || event.button !== 0 || event.target.closest("[data-del]")) return;

        const preset = findPreset(card.dataset.id);
        if (!preset) return;

        dragging = { preset, x: event.clientX, y: event.clientY, moved: false, ghost: null, drop: null };

        const move = moveEvent => {

            if (!dragging) return;

            const dx = moveEvent.clientX - dragging.x;
            const dy = moveEvent.clientY - dragging.y;

            if (!dragging.moved && Math.hypot(dx, dy) < 6) return;

            if (!dragging.moved) {
                dragging.moved = true;
                document.body.classList.add("zg-pre-dragging");
                dragging.ghost = document.createElement("img");
                dragging.ghost.className = "zg-pre-ghost";
                dragging.ghost.src = preset.thumb || "";
                dragging.ghost.style.display = "none";
                document.body.appendChild(dragging.ghost);
                dragging.drop = document.createElement("div");
                dragging.drop.className = "zg-pre-drop";
                document.body.appendChild(dragging.drop);
                if (panel) panel.style.opacity = ".35";
                peekId = null;
            }

            dragging.ghost.style.left = `${moveEvent.clientX}px`;
            dragging.ghost.style.top = `${moveEvent.clientY}px`;

            const target = dropTarget(moveEvent.clientX, moveEvent.clientY);

            showPeek(preset, moveEvent.clientX, moveEvent.clientY, target ? { day: target.day, top: target.top } : null);
            setPeekDrop(target
                ? L(`ปล่อยเพื่อวาง: เริ่ม ${dayLabel(target.day)}`, `Drop to place: starts ${dayLabel(target.day)}`, `離して配置：開始 ${dayLabel(target.day)}`) + (rowLabel(target.top) ? ` · ${rowLabel(target.top)}` : "")
                : L("ลากไปปล่อยบนตาราง", "Drag onto the table", "表の上へドラッグ"), Boolean(target));

            if (target) {
                const rows = rowTops();
                const index = rows.indexOf(target.top);
                const next = index >= 0 && rows[index + 1] !== undefined ? rows[index + 1] : target.top + rowUnit() / 2;
                dragging.drop.style.display = "";
                dragging.drop.style.left = `${target.rect.left + target.day * ppd() - timelineViewport.scrollLeft}px`;
                dragging.drop.style.top = `${target.rect.top + target.top - verticalScrollY}px`;
                dragging.drop.style.width = "4px";
                dragging.drop.style.height = `${Math.max(16, next - target.top)}px`;
            } else {
                dragging.drop.style.display = "none";
            }
        };

        const up = upEvent => {

            window.removeEventListener("pointermove", move, true);
            window.removeEventListener("pointerup", up, true);

            const state = dragging;
            dragging = null;

            document.body.classList.remove("zg-pre-dragging");
            if (state && state.ghost) state.ghost.remove();
            if (state && state.drop) state.drop.remove();
            if (panel) panel.style.opacity = "";
            hidePeek();

            if (!state) return;

            if (!state.moved) {
                placeInView(state.preset);
                return;
            }

            const target = dropTarget(upEvent.clientX, upEvent.clientY);

            if (target) placePreset(state.preset, target.day, target.top);
            else toast(L("ปล่อยบนตารางเพื่อวางชุด", "Drop onto the table to place the set", "表の上で離すと配置されます"));
        };

        window.addEventListener("pointermove", move, true);
        window.addEventListener("pointerup", up, true);
    }


    /* =====================================================
       6) Export / Import ชุดของฉัน
    ===================================================== */

    function exportLocal() {

        const list = localPresets();

        if (!list.length) {
            toast(L("ยังไม่มีชุดของฉันให้ Export", "No sets of your own to export", "エクスポートするセットがありません"), true);
            return;
        }

        const blob = new Blob([JSON.stringify({ type: FILE_TYPE, version: 1, exportedAt: new Date().toISOString(), presets: list }, null, 1)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ชุดสำเร็จ_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 3000);

        toast(L(`Export ${list.length} ชุดแล้ว`, `Exported ${list.length} set(s)`, `${list.length} セットをエクスポートしました`));
    }

    function importFile() {

        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";

        input.addEventListener("change", () => {

            const file = input.files && input.files[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = async () => {

                await loadLocal();

                let incoming = [];

                try {
                    incoming = toPresetList(JSON.parse(String(reader.result)));
                } catch (error) {
                    incoming = [];
                }

                if (!incoming.length) {
                    toast(L("ไฟล์นี้ไม่ใช่ไฟล์ชุดสำเร็จ", "This is not a preset file", "セットのファイルではありません"), true);
                    return;
                }

                const list = localPresets();
                let added = 0;

                incoming.forEach(item => {
                    if (list.some(existing => existing.id === item.id)) return;
                    list.push({ ...item, team: false });
                    added += 1;
                });

                if (!(await saveLocal(list))) return;
                renderPanel();

                toast(L(`เพิ่ม ${added} ชุดแล้ว`, `Added ${added} set(s)`, `${added} セット追加しました`));
            };

            reader.readAsText(file);
        });

        input.click();
    }


    window.ZGPresets = {
        list: allPresets,
        place: (id, day, top) => {
            const preset = findPreset(id);
            if (preset) placePreset(preset, day, top === undefined ? rowTopAtOrBelow(verticalScrollY) : top);
        },
        placeInView: id => {
            const preset = findPreset(id);
            if (preset) placeInView(preset);
        },
        saveSelection,
        selectGroup,
        ungroup,
        open: openPanel
    };

})();
