"use strict";

/* =========================================================
   TAB-STOPS.JS — กด Tab ในบันทึกท้ายกระดาน / กล่อง Text = เว้นระยะแบบ Word
   - ตัวอักษรกว้างไม่เท่ากัน → เคาะ Space หลายทีให้ ":" ตรงกันไม่ได้
     → Tab กระโดดไปหยุดที่ระยะคงที่ (ทุก 48px) ข้อความหลัง Tab ตรงกันทุกบรรทัด
     ข้อความหน้า Tab ยาวต่างกันมาก → กด Tab เพิ่มอีกครั้งในบรรทัดที่สั้น
   - Shift+Tab = ลบ Tab หน้าเคอร์เซอร์
   - เก็บเป็นตัว Tab ในข้อความ → บันทึก Export พิมพ์ ได้ครบ
   - ชื่อหมวด / ชื่อแถว ไม่เกี่ยว (Tab = ไปช่องถัดไป เหมือนเดิม)
========================================================= */

(function () {

    const FIELDS = ".note-card .note-body, .zg-text-box .zg-text-content";
    const STOP = 48;

    const style = document.createElement("style");
    style.textContent = `
.note-card .note-body, .note-card .note-header, .zg-text-box .zg-text-content { tab-size: ${STOP}px; -moz-tab-size: ${STOP}px; }
`;
    document.head.appendChild(style);

    /*
        จัดคอลัมน์อัตโนมัติ: ทุกบรรทัดที่มี Tab ในช่องเดียวกัน → ข้อความหลัง Tab แรกเริ่มตรงกัน
        (บรรทัดที่สั้นกว่า เติม Tab ให้เองจนถึงคอลัมน์ของบรรทัดที่ยาวที่สุด)
    */
    function tabRuns(field) {
        const runs = [];
        const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            const text = node.nodeValue;
            for (let i = 0; i < text.length; i += 1) {
                if (text[i] !== "\t") continue;
                let end = i;
                while (end < text.length && text[end] === "\t") end += 1;
                const range = document.createRange();
                range.setStart(node, end);
                range.setEnd(node, end);
                const rect = range.getClientRects()[0] || range.getBoundingClientRect();
                runs.push({ node, end, x: rect.left, line: Math.round(rect.top) });
                i = end;
            }
        }
        /* เอาเฉพาะ Tab แรกของแต่ละบรรทัด */
        const first = new Map();
        runs.forEach(run => {
            const seen = first.get(run.line);
            if (!seen || run.x < seen.x) first.set(run.line, run);
        });
        return Array.from(first.values());
    }

    function lineUp(field) {
        const runs = tabRuns(field);
        if (runs.length < 2) return;
        const scale = field.offsetWidth ? field.getBoundingClientRect().width / field.offsetWidth : 1;
        const stop = STOP * (scale || 1);
        const target = Math.max(...runs.map(run => run.x));
        const selection = window.getSelection();
        const caret = selection.rangeCount ? selection.getRangeAt(0) : null;
        let moveCaret = null;
        /* แทรกจากท้ายไปหน้า → ตำแหน่งของ Tab อื่นในโหนดเดียวกันไม่เลื่อน */
        runs.sort((a, b) => (a.node === b.node ? b.end - a.end : 0)).forEach(run => {
            const extra = Math.round((target - run.x) / stop);
            if (!(extra > 0 && extra < 20)) return;
            run.node.insertData(run.end, "\t".repeat(extra));
            /* บรรทัดที่กำลังพิมพ์ → เคอร์เซอร์ไปอยู่หลัง Tab ที่เติมให้ */
            if (caret && caret.collapsed && caret.startContainer === run.node && caret.startOffset === run.end) {
                moveCaret = { node: run.node, offset: run.end + extra };
            }
        });
        if (moveCaret) {
            const range = document.createRange();
            range.setStart(moveCaret.node, moveCaret.offset);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        field.dispatchEvent(new Event("input", { bubbles: true }));
    }

    document.addEventListener("keydown", event => {
        if (event.key !== "Tab" || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
        const field = event.target instanceof Element ? event.target.closest(FIELDS) : null;
        if (!field || !field.isContentEditable) return;

        event.preventDefault();
        event.stopPropagation();

        if (!event.shiftKey) {
            document.execCommand("insertText", false, "\t");
            lineUp(field);
            return;
        }

        /* Shift+Tab: ลบ Tab ที่อยู่ติดหน้าเคอร์เซอร์ */
        const selection = window.getSelection();
        if (!selection.rangeCount || !selection.isCollapsed) return;
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE && range.startOffset > 0 && node.nodeValue[range.startOffset - 1] === "\t") {
            document.execCommand("delete");
        }
    }, true);

})();
