"use strict";

/* =========================================================
   LINE-WEIGHT.JS — ปรับความหนาเส้นวันที่ (ทึบ) และเส้นแนวตั้ง (ประ) แบบลื่น ๆ
   - เมนูเส้น (คลิกเส้น) → แถบเลื่อน "ความหนาเส้น" 0.5 – 6 px ทีละ 0.25
     ลากแล้วเส้นบนกระดานหนา / บางตามทันที (เปลี่ยนแบบนุ่ม ๆ) · ปุ่มลัด บาง / ปกติ / หนา
   - เส้นแนวตั้ง: แทนปุ่ม − / ＋ เดิม (เดิมค่า 1 กับ 2 หน้าตาเท่ากัน)
   - เก็บใน object.lineW (px) → บันทึก Export เทมเพลต ชุดสำเร็จ พิมพ์ ได้ครบ · Ctrl+Z ได้
     ไม่ได้ตั้ง = หน้าตาเดิมทุกอย่าง
   - วาดด้วยกฎ CSS ตาม id ของเส้น → วาดใหม่กี่ครั้งก็ยังหนาเท่าเดิม
   - ไม่แก้ app.js — โหลดหลัง dateline-stem.js
========================================================= */

(function () {

    if (typeof openObjectMenu !== "function" || typeof renderObjects !== "function") {
        console.warn("[line-weight.js] ต้องโหลดหลัง app.js");
        return;
    }

    const MIN = 0.5;
    const MAX = 6;
    const STEP = 0.25;
    const PRESETS = [["บาง", 1], ["ปกติ", 1.5], ["หนา", 3]];
    /* กึ่งกลางเส้นแนวตั้งในกล่องจับ (app.js HIT_PADDING 5 − ครึ่งพิกเซล) — ตรงกับเส้น 1px เดิม */
    const VLINE_CENTER = 4.5;

    const clamp = value => Math.max(MIN, Math.min(MAX, Math.round(value / STEP) * STEP));
    const label = value => `${Number(value.toFixed(2))} px`;

    function findObject(id) {
        return timelineObjects.find(object => object.id === id) || null;
    }

    /* ความหนาที่เห็นตอนนี้ (ยังไม่เคยตั้ง = ตามหน้าตาเดิม) */
    function weightOf(object) {
        if (Number(object.lineW) > 0) return clamp(Number(object.lineW));
        if (object.type === "vline") {
            const old = Number(object.lineThickness) || 1;
            return clamp(old === 2 ? 1 : old);
        }
        return 1.5;
    }


    /* =====================================================
       หน้าตา
    ===================================================== */

    const style = document.createElement("style");
    style.textContent = `
/* เปลี่ยนความหนาแบบนุ่ม ๆ */
html body .canvas-object--dateline-line,
html body .zg-dateline-stem { transition: transform .16s cubic-bezier(.2, .8, .2, 1); }
html body .canvas-object--vline::after { transition: width .16s cubic-bezier(.2, .8, .2, 1), left .16s cubic-bezier(.2, .8, .2, 1); }
html body .zg-vline-stem { transition: width .16s cubic-bezier(.2, .8, .2, 1); }
body.zg-exporting .canvas-object--dateline-line, body.zg-exporting .zg-dateline-stem,
body.zg-exporting .canvas-object--vline::after, body.zg-exporting .zg-vline-stem { transition: none !important; }

.zg-lw { padding-top: 2px; }
.zg-lw-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
.zg-lw-val {
    min-width: 46px; text-align: right; font: 700 12px/1 Arial, Helvetica, sans-serif; color: #2e8b57;
    font-variant-numeric: tabular-nums;
}
.zg-lw-row { display: flex; align-items: center; gap: 10px; }
.zg-lw-preview {
    flex: none; width: 34px; height: 30px; border-radius: 7px; background: #f4f7f5;
    border: 1px solid #e3e9e5; display: flex; align-items: center; justify-content: center;
}
.zg-lw-preview i {
    display: block; height: 22px; width: var(--w, 1.5px); border-radius: 99px; background: var(--c, #d0342c);
    transition: width .16s cubic-bezier(.2, .8, .2, 1);
}
.zg-lw-preview.is-dashed i {
    border-radius: 0;
    background: repeating-linear-gradient(to bottom, var(--c, #000) 0 4px, transparent 4px 7px);
}
.zg-lw-range {
    -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 22px; margin: 0;
    background: transparent; cursor: pointer;
}
.zg-lw-range:focus { outline: none; }
/* ราง: เรียวจากบางไปหนา (บอกว่าลากไปทางไหนหนาขึ้น) · ส่วนที่เลือกแล้วเป็นสีเขียว */
.zg-lw-range::-webkit-slider-runnable-track {
    height: 10px; border-radius: 99px;
    background: linear-gradient(90deg, #2e8b57 0 var(--p, 20%), #dfe6e2 var(--p, 20%) 100%);
    clip-path: polygon(0 40%, 100% 0, 100% 100%, 0 60%);
}
.zg-lw-range::-moz-range-track {
    height: 10px; border-radius: 99px;
    background: linear-gradient(90deg, #2e8b57 0 var(--p, 20%), #dfe6e2 var(--p, 20%) 100%);
}
.zg-lw-range::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none; width: 18px; height: 18px; margin-top: -4px; border-radius: 50%;
    background: #fff; border: 2px solid #2e8b57; box-shadow: 0 1px 4px rgba(0, 0, 0, .22);
    transition: transform .12s ease, box-shadow .12s ease;
}
.zg-lw-range::-moz-range-thumb {
    width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 2px solid #2e8b57;
    box-shadow: 0 1px 4px rgba(0, 0, 0, .22);
}
.zg-lw-range:hover::-webkit-slider-thumb { transform: scale(1.1); }
.zg-lw-range:active::-webkit-slider-thumb { transform: scale(1.2); box-shadow: 0 0 0 5px rgba(46, 139, 87, .16), 0 1px 4px rgba(0, 0, 0, .22); }
.zg-lw-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 4px rgba(46, 139, 87, .28); }
.zg-lw-presets { display: flex; gap: 6px; margin-top: 8px; }
.zg-lw-presets button {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; height: 26px; padding: 0 6px;
    border: 1px solid #dde3e0; border-radius: 7px; background: #fff; color: #3d4742;
    font: 600 11px Arial, Helvetica, sans-serif; cursor: pointer;
    transition: background .12s ease, border-color .12s ease, color .12s ease;
}
.zg-lw-presets button i { display: block; width: 14px; height: var(--h); border-radius: 99px; background: currentColor; }
.zg-lw-presets button:hover { background: #f3f7f4; }
.zg-lw-presets button.is-on { background: #e8f3ec; border-color: #2e8b57; color: #2e8b57; }
@media (prefers-reduced-motion: reduce) {
    html body .canvas-object--dateline-line, html body .zg-dateline-stem,
    html body .canvas-object--vline::after, html body .zg-vline-stem,
    .zg-lw-preview i, .zg-lw-range::-webkit-slider-thumb { transition: none !important; }
}
body.zg-dark .zg-lw-preview { background: #2b3330; border-color: #3a4440; }
body.zg-dark .zg-lw-presets button { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-lw-presets button.is-on { background: #23392c; color: #8fd3a8; border-color: #2e8b57; }
`;
    document.head.appendChild(style);

    /* กฎความหนาของแต่ละเส้น (ตาม id) */
    const rules = document.createElement("style");
    rules.id = "zg-line-weight-rules";
    document.head.appendChild(rules);

    function writeRules() {
        const out = [];
        timelineObjects.forEach(object => {
            if (!(Number(object.lineW) > 0)) return;
            const id = CSS.escape(object.id);
            const w = clamp(Number(object.lineW));
            if (object.type === "dateline") {
                /* เส้นขอบ 1px (object-skin.js) ยืดตามแนวนอน = หนาเท่าที่ตั้ง (ไม่ปัดเศษ) */
                out.push(`html body .canvas-object--dateline-line[data-object-id="${id}"], html body .zg-dateline-stem[data-stem-for="${id}"] { transform: scaleX(${w}) !important; }`);
            } else if (object.type === "vline") {
                out.push(`html body .canvas-object--vline[data-object-id="${id}"] { --vline-thickness: ${w}px !important; --vline-offset: ${(VLINE_CENTER - w / 2).toFixed(3)}px !important; }`);
                out.push(`html body .zg-vline-stem[data-stem-for="${id}"] { width: ${w}px !important; }`);
            }
        });
        const text = out.join("\n");
        if (rules.textContent !== text) rules.textContent = text;
    }

    const originalRender = renderObjects;
    renderObjects = function () {
        try { writeRules(); } catch (error) { console.error("[line-weight.js]", error); }
        return originalRender.apply(this, arguments);
    };

    window.addEventListener("zg-plan-applied", () => writeRules());


    /* =====================================================
       แถบเลื่อนในเมนูเส้น
    ===================================================== */

    function record() {
        if (window.ZGHistory && typeof window.ZGHistory.record === "function") {
            try { window.ZGHistory.record(); } catch (error) { /* ไม่เป็นไร */ }
        }
    }

    function lineColor(object) {
        if (object.type === "vline") return object.lineColor || "#000000";
        const line = document.querySelector(`.canvas-object--dateline-line[data-object-id="${CSS.escape(object.id)}"]`);
        return line ? getComputedStyle(line).borderLeftColor : "#d0342c";
    }

    function buildSection(object) {

        const section = document.createElement("div");
        section.className = "object-menu-section zg-lw";
        section.innerHTML = `
            <div class="zg-lw-head"><span class="object-menu-label">ความหนาเส้น</span><span class="zg-lw-val"></span></div>
            <div class="zg-lw-row">
                <div class="zg-lw-preview${object.type === "vline" ? " is-dashed" : ""}" aria-hidden="true"><i></i></div>
                <input type="range" class="zg-lw-range" min="${MIN}" max="${MAX}" step="${STEP}" aria-label="ความหนาเส้น">
            </div>
            <div class="zg-lw-presets">
                ${PRESETS.map(([name, w]) => `<button type="button" data-w="${w}" title="${label(w)}"><i style="--h:${Math.max(1, w)}px"></i>${name}</button>`).join("")}
            </div>`;

        const range = section.querySelector(".zg-lw-range");
        const value = section.querySelector(".zg-lw-val");
        const preview = section.querySelector(".zg-lw-preview");
        preview.style.setProperty("--c", lineColor(object));

        let dirty = false;

        function paint(w) {
            range.value = String(w);
            range.style.setProperty("--p", `${((w - MIN) / (MAX - MIN) * 100).toFixed(1)}%`);
            value.textContent = label(w);
            preview.style.setProperty("--w", `${w}px`);
            section.querySelectorAll("[data-w]").forEach(button => button.classList.toggle("is-on", Number(button.dataset.w) === w));
        }

        function set(w, commit) {
            w = clamp(w);
            if (Number(object.lineW) !== w) {
                object.lineW = w;
                dirty = true;
                writeRules();
            }
            paint(w);
            if (commit && dirty) {
                dirty = false;
                record();
                /* ปลายเส้นในช่องเส้นวันที่ วาดตำแหน่งใหม่ให้ตรงกลางเส้นพอดี */
                requestAnimationFrame(() => renderObjects());
            }
        }

        range.addEventListener("input", () => set(Number(range.value), false));
        range.addEventListener("change", () => set(Number(range.value), true));
        section.addEventListener("click", event => {
            const button = event.target instanceof Element ? event.target.closest("[data-w]") : null;
            if (button) set(Number(button.dataset.w), true);
        });
        /* ไม่ให้เมนู / การลากกระดานแย่งตอนลากแถบ */
        ["mousedown", "pointerdown"].forEach(type => section.addEventListener(type, event => event.stopPropagation()));

        paint(weightOf(object));
        return section;
    }

    /* ใส่แถบความหนาลงในเมนูของเส้นที่เปิดอยู่ (ถ้ายังไม่มี) */
    function inject(object) {
        const menu = document.querySelector(".object-menu");
        if (!menu || menu.querySelector(".zg-lw")) return Boolean(menu);
        /* เส้นแนวตั้ง: ปุ่ม − / ＋ เดิม → ใช้แถบเลื่อนแทน */
        const oldStepper = menu.querySelector("#objMenuLineThicknessMinus");
        if (oldStepper) oldStepper.closest(".object-menu-row").style.display = "none";
        const section = buildSection(object);
        const after = menu.querySelector("#objMenuDateInput");
        const anchor = after ? after.closest(".object-menu-section") : null;
        if (anchor && anchor.nextSibling) anchor.parentNode.insertBefore(section, anchor.nextSibling);
        else menu.appendChild(section);
        /* เมนูสูงขึ้น → ดันกลับเข้าจอ (panel-drag.js) */
        window.dispatchEvent(new Event("resize"));
        return true;
    }

    /*
        คลิกเส้นบนกระดาน → เมนูเปิดช้ากว่าการเรียกนิดหนึ่ง (ไฟล์อื่นเลื่อนไปเปิดทีหลัง)
        → จำเส้นที่ขอเปิดไว้ แล้วใส่แถบตอนเมนูโผล่จริง
    */
    let pending = null;

    new MutationObserver(() => {
        if (!pending) return;
        const menu = document.querySelector(".object-menu");
        if (!menu) return;
        const object = pending;
        pending = null;
        try { inject(object); } catch (error) { console.error("[line-weight.js]", error); }
    }).observe(document.body, { childList: true, subtree: true });

    const originalOpen = openObjectMenu;
    openObjectMenu = function (object) {
        const isLine = object && (object.type === "dateline" || object.type === "vline");
        pending = isLine ? object : null;
        const result = originalOpen.apply(this, arguments);
        if (isLine) {
            try {
                if (inject(object)) pending = null;
            } catch (error) {
                console.error("[line-weight.js]", error);
            }
        }
        return result;
    };

    writeRules();

    window.ZGLineWeight = { weightOf, apply: writeRules };

})();
