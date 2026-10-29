/* =========================================================
   plan-backup.js — สำรองแผนอัตโนมัติ + กู้คืน

   - เก็บสำเนาแผนทั้งหมดใน IndexedDB (ไม่กินพื้นที่ localStorage ที่แผนใช้อยู่)
       · "ตอนเปิดหน้า"  จับทันทีที่โหลดไฟล์ ก่อน plans.js เริ่ม → กันกรณีข้อมูลถูกทับตอนเปิด (เก็บ 5 ครั้งล่าสุด)
       · "รายวัน"      สถานะล่าสุดของแต่ละวัน (เก็บ 7 วันล่าสุด)
   - ปุ่ม "กู้คืนจากสำรอง" ในเมนูแผน → เลือกชุดสำรอง → กู้แผนกลับมาเป็นแผนใหม่ (ไม่ทับแผนที่มีอยู่)
   - ขอให้เบราว์เซอร์เก็บข้อมูลถาวร (navigator.storage.persist)
   - เตือนเมื่อดูเหมือนเปิดในหน้าต่างส่วนตัว (Incognito) — ปิดหน้าต่างแล้วข้อมูลหาย

   ต้องโหลดก่อน plans.js
========================================================= */

(function () {

    "use strict";

    const PLANS_KEY = "zg-property-schedule-plans-v1";
    const DB_NAME = "zg-plan-backups";
    const STORE = "snapshots";
    const KEEP_DAYS = 7;
    const KEEP_OPENS = 5;
    const DAILY_EVERY_MS = 5 * 60 * 1000;
    const INCOGNITO_QUOTA = 120 * 1024 * 1024;     // Chrome/Edge โหมดส่วนตัวให้พื้นที่ราว 100 MB
    const WARN_DISMISS_KEY = "zg-incognito-warn-off";

    /* จับข้อมูลทันที (ก่อน plans.js อ่าน/เขียน) */
    let rawAtLoad = null;
    try { rawAtLoad = localStorage.getItem(PLANS_KEY); } catch (error) { /* ปิด storage ไว้ */ }

    let lastDailyRaw = null;


    /* =====================================================
       IndexedDB
    ===================================================== */

    let dbPromise = null;

    function db() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) { reject(new Error("NO_IDB")); return; }
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        return dbPromise;
    }

    function tx(mode, work) {
        return db().then(database => new Promise((resolve, reject) => {
            const t = database.transaction(STORE, mode);
            const result = work(t.objectStore(STORE));
            t.oncomplete = () => resolve(result && "result" in result ? result.result : undefined);
            t.onerror = () => reject(t.error);
            t.onabort = () => reject(t.error);
        }));
    }

    const getAll = () => tx("readonly", s => s.getAll());
    const put = record => tx("readwrite", s => { s.put(record); });
    const remove = ids => tx("readwrite", s => { ids.forEach(id => s.delete(id)); });


    /* =====================================================
       ทำสำรอง
    ===================================================== */

    function summarize(raw) {
        try {
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.plans) || !parsed.plans.length) return null;
            return parsed.plans.map(plan => ({ name: String(plan.name || ""), updatedAt: plan.updatedAt || "" }));
        } catch (error) {
            return null;
        }
    }

    function today() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    function record(kind, id, raw, plans) {
        return { id, kind, at: new Date().toISOString(), day: today(), raw, plans, bytes: raw.length };
    }

    async function prune() {
        const all = await getAll();
        const days = all.filter(r => r.kind === "day").sort((a, b) => b.day.localeCompare(a.day));
        const opens = all.filter(r => r.kind === "open").sort((a, b) => b.at.localeCompare(a.at));
        const drop = days.slice(KEEP_DAYS).concat(opens.slice(KEEP_OPENS)).map(r => r.id);
        if (drop.length) await remove(drop);
    }

    async function snapshotOpen() {
        if (!rawAtLoad) return;
        const plans = summarize(rawAtLoad);
        /* อ่านไม่ได้ก็เก็บไว้ (เผื่อกู้ด้วยมือ) */
        await put(record("open", "open-" + Date.now(), rawAtLoad, plans || []));
    }

    async function snapshotDaily(raw) {
        if (!raw || raw === lastDailyRaw) return;
        const plans = summarize(raw);
        if (!plans) return;
        await put(record("day", "day-" + today(), raw, plans));
        lastDailyRaw = raw;
    }

    function currentRaw() {
        try { return localStorage.getItem(PLANS_KEY); } catch (error) { return null; }
    }

    function dailyNow() {
        snapshotDaily(currentRaw()).catch(() => {});
    }

    /* =====================================================
       กู้คืน
    ===================================================== */

    const style = document.createElement("style");
    style.textContent = `
.zg-bk-overlay { position: fixed; inset: 0; z-index: 30000; background: rgba(20, 28, 24, .42); display: grid; place-items: center; padding: 16px; }
.zg-bk { width: min(640px, 100%); max-height: min(80vh, 720px); display: flex; flex-direction: column; background: #fff; border-radius: 14px;
    box-shadow: 0 24px 60px -18px rgba(20, 28, 24, .45); font: 13px/1.45 "Segoe UI", Tahoma, sans-serif; color: #26302b; overflow: hidden; }
.zg-bk__head { padding: 16px 18px 12px; border-bottom: 1px solid #e3ebe6; }
.zg-bk__head b { font-size: 15px; }
.zg-bk__head p { margin: 4px 0 0; color: #66736c; font-size: 12px; }
.zg-bk__body { overflow: auto; padding: 8px 10px; }
.zg-bk__set { border: 1px solid #e3ebe6; border-radius: 10px; margin: 6px 0; }
.zg-bk__set > summary { list-style: none; cursor: pointer; padding: 10px 12px; display: flex; gap: 10px; align-items: center; }
.zg-bk__set > summary::-webkit-details-marker { display: none; }
.zg-bk__set > summary::before { content: "›"; font-size: 16px; color: #8a978f; transition: transform .15s; }
.zg-bk__set[open] > summary::before { transform: rotate(90deg); }
.zg-bk__kind { font-size: 11px; padding: 1px 7px; border-radius: 99px; background: #e8f3ec; color: #2e8b57; font-weight: 600; flex: none; }
.zg-bk__kind--open { background: #eef0f7; color: #4b5a8a; }
.zg-bk__when { font-weight: 600; }
.zg-bk__meta { margin-left: auto; color: #8a978f; font-size: 12px; white-space: nowrap; }
.zg-bk__plans { border-top: 1px solid #eef3f0; padding: 4px 12px 10px; }
.zg-bk__plan { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px dashed #eef3f0; }
.zg-bk__plan:last-child { border-bottom: 0; }
.zg-bk__plan span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.zg-bk__plan small { color: #8a978f; white-space: nowrap; }
.zg-bk button { font: inherit; border-radius: 8px; border: 1px solid #cfdcd4; background: #fff; padding: 4px 10px; cursor: pointer; color: #26302b; }
.zg-bk button:hover { background: #f2f7f4; }
.zg-bk button.is-primary { background: #2e8b57; border-color: #2e8b57; color: #fff; }
.zg-bk button.is-primary:hover { background: #267549; }
.zg-bk button:disabled { opacity: .55; cursor: default; }
.zg-bk__empty { padding: 26px 12px; text-align: center; color: #66736c; }
.zg-bk__foot { padding: 10px 18px 14px; border-top: 1px solid #e3ebe6; display: flex; justify-content: flex-end; gap: 8px; }
.zg-plan-dropdown-restore { flex-basis: 100%; }
.zg-incog { position: fixed; z-index: 29000; left: 50%; top: 10px; transform: translateX(-50%); max-width: min(720px, calc(100vw - 24px));
    display: flex; gap: 10px; align-items: center; padding: 9px 10px 9px 14px; border-radius: 10px; background: #fff7e6; border: 1px solid #f2c46b;
    box-shadow: 0 8px 22px -10px rgba(120, 80, 0, .35); font: 13px/1.4 "Segoe UI", Tahoma, sans-serif; color: #5a3d00; }
.zg-incog button { font: inherit; border: 1px solid #e3b14f; background: #fff; border-radius: 7px; padding: 3px 9px; cursor: pointer; color: #5a3d00; white-space: nowrap; }
body.zg-print-capture .zg-incog, body.zg-print-capture .zg-bk-overlay { display: none !important; }
@media print { .zg-incog, .zg-bk-overlay { display: none !important; } }
`;
    document.head.appendChild(style);

    function esc(text) {
        return String(text == null ? "" : text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
    }

    function when(iso) {
        const d = new Date(iso);
        if (isNaN(d)) return "-";
        return d.toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    function sizeText(bytes) {
        return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";
    }

    function download(name, text) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }

    async function openRestore() {

        dailyNow();
        document.querySelectorAll(".zg-plan-dropdown").forEach(el => el.remove());

        const overlay = document.createElement("div");
        overlay.className = "zg-bk-overlay";
        overlay.innerHTML = `<div class="zg-bk" role="dialog" aria-modal="true" aria-label="กู้คืนแผนจากสำรอง">
            <div class="zg-bk__head"><b>กู้คืนแผนจากสำรอง</b>
            <p>ระบบสำรองแผนทั้งหมดในเครื่องนี้ให้อัตโนมัติ (รายวัน 7 วัน + ตอนเปิดหน้า 5 ครั้งล่าสุด) · แผนที่กู้จะถูกเพิ่มเป็นแผนใหม่ ไม่ทับแผนที่มีอยู่</p></div>
            <div class="zg-bk__body"><div class="zg-bk__empty">กำลังโหลด…</div></div>
            <div class="zg-bk__foot"><button type="button" data-act="close">ปิด</button></div></div>`;
        document.body.appendChild(overlay);

        const close = () => { overlay.remove(); document.removeEventListener("keydown", onKey, true); };
        const onKey = event => { if (event.key === "Escape") { event.stopPropagation(); close(); } };
        document.addEventListener("keydown", onKey, true);
        overlay.addEventListener("click", event => { if (event.target === overlay || event.target.closest("[data-act=close]")) close(); });

        const body = overlay.querySelector(".zg-bk__body");
        let sets = [];
        try {
            sets = (await getAll()).sort((a, b) => b.at.localeCompare(a.at));
        } catch (error) {
            body.innerHTML = `<div class="zg-bk__empty">เบราว์เซอร์นี้ไม่ให้เก็บสำรอง (IndexedDB ถูกปิด)</div>`;
            return;
        }
        if (!sets.length) {
            body.innerHTML = `<div class="zg-bk__empty">ยังไม่มีชุดสำรอง — ระบบจะเริ่มเก็บให้อัตโนมัติจากนี้</div>`;
            return;
        }

        body.innerHTML = sets.map((set, i) => `
            <details class="zg-bk__set"${i === 0 ? " open" : ""} data-id="${esc(set.id)}">
              <summary><span class="zg-bk__kind${set.kind === "open" ? " zg-bk__kind--open" : ""}">${set.kind === "open" ? "ตอนเปิดหน้า" : "รายวัน"}</span>
                <span class="zg-bk__when">${esc(when(set.at))}</span>
                <span class="zg-bk__meta">${set.plans.length} แผน · ${sizeText(set.bytes)}</span></summary>
              <div class="zg-bk__plans">
                ${set.plans.length ? set.plans.map((plan, p) => `
                  <div class="zg-bk__plan"><span title="${esc(plan.name)}">${esc(plan.name || "(ไม่มีชื่อ)")}</span>
                    <small>แก้ล่าสุด ${esc(when(plan.updatedAt))}</small>
                    <button type="button" class="is-primary" data-restore="${p}">กู้แผนนี้</button></div>`).join("")
                  : `<div class="zg-bk__empty">ข้อมูลชุดนี้อ่านไม่ได้ — ดาวน์โหลดเก็บไว้แล้วส่งให้ผู้ดูแลช่วยกู้</div>`}
                <div class="zg-bk__plan"><span></span><button type="button" data-download>ดาวน์โหลดชุดนี้ (.json)</button></div>
              </div>
            </details>`).join("");

        body.addEventListener("click", event => {
            const box = event.target.closest(".zg-bk__set");
            if (!box) return;
            const set = sets.find(s => s.id === box.dataset.id);
            if (!set) return;

            if (event.target.closest("[data-download]")) {
                download(`plans-backup-${set.id}.json`, set.raw);
                return;
            }

            const btn = event.target.closest("[data-restore]");
            if (!btn) return;
            let plan;
            try { plan = JSON.parse(set.raw).plans[Number(btn.dataset.restore)]; } catch (error) { plan = null; }
            if (!plan || !plan.data || !window.ZGPlans || typeof window.ZGPlans.createFromData !== "function") {
                btn.textContent = "กู้ไม่ได้";
                btn.disabled = true;
                return;
            }
            const d = new Date(set.at);
            const tag = isNaN(d) ? "" : ` (กู้คืน ${d.getDate()}/${d.getMonth() + 1})`;
            close();
            window.ZGPlans.createFromData((plan.name || "แผน") + tag, JSON.parse(JSON.stringify(plan.data)), "กู้คืนแผนจากสำรองแล้ว");
        });
    }

    /* ปุ่มในเมนูแผน (เมนูสร้างใหม่ทุกครั้งที่เปิด) */
    new MutationObserver(() => {
        const foot = document.querySelector(".zg-plan-dropdown .zg-plan-dropdown-footer");
        if (!foot || foot.querySelector(".zg-plan-dropdown-restore")) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "zg-plan-dropdown-import zg-plan-dropdown-restore";
        button.title = "กู้แผนจากสำเนาสำรองอัตโนมัติ (7 วันล่าสุด)";
        button.textContent = "⟲ กู้คืนจากสำรอง";
        button.addEventListener("click", event => { event.stopPropagation(); openRestore(); });
        foot.appendChild(button);
    }).observe(document.documentElement, { childList: true, subtree: true });


    /* =====================================================
       เก็บถาวร + เตือนโหมดส่วนตัว
    ===================================================== */

    function warnIncognito() {
        try { if (sessionStorage.getItem(WARN_DISMISS_KEY)) return; } catch (error) { /* ไม่เป็นไร */ }
        const bar = document.createElement("div");
        bar.className = "zg-incog";
        bar.setAttribute("role", "alert");
        bar.innerHTML = `<span>⚠ ดูเหมือนเปิดในหน้าต่างส่วนตัว (Incognito / InPrivate) — <b>ปิดหน้าต่างแล้วข้อมูลแผนจะหายทั้งหมด</b> ควรเปิดในหน้าต่างปกติ หรือ Export เก็บไว้</span><button type="button">รับทราบ</button>`;
        bar.querySelector("button").addEventListener("click", () => {
            bar.remove();
            try { sessionStorage.setItem(WARN_DISMISS_KEY, "1"); } catch (error) { /* ไม่เป็นไร */ }
        });
        document.body.appendChild(bar);
    }

    async function checkStorage() {
        const s = navigator.storage;
        if (!s) return;
        try { if (s.persist && !(await s.persisted())) await s.persist(); } catch (error) { /* ไม่เป็นไร */ }
        try {
            if (s.estimate) {
                const { quota } = await s.estimate();
                if (quota && quota < INCOGNITO_QUOTA) warnIncognito();
            }
        } catch (error) { /* ไม่เป็นไร */ }
    }


    /* =====================================================
       START
    ===================================================== */

    snapshotOpen().then(prune).catch(() => {});

    function start() {
        checkStorage();
        setTimeout(dailyNow, 15000);                 // หลังแผนเปิดเสร็จ
        setInterval(dailyNow, DAILY_EVERY_MS);
        document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") dailyNow(); });
        window.addEventListener("pagehide", dailyNow);
        setInterval(() => prune().catch(() => {}), 60 * 60 * 1000);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();

    window.ZGPlanBackup = { open: openRestore, list: () => getAll(), snapshotNow: dailyNow, rawAtLoad: () => rawAtLoad };
})();
