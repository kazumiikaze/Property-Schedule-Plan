"use strict";

/* =========================================================
   OBJECT-MENU-TABS.JS — เมนูของ object แบ่งเป็นแท็บ (สั้นลง ไม่ล้นจอ)

     [ ทั่วไป ]  สถานะ · สี · แสดงหัวข้อ/ชั้น · รายละเอียด
     [ รูปแบบ ]  ไอคอน · ปักซ้าย/ขวา · เส้นแนวตั้ง/สีข้อความ · ตำแหน่งข้อความ
     [ รูปภาพ ]  รูปในกล่อง (image-task.js)

   - ปุ่ม "📅 แก้วันที่" / "✏️ แก้ข้อความ" อยู่บนสุดเสมอ
   - ปุ่ม "ทำสำเนา / ลบ" อยู่ล่างสุดเสมอ
   - จำแท็บล่าสุดไว้ เปิดเมนูครั้งต่อไปอยู่แท็บเดิม
   - เมนูสั้นอยู่แล้ว (เส้นวันที่ / เส้นแนวนอน) → ไม่แบ่ง

   ไม่แก้ app.js / style.css — โหลดหลัง object-text.js
========================================================= */

(function () {

    const TABS = [
        { key: "general", label: "ทั่วไป" },
        { key: "style", label: "รูปแบบ" },
        { key: "image", label: "รูปภาพ" }
    ];

    const STYLE_MARKERS = "#objMenuIcons, #objMenuPinLeftValue, #objMenuPinRightValue, #objMenuVLineSelect, #objMenuPositionGrid";
    const IMAGE_MARKERS = ".zg-timg-section";
    const FOOTER_MARKERS = "#objMenuDuplicateBtn, #objMenuDeleteBtn";
    const PINNED_MARKERS = ".zg-date-menu-btn, .zg-text-menu-btn";

    let lastTab = "general";


    const style = document.createElement("style");

    style.textContent = `
.zg-menu-tabs {
    display: flex;
    gap: 2px;
    margin: 0 0 10px;
    padding: 3px;
    border-radius: 9px;
    background: #f0f3f1;
}
.zg-menu-tabs button {
    flex: 1;
    height: 28px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: #5f6a64;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
}
.zg-menu-tabs button:hover { color: #1e2924; }
.zg-menu-tabs button.is-on { background: #ffffff; color: #2f7442; box-shadow: 0 1px 3px rgba(0, 0, 0, .12); }
.object-menu [data-zg-tab-hidden="1"] { display: none !important; }
body.zg-dark .zg-menu-tabs { background: #1b211f; }
body.zg-dark .zg-menu-tabs button { color: #a5b0aa; }
body.zg-dark .zg-menu-tabs button.is-on { background: #2b3330; color: #9fd3ad; }
`;

    document.head.appendChild(style);


    function classify(node) {

        if (node.matches(PINNED_MARKERS)) return "pinned";
        if (node.matches(".zg-menu-tabs")) return "tabs";
        if (node.matches(IMAGE_MARKERS) || node.querySelector(IMAGE_MARKERS)) return "image";
        if (node.querySelector(FOOTER_MARKERS)) return "footer";
        if (node.matches(STYLE_MARKERS) || node.querySelector(STYLE_MARKERS)) return "style";

        return "general";
    }

    function keepInView(menu) {

        requestAnimationFrame(() => {

            if (!menu.isConnected) return;

            const rect = menu.getBoundingClientRect();

            const margin = 6;

            let top = parseFloat(menu.style.top);

            if (!Number.isFinite(top)) top = rect.top;

            if (rect.bottom > window.innerHeight - margin) {
                top -= rect.bottom - (window.innerHeight - margin);
            }

            menu.style.top = `${Math.max(margin, top)}px`;
        });
    }

    function show(menu, key) {

        lastTab = key;

        Array.from(menu.children).forEach(node => {

            const group = node.dataset.zgTab;

            if (!group || group === "pinned" || group === "tabs" || group === "footer") {
                node.removeAttribute("data-zg-tab-hidden");
                return;
            }

            if (group === key) {
                node.removeAttribute("data-zg-tab-hidden");
            } else {
                node.setAttribute("data-zg-tab-hidden", "1");
            }
        });

        menu.querySelectorAll(".zg-menu-tabs button").forEach(button => {
            button.classList.toggle("is-on", button.dataset.tab === key);
        });

        keepInView(menu);
    }

    function enhance(menu) {

        if (!menu.isConnected || menu.querySelector(".zg-menu-tabs")) return;

        const children = Array.from(menu.children);

        children.forEach(node => { node.dataset.zgTab = classify(node); });

        const present = new Set(children.map(node => node.dataset.zgTab));

        /* เมนูสั้น (ไม่มีส่วน "รูปแบบ") → ไม่ต้องแบ่ง */
        if (!present.has("style")) return;

        const tabs = TABS.filter(tab => present.has(tab.key));

        const bar = document.createElement("div");

        bar.className = "zg-menu-tabs";
        bar.dataset.zgTab = "tabs";

        bar.innerHTML = tabs.map(tab => `<button type="button" data-tab="${tab.key}">${tab.label}</button>`).join("");

        bar.addEventListener("click", event => {

            const button = event.target.closest("button[data-tab]");

            if (!button) return;

            event.stopPropagation();

            show(menu, button.dataset.tab);
        });

        /* วางแถบแท็บต่อจากปุ่มด่วน (แก้วันที่ / แก้ข้อความ) */
        const pinned = children.filter(node => node.dataset.zgTab === "pinned");

        const anchor = pinned.length ? pinned[pinned.length - 1].nextSibling : menu.firstChild;

        menu.insertBefore(bar, anchor);

        show(menu, tabs.some(tab => tab.key === lastTab) ? lastTab : "general");
    }

    new MutationObserver(records => {

        records.forEach(record => record.addedNodes.forEach(node => {

            if (node instanceof Element && node.classList.contains("object-menu")) {

                /* รอไฟล์อื่นเติมปุ่ม/ส่วนในเมนูให้ครบก่อน */
                setTimeout(() => enhance(node), 0);
            }
        }));

    }).observe(document.body, { childList: true });


    /* ส่วนที่ถูกเติมเข้าเมนูภายหลัง (เช่น ปุ่มที่มาทีหลัง) → จัดเข้าแท็บที่ถูกต้อง */
    window.ZGMenuTabs = {
        refresh(menu) {

            const target = menu || document.querySelector("body > .object-menu:last-of-type");

            if (!target) return;

            Array.from(target.children).forEach(node => {
                if (!node.dataset.zgTab) node.dataset.zgTab = classify(node);
            });

            show(target, lastTab);
        }
    };

})();
