"use strict";

/* =========================================================
   TEXT-SIZE.JS — ปรับขนาดตัวหนังสือได้ทุกช่องที่พิมพ์ได้
   - คลิกเข้าไปพิมพ์ช่องไหนก็ได้ → มีแถบเล็กลอยเหนือช่อง: A−  [ขนาด]  A+  ↺
     · Ctrl + Shift + > / <  = ใหญ่ขึ้น / เล็กลง
   - ใช้ได้กับ: ข้อความในกล่องงาน, ป้ายเส้นวันที่, เส้นช่วงเวลา, กล่องข้อความ,
     ชื่อหมวด, ชื่อแถว / บทบาท, หัวข้อ + เนื้อหาบันทึก, หัวข้อแผน / บรรทัดรอง
   - ปุ่ม A→ = หมุนข้อความ: แนวนอน → แนวตั้ง (อ่านบนลงล่าง) → แนวตั้ง (อ่านล่างขึ้นบน)
   - ปุ่ม B = ตัวหนา (Ctrl+B) · ปุ่ม • = ใส่/เอาจุดหน้าประโยค (Ctrl+Shift+8)
     · บรรทัดที่มีจุด กด Enter → บรรทัดใหม่มีจุดให้เอง (กด Enter ซ้ำบนบรรทัดว่าง = เลิกใส่จุด)
   - บันทึกไปกับแผน (Export / Import / เทมเพลต / ↶ ย้อนกลับ ได้)
     กล่องงาน / เส้น เก็บขนาดไว้ที่ object เอง → ชุดสำเร็จจำขนาดด้วย
   - ไม่แก้ app.js / style.css — โหลดหลัง notes-plus.js, header-plus.js
========================================================= */

(function () {

    const io = window.ZGPlanIO;

    if (!io || typeof io.build !== "function" || typeof io.apply !== "function") {
        console.warn("[text-size.js] ไม่พบ io.js");
        return;
    }

    const MIN = 7;
    const MAX = 48;

    /* ขนาดที่ตั้งไว้ (นอกจาก object) — key → px */
    let sizes = {};

    /* ตัวหนา (นอกจาก object) — key → true / false */
    let bolds = {};

    /* หมุนข้อความ (นอกจาก object) — key → 90 | 270 */
    let rotates = {};
    const ROTATIONS = [0, 90, 270];
    const ROTATE_ICON = { 0: "A→", 90: "A↓", 270: "A↑" };

    const BULLET = "• ";

    const style = document.createElement("style");

    style.textContent = `
.zg-ts-bar {
    position: fixed; z-index: 27500; display: flex; align-items: center; gap: 2px;
    padding: 3px; border-radius: 9px; background: #1e2924; color: #fff;
    box-shadow: 0 6px 18px rgba(0,0,0,.25); font: 12px Arial, Helvetica, sans-serif;
    transform: translateY(-100%); user-select: none;
}
.zg-ts-bar button {
    min-width: 26px; height: 24px; border: 0; border-radius: 6px; background: transparent; color: #fff;
    font: 700 12px Arial, Helvetica, sans-serif; cursor: pointer; padding: 0 6px;
}
.zg-ts-bar button:hover { background: rgba(255,255,255,.14); }
.zg-ts-bar button[data-ts="down"] { font-size: 10px; }
.zg-ts-bar button[data-ts="up"] { font-size: 14px; }
.zg-ts-bar .zg-ts-val { min-width: 34px; text-align: center; font-weight: 700; color: #bfe8cf; }
.zg-ts-bar button[data-ts="bold"] { font: 900 13px Arial, Helvetica, sans-serif; }
.zg-ts-bar button[data-ts="bullet"] { font-size: 16px; line-height: 1; }
.zg-ts-bar button.is-on { background: #2e8b57; }
.zg-ts-bar button[data-ts="rotate"] { min-width: 34px; font-size: 12px; }
.zg-rot-90 { writing-mode: vertical-rl !important; text-orientation: mixed; }
.zg-rot-270 { writing-mode: sideways-lr !important; }
@supports not (writing-mode: sideways-lr) {
    .zg-rot-270 { writing-mode: vertical-rl !important; transform: rotate(180deg); }
}
.canvas-object--task .canvas-object-label.zg-rot-90,
.canvas-object--task .canvas-object-label.zg-rot-270 { max-height: 100%; max-width: none; }
.zg-ts-bar .zg-ts-sep { width: 1px; height: 16px; background: rgba(255,255,255,.2); margin: 0 2px; }
body.zg-exporting .zg-ts-bar { display: none !important; }
.canvas-object--task .canvas-object-label[style*="font-size"] { line-height: 1.2; }
`;

    document.head.appendChild(style);


    /* =====================================================
       ช่องไหนเก็บขนาดไว้ที่ไหน
    ===================================================== */

    const OBJECT_TEXT = ".canvas-object-label, .dateline-chip-text";

    function findObject(id) {
        return typeof timelineObjects !== "undefined" ? timelineObjects.find(object => object.id === id) : null;
    }

    /* คืน { kind, key, object } ของช่องพิมพ์ หรือ null */
    function targetOf(element) {

        if (!(element instanceof Element)) return null;

        const objectText = element.closest(OBJECT_TEXT);
        if (objectText) {
            const holder = objectText.closest("[data-object-id]");
            const object = holder && findObject(holder.dataset.objectId);
            if (object) return { kind: "object", object, element: objectText };
        }

        const textContent = element.closest(".zg-text-box[data-text-id] .zg-text-content");
        if (textContent) {
            return { kind: "map", key: `text:${textContent.closest(".zg-text-box").dataset.textId}`, element: textContent };
        }

        const note = element.closest(".note-card[data-note-id] .note-header, .note-card[data-note-id] .note-body");
        if (note) {
            const id = note.closest(".note-card").dataset.noteId;
            return { kind: "map", key: `note:${id}:${note.classList.contains("note-header") ? "h" : "b"}`, element: note };
        }

        const category = element.closest(".category[data-category-id] .category-name");
        if (category) {
            return { kind: "map", key: `cat:${category.closest(".category").dataset.categoryId}`, element: category };
        }

        const row = element.closest(".party-row[data-row-id] .party-main, .party-row[data-row-id] .party-role");
        if (row) {
            const id = row.closest(".party-row").dataset.rowId;
            return { kind: "map", key: `row:${id}:${row.classList.contains("party-role") ? "role" : "main"}`, element: row };
        }

        const title = element.closest(".plan-header .title, .plan-header .subtitle");
        if (title) {
            return { kind: "map", key: title.classList.contains("title") ? "title" : "subtitle", element: title };
        }

        return null;
    }

    function storedSize(target) {
        if (target.kind === "object") return Number(target.object.fontSize) || null;
        return Number(sizes[target.key]) || null;
    }

    function currentSize(target) {
        return storedSize(target) || Math.round(parseFloat(getComputedStyle(target.element).fontSize) || 12);
    }

    function storedBold(target) {
        const value = target.kind === "object" ? target.object.fontBold : bolds[target.key];
        return typeof value === "boolean" ? value : null;
    }

    function isBold(target) {
        const stored = storedBold(target);
        if (stored !== null) return stored;
        return (parseInt(getComputedStyle(target.element).fontWeight, 10) || 400) >= 600;
    }

    function setBold(element, value) {
        const want = value === true ? "700" : value === false ? "400" : "";
        if (element.style.fontWeight !== want) element.style.fontWeight = want;
    }

    function boldValue(value) {
        return typeof value === "boolean" ? value : null;
    }


    /* =====================================================
       ใส่ขนาดให้ทุกช่อง (หลังวาดใหม่ทุกครั้ง)
    ===================================================== */

    function setSize(element, px) {
        if (px) {
            if (element.style.fontSize !== `${px}px`) element.style.fontSize = `${px}px`;
        } else if (element.style.fontSize) {
            element.style.fontSize = "";
        }
    }

    /* ขนาด + ตัวหนา */
    function paint(element, px, bold) {
        setSize(element, px);
        setBold(element, boldValue(bold));
    }

    /* ---------- หมุนข้อความ ---------- */

    const ALL_FIELDS = [
        OBJECT_TEXT,
        ".zg-text-box[data-text-id] .zg-text-content",
        ".note-card[data-note-id] .note-header",
        ".note-card[data-note-id] .note-body",
        ".category[data-category-id] .category-name",
        ".party-row[data-row-id] .party-main",
        ".party-row[data-row-id] .party-role",
        ".plan-header .title",
        ".plan-header .subtitle"
    ].join(", ");

    function rotationOf(target) {
        const value = Number(target.kind === "object" ? target.object.textRotate : rotates[target.key]);
        return ROTATIONS.includes(value) ? value : 0;
    }

    function setRotation(element, value) {
        element.classList.toggle("zg-rot-90", value === 90);
        element.classList.toggle("zg-rot-270", value === 270);
    }

    function applyRotations() {
        document.querySelectorAll(ALL_FIELDS).forEach(element => {
            const target = targetOf(element);
            if (target) setRotation(element, rotationOf(target));
        });
    }

    function applyAll() {

        try { applyRotations(); } catch (error) { console.error("[text-size.js]", error); }

        document.querySelectorAll("[data-object-id]").forEach(holder => {
            const object = findObject(holder.dataset.objectId);
            if (!object) return;
            holder.querySelectorAll(OBJECT_TEXT).forEach(element => paint(element, Number(object.fontSize) || 0, object.fontBold));
        });

        document.querySelectorAll(".zg-text-box[data-text-id] .zg-text-content").forEach(element => {
            const key = `text:${element.closest(".zg-text-box").dataset.textId}`;
            paint(element, Number(sizes[key]) || 0, bolds[key]);
        });

        document.querySelectorAll(".note-card[data-note-id]").forEach(card => {
            const id = card.dataset.noteId;
            const header = card.querySelector(".note-header");
            const body = card.querySelector(".note-body");
            if (header) paint(header, Number(sizes[`note:${id}:h`]) || 0, bolds[`note:${id}:h`]);
            if (body) paint(body, Number(sizes[`note:${id}:b`]) || 0, bolds[`note:${id}:b`]);
        });

        document.querySelectorAll(".category[data-category-id] .category-name").forEach(element => {
            const key = `cat:${element.closest(".category").dataset.categoryId}`;
            paint(element, Number(sizes[key]) || 0, bolds[key]);
        });

        document.querySelectorAll(".party-row[data-row-id]").forEach(row => {
            const id = row.dataset.rowId;
            const main = row.querySelector(".party-main");
            const role = row.querySelector(".party-role");
            if (main) paint(main, Number(sizes[`row:${id}:main`]) || 0, bolds[`row:${id}:main`]);
            if (role) paint(role, Number(sizes[`row:${id}:role`]) || 0, bolds[`row:${id}:role`]);
        });

        const title = document.querySelector(".plan-header .title");
        const subtitle = document.querySelector(".plan-header .subtitle");
        if (title) paint(title, Number(sizes.title) || 0, bolds.title);
        if (subtitle) paint(subtitle, Number(sizes.subtitle) || 0, bolds.subtitle);
    }

    let scheduled = false;

    function scheduleApply() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            try { applyAll(); } catch (error) { console.error("[text-size.js]", error); }
            positionBar();
        });
    }

    /* อะไรถูกวาดใหม่ก็ใส่ขนาดกลับ */
    new MutationObserver(scheduleApply).observe(document.body, { childList: true, subtree: true });


    /* =====================================================
       บันทึกไปกับแผน
    ===================================================== */

    const originalBuild = io.build;
    io.build = function () {
        const data = originalBuild.apply(this, arguments);
        if (data && typeof data === "object") {
            data.fontSizes = { ...sizes };
            data.fontBolds = { ...bolds };
            data.textRotates = { ...rotates };
        }
        return data;
    };

    const originalApply = io.apply;
    io.apply = function (data) {
        sizes = data && data.fontSizes && typeof data.fontSizes === "object" ? { ...data.fontSizes } : {};
        bolds = data && data.fontBolds && typeof data.fontBolds === "object" ? { ...data.fontBolds } : {};
        rotates = data && data.textRotates && typeof data.textRotates === "object" ? { ...data.textRotates } : {};
        const result = originalApply.apply(this, arguments);
        scheduleApply();
        return result;
    };

    function record() {
        if (window.ZGHistory && typeof window.ZGHistory.record === "function") {
            try { window.ZGHistory.record(); } catch (error) { /* ไม่เป็นไร */ }
        }
    }


    /* =====================================================
       แถบ A− / A+ เหนือช่องที่กำลังพิมพ์
    ===================================================== */

    let bar = null;
    let active = null;
    let hideTimer = null;

    function ensureBar() {

        if (bar) return bar;

        bar = document.createElement("div");
        bar.className = "zg-ts-bar";
        bar.innerHTML = `
            <button type="button" data-ts="down" title="เล็กลง (Ctrl+Shift+<)">A−</button>
            <span class="zg-ts-val" data-ts-val></span>
            <button type="button" data-ts="up" title="ใหญ่ขึ้น (Ctrl+Shift+>)">A+</button>
            <span class="zg-ts-sep"></span>
            <button type="button" data-ts="reset" title="ขนาดเดิม">↺</button>
            <span class="zg-ts-sep"></span>
            <button type="button" data-ts="bold" title="ตัวหนา (Ctrl+B)">B</button>
            <button type="button" data-ts="bullet" title="ใส่/เอาจุดหน้าประโยค (Ctrl+Shift+8)">•</button>
            <button type="button" data-ts="rotate" title="หมุนข้อความ (แนวนอน / แนวตั้ง)">A→</button>`;

        /* กดแล้วไม่ให้ช่องพิมพ์หลุดโฟกัส / ไม่ให้ระบบเลือก object ล้างการเลือก */
        bar.addEventListener("mousedown", event => { event.preventDefault(); event.stopPropagation(); });
        bar.addEventListener("pointerdown", event => event.stopPropagation());

        bar.addEventListener("click", event => {
            const button = event.target instanceof Element ? event.target.closest("[data-ts]") : null;
            if (!button || !active) return;
            const action = button.dataset.ts;
            if (action === "reset") change(null);
            else if (action === "bold") toggleBold();
            else if (action === "rotate") cycleRotation();
            else if (action === "bullet") toggleBullets();
            else change(action === "up" ? 1 : -1);
        });

        document.body.appendChild(bar);
        return bar;
    }

    function stepFor(size) {
        return size >= 24 ? 2 : 1;
    }

    function change(direction) {

        if (!active) return;

        let next = null;

        if (direction !== null) {
            const size = currentSize(active);
            next = Math.max(MIN, Math.min(MAX, size + direction * stepFor(direction > 0 ? size : size - 1)));
        }

        if (active.kind === "object") {
            if (next) active.object.fontSize = next;
            else delete active.object.fontSize;
        } else if (next) {
            sizes[active.key] = next;
        } else {
            delete sizes[active.key];
        }

        /* ช่องที่กำลังพิมพ์อาจถูกวาดใหม่ → หาใหม่จากตำแหน่งเดิม */
        applyAll();
        paintBar();
        positionBar();
        record();
    }

    function paintBar() {
        if (!bar || !active) return;
        const value = bar.querySelector("[data-ts-val]");
        value.textContent = `${currentSize(active)}px`;
        bar.querySelector('[data-ts="reset"]').style.opacity = storedSize(active) ? "1" : ".4";
        bar.querySelector('[data-ts="bold"]').classList.toggle("is-on", isBold(active));
        const rotation = rotationOf(active);
        const rotateBtn = bar.querySelector('[data-ts="rotate"]');
        rotateBtn.textContent = ROTATE_ICON[rotation];
        rotateBtn.classList.toggle("is-on", rotation !== 0);
        const lines = lineInfo(active.element);
        bar.querySelector('[data-ts="bullet"]').classList.toggle("is-on", Boolean(lines) && lines.picked.every(index => lines.lines[index].startsWith(BULLET)));
    }

    function positionBar() {

        if (!bar || !active) return;

        if (!active.element.isConnected) {
            /* ถูกวาดใหม่ → ใช้ช่องที่โฟกัสอยู่ตอนนี้ */
            const again = targetOf(document.activeElement);
            if (again) active = again;
            else { hideBar(); return; }
        }

        const rect = active.element.getBoundingClientRect();
        if (!rect.width && !rect.height) { bar.style.display = "none"; return; }

        bar.style.display = "";

        /*
            ช่องในแถบซ้าย (ชื่อหมวด / ชื่อแถว / บทบาท) → วางแถบไว้ด้านขวาของแถบซ้าย
            (เหนือรายการคำแนะนำ) ไม่บังหมวด / แถวข้างบน — เดิมบังจนคลิกช่องอื่นไม่ได้
        */
        if (active.element.closest(".category, .party-row")) {
            const party = document.getElementById("partySidebar") || document.querySelector(".party-sidebar");
            const edge = party ? party.getBoundingClientRect().right : rect.right;
            const sideLeft = Math.max(6, Math.min(window.innerWidth - bar.offsetWidth - 6, edge + 8));
            const sideTop = Math.max(bar.offsetHeight + 6, rect.top + rect.height / 2 - 30);
            bar.style.left = `${sideLeft}px`;
            bar.style.top = `${sideTop}px`;
            return;
        }

        const left = Math.max(6, Math.min(window.innerWidth - bar.offsetWidth - 6, rect.left));
        const top = Math.max(bar.offsetHeight + 6, rect.top - 6);
        bar.style.left = `${left}px`;
        bar.style.top = `${top}px`;
    }

    function hideBar() {
        active = null;
        if (bar) bar.style.display = "none";
    }

    /* =====================================================
       ตัวหนา
    ===================================================== */

    function toggleBold() {

        if (!active) return;

        const next = !isBold(active);

        if (active.kind === "object") active.object.fontBold = next;
        else bolds[active.key] = next;

        applyAll();
        paintBar();
        record();
    }


    /* =====================================================
       หมุนข้อความ: แนวนอน → แนวตั้ง ↓ → แนวตั้ง ↑ → แนวนอน
    ===================================================== */

    function cycleRotation() {

        if (!active) return;

        const next = ROTATIONS[(ROTATIONS.indexOf(rotationOf(active)) + 1) % ROTATIONS.length];

        if (active.kind === "object") {
            if (next) active.object.textRotate = next;
            else delete active.object.textRotate;
        } else if (next) {
            rotates[active.key] = next;
        } else {
            delete rotates[active.key];
        }

        applyAll();
        paintBar();
        positionBar();
        record();
    }


    /* =====================================================
       จุดหน้าประโยค
    ===================================================== */

    function multiline(element) {
        return /^pre/.test(getComputedStyle(element).whiteSpace);
    }

    /* ข้อความที่เห็น (บรรทัดคั่นด้วย \n) */
    function textOf(element) {
        return (element.innerText || "").replace(/\r/g, "").replace(/\n$/, "");
    }

    /* ตำแหน่ง caret / selection เป็นจำนวนตัวอักษรของ textOf */
    function offsetOf(element, node, offset) {
        const range = document.createRange();
        range.selectNodeContents(element);
        try { range.setEnd(node, offset); } catch (error) { return textOf(element).length; }
        const probe = document.createElement("div");
        probe.style.cssText = "position:fixed;left:-9999px;top:0;white-space:pre-wrap;";
        probe.appendChild(range.cloneContents());
        document.body.appendChild(probe);
        const length = (probe.innerText || "").replace(/\r/g, "").length;
        probe.remove();
        return length;
    }

    function selectionOffsets(element) {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount || !element.contains(selection.anchorNode)) {
            const end = textOf(element).length;
            return { start: end, end };
        }
        const range = selection.getRangeAt(0);
        const start = offsetOf(element, range.startContainer, range.startOffset);
        const end = range.collapsed ? start : offsetOf(element, range.endContainer, range.endOffset);
        return { start, end };
    }

    /* บรรทัดทั้งหมด + บรรทัดที่เลือก/caret อยู่ */
    function lineInfo(element) {

        if (!element || !element.isConnected) return null;

        const text = textOf(element);
        const lines = multiline(element) ? text.split("\n") : [text.replace(/\n/g, " ")];
        const { start, end } = selectionOffsets(element);

        const picked = [];
        let position = 0;

        lines.forEach((line, index) => {
            const lineStart = position;
            const lineEnd = position + line.length;
            if (lines.length === 1 || (lineEnd >= start && lineStart <= end)) picked.push(index);
            position = lineEnd + 1;
        });

        if (!picked.length) picked.push(lines.length - 1);

        return { text, lines, picked, start, end };
    }

    function placeCaret(element, offset) {
        const node = element.firstChild;
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        if (node && node.nodeType === Node.TEXT_NODE) {
            range.setStart(node, Math.max(0, Math.min(node.length, offset)));
        } else {
            range.selectNodeContents(element);
            range.collapse(false);
        }
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    /* เปลี่ยนข้อความทั้งช่อง แล้วบอกระบบเดิมให้บันทึก (เหมือนพิมพ์เอง) */
    function writeText(element, text, caret) {
        element.textContent = text;
        if (document.activeElement !== element) element.focus();
        placeCaret(element, caret);
        element.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function toggleBullets() {

        if (!active) return;

        const element = active.element;
        const info = lineInfo(element);
        if (!info) return;

        const { lines, picked } = info;

        /* ทุกบรรทัดที่เลือกมีจุดแล้ว → เอาออก, ไม่งั้น → ใส่ */
        const remove = picked.every(index => lines[index].startsWith(BULLET));

        let caret = info.start;
        let position = 0;

        const next = lines.map((line, index) => {
            const lineStart = position;
            position += line.length + 1;
            if (!picked.includes(index)) return line;
            if (remove) {
                if (lineStart < info.start) caret -= Math.min(BULLET.length, info.start - lineStart);
                return line.slice(BULLET.length);
            }
            if (line.startsWith(BULLET)) return line;
            /* ข้อความเดิมขึ้นด้วย - หรือ • ที่ไม่มีเว้นวรรค → แทนด้วยจุด */
            const clean = line.replace(/^\s*[-•·*]\s*/, "");
            const cut = line.length - clean.length;
            if (lineStart <= info.start) caret += BULLET.length - Math.min(cut, Math.max(0, info.start - lineStart));
            return BULLET + clean;
        });

        writeText(element, next.join("\n"), Math.max(0, caret));
        paintBar();
        record();
    }

    /* Enter บนบรรทัดที่มีจุด → บรรทัดใหม่มีจุดต่อให้ / บรรทัดว่าง (มีแต่จุด) → เลิกใส่จุด */
    function bulletEnter(event) {

        if (event.shiftKey || !active || !multiline(active.element)) return;

        const element = active.element;
        const info = lineInfo(element);
        if (!info || info.start !== info.end) return;

        let position = 0;
        let index = 0;
        for (; index < info.lines.length; index += 1) {
            if (info.start <= position + info.lines[index].length) break;
            position += info.lines[index].length + 1;
        }

        const line = info.lines[index];
        if (line === undefined || !line.startsWith(BULLET)) return;

        event.preventDefault();
        event.stopPropagation();

        const lines = info.lines.slice();

        if (line.trim() === BULLET.trim()) {
            lines[index] = "";
            /* บรรทัดสุดท้ายว่าง → ต้องมี \n ปิดท้ายอีกตัว เบราว์เซอร์ถึงจะแสดงบรรทัดว่างให้พิมพ์ต่อ */
            const tail = index === lines.length - 1 ? "\n" : "";
            writeText(element, lines.join("\n") + tail, position);
        } else {
            const before = info.text.slice(0, info.start);
            const after = info.text.slice(info.start);
            writeText(element, `${before}\n${BULLET}${after}`, before.length + 1 + BULLET.length);
        }

        paintBar();
    }

    document.addEventListener("selectionchange", () => {
        if (active && bar && bar.style.display !== "none") paintBar();
    });

    document.addEventListener("focusin", event => {
        const target = targetOf(event.target);
        if (!target) return;
        clearTimeout(hideTimer);
        active = target;
        ensureBar();
        paintBar();
        positionBar();
    });

    document.addEventListener("focusout", () => {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            if (!targetOf(document.activeElement)) hideBar();
        }, 120);
    });

    document.addEventListener("keydown", event => {
        if (!active) return;
        if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && (event.key === "b" || event.key === "B" || event.code === "KeyB")) {
            event.preventDefault(); event.stopPropagation(); toggleBold(); return;
        }
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.code === "Digit8" || event.key === "*")) {
            event.preventDefault(); event.stopPropagation(); toggleBullets(); return;
        }
        if (event.key === "Enter" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing) {
            bulletEnter(event); return;
        }
        if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) return;
        if (event.key === ">" || event.key === "." || event.code === "Period") { event.preventDefault(); change(1); }
        if (event.key === "<" || event.key === "," || event.code === "Comma") { event.preventDefault(); change(-1); }
    }, true);

    window.addEventListener("scroll", () => positionBar(), true);
    window.addEventListener("resize", () => positionBar());

    scheduleApply();

    window.ZGTextSize = { apply: applyAll, sizes: () => ({ ...sizes }), bolds: () => ({ ...bolds }), rotates: () => ({ ...rotates }),
        /* ใช้โดย cat-text.js (เมนูหมวดหมู่) — key เช่น "cat:<id>" */
        getSize: key => Number(sizes[key]) || null,
        setSize(key, px) {
            if (px) sizes[key] = Math.max(MIN, Math.min(MAX, Math.round(px)));
            else delete sizes[key];
            applyAll();
            record();
        },
        getBold: key => (typeof bolds[key] === "boolean" ? bolds[key] : null),
        setBold(key, value) {
            if (typeof value === "boolean") bolds[key] = value;
            else delete bolds[key];
            applyAll();
            record();
        },
        /* ใช้โดย presets.js: อ่าน/ใส่ ขนาด + ตัวหนา + แนวตั้ง ของ key เดียวทีเดียว (ไม่บันทึกประวัติเอง) */
        getStyle(key) {
            const style = {};
            if (Number(sizes[key])) style.size = Number(sizes[key]);
            if (typeof bolds[key] === "boolean") style.bold = bolds[key];
            if (Number(rotates[key])) style.rotate = Number(rotates[key]);
            return Object.keys(style).length ? style : null;
        },
        setStyle(key, style) {
            if (!key || !style) return;
            if (Number(style.size)) sizes[key] = Math.max(MIN, Math.min(MAX, Math.round(Number(style.size))));
            if (typeof style.bold === "boolean") bolds[key] = style.bold;
            if (Number(style.rotate)) rotates[key] = Number(style.rotate);
            applyAll();
        },
        MIN, MAX
    };

})();
