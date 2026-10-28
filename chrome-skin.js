"use strict";

/* =========================================================
   CHROME-SKIN.JS — หน้าตาแถบเครื่องมือ + เมนูทั้งหมด (มินิมอล สบายตา ใช้ง่าย)
   ---------------------------------------------------------
   1) แถบเครื่องมือ 2 แถว จัดกลุ่มตามงาน
        แถว 1: แผน · ย้อน/ทำซ้ำ · เพิ่ม (งาน เส้น Text รูป สถานะ)  ···  คลัง · ไฟล์และการพิมพ์
        แถว 2: ช่วงวันที่ (วันเริ่ม–สิ้นสุด · ซ่อน/รวบ · เพิ่ม/ลดเดือน) · มุมมอง  ···  ค้นหา/ตรวจคำผิด/วิธีใช้
      ย้ายปุ่มเดิม (id / การทำงานเดิมทั้งหมด) แค่จัดที่ใหม่
   2) เมนูทุกแบบหน้าตาชุดเดียวกัน: กล่องงาน / เส้น / หมวดหมู่ / แถว
      หัวข้อส่วนเล็ก ชัด · ช่องสีเป็นตาราง · ปุ่มหลักโทนเขียว · ปุ่มลบโทนแดงอ่อน
   - ไม่แตะหน้าตากระดาน / การพิมพ์ / Export
   - โหลดเป็นไฟล์สุดท้าย
========================================================= */

(function () {

    /* =====================================================
       1) จัดกลุ่มแถบเครื่องมือ
    ===================================================== */

    function group(className, label) {
        const el = document.createElement("div");
        el.className = `toolbar-group ${className}`;
        if (label) el.setAttribute("aria-label", label);
        el.setAttribute("role", "group");
        return el;
    }

    function regroupToolbar() {

        const main = document.querySelector(".toolbar-row-main");
        const second = document.querySelector(".toolbar-row-secondary");

        if (!main || !second || second.dataset.zgcDone) return;

        const date = document.querySelector(".toolbar-group--date");
        const month = document.querySelector(".toolbar-group--month");
        const zoom = document.querySelector(".toolbar-group--zoom");
        const view = document.querySelector(".toolbar-group--view");

        const template = document.getElementById("templateBtn");
        const presets = document.querySelector(".zg-pre-btn");
        const importBtn = document.getElementById("importPlanBtn");
        const printBtn = document.getElementById("printA3Btn");
        const exportBtn = document.getElementById("exportA3Btn");

        /* ช่วงวันที่: วันเริ่ม–สิ้นสุด + ซ่อน/รวบ + เพิ่ม/ลดเดือน อยู่ติดกัน */
        const timeline = group("zgc-group zgc-group--timeline", "ช่วงวันที่");
        if (date) timeline.appendChild(date);
        if (month) timeline.appendChild(month);

        /* การ์ดช่วงวันที่ (ย้ายปุ่มเดิม → การทำงานเดิมทั้งหมด) */
        (() => {
            /* กลุ่มยังไม่ได้ใส่ลงหน้า (getElementById หาไม่เจอ) → ค้นในกลุ่มก่อน */
            const byId = id => timeline.querySelector(`#${id}`) || document.getElementById(id);
            const startIn = byId("timelineStartInput");
            const endIn = byId("timelineEndInput");
            if (!startIn || !endIn) return;

            const make = (tag, cls, text) => {
                const el = document.createElement(tag);
                el.className = cls;
                if (text) el.textContent = text;
                return el;
            };

            const arrow = make("span", "zgc-range__arrow", "→");
            arrow.setAttribute("aria-hidden", "true");

            const dates = make("div", "zgc-range__dates");
            dates.append(startIn, arrow, endIn);

            const tip = (id, text) => { const el = byId(id); if (el) { el.title = text; el.setAttribute("aria-label", text); } return el; };
            const pairL = make("div", "zgc-mpair");
            [tip("extendStartBtn", "เพิ่ม 1 เดือนก่อนวันเริ่ม"), tip("shrinkStartBtn", "ลด 1 เดือนจากต้นแผน")].forEach(el => el && pairL.appendChild(el));
            const pairR = make("div", "zgc-mpair");
            [tip("shrinkEndBtn", "ลด 1 เดือนจากท้ายแผน"), tip("extendEndBtn", "เพิ่ม 1 เดือนหลังวันสิ้นสุด")].forEach(el => el && pairR.appendChild(el));
            const monthLabel = month ? month.querySelector(".zg-month__label") : null;

            const months = make("div", "zgc-range__months");
            months.append(pairL);
            if (monthLabel) months.append(monthLabel);
            months.append(pairR);

            startIn.title = "วันเริ่มต้น";
            startIn.setAttribute("aria-label", "วันเริ่มต้น");
            endIn.title = "วันสิ้นสุด";
            endIn.setAttribute("aria-label", "วันสิ้นสุด");

            const range = make("div", "zgc-range");
            range.append(dates, months);

            const side = make("div", "zgc-range__side");
            const link = byId("startLinkBtn") || (date && date.querySelector(".zg-link-btn"));
            const fold = timeline.querySelector(".zg-fold-btn") || document.querySelector(".zg-fold-btn");
            [link, fold].forEach(el => el && side.appendChild(el));

            timeline.append(range, side);
            [date, month].forEach(el => el && el.classList.add("zgc-hidden-wrap"));
        })();

        /* มุมมอง: ขนาด + ธีม + ภาษา */
        const viewGroup = group("zgc-group zgc-group--view", "มุมมอง");
        if (zoom) viewGroup.appendChild(zoom);
        if (view) viewGroup.appendChild(view);

        /* คลัง: เทมเพลต + ชุดสำเร็จ */
        const library = group("zgc-group zgc-group--library", "รูปภาพ");
        /* ย้ายสลับ: เทมเพลต + ชุดสำเร็จ ไปอยู่ในริบบอน (แทนที่รูปภาพ/แปะรูป) · รูปภาพ + แปะรูป มาอยู่กลุ่มเล็กซ้ายล่าง */
        const imageBtn = document.getElementById("addImageBtn");
        const stickerBtn = document.querySelector(".zg-stk-btn");
        const rolesBtn = document.getElementById("manageRolesBtn");
        const insertGroup = document.querySelector(".toolbar-group--insert");
        if (insertGroup) {
            [template, presets].forEach(el => {
                if (!el) return;
                if (rolesBtn && rolesBtn.parentNode === insertGroup) insertGroup.insertBefore(el, rolesBtn);
                else insertGroup.appendChild(el);
            });
        }
        [imageBtn, stickerBtn].forEach(el => el && library.appendChild(el));

        /* ส่งออก: Import · พิมพ์ A3 · Export */
        const output = group("zgc-group zgc-group--output", "ไฟล์และการพิมพ์");
        [importBtn, exportBtn, printBtn].forEach(el => el && output.appendChild(el));

        /*
            ริบบอน 3 ช่วง
              ซ้าย  (2 แถวเล็ก): [แผน · ย้อน/ทำซ้ำ] / [ไฟล์และการพิมพ์ · คลัง]
              กลาง (สูงเต็ม 2 แถว): [＋งาน … สถานะ]  [วันเริ่ม · 🔗 · วันสิ้นสุด · ซ่อน/รวบ · ±เดือน]
              ขวา  (2 แถวเล็ก): [ค้นหา · ตรวจคำผิด · วิธีใช้] / [ขนาด · ธีม · ภาษา]
        */
        const box = (cls, children) => {
            const el = document.createElement("div");
            el.className = cls;
            children.filter(Boolean).forEach(child => el.appendChild(child));
            return el;
        };

        const plan = document.querySelector(".toolbar-group--plan");
        const history = document.querySelector(".toolbar-group--history");
        const insert = document.querySelector(".toolbar-group--insert");
        const right = document.querySelector(".zg-toolbar-right");

        if (right) {
            right.classList.add("zgc-group", "zgc-group--right");
            right.setAttribute("role", "group");
            right.setAttribute("aria-label", "ค้นหาและช่วยเหลือ");
        }

        const left = box("zgc-col zgc-col--left", [
            box("zgc-line", [plan, history]),
            box("zgc-line", [output, library])
        ]);
        const mid = box("zgc-col zgc-col--mid", [insert, timeline]);
        const rightCol = box("zgc-col zgc-col--right", [
            box("zgc-line", [right]),
            box("zgc-line", [viewGroup])
        ]);

        const bar = document.querySelector(".workspace-toolbar");
        bar.classList.add("zgc-ribbon");
        bar.append(left, mid, rightCol);

        /* แถวเดิมว่างแล้ว → ซ่อน (คงไว้ใน DOM เผื่อไฟล์อื่นอ้างถึง) */
        main.classList.add("zgc-empty-row");
        second.classList.add("zgc-empty-row");

        /* ปุ่มริบบอน: ไอคอนเส้นด้านบน + ชื่อด้านล่าง
           ห่อข้อความเดิมไว้ใน span (ข้อความเดิมไม่เปลี่ยน → ระบบแปลภาษายังจับคู่ได้)
           ตัวสัญลักษณ์นำหน้า (＋ 🖼 🏷 ⚙) ซ่อนด้วย ::first-letter แล้วใช้ไอคอนเส้นแทน */
        const ICONS = {
            addTaskBtn: '<rect x="3" y="7" width="14" height="6" rx="2"/><path d="M3 4h6M3 16h9"/>',
            addDateLineBtn: '<path d="M10 3v14" stroke-dasharray="2 2"/><path d="M7 3h6"/><path d="M8 17l2-2 2 2z"/>',
            addHLineBtn: '<path d="M3 10h14"/><path d="M3 7v6M17 7v6"/>',
            addTextBtn: '<path d="M5 5h10M10 5v11M7.5 16h5"/>',
            addImageBtn: '<rect x="3" y="4" width="14" height="12" rx="2"/><circle cx="7.5" cy="8.5" r="1.5"/><path d="M4 15l4.5-4.5 3 3 2-2L17 15"/>',
            stickers: '<path d="M4 4h8l4 4v8H4z"/><path d="M12 4v4h4"/><circle cx="8" cy="11" r="1.4"/>',
            templateBtn: '<rect x="3" y="3" width="14" height="14" rx="2.5"/><path d="M3 8h14M8 8v9"/>',
            presets: '<path d="M10 3l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 13.8 5.8 16l.8-4.7L3.2 8l4.7-.7z"/>',
            manageRolesBtn: '<circle cx="6" cy="6" r="2"/><circle cx="14" cy="10" r="2"/><circle cx="7" cy="14" r="2"/><path d="M8 6h9M3 10h9M9 14h8"/>'
        };

        const tile = (button, key) => {
            if (!button || button.dataset.zgcTile) return;
            const icon = document.createElement("span");
            icon.className = "zgc-tile-icon";
            icon.setAttribute("aria-hidden", "true");
            icon.innerHTML = `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[key] || ""}</svg>`;
            const label = document.createElement("span");
            label.className = "zgc-tile-label";
            Array.from(button.childNodes).forEach(node => label.appendChild(node));
            button.append(icon, label);
            button.classList.add("zgc-tile");
            button.dataset.zgcTile = "1";
        };

        ["addTaskBtn", "addDateLineBtn", "addHLineBtn", "addTextBtn", "templateBtn", "manageRolesBtn"].forEach(id => tile(document.getElementById(id), id));
        tile(document.querySelector(".zg-pre-btn"), "presets");

        /* ขนาดโดยรวม: [ − | 100% | + ] เป็นปุ่มย่อยในกรอบเดียว */
        const zoomOut = document.getElementById("zoomOutBtn");
        const zoomText = document.getElementById("zoomText");
        const zoomIn = document.getElementById("zoomInBtn");
        if (zoomOut && zoomText && zoomIn) {
            const seg = document.createElement("div");
            seg.className = "zgc-seg";
            zoomOut.parentNode.insertBefore(seg, zoomOut);
            seg.append(zoomOut, zoomText, zoomIn);
            zoomOut.title = zoomOut.title || "ย่อ";
            zoomIn.title = zoomIn.title || "ขยาย";
        }

        /* ใส่ป้ายกลุ่มให้โปรแกรมอ่านหน้าจอ */
        [[plan, "แผน"], [history, "ย้อนกลับ / ทำซ้ำ"], [insert, "เพิ่ม"]].forEach(([el, label]) => {
            if (!el) return;
            el.classList.add("zgc-group");
            el.setAttribute("role", "group");
            el.setAttribute("aria-label", label);
        });

        /* ปุ่มหลักที่ใช้บ่อยที่สุด */
        const addTask = document.getElementById("addTaskBtn");
        /* v6: ทุกปุ่มขาวเท่ากัน — เขียวเฉพาะตอนใช้งาน (ดูส่วน "สถานะปุ่ม") */

        second.dataset.zgcDone = "1";

        /* ความสูงแถบเปลี่ยน → ให้กระดานคำนวณตำแหน่งใหม่ */
        window.dispatchEvent(new Event("resize"));
    }


    /* =====================================================
       2) หน้าตา
    ===================================================== */

    const style = document.createElement("style");
    style.id = "zg-chrome-skin";
    style.textContent = `
:root {
    --zgc-ink: #1f2a24;
    --zgc-ink-2: #3b4640;
    --zgc-muted: #6b7670;
    --zgc-faint: #96a19b;
    --zgc-line: rgba(30, 41, 36, .10);
    --zgc-line-2: rgba(30, 41, 36, .16);
    --zgc-surface: #ffffff;
    --zgc-panel: #f5f7f6;
    --zgc-hover: #eef2f0;
    --zgc-brand: #2f7442;
    --zgc-brand-2: #276338;
    --zgc-brand-soft: #e9f3ec;
    --zgc-brand-line: rgba(47, 116, 66, .28);
    --zgc-danger: #b5372f;
    --zgc-danger-soft: #fbeceb;
    --zgc-ring: 0 0 0 3px rgba(47, 116, 66, .22);
    --zgc-shadow-pop: 0 1px 2px rgba(20, 34, 27, .06), 0 12px 32px -12px rgba(20, 34, 27, .30);
    --zgc-ease: cubic-bezier(.22, 1, .36, 1);
    --zgc-h: 30px;
}

/* ---------- แถบเครื่องมือ ---------- */

/*
    v5: ริบบอน — บล็อกกลาง (＋งาน … ±เดือน) สูงเต็ม 2 แถว · ซ้าย/ขวา เป็น 2 แถวเล็ก
    ความสูง: แถวเล็ก 38px × 2 + ระยะ 6px = 82px · ขอบแถบ 6px → แถบสูง 94px
    ระยะ: ระหว่างช่วง 10px · ระหว่างกลุ่ม 8px · ในกลุ่ม 2px · ปุ่มริบบอนกว้างเท่ากัน
*/
html body .workspace-toolbar.zgc-ribbon {
    height: auto !important;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: stretch;
    column-gap: 8px;
    padding: 6px 12px !important;
    overflow: visible;
}
html body .workspace-toolbar .zgc-empty-row { display: none !important; }

html body .workspace-toolbar .zgc-col { display: flex; flex-direction: column; justify-content: space-between; gap: 6px; min-width: 0; }
html body .workspace-toolbar .zgc-line { display: flex; align-items: center; gap: 8px; height: 38px; }
html body .workspace-toolbar .zgc-col--left .zgc-line > .toolbar-group:first-child { flex: 1 1 auto; }
html body .workspace-toolbar .zgc-col--right .zgc-line > * { flex: 1 1 auto; }
html body .workspace-toolbar .zgc-col--left .zgc-line > .toolbar-group,
html body .workspace-toolbar .zgc-col--right .zgc-line > * { height: 38px; box-sizing: border-box; }

/* บล็อกกลาง */
html body .workspace-toolbar .zgc-col--mid { flex-direction: row; align-items: stretch; gap: 8px; }
html body .workspace-toolbar .zgc-col--mid > .toolbar-group { height: auto; align-items: stretch; padding: 4px; }
html body .workspace-toolbar .zgc-col--mid > .toolbar-group--insert { flex: 1 1 auto; display: flex; gap: 2px; }
/* กว้างพอ → การ์ดกว้างเท่ากันทุกใบ (สมดุล) */
html body .workspace-toolbar .zgc-col--mid > .toolbar-group--insert > .zgc-tile { flex: 1 1 0; min-width: max-content; }
/* ระยะห่างระหว่างการ์ดเท่ากันทุกช่อง (ปุ่มที่ย้ายมามีระยะขอบเดิมติดมา → ล้างทิ้ง) */
html body .workspace-toolbar .toolbar-group > button,
html body .workspace-toolbar .toolbar-group--insert > * { margin: 0 !important; }


/* ปุ่มริบบอน: ไอคอนบน · ชื่อล่าง */
html body .workspace-toolbar .zgc-tile {
    height: auto !important;
    min-height: 0 !important;
    display: flex !important;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 6px 4px !important;
    border-radius: 10px;
    line-height: 1.1;
}
html body .workspace-toolbar .zgc-tile-icon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: var(--zgc-brand-soft); color: var(--zgc-brand); transition: background-color .15s ease, transform .2s var(--zgc-ease); }
html body .workspace-toolbar .zgc-tile-label { display: block; font-size: 12px; font-weight: 500; white-space: nowrap; color: var(--zgc-ink-2); }
html body .workspace-toolbar .zgc-tile-label::first-letter { font-size: 0; }
/* ทุกปุ่มเป็นการ์ดของตัวเอง (พื้นขาว ขอบบาง) → บล็อกดูเต็ม ไม่โล่ง */
html body .workspace-toolbar .zgc-col--mid .zgc-tile:not(.zgc-primary) {
    background: var(--zgc-surface);
    border: 1px solid var(--zgc-line) !important;
    box-shadow: 0 1px 1px rgba(20, 34, 27, .03);
}
html body .workspace-toolbar .zgc-col--mid .zgc-tile:not(.zgc-primary):hover {
    border-color: var(--zgc-brand-line) !important;
    box-shadow: 0 2px 6px -2px rgba(20, 34, 27, .14);
}
html body .workspace-toolbar .zgc-tile:hover .zgc-tile-icon { background: #d9ecdf; transform: translateY(-1px); }
html body .workspace-toolbar .zgc-tile.zgc-primary { background: var(--zgc-brand); }
html body .workspace-toolbar .zgc-tile.zgc-primary .zgc-tile-icon { color: #ffffff; background: rgba(255, 255, 255, .16); }
html body .workspace-toolbar .zgc-tile.zgc-primary .zgc-tile-label { color: #ffffff; font-weight: 600; }

/*
    ช่วงวันที่ = การ์ดเดียว 2 บรรทัด (จัดเป็นตาราง)
      [ วันเริ่ม ] → [ วันสิ้นสุด ]        [ 🔗 งานอยู่กับที่ ]
      [ + − ]   เพิ่ม/ลด เดือน   [ − + ]   [ ⟫⟪ ซ่อน/รวบวัน ]
    ปุ่มเดือนฝั่งซ้ายอยู่ใต้วันเริ่ม (ขยาย/ลดต้นแผน) · ฝั่งขวาอยู่ใต้วันสิ้นสุด (ลด/ขยายท้ายแผน)
*/
html body .workspace-toolbar .zgc-col--mid > .zgc-group--timeline {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: auto auto;
    align-content: center;
    column-gap: 8px;
    padding: 4px 8px !important;
}
html body .workspace-toolbar .zgc-hidden-wrap { display: none !important; }
html body .workspace-toolbar .zgc-range { display: grid; grid-template-rows: 34px 30px; row-gap: 6px; align-items: center; }
html body .workspace-toolbar .zgc-range__dates { display: flex; align-items: center; gap: 6px; }
html body .workspace-toolbar .zgc-range__dates .toolbar-date-input { width: 124px; height: 34px; padding: 0 8px; }
html body .workspace-toolbar .zgc-range__arrow { color: var(--zgc-faint); font-size: 13px; line-height: 1; }
html body .workspace-toolbar .zgc-range__months { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 6px; }
/* ปุ่ม ±เดือน ยืดเต็มครึ่งของตัวเอง (ใต้ช่องวันที่พอดี) → แถวดูเต็ม ไม่โล่ง */
html body .workspace-toolbar .zgc-range__months > .zgc-mpair { justify-self: stretch; }
html body .workspace-toolbar .zgc-range__months .zgc-mpair > button { flex: 1 1 0; }
html body .workspace-toolbar .zgc-range__months .zg-month__label {
    order: 0;
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    background: none !important;
    font-size: 11px;
    font-weight: 500;
    color: var(--zgc-muted);
    white-space: nowrap;
    text-align: center;
}
html body .workspace-toolbar .zgc-mpair {
    display: inline-flex;
    align-items: stretch;
    height: 28px;
    border: 1px solid var(--zgc-line-2);
    border-radius: 9px;
    background: var(--zgc-surface);
    overflow: hidden;
}
html body .workspace-toolbar .zgc-mpair > button {
    height: 100% !important;
    min-height: 0 !important;
    min-width: 30px !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: var(--zgc-ink-2);
    font-weight: 600;
}
html body .workspace-toolbar .zgc-mpair > button + button { border-left: 1px solid var(--zgc-line) !important; }
html body .workspace-toolbar .zgc-mpair > button:hover { background: var(--zgc-hover) !important; color: var(--zgc-brand); }

html body .workspace-toolbar .zgc-range__side { display: grid; grid-template-rows: 34px 30px; row-gap: 6px; }
html body .workspace-toolbar .zgc-range__side > button {
    height: 100% !important;
    min-height: 0 !important;
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 12px !important;
    border: 1px solid var(--zgc-line-2) !important;
    border-radius: 9px;
    background: var(--zgc-surface) !important;
    color: var(--zgc-ink-2);
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
}
html body .workspace-toolbar .zgc-range__side > button:hover { border-color: var(--zgc-brand-line) !important; color: var(--zgc-ink); }
html body .workspace-toolbar .zgc-range__side > .zg-link-btn[aria-pressed="true"] {
    background: var(--zgc-brand-soft) !important;
    border-color: var(--zgc-brand-line) !important;
    color: var(--zgc-brand);
    font-weight: 600;
}

/* กลุ่มเล็กฝั่งซ้าย (ไฟล์ · รูปภาพ): ปุ่มย่อยเป็นชิปขาวในกรอบกลุ่ม */
html body .workspace-toolbar .zgc-group--output,
html body .workspace-toolbar .zgc-group--library { gap: 4px; padding: 3px; }
html body .workspace-toolbar .zgc-group--output > button,
html body .workspace-toolbar .zgc-group--library > button {
    height: 30px;
    padding: 0 10px !important;
    border: 1px solid var(--zgc-line-2) !important;
    border-radius: 8px;
    background: var(--zgc-surface) !important;
    box-shadow: 0 1px 1px rgba(20, 34, 27, .04) !important;
    color: var(--zgc-ink-2);
    font-weight: 500;
}
html body .workspace-toolbar .zgc-group--output > button:hover,
html body .workspace-toolbar .zgc-group--library > button:hover {
    border-color: var(--zgc-brand-line) !important;
    color: var(--zgc-ink);
    box-shadow: 0 2px 6px -2px rgba(20, 34, 27, .16) !important;
}
html body .workspace-toolbar .zgc-col--left .zgc-line > .zgc-group--output,
html body .workspace-toolbar .zgc-col--left .zgc-line > .zgc-group--library { flex: 1 1 auto; }
html body .workspace-toolbar .zgc-col--left .zgc-group--output > button,
html body .workspace-toolbar .zgc-col--left .zgc-group--library > button { flex: 1 1 auto; justify-content: center; }

/* [ − | 100% | + ] */
html body .workspace-toolbar .zgc-seg {
    display: inline-flex;
    align-items: stretch;
    height: 30px;
    border: 1px solid var(--zgc-line-2);
    border-radius: 9px;
    background: var(--zgc-surface);
    overflow: hidden;
    box-shadow: 0 1px 1px rgba(20, 34, 27, .04);
}
html body .workspace-toolbar .zgc-seg > button {
    width: 32px !important;
    min-width: 32px !important;
    height: 100% !important;
    min-height: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: var(--zgc-ink-2);
    font-size: 15px;
    font-weight: 600;
}
html body .workspace-toolbar .zgc-seg > button:hover { background: var(--zgc-hover) !important; color: var(--zgc-brand); }
html body .workspace-toolbar .zgc-seg > .toolbar-zoom-text {
    display: grid;
    place-items: center;
    min-width: 52px;
    padding: 0 6px;
    border-left: 1px solid var(--zgc-line);
    border-right: 1px solid var(--zgc-line);
    font-size: 12px;
}

/* ค้นหาชิดขวา */
html body .workspace-toolbar .zg-toolbar-right {
    position: static;
    flex-direction: row;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--zgc-line);
    border-radius: 12px;
    background: var(--zgc-panel);
}
html body .workspace-toolbar .zg-toolbar-right .zg-tr-line { display: contents; }
html body .workspace-toolbar .zg-toolbar-right .toolbar-search { flex: 1 1 160px; min-width: 140px; margin-left: 2px; }
html body .workspace-toolbar .zg-toolbar-right .zg-tr-line--bottom { order: -1; }
html body .workspace-toolbar .zgc-col--right .zgc-group--view { justify-content: flex-start; }
html body .workspace-toolbar .zgc-col--right .toolbar-group--zoom { flex: 1 1 auto; gap: 2px; }
html body .workspace-toolbar .zgc-col--right .toolbar-group--zoom .toolbar-label { display: block !important; margin-right: auto; padding-left: 8px; }
html body .workspace-toolbar .zgc-col--right .toolbar-group--zoom .toolbar-zoom-text { flex: 0 0 auto; min-width: 44px; }
/* [ − | 120% | + ] ยืดเต็มที่เหลือของกลุ่ม */
html body .workspace-toolbar .zgc-col--right .toolbar-group--zoom .toolbar-label { margin-right: 6px; }
html body .workspace-toolbar .zgc-col--right .toolbar-group--zoom .zgc-seg { flex: 1 1 auto; }
html body .workspace-toolbar .zgc-col--right .zgc-seg > button { flex: 1 1 0; width: auto !important; }
html body .workspace-toolbar .zgc-col--right .zgc-seg > .toolbar-zoom-text { flex: 1.2 1 0; }
html body .workspace-toolbar.zgc-ribbon .plan-select { max-width: 158px; }
html body .workspace-toolbar.zgc-ribbon .zg-save-status { font-size: 9px; padding: 0 4px; gap: 3px; }
html body .workspace-toolbar .zg-save-status { font-size: 9.5px; }
html body .workspace-toolbar.zgc-ribbon .zgc-col--left .toolbar-control { padding: 0 5px; }
html body .workspace-toolbar.zgc-ribbon .zg-toolbar-right .toolbar-control { padding: 0 7px; }
html body .workspace-toolbar.zgc-ribbon .zg-toolbar-right .toolbar-search { min-width: 120px; flex-basis: 130px; }
/* ตรวจคำผิด: ป้าย "เปิดอยู่" → จุดเขียวเล็ก (ประหยัดที่ · ยังรู้สถานะ) */
html body .workspace-toolbar.zgc-ribbon #toolbarSpellcheckBtn .zg-spell-state { display: none; }
html body .workspace-toolbar.zgc-ribbon #toolbarSpellcheckBtn.zg-spell-on::after {
    content: "";
    width: 7px;
    height: 7px;
    margin-left: 6px;
    border-radius: 50%;
    background: var(--zgc-brand);
    box-shadow: 0 0 0 2px var(--zgc-brand-soft);
}
/* ±เดือน: ลูกศรตกแต่งซ่อน (ปุ่ม + / − ยังครบ) */
html body .workspace-toolbar.zgc-ribbon .zg-month__arrow { display: none; }

/*
    จอไม่กว้างพอริบบอน → กลุ่มเรียงต่อกันแล้วขึ้นบรรทัดเอง (ปุ่มริบบอนกลับเป็นปุ่มแถวปกติ)
*/
@media (max-width: 1863px) {
    html body .workspace-toolbar.zgc-ribbon { display: flex; flex-direction: row; flex-wrap: wrap; align-content: flex-start; gap: 6px 8px; }
    html body .workspace-toolbar .zgc-col--left .zgc-line > .toolbar-group:first-child,
    html body .workspace-toolbar .zgc-col--right .zgc-line > * { flex: 0 0 auto; }
    html body .workspace-toolbar .zgc-col--mid > .toolbar-group--insert > .zgc-tile { flex: 0 0 auto; min-width: 0; }
    html body .workspace-toolbar .zgc-col--mid > .toolbar-group { flex: 0 0 auto !important; }
    html body .workspace-toolbar .zgc-col--left .zgc-line > .zgc-group--output,
    html body .workspace-toolbar .zgc-col--left .zgc-line > .zgc-group--library,
    html body .workspace-toolbar .zgc-col--left .zgc-group--output > button,
    html body .workspace-toolbar .zgc-col--left .zgc-group--library > button { flex: 0 0 auto; }
    html body .workspace-toolbar .zgc-col--mid .zgc-tile:not(.zgc-primary) { background: transparent; border-color: transparent !important; box-shadow: none; }
    html body .workspace-toolbar .zgc-tile-icon { background: transparent; }
    html body .workspace-toolbar .zgc-col,
    html body .workspace-toolbar .zgc-line,
    html body .workspace-toolbar .zgc-col--mid { display: contents; }
    html body .workspace-toolbar .zgc-col--mid > .toolbar-group { height: 38px; padding: 3px; }
    html body .workspace-toolbar .zgc-col--mid > .toolbar-group--insert { display: flex; }
    html body .workspace-toolbar .zgc-tile { flex-direction: row; gap: 4px; padding: 0 8px !important; height: 30px !important; }
    html body .workspace-toolbar .zgc-tile-icon { width: 18px; height: 18px; }
    html body .workspace-toolbar .zgc-tile-icon svg { width: 16px; height: 16px; }
    /* ช่วงวันที่บรรทัดเดียว */
    html body .workspace-toolbar .zgc-col--mid > .zgc-group--timeline { display: flex; align-items: center; gap: 6px; padding: 3px 6px !important; }
    html body .workspace-toolbar .zgc-range,
    html body .workspace-toolbar .zgc-range__side { display: flex; align-items: center; gap: 6px; }
    html body .workspace-toolbar .zgc-range__months { display: flex; gap: 4px; }
    html body .workspace-toolbar .zgc-range__dates .toolbar-date-input { height: 30px; width: 118px; }
    html body .workspace-toolbar .zgc-range__side > button { height: 30px !important; }
    html body .workspace-toolbar .toolbar-label,
    html body .workspace-toolbar .zg-month__label { display: none !important; }
    html body .workspace-toolbar .zg-toolbar-right .toolbar-search { flex: 0 1 180px; }
}

html body .workspace-toolbar {
    background: #fbfcfb;
    border-bottom: 1px solid var(--zgc-line);
    box-shadow: none;
}
html body .toolbar-row { gap: 8px; align-items: center; }

html body .workspace-toolbar .toolbar-group {
    background: var(--zgc-panel);
    border: 1px solid var(--zgc-line);
    border-radius: 12px;
    padding: 3px;
    gap: 2px;
    box-shadow: none;
}
/* กลุ่มซ้อนกลุ่ม (ช่วงวันที่ / มุมมอง) → กลุ่มในไม่มีกรอบของตัวเอง */
html body .workspace-toolbar .zgc-group > .toolbar-group {
    background: transparent;
    border: 0;
    padding: 0;
    margin: 0;
}
html body .workspace-toolbar .zgc-group > .toolbar-group + .toolbar-group {
    margin-left: 4px;
    padding-left: 6px;
    border-left: 1px solid var(--zgc-line);
    border-radius: 0;
}
html body .workspace-toolbar .zgc-group { display: inline-flex; align-items: center; }

/* ปุ่มทั้งหมดในแถบ: สูงเท่ากัน เรียบ ไม่มีกรอบ — ชี้แล้วพื้นขาวลอยขึ้นนิด */
html body .workspace-toolbar .toolbar-control,
html body .workspace-toolbar .toolbar-square-btn {
    height: var(--zgc-h);
    min-height: var(--zgc-h);
    border: 1px solid transparent;
    border-radius: 9px;
    background: transparent;
    color: var(--zgc-ink-2);
    font-weight: 500;
    box-shadow: none;
    transition: background-color .15s ease, box-shadow .15s ease, color .15s ease;
}
html body .workspace-toolbar .toolbar-square-btn { min-width: var(--zgc-h); padding: 0; }
html body .workspace-toolbar .toolbar-control { padding: 0 10px; }
html body .workspace-toolbar .toolbar-control:hover,
html body .workspace-toolbar .toolbar-square-btn:hover {
    background: var(--zgc-surface);
    color: var(--zgc-ink);
    box-shadow: 0 1px 2px rgba(20, 34, 27, .08), 0 0 0 1px var(--zgc-line);
}
html body .workspace-toolbar .toolbar-control:active,
html body .workspace-toolbar .toolbar-square-btn:active { background: var(--zgc-hover); box-shadow: none; }
html body .workspace-toolbar .toolbar-control:focus-visible,
html body .workspace-toolbar .toolbar-square-btn:focus-visible { outline: none; box-shadow: var(--zgc-ring); }
html body .workspace-toolbar button:disabled { opacity: .38; }

/* ปุ่มหลัก: ＋ งาน */
html body .workspace-toolbar .zgc-primary {
    background: var(--zgc-brand);
    color: #ffffff;
    font-weight: 600;
}
html body .workspace-toolbar .zgc-primary:hover { background: var(--zgc-brand-2); color: #ffffff; box-shadow: 0 2px 8px -2px rgba(47, 116, 66, .45); }

/* ป้ายเล็กในกลุ่ม (วันเริ่มต้น / วันสิ้นสุด / ขนาดโดยรวม) */
html body .workspace-toolbar .toolbar-label {
    color: var(--zgc-muted);
    font-size: 11px;
    font-weight: 500;
    padding: 0 2px 0 6px;
}

/* ช่องวันที่ */
html body .workspace-toolbar .toolbar-date-input {
    height: var(--zgc-h);
    border: 1px solid var(--zgc-line-2);
    border-radius: 9px;
    background: var(--zgc-surface);
    color: var(--zgc-ink);
    font-variant-numeric: tabular-nums;
    padding: 0 8px;
}
html body .workspace-toolbar .toolbar-date-input:focus { outline: none; border-color: var(--zgc-brand); box-shadow: var(--zgc-ring); }

/* เพิ่ม/ลด เดือน: จากสองบรรทัด → บรรทัดเดียว (ป้ายอยู่หน้าปุ่ม) */
html body .workspace-toolbar .zg-month {
    flex-direction: row !important;
    align-items: center;
    gap: 6px;
    height: auto;
}
html body .workspace-toolbar .zg-month__label {
    order: -1;
    position: static !important;
    font-size: 11px;
    font-weight: 500;
    color: var(--zgc-muted);
    white-space: nowrap;
    padding: 0 2px 0 6px !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
}
html body .workspace-toolbar .zg-month__row { display: flex; align-items: center; gap: 2px; height: auto; }
html body .workspace-toolbar .zg-month__btn { height: 26px !important; min-height: 26px !important; min-width: 26px; padding: 0 !important; }
html body .workspace-toolbar .zg-month__arrow { color: var(--zgc-faint); font-size: 10px; }
html body .workspace-toolbar .zg-month__divider { height: 16px; background: var(--zgc-line-2); margin: 0 4px; }

html body .workspace-toolbar .toolbar-zoom-text { min-width: 40px; text-align: center; color: var(--zgc-ink); font-variant-numeric: tabular-nums; font-weight: 600; }

/* ปุ่มเลือกแผน */
html body .workspace-toolbar .plan-select {
    background: var(--zgc-surface);
    border: 1px solid var(--zgc-line-2);
    font-weight: 600;
    color: var(--zgc-ink);
    min-width: 96px;
    max-width: 220px;
    overflow: hidden;
    gap: 4px;
}
/* ชื่อแผนยาว → ตัดเป็น … ในกรอบ (ชี้ค้างดูชื่อเต็ม) */
html body .workspace-toolbar .plan-select .plan-select-name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
}
html body .workspace-toolbar .plan-select .toolbar-caret { flex: none; }

/* ค้นหา (ขวาบน) */
html body .toolbar-search {
    height: var(--zgc-h);
    border: 1px solid var(--zgc-line-2);
    border-radius: 10px;
    background: var(--zgc-surface);
}
html body .toolbar-search:focus-within { border-color: var(--zgc-brand); box-shadow: var(--zgc-ring); }

/* ---------- เมนู / แผงตั้งค่า ทุกแบบ ---------- */

html body .object-menu,
html body .category-menu,
html body .row-action-menu {
    border: 1px solid var(--zgc-line);
    border-radius: 14px;
    background: var(--zgc-surface);
    box-shadow: var(--zgc-shadow-pop);
    padding: 12px;
    color: var(--zgc-ink);
    font-size: 13px;
}
html body .object-menu { width: 252px; gap: 10px; }
html body .category-menu { width: 236px; }
html body .row-action-menu { width: 252px; }
html body .category-menu.open,
html body .object-menu,
html body .row-action-menu { animation: zgcPop .16s var(--zgc-ease); }
@keyframes zgcPop { from { opacity: 0; transform: translateY(-3px) scale(.985); } to { opacity: 1; transform: none; } }

/* หัวเมนู */
html body .category-menu .menu-title,
html body .zg-row-style__title {
    font-size: 13px;
    font-weight: 700;
    color: var(--zgc-ink);
    margin: 2px 2px 10px;
}

/* ป้ายหัวข้อแต่ละส่วน */
html body .object-menu-label,
html body .zg-row-style__label,
html body .zg-ct-label,
html body .ncd-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--zgc-muted);
    letter-spacing: .01em;
    margin-bottom: 6px;
}

/* แบ่งส่วนด้วยเส้นบาง ๆ (ไม่เป็นกล่องซ้อนกล่อง) */
html body .object-menu > .object-menu-section + .object-menu-section,
html body .object-menu > .object-menu-section + .object-menu-row,
html body .object-menu > .object-menu-row + .object-menu-actions,
html body .object-menu > .object-menu-section + .object-menu-actions {
    padding-top: 10px;
    border-top: 1px solid var(--zgc-line);
}

/* ปุ่มใหญ่ด้านบน: แก้วันที่ · แก้ข้อความ · เพิ่มงานในหมวด/แถวนี้ */
html body .zg-date-menu-btn,
html body .zg-text-menu-btn,
html body .zg-task-menu-btn {
    width: 100%;
    min-height: 36px;
    margin: 0;
    padding: 7px 12px;
    border: 1px solid transparent;
    border-radius: 10px;
    background: var(--zgc-brand-soft);
    color: var(--zgc-brand);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.35;
    text-align: center;
    cursor: pointer;
    transition: background-color .15s ease, border-color .15s ease;
}
html body .zg-date-menu-btn:hover,
html body .zg-text-menu-btn:hover,
html body .zg-task-menu-btn:hover { background: #ddeee2; border-color: var(--zgc-brand-line); }
/* แก้ข้อความ = งานรอง → ขาวมีกรอบ */
html body .zg-text-menu-btn { background: var(--zgc-surface); border-color: var(--zgc-line-2); color: var(--zgc-ink-2); }
html body .zg-text-menu-btn:hover { background: var(--zgc-hover); border-color: var(--zgc-line-2); }
html body .zg-date-menu-btn + .zg-text-menu-btn { margin-top: -4px; }

/* แท็บ ทั่วไป / รูปแบบ / รูปภาพ */
html body .zg-menu-tabs {
    padding: 3px;
    border-radius: 10px;
    background: var(--zgc-panel);
    border: 1px solid var(--zgc-line);
}
html body .zg-menu-tabs button {
    height: 28px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--zgc-muted);
}
html body .zg-menu-tabs button.is-on {
    background: var(--zgc-surface);
    color: var(--zgc-ink);
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(20, 34, 27, .10), 0 0 0 1px var(--zgc-line);
}

/* select / ช่องพิมพ์ */
html body .object-menu-select,
html body .object-menu-input,
html body .object-menu-textarea,
html body .object-menu select,
html body .category-menu select {
    min-height: 34px;
    border: 1px solid var(--zgc-line-2);
    border-radius: 9px;
    background-color: var(--zgc-surface);
    color: var(--zgc-ink);
    font: inherit;
    font-size: 13px;
    padding: 0 10px;
    transition: border-color .15s ease, box-shadow .15s ease;
}
html body .object-menu-textarea { padding: 8px 10px; }
html body .object-menu-select:focus,
html body .object-menu-input:focus,
html body .object-menu-textarea:focus { outline: none; border-color: var(--zgc-brand); box-shadow: var(--zgc-ring); }
html body .object-menu-select--compact { min-height: 30px; font-size: 12px; }

/* ช่องสี: ตารางสี่เหลี่ยมมุมมน ขอบใน · ที่เลือกอยู่มีวงเขียว */
html body .object-menu-swatches,
html body .zg-row-style__swatches,
html body .ncd-swatches {
    display: grid !important;
    grid-template-columns: repeat(8, 1fr);
    gap: 6px;
}
html body .object-menu-swatch,
html body .zg-row-style__swatch,
html body .ncd-swatch {
    width: auto !important;
    height: auto !important;
    aspect-ratio: 1;
    min-width: 0;
    border: 0 !important;
    border-radius: 7px !important;
    box-shadow: inset 0 0 0 1px rgba(20, 34, 27, .12);
    cursor: pointer;
    transition: transform .12s var(--zgc-ease), box-shadow .12s ease;
}
html body .object-menu-swatch:hover,
html body .zg-row-style__swatch:hover,
html body .ncd-swatch:hover { transform: scale(1.08); }
html body .object-menu-swatch.active,
html body .zg-row-style__swatch.active,
html body .ncd-swatch.active,
html body .ncd-swatch.selected {
    box-shadow: inset 0 0 0 1px rgba(20, 34, 27, .12), 0 0 0 2px #ffffff, 0 0 0 4px var(--zgc-brand);
}

/* เลือกสีเอง (input color) */
html body .object-menu-color-input,
html body .zg-row-style__custom input[type="color"],
html body .category-menu .menu-color-row input[type="color"] {
    height: 30px;
    border: 1px solid var(--zgc-line-2);
    border-radius: 8px;
    background: var(--zgc-surface);
    padding: 3px;
    cursor: pointer;
}
html body .object-menu-color-input { width: 100%; margin-top: 8px; }
html body .category-menu .menu-color-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 2px;
    font-size: 12px;
    font-weight: 600;
    color: var(--zgc-ink-2);
}
html body .category-menu .menu-color-row input[type="color"] { width: 44px; }
html body .zg-row-style__custom { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
html body .zg-row-style__custom input[type="color"] { width: 44px; }

/* ปุ่มรอง (ใช้สีตามบทบาท / ใช้ทั้งหมวด / คืนค่า …) */
html body .zg-objcolor-reset,
html body .zg-row-style__actions button,
html body .zg-op-reset,
html body .zg-ct-size button,
html body .zg-timg-btn {
    min-height: 30px;
    border: 1px solid var(--zgc-line-2);
    border-radius: 9px;
    background: var(--zgc-surface);
    color: var(--zgc-ink-2);
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color .15s ease, border-color .15s ease;
}
html body .zg-objcolor-reset:hover:not(:disabled),
html body .zg-row-style__actions button:hover,
html body .zg-op-reset:hover,
html body .zg-ct-size button:hover,
html body .zg-timg-btn:hover { background: var(--zgc-hover); }
html body .zg-objcolor-reset { width: 100%; margin-top: 8px; }
html body .zg-objcolor-reset:disabled { opacity: .45; cursor: default; }
html body .zg-objcolor-hint,
html body .zg-timg-hint { font-size: 11px; color: var(--zgc-faint); margin-top: 6px; line-height: 1.45; }

/* ความโปร่งใส: แถบเลื่อนสีแบรนด์ */
html body .zg-op-row { display: flex; align-items: center; gap: 10px; }
html body .zg-op-track input[type="range"] { accent-color: var(--zgc-brand); width: 100%; }
html body .zg-op-val { min-width: 38px; text-align: right; font-weight: 700; color: var(--zgc-brand); font-variant-numeric: tabular-nums; }
html body .zg-op-reset { min-width: 30px; padding: 0; }

/* ไอคอน */
html body .object-menu-icons { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; }
html body .object-menu-icon-btn {
    aspect-ratio: 1;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    transition: background-color .12s ease;
}
html body .object-menu-icon-btn:hover { background: var(--zgc-hover); }
html body .object-menu-icon-btn.active { background: var(--zgc-brand-soft); border-color: var(--zgc-brand-line); }

/* แถว: แสดงหัวข้อ + ชั้น · ปักซ้าย/ขวา */
html body .object-menu-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
html body .object-menu-checkbox { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--zgc-ink-2); cursor: pointer; }
html body .object-menu-checkbox input,
html body .object-menu input[type="checkbox"] { accent-color: var(--zgc-brand); width: 16px; height: 16px; }
html body .object-menu-stepper { display: inline-flex; align-items: center; gap: 4px; }
html body .object-menu-step-btn {
    width: 26px;
    height: 26px;
    border: 1px solid var(--zgc-line-2);
    border-radius: 7px;
    background: var(--zgc-surface);
    color: var(--zgc-ink-2);
    cursor: pointer;
}
html body .object-menu-step-btn:hover { background: var(--zgc-hover); }

/* ทำสำเนา / ลบ */
html body .object-menu-actions { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
html body .object-menu-duplicate-btn,
html body .object-menu-delete-btn,
html body .delete-category-btn,
html body .row-action-item {
    min-height: 34px;
    border-radius: 10px;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color .15s ease, border-color .15s ease;
}
html body .object-menu-duplicate-btn {
    border: 1px solid var(--zgc-line-2);
    background: var(--zgc-surface);
    color: var(--zgc-ink-2);
}
html body .object-menu-duplicate-btn:hover { background: var(--zgc-hover); }
html body .object-menu-delete-btn,
html body .delete-category-btn {
    border: 1px solid transparent;
    background: var(--zgc-danger-soft);
    color: var(--zgc-danger);
    padding: 0 14px;
}
html body .object-menu-delete-btn:hover,
html body .delete-category-btn:hover { background: #f6d9d6; }
html body .delete-category-btn { width: 100%; margin-top: 10px; }

/* เมนูแถว: รายการคำสั่ง */
html body .row-action-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    border: 0;
    background: transparent;
    color: var(--zgc-ink-2);
    text-align: left;
    font-weight: 500;
}
html body .row-action-item:hover { background: var(--zgc-hover); }
html body .row-action-item.row-delete-item { color: var(--zgc-danger); }
html body .row-action-item.row-delete-item:hover { background: var(--zgc-danger-soft); }

/* สีแถวใหม่ / ตั้งค่าสีแถว: พื้นอ่อนแยกส่วน ไม่ใช้เส้นประ */
html body .zg-row-style__new {
    padding: 10px;
    border: 0;
    border-radius: 12px;
    background: var(--zgc-panel);
}
html body .zg-row-style { padding-top: 10px; border-top: 1px solid var(--zgc-line); margin-top: 6px; }
html body .zg-row-style__field + .zg-row-style__field { margin-top: 12px; }
html body .zg-row-style__preview {
    border: 1px solid var(--zgc-line);
    border-radius: 10px;
    padding: 8px 10px;
    background: var(--zgc-surface);
    margin-bottom: 10px;
}
html body .zg-row-style__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 12px; }
html body .zg-row-style__actions button:last-child:nth-child(odd) { grid-column: 1 / -1; }

/* หมวดหมู่: ตำแหน่งข้อความ 3×3 + ขนาดตัวอักษร */
html body .zg-cat-text { padding-top: 10px; border-top: 1px solid var(--zgc-line); margin-top: 10px; }
html body .zg-ct-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 12px; }
html body .zg-ct-grid button {
    height: 30px;
    border: 1px solid var(--zgc-line);
    border-radius: 8px;
    background: var(--zgc-surface);
    color: var(--zgc-muted);
    cursor: pointer;
}
html body .zg-ct-grid button:hover { background: var(--zgc-hover); color: var(--zgc-ink); }
html body .zg-ct-grid button.is-on { background: var(--zgc-brand-soft); border-color: var(--zgc-brand-line); color: var(--zgc-brand); font-weight: 700; }
html body .zg-ct-size { display: flex; align-items: center; gap: 4px; }
html body .zg-ct-size button { min-width: 34px; padding: 0 6px; }
html body .zg-ct-size span { flex: 1; text-align: center; font-weight: 700; color: var(--zgc-brand); font-variant-numeric: tabular-nums; }
html body .zg-ct-size button.is-on { background: var(--zgc-brand-soft); border-color: var(--zgc-brand-line); color: var(--zgc-brand); }

/* โฟกัสคีย์บอร์ดในเมนู */
html body .object-menu :focus-visible,
html body .category-menu :focus-visible,
html body .row-action-menu :focus-visible { outline: none; box-shadow: var(--zgc-ring); }

/* ---------- ธีมมืด ---------- */
body.zg-dark {
    --zgc-ink: #e3e9e5;
    --zgc-ink-2: #c9d2cd;
    --zgc-muted: #9aa6a0;
    --zgc-faint: #7d8983;
    --zgc-line: rgba(255, 255, 255, .09);
    --zgc-line-2: rgba(255, 255, 255, .15);
    --zgc-surface: #222a27;
    --zgc-panel: #1b211f;
    --zgc-hover: #2b3330;
    --zgc-brand-soft: #26372d;
    --zgc-danger-soft: #3a2422;
}
body.zg-dark .workspace-toolbar { background: #171c1a; }

/* =====================================================
   สถานะปุ่มบนแถบเครื่องมือ
   ปกติ = ขาว (พื้นขาว ขอบบาง) ทุกปุ่ม
   ใช้งานอยู่ = เขียว: ตอนกด · เมนู/แผงของปุ่มนั้นเปิดอยู่ · ตัวเลือกเปิดอยู่ (ตรวจคำผิด / งานตามวันเริ่ม / ธีมมืด)
===================================================== */
html body .workspace-toolbar button.toolbar-control,
html body .workspace-toolbar button.toolbar-square-btn,
html body .workspace-toolbar .zgc-range__side > button,
html body .workspace-toolbar .zgc-col--mid .zgc-tile {
    background: var(--zgc-surface) !important;
    border: 1px solid var(--zgc-line-2) !important;
    box-shadow: 0 1px 1px rgba(20, 34, 27, .04) !important;
    color: var(--zgc-ink-2);
    transition: background-color .16s ease, border-color .16s ease, color .16s ease, box-shadow .16s ease;
}
html body .workspace-toolbar .zgc-seg > button,
html body .workspace-toolbar .zgc-mpair > button { transition: background-color .16s ease, color .16s ease; }
html body .workspace-toolbar button.toolbar-control:hover,
html body .workspace-toolbar button.toolbar-square-btn:hover,
html body .workspace-toolbar .zgc-col--mid .zgc-tile:hover {
    border-color: var(--zgc-brand-line) !important;
    color: var(--zgc-ink);
    box-shadow: 0 2px 6px -2px rgba(20, 34, 27, .16) !important;
}
html body .workspace-toolbar .zgc-tile .zgc-tile-icon { background: var(--zgc-brand-soft); color: var(--zgc-brand); }
html body .workspace-toolbar .zgc-tile .zgc-tile-label { color: var(--zgc-ink-2); font-weight: 500; }
html body .workspace-toolbar button:disabled { background: var(--zgc-panel) !important; box-shadow: none !important; }

/* ── ใช้งานอยู่ = เขียว ── */
html body .workspace-toolbar button.zgc-on:not(#zgc-x),
html body .workspace-toolbar button.zgc-flash:not(#zgc-x),
html body .workspace-toolbar button:not(:disabled):active:not(#zgc-x),
html body .workspace-toolbar button[aria-pressed="true"]:not(#zgc-x),
html body .workspace-toolbar button[aria-expanded="true"]:not(#zgc-x),
html body .workspace-toolbar #toolbarSpellcheckBtn.zg-spell-on:not(#zgc-x),
html body.zg-dark .workspace-toolbar #themeToggleBtn:not(#zgc-x) {
    background: var(--zgc-brand) !important;
    border-color: var(--zgc-brand) !important;
    color: #ffffff !important;
    box-shadow: 0 2px 8px -3px rgba(47, 116, 66, .55) !important;
}
html body .workspace-toolbar .zgc-seg > button.zgc-flash:not(#zgc-x),
html body .workspace-toolbar .zgc-seg > button:not(:disabled):active:not(#zgc-x),
html body .workspace-toolbar .zgc-mpair > button.zgc-flash:not(#zgc-x),
html body .workspace-toolbar .zgc-mpair > button:not(:disabled):active:not(#zgc-x) {
    background: var(--zgc-brand) !important;
    color: #ffffff !important;
}
html body .workspace-toolbar button.zgc-on *:not(#zgc-x),
html body .workspace-toolbar button.zgc-flash *:not(#zgc-x),
html body .workspace-toolbar button:not(:disabled):active *:not(#zgc-x),
html body .workspace-toolbar button[aria-pressed="true"] *:not(#zgc-x),
html body .workspace-toolbar button[aria-expanded="true"] *:not(#zgc-x),
html body .workspace-toolbar #toolbarSpellcheckBtn.zg-spell-on *:not(#zgc-x) { color: #ffffff !important; }
html body .workspace-toolbar .zgc-tile.zgc-on .zgc-tile-icon:not(#zgc-x),
html body .workspace-toolbar .zgc-tile.zgc-flash .zgc-tile-icon:not(#zgc-x),
html body .workspace-toolbar .zgc-tile:not(:disabled):active .zgc-tile-icon:not(#zgc-x),
html body .workspace-toolbar .zgc-tile[aria-expanded="true"] .zgc-tile-icon:not(#zgc-x) { background: rgba(255, 255, 255, .18); }
html body .workspace-toolbar #toolbarSpellcheckBtn.zg-spell-on::after:not(#zgc-x) { background: #ffffff; box-shadow: none; }
html body .workspace-toolbar .zg-fold-btn.is-on svg:not(#zgc-x),
html body .workspace-toolbar .zg-fold-btn.zgc-on svg:not(#zgc-x) { color: #ffffff; }

@media (prefers-reduced-motion: reduce) {
    html body .category-menu.open,
    html body .object-menu,
    html body .row-action-menu { animation: none; }
}
`;
    document.head.appendChild(style);

    regroupToolbar();

    /* =====================================================
       สถานะปุ่ม: เมนู/แผงของปุ่มเปิดอยู่ → ปุ่มเขียวค้าง · ปิดแล้ว → กลับขาว
       (ไม่ต้องรู้ชื่อเมนูของแต่ละปุ่ม: ดูว่ามีหน้าต่างลอยเพิ่มขึ้นมาหลังกด)
    ===================================================== */
    (function trackButtonState() {

        const bar = document.querySelector(".workspace-toolbar");
        if (!bar) return;

        const IGNORE = ".plan, .workspace-toolbar, .zg-text-layer, #companyFooter, .zg-img-toast, .zg-toast, [class*='toast']";

        function floating() {
            const list = [];
            document.querySelectorAll("body > *").forEach(el => {
                if (el.matches(IGNORE) || el.tagName === "SCRIPT" || el.tagName === "STYLE") return;
                const cs = getComputedStyle(el);
                if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return;
                if (cs.position !== "fixed" && cs.position !== "absolute") return;
                const r = el.getBoundingClientRect();
                if (r.width < 80 || r.height < 40) return;
                list.push(el);
            });
            return list;
        }

        function isShown(el) {
            if (!el.isConnected) return false;
            const cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        }

        const watching = new Map();   // button → [popups]
        let timer = 0;

        function poll() {
            watching.forEach((popups, button) => {
                if (!popups.some(isShown)) {
                    button.classList.remove("zgc-on");
                    watching.delete(button);
                }
            });
            timer = watching.size ? setTimeout(poll, 200) : 0;
        }

        let before = [];

        /* window + capture: บางปุ่มหยุดเหตุการณ์คลิกไว้เอง → ต้องฟังก่อนทุกตัว */
        const inBar = event => {
            const button = event.target instanceof Element ? event.target.closest("button") : null;
            return button && bar.contains(button) ? button : null;
        };

        /*
            ใช้ pointerdown / pointerup (บางไฟล์หยุด "click" ไว้ก่อนถึงตรงนี้ เช่น ＋งาน / เทมเพลต)
            กดลง = เขียวทันที · ปล่อย = ดูว่ามีเมนู/แผงเปิดขึ้นไหม → มี = เขียวค้าง · ไม่มี = กลับขาว
        */
        let pressed = null;

        window.addEventListener("pointerdown", event => {
            const button = inBar(event);
            if (!button || button.disabled || event.button !== 0) return;
            before = floating();
            pressed = button;
            button.classList.add("zgc-flash");
        }, true);

        const release = () => {

            const button = pressed;
            pressed = null;
            if (!button) return;

            setTimeout(() => button.classList.remove("zgc-flash"), 220);

            /* กดซ้ำตอนเปิดอยู่ = ปิด */
            if (watching.has(button)) {
                setTimeout(poll, 120);
                return;
            }

            const check = () => {
                if (watching.has(button)) return;
                const opened = floating().filter(el => !before.includes(el));
                if (opened.length) {
                    button.classList.add("zgc-on");
                    watching.set(button, opened);
                    if (!timer) timer = setTimeout(poll, 200);
                }
            };
            setTimeout(check, 150);
            setTimeout(check, 450);
        };

        window.addEventListener("pointerup", release, true);
        window.addEventListener("pointercancel", release, true);
    })();

    /*
        ความสูงแถบ = ตามจำนวนบรรทัดจริง → บอกกระดานผ่าน --toolbar-height
        ตั้งที่ body (responsive.js ล้างค่าที่ html ทุกครั้งที่ปรับขนาด → ค่าที่ body ยังอยู่)
    */
    const toolbar = document.querySelector(".workspace-toolbar");

    function syncHeight() {
        if (!toolbar) return;
        const h = Math.ceil(toolbar.getBoundingClientRect().height);
        const current = document.body.style.getPropertyValue("--toolbar-height");
        if (h > 0 && current !== `${h}px`) {
            document.body.style.setProperty("--toolbar-height", `${h}px`);
            window.dispatchEvent(new Event("resize"));
        }
    }

    if (toolbar && typeof ResizeObserver === "function") {
        new ResizeObserver(() => syncHeight()).observe(toolbar);
    }
    syncHeight();

})();
