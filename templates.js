"use strict";

/* =========================================================
   TEMPLATES.JS — เทมเพลตแผน (บันทึกหน้าตาแผนไว้ใช้ซ้ำ)
   ปุ่ม "📋 เทมเพลต" ข้างช่องค้นหา/คำสั่ง
   - ใช้เทมเพลต         : สร้างแผนใหม่จากเทมเพลต (หรือแทนที่แผนปัจจุบัน)
   - บันทึกเป็นเทมเพลต   : ตั้งชื่อ → เก็บหน้าตาแผนที่เปิดอยู่ทั้งหมด
   - Export เทมเพลต     : ดาวน์โหลดเป็นไฟล์ .json (ทั้งหมด หรือทีละอัน ⬇)
   - Import เทมเพลต     : เลือกไฟล์ .json ที่ Export มา → ใช้ที่เครื่องอื่นได้ทันที
                          (ใช้ไฟล์แผน .json ปกติก็ได้ → บันทึกเป็นเทมเพลตให้)

   ต้องโหลดหลัง io.js และ plans.js (ก่อน lang.js)
========================================================= */

(function () {

    if (!window.ZGPlanIO || typeof window.ZGPlanIO.build !== "function") {

        console.error("[templates.js] ไม่พบ io.js (window.ZGPlanIO)");

        return;
    }

    const LOCAL_KEY = "zg-property-schedule-templates-v1";

    const FILE_APP = "zg-property-schedule-templates";

    const FILE_VERSION = 1;


    /* =====================================================
       DATA
    ===================================================== */

    function readLocal() {

        try {

            const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");

            return Array.isArray(list) ? list.filter(item => item && item.id && item.data) : [];

        } catch (error) {

            return [];
        }
    }

    function writeLocal(list) {

        try {

            localStorage.setItem(LOCAL_KEY, JSON.stringify(list));

            return true;

        } catch (error) {

            console.error("[templates.js]", error);

            toast("บันทึกไม่สำเร็จ: พื้นที่ในเบราว์เซอร์เต็ม (รูปในแผนอาจใหญ่เกินไป)", true);

            return false;
        }
    }

    function allTemplates() {

        return readLocal();
    }

    function createId() {

        return `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    }

    function currentPlanData() {

        const data = JSON.parse(JSON.stringify(window.ZGPlanIO.build()));

        delete data.exportedAt;

        return data;
    }

    function escapeText(value) {

        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function formatDate(iso) {

        if (!iso) return "";

        const date = new Date(iso);

        if (isNaN(date)) return "";

        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }

    function summary(data) {

        const categoriesCount = Array.isArray(data.categories) ? data.categories.length : 0;

        const objects = Array.isArray(data.timelineObjects)
            ? data.timelineObjects.length
            : (Array.isArray(data.objects) ? data.objects.length : 0);

        return `${categoriesCount} หมวด · ${objects} object`;
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.zg-tpl-btn { margin-left: 6px; }
.zg-tpl-btn.active { background: #e5f0e9; border-color: #b9d8c2; color: #1e7a46; }

.zg-tpl-menu {
    position: fixed;
    width: 320px;
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
    color: #333333;
}
.zg-tpl-title { padding: 4px 8px 6px; font-weight: 700; font-size: 13px; }
.zg-tpl-search {
    width: 100%;
    height: 30px;
    box-sizing: border-box;
    margin-bottom: 6px;
    padding: 0 10px;
    border: 1px solid #dde3e0;
    border-radius: 7px;
    background: #f7f9f8;
    font-family: inherit;
    font-size: 12px;
    color: inherit;
    outline: none;
}
.zg-tpl-search:focus { border-color: #8cc79c; background: #ffffff; }
.zg-tpl-list { max-height: calc(5 * 50px); overflow-y: auto; overscroll-behavior: contain; }
.zg-tpl-item {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 46px;
    margin-bottom: 2px;
    padding: 6px 6px 6px 10px;
    border-radius: 6px;
    cursor: pointer;
}
.zg-tpl-item:hover { background: #f0f4f2; }
.zg-tpl-item[hidden] { display: none; }
.zg-tpl-item-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.zg-tpl-item-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.zg-tpl-item-meta { color: #8a938d; font-size: 10px; }
.zg-tpl-badge {
    display: inline-block;
    margin-left: 6px;
    padding: 0 6px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 700;
    vertical-align: 1px;
}
.zg-tpl-badge--code { background: #e5f0e9; color: #1e7a46; }
.zg-tpl-badge--local { background: #fff3df; color: #b06a0a; }
.zg-tpl-icon-btn {
    flex: 0 0 26px;
    height: 26px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: #6f7873;
    cursor: pointer;
    font-size: 12px;
}
.zg-tpl-icon-btn:hover { background: #ffffff; border-color: #dde3e0; }
.zg-tpl-icon-btn--danger:hover { color: #d9534f; }
.zg-tpl-empty { padding: 16px 10px; color: #8a938d; text-align: center; line-height: 1.5; }
.zg-tpl-sep { height: 1px; margin: 4px 2px; background: #eef1ef; }
.zg-tpl-footer { display: flex; flex-direction: column; gap: 4px; }
.zg-tpl-save {
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
.zg-tpl-save:hover { background: #f1f8ea; }
.zg-tpl-download {
    padding: 7px 10px;
    border: 1px solid #dde3e0;
    border-radius: 6px;
    background: #ffffff;
    color: #3d4541;
    font-family: inherit;
    font-size: 11px;
    text-align: left;
    cursor: pointer;
}
.zg-tpl-download:hover { background: #f0f4f2; }
.zg-tpl-io { display: flex; gap: 4px; }
.zg-tpl-io .zg-tpl-download { flex: 1; text-align: center; }
.zg-tpl-hint { padding: 0 4px 2px; color: #8a938d; font-size: 10px; line-height: 1.4; }

.zg-tpl-overlay {
    position: fixed;
    inset: 0;
    z-index: 27000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(20, 30, 25, .28);
}
.zg-tpl-dialog {
    width: 300px;
    max-width: calc(100vw - 24px);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 12px 36px rgba(0, 0, 0, .2);
    font-size: 12px;
    color: #333333;
}
.zg-tpl-dialog-title { font-weight: 700; font-size: 14px; }
.zg-tpl-dialog-label { color: #7a827e; font-size: 10px; margin-bottom: 3px; }
.zg-tpl-dialog input[type="text"] {
    width: 100%;
    height: 32px;
    box-sizing: border-box;
    padding: 0 10px;
    border: 1px solid #dde3e0;
    border-radius: 7px;
    font-family: inherit;
    font-size: 13px;
}
.zg-tpl-dialog-choices { display: flex; flex-direction: column; gap: 6px; }
.zg-tpl-dialog-choices label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.zg-tpl-dialog-note { color: #8a938d; font-size: 10px; line-height: 1.5; }
.zg-tpl-dialog-actions { display: flex; gap: 8px; }
.zg-tpl-dialog-actions button {
    flex: 1;
    height: 32px;
    border-radius: 7px;
    border: 1px solid #dde3e0;
    background: #ffffff;
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
}
.zg-tpl-dialog-actions .zg-tpl-ok { background: #3a8a4f; border-color: #3a8a4f; color: #ffffff; font-weight: 700; }
.zg-tpl-dialog-actions .zg-tpl-danger { background: #d9534f; border-color: #d9534f; color: #ffffff; font-weight: 700; }

.zg-tpl-toast {
    position: fixed;
    left: 50%;
    bottom: 28px;
    transform: translateX(-50%);
    z-index: 30000;
    max-width: calc(100vw - 32px);
    padding: 8px 14px;
    border-radius: 8px;
    background: #1e2924;
    color: #ffffff;
    font-size: 12px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, .2);
}
.zg-tpl-toast.error { background: #b23b37; }

body.zg-dark .zg-tpl-menu,
body.zg-dark .zg-tpl-dialog { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-tpl-item:hover { background: #2b3330; }
body.zg-dark .zg-tpl-search,
body.zg-dark .zg-tpl-dialog input[type="text"],
body.zg-dark .zg-tpl-download,
body.zg-dark .zg-tpl-dialog-actions button:not(.zg-tpl-ok):not(.zg-tpl-danger) { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-tpl-sep { background: #3a4440; }
body.zg-dark .zg-tpl-icon-btn:hover { background: #2b3330; border-color: #3a4440; }

body.zg-exporting .zg-tpl-menu { display: none !important; }
`;

    document.head.appendChild(style);


    /* =====================================================
       TOAST
    ===================================================== */

    let toastTimer = null;

    function toast(message, isError = false) {

        let element = document.querySelector(".zg-tpl-toast");

        if (!element) {
            element = document.createElement("div");
            element.className = "zg-tpl-toast";
            document.body.appendChild(element);
        }

        element.textContent = message;
        element.classList.toggle("error", isError);
        element.hidden = false;

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => { element.hidden = true; }, isError ? 4000 : 2200);
    }


    /* =====================================================
       TOOLBAR BUTTON (ข้างช่องค้นหา/คำสั่ง)
    ===================================================== */

    let button = document.getElementById("templateBtn");

    if (!button) {

        button = document.createElement("button");
        button.type = "button";
        button.id = "templateBtn";
        button.className = "toolbar-control zg-tpl-btn";
        button.title = "เทมเพลตแผน";
        button.textContent = "📋 เทมเพลต";

        const search = document.querySelector(".toolbar-search");

        if (search && search.parentNode) {
            search.parentNode.insertBefore(button, search.nextSibling);
        } else {
            (document.querySelector(".toolbar-row-secondary") || document.body).appendChild(button);
        }
    }


    /* =====================================================
       DIALOG
    ===================================================== */

    let overlay = null;

    function closeDialog() {

        if (overlay) overlay.remove();

        overlay = null;
    }

    function openDialog(html, onOk, focusSelector) {

        closeDialog();

        overlay = document.createElement("div");
        overlay.className = "zg-tpl-overlay";
        overlay.innerHTML = `<div class="zg-tpl-dialog">${html}</div>`;

        const dialog = overlay.firstElementChild;

        overlay.addEventListener("mousedown", event => {
            if (event.target === overlay) closeDialog();
        });

        dialog.addEventListener("keydown", event => {

            if (event.key === "Escape") {
                event.stopPropagation();
                closeDialog();
            }

            if (event.key === "Enter" && event.target.tagName === "INPUT" && event.target.type === "text") {
                event.preventDefault();
                onOk(dialog);
            }
        });

        dialog.querySelector(".zg-tpl-cancel").addEventListener("click", closeDialog);
        dialog.querySelector(".zg-tpl-ok, .zg-tpl-danger").addEventListener("click", () => onOk(dialog));

        document.body.appendChild(overlay);

        const focus = dialog.querySelector(focusSelector || "input[type='text']");

        if (focus) {
            focus.focus();
            if (focus.select) focus.select();
        }

        return dialog;
    }


    /* ---------- บันทึกแผนปัจจุบันเป็นเทมเพลต ---------- */

    function openSaveDialog() {

        closeMenu();

        const suggested =
            (window.ZGPlans && window.ZGPlans.currentName && window.ZGPlans.currentName()) ||
            "เทมเพลตใหม่";

        openDialog(`
            <div class="zg-tpl-dialog-title">บันทึกเป็นเทมเพลต</div>
            <div>
                <div class="zg-tpl-dialog-label">ชื่อเทมเพลต</div>
                <input type="text" class="zg-tpl-name" maxlength="80" value="${escapeText(suggested)}">
            </div>
            <div class="zg-tpl-dialog-note">
                เก็บหน้าตาแผนที่เปิดอยู่ทั้งหมด (หมวดหมู่ แถว สี object ข้อความ บันทึก ช่วงวันที่)
                ไว้ในเบราว์เซอร์นี้ — ถ้าจะใช้ที่เครื่องอื่น ให้กด "⬇ Export เทมเพลต" แล้วไป Import ที่เครื่องนั้น
            </div>
            <div class="zg-tpl-dialog-actions">
                <button type="button" class="zg-tpl-cancel">ยกเลิก</button>
                <button type="button" class="zg-tpl-ok">บันทึก</button>
            </div>
        `, dialog => {

            const name = dialog.querySelector(".zg-tpl-name").value.trim();

            if (!name) {
                dialog.querySelector(".zg-tpl-name").focus();
                return;
            }

            const exists = allTemplates().find(item => item.name === name);

            const template = {
                id: exists ? exists.id : createId(),
                name,
                createdAt: new Date().toISOString(),
                data: currentPlanData()
            };

            const local = readLocal().filter(item => item.id !== template.id);

            local.push(template);

            if (writeLocal(local)) {
                closeDialog();
                toast(`บันทึกเทมเพลต "${name}" แล้ว`);
            }
        });
    }


    /* ---------- ใช้เทมเพลต ---------- */

    function openUseDialog(template) {

        closeMenu();

        openDialog(`
            <div class="zg-tpl-dialog-title">ใช้เทมเพลต "${escapeText(template.name)}"</div>
            <div class="zg-tpl-dialog-choices">
                <label><input type="radio" name="zgTplMode" value="new" checked> สร้างเป็นแผนใหม่</label>
                <label><input type="radio" name="zgTplMode" value="replace"> แทนที่แผนที่เปิดอยู่</label>
            </div>
            <div>
                <div class="zg-tpl-dialog-label">ชื่อแผนใหม่</div>
                <input type="text" class="zg-tpl-plan-name" maxlength="80" value="${escapeText(template.name)}">
            </div>
            <div class="zg-tpl-dialog-actions">
                <button type="button" class="zg-tpl-cancel">ยกเลิก</button>
                <button type="button" class="zg-tpl-ok">ใช้เทมเพลต</button>
            </div>
        `, dialog => {

            const mode = dialog.querySelector("input[name='zgTplMode']:checked").value;

            const data = JSON.parse(JSON.stringify(template.data));

            if (window.ZGPlanIO.validate) {

                const problem = window.ZGPlanIO.validate(data);

                if (typeof problem === "string" && problem) {
                    toast(`เทมเพลตเสียหาย: ${problem}`, true);
                    return;
                }
            }

            closeDialog();

            if (!window.ZGPlans) {
                window.ZGPlanIO.apply(data);
                return;
            }

            if (mode === "replace") {

                window.ZGPlans.replaceCurrent(data);

            } else {

                const name = dialog.querySelector(".zg-tpl-plan-name").value.trim() || template.name;

                window.ZGPlans.createFromData(name, data, `สร้างแผนใหม่ "${name}" จากเทมเพลตแล้ว`);
            }
        });

        /* แทนที่แผน → ไม่ต้องใช้ชื่อ */
        const dialog = overlay.firstElementChild;
        const nameBox = dialog.querySelector(".zg-tpl-plan-name").parentElement;

        dialog.querySelectorAll("input[name='zgTplMode']").forEach(radio => {
            radio.addEventListener("change", () => {
                nameBox.hidden = dialog.querySelector("input[name='zgTplMode']:checked").value === "replace";
            });
        });
    }


    /* ---------- ลบเทมเพลต (เฉพาะในเครื่อง) ---------- */

    function openDeleteDialog(template) {

        closeMenu();

        openDialog(`
            <div class="zg-tpl-dialog-title">ลบเทมเพลต</div>
            <div>ลบเทมเพลต "${escapeText(template.name)}" ใช่ไหม?</div>
            <div class="zg-tpl-dialog-actions">
                <button type="button" class="zg-tpl-cancel">ยกเลิก</button>
                <button type="button" class="zg-tpl-danger">ลบ</button>
            </div>
        `, () => {

            writeLocal(readLocal().filter(item => item.id !== template.id));

            closeDialog();

            toast(`ลบเทมเพลต "${template.name}" แล้ว`);

        }, ".zg-tpl-danger");
    }


    /* ---------- Export เทมเพลต (.json) ---------- */

    function safeFileName(name) {

        return String(name || "templates")
            .replace(/[\\/:*?"<>|]+/g, "-")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 60) || "templates";
    }

    function exportTemplates(list, fileBase) {

        if (!list.length) {
            toast("ยังไม่มีเทมเพลตให้ Export", true);
            return;
        }

        const payload = {
            app: FILE_APP,
            version: FILE_VERSION,
            exportedAt: new Date().toISOString(),
            templates: list.map(item => ({
                id: item.id,
                name: item.name,
                createdAt: item.createdAt,
                data: item.data
            }))
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });

        const url = URL.createObjectURL(blob);

        const now = new Date();

        const stamp =
            `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

        const link = document.createElement("a");

        link.href = url;
        link.download = `${safeFileName(fileBase)}-${stamp}.json`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 2000);

        closeMenu();

        toast(list.length === 1
            ? `Export เทมเพลต "${list[0].name}" แล้ว`
            : `Export เทมเพลต ${list.length} อันแล้ว`);
    }


    /* ---------- Import เทมเพลต (.json) ---------- */

    const fileInput = document.createElement("input");

    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.style.display = "none";

    document.body.appendChild(fileInput);

    fileInput.addEventListener("change", () => {

        const file = fileInput.files && fileInput.files[0];

        fileInput.value = "";

        if (!file) {
            return;
        }

        if (!/\.json$/i.test(file.name || "")) {
            toast("กรุณาเลือกไฟล์ .json เท่านั้น", true);
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {

            let data;

            try {
                data = JSON.parse(String(reader.result));
            } catch (error) {
                toast("อ่านไฟล์ไม่ได้: ไม่ใช่ไฟล์ .json ที่ถูกต้อง", true);
                return;
            }

            importFromData(data, file.name);
        };

        reader.readAsText(file);
    });

    function importFromData(data, fileName) {

        /* 1) ไฟล์เทมเพลตที่ Export จากปุ่มนี้ */
        if (data && data.app === FILE_APP && Array.isArray(data.templates)) {

            const incoming = data.templates.filter(item => item && item.name && item.data);

            if (!incoming.length) {
                toast("ไฟล์นี้ไม่มีเทมเพลต", true);
                return;
            }

            const local = readLocal();

            let added = 0;
            let updated = 0;

            incoming.forEach(item => {

                const template = {
                    id: item.id || createId(),
                    name: String(item.name),
                    createdAt: item.createdAt || new Date().toISOString(),
                    data: item.data
                };

                const index = local.findIndex(entry => entry.id === template.id);

                if (index >= 0) {
                    local[index] = template;
                    updated += 1;
                } else {
                    local.push(template);
                    added += 1;
                }
            });

            if (writeLocal(local)) {

                const parts = [];

                if (added) parts.push(`เพิ่ม ${added}`);
                if (updated) parts.push(`อัปเดต ${updated}`);

                toast(`Import เทมเพลตแล้ว (${parts.join(", ")})`);

                openMenu();
            }

            return;
        }

        /* 2) ไฟล์แผน .json ปกติ (จากปุ่ม Export ไฟล์แผน) → บันทึกเป็นเทมเพลต */
        const problem =
            window.ZGPlanIO.validate ? window.ZGPlanIO.validate(data) : null;

        if (problem) {
            toast(`Import ไม่สำเร็จ: ${problem}`, true);
            return;
        }

        const base = String(fileName || "เทมเพลต").replace(/\.json$/i, "");

        const plan = JSON.parse(JSON.stringify(data));

        delete plan.exportedAt;

        const local = readLocal();

        local.push({
            id: createId(),
            name: base,
            createdAt: new Date().toISOString(),
            data: plan
        });

        if (writeLocal(local)) {
            toast(`บันทึกไฟล์แผน "${base}" เป็นเทมเพลตแล้ว`);
            openMenu();
        }
    }


    /* =====================================================
       MENU
    ===================================================== */

    let menu = null;

    function closeMenu() {

        if (menu) menu.remove();

        menu = null;

        button.classList.remove("active");
    }

    function openMenu() {

        closeMenu();

        const list = allTemplates();

        menu = document.createElement("div");
        menu.className = "zg-tpl-menu";

        menu.innerHTML = `
            <div class="zg-tpl-title">เทมเพลตแผน</div>
            ${list.length > 5 ? `<input type="text" class="zg-tpl-search" placeholder="ค้นหาเทมเพลต..." aria-label="ค้นหาเทมเพลต">` : ""}
            <div class="zg-tpl-list">
                ${list.length ? list.map(item => `
                    <div class="zg-tpl-item" data-id="${escapeText(item.id)}" title="ใช้เทมเพลตนี้">
                        <div class="zg-tpl-item-text">
                            <span class="zg-tpl-item-name">${escapeText(item.name)}</span>
                            <span class="zg-tpl-item-meta">${escapeText(summary(item.data))}${item.createdAt ? " · " + escapeText(formatDate(item.createdAt)) : ""}</span>
                        </div>
                        <button type="button" class="zg-tpl-icon-btn" data-action="export" title="Export เทมเพลตนี้ (.json)">⬇</button>
                        <button type="button" class="zg-tpl-icon-btn zg-tpl-icon-btn--danger" data-action="delete" title="ลบเทมเพลต">🗑</button>
                    </div>
                `).join("") : `<div class="zg-tpl-empty">ยังไม่มีเทมเพลต<br>จัดแผนให้เรียบร้อย แล้วกด "บันทึกแผนนี้เป็นเทมเพลต"<br>หรือ Import ไฟล์เทมเพลต .json</div>`}
            </div>
            <div class="zg-tpl-sep"></div>
            <div class="zg-tpl-footer">
                <button type="button" class="zg-tpl-save">＋ บันทึกแผนนี้เป็นเทมเพลต</button>
                <div class="zg-tpl-io">
                    <button type="button" class="zg-tpl-download" data-action="export-all">⬇ Export เทมเพลต (.json)</button>
                    <button type="button" class="zg-tpl-download" data-action="import">⬆ Import เทมเพลต (.json)</button>
                </div>
                <div class="zg-tpl-hint">ย้ายไปใช้เครื่องอื่น: Export ไฟล์ .json แล้วกด Import ที่เครื่องนั้น</div>
            </div>
        `;

        menu.addEventListener("click", event => {

            const item = event.target.closest(".zg-tpl-item");

            if (item) {

                const template = list.find(entry => entry.id === item.dataset.id);

                if (!template) return;

                if (event.target.closest("[data-action='delete']")) {
                    openDeleteDialog(template);
                } else if (event.target.closest("[data-action='export']")) {
                    exportTemplates([template], `template-${template.name}`);
                } else {
                    openUseDialog(template);
                }

                return;
            }

            if (event.target.closest(".zg-tpl-save")) {
                openSaveDialog();
                return;
            }

            if (event.target.closest("[data-action='export-all']")) {
                exportTemplates(list, "templates");
                return;
            }

            if (event.target.closest("[data-action='import']")) {
                closeMenu();
                fileInput.click();
            }
        });

        const search = menu.querySelector(".zg-tpl-search");

        if (search) {

            search.addEventListener("input", () => {

                const query = search.value.trim().toLowerCase();

                menu.querySelectorAll(".zg-tpl-item").forEach(element => {
                    const name = element.querySelector(".zg-tpl-item-name").firstChild.textContent.toLowerCase();
                    element.hidden = Boolean(query) && !name.includes(query);
                });
            });
        }

        document.body.appendChild(menu);

        const rect = button.getBoundingClientRect();

        menu.style.left = `${Math.max(6, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 6))}px`;
        menu.style.top = `${rect.bottom + 6}px`;

        button.classList.add("active");

        if (search) search.focus();
    }


    button.addEventListener("click", event => {

        event.preventDefault();
        event.stopPropagation();

        if (menu) closeMenu();
        else openMenu();
    });

    document.addEventListener("mousedown", event => {

        if (menu && !menu.contains(event.target) && !button.contains(event.target)) {
            closeMenu();
        }
    });

    document.addEventListener("keydown", event => {

        if (event.key === "Escape" && menu) {
            closeMenu();
        }
    });

    window.addEventListener("resize", closeMenu);


    window.ZGTemplates = {
        list: allTemplates,
        open: openMenu,
        save: openSaveDialog,
        exportAll: () => exportTemplates(allTemplates(), "templates"),
        importFile: () => fileInput.click(),
        importData: importFromData
    };

})();
