"use strict";

/* =========================================================
   OBJECT-SKIN.JS — หน้าตา object บนตาราง: นุ่ม สบายตา ไม่รก (มินิมอลหรู)
   - เปลี่ยนแค่ "ผิว" (มุมโค้ง เงา เส้น สี น้ำหนักตัวอักษร) — ไม่เปลี่ยนขนาด/ตำแหน่ง
     → เทมเพลต / แผนที่บันทึกไว้ วางตรงที่เดิมทุกชิ้น
   - กล่องงาน: มุมโค้งขึ้น เงานุ่มสองชั้น ขอบในบาง ๆ สีลดความจัดจ้านเล็กน้อย
   - เส้นวันที่: เส้นประบางลง สีอ่อนลง · ป้ายวันที่: ขอบเส้นเดียว (ขนาดเท่าเดิม) เงานุ่ม
   - กล่องข้อความ: ปุ่มแม่เหล็กไม่กระพริบตลอดเวลา (โผล่เมื่อชี้ / เลือก / กำลังลาก)
   - เลือกแล้ว: วงสีเขียวแบรนด์บาง ๆ แทนกรอบหนา
   - ใช้ทั้งบนจอและตอน Export / พิมพ์ · โหลดเป็นไฟล์สุดท้าย (หลัง lang.js)
========================================================= */

(function () {

    const style = document.createElement("style");

    style.id = "zg-object-skin";

    style.textContent = `
:root {
    --zgs-ink: #1e2924;
    --zgs-brand: #2f7442;
    --zgs-ring: rgba(47, 116, 66, .55);
    --zgs-shadow-rest: 0 1px 1px rgba(20, 34, 27, .05), 0 3px 10px -3px rgba(20, 34, 27, .16);
    --zgs-shadow-lift: 0 1px 2px rgba(20, 34, 27, .07), 0 8px 20px -6px rgba(20, 34, 27, .24);
    --zgs-ease: cubic-bezier(.22, 1, .36, 1);
}

/* ---------- กล่องงาน ---------- */

html body .canvas-object--task {
    border-radius: 8px;
    /* ม่านขาวบาง ๆ ลดความจัดของสีพื้น + แสงด้านบนนิดเดียว ให้ดูนุ่มไม่แบน */
    background-image: linear-gradient(180deg, rgba(255, 255, 255, .14), rgba(255, 255, 255, .06)) !important;
    box-shadow:
        var(--zgs-shadow-rest),
        inset 0 0 0 1px rgba(15, 30, 22, .07),
        inset 0 1px 0 rgba(255, 255, 255, .28);
    transition: box-shadow .22s var(--zgs-ease);
}
html body .canvas-object--task:hover {
    box-shadow:
        var(--zgs-shadow-lift),
        inset 0 0 0 1px rgba(15, 30, 22, .09),
        inset 0 1px 0 rgba(255, 255, 255, .32);
}

/* ตัวอักษรในกล่องงาน: คงขนาด/น้ำหนัก/ระยะบรรทัดเดิม (กันข้อความล้นกล่องในเทมเพลต) */
html body .canvas-object.text-light .canvas-object-label {
    text-shadow: 0 1px 1px rgba(0, 0, 0, .14);
}
html body .canvas-object.text-dark .canvas-object-label { color: var(--zgs-ink); }


/* เลือกแล้ว: วงบาง ๆ ห่างออกมา แทนกรอบหนา */
html body .canvas-object--task.zg-obj-selected,
html body .canvas-object--dateline-chip.zg-obj-selected {
    outline: 1.5px solid var(--zgs-ring);
    outline-offset: 3px;
}

/* จุดยืดหดกล่องงาน */
html body .canvas-object-handle--corner {
    background: #ffffff;
    border: 1.5px solid var(--zgs-brand);
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(20, 34, 27, .18);
}


/* ---------- เส้นวันที่ / ป้ายวันที่ ---------- */

/*
    v2: เส้นทุกแบบหนา 1px เท่าเส้นแบ่งเดือน (.dynamic-v-line--month)
    - เส้นวันที่ (เส้นประคาดตาราง + เส้นต่อลงช่องเส้นวันที่)
    - เส้นแนวนอน
    - เส้นแนวตั้ง: ค่าเดิม 2px (เทมเพลต) → 1px · ถ้าผู้ใช้ตั้งหนาขึ้นเอง (3px+) ยังคงตามที่ตั้ง
    สีเดิมทั้งหมด · เส้นบางลงแล้วจึงไม่ต้องจางเท่าเดิม
*/
/* v8: เส้นวันที่ + เส้นแนวนอน ≈1.5px ให้ดูหนาเท่าเส้นแนวตั้งที่กดจากเลขวัน (เส้นนั้นวาดแบบเกลี่ยพิกเซล ดูหนา ~1.5px)
   Chrome ปัดความหนาเส้นขอบ 1.5px ลงเหลือ 1px → เส้นวันที่ใช้ยืดแนวนอน 1.5 เท่า · เส้นแนวนอนเติมเงาครึ่งพิกเซลสีเดียวกัน */
html body .canvas-object--dateline-line,
html body .zg-dateline-stem { border-left-width: 1px; transform: scaleX(1.5); }
html body .canvas-object--hline { border-top-width: 1px; box-shadow: inset 0 .5px 0 0 var(--zgs-hl, transparent); }
html body .canvas-object--vline[style*="--vline-thickness: 2px"] { --vline-thickness: 1px !important; }
html body .zg-vline-stem[style*="width: 2px"] { width: 1px !important; }

/* v16: สลับลายเส้น — เส้นวันที่ (＋ เส้นวันที่) = เส้นทึบ · เส้นที่กดจากเลขวัน = เส้นประ (สี/ความหนาเดิม) */
html body .canvas-object--dateline-line,
html body .zg-dateline-stem { border-left-style: solid; }
html body .canvas-object--vline::after {
    background: repeating-linear-gradient(to bottom, var(--vline-color, #000000) 0 4px, transparent 4px 7px);
}
html body .zg-vline-stem {
    background: repeating-linear-gradient(to bottom, var(--vline-color, #000000) 0 4px, transparent 4px 7px) !important;
}

/* เส้นประคาดตาราง: จางลงนิดให้ไม่แย่งสายตากับกล่องงาน (สีตามที่ผู้ใช้เลือกเหมือนเดิม) */
html body .canvas-object--dateline-line { opacity: 1; }
html body .canvas-object--dateline-line:hover,
html body .canvas-object--dateline-line.zg-obj-selected { opacity: 1; }

/* ขอบเส้นเดียว 1px (เดิมเส้นประ 2px) — เพิ่ม padding 1px ชดเชย → ขนาดกล่องเท่าเดิมเป๊ะ */
html body .canvas-object--dateline-chip {
    border-width: 1px;
    border-style: solid;
    padding: 5px 9px 7px;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: var(--zgs-shadow-rest);
    transition: box-shadow .22s var(--zgs-ease);
}
html body .canvas-object--dateline-chip:hover { box-shadow: var(--zgs-shadow-lift); }

html body .dateline-chip-text { color: #26302b; }
html body .canvas-object-date-badge {
    color: #77817c;
    font-variant-numeric: tabular-nums;
}


/* ---------- กล่องข้อความ ---------- */

html body .zg-text-box { transition: border-color .18s ease, box-shadow .22s var(--zgs-ease); }
html body .zg-text-box:hover,
html body .zg-text-box.is-empty { border-color: rgba(30, 41, 36, .22); }
html body .zg-text-box.is-selected { border-style: solid; border-color: var(--zgs-ring); }
html body .zg-text-box.is-attached { border-color: rgba(47, 116, 66, .28); }
html body .zg-text-box.is-attached.is-selected { border-color: var(--zgs-ring); }

/* กล่องที่มีพื้นสี → มุมโค้ง + เงานุ่ม เหมือนกล่องงาน */
html body .zg-text-box:not(.zg-text-fit):not([style*="background: transparent"]) {
    border-radius: 8px;
    box-shadow: var(--zgs-shadow-rest);
}

html body .zg-text-handle {
    border: 1.5px solid var(--zgs-brand);
    border-radius: 50%;
    box-shadow: 0 1px 2px rgba(20, 34, 27, .16);
}

html body .zg-text-btn {
    border-color: rgba(30, 41, 36, .12);
    border-radius: 7px;
    color: #3b4540;
    box-shadow: 0 1px 2px rgba(20, 34, 27, .06), 0 4px 10px -4px rgba(20, 34, 27, .18);
}

/* ปุ่มแม่เหล็ก: ไม่โผล่กระพริบค้างทุกกล่อง — โผล่เมื่อชี้ / เลือก / กำลังลากเข้าใกล้ */
html body .zg-text-box.is-near:not(:hover):not(.is-selected) .zg-text-btn--magnet {
    visibility: hidden;
    opacity: 0;
}
html body.zg-text-dragging .zg-text-box.is-near .zg-text-btn--magnet {
    visibility: visible;
    opacity: 1;
}
html body .zg-text-box.is-near .zg-text-btn--magnet { animation: none; }
html body.zg-text-dragging .zg-text-box.is-near .zg-text-btn--magnet {
    animation: zgMagnetPulse 1.2s ease-in-out infinite;
}


/* ---------- เส้นตาราง: บางเบา ไม่รก (ธีมสว่าง) ----------
   v3: เดิมเส้นหลักทั้งหมดเป็นเทาเข้ม #777 + เส้นแบ่งวันเป็นจุดไข่ปลาถี่ → ดูรก
   ลำดับความเข้ม: กรอบ/หมวด/เดือน > แถวย่อย > วัน (โครงยังอ่านออก แต่ไม่แย่งสายตากับงาน) */
:root {
    --grid-line-color: #a9b3ae;   /* v5: เส้นขั้นหมวดหมู่ / กรอบ เข้มขึ้น (เดิม #ccd4d0) */
    --zg-row-line-color: #e6ebe8;
}
body:not(.zg-dark) .dynamic-v-line--month { border-left-color: #a3ada8; }   /* v5: เส้นขั้นเดือน เข้มขึ้น (เดิม #c6cfca) */
body:not(.zg-dark) .dynamic-v-line--week { border-left: 1px solid #edf1ef; }
body:not(.zg-dark) .dynamic-v-line--day { border-left: 1px solid rgba(30, 41, 36, .045); }
body:not(.zg-dark) .bracket-area { border-color: #e0e6e3; }
body:not(.zg-dark) .bracket-label { border-right-color: #e6ebe8; }
body:not(.zg-dark) .bracket-guide-line { border-top-color: #f3f5f4; }


/* ---------- ชื่อเดือนบนหัวตาราง: ใหญ่ขึ้นให้อ่านง่าย (10px → 13px) ----------
   หัวตารางสูง 40px: ชื่อเดือนบรรทัดบน (3–19px) · เลขวันเริ่มที่ 22px → ไม่ทับกัน */
html body .month-label {
    top: 3px;
    font-size: 13px;
    line-height: 16px;
    letter-spacing: .01em;
}
/* เดือนที่รวบไว้ (แถบแคบ ชื่อเดือนแนวตั้ง) */
html body .zg-fold-mark--head.is-month .zg-fold-mark__label { font-size: 12px; }


/* ---------- ตอน Export: ให้เหมือนตารางตอนไม่ได้เลือกอะไร (พิมพ์ A3 = แบบเดิมของเช้า 27 ต.ค. → ไม่ใช้ชุดนี้) ----------
   v6: เดิมกดพิมพ์ตอนมีชิ้นถูกเลือกค้าง → ชิ้นนั้นถูกยกขึ้นบนสุด (z-index ตอนเลือก / ชี้เมาส์)
       ทับกล่องอื่น + กรอบเส้นประของกล่องข้อความ / ปุ่มจับ ติดไปในภาพ */
body.zg-exporting:not(.zg-print-legacy) #objectLayer .canvas-object--task.zg-obj-selected,
body.zg-exporting:not(.zg-print-legacy) #objectLayer .canvas-object--task:hover { z-index: 2 !important; }
body.zg-exporting:not(.zg-print-legacy) .canvas-object-handle,
body.zg-exporting:not(.zg-print-legacy) .canvas-object-handle--corner,
body.zg-exporting:not(.zg-print-legacy) .zg-text-handle,
body.zg-exporting:not(.zg-print-legacy) .zg-text-controls { display: none !important; }
body.zg-exporting:not(.zg-print-legacy) .zg-text-box,
body.zg-exporting:not(.zg-print-legacy) .zg-text-box:hover,
body.zg-exporting:not(.zg-print-legacy) .zg-text-box.is-empty,
body.zg-exporting:not(.zg-print-legacy) .zg-text-box.is-selected,
body.zg-exporting:not(.zg-print-legacy) .zg-text-box.is-attached { border-color: transparent !important; outline: none !important; }
body.zg-exporting:not(.zg-print-legacy) .zg-text-box.is-empty { visibility: hidden !important; }
body.zg-exporting:not(.zg-print-legacy) .zg-multi-selected,
body.zg-exporting:not(.zg-print-legacy) .zg-marq-img,
body.zg-exporting:not(.zg-print-legacy) .zg-marq-text { outline: none !important; }


/* ---------- ธีมมืด ---------- */

body.zg-dark .canvas-object--task {
    background-image: linear-gradient(180deg, rgba(255, 255, 255, .06), rgba(255, 255, 255, 0)) !important;
    box-shadow:
        0 1px 1px rgba(0, 0, 0, .25), 0 4px 12px -4px rgba(0, 0, 0, .5),
        inset 0 0 0 1px rgba(255, 255, 255, .06);
}
body.zg-dark .canvas-object--dateline-chip { box-shadow: 0 1px 1px rgba(0, 0, 0, .25), 0 4px 12px -4px rgba(0, 0, 0, .5); }
body.zg-dark .dateline-chip-text { color: #e3e9e5; }


/* ---------- ลดการเคลื่อนไหว ---------- */

@media (prefers-reduced-motion: reduce) {
    html body .canvas-object--task,
    html body .canvas-object--dateline-chip,
    html body .zg-text-box { transition: none; }
    html body.zg-text-dragging .zg-text-box.is-near .zg-text-btn--magnet { animation: none; }
}
`;

    document.head.appendChild(style);


    /*
        v4: เลขวันบนหัวตารางใหญ่ขึ้นนิดหน่อย (เดิม ช่องวัน × 0.55 ไม่เกิน 9px)
        คิดจากความกว้างช่องวัน: เลข 2 หลักกินไม่เกิน ~80% ของช่อง → ใหญ่ขึ้นแต่ไม่เบียดเลขข้าง ๆ
    */
    /* เส้นแนวนอน: สีเส้นอยู่ที่ border (ตั้งจาก app.js) → ส่งต่อให้เงาครึ่งพิกเซลใช้สีเดียวกัน */
    if (typeof renderObjects === "function") {
        const baseRender = renderObjects;
        renderObjects = function () {
            const result = baseRender.apply(this, arguments);
            document.querySelectorAll(".canvas-object--hline").forEach(el => {
                el.style.setProperty("--zgs-hl", getComputedStyle(el).borderTopColor);
            });
            return result;
        };
    }

    if (typeof createDayLabel === "function") {

        const baseCreateDayLabel = createDayLabel;

        createDayLabel = function () {

            const result = baseCreateDayLabel.apply(this, arguments);

            const header = document.getElementById("timelineHeaderInner");
            const label = header && header.lastElementChild;

            if (label && label.classList.contains("day-number-label") && pxPerDay > 0) {
                const size = Math.max(5, Math.min(10, (pxPerDay * 0.8 + 0.4) / 1.1));
                label.style.fontSize = `${size.toFixed(2)}px`;
            }

            return result;
        };
    }

})();
