"use strict";

/* =========================================================
   THEME.JS — สลับธีม สว่าง / มืด (ปุ่ม ◐ บน toolbar)

   - ธีมมืดใช้ CSS ทับ (override) ด้วย body.zg-dark
     ไม่แก้ style.css เดิม
   - CSS ทั้งหมดอยู่ใน @media screen → ตอนพิมพ์จะออกพื้นขาวเสมอ
   - จำค่าที่เลือกไว้ในเบราว์เซอร์ (localStorage)
   - สีที่ผู้ใช้เลือกเอง (สีหมวดหมู่ / กล่องงาน / บทบาท) ไม่ถูกเปลี่ยน

   ปุ่ม: #themeToggleBtn (ถ้าไม่มี id จะหา .theme-button แทน)
========================================================= */

(function () {

    const button =
        document.getElementById("themeToggleBtn") ||
        document.querySelector(".theme-button");

    const STORAGE_KEY = "zg-property-schedule-theme";


    /* =====================================================
       DARK CSS
    ===================================================== */

    const style =
        document.createElement("style");

    style.textContent = `
@media screen {

body.zg-dark {
    --zgd-bg: #15191a;
    --zgd-plan: #1a1f20;
    --zgd-surface: #1f2527;
    --zgd-surface-2: #272e30;
    --zgd-hover: #30383a;
    --zgd-border: #3a4441;
    --zgd-text: #e3e8e5;
    --zgd-muted: #9aa5a0;

    --grid-line-color: #56605c;
    --scroll-track: #2e3537;
    --scroll-thumb: #8a948f;
    --scroll-thumb-hover: #b0b9b4;

    color-scheme: dark;
    background: var(--zgd-bg);
    color: var(--zgd-text);
}
html:has(body.zg-dark) { background: #15191a; }


/* ---------- toolbar ---------- */

body.zg-dark .workspace-toolbar {
    background: var(--zgd-surface);
    border-bottom-color: var(--zgd-border);
    box-shadow: 0 1px 4px rgba(0, 0, 0, .4);
}
body.zg-dark .toolbar-group {
    background: var(--zgd-surface-2);
    border-color: var(--zgd-border);
}
body.zg-dark .toolbar-group--insert { background: #1f2a1d; border-color: #33452c; }
body.zg-dark .toolbar-group--date,
body.zg-dark .toolbar-group--io,
body.zg-dark .toolbar-group--view { background: #1c2630; border-color: #2c3c4a; }
body.zg-dark .toolbar-group--print { background: #2a2617; border-color: #4a4122; }

body.zg-dark .toolbar-control,
body.zg-dark .toolbar-square-btn,
body.zg-dark .toolbar-date-box,
body.zg-dark .toolbar-date-input,
body.zg-dark .toolbar-search {
    background: var(--zgd-surface-2);
    border-color: var(--zgd-border);
    color: var(--zgd-text);
}
body.zg-dark .toolbar-control:hover,
body.zg-dark .toolbar-square-btn:hover,
body.zg-dark .toolbar-date-box:hover {
    background: var(--zgd-hover);
    border-color: #55605c;
}
body.zg-dark .toolbar-search input { color: var(--zgd-text); }
body.zg-dark .toolbar-search input::placeholder { color: var(--zgd-muted); }
body.zg-dark .toolbar-label,
body.zg-dark .toolbar-zoom-text,
body.zg-dark .toolbar-caret,
body.zg-dark .muted-danger { color: var(--zgd-muted); }
body.zg-dark .toolbar-print-scale { background: #4a4122; color: #f0d77a; }
body.zg-dark .toolbar-group--more .toolbar-control { color: #8fd07a; }


/* ---------- plan / header ---------- */

body.zg-dark .plan { background: var(--zgd-plan); }
body.zg-dark .title-box { background: var(--zgd-surface); }
body.zg-dark .title { color: var(--zgd-text); }
body.zg-dark .subtitle { color: var(--zgd-muted); }

/* โลโก้เป็นภาพพื้นใส ตัวหนังสือเข้ม → รองพื้นขาวให้อ่านออก */
body.zg-dark .title-logo,
body.zg-dark .footer-logo {
    background: #ffffff;
    border-radius: 6px;
    padding: 2px 4px;
}

body.zg-dark .add-category-btn {
    background: var(--zgd-surface-2);
    border-color: var(--zgd-border);
    color: var(--zgd-text);
}
body.zg-dark .add-category-btn:hover { background: var(--zgd-hover); }


/* ---------- timeline header ---------- */

body.zg-dark .month-label { color: #b7c1bc; }
body.zg-dark .day-number-label { color: #8a948f; }
body.zg-dark .day-number-label--highlight-vline { color: #ffffff !important; }
body.zg-dark .day-number-label--highlight { color: #ff6b62 !important; }


/* ---------- schedule ---------- */

body.zg-dark .schedule-area,
body.zg-dark .timeline-viewport,
body.zg-dark .timeline-content { background: var(--zgd-plan); }

body.zg-dark .category-sidebar,
body.zg-dark .party-sidebar,
body.zg-dark .party-row { background: var(--zgd-surface); }

body.zg-dark .party-main { color: var(--zgd-text); }
body.zg-dark .party-role { color: var(--zgd-muted); }

body.zg-dark .category-more-btn,
body.zg-dark .row-more-btn {
    background: rgba(31, 37, 39, .92);
    color: var(--zgd-text);
}
body.zg-dark .row-more-btn:hover,
body.zg-dark .category-more-btn:hover { background: var(--zgd-hover); }

body.zg-dark .dynamic-v-line--day { border-left-color: #2c3436; }
body.zg-dark .dynamic-v-line--week { border-left-color: #3a4341; }

body.zg-dark .timeline-horizontal-scroll { background: var(--zgd-plan); }
body.zg-dark .horizontal-arrow {
    background: var(--zgd-surface-2);
    border-color: var(--zgd-border);
    color: var(--zgd-muted);
}
body.zg-dark .horizontal-arrow:hover { background: var(--zgd-hover); }


/* ---------- objects ---------- */

body.zg-dark .canvas-object--dateline-chip { background: var(--zgd-surface-2); }
body.zg-dark .dateline-chip-text { color: var(--zgd-text); }
body.zg-dark .canvas-object-date-badge { color: var(--zgd-muted); }
body.zg-dark .canvas-object--hline .canvas-object-label { color: #c9d1cd; }

/* เส้นแนวตั้งสีดำ (ค่าเริ่มต้น) มองไม่เห็นบนพื้นมืด → แสดงเป็นสีขาว */
body.zg-dark .canvas-object--vline[style*="--vline-color: #000000"]::after {
    background-color: #e3e8e5;
}


/* ---------- bracket ---------- */

body.zg-dark .bracket-area {
    background: var(--zgd-plan);
    border-color: var(--zgd-border);
}
body.zg-dark .bracket-label {
    background: var(--zgd-surface);
    border-right-color: var(--zgd-border);
    color: var(--zgd-muted);
}
body.zg-dark .bracket-viewport,
body.zg-dark .bracket-content { background: var(--zgd-plan); }
body.zg-dark .bracket-guide-line { border-top-color: #262d2f; }


/* ---------- notes ---------- */

body.zg-dark .board-notes-section { background: #20272a; }
body.zg-dark .note-card {
    background: var(--zgd-surface);
    border-color: var(--zgd-border);
}
body.zg-dark .note-header { color: var(--zgd-text); }
body.zg-dark .note-body { color: #c9d1cd; }
body.zg-dark .note-delete-btn { color: var(--zgd-muted); }
body.zg-dark .add-note-btn {
    background: var(--zgd-surface-2);
    border-color: var(--zgd-border);
    color: var(--zgd-text);
}
body.zg-dark .add-note-btn:hover { background: var(--zgd-hover); }


/* ---------- menus / panels / dialogs ---------- */

body.zg-dark .object-menu,
body.zg-dark .category-menu,
body.zg-dark .toolbar-more-menu,
body.zg-dark .row-action-menu,
body.zg-dark .role-manager-panel,
body.zg-dark .new-category-dialog,
body.zg-dark .zg-plan-dropdown,
body.zg-dark .zg-plan-dialog {
    background: var(--zgd-surface);
    border-color: var(--zgd-border);
    color: var(--zgd-text);
    box-shadow: 0 8px 28px rgba(0, 0, 0, .5);
}

body.zg-dark .object-menu-label,
body.zg-dark .menu-color-row,
body.zg-dark .new-category-dialog .ncd-label,
body.zg-dark .zg-plan-dialog-label,
body.zg-dark .zg-plan-item-time { color: var(--zgd-muted); }

body.zg-dark .menu-title,
body.zg-dark .role-manager-header,
body.zg-dark .object-menu-checkbox,
body.zg-dark .object-menu-stepper,
body.zg-dark .toolbar-more-item,
body.zg-dark .row-action-item,
body.zg-dark .zg-plan-item,
body.zg-dark .zg-plan-dialog { color: var(--zgd-text); }

body.zg-dark .toolbar-more-item:hover,
body.zg-dark .row-action-item:hover,
body.zg-dark .zg-plan-item:hover { background: var(--zgd-hover); }
body.zg-dark .toolbar-more-item.active,
body.zg-dark .zg-plan-item.active { background: #1f3a2a; color: #8fe0a8; }
body.zg-dark .zg-plan-dropdown-sep { background: var(--zgd-border); }
body.zg-dark .zg-plan-dropdown-add { color: #8fd07a; }
body.zg-dark .zg-plan-dropdown-add:hover { background: #1f2a1d; }

body.zg-dark .object-menu-input,
body.zg-dark .object-menu-select,
body.zg-dark .object-menu-color-input,
body.zg-dark .role-manager-name-input,
body.zg-dark .role-manager-item input[type="color"],
body.zg-dark .menu-color-row input[type="color"],
body.zg-dark .new-category-dialog input,
body.zg-dark .zg-plan-dialog input[type="text"] {
    background: var(--zgd-plan);
    border-color: var(--zgd-border);
    color: var(--zgd-text);
}

body.zg-dark .object-menu-icon-btn,
body.zg-dark .object-menu-step-btn,
body.zg-dark .object-menu-duplicate-btn,
body.zg-dark .object-menu-position-btn,
body.zg-dark .role-manager-add-btn,
body.zg-dark .new-category-dialog .ncd-actions button,
body.zg-dark .zg-plan-dialog-actions button {
    background: var(--zgd-surface-2);
    border-color: var(--zgd-border);
    color: var(--zgd-text);
}
body.zg-dark .object-menu-icon-btn.active { background: #1c3048; border-color: #4a90d9; }
body.zg-dark .object-menu-position-btn.active { background: #4a90d9; border-color: #4a90d9; }
body.zg-dark .new-category-dialog .ncd-actions .ncd-ok,
body.zg-dark .zg-plan-dialog-actions .zg-plan-ok { background: #3a8a4f; border-color: #3a8a4f; color: #ffffff; }
body.zg-dark .zg-plan-dialog-actions .zg-plan-danger { background: #d33b43; border-color: #d33b43; color: #ffffff; }

body.zg-dark .object-menu-delete-btn,
body.zg-dark .delete-category-btn,
body.zg-dark .role-manager-delete-btn,
body.zg-dark .row-delete-item { background: #3a2124; color: #ff8a8f; }
body.zg-dark .object-menu-delete-btn:hover,
body.zg-dark .delete-category-btn:hover,
body.zg-dark .row-delete-item:hover { background: #4a2a2e; }

body.zg-dark .role-manager-close { color: var(--zgd-muted); }
body.zg-dark .zg-plan-overlay { background: rgba(0, 0, 0, .5); }


/* ---------- text boxes ---------- */

body.zg-dark .zg-text-box.is-default-ink .zg-text-content,
body.zg-dark .zg-text-box.is-default-ink .zg-text-icon,
body.zg-dark .zg-text-box.is-default-ink .zg-text-detail { color: var(--zgd-text) !important; }
body.zg-dark .zg-text-btn {
    background: var(--zgd-surface-2);
    border-color: var(--zgd-border);
    color: var(--zgd-text);
}
body.zg-dark .zg-text-handle { background: var(--zgd-surface-2); }


/* ---------- update date / footer ---------- */

body.zg-dark .zg-update-date {
    background: var(--zgd-surface);
    border-color: var(--zgd-border);
}
body.zg-dark .zg-update-date-label { color: #8fd07a; }
body.zg-dark .zg-update-date-input {
    background: var(--zgd-plan);
    border-color: var(--zgd-border);
    color: var(--zgd-text);
}

body.zg-dark .company-footer {
    background: var(--zgd-surface);
    border-top-color: var(--zgd-border);
    box-shadow: 0 -3px 12px rgba(0, 0, 0, .4);
}
body.zg-dark .footer-contact { color: #b7c1bc; }

}
`;

    document.head.appendChild(style);


    /* =====================================================
       TOGGLE
    ===================================================== */

    function readSaved() {

        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            return null;
        }
    }


    function save(value) {

        try {
            localStorage.setItem(STORAGE_KEY, value);
        } catch (error) {
            /* เก็บไม่ได้ก็ไม่เป็นไร ธีมยังสลับได้ในหน้านี้ */
        }
    }


    function applyTheme(theme) {

        const isDark =
            theme === "dark";

        document.body.classList.toggle("zg-dark", isDark);

        if (button) {

            button.textContent = isDark ? "☀" : "◐";

            button.title = isDark ? "ธีมสว่าง" : "ธีมมืด";

            button.setAttribute("aria-pressed", String(isDark));
        }
    }


    applyTheme(readSaved() === "dark" ? "dark" : "light");


    if (button) {

        button.addEventListener("click", () => {

            const next =
                document.body.classList.contains("zg-dark")
                    ? "light"
                    : "dark";

            applyTheme(next);

            save(next);
        });
    }


    window.ZGTheme = {

        get() {
            return document.body.classList.contains("zg-dark") ? "dark" : "light";
        },

        set(theme) {
            applyTheme(theme === "dark" ? "dark" : "light");
            save(theme === "dark" ? "dark" : "light");
        }
    };

})();