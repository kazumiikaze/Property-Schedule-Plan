"use strict";

/* =========================================================
   TOOLBAR-RIGHT.JS — ย้ายปุ่ม 🔎 ตรวจคำผิด และ ⌨ วิธีใช้ ไปไว้มุมขวาบนของ Toolbar
   และช่อง 🔍 ค้นหา/คำสั่ง ไว้ใต้สองปุ่มนั้น
   - ปุ่มเดิมถูกย้ายมาทั้งปุ่ม (การทำงานเหมือนเดิม)
   - เว้นที่ด้านขวาของแถวบนสุดไว้ให้ ปุ่มอื่นจะไม่ทับ
   - ไม่แก้ app.js / style.css — โหลดหลัง help-shortcuts.js และ spell-plus.js
========================================================= */

(function () {

    const toolbar = document.querySelector(".workspace-toolbar");
    const mainRow = toolbar && toolbar.querySelector(".toolbar-row-main");

    if (!toolbar || !mainRow) {
        console.warn("[toolbar-right.js] ไม่พบ toolbar");
        return;
    }

    const style = document.createElement("style");

    style.textContent = `
.workspace-toolbar { position: fixed; }
.zg-toolbar-right {
    position: absolute;
    top: 4px;
    right: 10px;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 5px;
    padding: 3px 4px;
    border-radius: 10px;
    background: #f6f8f7;
}
.zg-toolbar-right .toolbar-control { margin: 0; }
.zg-tr-line { display: flex; align-items: center; gap: 6px; }
.zg-tr-line--top { justify-content: flex-end; }
.zg-toolbar-right .toolbar-search { width: 100% !important; box-sizing: border-box; margin: 0; }
.workspace-toolbar .toolbar-row { padding-right: var(--zg-toolbar-right-space, 0px); box-sizing: border-box; }
body.zg-dark .zg-toolbar-right { background: #232b28; }
`;

    document.head.appendChild(style);

    const box = document.createElement("div");
    box.className = "zg-toolbar-right";

    toolbar.appendChild(box);

    const top = document.createElement("div");
    top.className = "zg-tr-line zg-tr-line--top";

    const bottom = document.createElement("div");
    bottom.className = "zg-tr-line zg-tr-line--bottom";

    box.appendChild(top);
    box.appendChild(bottom);

    const spell = document.getElementById("toolbarSpellcheckBtn");
    const help = toolbar.querySelector(".zg-help-btn");
    const search = toolbar.querySelector(".toolbar-search");

    if (spell) top.appendChild(spell);
    if (help) top.appendChild(help);
    if (search) bottom.appendChild(search);

    if (!top.children.length) top.remove();
    if (!bottom.children.length) bottom.remove();

    if (!box.children.length) {
        box.remove();
        return;
    }

    /* กลุ่มเดิมของปุ่มตรวจคำผิดที่เหลือแค่ปุ่มซ่อน → ไม่ต้องกินที่ */
    const oldGroup = document.querySelector(".toolbar-group--more");

    if (oldGroup && !Array.from(oldGroup.children).some(node => !node.hidden)) {
        oldGroup.style.display = "none";
    }


    /* เว้นที่ด้านขวาของแถวบนให้พอดีกับกล่องปุ่ม */
    let lastSpace = -1;

    function reserve() {

        const space = Math.ceil(box.offsetWidth + 16);

        if (space === lastSpace) return;

        lastSpace = space;

        toolbar.style.setProperty("--zg-toolbar-right-space", `${space}px`);

        /* ให้ responsive.js คำนวณความสูง toolbar ใหม่ */
        requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }

    if (typeof ResizeObserver === "function") {
        new ResizeObserver(reserve).observe(box);
    }

    reserve();

})();
