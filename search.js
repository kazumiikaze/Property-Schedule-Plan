"use strict";

/* =========================================================
   SEARCH.JS — ช่อง "ค้นหา/คำสั่ง... (Ctrl+K)" บน toolbar

   พิมพ์แล้วจะขึ้นรายการ 2 แบบ:
     ⚡ คำสั่ง  — เพิ่มงาน, Export, พิมพ์ A3, ซูม, ธีม, ภาษา ฯลฯ
     🔍 ในแผน   — หมวดหมู่, แถว, กล่องงาน, เส้นวันที่, เส้นแนวนอน,
                  กล่อง Text, บันทึกท้ายกระดาน
                  → เลือกแล้วเลื่อนตารางไปหา และกระพริบให้เห็น
     📅 วันที่   — พิมพ์วันที่ (เช่น 15/3/2027 หรือ 2027-03-15)
                  → เลื่อนตารางไปวันนั้น

   ปุ่มลัด: Ctrl+K (หรือ /) = ไปที่ช่องค้นหา, ↑ ↓ = เลือก,
            Enter = ทำ, Esc = ปิด

   ไม่แก้ app.js — ใช้ปุ่ม/ฟังก์ชันที่มีอยู่แล้ว
========================================================= */

(function () {

    const input =
        document.querySelector(".toolbar-search input");

    if (!input) {

        console.error("[search.js] ไม่พบช่องค้นหา (.toolbar-search input)");

        return;
    }

    const searchBox =
        input.closest(".toolbar-search") || input;

    input.id = input.id || "toolbarSearchInput";

    input.setAttribute("autocomplete", "off");


    /* =====================================================
       CONFIG
    ===================================================== */

    const MAX_COMMANDS = 6;

    const MAX_CONTENT = 10;

    const FLASH_MS = 1800;


    /* =====================================================
       STYLE
    ===================================================== */

    const style =
        document.createElement("style");

    style.textContent = `
.zg-search-panel {
    position: fixed;
    width: 360px;
    max-height: min(70vh, 520px);
    overflow-y: auto;
    padding: 6px;
    background: #ffffff;
    border: 1px solid #d5dad7;
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, .16);
    z-index: 26000;
    font-size: 12px;
    color: #222222;
}
.zg-search-group {
    padding: 6px 10px 4px;
    color: #7a827e;
    font-size: 10px;
    font-weight: 700;
}
.zg-search-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: inherit;
    font-family: inherit;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
}
.zg-search-item.active,
.zg-search-item:hover { background: #f0f4f2; }
.zg-search-item-icon { flex: 0 0 18px; text-align: center; }
.zg-search-item-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.zg-search-item-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.zg-search-item-sub { color: #8a938d; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.zg-search-item-key {
    flex: 0 0 auto;
    padding: 1px 5px;
    border: 1px solid #dde3e0;
    border-radius: 4px;
    color: #8a938d;
    font-size: 10px;
}
.zg-search-item mark { background: #fff2bf; color: inherit; padding: 0; border-radius: 2px; }
.zg-search-empty { padding: 12px 10px; color: #8a938d; text-align: center; }
.zg-search-hint {
    margin-top: 4px;
    padding: 6px 10px 2px;
    border-top: 1px solid #eef1ef;
    color: #9aa5a0;
    font-size: 10px;
}

/* กระพริบสิ่งที่ค้นเจอ */
@keyframes zgSearchFlash {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 179, 0, 0); }
    20%, 60% { box-shadow: 0 0 0 4px rgba(255, 179, 0, .95); }
    40%, 80% { box-shadow: 0 0 0 2px rgba(255, 179, 0, .35); }
}
.zg-search-flash {
    animation: zgSearchFlash ${FLASH_MS}ms ease-in-out 1;
    position: relative;
    z-index: 3;
}

@media screen {
    body.zg-dark .zg-search-panel {
        background: #1f2527;
        border-color: #3a4441;
        color: #e3e8e5;
        box-shadow: 0 8px 28px rgba(0, 0, 0, .5);
    }
    body.zg-dark .zg-search-item.active,
    body.zg-dark .zg-search-item:hover { background: #30383a; }
    body.zg-dark .zg-search-group,
    body.zg-dark .zg-search-item-sub,
    body.zg-dark .zg-search-empty,
    body.zg-dark .zg-search-hint { color: #9aa5a0; }
    body.zg-dark .zg-search-hint { border-top-color: #3a4441; }
    body.zg-dark .zg-search-item-key { border-color: #3a4441; color: #9aa5a0; }
    body.zg-dark .zg-search-item mark { background: #5a4a10; }
}

@media print {
    .zg-search-panel { display: none !important; }
}
`;

    document.head.appendChild(style);


    /* =====================================================
       HELPERS
    ===================================================== */

    function normalize(value) {

        return String(value || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
    }


    function escapeText(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }


    /* ใส่ <mark> ตรงคำที่ค้น */
    function highlight(text, words) {

        let html = escapeText(text);

        words
            .filter(Boolean)
            .sort((a, b) => b.length - a.length)
            .forEach(word => {

                const safe =
                    escapeText(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

                html = html.replace(new RegExp(`(${safe})`, "gi"), "<mark>$1</mark>");
            });

        return html;
    }


    /* ทุกคำที่พิมพ์ต้องเจอในข้อความ (เรียงแบบไหนก็ได้) */
    function matchScore(haystack, words) {

        const text = normalize(haystack);

        if (!text) {
            return -1;
        }

        let score = 0;

        for (const word of words) {

            const index = text.indexOf(word);

            if (index < 0) {
                return -1;
            }

            score += index === 0 ? 3 : (text[index - 1] === " " ? 2 : 1);
        }

        return score;
    }


    function shorten(text, max = 60) {

        const clean = String(text || "").replace(/\s+/g, " ").trim();

        return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
    }


    function clickButton(id) {

        const button = document.getElementById(id);

        if (button) {
            button.click();
            return true;
        }

        return false;
    }


    function hasGlobal(name) {

        try {
            return typeof window.eval(name) !== "undefined";
        } catch (error) {
            return false;
        }
    }


    /* =====================================================
       COMMANDS
    ===================================================== */

    const COMMANDS = [

        { icon: "↶", label: "ย้อนกลับ", keys: "undo ย้อน ctrl+z", hotkey: "Ctrl+Z", run: () => window.ZGHistory && window.ZGHistory.undo() },
        { icon: "↷", label: "ทำซ้ำ", keys: "redo ทำซ้ำ ctrl+y", hotkey: "Ctrl+Y", run: () => window.ZGHistory && window.ZGHistory.redo() },

        { icon: "＋", label: "เพิ่มกล่องงาน", keys: "add task งาน กล่องงาน", run: () => clickButton("addTaskBtn") },
        { icon: "┆", label: "เพิ่มเส้นวันที่", keys: "add date line เส้นวันที่ dateline", run: () => clickButton("addDateLineBtn") },
        { icon: "—", label: "เพิ่มเส้นแนวนอน", keys: "add horizontal line เส้นแนวนอน hline", run: () => clickButton("addHLineBtn") },
        { icon: "T", label: "เพิ่มกล่อง Text", keys: "add text ข้อความ กล่องข้อความ", run: () => clickButton("addTextBtn") },
        { icon: "▤", label: "เพิ่มหมวดหมู่", keys: "add category หมวด หมวดหมู่", run: () => clickButton("addCategoryBtn") },
        { icon: "＋", label: "เพิ่มบันทึกท้ายกระดาน", keys: "add note บันทึก โน้ต", run: () => clickButton("addNoteBtn") },
        { icon: "⚙", label: "จัดการบทบาท", keys: "roles role บทบาท สี", run: () => clickButton("manageRolesBtn") },

        { icon: "🔍", label: "ซูมเข้า", keys: "zoom in ขยาย ซูม", run: () => clickButton("zoomInBtn") },
        { icon: "🔍", label: "ซูมออก", keys: "zoom out ย่อ ซูม", run: () => clickButton("zoomOutBtn") },
        { icon: "📅", label: "ไปที่วันนี้", keys: "today วันนี้ ปัจจุบัน", run: () => goToDate(new Date()) },

        {
            icon: "💾", label: "Export ไฟล์แผน (.json)", keys: "export save json บันทึก ไฟล์แผน ส่งออก",
            run: () => window.ZGPlanIO && window.ZGPlanIO.exportFile && window.ZGPlanIO.exportFile()
        },
        {
            icon: "🖼", label: "Export รูปภาพทั้งกระดาน (PNG)", keys: "export image png รูป ภาพ ส่งออก",
            run: () => window.ZGExportImage && window.ZGExportImage.exportAs("image", "png")
        },
        {
            icon: "📄", label: "Export รูปภาพทั้งกระดาน (PDF)", keys: "export pdf ส่งออก",
            run: () => window.ZGExportImage && window.ZGExportImage.exportAs("image", "pdf")
        },
        {
            icon: "🖼", label: "Export เฉพาะตาราง (PNG)", keys: "export table png ตาราง ส่งออก",
            run: () => window.ZGExportImage && window.ZGExportImage.exportAs("table", "png")
        },
        {
            icon: "📄", label: "Export เฉพาะตาราง (PDF)", keys: "export table pdf ตาราง ส่งออก",
            run: () => window.ZGExportImage && window.ZGExportImage.exportAs("table", "pdf")
        },
        {
            icon: "📂", label: "Import ไฟล์แผน (.json)", keys: "import open json เปิด นำเข้า ไฟล์แผน",
            run: () => window.ZGPlanIO && window.ZGPlanIO.importFile && window.ZGPlanIO.importFile()
        },
        { icon: "🖼", label: "Import รูปภาพ", keys: "import image picture รูป ภาพ แปะ นำเข้า", run: () => clickButton("importPlanBtn") },
        {
            icon: "🖨", label: "พิมพ์ A3", keys: "print a3 พิมพ์", hotkey: "Ctrl+P",
            run: () => window.ZGPrintA3 ? window.ZGPrintA3.print() : clickButton("printA3Btn")
        },
        { icon: "🖨", label: "ตั้งค่าการพิมพ์", keys: "print setting scale พิมพ์ ขนาด", run: () => clickButton("printScaleBtn") },

        { icon: "▾", label: "สลับแผน", keys: "plan switch แผน เลือกแผน", run: () => clickButton("planSelectBtn") },
        { icon: "＋", label: "เพิ่มแผนใหม่", keys: "new plan แผนใหม่ สร้างแผน", run: () => clickButton("planAddBtn") },
        { icon: "✎", label: "เปลี่ยนชื่อแผน", keys: "rename plan เปลี่ยนชื่อ", run: () => clickButton("planRenameBtn") },

        { icon: "◐", label: "สลับธีม สว่าง/มืด", keys: "theme dark light ธีม มืด สว่าง", run: () => clickButton("themeToggleBtn") },
        { icon: "🌐", label: "เปลี่ยนภาษา", keys: "language lang ภาษา english japanese ไทย", run: () => clickButton("langToggleBtn") },
        { icon: "🔎", label: "เปิด/ปิด ตรวจคำผิด", keys: "spell check ตรวจคำผิด สะกด", run: () => clickButton("toolbarSpellcheckBtn") }
    ];


    /* =====================================================
       CONTENT INDEX (สร้างใหม่ทุกครั้งที่พิมพ์ ข้อมูลจึงตรงกับปัจจุบันเสมอ)
    ===================================================== */

    const OBJECT_LABELS = {
        task: { icon: "▭", name: "กล่องงาน" },
        dateline: { icon: "┆", name: "เส้นวันที่" },
        hline: { icon: "—", name: "เส้นแนวนอน" },
        vline: { icon: "│", name: "เส้นแนวตั้ง" }
    };


    function formatDate(date) {

        if (!(date instanceof Date) || isNaN(date)) {
            return "";
        }

        return typeof formatThaiDateShort === "function"
            ? formatThaiDateShort(date)
            : date.toLocaleDateString();
    }


    function buildContentIndex() {

        const items = [];

        /* หมวดหมู่ + แถว */
        if (hasGlobal("categories")) {

            categories.forEach(category => {

                items.push({
                    icon: "▤",
                    title: category.name,
                    sub: "หมวดหมู่",
                    text: category.name,
                    go: () => goToCategory(category.id)
                });

                (category.rows || []).forEach(row => {

                    const text = [row.text, row.role].filter(Boolean).join(" · ");

                    items.push({
                        icon: "≡",
                        title: row.text,
                        sub: `แถวในหมวด ${category.name}${row.role ? ` · ${row.role}` : ""}`,
                        text,
                        go: () => goToRow(row.id)
                    });
                });
            });
        }

        /* object บนตาราง */
        if (hasGlobal("timelineObjects")) {

            timelineObjects.forEach(object => {

                const label =
                    OBJECT_LABELS[object.type] || { icon: "◇", name: object.type };

                const date =
                    formatDate(object.linkedHeaderDate);

                const text = [
                    object.text,
                    object.detail,
                    date,
                    label.name
                ].filter(Boolean).join(" ");

                items.push({
                    icon: label.icon,
                    title: object.text || label.name,
                    sub: [label.name, date].filter(Boolean).join(" · "),
                    text,
                    go: () => goToObject(object)
                });
            });
        }

        /* กล่อง Text / รูปภาพ */
        if (window.ZGTextBoxes && typeof window.ZGTextBoxes.serialize === "function") {

            window.ZGTextBoxes.serialize().forEach(box => {

                if (box.image) {
                    return;
                }

                items.push({
                    icon: "T",
                    title: box.text || "(กล่อง Text ว่าง)",
                    sub: "กล่อง Text",
                    text: [box.text, box.detail].filter(Boolean).join(" "),
                    go: () => goToTextBox(box)
                });
            });
        }

        /* บันทึกท้ายกระดาน */
        if (hasGlobal("boardNotes")) {

            boardNotes.forEach(note => {

                items.push({
                    icon: "🗒",
                    title: note.header,
                    sub: `บันทึกท้ายกระดาน · ${shorten(note.body, 40)}`,
                    text: [note.header, note.body].join(" "),
                    go: () => goToNote(note.id)
                });
            });
        }

        /* ชื่อแผน / หัวข้อ */
        const titleEl = document.querySelector(".plan-header .title");

        if (titleEl) {

            items.push({
                icon: "★",
                title: titleEl.innerText.trim(),
                sub: "ชื่อแผน",
                text: titleEl.innerText,
                go: () => flash(titleEl.closest(".title-box") || titleEl)
            });
        }

        return items;
    }


    /* =====================================================
       NAVIGATE (เลื่อนไปหา + กระพริบ)
    ===================================================== */

    function flash(element) {

        if (!element) {
            return;
        }

        element.classList.remove("zg-search-flash");

        /* บังคับให้ animation เริ่มใหม่ */
        void element.offsetWidth;

        element.classList.add("zg-search-flash");

        setTimeout(() => element.classList.remove("zg-search-flash"), FLASH_MS + 50);
    }


    function scrollTimelineTo(leftPx) {

        if (!hasGlobal("timelineViewport")) {
            return;
        }

        const target =
            Math.max(0, leftPx - timelineViewport.clientWidth / 3);

        timelineViewport.scrollLeft = target;

        if (typeof syncTimelineHeaderScroll === "function") {
            syncTimelineHeaderScroll();
        }

        if (typeof updateTimelineHorizontalRange === "function") {
            updateTimelineHorizontalRange();
        }
    }


    function scrollVerticalTo(topPx, heightPx = 0) {

        if (typeof setVerticalScroll !== "function" || !hasGlobal("categoryHeight")) {
            return;
        }

        setVerticalScroll(topPx + heightPx / 2 - categoryHeight * 1.5);
    }


    function goToCategory(categoryId) {

        if (hasGlobal("categorySlotMap") && categorySlotMap[categoryId]) {

            const slot = categorySlotMap[categoryId];

            scrollVerticalTo(slot.top, slot.height);
        }

        requestAnimationFrame(() =>
            flash(document.querySelector(`.category[data-category-id="${CSS.escape(categoryId)}"]`))
        );
    }


    function goToRow(rowId) {

        if (hasGlobal("rowSlotMap") && rowSlotMap[rowId]) {

            const slot = rowSlotMap[rowId];

            scrollVerticalTo(slot.top, slot.height);
        }

        requestAnimationFrame(() =>
            flash(document.querySelector(`.party-row[data-row-id="${CSS.escape(rowId)}"]`))
        );
    }


    function goToObject(object) {

        let left = Number(object.x) || 0;

        if (
            (object.type === "dateline" || object.type === "vline") &&
            object.linkedHeaderDate &&
            typeof dateToLeft === "function"
        ) {
            left = dateToLeft(object.linkedHeaderDate);
        }

        scrollTimelineTo(left);

        if (object.type === "task") {
            scrollVerticalTo(Number(object.y) || 0, Number(object.height) || 0);
        }

        requestAnimationFrame(() => {

            const elements =
                document.querySelectorAll(`.canvas-object[data-object-id="${CSS.escape(object.id)}"]`);

            /* เส้นวันที่มี 2 ชิ้น (เส้น + กล่องข้อความ) → กระพริบกล่องข้อความ */
            const target =
                Array.from(elements).find(element =>
                    element.classList.contains("canvas-object--dateline-chip")
                ) || elements[0];

            flash(target);
        });
    }


    function goToTextBox(box) {

        if (box.attach && hasGlobal("timelineObjects")) {

            const object =
                timelineObjects.find(item => item.id === box.attach.objectId);

            if (object) {
                goToObject(object);
            }
        }

        setTimeout(() =>
            flash(document.querySelector(`.zg-text-box[data-text-id="${CSS.escape(box.id)}"]`)),
            80
        );
    }


    function goToNote(noteId) {

        const card =
            document.querySelector(`.note-card[data-note-id="${CSS.escape(noteId)}"]`);

        if (!card) {
            return;
        }

        if (hasGlobal("notesViewport")) {

            notesViewport.scrollLeft =
                Math.max(0, card.offsetLeft - 20);
        }

        flash(card);
    }


    function goToDate(date) {

        if (typeof dateToLeft !== "function") {
            return;
        }

        scrollTimelineTo(dateToLeft(date));

        requestAnimationFrame(() => {

            const iso =
                typeof formatDateInputValue === "function"
                    ? formatDateInputValue(date)
                    : "";

            flash(document.querySelector(`.day-number-label[data-date="${iso}"]`));
        });
    }


    /* พิมพ์เป็นวันที่ → { date, outOfRange } */
    function parseQueryDate(query) {

        const text = query.trim();

        let day, month, year;

        let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

        if (match) {

            [, year, month, day] = match.map(Number);

        } else {

            match = text.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);

            if (!match) {
                return null;
            }

            day = Number(match[1]);
            month = Number(match[2]);
            year = match[3] ? Number(match[3]) : new Date().getFullYear();

            if (year < 100) year += 2000;
        }

        /* ปี พ.ศ. → ค.ศ. */
        if (year > 2400) {
            year -= 543;
        }

        const date = new Date(year, month - 1, day);

        if (
            isNaN(date) ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return null;
        }

        let outOfRange = false;

        if (hasGlobal("timelineStartDate") && hasGlobal("timelineEndDate")) {
            outOfRange = date < timelineStartDate || date > timelineEndDate;
        }

        return { date, outOfRange };
    }


    /* =====================================================
       RESULTS PANEL
    ===================================================== */

    let panel = null;

    let results = [];

    let activeIndex = 0;


    function closePanel() {

        if (panel) {
            panel.remove();
        }

        panel = null;

        results = [];
    }


    function buildResults(query) {

        const words =
            normalize(query).split(" ").filter(Boolean);

        const list = [];

        /* วันที่ */
        const parsed = parseQueryDate(query);

        if (parsed) {

            list.push({
                group: "วันที่",
                icon: "📅",
                title: `ไปที่วันที่ ${formatDate(parsed.date)}`,
                sub: parsed.outOfRange ? "อยู่นอกช่วงวันเริ่มต้น–วันสิ้นสุดของตาราง" : "",
                html: null,
                run: () => {
                    if (!parsed.outOfRange) {
                        goToDate(parsed.date);
                    }
                }
            });
        }

        /* คำสั่ง */
        const commandMatches =
            COMMANDS
                .map(command => ({
                    command,
                    score: words.length
                        ? matchScore(`${command.label} ${command.keys}`, words)
                        : 0
                }))
                .filter(item => item.score >= 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, words.length ? MAX_COMMANDS : COMMANDS.length);

        commandMatches.forEach(({ command }) => {

            list.push({
                group: "คำสั่ง",
                icon: command.icon,
                title: command.label,
                html: highlight(command.label, words),
                hotkey: command.hotkey,
                run: command.run
            });
        });

        /* ในแผน (เฉพาะตอนพิมพ์อะไรแล้ว) */
        if (words.length) {

            buildContentIndex()
                .map(item => ({ item, score: matchScore(item.text, words) }))
                .filter(entry => entry.score >= 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, MAX_CONTENT)
                .forEach(({ item }) => {

                    list.push({
                        group: "ในแผน",
                        icon: item.icon,
                        title: shorten(item.title),
                        html: highlight(shorten(item.title), words),
                        sub: item.sub,
                        run: item.go
                    });
                });
        }

        return list;
    }


    function renderPanel() {

        const query = input.value;

        results = buildResults(query);

        activeIndex = Math.min(activeIndex, Math.max(0, results.length - 1));

        if (!panel) {

            panel = document.createElement("div");

            panel.className = "zg-search-panel";

            panel.addEventListener("mousedown", event => {

                /* ไม่ให้ช่องค้นหาเสียโฟกัสตอนคลิกรายการ */
                event.preventDefault();
            });

            panel.addEventListener("click", event => {

                const item = event.target.closest("[data-index]");

                if (item) {
                    runResult(Number(item.dataset.index));
                }
            });

            panel.addEventListener("mousemove", event => {

                const item = event.target.closest("[data-index]");

                if (item && Number(item.dataset.index) !== activeIndex) {

                    activeIndex = Number(item.dataset.index);

                    markActive();
                }
            });

            document.body.appendChild(panel);
        }

        if (!results.length) {

            panel.innerHTML =
                `<div class="zg-search-empty">ไม่พบ "${escapeText(shorten(query, 30))}"</div>`;

        } else {

            let lastGroup = null;

            panel.innerHTML =
                results.map((result, index) => {

                    const header =
                        result.group !== lastGroup
                            ? `<div class="zg-search-group">${result.group}</div>`
                            : "";

                    lastGroup = result.group;

                    return `${header}
                        <button type="button" class="zg-search-item ${index === activeIndex ? "active" : ""}" data-index="${index}">
                            <span class="zg-search-item-icon">${escapeText(result.icon || "")}</span>
                            <span class="zg-search-item-text">
                                <span class="zg-search-item-title">${result.html || escapeText(result.title)}</span>
                                ${result.sub ? `<span class="zg-search-item-sub">${escapeText(result.sub)}</span>` : ""}
                            </span>
                            ${result.hotkey ? `<span class="zg-search-item-key">${escapeText(result.hotkey)}</span>` : ""}
                        </button>`;
                }).join("") +
                `<div class="zg-search-hint">↑ ↓ เลือก · Enter ทำ · Esc ปิด · พิมพ์วันที่ เช่น 15/3/2027 เพื่อไปวันนั้น</div>`;
        }

        positionPanel();
    }


    function positionPanel() {

        if (!panel) {
            return;
        }

        const rect = searchBox.getBoundingClientRect();

        const left =
            Math.max(6, Math.min(rect.left, window.innerWidth - panel.offsetWidth - 6));

        panel.style.left = `${left}px`;
        panel.style.top = `${rect.bottom + 6}px`;
    }


    function markActive() {

        if (!panel) {
            return;
        }

        panel.querySelectorAll(".zg-search-item").forEach(item => {

            const isActive = Number(item.dataset.index) === activeIndex;

            item.classList.toggle("active", isActive);

            if (isActive) {
                item.scrollIntoView({ block: "nearest" });
            }
        });
    }


    function runResult(index) {

        const result = results[index];

        if (!result) {
            return;
        }

        closePanel();

        input.value = "";

        input.blur();

        /* ให้ panel ปิดก่อน แล้วค่อยทำคำสั่ง (บางคำสั่งเปิดเมนูของตัวเอง) */
        setTimeout(() => {

            try {
                result.run();
            } catch (error) {
                console.error("[search.js]", error);
            }

        }, 0);
    }


    /* =====================================================
       EVENTS
    ===================================================== */

    input.addEventListener("focus", () => {

        activeIndex = 0;

        renderPanel();
    });

    input.addEventListener("input", () => {

        activeIndex = 0;

        renderPanel();
    });

    input.addEventListener("keydown", event => {

        if (event.key === "ArrowDown") {

            event.preventDefault();

            if (results.length) {
                activeIndex = (activeIndex + 1) % results.length;
                markActive();
            }

        } else if (event.key === "ArrowUp") {

            event.preventDefault();

            if (results.length) {
                activeIndex = (activeIndex - 1 + results.length) % results.length;
                markActive();
            }

        } else if (event.key === "Enter") {

            event.preventDefault();

            runResult(activeIndex);

        } else if (event.key === "Escape") {

            event.preventDefault();

            event.stopPropagation();

            closePanel();

            input.value = "";

            input.blur();
        }
    });

    input.addEventListener("blur", () => {

        /* หน่วงนิดหนึ่ง เผื่อกำลังคลิกรายการ */
        setTimeout(() => {

            if (document.activeElement !== input) {
                closePanel();
            }

        }, 120);
    });

    window.addEventListener("resize", positionPanel);


    /* Ctrl+K หรือ / (ตอนไม่ได้พิมพ์อยู่) → ไปที่ช่องค้นหา */
    document.addEventListener("keydown", event => {

        const isCtrlK =
            (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

        const active = document.activeElement;

        const typing =
            active &&
            (active.isContentEditable ||
             active.tagName === "INPUT" ||
             active.tagName === "TEXTAREA" ||
             active.tagName === "SELECT");

        const isSlash =
            event.key === "/" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey;

        if (!isCtrlK && !isSlash) {
            return;
        }

        event.preventDefault();

        input.focus();

        input.select();
    });


    window.ZGSearch = {

        open() {
            input.focus();
        },

        goToDate
    };

})();