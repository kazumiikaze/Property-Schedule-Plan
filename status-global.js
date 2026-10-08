"use strict";

/* =========================================================
   STATUS-GLOBAL.JS — "สถานะ" (บทบาท) ใช้ร่วมกันทุกแผน
   เดิม: สถานะเก็บแยกในแต่ละแผน → เพิ่มในแผน A แล้วแผน B ไม่มี
   ใหม่: มีชุดสถานะกลาง 1 ชุด (เก็บในเบราว์เซอร์)
     - เพิ่ม / เปลี่ยนชื่อ / เปลี่ยนสี / ลบ ในหน้า "จัดการสถานะ"
       → มีผลกับทุกแผนทันที (แผนอื่นจะอัปเดตตอนเปิด)
     - เปิดแผน / Import / เทมเพลต ที่มีสถานะชื่อเดียวกัน
       → ใช้สถานะกลางตัวเดียวกัน (ไม่ซ้ำ)
     - แผนที่มีสถานะที่ยังไม่อยู่ในชุดกลาง → เพิ่มเข้าชุดกลางให้
     - สถานะที่ถูกลบแล้ว → object ในแผนอื่นย้ายไปใช้สถานะแรกแทน

   ไม่แก้ app.js — โหลดหลัง io.js และ plans.js (ก่อน lang.js)
========================================================= */

(function () {

    if (!window.ZGPlanIO || typeof window.ZGPlanIO.apply !== "function" || typeof objectRoles === "undefined") {

        console.error("[status-global.js] ไม่พบ io.js / app.js");

        return;
    }

    const STORE_KEY = "zg-global-statuses-v1";


    /* =====================================================
       STORAGE  { statuses: [{id, name, color}], deleted: [id] }
    ===================================================== */

    function load() {

        try {

            const data = JSON.parse(localStorage.getItem(STORE_KEY) || "null");

            if (data && Array.isArray(data.statuses) && data.statuses.length) {

                return {
                    statuses: data.statuses.filter(item => item && item.id),
                    deleted: Array.isArray(data.deleted) ? data.deleted : []
                };
            }

        } catch (error) { /* ignore */ }

        return null;
    }

    function save(data) {

        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error("[status-global.js]", error);
        }
    }

    function normalize(name) {
        return String(name || "").trim().toLowerCase();
    }

    function cloneRoles(list) {
        return list.map(role => ({ id: role.id, name: role.name, color: role.color }));
    }


    /* =====================================================
       RECONCILE — ทำให้แผนที่เปิดอยู่ใช้ชุดสถานะกลาง
    ===================================================== */

    let reconciling = false;

    function reconcile() {

        if (reconciling) return;

        reconciling = true;

        try {

            let global = load();

            /* ครั้งแรก → ใช้สถานะของแผนที่เปิดอยู่เป็นชุดกลาง */
            if (!global) {

                save({ statuses: cloneRoles(objectRoles), deleted: [] });

                return;
            }

            const byId = new Map(global.statuses.map(item => [item.id, item]));
            const byName = new Map(global.statuses.map(item => [normalize(item.name), item]));

            const remap = {};

            let globalChanged = false;

            objectRoles.forEach(role => {

                if (byId.has(role.id)) return;

                if (global.deleted.includes(role.id)) {

                    remap[role.id] = global.statuses[0] && global.statuses[0].id;

                    return;
                }

                const sameName = byName.get(normalize(role.name));

                if (sameName) {

                    remap[role.id] = sameName.id;

                    return;
                }

                /* สถานะใหม่ที่มากับแผนนี้ → เพิ่มเข้าชุดกลาง */
                const entry = { id: role.id, name: role.name, color: role.color };

                global.statuses.push(entry);
                byId.set(entry.id, entry);
                byName.set(normalize(entry.name), entry);

                globalChanged = true;
            });

            if (globalChanged) save(global);

            const next = cloneRoles(global.statuses);

            const rolesChanged =
                JSON.stringify(next) !== JSON.stringify(cloneRoles(objectRoles));

            let objectsChanged = false;

            timelineObjects.forEach(object => {

                if (object.roleId && remap[object.roleId]) {
                    object.roleId = remap[object.roleId];
                    objectsChanged = true;
                }
            });

            if (rolesChanged) {
                objectRoles = next;
            }

            if (rolesChanged || objectsChanged) {

                renderObjects();

                refreshManagerIfOpen();
            }

        } finally {

            reconciling = false;
        }
    }


    /* =====================================================
       SYNC — แก้ในหน้า "จัดการสถานะ" → บันทึกลงชุดกลาง
    ===================================================== */

    function syncFromCurrent() {

        const global = load() || { statuses: [], deleted: [] };

        const currentIds = new Set(objectRoles.map(role => role.id));

        const removed = global.statuses
            .map(item => item.id)
            .filter(id => !currentIds.has(id));

        const deleted = Array.from(new Set([...global.deleted, ...removed]))
            .filter(id => !currentIds.has(id))
            .slice(-200);

        save({ statuses: cloneRoles(objectRoles), deleted });
    }

    let syncTimer = null;

    function scheduleSync() {

        clearTimeout(syncTimer);

        syncTimer = setTimeout(syncFromCurrent, 150);
    }


    const panel = document.getElementById("roleManagerPanel");

    if (panel) {

        /* ทำงานหลัง handler ของ app.js (bubble) */
        panel.addEventListener("input", scheduleSync);
        panel.addEventListener("change", scheduleSync);
        panel.addEventListener("click", scheduleSync);


        /* หมายเหตุในหน้าจัดการสถานะ */
        const note = document.createElement("div");

        note.className = "zg-status-global-note";
        note.textContent = "สถานะใช้ร่วมกันทุกแผน — เพิ่ม/แก้ที่นี่ แผนอื่นจะได้ด้วย";

        const list = document.getElementById("roleManagerList");

        if (list && list.parentNode) {
            list.parentNode.insertBefore(note, list);
        } else {
            panel.appendChild(note);
        }

        const style = document.createElement("style");

        style.textContent = `
.zg-status-global-note {
    margin: 0 0 8px;
    padding: 6px 10px;
    border-radius: 8px;
    background: #eef6f0;
    color: #2f7442;
    font-size: 11px;
    line-height: 1.4;
}
body.zg-dark .zg-status-global-note { background: #26372d; color: #9fd3ad; }
`;

        document.head.appendChild(style);
    }

    function refreshManagerIfOpen() {

        if (panel && panel.classList.contains("open") && typeof renderRoleManagerList === "function") {
            renderRoleManagerList();
        }
    }


    /* =====================================================
       HOOK — ทุกครั้งที่โหลดแผน (เปิดแผน, สลับแผน, Import, เทมเพลต)
    ===================================================== */

    const originalApply = window.ZGPlanIO.apply;

    window.ZGPlanIO.apply = function () {

        const result = originalApply.apply(this, arguments);

        try {
            reconcile();
        } catch (error) {
            console.error("[status-global.js]", error);
        }

        return result;
    };


    /* เปิดเว็บครั้งแรก (ยังไม่มีแผนให้โหลด) → ตั้งชุดกลางจากหน้าปัจจุบัน */
    setTimeout(reconcile, 1500);


    window.ZGStatusGlobal = {
        list: () => (load() || { statuses: [] }).statuses,
        reconcile,
        sync: syncFromCurrent
    };

})();
