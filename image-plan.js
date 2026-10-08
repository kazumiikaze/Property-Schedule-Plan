"use strict";

/* =========================================================
   IMAGE-PLAN.JS — สร้างแผนใหม่จากรูปตาราง (OCR)

   เมนู 🖼 รูปภาพ ▾ → "สร้างแผนจากรูปตาราง…"
     1) เลือก / ลากวาง / Ctrl+V รูปตาราง (Gantt, Excel, รูปถ่ายเอกสาร)
     2) กด "อ่านข้อความจากรูป" → ระบบอ่านตัวอักษร ไทย + อังกฤษ (OCR)
        แล้วแปลงเป็นรายการ หมวดหมู่ / แถว / งาน + วันที่ ให้อัตโนมัติ
        (ต้องต่ออินเทอร์เน็ตครั้งแรก เพื่อโหลดตัวอ่าน Tesseract.js)
     3) ตรวจแก้ในช่องด้านขวา (ดูรูปเทียบได้) — พิมพ์เองทั้งหมดก็ได้
          # ชื่อหมวดหมู่
          ชื่อแถว / บทบาท | ชื่องาน | วันเริ่ม | วันจบ
          | งานที่ 2 ของแถวเดิม | 1/11/2026 | 15/11/2026
        วันที่รับได้หลายแบบ: 15/09/2026 · 2026-09-15 · 15 ก.ย. 2569 ·
                              15 Sep 2026 · ก.ย. 69 (ทั้งเดือน)
     4) ตั้งชื่อแผน → สร้างแผน (แนบรูปต้นฉบับไว้บนกระดานได้)

   ไม่แก้ app.js — โหลดหลัง image-board.js และ plans.js
========================================================= */

(function () {

    const Z = window.ZGImage;

    if (!Z || !window.ZGPlanIO) {

        console.error("[image-plan.js] ต้องโหลดหลัง io.js และ image-board.js");

        return;
    }

    const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

    const PX_PER_DAY = 10;
    const REF_CATEGORY_HEIGHT = 120;
    const REF_BRACKET_HEIGHT = 93;

    const CATEGORY_COLORS = ["#f4a06a", "#ea5ba6", "#b46fb4", "#5b9bd5", "#58ad74", "#e1a638", "#7f8c8d", "#e06666"];


    /* =====================================================
       DATE PARSING
    ===================================================== */

    const TH_MONTHS = [
        ["มกราคม", "มค"], ["กุมภาพันธ์", "กพ"], ["มีนาคม", "มีค"], ["เมษายน", "เมย"],
        ["พฤษภาคม", "พค"], ["มิถุนายน", "มิย"], ["กรกฎาคม", "กค"], ["สิงหาคม", "สค"],
        ["กันยายน", "กย"], ["ตุลาคม", "ตค"], ["พฤศจิกายน", "พย"], ["ธันวาคม", "ธค"]
    ];

    const EN_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

    const TH_MONTH_RE = "(?:" + TH_MONTHS.map(([full, short]) =>
        `${full}|${short.split("").join("\\.?\\s?")}\\.?`).join("|") + ")";

    const EN_MONTH_RE = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";

    const MONTH_RE = `(${TH_MONTH_RE}|${EN_MONTH_RE})`;

    const DATE_PATTERNS = [
        /* 2026-09-15 / 2026/9/15 */
        { re: /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/g, get: m => [m[1], m[2], m[3]] },
        /* 15/09/2026 · 15-9-69 · 15.09.2569 */
        { re: /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/g, get: m => [m[3], m[2], m[1]] },
        /* 15 ก.ย. 2569 · 15 September 2026 */
        { re: new RegExp(`(\\d{1,2})\\s*${MONTH_RE}\\s*,?\\s*(\\d{2,4})`, "gi"), get: m => [m[3], m[2], m[1]] },
        /* Sep 15, 2026 */
        { re: new RegExp(`${MONTH_RE}\\s*(\\d{1,2}),?\\s+(\\d{4})`, "gi"), get: m => [m[3], m[1], m[2]] },
        /* ก.ย. 2569 · Sep 2026 (ทั้งเดือน) */
        { re: new RegExp(`${MONTH_RE}\\s*(\\d{2,4})`, "gi"), get: m => [m[2], m[1], null], monthOnly: true }
    ];

    function monthNumber(text) {

        if (/^\d+$/.test(text)) return Number(text);

        const clean = text.toLowerCase().replace(/[.\s]/g, "");

        for (let index = 0; index < 12; index += 1) {

            const [full, short] = TH_MONTHS[index];

            if (clean === full || clean === short) return index + 1;
        }

        const en = EN_MONTHS.findIndex(name => clean.startsWith(name));

        return en >= 0 ? en + 1 : 0;
    }

    function normalizeYear(year) {

        let value = Number(year);

        if (value < 100) value += value >= 50 ? 2500 : 2000;

        if (value > 2400) value -= 543;

        return value;
    }

    function makeDate(yearText, monthText, dayText, isEnd) {

        const year = normalizeYear(yearText);
        const month = monthNumber(String(monthText));

        if (!year || month < 1 || month > 12 || year < 1990 || year > 2100) return null;

        if (dayText == null) {

            return isEnd ? new Date(year, month, 0) : new Date(year, month - 1, 1);
        }

        const day = Number(dayText);

        const date = new Date(year, month - 1, day);

        if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;

        return date;
    }

    /* หาวันที่ทั้งหมดในบรรทัด → [{start, end, index, length}] */
    function findDates(text) {

        const found = [];

        DATE_PATTERNS.forEach(pattern => {

            pattern.re.lastIndex = 0;

            let match;

            while ((match = pattern.re.exec(text))) {

                const index = match.index;
                const length = match[0].length;

                if (found.some(item => index < item.index + item.length && item.index < index + length)) continue;

                const [year, month, day] = pattern.get(match);

                const start = makeDate(year, month, day, false);

                if (!start) continue;

                found.push({
                    start,
                    end: pattern.monthOnly ? makeDate(year, month, null, true) : start,
                    index,
                    length
                });
            }
        });

        return found.sort((a, b) => a.index - b.index);
    }

    function parseDateText(text, isEnd) {

        const hit = findDates(String(text || ""))[0];

        return hit ? (isEnd ? hit.end : hit.start) : null;
    }

    function fmt(date) {

        return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
    }

    function iso(date) {

        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function dayDiff(a, b) {

        return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
    }


    /* =====================================================
       TEXT ⇄ MODEL
    ===================================================== */

    function parseText(text) {

        const categories = [];
        const errors = [];

        let category = null;

        String(text || "").split(/\r?\n/).forEach((raw, lineIndex) => {

            const line = raw.trim();

            const lineNo = lineIndex + 1;

            if (!line || line.startsWith("//")) return;

            if (line.startsWith("#")) {

                category = { name: line.replace(/^#+/, "").trim() || `หมวดที่ ${categories.length + 1}`, rows: [] };

                categories.push(category);

                return;
            }

            if (!category) {

                category = { name: "หมวดที่ 1", rows: [] };

                categories.push(category);
            }

            const parts = line.split("|").map(part => part.trim());

            const head = parts[0];

            let row = category.rows[category.rows.length - 1] || null;

            if (head) {

                const [name, role] = head.split(/\s+\/\s+/);

                if (!row || row.text !== name.trim() || (role && row.role !== role.trim())) {

                    row = { text: name.trim(), role: (role || "").trim(), tasks: [] };

                    category.rows.push(row);
                }

            } else if (!row) {

                errors.push(`บรรทัด ${lineNo}: ยังไม่มีแถวให้ใส่งานนี้ (ใส่ชื่อแถวหน้า | )`);

                return;
            }

            const title = parts[1] || "";
            const startText = parts[2] || "";
            const endText = parts[3] || "";

            if (!title && !startText && !endText) return;

            if (!startText) {

                errors.push(`บรรทัด ${lineNo}: งาน "${title || row.text}" ยังไม่มีวันเริ่ม`);

                return;
            }

            const start = parseDateText(startText, false);
            let end = endText ? parseDateText(endText, true) : parseDateText(startText, true);

            if (!start) {
                errors.push(`บรรทัด ${lineNo}: อ่านวันเริ่ม "${startText}" ไม่ได้`);
                return;
            }

            if (!end) {
                errors.push(`บรรทัด ${lineNo}: อ่านวันจบ "${endText}" ไม่ได้`);
                return;
            }

            let from = start;

            if (end < from) [from, end] = [end, from];

            row.tasks.push({ title: title || row.text, start: from, end });
        });

        /* หมวดที่ไม่มีแถว → ใส่แถวว่าง 1 แถว */
        categories.forEach(item => {
            if (!item.rows.length) item.rows.push({ text: "type...", role: "", tasks: [] });
        });

        return { categories, errors };
    }

    function summarize(model) {

        const rows = model.categories.reduce((sum, item) => sum + item.rows.length, 0);

        const tasks = [];

        model.categories.forEach(item => item.rows.forEach(row => tasks.push(...row.tasks)));

        let range = null;

        if (tasks.length) {

            const min = new Date(Math.min(...tasks.map(task => task.start)));
            const max = new Date(Math.max(...tasks.map(task => task.end)));

            range = { min, max };
        }

        return { categories: model.categories.length, rows, tasks: tasks.length, range };
    }


    /* OCR → ข้อความรูปแบบด้านบน */
    function looksLikeHeader(line) {

        return line.length <= 40 && !findDates(line).length && !/\d{3,}/.test(line);
    }

    function lineToRow(line) {

        const dates = findDates(line);

        let name = line;

        dates.slice().reverse().forEach(hit => {
            name = name.slice(0, hit.index) + " " + name.slice(hit.index + hit.length);
        });

        name = name
            .replace(/\s*[-–—~:]+\s*$/g, "")
            .replace(/^\s*[-–—~:•·*]+\s*/g, "")
            .replace(/\s+[-–—~]+\s+/g, " ")
            .replace(/\s+/g, " ")
            .trim() || "งาน";

        if (dates.length >= 2) return `${name} | ${name} | ${fmt(dates[0].start)} | ${fmt(dates[dates.length - 1].end)}`;

        if (dates.length === 1) return `${name} | ${name} | ${fmt(dates[0].start)} | ${fmt(dates[0].end)}`;

        return name;
    }

    function ocrToText(paragraphs) {

        /* รวมทุกบรรทัด จำว่าบรรทัดไหนเป็นต้นย่อหน้า / ย่อหน้าบรรทัดเดียว */
        const items = [];

        paragraphs.forEach(lines => {

            const clean = lines
                .map(line => line.replace(/\s+/g, " ").replace(/[|¦]/g, " ").trim())
                .filter(line => /[\p{L}\p{N}]{2,}/u.test(line));

            clean.forEach((text, index) => items.push({
                text,
                dated: findDates(text).length > 0,
                paraStart: index === 0,
                alone: clean.length === 1
            }));
        });

        const out = [];

        let count = 0;
        let open = false;

        const startCategory = name => {

            count += 1;

            if (out.length) out.push("");

            out.push(`# ${name || `หมวดที่ ${count}`}`);

            open = true;
        };

        items.forEach((item, index) => {

            const prev = items[index - 1];
            const next = items[index + 1];

            const header =
                !item.dated &&
                looksLikeHeader(item.text) &&
                (
                    /* ย่อหน้าบรรทัดเดียว */
                    item.alone ||
                    /* บรรทัดถัดไปมีวันที่ และอยู่ต้นย่อหน้า/ต่อจากบรรทัดที่มีวันที่ */
                    (next && next.dated && (!prev || item.paraStart || prev.dated))
                );

            if (header) {
                startCategory(item.text);
                return;
            }

            if (!open) startCategory("");

            out.push(lineToRow(item.text));
        });

        return out.join("\n").trim();
    }


    /* =====================================================
       MODEL → PLAN DATA
    ===================================================== */

    function lighten(hex, amount) {

        const value = parseInt(hex.slice(1), 16);

        const mix = channel => Math.round(channel + (255 - channel) * amount);

        const r = mix((value >> 16) & 255);
        const g = mix((value >> 8) & 255);
        const b = mix(value & 255);

        return "#" + [r, g, b].map(channel => channel.toString(16).padStart(2, "0")).join("");
    }

    function id(prefix) {
        return Z.createLocalId(prefix);
    }

    function buildPlanData(model, options) {

        const summary = summarize(model);

        let start;
        let end;

        if (summary.range) {

            start = new Date(summary.range.min.getFullYear(), summary.range.min.getMonth(), 1);
            end = new Date(summary.range.max.getFullYear(), summary.range.max.getMonth() + 1, 0);

            /* อย่างน้อย 6 เดือน (ตารางไม่แคบเกินไป) */
            const minEnd = new Date(start.getFullYear(), start.getMonth() + 6, 0);

            if (end < minEnd) end = minEnd;

        } else {

            const today = new Date();

            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear() + 1, today.getMonth(), 1);
        }

        const roles = [
            { id: id("role"), name: "งานทั่วไป", color: "#f0f0f0" },
            { id: id("role"), name: "สำคัญ", color: "#d9534f" },
            { id: id("role"), name: "รอดำเนินการ", color: "#e1a638" }
        ];

        const categories = [];
        const objects = [];

        model.categories.forEach((item, categoryIndex) => {

            const color = CATEGORY_COLORS[categoryIndex % CATEGORY_COLORS.length];

            const rowHeight = REF_CATEGORY_HEIGHT / item.rows.length;

            const category = {
                id: id("category"),
                name: item.name,
                color,
                textColor: "#ffffff",
                rows: []
            };

            item.rows.forEach((row, rowIndex) => {

                const rowId = id("row");

                category.rows.push({
                    id: rowId,
                    text: row.text || "type...",
                    role: row.role || "",
                    type: rowIndex % 2 === 0 ? "seller" : "buyer"
                });

                const gap = rowHeight >= 24 ? 3 : 0;

                row.tasks.forEach(task => {

                    objects.push({
                        id: id("object"),
                        type: "task",
                        x: dayDiff(start, task.start) * PX_PER_DAY,
                        y: categoryIndex * REF_CATEGORY_HEIGHT + rowIndex * rowHeight + gap,
                        width: Math.max(1, dayDiff(task.start, task.end) + 1) * PX_PER_DAY,
                        height: Math.max(16, rowHeight - gap * 2),
                        roleId: roles[0].id,
                        color: lighten(color, 0.55),
                        text: task.title,
                        detail: `${fmt(task.start)} – ${fmt(task.end)}`,
                        linkedHeaderDate: null,
                        lineColor: null,
                        lineThickness: null,
                        iconKey: "",
                        showHeading: true,
                        layer: "front",
                        pinLeft: 0,
                        pinRight: 0,
                        showDetail: false,
                        verticalLineStyle: "none",
                        textColorMode: "dark",
                        textPosition: 4,
                        anchorStartId: null,
                        anchorEndId: null
                    });
                });
            });

            categories.push(category);
        });

        const data = {
            app: window.ZGPlanIO.FILE_APP,
            version: window.ZGPlanIO.FILE_VERSION,
            title: options.title || "Property schedule plan",
            subtitle: options.subtitle || "title",
            updateDate: iso(new Date()),
            timeline: {
                start: iso(start),
                end: iso(end),
                zoom: 1,
                pxPerDay: PX_PER_DAY,
                scrollLeft: 0
            },
            categories,
            roles,
            objects,
            notes: [{ id: id("note"), header: "Header", body: "type..." }],
            layout: { categoryHeight: REF_CATEGORY_HEIGHT, bracketHeight: REF_BRACKET_HEIGHT },
            texts: [],
            images: options.images || [],
            logo: ""
        };

        return data;
    }


    /* =====================================================
       OCR (Tesseract.js จาก CDN — โหลดเมื่อใช้ครั้งแรก)
    ===================================================== */

    let tesseractPromise = null;

    function loadTesseract() {

        if (window.Tesseract) return Promise.resolve(window.Tesseract);

        if (!tesseractPromise) {

            tesseractPromise = new Promise((resolve, reject) => {

                const script = document.createElement("script");

                script.src = TESSERACT_URL;
                script.async = true;

                script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error("load"));
                script.onerror = () => {
                    tesseractPromise = null;
                    script.remove();
                    reject(new Error("load"));
                };

                document.head.appendChild(script);
            });
        }

        return tesseractPromise;
    }

    /* ขยายรูปเล็ก + ทำเป็นขาวดำ ให้อ่านแม่นขึ้น */
    async function prepareForOcr(src) {

        const image = await Z.loadImage(src);

        const width = image.naturalWidth;
        const height = image.naturalHeight;

        const scale = Math.max(1, Math.min(3, 2000 / Math.max(width, 1)));

        const canvas = document.createElement("canvas");

        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);

        const context = canvas.getContext("2d");

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.imageSmoothingQuality = "high";
        context.filter = "grayscale(1) contrast(1.25)";
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        return canvas;
    }

    async function runOcr(src, langs, onProgress) {

        const Tesseract = await loadTesseract();

        const worker = await Tesseract.createWorker(langs, 1, {
            logger: message => {
                if (message && typeof message.progress === "number") {
                    onProgress(message.status || "", message.progress);
                }
            }
        });

        try {

            const canvas = await prepareForOcr(src);

            const { data } = await worker.recognize(canvas);

            let paragraphs = [];

            if (Array.isArray(data.paragraphs) && data.paragraphs.length) {

                paragraphs = data.paragraphs.map(paragraph =>
                    (paragraph.lines || []).map(line => line.text || "").filter(Boolean));

            } else if (Array.isArray(data.blocks) && data.blocks.length) {

                data.blocks.forEach(block => (block.paragraphs || []).forEach(paragraph => {
                    paragraphs.push((paragraph.lines || []).map(line => line.text || "").filter(Boolean));
                }));
            }

            if (!paragraphs.length) {

                paragraphs = String(data.text || "")
                    .split(/\n\s*\n/)
                    .map(block => block.split("\n"));
            }

            /* OCR ภาษาไทยมักเว้นวรรคระหว่างตัวอักษร → ต่อกลับ */
            paragraphs = paragraphs.map(lines => lines.map(line =>
                line.replace(/\u0E4D\u0E32/g, "\u0E33").replace(/([฀-๿])\s+(?=[฀-๿])/g, "$1")));

            return paragraphs;

        } finally {

            worker.terminate().catch(() => {});
        }
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.zg-iplan {
    position: fixed;
    inset: 0;
    z-index: 25600;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
    background: rgba(28, 38, 33, .30);
    -webkit-backdrop-filter: blur(7px);
    backdrop-filter: blur(7px);
    font-family: Arial, Helvetica, sans-serif;
    color: #1e2924;
}
.zg-iplan__box {
    display: flex;
    flex-direction: column;
    width: min(1180px, 100%);
    height: min(780px, calc(100vh - 40px));
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 24px 70px rgba(10, 30, 20, .28);
    overflow: hidden;
}
.zg-iplan__head { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #edf0ee; }
.zg-iplan__title { font-size: 17px; font-weight: 700; }
.zg-iplan__sub { color: #7a827e; font-size: 12px; }
.zg-iplan__x { margin-left: auto; height: 30px; padding: 0 12px; border: 1px solid #dde3e0; border-radius: 8px; background: #ffffff; cursor: pointer; font: inherit; font-size: 12px; }
.zg-iplan__body { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; }
.zg-iplan__left, .zg-iplan__right { min-height: 0; display: flex; flex-direction: column; padding: 14px 16px; gap: 10px; }
.zg-iplan__left { border-right: 1px solid #edf0ee; background: #fafbfa; }
.zg-iplan__step { font-size: 12px; font-weight: 700; color: #2f7442; }
.zg-iplan__drop {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border: 2px dashed #c9d1cd;
    border-radius: 14px;
    background: #ffffff;
    color: #6f7873;
    text-align: center;
    font-size: 13px;
    line-height: 1.6;
    padding: 20px;
}
.zg-iplan__drop.is-over { border-color: #3a8a4f; background: #f1f9f3; }
.zg-iplan__drop-icon { font-size: 40px; }
.zg-iplan__preview { flex: 1; min-height: 0; overflow: auto; border: 1px solid #dde3e0; border-radius: 12px; background: #ffffff; }
.zg-iplan__preview img { display: block; width: 100%; height: auto; }
.zg-iplan__preview.is-zoom img { width: auto; max-width: none; }
.zg-iplan__row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.zg-iplan__btn {
    height: 34px;
    padding: 0 14px;
    border: 1px solid #dde3e0;
    border-radius: 9px;
    background: #ffffff;
    color: inherit;
    font: inherit;
    font-size: 12.5px;
    cursor: pointer;
    white-space: nowrap;
}
.zg-iplan__btn:hover:not(:disabled) { background: #eef6f0; }
.zg-iplan__btn--ok { background: #3a8a4f; border-color: #3a8a4f; color: #ffffff; font-weight: 700; }
.zg-iplan__btn--ok:hover:not(:disabled) { background: #317a44; }
.zg-iplan__btn:disabled { opacity: .5; cursor: default; }
.zg-iplan__select { height: 34px; padding: 0 8px; border: 1px solid #dde3e0; border-radius: 9px; background: #ffffff; font: inherit; font-size: 12.5px; }
.zg-iplan__progress { display: none; flex-direction: column; gap: 4px; font-size: 11.5px; color: #6f7873; }
.zg-iplan__progress.is-show { display: flex; }
.zg-iplan__bar { height: 6px; border-radius: 99px; background: #e8ece9; overflow: hidden; }
.zg-iplan__bar span { display: block; height: 100%; width: 0; background: #3a8a4f; transition: width .2s ease; }
.zg-iplan__text {
    flex: 1;
    min-height: 120px;
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid #dde3e0;
    border-radius: 12px;
    resize: none;
    font: 13px/1.65 Consolas, "Courier New", monospace;
    color: inherit;
    background: #ffffff;
    white-space: pre;
    overflow: auto;
}
.zg-iplan__text:focus { outline: none; border-color: #8cc79c; box-shadow: 0 0 0 3px rgba(140, 199, 156, .25); }
.zg-iplan__help { font-size: 11.5px; color: #6f7873; line-height: 1.6; }
.zg-iplan__help summary { cursor: pointer; color: #2f7442; font-weight: 700; }
.zg-iplan__help code { padding: 1px 5px; border-radius: 4px; background: #f0f4f2; font-size: 11px; }
.zg-iplan__summary { font-size: 12px; color: #2f7442; font-weight: 700; }
.zg-iplan__errors { max-height: 72px; overflow: auto; font-size: 11.5px; color: #c0392b; line-height: 1.5; }
.zg-iplan__foot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 18px; border-top: 1px solid #edf0ee; }
.zg-iplan__name { flex: 1; min-width: 200px; height: 36px; padding: 0 12px; border: 1px solid #dde3e0; border-radius: 9px; font: inherit; font-size: 13.5px; }
.zg-iplan__check { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #4a5550; }

body.zg-dark .zg-iplan__box { background: #1f2623; color: #e3e9e5; }
body.zg-dark .zg-iplan__left { background: #1b211f; }
body.zg-dark .zg-iplan__drop,
body.zg-dark .zg-iplan__preview,
body.zg-dark .zg-iplan__text,
body.zg-dark .zg-iplan__btn:not(.zg-iplan__btn--ok),
body.zg-dark .zg-iplan__select,
body.zg-dark .zg-iplan__name,
body.zg-dark .zg-iplan__x { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-iplan__head,
body.zg-dark .zg-iplan__foot,
body.zg-dark .zg-iplan__left { border-color: #333c38; }
body.zg-dark .zg-iplan__check { color: #c2ccc6; }
body.zg-exporting .zg-iplan { display: none !important; }

@media (max-width: 820px) {
    .zg-iplan__body { grid-template-columns: 1fr; overflow: auto; }
    .zg-iplan__left { border-right: 0; border-bottom: 1px solid #edf0ee; min-height: 320px; }
    .zg-iplan__right { min-height: 380px; }
}
`;

    document.head.appendChild(style);


    /* =====================================================
       DIALOG
    ===================================================== */

    const EXAMPLE = [
        "# ติดต่อ (Contact)",
        "GDM / Seller | ยืนยันราคาและเงื่อนไข | 15/09/2026 | 30/09/2026",
        "Asia Metal / Buyer | ตรวจสอบเอกสาร | 1 ต.ค. 2569 | 20 ต.ค. 2569",
        "",
        "# ชำระเงิน (Payment)",
        "Asia Metal / Buyer | งวดที่ 1 (10%) | 2026-10-15 | 2026-10-31",
        " | งวดที่ 2 (30%) | ธ.ค. 2569"
    ].join("\n");

    let overlay = null;

    let state = null;

    function close() {

        if (overlay) {
            overlay.remove();
            overlay = null;
        }

        state = null;

        document.removeEventListener("keydown", onKey, true);
        document.removeEventListener("paste", onPaste, true);
    }

    function onKey(event) {

        if (event.key === "Escape" && overlay && !state.busy) {
            event.stopImmediatePropagation();
            close();
        }
    }

    function onPaste(event) {

        if (!overlay) return;

        const files = Z.filesFromTransfer(event.clipboardData).filter(Z.isImageFile);

        if (!files.length) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        setImage(files[0]);
    }

    function open(initialFile) {

        close();

        Z.closeMenu && Z.closeMenu();

        if (typeof closeObjectMenu === "function") closeObjectMenu();

        state = { src: null, name: "", busy: false, ar: 1 };

        overlay = document.createElement("div");

        overlay.className = "zg-iplan";
        overlay.setAttribute("role", "dialog");

        overlay.innerHTML = `
            <div class="zg-iplan__box">
                <div class="zg-iplan__head">
                    <div>
                        <div class="zg-iplan__title">📑 สร้างแผนจากรูปตาราง</div>
                        <div class="zg-iplan__sub">ใส่รูปตาราง → อ่านข้อความอัตโนมัติ → ตรวจแก้ → สร้างแผนใหม่</div>
                    </div>
                    <button type="button" class="zg-iplan__x" data-ip="close">✕ ปิด</button>
                </div>

                <div class="zg-iplan__body">
                    <div class="zg-iplan__left">
                        <div class="zg-iplan__step">① รูปตาราง</div>
                        <div class="zg-iplan__drop" data-ip-drop>
                            <div class="zg-iplan__drop-icon">🖼</div>
                            <div>ลากรูปตารางมาวางที่นี่ หรือกด Ctrl+V<br><small>รองรับ PNG, JPG, WEBP — รูปชัด ตัวหนังสือใหญ่ จะอ่านได้แม่นกว่า</small></div>
                            <button type="button" class="zg-iplan__btn zg-iplan__btn--ok" data-ip="pick">เลือกรูป…</button>
                            <button type="button" class="zg-iplan__btn" data-ip="manual">ไม่มีรูป — พิมพ์เองเลย</button>
                        </div>
                        <div class="zg-iplan__preview" data-ip-preview hidden title="คลิกเพื่อซูม"></div>
                        <div class="zg-iplan__row" data-ip-tools hidden>
                            <button type="button" class="zg-iplan__btn zg-iplan__btn--ok" data-ip="ocr">🔍 อ่านข้อความจากรูป</button>
                            <select class="zg-iplan__select" data-ip-lang title="ภาษาในรูป">
                                <option value="tha+eng">ไทย + อังกฤษ</option>
                                <option value="eng">อังกฤษ</option>
                                <option value="tha">ไทย</option>
                            </select>
                            <button type="button" class="zg-iplan__btn" data-ip="pick">🔄 เปลี่ยนรูป</button>
                        </div>
                        <div class="zg-iplan__progress" data-ip-progress>
                            <span data-ip-status>กำลังเตรียม…</span>
                            <div class="zg-iplan__bar"><span data-ip-bar></span></div>
                        </div>
                    </div>

                    <div class="zg-iplan__right">
                        <div class="zg-iplan__step">② ตรวจแก้รายการ (หมวดหมู่ / แถว / งาน)</div>
                        <details class="zg-iplan__help">
                            <summary>วิธีเขียน (คลิกดู)</summary>
                            <div>
                                <code># ชื่อหมวดหมู่</code> ขึ้นหมวดหมู่ใหม่<br>
                                <code>ชื่อแถว / บทบาท | ชื่องาน | วันเริ่ม | วันจบ</code> หนึ่งบรรทัด = หนึ่งแถว (มีงานหรือไม่ก็ได้)<br>
                                <code> | ชื่องาน | วันเริ่ม | วันจบ</code> ขึ้นต้นด้วย | = เพิ่มงานในแถวก่อนหน้า<br>
                                วันที่: <code>15/09/2026</code> <code>2026-09-15</code> <code>15 ก.ย. 2569</code> <code>15 Sep 2026</code> · ใส่แค่ <code>ก.ย. 69</code> = ทั้งเดือน<br>
                                ขึ้นต้นด้วย <code>//</code> = หมายเหตุ (ไม่นำไปใช้)
                            </div>
                        </details>
                        <textarea class="zg-iplan__text" data-ip-text spellcheck="false" placeholder="${Z.escapeHtml(EXAMPLE)}"></textarea>
                        <div class="zg-iplan__summary" data-ip-summary></div>
                        <div class="zg-iplan__errors" data-ip-errors></div>
                    </div>
                </div>

                <div class="zg-iplan__foot">
                    <input type="text" class="zg-iplan__name" data-ip-name placeholder="ชื่อแผน (เช่น ชื่อลูกค้า / โครงการ)" maxlength="80">
                    <label class="zg-iplan__check" data-ip-attach-wrap hidden><input type="checkbox" data-ip-attach> แนบรูปต้นฉบับไว้บนกระดาน</label>
                    <button type="button" class="zg-iplan__btn" data-ip="example">ดูตัวอย่าง</button>
                    <button type="button" class="zg-iplan__btn" data-ip="close">ยกเลิก</button>
                    <button type="button" class="zg-iplan__btn zg-iplan__btn--ok" data-ip="create" disabled>＋ สร้างแผน</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const $ = selector => overlay.querySelector(selector);

        state.$ = $;

        overlay.addEventListener("mousedown", event => {
            if (event.target === overlay && !state.busy) close();
        });

        overlay.addEventListener("click", onClick);

        $("[data-ip-text]").addEventListener("input", refresh);
        $("[data-ip-name]").addEventListener("input", () => { state.nameTouched = true; refresh(); });

        $("[data-ip-preview]").addEventListener("click", () => $("[data-ip-preview]").classList.toggle("is-zoom"));

        /* ลากรูปมาวางในหน้าต่างนี้ */
        const drop = overlay;

        drop.addEventListener("dragover", event => {
            if (!Z.transferHasFiles(event.dataTransfer)) return;
            event.preventDefault();
            event.stopPropagation();
            $("[data-ip-drop]").classList.add("is-over");
        });

        drop.addEventListener("dragleave", event => {
            if (!overlay.contains(event.relatedTarget)) $("[data-ip-drop]").classList.remove("is-over");
        });

        drop.addEventListener("drop", event => {

            event.preventDefault();
            event.stopPropagation();

            $("[data-ip-drop]").classList.remove("is-over");

            const files = Z.filesFromTransfer(event.dataTransfer).filter(file => Z.isImageFile(file) || Z.isHeic(file));

            if (files.length) setImage(files[0]);
        });

        document.addEventListener("keydown", onKey, true);
        document.addEventListener("paste", onPaste, true);

        refresh();

        if (initialFile) setImage(initialFile);
    }

    async function onClick(event) {

        const button = event.target.closest("[data-ip]");

        if (!button || !state || button.disabled) return;

        const $ = state.$;

        const action = button.dataset.ip;

        if (action === "close") {
            if (!state.busy) close();
            return;
        }

        if (action === "pick") {

            const files = await Z.pickImageFiles();

            if (files.length) setImage(files[0]);

            return;
        }

        if (action === "manual") {

            const text = $("[data-ip-text]");

            if (!text.value.trim()) text.value = "# หมวดที่ 1\n";

            text.focus();
            text.setSelectionRange(text.value.length, text.value.length);

            refresh();

            return;
        }

        if (action === "example") {

            const text = $("[data-ip-text]");

            if (text.value.trim() && !window.confirm("แทนที่ข้อความที่มีอยู่ด้วยตัวอย่าง?")) return;

            text.value = EXAMPLE;

            refresh();

            return;
        }

        if (action === "ocr") {
            doOcr();
            return;
        }

        if (action === "create") {
            create();
        }
    }

    async function setImage(file) {

        if (!state || state.busy) return;

        const $ = state.$;

        try {

            /* เก็บรูปความละเอียดสูงไว้อ่าน OCR */
            const result = await Z.processImage(file, { maxSide: 3000, quality: 0.92, keepBelowChars: 4000000 });

            if (!state) return;

            state.src = result.src;
            state.ar = result.width / result.height;
            state.name = (file.name || "").replace(/\.[^.]+$/, "");

            const preview = $("[data-ip-preview]");

            preview.innerHTML = "";

            const img = document.createElement("img");

            img.src = result.src;
            img.alt = "";

            preview.appendChild(img);

            preview.hidden = false;

            $("[data-ip-drop]").hidden = true;
            $("[data-ip-drop]").style.display = "none";
            $("[data-ip-tools]").hidden = false;
            $("[data-ip-attach-wrap]").hidden = false;

            const name = $("[data-ip-name]");

            if (!state.nameTouched && state.name && !/^(image|clipboard|screenshot|ภาพหน้าจอ)/i.test(state.name)) {
                name.value = state.name;
            }

            refresh();

        } catch (error) {

            Z.toast(error.message, true);
        }
    }

    async function doOcr() {

        if (!state || !state.src || state.busy) return;

        const $ = state.$;

        const text = $("[data-ip-text]");

        if (text.value.trim() && !window.confirm("ข้อความที่พิมพ์ไว้จะถูกแทนที่ด้วยผลการอ่านจากรูป — ทำต่อ?")) return;

        state.busy = true;

        const progress = $("[data-ip-progress]");
        const status = $("[data-ip-status]");
        const bar = $("[data-ip-bar]");

        progress.classList.add("is-show");

        overlay.querySelectorAll("[data-ip='ocr'], [data-ip='pick'], [data-ip='create']").forEach(node => { node.disabled = true; });

        const STATUS = {
            "loading tesseract core": "กำลังโหลดตัวอ่าน…",
            "initializing tesseract": "กำลังเตรียมตัวอ่าน…",
            "loading language traineddata": "กำลังโหลดข้อมูลภาษา (ครั้งแรกอาจนานหน่อย)…",
            "initializing api": "กำลังเตรียม…",
            "recognizing text": "กำลังอ่านข้อความในรูป…"
        };

        status.textContent = "กำลังโหลดตัวอ่าน (ต้องต่ออินเทอร์เน็ต)…";
        bar.style.width = "3%";

        try {

            const paragraphs = await runOcr(state.src, $("[data-ip-lang]").value, (stage, value) => {

                if (!overlay) return;

                status.textContent = `${STATUS[stage] || stage} ${Math.round(value * 100)}%`;

                const base = stage === "recognizing text" ? 40 : 0;
                const span = stage === "recognizing text" ? 60 : 40;

                bar.style.width = `${Math.min(100, base + value * span)}%`;
            });

            if (!overlay) return;

            const result = ocrToText(paragraphs);

            if (!result.trim()) {

                Z.toast("อ่านข้อความจากรูปไม่ได้ — ลองใช้รูปที่ชัดขึ้น หรือพิมพ์เอง", true);

            } else {

                text.value = "// ตรวจแก้ชื่อหมวด/แถว/วันที่ให้ถูกต้องก่อนกดสร้างแผน\n" + result;

                Z.toast("อ่านข้อความเสร็จแล้ว — ตรวจแก้ด้านขวาก่อนสร้างแผน");
            }

        } catch (error) {

            console.error("[image-plan.js]", error);

            Z.toast(
                error && error.message === "load"
                    ? "โหลดตัวอ่าน OCR ไม่ได้ — ตรวจการเชื่อมต่ออินเทอร์เน็ต แล้วลองใหม่ (หรือพิมพ์เอง)"
                    : "อ่านรูปไม่สำเร็จ: " + (error && error.message ? error.message : error),
                true
            );

        } finally {

            if (state) {

                state.busy = false;

                progress.classList.remove("is-show");

                overlay.querySelectorAll("[data-ip='ocr'], [data-ip='pick']").forEach(node => { node.disabled = false; });

                refresh();
            }
        }
    }

    function refresh() {

        if (!state) return;

        const $ = state.$;

        const model = parseText($("[data-ip-text]").value);

        const summary = summarize(model);

        const errorsEl = $("[data-ip-errors]");

        errorsEl.innerHTML = model.errors.slice(0, 20).map(line => `<div>⚠ ${Z.escapeHtml(line)}</div>`).join("") +
            (model.errors.length > 20 ? `<div>… และอีก ${model.errors.length - 20} จุด</div>` : "");

        const summaryEl = $("[data-ip-summary]");

        if (!summary.rows) {

            summaryEl.textContent = state.src
                ? "กด 🔍 อ่านข้อความจากรูป หรือพิมพ์รายการเองในช่องด้านบน"
                : "";

        } else {

            const range = summary.range
                ? ` · ช่วง ${fmt(summary.range.min)} → ${fmt(summary.range.max)}`
                : " · ยังไม่มีวันที่ (ช่วงเวลา 12 เดือนนับจากเดือนนี้)";

            summaryEl.textContent = `✓ ${summary.categories} หมวดหมู่ · ${summary.rows} แถว · ${summary.tasks} งาน${range}`;
        }

        const create = $("[data-ip='create']");

        create.disabled = state.busy || !summary.rows || model.errors.length > 0;

        create.title = model.errors.length ? "แก้จุดที่มี ⚠ ก่อน" : "";
    }

    async function create() {

        if (!state || state.busy) return;

        const $ = state.$;

        const model = parseText($("[data-ip-text]").value);

        if (model.errors.length || !summarize(model).rows) return;

        const name = $("[data-ip-name]").value.trim() || state.name || "แผนจากรูปภาพ";

        const images = [];

        if (state.src && $("[data-ip-attach]").checked && window.ZGBoardImages) {

            try {

                const small = await Z.processImage(state.src, { maxSide: 1400, quality: 0.85 });

                const entry = window.ZGBoardImages.makeEntry({
                    src: small.src,
                    x: 0.64,
                    y: 0.6,
                    w: 0.32,
                    ar: small.width / small.height,
                    opacity: 0.95,
                    border: true,
                    name: "รูปต้นฉบับ"
                });

                if (entry) images.push(entry);

            } catch (error) { /* ไม่แนบรูป */ }
        }

        const data = buildPlanData(model, {
            title: "Property schedule plan",
            subtitle: name,
            images
        });

        close();

        try {

            if (window.ZGPlans && typeof window.ZGPlans.createFromData === "function") {
                window.ZGPlans.createFromData(name, data, `สร้างแผน "${name}" แล้ว`);
            } else {
                window.ZGPlanIO.apply(data);
            }

        } catch (error) {

            console.error("[image-plan.js]", error);

            Z.toast("สร้างแผนไม่สำเร็จ: " + error.message, true);
        }
    }


    Z.addMenuItem({
        order: 70,
        group: "new",
        icon: "📑",
        label: "สร้างแผนจากรูปตาราง…",
        sub: "อ่านข้อความในรูป (OCR) แล้วสร้างเป็นแผนใหม่",
        run: () => open()
    });

    window.ZGImagePlan = {
        open,
        parseText,
        findDates,
        ocrToText,
        buildPlanData
    };

})();
