"use strict";

/* =========================================================
   HELP-SHORTCUTS.JS — หน้า "วิธีใช้ & ปุ่มลัด"
   - ปุ่ม "⌨ วิธีใช้" บน Toolbar (ข้าง 📋 เทมเพลต) หรือกด ? / F1
   - รวมวิธีใช้ที่มองไม่เห็นจากหน้าจอ: คลิกซ้ำพิมพ์, ดับเบิลคลิกแก้วันที่,
     ลูกศรเลื่อนวัน, Shift+คลิกเลือกหลายชิ้น, ลากรูปมาวาง ฯลฯ
   - เปิด/ปิด "เส้นวันนี้" ได้จากหน้านี้
========================================================= */

(function () {

    const SECTIONS = [
        {
            title: "ทั่วไป",
            items: [
                [["Ctrl", "Z"], "ย้อนกลับ"],
                [["Ctrl", "Y"], "ทำซ้ำ (เดินหน้า)"],
                [["Ctrl", "K"], "ค้นหางาน / คำสั่ง"],
                [["?"], "เปิดหน้าวิธีใช้นี้"],
                [["T"], "เปิด/ปิดเส้นวันนี้"],
                [["Esc"], "ปิดเมนู / เลิกเลือก"]
            ]
        },
        {
            title: "เลือก & ย้าย",
            items: [
                [["คลิก"], "เลือก + เปิดเมนูของ object"],
                [["Shift", "คลิก"], "เลือกหลายชิ้น แล้วลากไปพร้อมกัน"],
                [["ลากที่ว่าง"], "ลากคลุมเลือกหลายชิ้น (รวม Text / เส้นแนวนอน / รูป) → ลากชิ้นไหนก็ได้ ย้ายทั้งกลุ่ม"],
                [["Space", "ลาก"], "เลื่อนตาราง (หรือลากด้วยปุ่มกลางเมาส์)"],
                [["ลาก"], "ย้าย · ลากขอบซ้าย/ขวา/บน/ล่าง = ยืดหด"],
                [["←", "→"], "เลื่อนทีละ 1 วัน"],
                [["Shift", "← →"], "ยืด / หด วันจบ"],
                [["↑", "↓"], "ย้ายกล่องงานไปแถวบน / ล่าง"]
            ]
        },
        {
            title: "แก้ไข",
            items: [
                [["Delete"], "ลบ object ที่เลือก"],
                [["Ctrl", "C"], "คัดลอก"],
                [["Ctrl", "V"], "วาง (ต่อท้ายช่วงวันเดิม)"],
                [["Ctrl", "D"], "ทำสำเนาทันที"],
                [["ดับเบิลคลิก"], "แก้วันที่เป็นตัวเลข"],
                [["คลิกซ้ำ"], "พิมพ์ข้อความในกล่อง"],
                [["Enter"], "พิมพ์เสร็จ · Shift+Enter = ขึ้นบรรทัดใหม่"],
                [["Esc"], "ยกเลิกการพิมพ์ (คืนข้อความเดิม)"],
                [["🔎 ตรวจคำผิด"], "คลิก = เปิด / ปิด · ▾ = ดูรายการ แก้ทั้งหมด"]
            ]
        },
        {
            title: "พิมพ์ชื่อแถว / บทบาท / หมวดหมู่",
            items: [
                [["คลิกช่อง"], "พิมพ์ทับคำแนะนำจาง ๆ ได้เลย"],
                [["Enter"], "เสร็จ → ไปแถวถัดไป (ช่องเดียวกัน)"],
                [["Enter"], "แถวสุดท้ายของหมวด = ถามเพิ่มแถวใหม่"],
                [["Tab"], "ชื่อ → บทบาท → แถวถัดไป"],
                [["Shift", "Tab"], "ย้อนกลับช่องก่อนหน้า"],
                [["Shift", "Enter"], "ขึ้นบรรทัดใหม่ (ชื่อแถว)"],
                [["↑", "↓"], "เลือกคำที่เคยใช้ · Enter = ใช้คำนั้น"],
                [["Esc"], "ปิดรายการคำ / ยกเลิก (คืนข้อความเดิม)"]
            ]
        },
        {
            title: "หัวกระดาน",
            items: [
                [["⚙"], "ตั้งค่า: ข้อมูลโครงการ · สถานะดีล · สี · รูปแบบ"],
                [["คลิกป้าย"], "แก้ข้อมูลโครงการ / สถานะดีล"],
                [["คลิกบรรทัดรอง"], "พิมพ์ชื่อลูกค้า → ชื่อแผนเปลี่ยนตาม"],
                [["Enter"], "แก้ชื่อเสร็จ · Esc = ยกเลิก"]
            ]
        },
        {
            title: "บันทึกท้ายกระดาน",
            items: [
                [["＋ เพิ่มบันทึก"], "เลือกประเภท: ชำระเงิน · เอกสาร · ผู้ติดต่อ ฯลฯ"],
                [["Enter"], "หัวข้อ → ไปพิมพ์เนื้อหา · ในเนื้อหา = ขึ้นบรรทัดใหม่"],
                [["⠿"], "ลากสลับลำดับการ์ด"],
                [["⧉"], "ทำสำเนาการ์ด"],
                [["🔒"], "บันทึกภายใน — ไม่ออกตอนพิมพ์ / Export"],
                [["🗑"], "ลบ (กด ↶ ย้อนกลับได้)"]
            ]
        },
        {
            title: "รูปภาพ & ไฟล์",
            items: [
                [["ลากไฟล์รูป"], "วางรูปในตาราง"],
                [["Ctrl", "V"], "วางรูปที่คัดลอกไว้"],
                [["วางบนกล่อง"], "ใส่รูปในกล่องงาน"],
                [["คลิกโลโก้"], "เปลี่ยนโลโก้ของแผน"],
                [["🏷 แปะรูป"], "คลิก = แปะกลางตาราง · ลากไปวางตรงไหนก็ได้"],
                [["ดับเบิลคลิกรูป"], "ครอบตัดรูป (✂ ในแถบเครื่องมือของรูปก็ได้)"],
                [["ลากตัวหนังสือ"], "ย้ายข้อความในกล่องงาน (ใกล้ขอบ / กลาง ดูดเข้าที่ให้)"],
                [["ที่จับ ◂ ▸ ข้างข้อความ"], "ยืดช่องพิมพ์ซ้าย-ขวา (ดับเบิลคลิก = อัตโนมัติ)"],
                [["เส้นในช่องเส้นวันที่"], "ลาก = ย้ายวันที่ · คลิก = เมนูปรับแต่งเส้น"],
                [["คลิกช่องที่พิมพ์ → A− / A+"], "ปรับขนาดตัวหนังสือ (ทุกช่องที่พิมพ์ได้)"],
                [["Ctrl", "Shift", "> / <"], "ตัวหนังสือใหญ่ขึ้น / เล็กลง"],
                [["Ctrl", "B"], "ตัวหนา (ทั้งช่องที่กำลังพิมพ์)"],
                [["Ctrl", "Shift", "8"], "ใส่/เอาจุดหน้าประโยค · บรรทัดมีจุด กด Enter = จุดต่อให้"],
                [["คลิกช่องที่พิมพ์ → A→"], "หมุนข้อความ: แนวนอน → แนวตั้ง ↓ → แนวตั้ง ↑"],
                [["ลากไฟล์ .json"], "Import แผน"],
                [["↑ Export", "PNG / PDF"], "ดูตัวอย่างก่อน · ตั้งชื่อไฟล์ · A3/A4 · แบ่งหน้าตามเดือน"],
                [["↑ Export", "🗄 สำรอง"], "สำรองทุกแผนเป็นไฟล์เดียว · ♻ กู้คืน"],
                [["⭐ ชุดสำเร็จ"], "ลากคลุม → บันทึกเป็นชุด · คลิก / ลากการ์ดเพื่อวาง"],
                [["Alt", "คลิก"], "เลือกชิ้นเดียวในชุด"]
            ]
        }
    ];


    const style = document.createElement("style");

    style.textContent = `
.zg-help {
    position: fixed;
    inset: 0;
    z-index: 27000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
    background: rgba(28, 38, 33, .30);
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
    font-family: Arial, Helvetica, sans-serif;
    color: #1e2924;
}
.zg-help__box {
    width: min(860px, 100%);
    max-height: calc(100vh - 40px);
    overflow-y: auto;
    padding: 22px 24px 18px;
    box-sizing: border-box;
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 24px 70px rgba(10, 30, 20, .28);
}
.zg-help__head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.zg-help__title { font-size: 18px; font-weight: 700; }
.zg-help__close {
    margin-left: auto;
    height: 30px;
    padding: 0 12px;
    border: 1px solid #dde3e0;
    border-radius: 8px;
    background: #ffffff;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
}
.zg-help__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 14px; }
.zg-help__section { padding: 12px 14px; border: 1px solid #e6ebe8; border-radius: 12px; background: #fafbfa; }
.zg-help__section h3 { margin: 0 0 8px; font-size: 13px; color: #2f7442; }
.zg-help__row { display: flex; align-items: center; gap: 10px; padding: 4px 0; font-size: 12.5px; }
.zg-help__keys { flex: 0 0 148px; display: flex; flex-wrap: wrap; gap: 3px; }
.zg-help kbd {
    display: inline-block;
    min-width: 18px;
    padding: 2px 6px;
    border: 1px solid #cfd6d2;
    border-bottom-width: 2px;
    border-radius: 6px;
    background: #ffffff;
    font: 700 11px/1.4 Arial, Helvetica, sans-serif;
    color: #1e2924;
    text-align: center;
    white-space: nowrap;
}
.zg-help__foot { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 14px; color: #6f7873; font-size: 12px; }
.zg-help__foot label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: #1e2924; }

.zg-help-btn { white-space: nowrap; }

body.zg-dark .zg-help__box { background: #1f2623; color: #e3e9e5; }
body.zg-dark .zg-help__section { background: #222a27; border-color: #333c38; }
body.zg-dark .zg-help kbd { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-help__close { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-help__foot label { color: #e3e9e5; }
body.zg-exporting .zg-help { display: none !important; }

@media (max-width: 560px) {
    .zg-help__grid { grid-template-columns: 1fr; }
    .zg-help__keys { flex-basis: 110px; }
}
`;

    document.head.appendChild(style);


    function escapeHtml(text) {

        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    let overlay = null;

    function close() {

        if (overlay) {
            overlay.remove();
            overlay = null;
        }
    }

    function open() {

        close();

        if (typeof closeObjectMenu === "function") closeObjectMenu();

        overlay = document.createElement("div");

        overlay.className = "zg-help";
        overlay.setAttribute("role", "dialog");

        const todayOn = window.ZGTodayLine ? window.ZGTodayLine.isVisible() : false;

        overlay.innerHTML = `
            <div class="zg-help__box">
                <div class="zg-help__head">
                    <div class="zg-help__title">⌨ วิธีใช้ & ปุ่มลัด</div>
                    <button type="button" class="zg-help__close" data-help="close">✕ ปิด</button>
                </div>
                <div class="zg-help__grid">
                    ${SECTIONS.map(section => `
                        <div class="zg-help__section">
                            <h3>${escapeHtml(section.title)}</h3>
                            ${section.items.filter(([keys]) => !(keys[0] === "T" && !window.ZGTodayLine)).map(([keys, text]) => `
                                <div class="zg-help__row">
                                    <span class="zg-help__keys">${keys.map(key => `<kbd>${escapeHtml(key)}</kbd>`).join("")}</span>
                                    <span>${escapeHtml(text)}</span>
                                </div>`).join("")}
                        </div>`).join("")}
                </div>
                <div class="zg-help__foot">
                    ${window.ZGTodayLine ? `<label><input type="checkbox" data-help="today" ${todayOn ? "checked" : ""}> แสดงเส้นวันนี้</label>` : ""}
                    <span>ปุ่มลัดไม่ทำงานตอนกำลังพิมพ์ในช่องข้อความ</span>
                </div>
            </div>
        `;

        overlay.addEventListener("mousedown", event => {
            if (event.target === overlay) close();
        });

        overlay.addEventListener("click", event => {
            if (event.target.closest("[data-help='close']")) close();
        });

        overlay.addEventListener("change", event => {
            if (event.target.matches("[data-help='today']") && window.ZGTodayLine) {
                window.ZGTodayLine.setVisible(event.target.checked);
            }
        });

        document.body.appendChild(overlay);
    }


    /* ปุ่มบน Toolbar */
    const button = document.createElement("button");

    button.type = "button";
    button.className = "toolbar-control zg-help-btn";
    button.textContent = "⌨ วิธีใช้";
    button.title = "วิธีใช้ & ปุ่มลัด (กด ?)";

    button.addEventListener("click", event => {
        event.stopPropagation();
        if (overlay) close(); else open();
    });

    const templatesButton = Array.from(document.querySelectorAll(".workspace-toolbar button, .toolbar button"))
        .find(node => /เทมเพลต/.test(node.textContent || ""));

    if (templatesButton && templatesButton.parentNode) {
        templatesButton.parentNode.insertBefore(button, templatesButton.nextSibling);
    } else {
        const toolbar = document.querySelector(".workspace-toolbar, .toolbar");
        if (toolbar) toolbar.appendChild(button);
    }


    /* กด ? หรือ F1 */
    document.addEventListener("keydown", event => {

        if (overlay && event.key === "Escape") {
            event.stopImmediatePropagation();
            close();
            return;
        }

        if (event.ctrlKey || event.metaKey || event.altKey) return;

        const target = event.target;

        if (target instanceof Element && target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")) return;

        if (event.key === "?" || event.key === "F1") {
            event.preventDefault();
            if (overlay) close(); else open();
        }

    }, true);


    window.ZGHelp = { open, close };

})();
