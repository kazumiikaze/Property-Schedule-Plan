"use strict";

/* =========================================================
   NOTES-PLUS.JS — บันทึกท้ายกระดาน
   1) คำแนะนำจาง ๆ แทน "Header" / "type..."
      หัวข้อ: Enter = ไปพิมพ์เนื้อหา · เนื้อหา: Enter = ขึ้นบรรทัดใหม่ · Esc = ยกเลิก
   2) ปุ่ม "＋ เพิ่มบันทึก" เลือกประเภท (มีหัวข้อ + โครงร่างให้)
   6) ลากสลับลำดับการ์ด (จับ ⠿) + ทำสำเนา (⧉)
   7) วันที่แก้ไขล่าสุดมุมการ์ด
   8) 🔒 บันทึกภายใน — ไม่ออกตอนพิมพ์ / Export
   9) ตอนพิมพ์ / Export: จัดการ์ดให้พอดีความกว้าง (เกิน 6 ใบ = 2 แถว)
      การ์ดว่างและบันทึกภายในไม่ออก
   10) ปุ่มเครื่องมือขึ้นตอนชี้ · ลบแล้วมีแถบ "ย้อนกลับ"
   - ไม่แก้ app.js / style.css
========================================================= */

(function () {

    if (typeof renderNotes !== "function" || typeof notesTrack === "undefined" || typeof addNoteBtn === "undefined") {
        console.warn("[notes-plus.js] ไม่พบส่วนบันทึกท้ายกระดาน");
        return;
    }

    const DEFAULT_HEADERS = ["Header"];
    const DEFAULT_BODIES = ["type...", typeof DEFAULT_ROW_TEXT === "string" ? DEFAULT_ROW_TEXT : "type..."];

    const TYPES = [
        {
            key: "general",
            icon: "📝",
            label: "บันทึกทั่วไป",
            desc: "การ์ดว่าง พิมพ์อะไรก็ได้",
            header: "",
            body: ""
        },
        {
            key: "payment",
            icon: "💰",
            label: "เงื่อนไขการชำระเงิน",
            desc: "มัดจำ · งวด · ส่วนที่เหลือ",
            header: "💰 เงื่อนไขการชำระเงิน",
            body: "• มัดจำ …% เมื่อ …\n• งวดที่ 2 …% เมื่อ …\n• ส่วนที่เหลือ …% ณ วันโอนกรรมสิทธิ์"
        },
        {
            key: "docs",
            icon: "📄",
            label: "เอกสารที่ต้องเตรียม",
            desc: "รายการเอกสารของลูกค้า / ผู้ขาย",
            header: "📄 เอกสารที่ต้องเตรียม",
            body: "• สำเนาบัตรประชาชน / หนังสือรับรองบริษัท\n• สำเนาโฉนดที่ดิน\n• หนังสือมอบอำนาจ (ถ้ามี)"
        },
        {
            key: "contact",
            icon: "📞",
            label: "ผู้ติดต่อ",
            desc: "ชื่อ · ตำแหน่ง · โทร · อีเมล",
            header: "📞 ผู้ติดต่อ",
            body: "ชื่อ: …\nตำแหน่ง: …\nโทร: …\nอีเมล: …"
        },
        {
            key: "caution",
            icon: "⚠️",
            label: "ข้อควรระวัง",
            desc: "เรื่องที่ต้องระวัง / ตรวจสอบ",
            header: "⚠️ ข้อควรระวัง",
            body: "• …"
        },
        {
            key: "internal",
            icon: "🔒",
            label: "บันทึกภายใน",
            desc: "เห็นเฉพาะบนจอ ไม่ออกตอนพิมพ์ / Export",
            header: "🔒 บันทึกภายใน",
            body: "",
            internal: true
        }
    ];


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
/* 1) คำแนะนำจาง ๆ */
.note-card .note-header:empty::before,
.note-card .note-body:empty::before {
    content: attr(data-placeholder);
    color: #b3bbb6;
    font-weight: 400;
    pointer-events: none;
}
.note-card .note-header:empty::before { font-weight: 600; }
.note-card .note-body { white-space: pre-wrap; padding-bottom: 20px; }
.note-card .note-header:focus,
.note-card .note-body:focus { background: #fbfdfb; }
.note-card:focus-within { border-color: #9fd17a; box-shadow: 0 0 0 2px rgba(122, 193, 67, .14); }

/* 10) ปุ่มเครื่องมือ — ขึ้นตอนชี้ */
.note-card .note-delete-btn { display: none !important; }
.zg-note-tools {
    position: absolute;
    top: 5px;
    right: 6px;
    z-index: 3;
    display: flex;
    gap: 2px;
    padding: 2px;
    border: 1px solid #e3e8e5;
    border-radius: 8px;
    background: rgba(255, 255, 255, .96);
    box-shadow: 0 2px 8px rgba(0, 0, 0, .08);
    opacity: 0;
    pointer-events: none;
    transition: opacity .12s ease;
}
.note-card:hover .zg-note-tools,
.note-card:focus-within .zg-note-tools,
.note-card.zg-note-dragging .zg-note-tools { opacity: 1; pointer-events: auto; }
.zg-note-tools button {
    width: 22px;
    height: 20px;
    padding: 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    font-size: 11px;
    line-height: 20px;
    color: #59635e;
    cursor: pointer;
}
.zg-note-tools button:hover { background: #eef3f0; }
.zg-note-tools button.is-on { background: #fff1d6; }
.zg-note-tools [data-note-act="delete"]:hover { background: #fde8e8; color: #d9363e; }
.zg-note-tools [data-note-act="drag"] { cursor: grab; letter-spacing: -1px; }

/* 6) ลากสลับ */
.note-card.zg-note-dragging {
    opacity: .55;
    outline: 2px dashed #7ac143;
    outline-offset: -2px;
}
body.zg-note-sorting, body.zg-note-sorting * { cursor: grabbing !important; user-select: none !important; }
.note-card.zg-note-flash { animation: zgNoteFlash .9s ease; }
@keyframes zgNoteFlash {
    0% { box-shadow: 0 0 0 3px rgba(122, 193, 67, .55); }
    100% { box-shadow: 0 0 0 3px rgba(122, 193, 67, 0); }
}

/* 7) วันที่แก้ไขล่าสุด */
.zg-note-stamp {
    position: absolute;
    right: 9px;
    bottom: 5px;
    z-index: 2;
    font-size: 9px;
    color: #a3aca7;
    pointer-events: none;
}

/* 8) บันทึกภายใน */
.note-card.zg-note-internal {
    background: #fffaf0;
    border: 1px dashed #e1a638;
}
.zg-note-badge {
    position: absolute;
    left: 10px;
    bottom: 5px;
    z-index: 2;
    padding: 1px 6px;
    border-radius: 8px;
    background: #fbe7c0;
    color: #8a5a00;
    font-size: 9px;
    pointer-events: none;
}
.note-card:not(.zg-note-internal) .zg-note-badge { display: none; }

/* 2) เมนูเลือกประเภท */
.add-note-btn .zg-note-caret { margin-left: 5px; font-size: 8px; opacity: .6; }
.zg-note-menu {
    position: fixed;
    z-index: 26000;
    width: 270px;
    padding: 6px;
    box-sizing: border-box;
    border: 1px solid #dfe5e1;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 14px 40px rgba(10, 30, 20, .18);
    font-family: Arial, Helvetica, sans-serif;
    color: #1e2924;
}
.zg-note-menu-title { padding: 4px 8px 6px; font-size: 11px; font-weight: 700; color: #6f7873; }
.zg-note-menu button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: pointer;
}
.zg-note-menu button:hover,
.zg-note-menu button:focus-visible { background: #f1f6f2; outline: none; }
.zg-note-menu .ic { flex: 0 0 26px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 7px; background: #f3f6f4; font-size: 14px; }
.zg-note-menu .tx { display: flex; flex-direction: column; min-width: 0; }
.zg-note-menu .tx b { font-size: 12px; }
.zg-note-menu .tx small { font-size: 10px; color: #8a948f; }

/* 10) แถบย้อนกลับ */
.zg-note-toast {
    position: fixed;
    left: 50%;
    bottom: 26px;
    z-index: 26500;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 10px 8px 14px;
    border-radius: 10px;
    background: #1f2a25;
    color: #ffffff;
    font: 12px Arial, Helvetica, sans-serif;
    box-shadow: 0 10px 30px rgba(0, 0, 0, .25);
    transform: translateX(-50%);
}
.zg-note-toast button {
    height: 24px;
    padding: 0 10px;
    border: 0;
    border-radius: 6px;
    background: #7ac143;
    color: #10230f;
    font: 700 12px Arial, Helvetica, sans-serif;
    cursor: pointer;
}

/* 9) ตอนพิมพ์ / Export */
body.zg-exporting .zg-note-tools,
body.zg-exporting .zg-note-stamp,
body.zg-exporting .zg-note-badge,
body.zg-exporting .zg-note-menu,
body.zg-exporting .zg-note-toast,
body.zg-exporting .note-card .note-header:empty::before,
body.zg-exporting .note-card .note-body:empty::before { display: none !important; content: none !important; }
body.zg-exporting .note-card { box-shadow: none !important; }
body.zg-exporting .note-card.zg-note-skip { display: none !important; }
body.zg-exporting .notes-track {
    width: var(--zg-note-fitw, 100%) !important;
    min-width: 0 !important;
    flex-wrap: wrap;
    align-content: stretch;
}
body.zg-exporting .notes-track .note-card {
    flex: 0 0 calc((100% - (var(--zg-note-cols, 1) - 1) * 10px) / var(--zg-note-cols, 1)) !important;
    min-width: 0 !important;
}
body.zg-exporting .notes-track.zg-notes-2rows .note-card { height: calc(50% - 5px); }
body.zg-exporting .notes-track.zg-notes-2rows .note-header { min-height: 22px; padding-top: 5px; font-size: 11px; }
body.zg-exporting .notes-track.zg-notes-2rows .note-body { font-size: 10px; line-height: 1.3; }
body.zg-exporting .notes-viewport { height: calc(100% - 4px) !important; }
body.zg-exporting .note-card .note-body { overflow: hidden !important; padding-bottom: 6px; }

/* dark */
body.zg-dark .zg-note-tools { background: #2b3330; border-color: #3a4440; }
body.zg-dark .zg-note-tools button { color: #c9d1cd; }
body.zg-dark .zg-note-tools button:hover { background: #34403b; }
body.zg-dark .note-card.zg-note-internal { background: #2e2a20; border-color: #8a6a2a; }
body.zg-dark .note-card .note-header:focus,
body.zg-dark .note-card .note-body:focus { background: #252d2a; }
body.zg-dark .zg-note-menu { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-note-menu button:hover { background: #2b3330; }
body.zg-dark .zg-note-menu .ic { background: #2b3330; }
`;

    document.head.appendChild(style);


    /* =====================================================
       HELPERS
    ===================================================== */

    function notes() {
        return Array.isArray(boardNotes) ? boardNotes : [];
    }

    function findNote(id) {
        return notes().find(note => note.id === id) || null;
    }

    function cardOf(id) {
        return notesTrack.querySelector(`.note-card[data-note-id="${CSS.escape(id)}"]`);
    }

    function record() {
        if (window.ZGHistory && typeof window.ZGHistory.record === "function") {
            setTimeout(() => window.ZGHistory.record(), 0);
        }
    }

    function stampText(time) {
        const date = new Date(time);
        if (!time || isNaN(date)) return "";
        return `แก้ไขล่าสุด ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }

    function newId() {
        return typeof createNoteId === "function" ? createNoteId() : `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }

    function placeCaretEnd(element) {
        element.focus();
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function isBlank(note) {
        return !String(note.header || "").trim() && !String(note.body || "").trim();
    }

    function scrollToCard(card) {
        if (!card || typeof notesViewport === "undefined") return;
        const vp = notesViewport.getBoundingClientRect();
        const rect = card.getBoundingClientRect();
        if (rect.left < vp.left || rect.right > vp.right) {
            notesViewport.scrollLeft += rect.left - vp.left - 10;
        }
        if (typeof updateNotesHorizontalRange === "function") updateNotesHorizontalRange();
    }

    function flash(card) {
        if (!card) return;
        card.classList.remove("zg-note-flash");
        void card.offsetWidth;
        card.classList.add("zg-note-flash");
    }


    /* =====================================================
       DECORATE (หลัง renderNotes ของเดิม)
    ===================================================== */

    function updatePrintLayout() {
        const shown = notes().filter(note => !note.internal && !isBlank(note)).length;
        const cols = shown <= 6 ? Math.max(1, shown) : Math.ceil(shown / 2);
        notesTrack.style.setProperty("--zg-note-cols", String(cols));
        notesTrack.classList.toggle("zg-notes-2rows", shown > 6);
    }

    function updateCardState(card, note) {
        card.classList.toggle("zg-note-internal", Boolean(note.internal));
        card.classList.toggle("zg-note-skip", Boolean(note.internal) || isBlank(note));
        const lock = card.querySelector("[data-note-act='internal']");
        if (lock) {
            lock.classList.toggle("is-on", Boolean(note.internal));
            lock.title = note.internal ? "บันทึกภายใน (ไม่พิมพ์) — คลิกเพื่อให้พิมพ์" : "ตั้งเป็นบันทึกภายใน (ไม่ออกตอนพิมพ์)";
        }
        const stamp = card.querySelector(".zg-note-stamp");
        if (stamp) stamp.textContent = stampText(note.updatedAt);
    }

    function decorate() {

        notes().forEach(note => {

            if (DEFAULT_HEADERS.includes(String(note.header || "").trim())) note.header = "";
            if (DEFAULT_BODIES.includes(String(note.body || "").trim())) note.body = "";

            const card = cardOf(note.id);
            if (!card) return;

            const header = card.querySelector(".note-header");
            const body = card.querySelector(".note-body");

            if (header) {
                header.dataset.placeholder = "หัวข้อบันทึก";
                if (header.textContent !== note.header) header.textContent = note.header;
            }

            if (body) {
                body.dataset.placeholder = "พิมพ์รายละเอียด… (Enter = ขึ้นบรรทัดใหม่)";
                if (body.textContent !== note.body) body.textContent = note.body;
            }

            if (!card.querySelector(".zg-note-tools")) {

                const tools = document.createElement("div");
                tools.className = "zg-note-tools";
                tools.innerHTML = `
                    <button type="button" data-note-act="drag" title="ลากเพื่อสลับลำดับ">⠿</button>
                    <button type="button" data-note-act="internal">🔒</button>
                    <button type="button" data-note-act="duplicate" title="ทำสำเนา">⧉</button>
                    <button type="button" data-note-act="delete" title="ลบบันทึก">🗑</button>`;
                card.appendChild(tools);

                const badge = document.createElement("span");
                badge.className = "zg-note-badge";
                badge.textContent = "🔒 ภายใน · ไม่พิมพ์";
                card.appendChild(badge);

                const stamp = document.createElement("span");
                stamp.className = "zg-note-stamp";
                card.appendChild(stamp);
            }

            updateCardState(card, note);
        });

        updatePrintLayout();
    }

    const originalRender = renderNotes;

    renderNotes = function () {
        const result = originalRender.apply(this, arguments);
        try {
            decorate();
        } catch (error) {
            console.error("[notes-plus.js]", error);
        }
        return result;
    };


    /* =====================================================
       1) 7) การพิมพ์
    ===================================================== */

    let original = null;

    notesTrack.addEventListener("focusin", event => {
        const field = event.target.closest(".note-header, .note-body");
        if (field) original = field.textContent;
    });

    notesTrack.addEventListener("input", event => {

        const field = event.target.closest(".note-header, .note-body");
        if (!field) return;

        const card = field.closest(".note-card");
        const note = card && findNote(card.dataset.noteId);
        if (!note) return;

        /* เก็บการขึ้นบรรทัดใหม่ให้ถูก (ของเดิมเก็บ textContent ซึ่งตัด <br> ทิ้ง) */
        if (field.classList.contains("note-body")) {
            note.body = field.innerText.replace(/ /g, " ");
            if (!note.body.trim() && field.innerHTML && !field.textContent) field.innerHTML = "";
        } else {
            note.header = field.textContent;
            if (!field.textContent && field.innerHTML) field.innerHTML = "";
        }

        note.updatedAt = Date.now();

        updateCardState(card, note);
        updatePrintLayout();
    });

    notesTrack.addEventListener("keydown", event => {

        const field = event.target.closest(".note-header, .note-body");
        if (!field || event.isComposing) return;

        const card = field.closest(".note-card");

        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (original !== null && field.textContent !== original) {
                field.textContent = original;
                field.dispatchEvent(new Event("input", { bubbles: true }));
            }
            field.blur();
            return;
        }

        if (event.key !== "Enter") return;

        if (field.classList.contains("note-header")) {
            event.preventDefault();
            const body = card && card.querySelector(".note-body");
            if (body) placeCaretEnd(body);
            return;
        }

        /* เนื้อหา: Enter = ขึ้นบรรทัดใหม่แบบ <br> (ไม่สร้าง <div>) */
        event.preventDefault();
        document.execCommand("insertLineBreak");
    });

    notesTrack.addEventListener("paste", event => {

        const field = event.target.closest(".note-header, .note-body");
        if (!field) return;

        const text = event.clipboardData && event.clipboardData.getData("text/plain");
        if (text == null) return;

        event.preventDefault();

        const clean = field.classList.contains("note-header")
            ? text.replace(/\s*[\r\n]+\s*/g, " ")
            : text.replace(/\r\n?/g, "\n");

        document.execCommand("insertText", false, clean);
    });

    notesTrack.addEventListener("focusout", event => {

        const field = event.target.closest(".note-header, .note-body");
        if (!field) return;

        const card = field.closest(".note-card");
        const note = card && findNote(card.dataset.noteId);

        if (note) {
            if (field.classList.contains("note-body")) {
                const trimmed = note.body.replace(/\s+$/, "");
                if (trimmed !== note.body) {
                    note.body = trimmed;
                    field.textContent = trimmed;
                }
            } else {
                const trimmed = note.header.replace(/\s+/g, " ").trim();
                if (trimmed !== note.header) {
                    note.header = trimmed;
                    field.textContent = trimmed;
                }
            }
            updateCardState(card, note);
            updatePrintLayout();
        }

        if (original !== null && original !== field.textContent) record();

        original = null;
    });


    /* =====================================================
       6) 8) 10) ปุ่มเครื่องมือ
    ===================================================== */

    notesTrack.addEventListener("click", event => {

        const button = event.target.closest(".zg-note-tools button");
        if (!button) return;

        event.preventDefault();
        event.stopPropagation();

        const card = button.closest(".note-card");
        const note = card && findNote(card.dataset.noteId);
        if (!note) return;

        const act = button.dataset.noteAct;

        if (act === "internal") {
            note.internal = !note.internal;
            note.updatedAt = Date.now();
            updateCardState(card, note);
            updatePrintLayout();
            record();
        }

        if (act === "duplicate") {
            const list = notes();
            const index = list.indexOf(note);
            const copy = JSON.parse(JSON.stringify(note));
            copy.id = newId();
            copy.updatedAt = Date.now();
            list.splice(index + 1, 0, copy);
            renderNotes();
            const newCard = cardOf(copy.id);
            requestAnimationFrame(() => { scrollToCard(newCard); flash(newCard); });
            record();
        }

        if (act === "delete") {
            deleteNote(note.id);
        }
    });

    /* ลากสลับลำดับ */
    let sorting = null;

    notesTrack.addEventListener("pointerdown", event => {

        const handle = event.target.closest("[data-note-act='drag']");
        if (!handle || event.button !== 0) return;

        event.preventDefault();
        event.stopPropagation();

        const card = handle.closest(".note-card");
        if (!card) return;

        sorting = { card, before: notes().map(note => note.id).join("|"), timer: null, x: event.clientX };

        card.classList.add("zg-note-dragging");
        document.body.classList.add("zg-note-sorting");
    });

    /* กัน drag-scroll ของเดิมตอนกดที่ปุ่ม ⠿ */
    notesTrack.addEventListener("mousedown", event => {
        if (event.target.closest(".zg-note-tools")) event.stopPropagation();
    });

    function autoScroll() {
        if (!sorting || typeof notesViewport === "undefined") return;
        const rect = notesViewport.getBoundingClientRect();
        const edge = 50;
        let dx = 0;
        if (sorting.x < rect.left + edge) dx = -14;
        if (sorting.x > rect.right - edge) dx = 14;
        if (dx) {
            notesViewport.scrollLeft += dx;
            moveTo(sorting.x);
        }
        sorting.timer = requestAnimationFrame(autoScroll);
    }

    function moveTo(x) {
        const cards = Array.from(notesTrack.querySelectorAll(".note-card")).filter(card => card !== sorting.card);
        const next = cards.find(card => {
            const rect = card.getBoundingClientRect();
            return x < rect.left + rect.width / 2;
        });
        if (next) {
            if (next !== sorting.card.nextSibling) notesTrack.insertBefore(sorting.card, next);
        } else if (notesTrack.lastElementChild !== sorting.card) {
            notesTrack.appendChild(sorting.card);
        }
    }

    window.addEventListener("pointermove", event => {
        if (!sorting) return;
        sorting.x = event.clientX;
        moveTo(event.clientX);
        if (!sorting.timer) sorting.timer = requestAnimationFrame(autoScroll);
    });

    function endSort() {

        if (!sorting) return;

        const { card, before, timer } = sorting;

        sorting = null;

        if (timer) cancelAnimationFrame(timer);

        card.classList.remove("zg-note-dragging");
        document.body.classList.remove("zg-note-sorting");

        const order = Array.from(notesTrack.querySelectorAll(".note-card")).map(node => node.dataset.noteId);

        if (order.join("|") === before) return;

        const list = notes();
        const sorted = order.map(id => list.find(note => note.id === id)).filter(Boolean);

        list.forEach(note => { if (!sorted.includes(note)) sorted.push(note); });

        list.splice(0, list.length, ...sorted);

        renderNotes();
        flash(cardOf(card.dataset.noteId));
        record();
    }

    window.addEventListener("pointerup", endSort);
    window.addEventListener("pointercancel", endSort);


    /* =====================================================
       10) ลบแล้วย้อนกลับได้
    ===================================================== */

    let toastEl = null;
    let toastTimer = null;

    function hideToast() {
        clearTimeout(toastTimer);
        if (toastEl) {
            toastEl.remove();
            toastEl = null;
        }
    }

    function showUndo(onUndo) {

        hideToast();

        toastEl = document.createElement("div");
        toastEl.className = "zg-note-toast";
        toastEl.innerHTML = `<span>ลบบันทึกแล้ว</span><button type="button">↶ ย้อนกลับ</button>`;

        toastEl.querySelector("button").addEventListener("click", () => {
            hideToast();
            onUndo();
        });

        document.body.appendChild(toastEl);

        toastTimer = setTimeout(hideToast, 6000);
    }

    if (typeof deleteNote === "function") {

        const originalDelete = deleteNote;

        deleteNote = function (noteId) {

            const list = notes();
            const index = list.findIndex(note => note.id === noteId);
            const saved = index >= 0 ? JSON.parse(JSON.stringify(list[index])) : null;

            const result = originalDelete.apply(this, arguments);

            if (saved) {

                record();

                showUndo(() => {
                    const current = notes();
                    current.splice(Math.min(index, current.length), 0, saved);
                    renderNotes();
                    const card = cardOf(saved.id);
                    requestAnimationFrame(() => { scrollToCard(card); flash(card); });
                    record();
                });
            }

            return result;
        };
    }


    /* =====================================================
       2) เมนูเลือกประเภทบันทึก
    ===================================================== */

    const caret = document.createElement("span");
    caret.className = "zg-note-caret";
    caret.textContent = "▾";
    addNoteBtn.appendChild(caret);

    let menu = null;

    function closeMenu() {
        if (menu) {
            menu.remove();
            menu = null;
        }
    }

    function addNote(type) {

        closeMenu();

        const note = typeof createNote === "function" ? createNote() : { id: newId() };

        note.header = type.header;
        note.body = type.body;
        note.type = type.key;
        note.updatedAt = Date.now();

        if (type.internal) note.internal = true;

        boardNotes.push(note);

        renderNotes();

        const card = cardOf(note.id);

        requestAnimationFrame(() => {

            if (typeof notesViewport !== "undefined" && typeof getElementMaxScroll === "function") {
                notesViewport.scrollLeft = getElementMaxScroll(notesViewport);
            }
            if (typeof updateNotesHorizontalRange === "function") updateNotesHorizontalRange();

            flash(card);

            const target = card && (note.header
                ? card.querySelector(".note-body")
                : card.querySelector(".note-header"));

            if (target) placeCaretEnd(target);
        });

        record();
    }

    function openMenu() {

        closeMenu();

        menu = document.createElement("div");
        menu.className = "zg-note-menu";
        menu.innerHTML = `
            <div class="zg-note-menu-title">เพิ่มบันทึกแบบไหน?</div>
            ${TYPES.map(type => `
                <button type="button" data-note-type="${type.key}">
                    <span class="ic">${type.icon}</span>
                    <span class="tx"><b>${type.label}</b><small>${type.desc}</small></span>
                </button>`).join("")}`;

        menu.addEventListener("mousedown", event => event.stopPropagation());

        menu.addEventListener("click", event => {
            const button = event.target.closest("[data-note-type]");
            if (!button) return;
            const type = TYPES.find(item => item.key === button.dataset.noteType);
            if (type) addNote(type);
        });

        menu.addEventListener("keydown", event => {
            const items = Array.from(menu.querySelectorAll("button"));
            const index = items.indexOf(document.activeElement);
            if (event.key === "Escape") { event.stopPropagation(); closeMenu(); addNoteBtn.focus(); }
            if (event.key === "ArrowDown") { event.preventDefault(); (items[index + 1] || items[0]).focus(); }
            if (event.key === "ArrowUp") { event.preventDefault(); (items[index - 1] || items[items.length - 1]).focus(); }
        });

        document.body.appendChild(menu);

        const rect = addNoteBtn.getBoundingClientRect();
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8));
        let top = rect.top - menu.offsetHeight - 6;
        if (top < 8) top = Math.min(rect.bottom + 6, window.innerHeight - menu.offsetHeight - 8);

        menu.style.left = `${left}px`;
        menu.style.top = `${Math.max(8, top)}px`;

        const first = menu.querySelector("button");
        if (first) first.focus({ preventScroll: true });
    }

    /* แทนการคลิกของเดิม (capture) */
    addNoteBtn.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (menu) closeMenu(); else openMenu();
    }, true);

    document.addEventListener("mousedown", event => {
        if (menu && !menu.contains(event.target) && !addNoteBtn.contains(event.target)) closeMenu();
    });

    window.addEventListener("resize", closeMenu);


    /* ตอน Export / พิมพ์: ภาพถูกตัดขอบขวาให้พอดีกับตาราง (ตารางสั้น = ภาพแคบลง)
       → บีบการ์ดบันทึกให้อยู่ในความกว้างนั้น ไม่ให้การ์ดท้าย ๆ หลุดขอบ */
    function fitNotesToExport() {

        notesTrack.style.removeProperty("--zg-note-fitw");

        if (!document.body.classList.contains("zg-exporting")) return;

        const exporter = window.ZGExportImage;
        if (!exporter || typeof exporter.getCropRect !== "function" || typeof notesViewport === "undefined") return;

        try {
            const crop = exporter.getCropRect("image");
            const left = notesViewport.getBoundingClientRect().left;
            const width = Math.floor(crop.right - left - 8);
            if (width > 120 && width < notesViewport.clientWidth) {
                notesTrack.style.setProperty("--zg-note-fitw", `${width}px`);
            }
        } catch (error) {
            /* ใช้ความกว้างเต็มตามเดิม */
        }
    }

    let wasExporting = false;

    new MutationObserver(() => {
        const exporting = document.body.classList.contains("zg-exporting");
        if (exporting !== wasExporting) {
            wasExporting = exporting;
            fitNotesToExport();
        }
    }).observe(document.body, { attributes: true, attributeFilter: ["class"] });

    /* เริ่มทำงาน */
    renderNotes();

    window.ZGNotes = { add: key => addNote(TYPES.find(type => type.key === key) || TYPES[0]), types: TYPES.map(type => type.key) };

})();
