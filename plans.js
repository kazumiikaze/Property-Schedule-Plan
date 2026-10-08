"use strict";

/* =========================================================
   PLANS.JS — จัดการหลายแผน (เลือก / เพิ่ม / เปลี่ยนชื่อ / ลบ)
   เก็บไว้ในเบราว์เซอร์ (localStorage) และสลับไปมาได้

   โหลดหลัง io.js (ใช้ window.ZGPlanIO.build / apply)
   ไม่แก้โค้ดเดิมใน app.js

   ปุ่มใน index.html (กลุ่ม toolbar-group--plan):
     #planSelectBtn  เลือกแผน (มี span.plan-select-name แสดงชื่อ)
     #planAddBtn     เพิ่มแผน
     #planRenameBtn  เปลี่ยนชื่อแผน
     #planDeleteBtn  ลบแผน

   บันทึกอัตโนมัติ: ทุก 3 วินาทีถ้ามีอะไรเปลี่ยน, ตอนสลับแผน,
   และตอนปิด/ออกจากหน้า
========================================================= */

(function () {

    const selectBtn = document.getElementById("planSelectBtn");
    const addBtn = document.getElementById("planAddBtn");
    const renameBtn = document.getElementById("planRenameBtn");
    const deleteBtn = document.getElementById("planDeleteBtn");

    if (!selectBtn || !addBtn || !renameBtn || !deleteBtn) {

        console.error(
            "[plans.js] ไม่พบปุ่ม #planSelectBtn / #planAddBtn / #planRenameBtn / #planDeleteBtn ใน index.html"
        );

        return;
    }

    const nameEl =
        selectBtn.querySelector(".plan-select-name") ||
        selectBtn.querySelector("span");


    /* =====================================================
       CONFIG
    ===================================================== */

    const STORAGE_KEY = "zg-property-schedule-plans-v1";

    const AUTOSAVE_MS = 3000;

    const DEFAULT_FIRST_NAME = "แผนตัวอย่าง (Property)";

    const NAME_MAX = 60;


    /* =====================================================
       STYLE
    ===================================================== */

    const style =
        document.createElement("style");

    style.textContent = `
.zg-plan-dropdown {
    position: fixed;
    width: 300px;
    max-width: calc(100vw - 12px);
    display: flex;
    flex-direction: column;
    padding: 6px;
    box-sizing: border-box;
    background: #ffffff;
    border: 1px solid #d5dad7;
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, .16);
    z-index: 26000;
    font-size: 12px;
}
.zg-plan-search {
    position: relative;
    margin: 0 0 6px;
}
.zg-plan-search-icon {
    position: absolute;
    left: 9px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 11px;
    opacity: .6;
    pointer-events: none;
}
.zg-plan-search-input {
    width: 100%;
    height: 30px;
    box-sizing: border-box;
    padding: 0 28px 0 28px;
    border: 1px solid #dde3e0;
    border-radius: 7px;
    background: #f7f9f8;
    font-family: inherit;
    font-size: 12px;
    color: inherit;
    outline: none;
}
.zg-plan-search-input:focus { border-color: #8cc79c; background: #ffffff; }
.zg-plan-search-clear {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: #8a938d;
    cursor: pointer;
    display: none;
}
.zg-plan-search.has-text .zg-plan-search-clear { display: block; }
.zg-plan-search-clear:hover { background: #eef1ef; }
.zg-plan-list {
    /* แสดงสูงสุด 5 แผน เกินนี้เลื่อนดู */
    max-height: calc(5 * 48px);
    overflow-y: auto;
    overscroll-behavior: contain;
}
.zg-plan-list .zg-plan-item { min-height: 46px; }
.zg-plan-row {
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 2px;
    border-radius: 6px;
}
.zg-plan-row[hidden] { display: none; }
.zg-plan-row .zg-plan-item { flex: 1; min-width: 0; padding-right: 40px; }
.zg-plan-row-delete {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    height: 28px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: #8a938d;
    font-size: 13px;
    cursor: pointer;
    opacity: 0;
    transition: opacity .12s ease;
}
.zg-plan-row:hover .zg-plan-row-delete,
.zg-plan-row-delete:focus-visible { opacity: 1; }
.zg-plan-row-delete:hover { background: #fdecea; border-color: #f2c3bf; color: #c0392b; }
@media (hover: none) { .zg-plan-row-delete { opacity: .75; } }
body.zg-dark .zg-plan-row-delete:hover { background: #3a2624; border-color: #6b3b37; }
.zg-plan-empty {
    padding: 14px 10px;
    color: #8a938d;
    text-align: center;
}
.zg-plan-count {
    padding: 2px 10px 0;
    color: #8a938d;
    font-size: 10px;
}
.zg-plan-dropdown-footer {
    display: flex;
    gap: 4px;
}
.zg-plan-dropdown-footer .zg-plan-dropdown-add { flex: 1; }
.zg-plan-dropdown-import {
    flex: 0 0 auto;
    padding: 8px 10px;
    border: 1px solid #dde3e0;
    border-radius: 6px;
    background: #ffffff;
    color: #3d4541;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
}
.zg-plan-dropdown-import:hover { background: #f0f4f2; }
body.zg-dark .zg-plan-search-input { background: #2b3330; border-color: #3a4440; }
body.zg-dark .zg-plan-search-clear:hover { background: #33413a; }
body.zg-dark .zg-plan-dropdown-import { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-plan-dropdown-import:hover { background: #33413a; }
.zg-plan-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #333333;
    font-family: inherit;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
}
.zg-plan-item:hover { background: #f0f4f2; }
.zg-plan-item.active { background: #e5f0e9; color: #1e7a46; font-weight: 700; }
.zg-plan-item-check { width: 14px; flex: 0 0 14px; color: #1e7a46; }
.zg-plan-item-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.zg-plan-item-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.zg-plan-item-time { color: #8a938d; font-size: 10px; font-weight: 400; }
.zg-plan-dropdown-sep { height: 1px; margin: 4px 2px; background: #eef1ef; }
.zg-plan-dropdown-add {
    width: 100%;
    padding: 8px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #3a6b2f;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
}
.zg-plan-dropdown-add:hover { background: #f1f8ea; }

.zg-plan-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(20, 30, 25, .25);
    z-index: 31000;
}
.zg-plan-dialog {
    width: 300px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #ffffff;
    border: 1px solid #d5dad7;
    border-radius: 10px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, .2);
    font-size: 12px;
    color: #222222;
}
.zg-plan-dialog-title { font-size: 13px; font-weight: 700; }
.zg-plan-dialog-label { color: #7a827e; font-size: 10px; margin-bottom: 3px; }
.zg-plan-dialog input[type="text"] {
    width: 100%;
    height: 30px;
    padding: 0 8px;
    box-sizing: border-box;
    border: 1px solid #dde3e0;
    border-radius: 6px;
    font-family: inherit;
    font-size: 12px;
}
.zg-plan-dialog-radio { display: flex; align-items: center; gap: 6px; padding: 2px 0; cursor: pointer; }
.zg-plan-dialog-message { line-height: 1.45; }
.zg-plan-dialog-error { color: #d33b43; font-size: 11px; min-height: 14px; }
.zg-plan-dialog-actions { display: flex; gap: 8px; }
.zg-plan-dialog-actions button {
    flex: 1;
    height: 30px;
    border: 1px solid #dde3e0;
    border-radius: 6px;
    background: #ffffff;
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
}
.zg-plan-dialog-actions .zg-plan-ok {
    background: #3a8a4f;
    border-color: #3a8a4f;
    color: #ffffff;
    font-weight: 700;
}
.zg-plan-dialog-actions .zg-plan-danger {
    background: #d33b43;
    border-color: #d33b43;
    color: #ffffff;
    font-weight: 700;
}

.zg-plan-toast {
    position: fixed;
    left: 50%;
    bottom: 70px;
    transform: translateX(-50%);
    padding: 8px 14px;
    background: #1e2924;
    color: #ffffff;
    border-radius: 8px;
    font-size: 12px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, .2);
    z-index: 32000;
    opacity: 0;
    transition: opacity .2s ease;
    pointer-events: none;
}
.zg-plan-toast.visible { opacity: 1; }
.zg-plan-toast.error { background: #d33b43; }
`;

    document.head.appendChild(style);


    /* =====================================================
       HELPERS
    ===================================================== */

    function createPlanId() {

        return (
            "plan-" +
            Date.now() +
            "-" +
            Math.random().toString(36).slice(2, 8)
        );
    }


    function escapeText(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }


    function formatTime(iso) {

        const date = new Date(iso);

        if (isNaN(date)) {
            return "";
        }

        const pad = number => String(number).padStart(2, "0");

        return (
            `แก้ไขล่าสุด ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ` +
            `${pad(date.getHours())}:${pad(date.getMinutes())}`
        );
    }


    let toastEl = null;
    let toastTimer = null;

    function showToast(message, isError = false) {

        if (!toastEl) {

            toastEl = document.createElement("div");
            toastEl.className = "zg-plan-toast";
            document.body.appendChild(toastEl);
        }

        toastEl.textContent = message;
        toastEl.classList.toggle("error", isError);
        toastEl.classList.add("visible");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(
            () => toastEl.classList.remove("visible"),
            isError ? 4000 : 1800
        );
    }


    function waitFrames(count, callback) {

        if (count <= 0) {
            callback();
            return;
        }

        requestAnimationFrame(() => waitFrames(count - 1, callback));
    }


    /* ข้อมูลแผน โดยไม่สนเวลา export (ใช้เทียบว่ามีอะไรเปลี่ยนไหม) */
    function snapshotKey(data) {

        const copy = { ...data };

        delete copy.exportedAt;

        return JSON.stringify(copy);
    }


    /* =====================================================
       STORAGE
       store = { activeId, plans: [{ id, name, updatedAt, data }] }
    ===================================================== */

    let store = null;

    let lastSavedKey = "";

    let storageAvailable = true;


    function readStore() {

        try {

            const raw = localStorage.getItem(STORAGE_KEY);

            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw);

            if (
                !parsed ||
                !Array.isArray(parsed.plans) ||
                parsed.plans.length === 0
            ) {
                return null;
            }

            parsed.plans = parsed.plans.filter(
                plan => plan && plan.id && plan.data
            );

            return parsed.plans.length ? parsed : null;

        } catch (error) {

            return null;
        }
    }


    function writeStore() {

        if (!storageAvailable) {
            return false;
        }

        try {

            localStorage.setItem(STORAGE_KEY, JSON.stringify(store));

            return true;

        } catch (error) {

            console.error(error);

            showToast(
                "บันทึกแผนในเบราว์เซอร์ไม่ได้ (พื้นที่เต็มหรือถูกปิดไว้) — ควร Export เก็บไว้",
                true
            );

            return false;
        }
    }


    function getActivePlan() {

        return (
            store.plans.find(plan => plan.id === store.activeId) ||
            store.plans[0]
        );
    }


    /* บันทึกสถานะปัจจุบันลงแผนที่เปิดอยู่ (บันทึกจริงเฉพาะเมื่อมีอะไรเปลี่ยน) */
    function saveActive(force = false) {

        if (!store) {
            return;
        }

        const plan = getActivePlan();

        if (!plan) {
            return;
        }

        let data;

        try {

            data = window.ZGPlanIO.build();

        } catch (error) {

            console.error(error);

            return;
        }

        const key = snapshotKey(data);

        if (!force && key === lastSavedKey) {
            return;
        }

        plan.data = data;
        plan.updatedAt = new Date().toISOString();

        if (writeStore()) {
            lastSavedKey = key;
        }
    }


    /* =====================================================
       BLANK PLAN
    ===================================================== */

    function buildBlankPlanData(title) {

        const today = new Date();

        const start =
            new Date(today.getFullYear(), today.getMonth(), 1);

        const end =
            new Date(today.getFullYear() + 1, today.getMonth(), 1);

        return {

            app: window.ZGPlanIO.FILE_APP,

            version: window.ZGPlanIO.FILE_VERSION,

            title: title || "Property schedule plan",

            subtitle: "title",

            updateDate: formatDateInputValue(today),

            timeline: {

                start: formatDateInputValue(start),

                end: formatDateInputValue(end),

                zoom: 1,

                scrollLeft: 0
            },

            categories: [
                createDefaultCategory(),
                createDefaultCategory(),
                createDefaultCategory()
            ],

            roles: [
                { id: createRoleId(), name: "งานทั่วไป", color: "#f0f0f0" },
                { id: createRoleId(), name: "สำคัญ", color: "#d9534f" },
                { id: createRoleId(), name: "รอดำเนินการ", color: "#e1a638" }
            ],

            objects: [],

            notes: [createNote()],

            texts: []
        };
    }


    /* =====================================================
       SWITCH / ADD / RENAME / DELETE
    ===================================================== */

    function applyPlan(plan) {

        try {

            window.ZGPlanIO.apply(JSON.parse(JSON.stringify(plan.data)));

        } catch (error) {

            console.error(error);

            showToast("เปิดแผนนี้ไม่สำเร็จ ข้อมูลบางส่วนเสียหาย", true);

            return false;
        }

        store.activeId = plan.id;

        writeStore();

        updateLabel();

        /* รอ render (และกล่อง text) เสร็จ แล้วจำสถานะไว้เป็นจุดตั้งต้น */
        waitFrames(3, () => {

            try {
                lastSavedKey = snapshotKey(window.ZGPlanIO.build());
            } catch (error) {
                lastSavedKey = "";
            }

            /* แจ้ง history.js ให้เริ่มประวัติ ย้อนกลับ/ทำซ้ำ ของแผนนี้ใหม่ */
            window.dispatchEvent(new CustomEvent("zg-plan-applied", { detail: { planId: plan.id } }));
        });

        return true;
    }


    function switchToPlan(planId) {

        if (planId === store.activeId) {
            return;
        }

        const target =
            store.plans.find(plan => plan.id === planId);

        if (!target) {
            return;
        }

        saveActive(true);

        if (applyPlan(target)) {
            showToast(`เปิดแผน "${target.name}"`);
        }
    }


    function uniqueName(baseName) {

        const names =
            new Set(store.plans.map(plan => plan.name));

        if (!names.has(baseName)) {
            return baseName;
        }

        let index = 2;

        while (names.has(`${baseName} (${index})`)) {
            index += 1;
        }

        return `${baseName} (${index})`;
    }


    function addPlan(name, copyCurrent) {

        saveActive(true);

        const data =
            copyCurrent
                ? JSON.parse(JSON.stringify(getActivePlan().data))
                : buildBlankPlanData();

        const plan = {

            id: createPlanId(),

            name,

            updatedAt: new Date().toISOString(),

            data
        };

        store.plans.push(plan);

        if (applyPlan(plan)) {
            showToast(`สร้างแผน "${name}" แล้ว`);
        }
    }


    function renamePlan(planId, name) {

        const plan =
            store.plans.find(item => item.id === planId);

        if (!plan) {
            return;
        }

        plan.name = name;

        writeStore();

        updateLabel();

        showToast("เปลี่ยนชื่อแผนแล้ว");
    }


    function deletePlan(planId) {

        if (store.plans.length <= 1) {
            return;
        }

        const index =
            store.plans.findIndex(plan => plan.id === planId);

        if (index < 0) {
            return;
        }

        const [removed] =
            store.plans.splice(index, 1);

        if (removed.id === store.activeId) {

            const next =
                store.plans[Math.min(index, store.plans.length - 1)];

            applyPlan(next);

        } else {

            writeStore();
        }

        showToast(`ลบแผน "${removed.name}" แล้ว`);
    }


    function updateLabel() {

        const plan = getActivePlan();

        if (nameEl && plan) {

            nameEl.textContent = plan.name;

            selectBtn.title = plan.name;
        }

        deleteBtn.disabled = store.plans.length <= 1;

        deleteBtn.title =
            store.plans.length <= 1
                ? "ต้องมีอย่างน้อย 1 แผน"
                : "ลบแผนนี้";
    }


    /* =====================================================
       DROPDOWN (เลือกแผน)
    ===================================================== */

    let dropdown = null;


    function closeDropdown() {

        if (dropdown) {
            dropdown.remove();
        }

        dropdown = null;
    }


    function openDropdown() {

        closeDropdown();
        closeDialog();

        saveActive();

        const menu =
            document.createElement("div");

        menu.className =
            "zg-plan-dropdown";

        const sorted =
            store.plans.slice();

        menu.innerHTML = `
            <div class="zg-plan-search">
                <span class="zg-plan-search-icon">🔍</span>
                <input type="text" class="zg-plan-search-input" placeholder="ค้นหาชื่อแผน..." aria-label="ค้นหาชื่อแผน">
                <button type="button" class="zg-plan-search-clear" title="ล้างคำค้นหา">✕</button>
            </div>
            <div class="zg-plan-list">
            ${sorted.map(plan => `
                <div class="zg-plan-row ${plan.id === store.activeId ? "active" : ""}">
                    <button type="button"
                        class="zg-plan-item ${plan.id === store.activeId ? "active" : ""}"
                        data-plan-id="${escapeText(plan.id)}">
                        <span class="zg-plan-item-check">${plan.id === store.activeId ? "✓" : ""}</span>
                        <span class="zg-plan-item-text">
                            <span class="zg-plan-item-name">${escapeText(plan.name)}</span>
                            <span class="zg-plan-item-time">${escapeText(formatTime(plan.updatedAt))}</span>
                        </span>
                    </button>
                    <button type="button" class="zg-plan-row-delete"
                        data-delete-id="${escapeText(plan.id)}"
                        title="ลบแผนนี้" aria-label="ลบแผนนี้">🗑</button>
                </div>
            `).join("")}
                <div class="zg-plan-empty" hidden>ไม่พบแผนที่ค้นหา</div>
            </div>
            <div class="zg-plan-count" hidden></div>
            <div class="zg-plan-dropdown-sep"></div>
            <div class="zg-plan-dropdown-footer">
                <button type="button" class="zg-plan-dropdown-add">＋ เพิ่มแผนใหม่</button>
                <button type="button" class="zg-plan-dropdown-import" title="Import ไฟล์แผน (.json)">↓ Import .json</button>
            </div>
        `;

        const searchBox = menu.querySelector(".zg-plan-search");
        const searchInput = menu.querySelector(".zg-plan-search-input");
        const emptyNote = menu.querySelector(".zg-plan-empty");
        const countNote = menu.querySelector(".zg-plan-count");
        const items = Array.from(menu.querySelectorAll(".zg-plan-row"));

        function applySearch() {

            const query = searchInput.value.trim().toLowerCase();

            let shown = 0;

            items.forEach(item => {

                const name = (item.querySelector(".zg-plan-item-name").textContent || "").toLowerCase();

                const visible = !query || name.includes(query);

                item.hidden = !visible;

                if (visible) shown += 1;
            });

            searchBox.classList.toggle("has-text", Boolean(query));

            emptyNote.hidden = shown > 0;

            countNote.hidden = !query || shown === 0;
            countNote.textContent = query ? `พบ ${shown} จาก ${items.length} แผน` : "";
        }

        searchInput.addEventListener("input", applySearch);

        searchInput.addEventListener("keydown", event => {

            if (event.key === "Enter") {

                event.preventDefault();

                const first = items.find(item => !item.hidden);

                if (first) {
                    closeDropdown();
                    switchToPlan(first.querySelector(".zg-plan-item").dataset.planId);
                }
            }

            if (event.key === "Escape") {
                event.stopPropagation();
                closeDropdown();
            }
        });

        menu.querySelector(".zg-plan-search-clear").addEventListener("click", event => {

            event.stopPropagation();

            searchInput.value = "";
            applySearch();
            searchInput.focus();
        });

        menu.addEventListener("click", event => {

            const deleteBtn =
                event.target.closest(".zg-plan-row-delete");

            if (deleteBtn) {

                event.stopPropagation();

                closeDropdown();

                openDeleteDialog(deleteBtn.dataset.deleteId);

                return;
            }

            const item =
                event.target.closest(".zg-plan-item");

            if (item) {

                closeDropdown();

                switchToPlan(item.dataset.planId);

                return;
            }

            if (event.target.closest(".zg-plan-dropdown-add")) {

                closeDropdown();

                openAddDialog();

                return;
            }

            if (event.target.closest(".zg-plan-dropdown-import")) {

                closeDropdown();

                /* เลือกไฟล์ .json → ถามว่าสร้างเป็นแผนใหม่ หรือแทนที่แผนปัจจุบัน */
                if (window.ZGPlanIO && typeof window.ZGPlanIO.importFile === "function") {
                    window.ZGPlanIO.importFile();
                } else {
                    showToast("ไม่พบระบบ Import (io.js)", true);
                }
            }
        });

        document.body.appendChild(menu);

        const rect =
            selectBtn.getBoundingClientRect();

        menu.style.left =
            `${Math.max(6, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 6))}px`;

        menu.style.top =
            `${rect.bottom + 6}px`;

        dropdown = menu;

        /* ให้เห็นแผนที่เปิดอยู่ในรายการ แล้วโฟกัสช่องค้นหา */
        const activeItem = menu.querySelector(".zg-plan-item.active");

        if (activeItem) {
            activeItem.scrollIntoView({ block: "nearest" });
        }

        searchInput.focus();
    }


    /* =====================================================
       DIALOGS
    ===================================================== */

    let dialogOverlay = null;


    function closeDialog() {

        if (dialogOverlay) {
            dialogOverlay.remove();
        }

        dialogOverlay = null;
    }


    function openDialog(innerHtml, onOk) {

        closeDialog();
        closeDropdown();

        const overlay =
            document.createElement("div");

        overlay.className =
            "zg-plan-overlay";

        overlay.innerHTML =
            `<div class="zg-plan-dialog">${innerHtml}</div>`;

        const dialog =
            overlay.querySelector(".zg-plan-dialog");

        const ok = () => {

            if (onOk(dialog) !== false) {
                closeDialog();
            }
        };

        overlay.addEventListener("mousedown", event => {

            if (event.target === overlay) {
                closeDialog();
            }
        });

        dialog.querySelector("[data-ok]")
            .addEventListener("click", ok);

        dialog.querySelector("[data-cancel]")
            .addEventListener("click", closeDialog);

        dialog.addEventListener("keydown", event => {

            if (event.key === "Enter" && event.target.tagName !== "BUTTON") {

                event.preventDefault();

                ok();
            }

            if (event.key === "Escape") {

                event.stopPropagation();

                closeDialog();
            }
        });

        document.body.appendChild(overlay);

        dialogOverlay = overlay;

        const firstInput =
            dialog.querySelector('input[type="text"]');

        if (firstInput) {

            firstInput.focus();
            firstInput.select();

        } else {

            dialog.querySelector("[data-ok]").focus();
        }

        return dialog;
    }


    function readName(dialog) {

        const input =
            dialog.querySelector('input[type="text"]');

        const error =
            dialog.querySelector(".zg-plan-dialog-error");

        const name =
            input.value.trim().slice(0, NAME_MAX);

        if (!name) {

            error.textContent = "กรุณาตั้งชื่อแผน";

            input.focus();

            return null;
        }

        return name;
    }


    function openAddDialog() {

        openDialog(`
            <div class="zg-plan-dialog-title">เพิ่มแผนใหม่</div>

            <div>
                <div class="zg-plan-dialog-label">ชื่อแผน</div>
                <input type="text" maxlength="${NAME_MAX}" value="${escapeText(uniqueName("แผนใหม่"))}">
            </div>

            <div>
                <label class="zg-plan-dialog-radio">
                    <input type="radio" name="zgPlanStart" value="blank" checked>
                    เริ่มจากแผนเปล่า
                </label>
                <label class="zg-plan-dialog-radio">
                    <input type="radio" name="zgPlanStart" value="copy">
                    คัดลอกจากแผนที่เปิดอยู่
                </label>
            </div>

            <div class="zg-plan-dialog-error"></div>

            <div class="zg-plan-dialog-actions">
                <button type="button" data-cancel>ยกเลิก</button>
                <button type="button" class="zg-plan-ok" data-ok>สร้างแผน</button>
            </div>
        `, dialog => {

            const name = readName(dialog);

            if (!name) {
                return false;
            }

            const copyCurrent =
                dialog.querySelector('input[name="zgPlanStart"]:checked').value === "copy";

            addPlan(name, copyCurrent);
        });
    }


    function openRenameDialog() {

        const plan = getActivePlan();

        openDialog(`
            <div class="zg-plan-dialog-title">เปลี่ยนชื่อแผน</div>

            <div>
                <div class="zg-plan-dialog-label">ชื่อแผน</div>
                <input type="text" maxlength="${NAME_MAX}" value="${escapeText(plan.name)}">
            </div>

            <div class="zg-plan-dialog-error"></div>

            <div class="zg-plan-dialog-actions">
                <button type="button" data-cancel>ยกเลิก</button>
                <button type="button" class="zg-plan-ok" data-ok>บันทึก</button>
            </div>
        `, dialog => {

            const name = readName(dialog);

            if (!name) {
                return false;
            }

            renamePlan(plan.id, name);
        });
    }


    /* =====================================================
       IMPORT .json → เลือก เพิ่มเป็นแผนใหม่ / แทนที่แผนที่เปิดอยู่
    ===================================================== */

    function importAsNewPlan(name, data, message) {

        saveActive(true);

        const plan = {

            id: createPlanId(),

            name,

            updatedAt: new Date().toISOString(),

            data: JSON.parse(JSON.stringify(data))
        };

        store.plans.push(plan);

        if (applyPlan(plan)) {

            /* บันทึกทันที (applyPlan เก็บแค่ activeId) */
            waitFrames(4, () => saveActive(true));

            showToast(message || `Import เป็นแผนใหม่ "${name}" แล้ว`);
        }
    }


    function importReplaceCurrent(data) {

        try {

            window.ZGPlanIO.apply(JSON.parse(JSON.stringify(data)));

        } catch (error) {

            console.error(error);

            showToast("Import ไม่สำเร็จ: ข้อมูลในไฟล์บางส่วนไม่ถูกต้อง", true);

            return;
        }

        waitFrames(4, () => saveActive(true));

        showToast(`แทนที่แผน "${getActivePlan().name}" ด้วยไฟล์แล้ว`);
    }


    function openImportDialog(data, fileName) {

        const baseName =
            (typeof data.title === "string" && data.title.trim()) ||
            String(fileName || "").replace(/\.json$/i, "").trim() ||
            "แผนจากไฟล์";

        const current = getActivePlan();

        openDialog(`
            <div class="zg-plan-dialog-title">Import ไฟล์แผน</div>

            <div class="zg-plan-dialog-message">ไฟล์: <b>${escapeText(fileName || "-")}</b></div>

            <div>
                <label class="zg-plan-dialog-radio">
                    <input type="radio" name="zgImportMode" value="new" checked>
                    เพิ่มเป็นแผนใหม่
                </label>
                <label class="zg-plan-dialog-radio">
                    <input type="radio" name="zgImportMode" value="replace">
                    แทนที่แผนที่เปิดอยู่ (<b>${escapeText(current.name)}</b>)
                </label>
            </div>

            <div data-section="name">
                <div class="zg-plan-dialog-label">ชื่อแผนใหม่</div>
                <input type="text" maxlength="${NAME_MAX}" value="${escapeText(uniqueName(baseName.slice(0, NAME_MAX)))}">
            </div>

            <div class="zg-plan-dialog-message" data-section="warn" style="display:none; color:#d33b43">
                ข้อมูลเดิมของแผนนี้จะถูกแทนที่ทั้งหมด
            </div>

            <div class="zg-plan-dialog-error"></div>

            <div class="zg-plan-dialog-actions">
                <button type="button" data-cancel>ยกเลิก</button>
                <button type="button" class="zg-plan-ok" data-ok>Import</button>
            </div>
        `, dialog => {

            const mode =
                dialog.querySelector('input[name="zgImportMode"]:checked').value;

            if (mode === "replace") {

                importReplaceCurrent(data);

                return;
            }

            const name = readName(dialog);

            if (!name) {
                return false;
            }

            importAsNewPlan(name, data);
        });

        /* สลับแสดงช่องชื่อ / คำเตือนตามตัวเลือก */
        const dialog =
            dialogOverlay && dialogOverlay.querySelector(".zg-plan-dialog");

        if (dialog) {

            const nameSection = dialog.querySelector('[data-section="name"]');
            const warnSection = dialog.querySelector('[data-section="warn"]');
            const okBtn = dialog.querySelector("[data-ok]");

            dialog.querySelectorAll('input[name="zgImportMode"]').forEach(radio => {

                radio.addEventListener("change", () => {

                    const replace = radio.value === "replace" && radio.checked;

                    nameSection.style.display = replace ? "none" : "";
                    warnSection.style.display = replace ? "" : "none";

                    okBtn.className = replace ? "zg-plan-danger" : "zg-plan-ok";
                });
            });
        }
    }


    window.ZGPlans = {

        importData(data, fileName) {

            if (!store) {

                /* ระบบแผนยังไม่พร้อม → แทนที่แผนที่เปิดอยู่แบบเดิม */
                window.ZGPlanIO.apply(data);

                return;
            }

            openImportDialog(data, fileName);
        },

        /* สร้างแผนใหม่จากข้อมูล (ใช้โดย templates.js) */
        createFromData(name, data, message) {

            if (!store) {
                window.ZGPlanIO.apply(data);
                return;
            }

            importAsNewPlan(uniqueName(name || "แผนใหม่"), data, message);
        },

        /* แทนที่แผนที่เปิดอยู่ด้วยข้อมูล (ใช้โดย templates.js) */
        replaceCurrent(data) {

            if (!store) {
                window.ZGPlanIO.apply(data);
                return;
            }

            importReplaceCurrent(data);
        },

        currentName() {

            const plan = store ? getActivePlan() : null;

            return plan ? plan.name : "";
        },

        /* ---------- ใช้โดย start.js (หน้าเริ่มต้น) ---------- */

        isReady() {
            return Boolean(store);
        },

        list() {

            if (!store) return [];

            return store.plans.map(plan => ({
                id: plan.id,
                name: plan.name,
                updatedAt: plan.updatedAt,
                active: plan.id === store.activeId
            }));
        },

        activeId() {
            return store ? store.activeId : null;
        },

        switchTo(planId) {
            if (store) switchToPlan(planId);
        },

        createBlank(name) {
            if (store) addPlan(uniqueName(name || "แผนใหม่"), false);
        },

        renameCurrent(name) {

            if (!store || !name) return;

            const plan = getActivePlan();

            plan.name = name;

            if (plan.data) plan.data.title = plan.data.title || name;

            writeStore();

            updateLabel();
        },

        /* ลบแผนแบบไม่ถาม (ใช้ลบแผนเปล่าที่ระบบสร้างให้ตอนเปิดครั้งแรก) */
        removeSilently(planId) {

            if (!store || store.plans.length <= 1) return;

            const index = store.plans.findIndex(plan => plan.id === planId);

            if (index < 0 || planId === store.activeId) return;

            store.plans.splice(index, 1);

            writeStore();

            updateLabel();
        }
    };


    function openDeleteDialog(planId) {

        if (store.plans.length <= 1) {

            showToast("ต้องมีอย่างน้อย 1 แผน ลบแผนสุดท้ายไม่ได้", true);

            return;
        }

        const plan =
            (planId && store.plans.find(item => item.id === planId)) ||
            getActivePlan();

        openDialog(`
            <div class="zg-plan-dialog-title">ลบแผน</div>

            <div class="zg-plan-dialog-message">
                ต้องการลบแผน <b>"${escapeText(plan.name)}"</b> ใช่ไหม?<br>
                ลบแล้วกู้คืนไม่ได้ ถ้ายังอยากเก็บไว้ ให้ Export ก่อน
            </div>

            <div class="zg-plan-dialog-actions">
                <button type="button" data-cancel>ยกเลิก</button>
                <button type="button" class="zg-plan-danger" data-ok>ลบแผน</button>
            </div>
        `, () => {

            deletePlan(plan.id);
        });
    }


    /* =====================================================
       EVENTS
    ===================================================== */

    /* ถ้าระบบแผนยังไม่พร้อม (io.js ยังไม่โหลด) → แจ้งแทนการเงียบ */
    function ready() {

        if (store && window.ZGPlanIO) {
            return true;
        }

        showToast(
            window.ZGPlanIO
                ? "ระบบแผนกำลังโหลด ลองกดอีกครั้ง"
                : "ระบบแผนใช้ไม่ได้: ไม่พบ io.js ตัวใหม่ (ดูลำดับ <script> ใน index.html)",
            true
        );

        return false;
    }


    selectBtn.addEventListener("click", event => {

        event.stopPropagation();

        if (!ready()) {
            return;
        }

        if (dropdown) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });

    addBtn.addEventListener("click", () => {
        if (ready()) openAddDialog();
    });

    renameBtn.addEventListener("click", () => {
        if (ready()) openRenameDialog();
    });

    deleteBtn.addEventListener("click", () => {
        if (ready()) openDeleteDialog();
    });


    document.addEventListener("mousedown", event => {

        if (
            dropdown &&
            !dropdown.contains(event.target) &&
            !event.target.closest("#planSelectBtn")
        ) {
            closeDropdown();
        }
    });


    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            closeDropdown();
            closeDialog();
        }
    });


    /* =====================================================
       START
    ===================================================== */

    function start() {

        if (!window.ZGPlanIO) {

            console.error(
                "[plans.js] ไม่พบ window.ZGPlanIO — ต้องใช้ io.js ตัวใหม่ และโหลด io.js ก่อน plans.js"
            );

            return;
        }

        try {

            localStorage.getItem(STORAGE_KEY);

        } catch (error) {

            storageAvailable = false;
        }

        store =
            storageAvailable
                ? readStore()
                : null;

        if (store) {

            /* มีแผนเก็บไว้แล้ว → เปิดแผนล่าสุด */

            applyPlan(getActivePlan());

        } else {

            /* ครั้งแรก → เก็บหน้าที่เปิดอยู่เป็นแผนแรก */

            const firstName =
                (nameEl && nameEl.textContent.trim()) ||
                DEFAULT_FIRST_NAME;

            const plan = {

                id: createPlanId(),

                name: firstName,

                updatedAt: new Date().toISOString(),

                data: window.ZGPlanIO.build()
            };

            store = { activeId: plan.id, plans: [plan] };

            writeStore();

            lastSavedKey = snapshotKey(plan.data);

            updateLabel();
        }

        if (!storageAvailable) {

            showToast(
                "เบราว์เซอร์นี้ไม่ให้เก็บข้อมูล แผนจะไม่ถูกบันทึกเมื่อปิดหน้า — ควร Export เก็บไว้",
                true
            );
        }


        /* บันทึกอัตโนมัติ */

        setInterval(() => saveActive(), AUTOSAVE_MS);

        window.addEventListener("pagehide", () => saveActive());

        document.addEventListener("visibilitychange", () => {

            if (document.visibilityState === "hidden") {
                saveActive();
            }
        });
    }


    /* รอให้ app.js วาดตารางครั้งแรกเสร็จก่อน (app.js ใช้ requestAnimationFrame 2 ชั้น) */
    /*
        รอให้ไฟล์เสริมทุกไฟล์โหลดครบก่อน (DOMContentLoaded = สคริปต์ทุกตัวทำงานแล้ว)
        เดิมเริ่มหลัง 4 เฟรม → บางครั้งเปิดแผนก่อนไฟล์ รูปแปะ / ขนาดอักษร / ตัวหนา ฯลฯ โหลดเสร็จ
        ค่าพวกนั้นเลยไม่ถูกใส่กลับ แล้วบันทึกอัตโนมัติก็ทับของเดิมจนหาย
    */
    let started = false;

    function startWhenReady() {
        if (started) return;
        started = true;
        waitFrames(4, start);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startWhenReady);
    } else {
        startWhenReady();
    }

})();