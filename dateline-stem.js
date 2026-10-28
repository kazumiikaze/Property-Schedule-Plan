"use strict";

/* =========================================================
   DATELINE-STEM.JS — เส้นวันที่ลากต่อลงไปถึงกล่องข้อความ
   - เส้นประในตารางเดิมจบที่ขอบล่างตาราง แล้วเว้นช่องว่างก่อนถึงกล่อง
   - ไฟล์นี้วาดเส้นประสีเดียวกันในช่อง bracket จากขอบบนลงไปถึงยอดสามเหลี่ยม
     ของกล่อง → เส้นคาดต่อเนื่อง เว้นไว้แค่ตรง scrollbar
   - เส้นแนวตั้ง (เส้นประ): ค่าเริ่มต้นจบที่ขอบล่างตารางหลัก (ไม่ลงไปในช่องเส้นวันที่)
     · จับปลายเส้น (จุดที่ขึ้นตอนชี้) ลากลง = ยืดลงไปในช่องเส้นวันที่ · ลากขึ้น = หด
     · ดับเบิลคลิกที่จับ = สลับ ยาวเต็มช่อง ↔ จบที่ขอบตาราง
     · ลากผ่านปลายเส้นแนวนอน → ดูดติดกัน (object.stemTo) ย้ายเส้นแนวนอนทีหลัง ปลายเส้นตามไปเอง
     · เก็บเป็นสัดส่วนความสูงช่อง (object.stemRatio) → พิมพ์ / Export / เทมเพลต ตามสัดส่วนเดียวกัน
   - เส้นวันที่ / เส้นแนวตั้ง ลอดใต้กล่องงาน (ไม่คาดทับตัวหนังสือในกล่อง)
   - ไม่แก้ app.js / style.css
========================================================= */

(function () {

    if (typeof renderObjects !== "function" || typeof bracketContent === "undefined") {
        console.warn("[dateline-stem.js] ไม่พบ renderObjects / bracketContent");
        return;
    }

    /* ความสูงสามเหลี่ยมบนกล่อง (.dateline-chip-caret top: -8px) */
    const CARET = 8;

    const style = document.createElement("style");

    style.textContent = `
.zg-dateline-stem {
    position: absolute;
    top: 0;
    width: 0;
    border-left: 2px dashed #d0342c;
    pointer-events: none;
    z-index: 4;
}
.zg-vline-stem {
    position: absolute;
    top: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 4;
}
/* ที่จับปลายเส้นแนวตั้ง: ชี้แล้วเห็นจุด · ลากขึ้นลง = ยืด / หด */
.zg-stem-grip {
    position: absolute; left: 50%; bottom: -6px; width: 14px; height: 12px; margin-left: -7px;
    pointer-events: auto; cursor: ns-resize; z-index: 6;
}
.zg-stem-grip::after {
    content: ""; position: absolute; left: 3px; top: 2px; width: 8px; height: 8px; border-radius: 50%;
    background: #fff; border: 2px solid #2e8b57; box-sizing: border-box; opacity: 0; transition: opacity .12s;
}
.zg-stem-grip:hover::after, .zg-vline-stem.is-resizing .zg-stem-grip::after { opacity: 1; }
.zg-vline-stem.is-empty .zg-stem-grip { bottom: -10px; height: 10px; }
/* กำลังจะดูดติดเส้นแนวนอน */
#bracketContent .canvas-object--hline.zg-stem-snap { outline: 2px solid rgba(230, 126, 34, .55); outline-offset: 2px; border-radius: 3px; }
.zg-stem-tip {
    position: fixed; z-index: 30010; pointer-events: none; padding: 3px 8px; border-radius: 6px;
    background: #1e2924; color: #fff; font: 11px Arial, Helvetica, sans-serif; display: none;
}
body.zg-exporting .zg-stem-grip, body.zg-print-capture .zg-stem-grip,
body.zg-exporting .zg-stem-tip, body.zg-print-capture .zg-stem-tip { display: none !important; }

/*
    เลเยอร์ตารางไม่แยกเป็นเลเยอร์ GPU (will-change: transform)
    → จอสเกล 125–150% เบราว์เซอร์วาดเลเยอร์แยกเหลื่อมไป ~1–2 พิกเซล
      เส้นในตารางกับปลายเส้นในช่องเส้นวันที่เลยไม่ต่อกันตรง ๆ
*/
#objectLayer { will-change: auto !important; }

/*
    ป้ายเส้นวันที่: ซ่อนกรอบ + เงา + สามเหลี่ยม (ผู้ใช้ขอ) — ซ่อนแค่หน้าตา
    คลิก / ลาก / พิมพ์ / ยืดย่อ / เมนู ใช้ได้เหมือนเดิม · ชี้เมาส์ = เห็นกรอบจาง ๆ ว่าตรงไหนคือป้าย
*/
html body .canvas-object--dateline-chip { border-color: transparent !important; box-shadow: none !important; }
html body .canvas-object--dateline-chip .dateline-chip-caret { display: none !important; }
html body .canvas-object--dateline-chip:hover { border-color: rgba(38, 48, 43, .18) !important; }
body.zg-exporting .canvas-object--dateline-chip:hover,
body.zg-print-capture .canvas-object--dateline-chip:hover { border-color: transparent !important; }

/* เส้นวันที่ / เส้นแนวตั้ง อยู่ใต้กล่องงาน → ไม่คาดทับกล่องให้รก */
#objectLayer .canvas-object--dateline-line,
#objectLayer .canvas-object--vline { z-index: 1 !important; }
#objectLayer .canvas-object--task { z-index: 2; }
#objectLayer .canvas-object--task.zg-obj-selected,
#objectLayer .canvas-object--task:hover { z-index: 3; }
`;

    document.head.appendChild(style);


    /* ความยาวที่ผู้ใช้ตั้งเอง (สัดส่วนของความสูงช่องเส้นวันที่) — ไม่มี = เต็มช่อง */
    const MIN_STEM = 4;
    const SNAP_FULL = 6;

    function findObject(id) {
        return typeof timelineObjects !== "undefined" ? timelineObjects.find(item => item.id === id) || null : null;
    }

    /* ดูดติดปลายเส้นแนวนอน: ปลายอยู่ห่างเส้นแนวตั้งไม่เกิน SNAP_X · ปลายที่ลากอยู่ห่างตัวเส้นไม่เกิน SNAP_Y (px) */
    const SNAP_X = 8;
    const SNAP_Y = 10;

    /* ตัวเส้นแนวนอน = ขอบบนของกล่องเส้น (ใต้เส้นเป็นที่ของข้อความ) */
    function hlineY(element) {
        return element.offsetTop + (parseFloat(getComputedStyle(element).borderTopWidth) || 1);
    }

    /* เส้นแนวนอนที่ปลายมาชนเส้นแนวตั้งนี้ (ผูกไว้ หรือปลายอยู่ตรงกัน) */
    function hlinesAt(vlineId, x) {
        return Array.from(bracketContent.querySelectorAll(".canvas-object--hline[data-object-id]")).filter(element => {
            const object = findObject(element.dataset.objectId);
            if (object && (object.anchorStartId === vlineId || object.anchorEndId === vlineId)) return true;
            const left = element.offsetLeft;
            const right = left + element.offsetWidth;
            return Math.abs(left - x) <= SNAP_X || Math.abs(right - x) <= SNAP_X;
        });
    }

    /* ติดเส้นแนวนอนไว้ และเส้นนั้นยังชนเส้นแนวตั้งนี้อยู่ → ความสูงถึงตัวเส้นพอดี */
    function snappedHeight(object, x) {
        if (!object || !object.stemTo) return null;
        const element = hlinesAt(object.id, x).find(item => item.dataset.objectId === object.stemTo);
        return element ? hlineY(element) : null;
    }

    /* 0 = จบที่ขอบล่างตาราง (ค่าเริ่มต้น) · 1 = ยาวเต็มช่องเส้นวันที่ */
    function stemRatio(object) {
        const value = Number(object && object.stemRatio);
        return value > 0 ? Math.min(1, value) : 0;
    }

    function drawVlineStems() {

        bracketContent.querySelectorAll(".zg-vline-stem").forEach(node => node.remove());

        const contentRect = bracketContent.getBoundingClientRect();
        const scale = bracketContent.offsetWidth ? contentRect.width / bracketContent.offsetWidth : 1;

        document.querySelectorAll("#objectLayer .canvas-object--vline[data-object-id]").forEach(line => {

            const cs = getComputedStyle(line);
            const offset = parseFloat(cs.getPropertyValue("--vline-offset")) || 4;
            const thickness = parseFloat(cs.getPropertyValue("--vline-thickness")) || 1;
            const color = cs.getPropertyValue("--vline-color").trim() || "#000000";

            /* กึ่งกลางเส้นพอดี (ปรับความหนาแล้วยังตรงกลาง — line-weight.js) */
            const x = (line.getBoundingClientRect().left - contentRect.left) / (scale || 1) + offset + thickness / 2;
            const object = findObject(line.dataset.objectId);
            const snapped = snappedHeight(object, x);
            const ratio = stemRatio(object);

            const stem = document.createElement("div");
            stem.className = "zg-vline-stem";
            stem.style.left = `${x}px`;
            stem.style.transform = "translateX(-50%)";
            stem.style.bottom = "auto";
            stem.style.height = snapped !== null ? `${snapped}px` : `${(ratio * 100).toFixed(3)}%`;
            stem.classList.toggle("is-empty", snapped === null && !ratio);
            /* ความยาวสำรอง (เส้นแนวนอนถูกลบ / ย้ายออก) = ตำแหน่งล่าสุดที่ติดอยู่ */
            if (snapped !== null && bracketContent.offsetHeight) object.stemRatio = Number(Math.min(1, snapped / bracketContent.offsetHeight).toFixed(4));
            stem.style.width = `${thickness}px`;
            stem.style.background = color;
            stem.style.setProperty("--vline-color", color);   /* object-skin.js วาดเป็นเส้นประด้วยสีนี้ */
            stem.dataset.stemFor = line.dataset.objectId;

            const grip = document.createElement("div");
            grip.className = "zg-stem-grip";
            grip.title = "ลากลง = ยืดเส้นลงในช่องเส้นวันที่ · ลากขึ้น = หด · ดับเบิลคลิก = ยาวเต็มช่อง / จบที่ขอบตาราง";
            stem.appendChild(grip);

            bracketContent.insertBefore(stem, bracketContent.firstChild);
        });
    }


    /* =====================================================
       ลากปลายเส้นแนวตั้ง ขึ้น-ลง
    ===================================================== */

    let resizing = null;
    let tip = null;

    function record() {
        if (window.ZGHistory && typeof window.ZGHistory.record === "function") {
            try { window.ZGHistory.record(); } catch (error) { /* ไม่เป็นไร */ }
        }
    }

    function showTip(text, x, y) {
        if (!tip) {
            tip = document.createElement("div");
            tip.className = "zg-stem-tip";
            document.body.appendChild(tip);
        }
        tip.textContent = text;
        tip.style.left = `${x + 14}px`;
        tip.style.top = `${y - 8}px`;
        tip.style.display = "block";
    }

    function stemHeightAt(clientY) {
        const rect = bracketContent.getBoundingClientRect();
        const scale = bracketContent.offsetHeight ? rect.height / bracketContent.offsetHeight : 1;
        const full = bracketContent.offsetHeight;
        const height = Math.max(0, Math.min(full, (clientY - rect.top) / (scale || 1)));
        return { height: height < MIN_STEM ? 0 : height, full, isFull: full - height <= SNAP_FULL };
    }

    bracketContent.addEventListener("pointerdown", event => {
        const grip = event.target instanceof Element ? event.target.closest(".zg-stem-grip") : null;
        if (!grip || event.button !== 0) return;
        const stem = grip.closest(".zg-vline-stem");
        const object = stem && findObject(stem.dataset.stemFor);
        if (!object) return;
        event.preventDefault();
        event.stopPropagation();
        resizing = { stem, object, pointerId: event.pointerId, x: stem.offsetLeft };
        stem.classList.add("is-resizing");
        try { grip.setPointerCapture(event.pointerId); } catch (error) { /* ไม่เป็นไร */ }
    }, true);

    window.addEventListener("pointermove", event => {
        if (!resizing || event.pointerId !== resizing.pointerId) return;
        let { height, full, isFull } = stemHeightAt(event.clientY);

        /* ปลายเส้นแนวนอนใกล้ ๆ → ดูดติด (Alt = ลากอิสระ) */
        let snap = null;
        if (!event.altKey) {
            hlinesAt(resizing.object.id, resizing.x).forEach(element => {
                const y = hlineY(element);
                const d = Math.abs(y - height);
                if (d <= SNAP_Y && (!snap || d < snap.d)) snap = { d, y, element };
            });
        }
        bracketContent.querySelectorAll(".zg-stem-snap").forEach(element => { if (!snap || element !== snap.element) element.classList.remove("zg-stem-snap"); });
        if (snap) {
            snap.element.classList.add("zg-stem-snap");
            height = snap.y;
            isFull = false;
        }

        resizing.stem.style.bottom = "auto";
        resizing.stem.style.height = isFull ? "100%" : `${height}px`;
        resizing.stem.classList.toggle("is-empty", !isFull && !height);
        resizing.ratio = isFull ? 1 : height / full;
        resizing.snapTo = snap ? snap.element.dataset.objectId : null;
        showTip(snap ? "🧲 ติดเส้นแนวนอน" : isFull ? "↕ ยาวเต็มช่อง" : !height ? "↕ จบที่ขอบตาราง" : `↕ ${Math.round(height / full * 100)}% ของช่อง`, event.clientX, event.clientY);
    });

    function finish(event) {
        if (!resizing || (event && event.pointerId !== resizing.pointerId)) return;
        const { stem, object } = resizing;
        stem.classList.remove("is-resizing");
        if (tip) tip.style.display = "none";
        bracketContent.querySelectorAll(".zg-stem-snap").forEach(element => element.classList.remove("zg-stem-snap"));
        if ("ratio" in resizing) {
            if (resizing.ratio) object.stemRatio = Number(resizing.ratio.toFixed(4));
            else delete object.stemRatio;
            if (resizing.snapTo) object.stemTo = resizing.snapTo;
            else delete object.stemTo;
            record();
            renderObjects();
        }
        resizing = null;
    }

    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);

    /* ดับเบิลคลิกที่จับ = สลับ ยาวเต็มช่อง ↔ จบที่ขอบตาราง */
    bracketContent.addEventListener("dblclick", event => {
        const grip = event.target instanceof Element ? event.target.closest(".zg-stem-grip") : null;
        if (!grip) return;
        event.preventDefault();
        event.stopPropagation();
        const object = findObject(grip.closest(".zg-vline-stem").dataset.stemFor);
        if (!object) return;
        delete object.stemTo;
        if (stemRatio(object) >= 1) delete object.stemRatio;
        else object.stemRatio = 1;
        record();
        renderObjects();
    }, true);

    /* กดที่จับแล้วไม่ให้ระบบอื่น (ลากคลุม / เลือก object) ทำงาน */
    ["mousedown", "click"].forEach(type => bracketContent.addEventListener(type, event => {
        if (event.target instanceof Element && event.target.closest(".zg-stem-grip")) event.stopPropagation();
    }, true));

    function drawStems() {

        drawVlineStems();

        bracketContent.querySelectorAll(".zg-dateline-stem").forEach(node => node.remove());

        bracketContent.querySelectorAll(".canvas-object--dateline-chip").forEach(chip => {

            /* สามเหลี่ยมซ่อนแล้ว → เส้นลากลงไปชนขอบบนของป้ายพอดี */
            const height = chip.offsetTop;

            if (height <= 0) return;

            const stem = document.createElement("div");

            stem.className = "zg-dateline-stem";
            /* ให้ตรงกับเส้นประในตารางพอดี (ถ้าหาเจอ) ไม่งั้นใช้กึ่งกลางกล่อง */
            const id = chip.dataset.objectId;
            const line = id && document.querySelector(`.canvas-object--dateline-line[data-object-id="${CSS.escape(id)}"]`);

            let left = chip.offsetLeft + chip.offsetWidth / 2 - 1;

            if (line) {
                const scale = bracketContent.offsetWidth ? bracketContent.getBoundingClientRect().width / bracketContent.offsetWidth : 1;
                /* กึ่งกลางเส้น − ครึ่งพิกเซล (เส้นขอบ 1px ที่ถูกยืดตามความหนา) → ตรงกลางเส้นพอดีทุกความหนา */
                const rect = line.getBoundingClientRect();
                left = (rect.left + rect.width / 2 - bracketContent.getBoundingClientRect().left) / (scale || 1) - 0.5;
            }

            stem.style.left = `${left}px`;
            stem.style.height = `${height}px`;

            if (chip.style.borderColor) stem.style.borderLeftColor = chip.style.borderColor;

            if (chip.dataset.objectId) stem.dataset.stemFor = chip.dataset.objectId;

            bracketContent.insertBefore(stem, bracketContent.firstChild);
        });
    }

    const originalRender = renderObjects;

    renderObjects = function () {

        const result = originalRender.apply(this, arguments);

        try {
            drawStems();
        } catch (error) {
            console.error("[dateline-stem.js]", error);
        }

        return result;
    };

    window.addEventListener("resize", () => requestAnimationFrame(drawStems));

    drawStems();

})();
