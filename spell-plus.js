"use strict";

/* =========================================================
   SPELL-PLUS.JS — แผงตรวจคำผิด (ปุ่ม 🔎 ตรวจคำผิด)
   1) แผงด้านข้าง: ไล่ตรวจทุกข้อความในแผน แสดงรายการ คลิก = ไปที่ชิ้นนั้น
   2) พจนานุกรมคำผิดบ่อย (งานที่ดิน ไทย / อังกฤษ) — แก้ทีละจุด / แก้ทั้งหมด
   3) รูปแบบ: เว้นวรรคซ้ำ · ช่องว่างหน้า/ท้าย · คำซ้ำติดกัน · เลขไทยปนอารบิก
              · เ+เ แทน แ · ํ+า แทน ำ
   4) ความสม่ำเสมอ: คำเดียวกันเขียนต่างกัน (IEAT / I-EAT, Buyer / BUYER, ตร.ว. / ตรว.)
   5) ยังไม่ได้กรอก: title / type... / Header / Category / กล่องว่าง
   6) ขีดเส้นใต้สีส้มใต้คำที่น่าจะผิด (ไม่ต้องโฟกัส · ไม่กะพริบ · ไม่ติดตอนพิมพ์)
   7) เช็กก่อนพิมพ์ A3 / Export รูป
   8) ข้ามคำ / จำว่าถูก + พจนานุกรมของทีม (spell-words.js)
   - เส้นหยักแดงของเบราว์เซอร์ (spellcheck.js เดิม) ยังเปิด/ปิดได้ในแผง
   - ไม่แก้ app.js / style.css
========================================================= */

(function () {

    const io = window.ZGPlanIO;
    const button = document.getElementById("toolbarSpellcheckBtn");

    if (!io || typeof io.build !== "function" || typeof io.apply !== "function" || !button) {
        console.warn("[spell-plus.js] ไม่พบ ZGPlanIO หรือปุ่มตรวจคำผิด");
        return;
    }

    const IGNORE_KEY = "zg-spell-ignore-v1";
    const ON_KEY = "zg-spell-on-v1";

    const isFixable = issue => issue.type === "dict" || issue.type === "format" || issue.type === "consist";
    const thai = window.ZGThaiSpell || null;
    const HIGHLIGHT_KEY = "zg-spell-highlight-v1";
    const BROWSER_KEY = "zg-property-schedule-spellcheck";


    /* =====================================================
       พจนานุกรม
    ===================================================== */

    const THAI_FIXES = {
        "กรรมสิทธ์": "กรรมสิทธิ์",
        "กรรมสิทธิ": "กรรมสิทธิ์",
        "อนุญาติ": "อนุญาต",
        "โฉนต": "โฉนด",
        "ค่าธรรมเนี่ยม": "ค่าธรรมเนียม",
        "สัญญ่า": "สัญญา",
        "ศัญญา": "สัญญา",
        "สัญาณ": "สัญญา",
        "ทะเบียณ": "ทะเบียน",
        "ธุระกิจ": "ธุรกิจ",
        "บริษัธ": "บริษัท",
        "บริศัท": "บริษัท",
        "บริษัด": "บริษัท",
        "นิตกรรม": "นิติกรรม",
        "นิติกรม": "นิติกรรม",
        "สาธารณูปโภก": "สาธารณูปโภค",
        "สาธารณูปโพค": "สาธารณูปโภค",
        "สาธารณูประโภค": "สาธารณูปโภค",
        "อุตสาหะกรรม": "อุตสาหกรรม",
        "อุสาหกรรม": "อุตสาหกรรม",
        "เอกษาร": "เอกสาร",
        "เอกสาน": "เอกสาร",
        "รังวัต": "รังวัด",
        "ค่าใช่จ่าย": "ค่าใช้จ่าย",
        "เซ็นต์สัญญา": "เซ็นสัญญา",
        "เซ็นต์ชื่อ": "เซ็นชื่อ",
        "ภารจำยอม": "ภาระจำยอม",
        "จำนอน": "จำนอง",
        "ประเมิณ": "ประเมิน",
        "ประมาน": "ประมาณ",
        "ระยะเวลาณ์": "ระยะเวลา",
        "อนุมัด": "อนุมัติ",
        "ใบอนุญาด": "ใบอนุญาต",
        "ผังเมื่อง": "ผังเมือง",
        "ภาษีธุระกิจ": "ภาษีธุรกิจ",
        "ค่ามัดจํา": "ค่ามัดจำ",
        "ผู้รับมอบอำนาท": "ผู้รับมอบอำนาจ",
        "มอบอำนาท": "มอบอำนาจ",
        "พยาณ": "พยาน",
        "ลายเซ็นต์": "ลายเซ็น",
        "ทนาย์ความ": "ทนายความ",
        "ปลูกสร้างค์": "ปลูกสร้าง",
        "กำหนดการณ์": "กำหนดการ",
        "อณุญาต": "อนุญาต",
        "การนิคมอุสาหกรรม": "การนิคมอุตสาหกรรม"
    };

    const EN_FIXES = {
        deposite: "deposit",
        contrat: "contract",
        contarct: "contract",
        recieve: "receive",
        reciept: "receipt",
        seperate: "separate",
        occured: "occurred",
        agrement: "agreement",
        aggrement: "agreement",
        agreemnet: "agreement",
        comission: "commission",
        commision: "commission",
        goverment: "government",
        enviroment: "environment",
        managment: "management",
        developement: "development",
        purchse: "purchase",
        puchase: "purchase",
        purchace: "purchase",
        transfered: "transferred",
        tranfer: "transfer",
        trasfer: "transfer",
        proeprty: "property",
        propery: "property",
        porperty: "property",
        industral: "industrial",
        lisence: "license",
        paymnet: "payment",
        payement: "payment",
        schdule: "schedule",
        shedule: "schedule",
        scheduel: "schedule",
        bussiness: "business",
        buisness: "business",
        untill: "until",
        calender: "calendar",
        adress: "address",
        submition: "submission",
        apporval: "approval",
        aproval: "approval",
        permision: "permission",
        survay: "survey",
        inspecton: "inspection",
        sertificate: "certificate",
        certificat: "certificate",
        mortage: "mortgage",
        morgage: "mortgage",
        negociation: "negotiation",
        negotation: "negotiation",
        sumbit: "submit",
        signiture: "signature",
        sigature: "signature",
        documnet: "document",
        dcoument: "document",
        reciever: "receiver",
        lanlord: "landlord",
        teh: "the"
    };

    /* คำซ้ำติดกันที่ผิดแน่ ๆ (ภาษาไทย) */
    const THAI_REPEATS = ["และและ", "ของของ", "การการ", "ในใน", "จะจะ", "กับกับ", "หรือหรือ", "เพื่อเพื่อ", "โดยโดย"];

    /* กลุ่มคำที่ควรเขียนแบบเดียวกันทั้งแผน (คำแรก = แบบที่แนะนำ) */
    const CONSIST_GROUPS = [
        ["ตร.ว.", "ตรว.", "ตร.วา"],
        ["ตร.ม.", "ตรม.", "ตร.ม"],
        ["กนอ.", "กนอ"],
        ["บจก.", "บ.จ.ก."],
        ["หจก.", "ห.จ.ก."]
    ];

    const DEFAULTS = {
        title: ["Property schedule plan", "title"],
        subtitle: ["title"],
        category: ["Category", "ชื่อหมวดหมู่"],
        row: ["type...", "type…"],
        object: ["title", "type...", "Text"],
        noteHeader: ["Header"],
        noteBody: ["type...", "type…"]
    };


    /* =====================================================
       ข้ามคำ / พจนานุกรมของทีม
    ===================================================== */

    const team = window.ZG_SPELL_TEAM && typeof window.ZG_SPELL_TEAM === "object" ? window.ZG_SPELL_TEAM : {};

    const teamFixes = team.fixes && typeof team.fixes === "object" ? team.fixes : {};
    const teamIgnore = new Set((Array.isArray(team.ignore) ? team.ignore : []).map(word => String(word).toLowerCase()));

    function loadIgnore() {
        try {
            const list = JSON.parse(localStorage.getItem(IGNORE_KEY) || "[]");
            return new Set(Array.isArray(list) ? list.map(String) : []);
        } catch (error) {
            return new Set();
        }
    }

    let myIgnore = loadIgnore();

    function saveIgnore() {
        try {
            localStorage.setItem(IGNORE_KEY, JSON.stringify(Array.from(myIgnore)));
        } catch (error) { /* ignore */ }
    }

    /* ข้ามเฉพาะรอบนี้ (จนปิดหน้า) */
    const skipped = new Set();

    function isIgnoredWord(word) {
        const key = String(word).toLowerCase();
        return myIgnore.has(key) || teamIgnore.has(key);
    }


    /* =====================================================
       เก็บข้อความทั้งหมดจากแผน
    ===================================================== */

    const OBJECT_LABEL = { task: "กล่องงาน", dateline: "เส้นวันที่", hline: "เส้นแนวนอน", vline: "เส้นแนวตั้ง" };
    const INFO_LABEL = { customer: "ลูกค้า", location: "ที่ตั้ง", size: "ขนาดที่ดิน", owner: "เซลผู้ดูแล" };

    function short(text, max = 18) {
        const clean = String(text || "").replace(/\s+/g, " ").trim();
        return clean.length > max ? `${clean.slice(0, max)}…` : clean;
    }

    function collect(data) {

        const fields = [];

        const add = (path, value, label, loc, kind) => {
            if (typeof value === "string") fields.push({ path, value, label, loc, kind: kind || "" });
        };

        add(["title"], data.title, "หัวข้อแผน", { kind: "title" }, "title");
        add(["subtitle"], data.subtitle, "บรรทัดรอง", { kind: "title" }, "subtitle");

        if (data.header && data.header.info) {
            Object.keys(INFO_LABEL).forEach(key => {
                add(["header", "info", key], data.header.info[key], `หัวกระดาน · ${INFO_LABEL[key]}`, { kind: "header" }, "info");
            });
        }

        (data.categories || []).forEach((category, ci) => {

            add(["categories", ci, "name"], category.name, "หมวดหมู่", { kind: "category", id: category.id }, "category");

            (category.rows || []).forEach((row, ri) => {
                const where = `แถว · ${short(category.name, 14) || "หมวดหมู่"}`;
                add(["categories", ci, "rows", ri, "text"], row.text, `${where} (ชื่อ)`, { kind: "row", id: row.id, part: "main" }, "row");
                add(["categories", ci, "rows", ri, "role"], row.role, `${where} (บทบาท)`, { kind: "row", id: row.id, part: "role" }, "rowRole");
            });
        });

        (data.roles || []).forEach((role, i) => {
            add(["roles", i, "name"], role.name, "สถานะ (⚙ สถานะ)", { kind: "role" }, "role");
        });

        (data.objects || []).forEach((object, i) => {
            const label = OBJECT_LABEL[object.type] || "object";
            add(["objects", i, "text"], object.text, label, { kind: "object", id: object.id }, `object-${object.type}`);
            add(["objects", i, "detail"], object.detail, `${label} (รายละเอียด)`, { kind: "object", id: object.id }, "detail");
        });

        (data.notes || []).forEach((note, i) => {
            const where = `บันทึก${note.header ? ` "${short(note.header, 14)}"` : ""}`;
            add(["notes", i, "header"], note.header, `${where} (หัวข้อ)`, { kind: "note", id: note.id }, "noteHeader");
            add(["notes", i, "body"], note.body, `${where} (เนื้อหา)`, { kind: "note", id: note.id }, "noteBody");
        });

        (data.texts || []).forEach((box, i) => {
            add(["texts", i, "text"], box.text, "กล่อง Text", { kind: "text", id: box.id, attach: box.attach }, "text");
            add(["texts", i, "detail"], box.detail, "กล่อง Text (รายละเอียด)", { kind: "text", id: box.id, attach: box.attach }, "detail");
        });

        return fields;
    }

    function getPath(data, path) {
        return path.reduce((node, key) => (node == null ? undefined : node[key]), data);
    }

    function setPath(data, path, value) {
        const last = path[path.length - 1];
        const parent = getPath(data, path.slice(0, -1));
        if (parent && typeof parent === "object") parent[last] = value;
    }


    /* =====================================================
       ตัวตรวจ
    ===================================================== */

    const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";

    function escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function keepCase(original, replacement) {
        if (original === original.toUpperCase() && original.length > 1) return replacement.toUpperCase();
        if (original[0] === original[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
        return replacement;
    }

    function allFixes() {

        const thai = { ...THAI_FIXES };
        const en = { ...EN_FIXES };

        Object.keys(teamFixes).forEach(wrong => {
            const right = String(teamFixes[wrong]);
            if (/^[A-Za-z][A-Za-z'-]*$/.test(wrong)) en[wrong.toLowerCase()] = right;
            else thai[wrong] = right;
        });

        return { thai, en };
    }

    /* หาตำแหน่งคำผิดในข้อความ (ไม่นับกรณีที่อยู่ในคำที่ถูกอยู่แล้ว) */
    function findThai(text, wrong, right) {

        const found = [];
        const k = right.indexOf(wrong);
        let i = text.indexOf(wrong);

        while (i >= 0) {
            const inside = k >= 0 && text.substr(i - k, right.length) === right;
            if (!inside) found.push(i);
            i = text.indexOf(wrong, i + wrong.length);
        }

        return found;
    }

    function replaceThai(text, wrong, right) {
        const positions = findThai(text, wrong, right);
        let out = text;
        for (let n = positions.length - 1; n >= 0; n -= 1) {
            const i = positions[n];
            out = out.slice(0, i) + right + out.slice(i + wrong.length);
        }
        return out;
    }

    function enRegex(wrong) {
        return new RegExp(`(^|[^A-Za-z])(${escapeRegex(wrong)})(?=$|[^A-Za-z])`, "gi");
    }

    function replaceEn(text, wrong, right) {
        return text.replace(enRegex(wrong), (all, pre, word) => pre + keepCase(word, right));
    }

    function snippet(text, index, length) {
        const start = Math.max(0, index - 14);
        const end = Math.min(text.length, index + length + 14);
        return {
            before: (start > 0 ? "…" : "") + text.slice(start, index),
            hit: text.slice(index, index + length),
            after: text.slice(index + length, end) + (end < text.length ? "…" : "")
        };
    }

    function isDefault(field) {

        const value = field.value.trim();

        if (field.kind === "title") return !value || DEFAULTS.title.includes(value);
        if (field.kind === "category") return !value || DEFAULTS.category.includes(value);
        if (field.kind === "row") return !value || DEFAULTS.row.includes(value);
        if (field.kind === "object-task") return !value || DEFAULTS.object.includes(value);
        if (field.kind === "text") return !value;

        return false;
    }

    function scan() {

        const data = io.build();
        const fields = collect(data);
        const fixes = allFixes();
        const issues = [];

        const push = issue => {
            issue.key = issue.key || `${issue.type}|${issue.path.join(".")}|${issue.wrong || ""}`;
            if (!skipped.has(issue.key)) issues.push(issue);
        };

        const hasArabic = fields.some(field => /[0-9]/.test(field.value));

        /* --- 5) ยังไม่ได้กรอก --- */
        fields.forEach(field => {

            if (isDefault(field)) {
                push({ type: "empty", field, path: field.path, message: field.value.trim() ? `ยังเป็น "${short(field.value, 16)}"` : "ยังว่างอยู่" });
            }
        });

        (data.notes || []).forEach((note, i) => {
            const blank = !String(note.header || "").trim() && !String(note.body || "").trim();
            if (blank || DEFAULTS.noteHeader.includes(String(note.header).trim())) {
                const field = fields.find(item => item.path.join(".") === `notes.${i}.header`);
                if (field) push({ type: "empty", field, path: field.path, message: blank ? "การ์ดบันทึกว่าง" : `ยังเป็น "${note.header}"` });
            }
        });

        fields.forEach(field => {

            const text = field.value;

            if (!text || isDefault(field)) return;

            /* --- 2) คำผิดบ่อย --- */
            Object.keys(fixes.thai).forEach(wrong => {
                if (isIgnoredWord(wrong)) return;
                const right = fixes.thai[wrong];
                const positions = findThai(text, wrong, right);
                if (positions.length) {
                    push({ type: "dict", field, path: field.path, wrong, right, lang: "th", snip: snippet(text, positions[0], wrong.length), count: positions.length });
                }
            });

            Object.keys(fixes.en).forEach(wrong => {
                if (isIgnoredWord(wrong)) return;
                const regex = enRegex(wrong);
                const match = regex.exec(text);
                if (match) {
                    const index = match.index + match[1].length;
                    push({ type: "dict", field, path: field.path, wrong: match[2], right: keepCase(match[2], fixes.en[wrong]), lang: "en", snip: snippet(text, index, match[2].length) });
                }
            });

            /* คำผิดที่ซ้อนกัน (เช่น "เซ็นต์สัญญา" กับ "สัญญ่า") → เก็บอันที่ยาวกว่า */
            /* --- 2b) ตัวตรวจภาษาไทยด้วยพจนานุกรม --- */
            if (thai && thai.ready()) {

                thai.check(text).forEach(hit => {

                    if (isIgnoredWord(hit.wrong)) return;

                    /* พจนานุกรมคำผิดบ่อยเจอแล้ว → ไม่ซ้ำ */
                    const dup = issues.some(issue => issue.field === field && issue.type === "dict" &&
                        (issue.wrong.includes(hit.wrong) || hit.wrong.includes(issue.wrong)));
                    if (dup) return;

                    if (hit.kind === "typo") {
                        push({ type: "dict", field, path: field.path, wrong: hit.wrong, right: hit.right, lang: "th", snip: snippet(text, hit.index, hit.wrong.length) });
                    } else {
                        push({ type: "unknown", field, path: field.path, wrong: hit.wrong, snip: snippet(text, hit.index, hit.wrong.length) });
                    }
                });
            }

            dedupeDict(issues, field);

            /* --- 3) รูปแบบ --- */
            const fmt = (wrong, right, label, regex) => {
                const match = regex.exec(text);
                if (!match) return;
                push({
                    type: "format", field, path: field.path, wrong, right, label,
                    regex: regex.source, flags: regex.flags,
                    snip: snippet(text, match.index, match[0].length)
                });
            };

            fmt("  ", " ", "เว้นวรรคซ้ำ", / {2,}/g);

            if (/^\s+\S/.test(text) || /\S\s+$/.test(text.replace(/\n+$/, ""))) {
                push({ type: "format", field, path: field.path, wrong: "trim", right: "", label: "มีช่องว่างหน้า / ท้ายข้อความ", trim: true, snip: { before: "", hit: short(text, 24), after: "" } });
            }

            fmt("เเ", "แ", "พิมพ์ เ+เ แทน แ", /เเ/g);
            fmt("ํา", "ำ", "พิมพ์ ํ+า แทน ำ", /ํา/g);
            fmt("่่", "่", "วรรณยุกต์ซ้ำ", /([่-๋])\1+/g);

            THAI_REPEATS.forEach(word => {
                if (text.includes(word)) {
                    const half = word.slice(0, word.length / 2);
                    push({ type: "format", field, path: field.path, wrong: word, right: half, label: "คำซ้ำติดกัน", snip: snippet(text, text.indexOf(word), word.length), key: `format|${field.path.join(".")}|${word}` });
                }
            });

            const repeat = /(^|[^A-Za-z])([A-Za-z]{2,})\s+\2(?=$|[^A-Za-z])/i.exec(text);
            if (repeat) {
                const index = repeat.index + repeat[1].length;
                const len = repeat[0].length - repeat[1].length;
                push({ type: "format", field, path: field.path, wrong: text.substr(index, len), right: repeat[2], label: "คำซ้ำติดกัน", snip: snippet(text, index, len) });
            }

            if (hasArabic && /[๐-๙]/.test(text)) {
                const index = text.search(/[๐-๙]/);
                push({ type: "format", field, path: field.path, wrong: "thai-digits", right: "", label: "เลขไทยปนเลขอารบิก", digits: true, snip: snippet(text, index, 1) });
            }
        });

        /* --- 4) ความสม่ำเสมอ --- */
        consistency(fields).forEach(push);

        return { data, fields, issues };
    }

    function dedupeDict(issues, field) {

        const mine = issues.filter(issue => issue.type === "dict" && issue.field === field);

        mine.forEach(issue => {
            const covered = mine.some(other => other !== issue && other.wrong.length > issue.wrong.length &&
                other.wrong.toLowerCase().includes(issue.wrong.toLowerCase()));
            if (covered) issues.splice(issues.indexOf(issue), 1);
        });
    }

    function consistency(fields) {

        const issues = [];

        /* กลุ่มที่กำหนดไว้ */
        CONSIST_GROUPS.forEach(group => {

            const used = group.map(variant => ({
                variant,
                count: fields.reduce((sum, field) => sum + countThai(field.value, variant, group), 0)
            })).filter(item => item.count > 0);

            if (used.length < 2) return;

            const best = used.slice().sort((a, b) => b.count - a.count || group.indexOf(a.variant) - group.indexOf(b.variant))[0].variant;

            used.filter(item => item.variant !== best).forEach(item => {
                if (isIgnoredWord(item.variant)) return;
                issues.push({ type: "consist", path: ["*"], wrong: item.variant, right: best, group, count: item.count, label: `ใช้ "${best}" ${used.find(u => u.variant === best).count} ที่ · "${item.variant}" ${item.count} ที่`, key: `consist|${item.variant}` });
            });
        });

        /* คำภาษาอังกฤษที่เขียนต่างกัน (ตัวพิมพ์ / ขีด / จุด) */
        const map = new Map();

        fields.forEach(field => {

            if (isDefault(field) || DEFAULTS.row.includes(field.value.trim())) return;

            const regex = /[A-Za-z][A-Za-z.-]*[A-Za-z]/g;
            let match;

            while ((match = regex.exec(field.value))) {

                const word = match[0];
                const key = word.toLowerCase().replace(/[.-]/g, "");

                if (key.length < 3) continue;

                if (!map.has(key)) map.set(key, new Map());

                const variants = map.get(key);
                variants.set(word, (variants.get(word) || 0) + 1);
            }
        });

        map.forEach(variants => {

            if (variants.size < 2) return;

            /* ต่างกันแค่ตัวแรกพิมพ์ใหญ่ (ต้นประโยค) → ไม่นับ */
            const shape = word => word.slice(1);
            const distinct = new Set(Array.from(variants.keys()).map(shape));

            if (distinct.size < 2) return;

            const sorted = Array.from(variants.entries()).sort((a, b) => b[1] - a[1]);
            const best = sorted[0][0];

            sorted.slice(1).forEach(([word, count]) => {
                if (shape(word) === shape(best) || isIgnoredWord(word)) return;
                issues.push({ type: "consist", path: ["*"], wrong: word, right: best, en: true, count, label: `ใช้ "${best}" ${sorted[0][1]} ที่ · "${word}" ${count} ที่`, key: `consist|${word}` });
            });
        });

        return issues;
    }

    /* นับคำไทยในกลุ่ม (ไม่นับเมื่อเป็นส่วนหนึ่งของคำที่ยาวกว่าในกลุ่มเดียวกัน) */
    function countThai(text, variant, group) {

        if (!text) return 0;

        let count = 0;
        let i = text.indexOf(variant);

        while (i >= 0) {
            const longer = group.some(other => other.length > variant.length && other.includes(variant) &&
                text.substr(i - other.indexOf(variant), other.length) === other);
            if (!longer) count += 1;
            i = text.indexOf(variant, i + variant.length);
        }

        return count;
    }


    /* =====================================================
       แก้
    ===================================================== */

    function fixValue(issue, value) {

        if (issue.type === "dict") {
            return issue.lang === "en" ? replaceEn(value, issue.wrong, issue.right) : replaceThai(value, issue.wrong, issue.right);
        }

        if (issue.type === "format") {
            if (issue.trim) return value.replace(/^\s+/, "").replace(/\s+$/, "");
            if (issue.digits) return value.replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d)));
            if (issue.regex) {
                if (issue.wrong === "่่") return value.replace(new RegExp(issue.regex, "g"), "$1");
                return value.replace(new RegExp(issue.regex, "g"), issue.right);
            }
            return value.split(issue.wrong).join(issue.right);
        }

        if (issue.type === "consist") {
            if (issue.en) {
                return value.replace(new RegExp(`(^|[^A-Za-z.-])(${escapeRegex(issue.wrong)})(?=$|[^A-Za-z])`, "g"), (all, pre) => pre + issue.right);
            }
            return replaceGroupVariant(value, issue.wrong, issue.right, issue.group || []);
        }

        return value;
    }

    function replaceGroupVariant(text, wrong, right, group) {

        let out = "";
        let i = 0;

        while (i < text.length) {

            if (text.startsWith(wrong, i)) {

                const longer = group.some(other => other.length > wrong.length && other.includes(wrong) &&
                    text.substr(i - other.indexOf(wrong), other.length) === other);

                if (!longer) {
                    out += right;
                    i += wrong.length;
                    continue;
                }
            }

            out += text[i];
            i += 1;
        }

        return out;
    }

    function applyFixes(list) {

        if (!list.length) return 0;

        const data = io.build();
        const fields = collect(data);
        let changed = 0;

        list.forEach(issue => {

            const targets = issue.path[0] === "*" ? fields : fields.filter(field => field.path.join(".") === issue.path.join("."));

            targets.forEach(field => {
                const current = getPath(data, field.path);
                if (typeof current !== "string") return;
                const next = fixValue(issue, current);
                if (next !== current) {
                    setPath(data, field.path, next);
                    changed += 1;
                }
            });
        });

        if (changed) {
            io.apply(data);
            if (window.ZGHistory && typeof window.ZGHistory.record === "function") setTimeout(() => window.ZGHistory.record(), 0);
        }

        return changed;
    }


    /* =====================================================
       ไปที่ชิ้นนั้น
    ===================================================== */

    function flash(element) {
        if (!element) return;
        element.classList.remove("zg-spell-flash");
        void element.offsetWidth;
        element.classList.add("zg-spell-flash");
        setTimeout(() => element.classList.remove("zg-spell-flash"), 1700);
    }

    function scrollVertical(top, height) {
        if (typeof setVerticalScroll !== "function" || typeof categoryHeight !== "number") return;
        setVerticalScroll(top + (height || 0) / 2 - categoryHeight * 1.5);
    }

    function scrollTimeline(left) {
        if (typeof timelineViewport === "undefined") return;
        timelineViewport.scrollLeft = Math.max(0, left - timelineViewport.clientWidth / 3);
        if (typeof syncTimelineHeaderScroll === "function") syncTimelineHeaderScroll();
        if (typeof updateTimelineHorizontalRange === "function") updateTimelineHorizontalRange();
    }

    function goTo(loc) {

        if (!loc) return;

        if (loc.kind === "title") {
            flash(document.querySelector(".plan-header .title-box"));
            return;
        }

        if (loc.kind === "header") {
            if (window.ZGHeader && typeof window.ZGHeader.open === "function") window.ZGHeader.open();
            return;
        }

        if (loc.kind === "role") {
            const roles = document.getElementById("manageRolesBtn");
            if (roles) roles.click();
            return;
        }

        if (loc.kind === "category") {
            if (typeof categorySlotMap === "object" && categorySlotMap && categorySlotMap[loc.id]) {
                scrollVertical(categorySlotMap[loc.id].top, categorySlotMap[loc.id].height);
            }
            requestAnimationFrame(() => flash(document.querySelector(`.category[data-category-id="${CSS.escape(loc.id)}"]`)));
            return;
        }

        if (loc.kind === "row") {
            if (typeof rowSlotMap === "object" && rowSlotMap && rowSlotMap[loc.id]) {
                scrollVertical(rowSlotMap[loc.id].top, rowSlotMap[loc.id].height);
            }
            requestAnimationFrame(() => {
                const row = document.querySelector(`.party-row[data-row-id="${CSS.escape(loc.id)}"]`);
                flash(row);
                const field = row && row.querySelector(loc.part === "role" ? ".party-role" : ".party-main");
                if (field) field.focus({ preventScroll: true });
            });
            return;
        }

        if (loc.kind === "object") {

            const object = (Array.isArray(timelineObjects) ? timelineObjects : []).find(item => item.id === loc.id);
            if (!object) return;

            let left = Number(object.x) || 0;
            if ((object.type === "dateline" || object.type === "vline") && object.linkedHeaderDate && typeof dateToLeft === "function") {
                left = dateToLeft(object.linkedHeaderDate);
            }

            scrollTimeline(left);
            if (object.type === "task") scrollVertical(Number(object.y) || 0, Number(object.height) || 0);

            requestAnimationFrame(() => {
                const elements = Array.from(document.querySelectorAll(`.canvas-object[data-object-id="${CSS.escape(loc.id)}"]`));
                flash(elements.find(node => node.classList.contains("canvas-object--dateline-chip")) || elements[0]);
            });
            return;
        }

        if (loc.kind === "note") {
            const card = document.querySelector(`.note-card[data-note-id="${CSS.escape(loc.id)}"]`);
            if (card && typeof notesViewport !== "undefined") notesViewport.scrollLeft = Math.max(0, card.offsetLeft - 20);
            flash(card);
            return;
        }

        if (loc.kind === "text") {
            if (loc.attach && loc.attach.objectId) goTo({ kind: "object", id: loc.attach.objectId });
            setTimeout(() => flash(document.querySelector(`.zg-text-box[data-text-id="${CSS.escape(loc.id)}"]`)), 80);
        }
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
::highlight(zg-spell) { text-decoration: underline wavy #f08a24; text-decoration-thickness: 1.5px; text-underline-offset: 2px; background-color: rgba(240, 138, 36, .10); }

.zg-spell-flash { animation: zgSpellFlash 1.6s ease; }
@keyframes zgSpellFlash {
    0%, 60% { box-shadow: 0 0 0 3px rgba(240, 138, 36, .85); }
    100% { box-shadow: 0 0 0 3px rgba(240, 138, 36, 0); }
}

#toolbarSpellcheckBtn .zg-spell-badge {
    display: inline-block;
    min-width: 16px;
    margin-left: 5px;
    padding: 0 5px;
    border-radius: 9px;
    background: #f08a24;
    color: #ffffff;
    font: 700 10px/16px Arial, Helvetica, sans-serif;
    text-align: center;
}
#toolbarSpellcheckBtn .zg-spell-badge[hidden] { display: none; }
#toolbarSpellcheckBtn .zg-spell-badge { cursor: pointer; }
#toolbarSpellcheckBtn .zg-spell-state {
    margin-left: 6px;
    padding: 0 6px;
    border-radius: 8px;
    font: 700 9.5px/15px Arial, Helvetica, sans-serif;
}
#toolbarSpellcheckBtn.zg-spell-on .zg-spell-state { background: #e3f2d9; color: #2f6e1f; }
#toolbarSpellcheckBtn.zg-spell-off .zg-spell-state { background: #eceeed; color: #7d8781; }
#toolbarSpellcheckBtn.zg-spell-off { opacity: .75; }
#toolbarSpellcheckBtn .zg-spell-caret {
    margin-left: 4px;
    padding: 0 4px;
    border-left: 1px solid rgba(0, 0, 0, .12);
    font-size: 9px;
    opacity: .7;
    cursor: pointer;
}
#toolbarSpellcheckBtn .zg-spell-caret:hover { opacity: 1; }
#toolbarSpellcheckBtn.zg-spell-off .zg-spell-caret { display: none; }
.zg-spell-switch { position: relative; display: inline-block; width: 34px; height: 19px; margin-left: 4px; cursor: pointer; }
.zg-spell-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.zg-spell-switch span { position: absolute; inset: 0; border-radius: 10px; background: #cfd6d2; transition: background .15s ease; }
.zg-spell-switch span::before { content: ""; position: absolute; left: 2px; top: 2px; width: 15px; height: 15px; border-radius: 50%; background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, .2); transition: transform .15s ease; }
.zg-spell-switch input:checked + span { background: #7ac143; }
.zg-spell-switch input:checked + span::before { transform: translateX(15px); }
.zg-spell-loading { padding: 8px 6px; font-size: 11.5px; color: #8a948f; }

.zg-spell {
    position: fixed;
    right: 14px;
    top: 120px;
    z-index: 25500;
    width: 370px;
    max-width: calc(100vw - 28px);
    max-height: calc(100vh - 140px);
    display: flex;
    flex-direction: column;
    border: 1px solid #dfe5e1;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 18px 50px rgba(10, 30, 20, .2);
    font-family: Arial, Helvetica, sans-serif;
    color: #1e2924;
    overflow: hidden;
}
.zg-spell-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px 8px; }
.zg-spell-title { font-size: 14px; font-weight: 700; }
.zg-spell-x { margin-left: auto; width: 26px; height: 26px; border: 0; border-radius: 7px; background: #f1f4f2; cursor: pointer; }
.zg-spell-summary { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 10px; }
.zg-spell-chip { padding: 2px 8px; border-radius: 10px; background: #f1f4f2; font-size: 11px; color: #4b5550; }
.zg-spell-chip b { color: #1e2924; }
.zg-spell-chip.is-ok { background: #e8f4e1; color: #2f6e1f; }
.zg-spell-actions { display: flex; gap: 6px; padding: 0 14px 10px; }
.zg-spell-btn {
    height: 28px;
    padding: 0 10px;
    border: 1px solid #dfe5e1;
    border-radius: 8px;
    background: #ffffff;
    font: 12px Arial, Helvetica, sans-serif;
    color: #1e2924;
    cursor: pointer;
    white-space: nowrap;
}
.zg-spell-btn:hover { background: #f4f7f5; }
.zg-spell-btn.is-primary { border-color: #7ac143; background: #7ac143; color: #ffffff; font-weight: 700; }
.zg-spell-btn.is-primary:hover { background: #69ad37; }
.zg-spell-btn[disabled] { opacity: .45; cursor: default; }
.zg-spell-list { flex: 1; overflow-y: auto; padding: 0 10px 10px; border-top: 1px solid #edf1ee; }
.zg-spell-sec { margin-top: 10px; }
.zg-spell-sec > summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 4px 4px; font-size: 12px; font-weight: 700; color: #4b5550; }
.zg-spell-sec > summary::-webkit-details-marker { display: none; }
.zg-spell-sec > summary::before { content: "▸"; font-size: 10px; transition: transform .12s ease; }
.zg-spell-sec[open] > summary::before { transform: rotate(90deg); }
.zg-spell-sec > summary .n { padding: 0 6px; border-radius: 8px; background: #f1f4f2; font-size: 10px; }
.zg-spell-item {
    margin: 6px 0;
    padding: 8px 10px;
    border: 1px solid #e8ece9;
    border-radius: 10px;
    background: #fbfcfb;
}
.zg-spell-item:hover { border-color: #cfe5bf; }
.zg-spell-where { font-size: 10.5px; color: #8a948f; margin-bottom: 3px; }
.zg-spell-text { font-size: 12.5px; line-height: 1.45; word-break: break-word; white-space: pre-wrap; }
.zg-spell-text mark { background: #ffe1c2; color: #8a3b00; border-radius: 3px; padding: 0 1px; }
.zg-spell-text .to { color: #2f6e1f; font-weight: 700; }
.zg-spell-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
.zg-spell-row .zg-spell-btn { height: 24px; padding: 0 8px; font-size: 11px; }
.zg-spell-empty { padding: 24px 10px; text-align: center; color: #6f7873; font-size: 12.5px; }
.zg-spell-empty b { display: block; font-size: 26px; margin-bottom: 6px; }
.zg-spell-foot { padding: 10px 14px; border-top: 1px solid #edf1ee; background: #fafbfa; font-size: 11.5px; display: flex; flex-direction: column; gap: 6px; }
.zg-spell-foot label { display: flex; align-items: center; gap: 7px; cursor: pointer; }
.zg-spell-foot .muted { color: #8a948f; }
.zg-spell-foot a { color: #2f6e1f; cursor: pointer; text-decoration: underline; }

/* เช็กก่อนพิมพ์ */
.zg-spell-pre {
    position: fixed;
    inset: 0;
    z-index: 27500;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(28, 38, 33, .3);
    font-family: Arial, Helvetica, sans-serif;
}
.zg-spell-pre-box { width: min(400px, calc(100vw - 32px)); padding: 20px 20px 16px; border-radius: 16px; background: #ffffff; box-shadow: 0 24px 70px rgba(10, 30, 20, .28); color: #1e2924; }
.zg-spell-pre-box h3 { margin: 0 0 6px; font-size: 16px; }
.zg-spell-pre-box p { margin: 0 0 12px; font-size: 12.5px; color: #4b5550; line-height: 1.5; }
.zg-spell-pre-box .btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.zg-spell-pre-box label { font-size: 11.5px; color: #6f7873; display: flex; gap: 6px; align-items: center; }

body.zg-exporting .zg-spell, body.zg-exporting .zg-spell-pre { display: none !important; }

body.zg-dark .zg-spell, body.zg-dark .zg-spell-pre-box { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-spell-item { background: #2b3330; border-color: #3a4440; }
body.zg-dark .zg-spell-btn { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-spell-foot { background: #1f2623; border-color: #3a4440; }
body.zg-dark .zg-spell-chip { background: #2b3330; color: #c9d1cd; }
`;

    document.head.appendChild(style);


    /* =====================================================
       ปุ่มบน Toolbar + ป้ายจำนวน
    ===================================================== */

    let spellOn = true;

    try {
        spellOn = localStorage.getItem(ON_KEY) !== "off";
    } catch (error) { /* ignore */ }

    const stateTag = document.createElement("span");
    stateTag.className = "zg-spell-state";

    const badge = document.createElement("span");
    badge.className = "zg-spell-badge zg-spell-more";
    badge.hidden = true;

    const more = document.createElement("span");
    more.className = "zg-spell-caret zg-spell-more";
    more.textContent = "▾";
    more.title = "เปิดรายการตรวจคำผิด";

    button.appendChild(stateTag);
    button.appendChild(badge);
    button.appendChild(more);

    function paintButton() {
        button.classList.toggle("zg-spell-on", spellOn);
        button.classList.toggle("zg-spell-off", !spellOn);
        stateTag.textContent = spellOn ? "เปิดอยู่" : "ปิดอยู่";
        button.title = spellOn
            ? "ตรวจคำผิด: เปิดอยู่ — คลิกเพื่อปิด · ▾ = ดูรายการ"
            : "ตรวจคำผิด: ปิดอยู่ — คลิกเพื่อเปิด";
        if (!spellOn) badge.hidden = true;
    }

    function setOn(value, silent) {

        spellOn = Boolean(value);

        try { localStorage.setItem(ON_KEY, spellOn ? "on" : "off"); } catch (error) { /* ignore */ }

        paintButton();

        if (spellOn) {
            restoreBrowserSpell();
            fullScan(!silent);
        } else {
            clearTimeout(timer);
            closePanel();
            if (canHighlight) CSS.highlights.delete("zg-spell");
            pauseBrowserSpell();
        }

        if (!silent && !spellOn) toast("ตรวจคำผิด: ปิด");
    }

    /* ปิดตรวจคำผิด = ปิดเส้นหยักแดงของเบราว์เซอร์ด้วย (จำไว้ แล้วคืนค่าตอนเปิด) */
    const BROWSER_WANT_KEY = "zg-spell-browser-want-v1";

    function pauseBrowserSpell() {
        if (!browserSpellOn()) return;
        try { localStorage.setItem(BROWSER_WANT_KEY, "on"); } catch (error) { /* ignore */ }
        toggleBrowserSpell();
    }

    function restoreBrowserSpell() {
        let want = false;
        try {
            want = localStorage.getItem(BROWSER_WANT_KEY) === "on";
            localStorage.removeItem(BROWSER_WANT_KEY);
        } catch (error) { /* ignore */ }
        if (want && !browserSpellOn()) toggleBrowserSpell();
    }

    /* โหลดพจนานุกรมไทย (ถ้ายังไม่โหลด) → คืน Promise */
    function loadThai() {

        if (!thai) return Promise.resolve(false);

        thai.addWords(Array.from(myIgnore));
        thai.addWords(Array.from(teamIgnore));

        if (thai.ready()) return Promise.resolve(true);

        return thai.load().then(ok => {
            if (ok && spellOn) refresh(true);
            return ok;
        });
    }

    /* ตรวจทั้งหน้าใหม่ตั้งแต่ต้น แล้วขีดเส้นใต้คำที่ผิด + บอกผล */
    function fullScan(announce) {

        if (announce) toast("🔎 กำลังตรวจคำผิดทั้งหน้า…");

        /* ล้างผลเก่า (รวมแคชตัดคำ) */
        if (thai) thai.addWords([]);

        refresh(true);

        loadThai().then(() => {

            if (!spellOn) return;

            refresh(true);

            if (!announce) return;

            const words = last.issues.filter(isFixable).length;
            const empty = last.issues.filter(issue => issue.type === "empty").length;

            let message = words ? `ตรวจเสร็จ — พบจุดที่น่าจะผิด ${words} จุด (ขีดเส้นสีส้มไว้แล้ว)` : "ตรวจเสร็จ — ไม่พบคำผิด ✅";
            if (empty) message += ` · ยังไม่ได้กรอก ${empty} จุด`;

            toast(message);
        });
    }

    let passThrough = false;

    window.addEventListener("click", event => {

        if (passThrough || !(event.target instanceof Element) || !event.target.closest("#toolbarSpellcheckBtn")) return;

        event.preventDefault();
        event.stopPropagation();

        /* ▾ / ตัวเลข = เปิดรายการ · ส่วนอื่นของปุ่ม = เปิด / ปิดการตรวจ */
        if (event.target.closest(".zg-spell-more")) {
            if (!spellOn) setOn(true, true);
            if (panel) closePanel(); else openPanel();
            return;
        }

        if (spellOn) {
            setOn(false);
        } else {
            setOn(true);
            openPanel();
        }

    }, true);

    function browserSpellOn() {
        try {
            return localStorage.getItem(BROWSER_KEY) === "on";
        } catch (error) {
            return button.classList.contains("active");
        }
    }

    function toggleBrowserSpell() {
        passThrough = true;
        try {
            button.click();
        } finally {
            passThrough = false;
        }
    }


    /* =====================================================
       ขีดเส้นใต้คำที่น่าจะผิด (CSS Custom Highlight)
    ===================================================== */

    let highlightOn = true;

    try {
        highlightOn = localStorage.getItem(HIGHLIGHT_KEY) !== "off";
    } catch (error) { /* ignore */ }

    const canHighlight = typeof CSS !== "undefined" && CSS.highlights && typeof Highlight === "function";

    const FIELD_SELECTOR = [
        ".plan-header .title", ".plan-header .subtitle",
        ".category-name", ".party-main", ".party-role",
        ".canvas-object-label", ".dateline-chip-text", ".canvas-object-detail",
        ".note-header", ".note-body",
        ".zg-text-content", ".zg-text-detail"
    ].join(", ");

    function paintHighlights(issues) {

        if (!canHighlight) return;

        if (!highlightOn || !spellOn) {
            CSS.highlights.delete("zg-spell");
            return;
        }

        const words = new Set();

        issues.forEach(issue => {
            if (issue.type === "dict" || issue.type === "consist") words.add(issue.wrong);
            if (issue.type === "format" && ["เเ", "ํา"].includes(issue.wrong)) words.add(issue.wrong);
            if (issue.type === "format" && THAI_REPEATS.includes(issue.wrong)) words.add(issue.wrong);
        });

        const ranges = [];

        if (words.size) {

            const list = Array.from(words).filter(Boolean);

            document.querySelectorAll(FIELD_SELECTOR).forEach(element => {

                if (element.closest(".zg-spell, .toolbar, .workspace-toolbar")) return;

                const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
                let node;

                while ((node = walker.nextNode())) {

                    const text = node.nodeValue;
                    if (!text) continue;

                    list.forEach(word => {
                        let i = text.indexOf(word);
                        while (i >= 0) {
                            const range = new Range();
                            range.setStart(node, i);
                            range.setEnd(node, i + word.length);
                            ranges.push(range);
                            i = text.indexOf(word, i + word.length);
                        }
                    });
                }
            });
        }

        CSS.highlights.set("zg-spell", new Highlight(...ranges));
    }


    /* =====================================================
       แผง
    ===================================================== */

    let panel = null;
    let last = { issues: [] };

    function escapeHtml(text) {
        return String(text == null ? "" : text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function closePanel() {
        if (panel) {
            panel.remove();
            panel = null;
        }
        button.classList.remove("zg-spell-open");
    }

    function openPanel() {

        closePanel();

        panel = document.createElement("div");
        panel.className = "zg-spell";

        panel.addEventListener("mousedown", event => event.stopPropagation());
        panel.addEventListener("click", onPanelClick);
        panel.addEventListener("change", onPanelChange);

        document.body.appendChild(panel);

        button.classList.add("zg-spell-open");

        refresh(true);
    }

    function itemHtml(issue, index) {

        const where = issue.field ? issue.field.label : "ทั้งแผน";
        let body = "";
        let buttons = "";

        if (issue.type === "dict" || (issue.type === "format" && !issue.trim && !issue.digits)) {

            const s = issue.snip;
            body = `${escapeHtml(s.before)}<mark>${escapeHtml(s.hit)}</mark>${escapeHtml(s.after)}`;
            body += issue.type === "dict"
                ? ` <span class="to">→ ${escapeHtml(issue.right)}</span>`
                : `<br><span class="to">${escapeHtml(issue.label)}</span>`;

            buttons += `<button type="button" class="zg-spell-btn is-primary" data-act="fix" data-i="${index}">✓ แก้</button>`;

        } else if (issue.type === "format") {

            body = `<mark>${escapeHtml(issue.snip.hit)}</mark><br><span class="to">${escapeHtml(issue.label)}</span>`;
            buttons += `<button type="button" class="zg-spell-btn is-primary" data-act="fix" data-i="${index}">✓ แก้</button>`;

        } else if (issue.type === "consist") {

            body = `<mark>${escapeHtml(issue.wrong)}</mark> <span class="to">→ ${escapeHtml(issue.right)}</span><br><span style="color:#8a948f;font-size:11px">${escapeHtml(issue.label)}</span>`;
            buttons += `<button type="button" class="zg-spell-btn is-primary" data-act="fix" data-i="${index}">✓ เปลี่ยนทั้งแผน</button>`;

        } else if (issue.type === "empty") {

            body = escapeHtml(issue.message);

        } else if (issue.type === "unknown") {

            const s = issue.snip;
            body = `${escapeHtml(s.before)}<mark>${escapeHtml(s.hit)}</mark>${escapeHtml(s.after)}<br><span style="color:#8a948f;font-size:11px">ไม่มีในพจนานุกรม — ถ้าเป็นชื่อเฉพาะ กด 👍 คำนี้ถูก</span>`;
        }

        if (issue.field) buttons += `<button type="button" class="zg-spell-btn" data-act="go" data-i="${index}">↗ ไปที่</button>`;

        buttons += `<button type="button" class="zg-spell-btn" data-act="skip" data-i="${index}">ข้าม</button>`;

        if (issue.type === "dict" || issue.type === "consist" || issue.type === "unknown") {
            buttons += `<button type="button" class="zg-spell-btn" data-act="learn" data-i="${index}" title="จำว่าคำนี้ถูก ไม่ต้องเตือนอีก">👍 คำนี้ถูก</button>`;
        }

        return `
            <div class="zg-spell-item">
                <div class="zg-spell-where">${escapeHtml(where)}</div>
                <div class="zg-spell-text">${body}</div>
                <div class="zg-spell-row">${buttons}</div>
            </div>`;
    }

    function section(title, list, open) {
        if (!list.length) return "";
        return `
            <details class="zg-spell-sec" ${open ? "open" : ""}>
                <summary>${escapeHtml(title)} <span class="n">${list.length}</span></summary>
                ${list.map(({ issue, index }) => itemHtml(issue, index)).join("")}
            </details>`;
    }

    function renderPanel() {

        if (!panel) return;

        const issues = last.issues;
        const indexed = issues.map((issue, index) => ({ issue, index }));

        const dict = indexed.filter(item => item.issue.type === "dict");
        const format = indexed.filter(item => item.issue.type === "format");
        const consist = indexed.filter(item => item.issue.type === "consist");
        const empty = indexed.filter(item => item.issue.type === "empty");
        const unknown = indexed.filter(item => item.issue.type === "unknown");

        const fixable = dict.length + format.length + consist.length;

        const chip = (label, n) => `<span class="zg-spell-chip ${n ? "" : "is-ok"}">${escapeHtml(label)} <b>${n}</b></span>`;

        panel.innerHTML = `
            <div class="zg-spell-head">
                <span class="zg-spell-title">🔎 ตรวจคำผิด</span>
                <label class="zg-spell-switch" title="เปิด / ปิดการตรวจคำผิด"><input type="checkbox" data-opt="on" ${spellOn ? "checked" : ""}><span></span></label>
                <button type="button" class="zg-spell-x" data-act="close" title="ปิด">✕</button>
            </div>
            <div class="zg-spell-summary">
                ${chip("คำผิด", dict.length)}
                ${chip("รูปแบบ", format.length)}
                ${chip("ไม่สม่ำเสมอ", consist.length)}
                ${chip("ยังไม่ได้กรอก", empty.length)}
            </div>
            <div class="zg-spell-actions">
                <button type="button" class="zg-spell-btn is-primary" data-act="fixall" ${fixable ? "" : "disabled"}>✓ แก้ทั้งหมด (${fixable})</button>
                <button type="button" class="zg-spell-btn" data-act="rescan">↻ ตรวจใหม่</button>
            </div>
            <div class="zg-spell-list">
                ${issues.length ? "" : `<div class="zg-spell-empty"><b>✅</b>ไม่พบจุดที่น่าจะผิด</div>`}
                ${thai && !thai.ready() ? `<div class="zg-spell-loading">⏳ กำลังโหลดพจนานุกรมภาษาไทย…</div>` : ""}
                ${section("คำที่น่าจะผิด", dict, true)}
                ${section("รูปแบบการพิมพ์", format, true)}
                ${section("เขียนไม่เหมือนกันในแผน", consist, true)}
                ${section("ยังไม่ได้กรอก / ยังเป็นค่าเริ่มต้น", empty, !fixable)}
                ${section("คำที่ไม่รู้จัก (อาจเป็นชื่อเฉพาะ)", unknown, false)}
            </div>
            <div class="zg-spell-foot">
                <label><input type="checkbox" data-opt="highlight" ${highlightOn ? "checked" : ""} ${canHighlight ? "" : "disabled"}> ขีดเส้นใต้สีส้มใต้คำที่น่าจะผิด</label>
                <label><input type="checkbox" data-opt="browser" ${browserSpellOn() ? "checked" : ""}> เส้นหยักแดงของเบราว์เซอร์ (ภาษาอังกฤษ)</label>
                <span class="muted">คำที่จำว่าถูก ${myIgnore.size} คำ${myIgnore.size ? ` · <a data-act="clear-ignore">ล้าง</a>` : ""} · ข้ามไว้ ${skipped.size}${skipped.size ? ` · <a data-act="clear-skip">แสดงอีกครั้ง</a>` : ""}</span>
            </div>`;
    }

    function onPanelClick(event) {

        const target = event.target.closest("[data-act]");
        if (!target) return;

        const act = target.dataset.act;
        const issue = last.issues[Number(target.dataset.i)];

        if (act === "close") { closePanel(); return; }
        if (act === "rescan") { fullScan(false); return; }

        if (act === "fixall") {
            const list = last.issues.filter(isFixable);
            const changed = applyFixes(list);
            toast(changed ? `แก้แล้ว ${changed} จุด — กด Ctrl+Z เพื่อย้อน` : "ไม่มีอะไรต้องแก้");
            setTimeout(() => refresh(true), 60);
            return;
        }

        if (act === "clear-ignore") { myIgnore = new Set(); saveIgnore(); refresh(true); return; }
        if (act === "clear-skip") { skipped.clear(); refresh(true); return; }

        if (!issue) return;

        if (act === "fix") {
            applyFixes([issue]);
            setTimeout(() => refresh(true), 60);
        }

        if (act === "go") goTo(issue.field && issue.field.loc);

        if (act === "skip") {
            skipped.add(issue.key);
            refresh(true);
        }

        if (act === "learn") {
            myIgnore.add(String(issue.wrong).toLowerCase());
            saveIgnore();
            if (thai) thai.addWords([issue.wrong]);
            refresh(true);
        }
    }

    function onPanelChange(event) {

        const opt = event.target.dataset.opt;

        if (opt === "on") {
            setOn(event.target.checked);
            return;
        }

        if (opt === "highlight") {
            highlightOn = event.target.checked;
            try { localStorage.setItem(HIGHLIGHT_KEY, highlightOn ? "on" : "off"); } catch (error) { /* ignore */ }
            paintHighlights(last.issues);
        }

        if (opt === "browser") {
            if (event.target.checked !== browserSpellOn()) toggleBrowserSpell();
        }
    }

    function toast(message) {
        if (window.ZGImage && typeof window.ZGImage.toast === "function") window.ZGImage.toast(message);
    }


    /* =====================================================
       ตรวจซ้ำอัตโนมัติ
    ===================================================== */

    let timer = null;

    function refresh(now) {

        clearTimeout(timer);

        if (!spellOn) {
            badge.hidden = true;
            return;
        }

        const run = () => {

            if (!spellOn) return;

            try {
                last = scan();
            } catch (error) {
                console.error("[spell-plus.js]", error);
                return;
            }

            const count = last.issues.filter(isFixable).length;

            badge.hidden = !count;
            badge.textContent = count > 99 ? "99+" : String(count);

            paintHighlights(last.issues);

            /* ไม่วาดแผงใหม่ระหว่างที่ผู้ใช้กำลังพิมพ์ในแผง */
            renderPanel();
        };

        if (now) run(); else timer = setTimeout(run, 900);
    }

    document.addEventListener("input", () => refresh(false), true);
    document.addEventListener("focusout", () => refresh(false), true);

    const originalApply = io.apply;

    io.apply = function () {
        const result = originalApply.apply(this, arguments);
        refresh(false);
        return result;
    };

    if (typeof renderObjects === "function") {
        const originalRender = renderObjects;
        renderObjects = function () {
            const result = originalRender.apply(this, arguments);
            if (canHighlight && highlightOn && spellOn && last.issues.length) {
                clearTimeout(paintTimer);
                paintTimer = setTimeout(() => paintHighlights(last.issues), 120);
            }
            return result;
        };
    }

    let paintTimer = null;


    /* =====================================================
       7) เช็กก่อนพิมพ์ A3 / Export รูป
    ===================================================== */

    let askAgain = true;
    let preOpen = false;

    function preCheck(proceed) {

        let result;

        try {
            result = scan();
        } catch (error) {
            proceed();
            return;
        }

        last = result;

        const words = result.issues.filter(isFixable).length;
        const empty = result.issues.filter(issue => issue.type === "empty").length;

        if (!words && !empty) {
            proceed();
            return;
        }

        preOpen = true;

        const overlay = document.createElement("div");
        overlay.className = "zg-spell-pre";

        const parts = [];
        if (words) parts.push(`คำที่น่าจะผิด / รูปแบบ <b>${words}</b> จุด`);
        if (empty) parts.push(`ยังไม่ได้กรอก <b>${empty}</b> จุด`);

        overlay.innerHTML = `
            <div class="zg-spell-pre-box">
                <h3>🔎 ตรวจก่อนไหม?</h3>
                <p>พบ ${parts.join(" · ")}</p>
                <label><input type="checkbox" data-pre="never"> ไม่ต้องถามอีก (จนกว่าจะปิดหน้านี้)</label>
                <div class="btns">
                    <button type="button" class="zg-spell-btn" data-pre="go">ทำต่อเลย</button>
                    <button type="button" class="zg-spell-btn is-primary" data-pre="check">ตรวจก่อน</button>
                </div>
            </div>`;

        const close = () => {
            preOpen = false;
            if (overlay.querySelector("[data-pre='never']").checked) askAgain = false;
            overlay.remove();
        };

        overlay.addEventListener("click", event => {

            const target = event.target.closest("[data-pre]");

            if (event.target === overlay) { close(); return; }
            if (!target) return;

            if (target.dataset.pre === "go") { close(); proceed(); }
            if (target.dataset.pre === "check") { close(); openPanel(); }
        });

        document.body.appendChild(overlay);

        const primary = overlay.querySelector("[data-pre='check']");
        if (primary) primary.focus();
    }

    let bypass = false;

    window.addEventListener("click", event => {

        if (bypass || !spellOn || !askAgain || preOpen || !(event.target instanceof Element)) return;

        const print = event.target.closest("#printA3Btn");
        const exportItem = event.target.closest("button[data-kind][data-format]");

        if (!print && !exportItem) return;

        event.preventDefault();
        event.stopPropagation();

        const element = print || exportItem;

        preCheck(() => {
            bypass = true;
            try {
                if (exportItem && !exportItem.isConnected && window.ZGExportImage) {
                    window.ZGExportImage.exportAs(exportItem.dataset.kind, exportItem.dataset.format);
                } else {
                    element.click();
                }
            } finally {
                bypass = false;
            }
        });

    }, true);


    /* เริ่ม */
    paintButton();

    /* เปิดเว็บมาตอนปิดตรวจคำผิดอยู่ → เส้นหยักแดงของเบราว์เซอร์ต้องปิดด้วย */
    if (!spellOn) setTimeout(pauseBrowserSpell, 0);

    setTimeout(() => {
        if (spellOn) fullScan(false);
    }, 1200);

    window.ZGSpell = {
        open: openPanel,
        setOn,
        isOn: () => spellOn,
        close: closePanel,
        scan: () => scan().issues,
        fixAll: () => applyFixes(scan().issues.filter(isFixable))
    };

})();
