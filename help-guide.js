"use strict";

/* =========================================================
   HELP-GUIDE.JS — หน้า "วิธีใช้" แบบใหม่ (มีภาพเคลื่อนไหวประกอบ)
   - ปุ่ม "⌨ วิธีใช้" / กด ? / F1 → เปิดหน้านี้แทนหน้าเดิม
   - แบ่งหมวดด้านซ้าย · ค้นหาได้ · แต่ละหัวข้อมีภาพเคลื่อนไหว + ขั้นตอน + เคล็ดลับ
   - ปุ่มลัดทั้งหมด (หน้าเดิม) ยังเปิดได้จากหมวด "⌨ ปุ่มลัด"
   - ภาพประกอบวาดด้วย SVG + CSS ในไฟล์นี้ (ไม่ต้องมีไฟล์รูปเพิ่ม)
     ผู้ใช้ที่ตั้งค่าเครื่องให้ "ลดการเคลื่อนไหว" จะเห็นภาพนิ่ง
   - ไม่แก้ app.js / style.css — โหลดหลัง help-shortcuts.js
========================================================= */

(function () {

    if (window.ZG_PREVIEW_MODE) return;

    const oldHelp = window.ZGHelp || null;


    /* =====================================================
       ภาพประกอบ (SVG 260 × 150)
    ===================================================== */

    const C = {
        green: "#3a8a4f", greenSoft: "#e5f0e9", line: "#d6ddd9", grid: "#eef1ef",
        ink: "#26302b", mute: "#8a948f", red: "#d0342c", purple: "#8e44ad",
        blue: "#4a90d9", orange: "#f2a541", pink: "#e86fa8", yellow: "#f2d14b"
    };

    /* พื้นตารางเล็ก ๆ: หัววันที่ + แถว */
    function board(options = {}) {
        const rows = options.rows || 3;
        const top = options.top || 26;
        const h = options.h || 30;
        let s = `<rect x="0" y="0" width="260" height="150" rx="10" fill="#ffffff"/>`;
        s += `<rect x="0" y="0" width="260" height="20" fill="#f6f8f7"/>`;
        for (let i = 0; i < 13; i += 1) {
            const x = 10 + i * 19;
            s += `<text x="${x + 9}" y="14" font-size="7" text-anchor="middle" fill="${C.mute}">${i + 1}</text>`;
            s += `<line x1="${x}" y1="20" x2="${x}" y2="${top + rows * h}" stroke="${C.grid}"/>`;
        }
        for (let r = 0; r <= rows; r += 1) {
            s += `<line x1="0" y1="${top + r * h}" x2="260" y2="${top + r * h}" stroke="${r === 0 ? "#c9d1cd" : C.grid}"/>`;
        }
        if (options.bracket) {
            s += `<rect x="0" y="${options.bracket}" width="260" height="${150 - options.bracket}" fill="#fafbfa" stroke="${C.line}"/>`;
            s += `<text x="6" y="${options.bracket + 11}" font-size="6.5" fill="${C.mute}">ช่องเส้นวันที่</text>`;
        }
        return s;
    }

    function cursor(cls, x = 0, y = 0) {
        return `<g class="${cls}"><g transform="translate(${x} ${y})">
            <path d="M0 0 L0 15 L4 11 L7 18 L10 17 L7 10 L12 10 Z" fill="#1e2924" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>
        </g></g>`;
    }

    function svg(body, extra = "") {
        return `<svg viewBox="0 0 260 150" class="zg-hg-svg ${extra}" aria-hidden="true">${body}</svg>`;
    }

    const ART = {

        layout: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <g class="hg-zone hg-z1"><rect x="6" y="6" width="248" height="16" rx="4" fill="${C.greenSoft}"/><text x="130" y="17" font-size="8" text-anchor="middle" fill="${C.green}">แถบเครื่องมือ</text></g>
            <g class="hg-zone hg-z2"><rect x="6" y="26" width="110" height="16" rx="8" fill="#fff" stroke="${C.green}"/><text x="61" y="37" font-size="7.5" text-anchor="middle" fill="${C.ink}">หัวกระดาน</text></g>
            <g class="hg-zone hg-z3"><rect x="6" y="46" width="44" height="58" fill="#cfd8d3"/><text x="28" y="78" font-size="7" text-anchor="middle" fill="${C.ink}">หมวดหมู่</text></g>
            <g class="hg-zone hg-z4"><rect x="52" y="46" width="202" height="58" fill="#f6f8f7" stroke="${C.line}"/>
                <rect x="70" y="54" width="50" height="14" rx="3" fill="${C.blue}"/><rect x="130" y="74" width="70" height="14" rx="3" fill="${C.orange}"/>
                <text x="225" y="100" font-size="7" text-anchor="end" fill="${C.mute}">ตาราง</text></g>
            <g class="hg-zone hg-z5"><rect x="52" y="106" width="202" height="18" fill="#fafbfa" stroke="${C.line}"/><text x="153" y="118" font-size="7" text-anchor="middle" fill="${C.mute}">ช่องเส้นวันที่</text></g>
            <g class="hg-zone hg-z6"><rect x="6" y="128" width="248" height="16" rx="4" fill="#f0f3f1"/><text x="130" y="139" font-size="7" text-anchor="middle" fill="${C.mute}">บันทึกท้ายกระดาน</text></g>`),

        taskAdd: () => svg(`${board()}
            <g class="hg-pop"><rect x="196" y="-2" width="56" height="18" rx="6" fill="${C.green}" transform="translate(0 4)"/><text x="224" y="15" font-size="8" text-anchor="middle" fill="#fff" font-weight="700">＋ งาน</text></g>
            <g class="hg-appear"><rect class="hg-grow" x="48" y="30" width="60" height="22" rx="5" fill="${C.blue}"/><text x="56" y="44" font-size="8" fill="#fff">งานใหม่</text></g>
            ${cursor("hg-cur-add", 0, 0)}`),

        taskMove: () => svg(`${board()}
            <g class="hg-move"><rect x="40" y="31" width="64" height="22" rx="5" fill="${C.orange}"/><text x="49" y="45" font-size="8" fill="#fff">ส่งเอกสาร</text></g>
            <rect class="hg-ghost" x="40" y="31" width="64" height="22" rx="5" fill="none" stroke="${C.orange}" stroke-dasharray="3 2"/>
            ${cursor("hg-cur-move", 70, 42)}`),

        taskResize: () => svg(`${board()}
            <rect class="hg-stretch" x="40" y="61" width="60" height="22" rx="5" fill="${C.pink}"/>
            <text x="48" y="75" font-size="8" fill="#fff">ชำระเงิน</text>
            <rect class="hg-edge" x="96" y="61" width="4" height="22" rx="2" fill="#ffffff" opacity=".8"/>
            ${cursor("hg-cur-resize", 98, 72)}`),

        taskType: () => svg(`${board()}
            <rect x="40" y="31" width="120" height="24" rx="5" fill="${C.green}"/>
            <clipPath id="hgTypeClip"><rect class="hg-typing" x="48" y="34" width="0" height="18"/></clipPath>
            <text x="48" y="47" font-size="9" fill="#fff" clip-path="url(#hgTypeClip)">ยื่นเอกสารที่ดิน</text>
            <rect class="hg-caret" x="48" y="37" width="1.5" height="12" fill="#fff"/>
            <g class="hg-click"><circle cx="100" cy="43" r="9" fill="none" stroke="${C.yellow}" stroke-width="2"/></g>
            ${cursor("hg-cur-type", 100, 43)}`),

        taskColor: () => svg(`${board()}
            <rect class="hg-recolor" x="30" y="31" width="90" height="24" rx="5" fill="${C.blue}"/>
            <text x="40" y="46" font-size="8.5" fill="#fff">ทำสัญญา</text>
            <rect x="150" y="30" width="100" height="78" rx="8" fill="#fff" stroke="${C.line}"/>
            <text x="158" y="43" font-size="7" fill="${C.mute}">สี</text>
            ${[C.blue, C.pink, C.orange, C.green, C.purple].map((c, i) => `<circle cx="${163 + i * 17}" cy="55" r="6" fill="${c}" class="${i === 1 ? "hg-pick" : ""}"/>`).join("")}
            <text x="158" y="77" font-size="7" fill="${C.mute}">ความโปร่งใส</text>
            <rect x="160" y="85" width="80" height="4" rx="2" fill="#e3e8e5"/>
            <circle class="hg-slider" cx="164" cy="87" r="5" fill="${C.green}"/>`),

        dateEdit: () => svg(`${board()}
            <rect x="40" y="31" width="80" height="22" rx="5" fill="${C.orange}"/>
            <g class="hg-dbl"><circle cx="80" cy="42" r="8" fill="none" stroke="${C.yellow}" stroke-width="2"/><circle cx="80" cy="42" r="13" fill="none" stroke="${C.yellow}" stroke-width="1.5"/></g>
            <g class="hg-appear2"><rect x="60" y="62" width="150" height="42" rx="7" fill="#fff" stroke="${C.line}"/>
                <text x="70" y="77" font-size="7.5" fill="${C.mute}">วันเริ่ม</text><rect x="70" y="81" width="60" height="14" rx="3" fill="#f3f6f4"/><text x="76" y="91" font-size="7.5" fill="${C.ink}">03/02/2026</text>
                <text x="140" y="77" font-size="7.5" fill="${C.mute}">วันจบ</text><rect x="140" y="81" width="60" height="14" rx="3" fill="#f3f6f4"/><text x="146" y="91" font-size="7.5" fill="${C.ink}">18/02/2026</text></g>
            ${cursor("hg-cur-dbl", 80, 42)}`),

        dateline: () => svg(`${board({ rows: 2, bracket: 96 })}
            <g class="hg-day"><circle cx="133" cy="10" r="7" fill="none" stroke="${C.red}" stroke-width="1.5"/></g>
            <line class="hg-drop" x1="133" y1="20" x2="133" y2="122" stroke="${C.red}" stroke-width="2" stroke-dasharray="4 3"/>
            <g class="hg-chip"><path d="M127 122 L139 122 L133 115 Z" fill="${C.red}"/><rect x="103" y="122" width="60" height="22" rx="5" fill="#fff" stroke="${C.red}" stroke-dasharray="3 2"/><text x="133" y="133" font-size="7" text-anchor="middle" fill="${C.ink}">เซ็นสัญญา</text><text x="133" y="141" font-size="5.5" text-anchor="middle" fill="${C.mute}">7 ก.พ. 2569</text></g>
            ${cursor("hg-cur-day", 133, 9)}`),

        hline: () => svg(`${board({ rows: 2, bracket: 92 })}
            <line x1="60" y1="20" x2="60" y2="150" stroke="${C.red}" stroke-width="2" stroke-dasharray="4 3"/>
            <line x1="200" y1="20" x2="200" y2="150" stroke="${C.purple}" stroke-width="2" stroke-dasharray="4 3"/>
            <rect class="hg-hstretch" x="60" y="116.5" width="60" height="3" rx="1.5" fill="${C.red}"/>
            <circle class="hg-snap" cx="200" cy="118" r="7" fill="none" stroke="${C.yellow}" stroke-width="2.5"/>
            <text x="130" y="112" font-size="7" text-anchor="middle" fill="${C.red}" class="hg-appear3">60 วัน</text>
            ${cursor("hg-cur-hline", 120, 118)}`),

        textBox: () => svg(`${board()}
            <rect x="30" y="61" width="80" height="22" rx="5" fill="${C.blue}"/><text x="38" y="75" font-size="8" fill="#fff">ประชุมลูกค้า</text>
            <g class="hg-tmove"><rect x="150" y="100" width="70" height="18" rx="3" fill="#fff" stroke="${C.blue}" stroke-dasharray="3 2"/><text x="156" y="112" font-size="8" fill="${C.ink}" font-weight="700">ออนไลน์</text>
                <g class="hg-magnet"><rect x="203" y="86" width="16" height="12" rx="3" fill="${C.greenSoft}" stroke="${C.green}"/><text x="211" y="95" font-size="7.5" text-anchor="middle">🧲</text></g></g>
            <rect class="hg-target" x="27" y="58" width="86" height="28" rx="7" fill="none" stroke="${C.orange}" stroke-width="2" stroke-dasharray="4 3"/>
            ${cursor("hg-cur-text", 185, 110)}`),

        textStyle: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <g transform="translate(40 18)"><rect width="180" height="24" rx="7" fill="#fff" stroke="${C.line}"/>
                ${["A−", "14", "A+", "↺", "B", "•", "A→"].map((t, i) => `<g class="hg-btn hg-btn${i}"><rect x="${6 + i * 24.5}" y="4" width="21" height="16" rx="4" fill="#f4f7f5"/><text x="${16.5 + i * 24.5}" y="15.5" font-size="8" text-anchor="middle" fill="${C.ink}" font-weight="700">${t}</text></g>`).join("")}</g>
            <g transform="translate(40 60)"><rect width="180" height="70" rx="8" fill="#fafbfa" stroke="${C.line}"/>
                <text class="hg-styled" x="90" y="40" text-anchor="middle" fill="${C.ink}">ตัวอย่างข้อความ</text></g>`),

        textRotate: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="40" y="20" width="60" height="110" rx="6" fill="#f2c4b5"/>
            <g class="hg-rot"><text x="70" y="78" font-size="10" text-anchor="middle" fill="${C.ink}" font-weight="700">แนวตั้ง</text></g>
            <rect x="130" y="40" width="100" height="26" rx="6" fill="#fff" stroke="${C.line}"/>
            <text x="180" y="57" font-size="10" text-anchor="middle" fill="${C.ink}">A→  หมุนข้อความ</text>
            <text x="180" y="90" font-size="8" text-anchor="middle" fill="${C.mute}">แนวนอน → ↓ → ↑</text>`),

        catText: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="30" y="20" width="110" height="110" rx="4" fill="#e3a07e"/>
            <text class="hg-cat" x="85" y="78" font-size="11" text-anchor="middle" fill="#fff" font-weight="700">Payment</text>
            <g transform="translate(160 35)">
                ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<rect class="hg-cell hg-cell${i}" x="${(i % 3) * 26}" y="${Math.floor(i / 3) * 26}" width="22" height="22" rx="4" fill="#fff" stroke="${C.line}"/>`).join("")}
                <text x="37" y="96" font-size="7" text-anchor="middle" fill="${C.mute}">ตำแหน่งข้อความ</text></g>`),

        image: () => svg(`${board()}
            <g class="hg-file"><rect x="190" y="96" width="34" height="42" rx="4" fill="#fff" stroke="${C.line}"/><path d="M196 128 L204 116 L210 124 L214 119 L220 128 Z" fill="${C.green}"/><circle cx="214" cy="108" r="3" fill="${C.orange}"/></g>
            <g class="hg-imgin"><rect x="60" y="34" width="70" height="46" rx="4" fill="#dbe9df"/><path d="M66 74 L84 52 L98 66 L108 58 L124 74 Z" fill="${C.green}"/><circle cx="112" cy="46" r="5" fill="${C.orange}"/>
                ${["60 34", "130 34", "60 80", "130 80"].map(p => `<circle cx="${p.split(" ")[0]}" cy="${p.split(" ")[1]}" r="3.5" fill="#fff" stroke="${C.green}" stroke-width="1.5"/>`).join("")}</g>
            ${cursor("hg-cur-file", 207, 117)}`),

        sticker: () => svg(`${board({ rows: 2, bracket: 92 })}
            <rect x="196" y="24" width="58" height="62" rx="8" fill="#fff" stroke="${C.line}"/>
            <text x="225" y="35" font-size="6.5" text-anchor="middle" fill="${C.mute}">แปะรูป</text>
            <circle cx="212" cy="52" r="9" fill="${C.yellow}"/><circle cx="238" cy="52" r="9" fill="${C.pink}"/><circle cx="212" cy="74" r="9" fill="${C.blue}"/><circle cx="238" cy="74" r="9" fill="${C.green}"/>
            <g class="hg-stk"><circle cx="212" cy="52" r="11" fill="${C.yellow}" stroke="#fff" stroke-width="2"/><text x="212" y="56" font-size="10" text-anchor="middle">★</text></g>
            ${cursor("hg-cur-stk", 214, 54)}`),

        crop: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="50" y="20" width="160" height="110" rx="4" fill="#dbe9df"/>
            <path d="M60 120 L110 60 L140 95 L165 75 L200 120 Z" fill="${C.green}"/><circle cx="170" cy="45" r="10" fill="${C.orange}"/>
            <rect class="hg-cropbox" x="50" y="20" width="160" height="110" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="6 4"/>
            <text x="130" y="145" font-size="7.5" text-anchor="middle" fill="${C.mute}">ดับเบิลคลิกรูป หรือกด ✂</text>`),

        marquee: () => svg(`${board()}
            <g class="hg-group"><rect x="44" y="31" width="50" height="20" rx="4" fill="${C.blue}"/><rect x="70" y="61" width="60" height="20" rx="4" fill="${C.pink}"/><rect x="100" y="91" width="44" height="20" rx="4" fill="${C.orange}"/>
                <rect class="hg-selglow" x="40" y="27" width="108" height="88" rx="6" fill="none" stroke="${C.green}" stroke-width="1.5"/></g>
            <rect class="hg-marq" x="36" y="24" width="0" height="0" fill="rgba(58,138,79,.10)" stroke="${C.green}" stroke-dasharray="4 3"/>
            ${cursor("hg-cur-marq", 36, 24)}`),

        presetSave: () => svg(`${board()}
            <rect x="34" y="31" width="44" height="20" rx="4" fill="${C.blue}"/><rect x="58" y="61" width="54" height="20" rx="4" fill="${C.pink}"/>
            <rect x="30" y="27" width="86" height="58" rx="6" fill="rgba(58,138,79,.08)" stroke="${C.green}" stroke-dasharray="4 3"/>
            <g class="hg-star"><rect x="150" y="28" width="96" height="20" rx="6" fill="${C.yellow}"/><text x="198" y="41" font-size="8" text-anchor="middle" font-weight="700" fill="#5a4400">⭐ บันทึกเป็นชุด</text></g>
            <g class="hg-card"><rect x="160" y="62" width="76" height="56" rx="8" fill="#fff" stroke="${C.line}"/><rect x="168" y="70" width="30" height="10" rx="2" fill="${C.blue}"/><rect x="180" y="84" width="40" height="10" rx="2" fill="${C.pink}"/><text x="198" y="111" font-size="7" text-anchor="middle" fill="${C.ink}">ชุดของฉัน</text></g>`),

        presetPlace: () => svg(`${board()}
            <g class="hg-card2"><rect x="186" y="96" width="62" height="46" rx="7" fill="#fff" stroke="${C.line}"/><rect x="192" y="103" width="24" height="8" rx="2" fill="${C.blue}"/><rect x="202" y="114" width="34" height="8" rx="2" fill="${C.pink}"/><text x="217" y="135" font-size="6.5" text-anchor="middle" fill="${C.ink}">⭐ ชุดสำเร็จ</text></g>
            <g class="hg-placed"><rect x="54" y="31" width="44" height="20" rx="4" fill="${C.blue}"/><rect x="78" y="61" width="54" height="20" rx="4" fill="${C.pink}"/></g>
            ${cursor("hg-cur-place", 215, 120)}`),

        template: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="12" y="14" width="96" height="122" rx="8" fill="#fff" stroke="${C.line}"/>
            <text x="22" y="29" font-size="8" font-weight="700" fill="${C.ink}">📋 เทมเพลต</text>
            ${["ซื้อที่ดิน", "เช่าโกดัง", "ขายโรงงาน", "สัญญาเช่า"].map((t, i) => `<g class="hg-tpl hg-tpl${i}"><rect x="18" y="${36 + i * 22}" width="84" height="18" rx="4" fill="#f6f8f7"/><text x="24" y="${48 + i * 22}" font-size="7.5" fill="${C.ink}">${t}</text><text x="96" y="${48 + i * 22}" font-size="7" text-anchor="end">👁</text></g>`).join("")}
            <g class="hg-tplpeek"><rect x="118" y="24" width="132" height="96" rx="8" fill="#fff" stroke="${C.line}"/>
                <rect x="126" y="32" width="116" height="10" rx="5" fill="${C.greenSoft}"/>
                <rect x="126" y="48" width="24" height="44" fill="#cfd8d3"/><rect x="154" y="50" width="30" height="8" rx="2" fill="${C.blue}"/><rect x="172" y="62" width="46" height="8" rx="2" fill="${C.orange}"/><rect x="190" y="74" width="40" height="8" rx="2" fill="${C.pink}"/>
                <rect x="190" y="100" width="52" height="14" rx="5" fill="${C.green}"/><text x="216" y="110" font-size="6.5" text-anchor="middle" fill="#fff" font-weight="700">ใช้เทมเพลตนี้</text></g>
            ${cursor("hg-cur-tpl", 60, 66)}`),

        exportImg: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <g transform="translate(20 22)"><rect width="100" height="106" rx="4" fill="#f6f8f7" stroke="${C.line}"/>
                <rect class="hg-space" x="0" y="0" width="100" height="22" fill="#fde2e2"/><rect class="hg-space" x="0" y="84" width="100" height="22" fill="#fde2e2"/>
                <rect x="8" y="30" width="84" height="46" fill="#fff" stroke="${C.line}"/><rect x="14" y="36" width="30" height="8" rx="2" fill="${C.blue}"/><rect x="40" y="50" width="40" height="8" rx="2" fill="${C.orange}"/></g>
            <text x="134" y="78" font-size="16" fill="${C.green}">➜</text>
            <g class="hg-out" transform="translate(160 40)"><rect width="84" height="64" rx="4" fill="#fff" stroke="${C.green}" stroke-width="1.5"/>
                <rect x="6" y="8" width="72" height="48" fill="#fff" stroke="${C.line}"/><rect x="12" y="14" width="26" height="8" rx="2" fill="${C.blue}"/><rect x="34" y="28" width="36" height="8" rx="2" fill="${C.orange}"/>
                <text x="42" y="78" font-size="7.5" text-anchor="middle" fill="${C.green}" font-weight="700">PNG · PDF</text></g>`),

        printA3: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <g class="hg-printer" transform="translate(70 70)"><rect width="120" height="44" rx="8" fill="#5f6a64"/><rect x="20" y="-6" width="80" height="8" rx="2" fill="#3f4843"/><circle cx="104" cy="14" r="3" fill="#8fe0a8"/></g>
            <g class="hg-paper"><rect x="88" y="20" width="84" height="60" rx="2" fill="#fff" stroke="${C.line}"/><text x="130" y="34" font-size="8" text-anchor="middle" fill="${C.mute}">A3</text>
                <rect x="96" y="40" width="68" height="30" fill="#f6f8f7"/><rect x="100" y="44" width="24" height="6" rx="2" fill="${C.blue}"/><rect x="118" y="54" width="36" height="6" rx="2" fill="${C.orange}"/></g>`),

        backup: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <g transform="translate(16 46)"><rect width="70" height="46" rx="4" fill="#3f4843"/><rect x="5" y="5" width="60" height="34" rx="2" fill="#dbe9df"/><rect x="-6" y="46" width="82" height="6" rx="3" fill="#5f6a64"/><text x="35" y="70" font-size="7" text-anchor="middle" fill="${C.mute}">เครื่องนี้</text></g>
            <g transform="translate(174 46)"><rect width="70" height="46" rx="4" fill="#3f4843"/><rect x="5" y="5" width="60" height="34" rx="2" fill="#e8eef9"/><rect x="-6" y="46" width="82" height="6" rx="3" fill="#5f6a64"/><text x="35" y="70" font-size="7" text-anchor="middle" fill="${C.mute}">เครื่องอื่น</text></g>
            <g class="hg-fly"><rect x="112" y="52" width="30" height="36" rx="3" fill="#fff" stroke="${C.green}" stroke-width="1.5"/><text x="127" y="74" font-size="7" text-anchor="middle" fill="${C.green}" font-weight="700">.json</text></g>
            <path d="M96 40 Q130 14 164 40" fill="none" stroke="${C.line}" stroke-dasharray="3 3"/>`),

        tabs: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <g transform="translate(20 22)"><rect width="100" height="70" rx="6" fill="#f6f8f7" stroke="${C.line}"/><rect width="50" height="12" rx="4" fill="${C.greenSoft}"/><text x="25" y="9" font-size="6.5" text-anchor="middle" fill="${C.green}">แท็บ 1</text><rect x="12" y="24" width="50" height="10" rx="2" fill="${C.blue}"/><rect class="hg-edit" x="22" y="40" width="40" height="10" rx="2" fill="${C.pink}"/></g>
            <g transform="translate(140 22)"><rect width="100" height="70" rx="6" fill="#f6f8f7" stroke="${C.line}"/><rect width="50" height="12" rx="4" fill="#eceff0"/><text x="25" y="9" font-size="6.5" text-anchor="middle" fill="${C.mute}">แท็บ 2 (เก่า)</text><rect x="12" y="24" width="50" height="10" rx="2" fill="${C.blue}"/>
                <g class="hg-warn"><rect x="6" y="44" width="88" height="20" rx="5" fill="#fff4e5" stroke="#f0b45a"/><text x="50" y="57" font-size="6.5" text-anchor="middle" fill="#5a3b00">⚠ ↻ โหลดล่าสุด</text></g></g>
            <text x="130" y="122" font-size="8" text-anchor="middle" fill="${C.ink}">ทำงานทีละแท็บ — แท็บเก่าจะหยุดบันทึกเอง</text>`),

        keys: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            ${[["Ctrl", 30, 40, 44], ["Z", 80, 40, 26], ["Ctrl", 130, 40, 44], ["Y", 180, 40, 26], ["Shift", 30, 86, 52], ["←", 88, 86, 26], ["→", 118, 86, 26], ["Delete", 156, 86, 60]].map(([k, x, y, w], i) => `
                <g class="hg-key hg-key${i}"><rect x="${x}" y="${y}" width="${w}" height="26" rx="5" fill="#fff" stroke="#cfd6d2"/><rect x="${x}" y="${y + 22}" width="${w}" height="4" rx="2" fill="#cfd6d2"/><text x="${x + w / 2}" y="${y + 17}" font-size="9" text-anchor="middle" font-weight="700" fill="${C.ink}">${k}</text></g>`).join("")}
            <text x="130" y="134" font-size="7.5" text-anchor="middle" fill="${C.mute}">ย้อนกลับ · ทำซ้ำ · เลื่อนวัน · ลบ</text>`),

        save: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="70" y="30" width="120" height="30" rx="15" fill="${C.greenSoft}"/>
            <text class="hg-saved" x="130" y="49" font-size="10" text-anchor="middle" fill="${C.green}" font-weight="700">✓ บันทึกแล้ว 10:42</text>
            <g class="hg-spin"><circle cx="130" cy="98" r="18" fill="none" stroke="${C.greenSoft}" stroke-width="5"/><path d="M130 80 A18 18 0 0 1 148 98" fill="none" stroke="${C.green}" stroke-width="5" stroke-linecap="round"/></g>
            <text x="130" y="134" font-size="7.5" text-anchor="middle" fill="${C.mute}">บันทึกอัตโนมัติทุก 3 วินาที (ในเบราว์เซอร์นี้)</text>`)
    };


    /* =====================================================
       เนื้อหา: หมวด → หัวข้อ
    ===================================================== */

    const CATEGORIES = [
        {
            id: "start", icon: "🚀", name: "เริ่มต้นใช้งาน", color: "#3a8a4f",
            intro: "รู้จักหน้าตาโปรแกรม และขั้นตอนทำแผนแบบเร็วที่สุด",
            topics: [
                { title: "หน้าตาโปรแกรม", art: "layout",
                  steps: ["แถบเครื่องมือด้านบน — เพิ่มงาน เส้น ข้อความ รูป เทมเพลต Export", "หัวกระดาน — ชื่อแผน / ลูกค้า / โลโก้", "ซ้าย = หมวดหมู่ + ผู้เกี่ยวข้อง · ขวา = ตารางเวลา", "ล่างตาราง = ช่องเส้นวันที่ · ล่างสุด = บันทึกท้ายกระดาน"],
                  tip: "เส้นขอบเขียวที่กระพริบในภาพ คือโซนที่กำลังอธิบาย" },
                { title: "ทำแผนแรกใน 4 ขั้น", art: "taskAdd",
                  steps: ["เลือกเทมเพลต 📋 หรือเริ่มแผนว่าง", "ตั้งวันเริ่ม–วันสิ้นสุดของตาราง", "กด ＋ งาน แล้วลากวางให้ตรงวัน", "กด ↑ Export เพื่อส่ง PNG / PDF ให้ลูกค้า"],
                  tip: "ทุกอย่างบันทึกอัตโนมัติ ไม่ต้องกดเซฟ" },
                { title: "บันทึกอัตโนมัติ", art: "save",
                  steps: ["ทุกการแก้ไขบันทึกเองภายใน 3 วินาที", "ดูสถานะได้ที่ป้าย ✓ บันทึกแล้ว บนแถบเครื่องมือ", "สลับ / สร้าง / ลบแผนได้ที่ช่องชื่อแผนมุมซ้ายบน"],
                  tip: "ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้ — ย้ายเครื่องดูหมวด 💾" }
            ]
        },
        {
            id: "task", icon: "📦", name: "กล่องงาน", color: "#4a90d9",
            intro: "เพิ่ม ย้าย ยืด พิมพ์ และแต่งสีกล่องงานในตาราง",
            topics: [
                { title: "เพิ่มกล่องงาน", art: "taskAdd",
                  steps: ["กด ＋ งาน บนแถบเครื่องมือ", "ตั้งชื่อ / วันที่ / สถานะ ในหน้าต่างที่ขึ้นมา", "กดตกลง → กล่องไปอยู่ในตาราง"] },
                { title: "ย้ายไปวันอื่น / แถวอื่น", art: "taskMove",
                  steps: ["กดค้างที่กล่องแล้วลาก", "ปล่อยตรงวันและแถวที่ต้องการ", "หรือกด ← → เลื่อนทีละวัน · ↑ ↓ ย้ายแถว"],
                  keys: [["←", "→"], ["↑", "↓"]] },
                { title: "ยืด / หด ระยะเวลา", art: "taskResize",
                  steps: ["เอาเมาส์ไปที่ขอบซ้ายหรือขวาของกล่อง", "ลากออก = นานขึ้น · ลากเข้า = สั้นลง", "หรือ Shift + ← → ปรับวันจบ"],
                  keys: [["Shift", "← →"]] },
                { title: "พิมพ์ข้อความในกล่อง", art: "taskType",
                  steps: ["คลิกกล่อง 1 ครั้ง = เลือก", "คลิกซ้ำ = เริ่มพิมพ์", "Enter = เสร็จ · Shift+Enter = ขึ้นบรรทัดใหม่ · Esc = ยกเลิก"],
                  tip: "ลากตัวหนังสือในกล่องเพื่อย้ายตำแหน่งข้อความได้" },
                { title: "สี & ความโปร่งใส", art: "taskColor",
                  steps: ["คลิกกล่อง → เมนูแท็บ \"ทั่วไป\"", "เลือกสี หรือใช้สีตามสถานะ", "เลื่อนแถบ \"ความโปร่งใส\" — โปร่งแค่พื้น ตัวหนังสือยังชัด"] },
                { title: "แก้วันที่เป็นตัวเลข", art: "dateEdit",
                  steps: ["ดับเบิลคลิกที่กล่องงาน", "พิมพ์วันเริ่ม / วันจบ", "กดตกลง กล่องจะยืดไปตามวันที่"] }
            ]
        },
        {
            id: "line", icon: "📏", name: "เส้นวันที่ & เส้นช่วงเวลา", color: "#d0342c",
            intro: "ปักหมุดวันสำคัญ และแสดงระยะเวลาระหว่างวัน",
            topics: [
                { title: "เส้นวันที่ / เส้นแนวตั้ง", art: "dateline",
                  steps: ["กด ＋ เส้นวันที่ หรือคลิกเลขวันที่บนหัวตาราง", "เส้นจะอยู่กลางช่องของวันนั้น พร้อมป้ายในช่องเส้นวันที่", "ลากเส้น / ป้าย เพื่อเปลี่ยนวัน · คลิก = เมนูปรับแต่ง"],
                  tip: "เส้นช่วงที่อยู่ในช่องเส้นวันที่ ลากหรือคลิกได้เหมือนกัน" },
                { title: "เส้นแนวนอน (ช่วงเวลา)", art: "hline",
                  steps: ["กด ＋ เส้นแนวนอน", "ลากปลายเส้นไปใกล้เส้นวันที่ หรือเส้นแนวตั้ง → ดูดติดเอง", "ย้ายเส้นวันที่ทีหลัง ปลายเส้นแนวนอนยืดตามให้"] }
            ]
        },
        {
            id: "text", icon: "🔤", name: "ข้อความ & ตัวอักษร", color: "#8e44ad",
            intro: "กล่อง Text อิสระ แม่เหล็ก และการแต่งตัวอักษรทุกช่อง",
            topics: [
                { title: "กล่อง Text + แม่เหล็ก", art: "textBox",
                  steps: ["กด ＋ Text แล้วพิมพ์", "ลากกล่องเข้าใกล้งาน / เส้น / รูป → ขอบส้มกระพริบ", "กด 🧲 = ติดกัน ย้าย object แล้ว Text ตามไปด้วย"],
                  tip: "ติดแล้วปุ่ม 🧲 จะซ่อน — ชี้ตรงตำแหน่งปุ่มเพื่อปลด" },
                { title: "ขนาด ตัวหนา จุดหน้าประโยค", art: "textStyle",
                  steps: ["คลิกช่องที่พิมพ์ได้ → แถบเล็กขึ้นด้านบน", "A− / A+ = ขนาด · B = ตัวหนา · • = จุดหน้าประโยค", "ใช้ได้ทุกช่อง: กล่องงาน Text หมวดหมู่ แถว บันทึก หัวกระดาน"],
                  keys: [["Ctrl", "B"], ["Ctrl", "Shift", "8"], ["Ctrl", "Shift", "> <"]] },
                { title: "หมุนข้อความแนวตั้ง", art: "textRotate",
                  steps: ["คลิกช่องที่พิมพ์ได้", "กด A→ วนไป: แนวนอน → แนวตั้ง ↓ → แนวตั้ง ↑"] },
                { title: "ข้อความในหมวดหมู่", art: "catText",
                  steps: ["กด ⋮ ที่ช่องหมวดหมู่", "เลือกตำแหน่ง 9 จุด (มุม / ขอบ / กลาง)", "ปรับขนาด A− A+ และตัวหนา B ในเมนูเดียวกัน"] }
            ]
        },
        {
            id: "image", icon: "🖼", name: "รูปภาพ & สติ๊กเกอร์", color: "#f2a541",
            intro: "ใส่รูป โลโก้ สติ๊กเกอร์ และครอบตัด",
            topics: [
                { title: "วางรูปในตาราง", art: "image",
                  steps: ["ลากไฟล์รูปจากเครื่องมาวางบนตาราง", "หรือคัดลอกรูปแล้วกด Ctrl+V", "ลากมุม = ย่อขยาย · แถบเครื่องมือ = ชั้นหน้า/หลัง กรอบ ล็อก"],
                  keys: [["Ctrl", "V"]] },
                { title: "สติ๊กเกอร์ (แปะรูป)", art: "sticker",
                  steps: ["กด 🏷 แปะรูป ▾", "คลิกรูป = แปะกลางตาราง · ลาก = วางตรงไหนก็ได้", "ลากลงช่องเส้นวันที่ได้ด้วย — สติ๊กเกอร์อยู่บนสุดเสมอ"] },
                { title: "ครอบตัดรูป", art: "crop",
                  steps: ["ดับเบิลคลิกรูป หรือกด ✂ ในแถบเครื่องมือรูป", "ลากกรอบให้เหลือส่วนที่ต้องการ", "กดตกลง"] }
            ]
        },
        {
            id: "select", icon: "🧩", name: "เลือกหลายชิ้น", color: "#2e8b57",
            intro: "เลือก ย้าย คัดลอก ทีละหลายชิ้น",
            topics: [
                { title: "ลากคลุม → ย้ายทั้งกลุ่ม", art: "marquee",
                  steps: ["กดค้างที่ที่ว่างในตาราง แล้วลากเป็นกรอบ", "ทุกชิ้นในกรอบถูกเลือก (งาน เส้น Text รูป)", "ลากชิ้นไหนก็ได้ = ย้ายทั้งกลุ่ม · Delete = ลบทั้งหมด"],
                  keys: [["Shift", "คลิก"], ["Ctrl", "C"], ["Ctrl", "V"]] }
            ]
        },
        {
            id: "reuse", icon: "⭐", name: "ชุดสำเร็จ & เทมเพลต", color: "#d4a20a",
            intro: "เก็บของที่ใช้บ่อยไว้วางซ้ำ — ชิ้นส่วน (ชุดสำเร็จ) หรือทั้งแผน (เทมเพลต)",
            topics: [
                { title: "บันทึกชุดสำเร็จ", art: "presetSave",
                  steps: ["ลากคลุม object ที่ใช้บ่อย", "กด ⭐ ชุดสำเร็จ ▾ → ＋ บันทึกที่เลือกเป็นชุด", "ตั้งชื่อ — ตัวหนา / ขนาดตัวอักษร เก็บไปด้วย"] },
                { title: "วางชุดสำเร็จ", art: "presetPlace",
                  steps: ["เปิด ⭐ ชุดสำเร็จ", "คลิกการ์ด = วางตรงช่วงที่เห็น · ลากการ์ด = วางตรงวันที่ปล่อย", "วางแล้วติดเป็นกลุ่ม · Alt+คลิก = เลือกชิ้นเดียว"] },
                { title: "เทมเพลต (ทั้งแผน)", art: "template",
                  steps: ["📋 เทมเพลต → ชี้ชื่อ = ดูภาพตัวอย่าง · 👁 = ขนาดจริง", "คลิกชื่อ = ใช้เทมเพลต (สร้างแผนใหม่ / แทนที่)", "＋ บันทึกแผนนี้เป็นเทมเพลต · ⬆ Export = แผนล่าสุด"],
                  tip: "ให้ทุกเครื่องเห็น: วางไฟล์ในโฟลเดอร์ templates/ หรือ presets/ แล้ว push" }
            ]
        },
        {
            id: "export", icon: "📤", name: "Export & พิมพ์", color: "#2f7442",
            intro: "ส่งแผนให้ลูกค้า เป็นรูป PDF หรือพิมพ์ A3",
            topics: [
                { title: "Export PNG / PDF", art: "exportImg",
                  steps: ["กด ↑ Export → เลือก PNG หรือ PDF", "ดูตัวอย่าง · ตั้งชื่อไฟล์ · แบ่งหน้าตามเดือนได้", "\"พื้นที่ว่าง\": ตัดขอบบน-ล่าง · ขยายเต็มหน้า · ระยะขอบ"],
                  tip: "ส่วนสีแดงในภาพ = พื้นที่ว่างที่ถูกตัดออก" },
                { title: "พิมพ์ A3", art: "printA3",
                  steps: ["กด 🖨 พิมพ์ A3", "เลือกพอดี 1 หน้า หรือแบ่งหลายหน้า", "ตั้งพื้นที่ว่าง / ระยะขอบ แล้วสั่งพิมพ์"] }
            ]
        },
        {
            id: "data", icon: "💾", name: "บันทึก & ย้ายเครื่อง", color: "#5f6a64",
            intro: "ข้อมูลอยู่ที่ไหน และย้ายไปเครื่องอื่นยังไงไม่ให้หาย",
            topics: [
                { title: "ย้ายแผนไปเครื่องอื่น", art: "backup",
                  steps: ["↑ Export → 🗄 สำรอง = ทุกแผนในไฟล์เดียว", "เครื่องใหม่: ↓ Import หรือลากไฟล์ .json มาวาง", "เทมเพลต / ชุดของทีม: วางไฟล์ในโฟลเดอร์ templates/ presets/ แล้ว push ขึ้นเว็บ"],
                  tip: "แผน เทมเพลต ชุดของฉัน ที่บันทึกในเบราว์เซอร์ ไม่ย้ายตามไปเอง" },
                { title: "เปิดหลายแท็บ", art: "tabs",
                  steps: ["ควรเปิดแผนทีละแท็บ", "ถ้ามีอีกแท็บบันทึกงาน แท็บเก่าจะหยุดบันทึก และขึ้นแถบ ⚠", "กด ↻ โหลดล่าสุด แล้วทำงานต่อ"] }
            ]
        },
        {
            id: "keys", icon: "⌨", name: "ปุ่มลัด", color: "#26302b",
            intro: "ปุ่มลัดที่ใช้บ่อย — กด ? หรือ F1 เปิดหน้านี้ได้ทุกเมื่อ",
            topics: [
                { title: "ปุ่มลัดที่ใช้บ่อย", art: "keys",
                  steps: [], keyTable: [
                    [["Ctrl", "Z"], "ย้อนกลับ"], [["Ctrl", "Y"], "ทำซ้ำ"], [["Ctrl", "K"], "ค้นหางาน / คำสั่ง"],
                    [["Delete"], "ลบที่เลือก"], [["Ctrl", "C"], "คัดลอก"], [["Ctrl", "V"], "วาง"], [["Ctrl", "D"], "ทำสำเนา"],
                    [["← →"], "เลื่อนทีละวัน"], [["Shift", "← →"], "ยืด/หด วันจบ"], [["↑ ↓"], "ย้ายแถว"],
                    [["Space", "ลาก"], "เลื่อนตาราง"], [["Esc"], "ปิดเมนู / เลิกเลือก"], [["T"], "เปิด/ปิดเส้นวันนี้"]
                  ], more: true }
            ]
        }
    ];


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.zg-hg {
    position: fixed; inset: 0; z-index: 27500; display: flex; align-items: center; justify-content: center;
    padding: 18px; box-sizing: border-box; background: rgba(20, 32, 26, .42);
    -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
    font-family: inherit; color: #1e2924; animation: zgHgFade .18s ease;
}
@keyframes zgHgFade { from { opacity: 0; } }
.zg-hg__box {
    width: min(1100px, 100%); height: min(720px, calc(100vh - 36px)); display: grid;
    grid-template-columns: 240px 1fr; border-radius: 20px; overflow: hidden; background: #ffffff;
    box-shadow: 0 30px 80px rgba(10, 30, 20, .35); animation: zgHgRise .25s cubic-bezier(.2,.9,.3,1.2);
}
@keyframes zgHgRise { from { transform: translateY(14px) scale(.98); opacity: 0; } }

.zg-hg__side { background: linear-gradient(180deg, #f3f8f5, #eaf2ed); padding: 18px 12px; overflow-y: auto; border-right: 1px solid #e1e8e4; }
.zg-hg__brand { display: flex; align-items: center; gap: 9px; padding: 0 8px 14px; }
.zg-hg__logo { width: 34px; height: 34px; border-radius: 10px; background: #3a8a4f; color: #fff; display: grid; place-items: center; font-size: 18px; box-shadow: 0 4px 10px rgba(58,138,79,.35); }
.zg-hg__brand b { font-size: 15px; display: block; }
.zg-hg__brand small { color: #7a857f; font-size: 11px; }
.zg-hg__search {
    width: 100%; box-sizing: border-box; height: 34px; margin: 0 0 12px; padding: 0 12px 0 30px; border-radius: 10px;
    border: 1px solid #d5ded9; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238a948f' stroke-width='2.5'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-3.5-3.5'/%3E%3C/svg%3E") no-repeat 10px center;
    font: inherit; font-size: 12.5px; outline: none;
}
.zg-hg__search:focus { border-color: #3a8a4f; box-shadow: 0 0 0 3px rgba(58,138,79,.15); }
.zg-hg__nav { display: flex; flex-direction: column; gap: 3px; }
.zg-hg__cat {
    display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; border: 0; border-radius: 11px;
    background: transparent; font: inherit; font-size: 13px; color: #2c3631; text-align: left; cursor: pointer;
    transition: background .15s, transform .15s;
}
.zg-hg__cat:hover { background: rgba(255,255,255,.75); transform: translateX(2px); }
.zg-hg__cat.is-on { background: #ffffff; box-shadow: 0 3px 12px rgba(30,60,40,.10); font-weight: 700; }
.zg-hg__cat i { font-style: normal; width: 28px; height: 28px; flex: none; display: grid; place-items: center; border-radius: 9px; font-size: 15px; background: var(--c, #3a8a4f)22; background: color-mix(in srgb, var(--c, #3a8a4f) 15%, white); }
.zg-hg__cat em { margin-left: auto; font-style: normal; font-size: 10.5px; color: #8a948f; font-weight: 400; }

.zg-hg__main { display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow: hidden; }
.zg-hg__box > * { min-height: 0; }
.zg-hg__head { display: flex; align-items: center; gap: 12px; padding: 18px 24px 12px; border-bottom: 1px solid #eef2f0; }
.zg-hg__head h2 { margin: 0; font-size: 20px; display: flex; align-items: center; gap: 10px; }
.zg-hg__head h2 span { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; font-size: 19px; background: color-mix(in srgb, var(--c, #3a8a4f) 16%, white); }
.zg-hg__head p { margin: 2px 0 0; color: #77827c; font-size: 12.5px; }
.zg-hg__close { margin-left: auto; width: 34px; height: 34px; border-radius: 10px; border: 1px solid #dde3e0; background: #fff; font-size: 15px; cursor: pointer; flex: none; }
.zg-hg__close:hover { background: #f3f6f4; }
.zg-hg__body { flex: 1 1 auto; min-height: 0; overflow-y: scroll; padding: 18px 24px 24px; scroll-behavior: smooth; overscroll-behavior: contain;
    scrollbar-width: auto; scrollbar-color: #9fb3a8 #eef2f0; }
.zg-hg__body::-webkit-scrollbar, .zg-hg__side::-webkit-scrollbar { width: 12px; }
.zg-hg__body::-webkit-scrollbar-track, .zg-hg__side::-webkit-scrollbar-track { background: #eef2f0; border-radius: 10px; }
.zg-hg__body::-webkit-scrollbar-thumb, .zg-hg__side::-webkit-scrollbar-thumb { background: #a9bcb2; border-radius: 10px; border: 3px solid #eef2f0; }
.zg-hg__body::-webkit-scrollbar-thumb:hover { background: #3a8a4f; }
body.zg-dark .zg-hg__body::-webkit-scrollbar-track { background: #232b28; }
body.zg-dark .zg-hg__body::-webkit-scrollbar-thumb { background: #4a5752; border-color: #232b28; }
.zg-hg__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; }

.zg-hg__card {
    border: 1px solid #e5ebe8; border-radius: 16px; background: #fff; overflow: hidden;
    box-shadow: 0 2px 8px rgba(20,40,30,.04); transition: transform .18s, box-shadow .18s;
    animation: zgHgCard .35s ease both;
}
.zg-hg__card:hover { transform: translateY(-3px); box-shadow: 0 12px 26px rgba(20,40,30,.10); }
@keyframes zgHgCard { from { opacity: 0; transform: translateY(10px); } }
.zg-hg__art { background: linear-gradient(135deg, color-mix(in srgb, var(--c, #3a8a4f) 10%, #f8fbf9), #f4f7f5); padding: 14px 18px 10px; }
.zg-hg-svg { display: block; width: 100%; height: auto; border-radius: 10px; box-shadow: 0 4px 14px rgba(20,40,30,.08); }
.zg-hg__content { padding: 12px 16px 14px; }
.zg-hg__content h3 { margin: 0 0 8px; font-size: 14.5px; }
.zg-hg__steps { margin: 0; padding: 0; list-style: none; counter-reset: s; }
.zg-hg__steps li { counter-increment: s; position: relative; padding: 3px 0 5px 28px; font-size: 12.5px; line-height: 1.5; color: #2f3a34; }
.zg-hg__steps li::before {
    content: counter(s); position: absolute; left: 0; top: 3px; width: 19px; height: 19px; border-radius: 50%;
    background: var(--c, #3a8a4f); color: #fff; font-size: 10.5px; font-weight: 700; display: grid; place-items: center;
}
.zg-hg__tip { margin-top: 8px; padding: 7px 10px; border-radius: 9px; background: #fff8e1; color: #6b5200; font-size: 11.5px; line-height: 1.45; }
.zg-hg__tip::before { content: "💡 "; }
.zg-hg__keys { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.zg-hg kbd {
    display: inline-block; min-width: 18px; padding: 2px 7px; border: 1px solid #cfd6d2; border-bottom-width: 3px;
    border-radius: 7px; background: #fff; font: 700 11px/1.5 Arial, Helvetica, sans-serif; color: #1e2924; text-align: center; white-space: nowrap;
}
.zg-hg__combo { display: inline-flex; gap: 3px; align-items: center; padding: 3px 6px; background: #f4f7f5; border-radius: 9px; }
.zg-hg__ktable { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; align-items: center; font-size: 12.5px; }
.zg-hg__more { margin-top: 12px; height: 32px; padding: 0 14px; border-radius: 9px; border: 1px solid #3a8a4f; background: #fff; color: #2f7442; font: inherit; font-weight: 700; cursor: pointer; }
.zg-hg__more:hover { background: #eef6f0; }
.zg-hg__empty { padding: 50px 20px; text-align: center; color: #8a948f; }
.zg-hg__hit { background: #fff1a8; border-radius: 3px; }
.zg-hg__foot { display: flex; align-items: center; gap: 14px; padding: 10px 24px; border-top: 1px solid #eef2f0; color: #7a857f; font-size: 11.5px; }
.zg-hg__foot label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: #2f3a34; }
.zg-hg__nextbtn { margin-left: auto; height: 30px; padding: 0 14px; border: 0; border-radius: 9px; background: #3a8a4f; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
.zg-hg__nextbtn:hover { background: #2f7442; }

/* ---------- ภาพเคลื่อนไหว ---------- */
.zg-hg-svg * { transform-box: fill-box; }
.zg-hg-svg text { font-family: Arial, Helvetica, sans-serif; }
.zg-hg-svg .hg-zone { animation: hgZone 9s infinite; opacity: .55; }
.zg-hg-svg .hg-z1 { animation-delay: 0s; } .zg-hg-svg .hg-z2 { animation-delay: 1.5s; } .zg-hg-svg .hg-z3 { animation-delay: 3s; }
.zg-hg-svg .hg-z4 { animation-delay: 4.5s; } .zg-hg-svg .hg-z5 { animation-delay: 6s; } .zg-hg-svg .hg-z6 { animation-delay: 7.5s; }
@keyframes hgZone { 0%, 18% { opacity: 1; filter: drop-shadow(0 0 3px #3a8a4f); } 22%, 100% { opacity: .55; filter: none; } }

.zg-hg-svg .hg-pop { animation: hgPop 4s infinite; transform-origin: center; }
@keyframes hgPop { 0%, 15% { transform: scale(1); } 20% { transform: scale(.9); } 25%, 100% { transform: scale(1); } }
.zg-hg-svg .hg-appear { animation: hgAppear 4s infinite; }
@keyframes hgAppear { 0%, 24% { opacity: 0; transform: translateY(-6px); } 32%, 92% { opacity: 1; transform: none; } 100% { opacity: 0; } }
.zg-hg-svg .hg-grow { animation: hgGrow 4s infinite; transform-origin: left center; }
@keyframes hgGrow { 0%, 50% { transform: scaleX(1); } 75%, 92% { transform: scaleX(1.9); } 100% { transform: scaleX(1); } }
.zg-hg-svg .hg-cur-add { animation: hgCurAdd 4s infinite; }
@keyframes hgCurAdd { 0% { transform: translate(150px, 60px); } 15% { transform: translate(222px, 8px); } 30% { transform: translate(222px, 8px); } 48% { transform: translate(106px, 40px); } 75%, 92% { transform: translate(160px, 40px); } 100% { transform: translate(150px, 60px); } }

.zg-hg-svg .hg-move { animation: hgMove 3.6s infinite; }
@keyframes hgMove { 0%, 15% { transform: none; } 55%, 85% { transform: translate(95px, 30px); } 100% { transform: none; } }
.zg-hg-svg .hg-ghost { animation: hgGhost 3.6s infinite; }
@keyframes hgGhost { 0%, 15% { opacity: 0; } 20%, 55% { opacity: .8; } 60%, 100% { opacity: 0; } }
.zg-hg-svg .hg-cur-move { animation: hgMove 3.6s infinite; }

.zg-hg-svg .hg-stretch { animation: hgStretch 3.4s infinite; transform-origin: left center; }
@keyframes hgStretch { 0%, 15% { transform: scaleX(1); } 55%, 85% { transform: scaleX(2.2); } 100% { transform: scaleX(1); } }
.zg-hg-svg .hg-edge, .zg-hg-svg .hg-cur-resize { animation: hgEdge 3.4s infinite; }
@keyframes hgEdge { 0%, 15% { transform: none; } 55%, 85% { transform: translateX(72px); } 100% { transform: none; } }

.zg-hg-svg .hg-typing { animation: hgType 4s steps(16) infinite; }
@keyframes hgType { 0%, 30% { width: 0; } 80%, 95% { width: 110px; } 100% { width: 0; } }
.zg-hg-svg .hg-caret { animation: hgCaret 4s infinite; }
@keyframes hgCaret { 0%, 30% { transform: none; opacity: 1; } 80% { transform: translateX(78px); } 82%, 86% { opacity: 0; transform: translateX(78px); } 88%, 95% { opacity: 1; transform: translateX(78px); } 100% { transform: none; } }
.zg-hg-svg .hg-click { animation: hgClick 4s infinite; transform-origin: center; }
@keyframes hgClick { 0%, 8% { opacity: 0; transform: scale(.4); } 12% { opacity: 1; transform: scale(1); } 18% { opacity: 0; transform: scale(1.4); } 22% { opacity: 0; transform: scale(.4); } 26% { opacity: 1; transform: scale(1); } 32%, 100% { opacity: 0; transform: scale(1.4); } }
.zg-hg-svg .hg-cur-type { animation: hgCurType 4s infinite; }
@keyframes hgCurType { 0% { transform: translate(40px, 30px); } 10%, 32% { transform: none; } 40%, 100% { transform: translate(60px, 40px); opacity: .0; } }

.zg-hg-svg .hg-recolor { animation: hgRecolor 4s infinite; }
@keyframes hgRecolor { 0%, 30% { fill: #4a90d9; opacity: 1; } 35%, 60% { fill: #e86fa8; opacity: 1; } 80%, 95% { fill: #e86fa8; opacity: .45; } 100% { fill: #4a90d9; opacity: 1; } }
.zg-hg-svg .hg-pick { animation: hgPick 4s infinite; transform-origin: center; }
@keyframes hgPick { 0%, 25% { transform: scale(1); } 30% { transform: scale(1.5); } 40%, 100% { transform: scale(1); } }
.zg-hg-svg .hg-slider { animation: hgSlide 4s infinite; }
@keyframes hgSlide { 0%, 60% { transform: none; } 80%, 95% { transform: translateX(52px); } 100% { transform: none; } }

.zg-hg-svg .hg-dbl { animation: hgDbl 4s infinite; transform-origin: center; }
@keyframes hgDbl { 0%, 10% { opacity: 0; transform: scale(.5); } 15% { opacity: 1; transform: scale(1); } 20% { opacity: 0; } 24% { opacity: 1; transform: scale(1); } 32%, 100% { opacity: 0; transform: scale(1.4); } }
.zg-hg-svg .hg-appear2 { animation: hgAppear2 4s infinite; }
@keyframes hgAppear2 { 0%, 30% { opacity: 0; transform: translateY(8px); } 40%, 92% { opacity: 1; transform: none; } 100% { opacity: 0; } }
.zg-hg-svg .hg-cur-dbl { animation: hgCurDbl 4s infinite; }
@keyframes hgCurDbl { 0% { transform: translate(40px, 40px); } 12%, 100% { transform: none; } }

.zg-hg-svg .hg-day { animation: hgClick 4s infinite; transform-origin: center; }
.zg-hg-svg .hg-drop { stroke-dasharray: 4 3; animation: hgDrop 4s infinite; transform-origin: top; }
@keyframes hgDrop { 0%, 25% { transform: scaleY(0); } 50%, 92% { transform: scaleY(1); } 100% { transform: scaleY(0); } }
.zg-hg-svg .hg-chip { animation: hgChip 4s infinite; }
@keyframes hgChip { 0%, 48% { opacity: 0; transform: translateY(8px); } 58%, 92% { opacity: 1; transform: none; } 100% { opacity: 0; } }
.zg-hg-svg .hg-cur-day { animation: hgCurDay 4s infinite; }
@keyframes hgCurDay { 0% { transform: translate(-60px, 50px); } 15%, 30% { transform: none; } 45%, 100% { transform: translate(30px, 40px); } }

.zg-hg-svg .hg-hstretch { animation: hgH 3.6s infinite; }
@keyframes hgH { 0%, 15% { width: 60px; } 55%, 90% { width: 140px; } 100% { width: 60px; } }
.zg-hg-svg .hg-cur-hline { animation: hgCurH 3.6s infinite; }
@keyframes hgCurH { 0%, 15% { transform: none; } 55%, 90% { transform: translateX(80px); } 100% { transform: none; } }
.zg-hg-svg .hg-snap { animation: hgSnap 3.6s infinite; transform-origin: center; }
@keyframes hgSnap { 0%, 45% { opacity: 0; transform: scale(.5); } 55% { opacity: 1; transform: scale(1.2); } 70%, 100% { opacity: 0; transform: scale(1.8); } }
.zg-hg-svg .hg-appear3 { animation: hgAppear3 3.6s infinite; }
@keyframes hgAppear3 { 0%, 55% { opacity: 0; } 65%, 90% { opacity: 1; } 100% { opacity: 0; } }

.zg-hg-svg .hg-tmove, .zg-hg-svg .hg-cur-text { animation: hgTMove 4.4s infinite; }
@keyframes hgTMove { 0%, 10% { transform: none; } 45%, 92% { transform: translate(-112px, -30px); } 100% { transform: none; } }
.zg-hg-svg .hg-target { animation: hgTarget 4.4s infinite; }
@keyframes hgTarget { 0%, 30% { opacity: 0; } 35%, 45% { opacity: 1; } 40% { opacity: .3; } 55%, 100% { opacity: 0; } }
.zg-hg-svg .hg-magnet { animation: hgMag 4.4s infinite; transform-origin: center; }
@keyframes hgMag { 0%, 45% { opacity: 1; transform: scale(1); } 52% { transform: scale(1.4); } 60%, 70% { opacity: 1; transform: scale(1); } 78%, 95% { opacity: 0; } 100% { opacity: 1; } }

.zg-hg-svg .hg-styled { animation: hgStyled 5s infinite; font-size: 12px; }
@keyframes hgStyled { 0%, 15% { font-size: 12px; font-weight: 400; } 30%, 45% { font-size: 17px; font-weight: 400; } 55%, 92% { font-size: 17px; font-weight: 700; } 100% { font-size: 12px; } }
.zg-hg-svg .hg-btn2 { animation: hgBtn 5s infinite; } .zg-hg-svg .hg-btn4 { animation: hgBtn 5s 1.3s infinite; }
@keyframes hgBtn { 0%, 15% { opacity: 1; } 18% { opacity: .35; } 24%, 100% { opacity: 1; } }

.zg-hg-svg .hg-rot { animation: hgRot 4.5s infinite; transform-origin: center; }
@keyframes hgRot { 0%, 25% { transform: rotate(0deg); } 35%, 60% { transform: rotate(90deg); } 70%, 92% { transform: rotate(-90deg); } 100% { transform: rotate(0deg); } }

.zg-hg-svg .hg-cat { animation: hgCat 9s infinite; }
@keyframes hgCat {
    0%, 9% { transform: translate(-28px, -40px); } 11%, 20% { transform: translate(0, -40px); }
    22%, 31% { transform: translate(26px, -40px); } 33%, 42% { transform: translate(-28px, 0); } 44%, 53% { transform: none; }
    55%, 64% { transform: translate(26px, 0); } 66%, 75% { transform: translate(-28px, 40px); } 77%, 86% { transform: translate(0, 40px); }
    88%, 100% { transform: translate(26px, 40px); } }
${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `.zg-hg-svg .hg-cell${i} { animation: hgCell 9s ${i}s infinite; }`).join("\n")}
@keyframes hgCell { 0%, 10% { fill: #e5f0e9; stroke: #3a8a4f; } 11.1%, 100% { fill: #ffffff; stroke: #d6ddd9; } }

.zg-hg-svg .hg-file, .zg-hg-svg .hg-cur-file { animation: hgFile 4s infinite; }
@keyframes hgFile { 0%, 10% { transform: none; opacity: 1; } 45% { transform: translate(-112px, -60px); opacity: 1; } 52%, 100% { transform: translate(-112px, -60px); opacity: 0; } }
.zg-hg-svg .hg-imgin { animation: hgImg 4s infinite; transform-origin: center; }
@keyframes hgImg { 0%, 45% { opacity: 0; transform: scale(.6); } 55%, 92% { opacity: 1; transform: scale(1); } 100% { opacity: 0; } }

.zg-hg-svg .hg-stk, .zg-hg-svg .hg-cur-stk { animation: hgStk 4s infinite; }
@keyframes hgStk { 0%, 10% { transform: none; } 55%, 92% { transform: translate(-120px, 66px); } 100% { transform: none; } }

.zg-hg-svg .hg-cropbox { animation: hgCrop 4s infinite; }
@keyframes hgCrop { 0%, 15% { x: 50px; y: 20px; width: 160px; height: 110px; } 55%, 90% { x: 95px; y: 30px; width: 100px; height: 80px; } 100% { x: 50px; y: 20px; width: 160px; height: 110px; } }

.zg-hg-svg .hg-marq { animation: hgMarq 4.4s infinite; }
@keyframes hgMarq { 0%, 8% { width: 0; height: 0; opacity: 1; } 40% { width: 116px; height: 94px; opacity: 1; } 46%, 100% { width: 116px; height: 94px; opacity: 0; } }
.zg-hg-svg .hg-cur-marq { animation: hgCurMarq 4.4s infinite; }
@keyframes hgCurMarq { 0%, 8% { transform: none; } 40% { transform: translate(116px, 94px); } 50% { transform: translate(70px, 60px); } 80%, 92% { transform: translate(130px, 70px); } 100% { transform: none; } }
.zg-hg-svg .hg-selglow { animation: hgSel 4.4s infinite; }
@keyframes hgSel { 0%, 42% { opacity: 0; } 46%, 92% { opacity: 1; } 100% { opacity: 0; } }
.zg-hg-svg .hg-group { animation: hgGroup 4.4s infinite; }
@keyframes hgGroup { 0%, 50% { transform: none; } 80%, 92% { transform: translate(60px, 10px); } 100% { transform: none; } }

.zg-hg-svg .hg-star { animation: hgPop 4s infinite; transform-origin: center; }
.zg-hg-svg .hg-card { animation: hgCard 4s infinite; }
@keyframes hgCard { 0%, 25% { opacity: 0; transform: translate(-80px, -10px) scale(.6); } 45%, 92% { opacity: 1; transform: none; } 100% { opacity: 0; } }

.zg-hg-svg .hg-card2, .zg-hg-svg .hg-cur-place { animation: hgCard2 4s infinite; }
@keyframes hgCard2 { 0%, 10% { transform: none; opacity: 1; } 45% { transform: translate(-140px, -70px); opacity: .9; } 52%, 100% { transform: translate(-140px, -70px); opacity: 0; } }
.zg-hg-svg .hg-placed { animation: hgImg 4s infinite; }

.zg-hg-svg .hg-cur-tpl { animation: hgCurTpl 6s infinite; }
@keyframes hgCurTpl { 0% { transform: translate(0, -20px); } 15%, 40% { transform: none; } 55%, 85% { transform: translate(150px, 46px); } 100% { transform: translate(0, -20px); } }
.zg-hg-svg .hg-tpl1 rect { animation: hgTplRow 6s infinite; }
@keyframes hgTplRow { 0%, 12% { fill: #f6f8f7; } 15%, 90% { fill: #e5f0e9; } 100% { fill: #f6f8f7; } }
.zg-hg-svg .hg-tplpeek { animation: hgPeek 6s infinite; }
@keyframes hgPeek { 0%, 18% { opacity: 0; transform: translateX(-10px); } 26%, 92% { opacity: 1; transform: none; } 100% { opacity: 0; } }

.zg-hg-svg .hg-space { animation: hgSpace 4s infinite; transform-origin: center; }
@keyframes hgSpace { 0%, 25% { opacity: 1; transform: scaleY(1); } 50%, 100% { opacity: 0; transform: scaleY(0); } }
.zg-hg-svg .hg-out { animation: hgOut 4s infinite; }
@keyframes hgOut { 0%, 45% { opacity: 0; transform: translate(160px, 50px) scale(.8); } 60%, 92% { opacity: 1; transform: translate(160px, 40px); } 100% { opacity: 0; transform: translate(160px, 40px); } }

.zg-hg-svg .hg-paper { animation: hgPaper 4s infinite; }
@keyframes hgPaper { 0% { transform: translateY(50px); opacity: 0; } 15% { opacity: 1; } 60%, 92% { transform: none; opacity: 1; } 100% { transform: none; opacity: 0; } }

.zg-hg-svg .hg-fly { animation: hgFly 3.6s infinite; }
@keyframes hgFly { 0% { transform: translate(-70px, 0); opacity: 0; } 15% { opacity: 1; } 50% { transform: translate(0, -26px); } 85% { transform: translate(70px, 0); opacity: 1; } 100% { transform: translate(70px, 0); opacity: 0; } }

.zg-hg-svg .hg-edit { animation: hgPick 3s infinite; transform-origin: center; }
.zg-hg-svg .hg-warn { animation: hgWarn 3s infinite; }
@keyframes hgWarn { 0%, 30% { opacity: 0; transform: translateY(6px); } 40%, 92% { opacity: 1; transform: none; } 100% { opacity: 0; } }

${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `.zg-hg-svg .hg-key${i} { animation: hgKey 4s ${(i * 0.45).toFixed(2)}s infinite; }`).join("\n")}
@keyframes hgKey { 0%, 6% { transform: none; } 9% { transform: translateY(3px); } 14%, 100% { transform: none; } }

.zg-hg-svg .hg-saved { animation: hgSaved 3s infinite; }
@keyframes hgSaved { 0%, 70% { opacity: 1; } 80% { opacity: .3; } 100% { opacity: 1; } }
.zg-hg-svg .hg-spin { animation: hgSpin 1.4s linear infinite; transform-origin: center; }
@keyframes hgSpin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
    .zg-hg *, .zg-hg-svg * { animation: none !important; transition: none !important; }
}

/* ---------- ธีมมืด ---------- */
body.zg-dark .zg-hg__box { background: #1d2421; color: #e3e9e5; }
body.zg-dark .zg-hg__side { background: linear-gradient(180deg, #232c28, #1f2723); border-color: #313b37; }
body.zg-dark .zg-hg__cat { color: #d8e0dc; }
body.zg-dark .zg-hg__cat.is-on, body.zg-dark .zg-hg__cat:hover { background: #2c3632; }
body.zg-dark .zg-hg__search, body.zg-dark .zg-hg__close { background-color: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-hg__head, body.zg-dark .zg-hg__foot { border-color: #2f3935; }
body.zg-dark .zg-hg__card { background: #232b28; border-color: #333d39; }
body.zg-dark .zg-hg__steps li { color: #d8e0dc; }
body.zg-dark .zg-hg kbd { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-hg__combo { background: #2b3330; }
body.zg-dark .zg-hg__tip { background: #3a3220; color: #f2d27a; }
body.zg-dark .zg-hg__foot label { color: #d8e0dc; }
body.zg-exporting .zg-hg { display: none !important; }

/* ---------- จอเล็ก ---------- */
@media (max-width: 760px) {
    .zg-hg { padding: 0; }
    .zg-hg__box { grid-template-columns: 1fr; grid-template-rows: auto 1fr; height: 100vh; border-radius: 0; }
    .zg-hg__side { padding: 10px; border-right: 0; border-bottom: 1px solid #e1e8e4; }
    .zg-hg__brand { display: none; }
    .zg-hg__nav { flex-direction: row; overflow-x: auto; }
    .zg-hg__cat { width: auto; white-space: nowrap; }
    .zg-hg__cat em { display: none; }
    .zg-hg__grid { grid-template-columns: 1fr; }
    .zg-hg__head, .zg-hg__body, .zg-hg__foot { padding-left: 14px; padding-right: 14px; }
}
`;

    document.head.appendChild(style);


    /* =====================================================
       RENDER
    ===================================================== */

    function esc(text) {
        return String(text == null ? "" : text)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function highlight(text, query) {
        const safe = esc(text);
        if (!query) return safe;
        const q = esc(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return safe.replace(new RegExp(q, "gi"), match => `<mark class="zg-hg__hit">${match}</mark>`);
    }

    function combo(keys) {
        return `<span class="zg-hg__combo">${keys.map(key => `<kbd>${esc(key)}</kbd>`).join("<span>+</span>")}</span>`;
    }

    function cardHtml(topic, category, query, index) {

        const art = ART[topic.art] ? ART[topic.art]() : "";

        const steps = (topic.steps || []).map(step => `<li>${highlight(step, query)}</li>`).join("");

        const table = topic.keyTable
            ? `<div class="zg-hg__ktable">${topic.keyTable
                .filter(([keys]) => !(keys[0] === "T" && !window.ZGTodayLine))
                .map(([keys, text]) => `<div>${combo(keys)}</div><div>${highlight(text, query)}</div>`).join("")}</div>`
            : "";

        return `
            <article class="zg-hg__card" style="--c:${category.color}; animation-delay:${Math.min(index, 8) * 0.04}s">
                <div class="zg-hg__art">${art}</div>
                <div class="zg-hg__content">
                    <h3>${highlight(topic.title, query)}</h3>
                    ${steps ? `<ol class="zg-hg__steps">${steps}</ol>` : ""}
                    ${table}
                    ${topic.keys ? `<div class="zg-hg__keys">${topic.keys.map(combo).join("")}</div>` : ""}
                    ${topic.tip ? `<div class="zg-hg__tip">${highlight(topic.tip, query)}</div>` : ""}
                    ${topic.more && oldHelp ? `<button type="button" class="zg-hg__more" data-hg="all-keys">⌨ ดูปุ่มลัดทั้งหมด</button>` : ""}
                </div>
            </article>`;
    }

    function matches(topic, query) {
        if (!query) return true;
        const text = [topic.title, topic.tip, ...(topic.steps || []), ...((topic.keyTable || []).map(row => row[1] + " " + row[0].join(" ")))]
            .join(" ").toLowerCase();
        return query.toLowerCase().split(/\s+/).filter(Boolean).every(word => text.includes(word));
    }


    let overlay = null;
    let current = "start";
    let query = "";

    function renderMain() {

        if (!overlay) return;

        const main = overlay.querySelector(".zg-hg__main");
        const body = main.querySelector(".zg-hg__body");

        let category;
        let cards;

        if (query) {
            const found = [];
            CATEGORIES.forEach(cat => cat.topics.forEach(topic => { if (matches(topic, query)) found.push([topic, cat]); }));
            category = { icon: "🔎", name: `ผลการค้นหา "${query}"`, color: "#3a8a4f", intro: `พบ ${found.length} หัวข้อ` };
            cards = found.length
                ? found.map(([topic, cat], index) => cardHtml(topic, cat, query, index)).join("")
                : "";
        } else {
            category = CATEGORIES.find(cat => cat.id === current) || CATEGORIES[0];
            cards = category.topics.map((topic, index) => cardHtml(topic, category, "", index)).join("");
        }

        main.style.setProperty("--c", category.color);
        main.querySelector(".zg-hg__head h2").innerHTML = `<span>${category.icon}</span>${esc(category.name)}`;
        main.querySelector(".zg-hg__head p").textContent = category.intro || "";

        body.innerHTML = cards
            ? `<div class="zg-hg__grid">${cards}</div>`
            : `<div class="zg-hg__empty">ไม่พบหัวข้อที่ตรงกับ "${esc(query)}"<br>ลองคำอื่น เช่น "สี" "Export" "แม่เหล็ก"</div>`;
        body.scrollTop = 0;

        overlay.querySelectorAll(".zg-hg__cat").forEach(button => {
            button.classList.toggle("is-on", !query && button.dataset.cat === current);
        });

        const index = CATEGORIES.findIndex(cat => cat.id === current);
        const next = CATEGORIES[index + 1];
        const nextButton = overlay.querySelector("[data-hg='next']");
        if (nextButton) {
            nextButton.hidden = Boolean(query) || !next;
            if (next) nextButton.textContent = `ถัดไป: ${next.icon} ${next.name} →`;
        }
    }

    function close() {
        if (overlay) overlay.remove();
        overlay = null;
    }

    function open(categoryId) {

        close();

        if (oldHelp && oldHelp.close) oldHelp.close();
        if (typeof closeObjectMenu === "function") closeObjectMenu();

        if (categoryId && CATEGORIES.some(cat => cat.id === categoryId)) current = categoryId;
        query = "";

        overlay = document.createElement("div");
        overlay.className = "zg-hg";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-label", "วิธีใช้");

        const todayOn = window.ZGTodayLine ? window.ZGTodayLine.isVisible() : false;

        overlay.innerHTML = `
            <div class="zg-hg__box">
                <aside class="zg-hg__side">
                    <div class="zg-hg__brand"><div class="zg-hg__logo">📘</div><div><b>วิธีใช้</b><small>Property Schedule Plan</small></div></div>
                    <input type="search" class="zg-hg__search" placeholder="ค้นหาวิธีใช้… เช่น สี, Export" aria-label="ค้นหาวิธีใช้">
                    <nav class="zg-hg__nav">
                        ${CATEGORIES.map(cat => `<button type="button" class="zg-hg__cat" data-cat="${cat.id}" style="--c:${cat.color}"><i>${cat.icon}</i>${esc(cat.name)}<em>${cat.topics.length}</em></button>`).join("")}
                    </nav>
                </aside>
                <section class="zg-hg__main">
                    <header class="zg-hg__head">
                        <div><h2></h2><p></p></div>
                        <button type="button" class="zg-hg__close" data-hg="close" title="ปิด (Esc)">✕</button>
                    </header>
                    <div class="zg-hg__body"></div>
                    <footer class="zg-hg__foot">
                        ${window.ZGTodayLine ? `<label><input type="checkbox" data-hg="today" ${todayOn ? "checked" : ""}> แสดงเส้นวันนี้</label>` : ""}
                        <span>กด ? หรือ F1 เปิดหน้านี้ · Esc ปิด</span>
                        <button type="button" class="zg-hg__nextbtn" data-hg="next"></button>
                    </footer>
                </section>
            </div>`;

        overlay.addEventListener("mousedown", event => {
            if (event.target === overlay) close();
        });

        overlay.addEventListener("click", event => {
            const target = event.target instanceof Element ? event.target : null;
            if (!target) return;
            const cat = target.closest(".zg-hg__cat");
            if (cat) {
                current = cat.dataset.cat;
                query = "";
                overlay.querySelector(".zg-hg__search").value = "";
                renderMain();
                return;
            }
            const action = target.closest("[data-hg]");
            if (!action) return;
            if (action.dataset.hg === "close") close();
            if (action.dataset.hg === "next") {
                const index = CATEGORIES.findIndex(item => item.id === current);
                if (CATEGORIES[index + 1]) { current = CATEGORIES[index + 1].id; renderMain(); }
            }
            if (action.dataset.hg === "all-keys" && oldHelp && oldHelp.open) {
                close();
                oldHelp.open();
            }
        });

        overlay.addEventListener("change", event => {
            if (event.target.matches("[data-hg='today']") && window.ZGTodayLine) {
                window.ZGTodayLine.setVisible(event.target.checked);
            }
        });

        let searchTimer = null;
        overlay.querySelector(".zg-hg__search").addEventListener("input", event => {
            clearTimeout(searchTimer);
            const value = event.target.value.trim();
            searchTimer = setTimeout(() => { query = value; renderMain(); }, 120);
        });

        /* พิมพ์ในช่องค้นหา / หน้าวิธีใช้ ไม่ให้ไปโดนปุ่มลัดของกระดาน */
        overlay.addEventListener("keydown", event => {
            if (event.key === "Escape") return;
            event.stopPropagation();
        });

        document.body.appendChild(overlay);

        renderMain();
    }


    /* =====================================================
       ต่อกับปุ่ม "⌨ วิธีใช้" และ ? / F1 (แทนหน้าเดิม)
    ===================================================== */

    document.addEventListener("click", event => {
        const button = event.target instanceof Element && event.target.closest(".zg-help-btn");
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (overlay) close(); else open();
    }, true);

    window.addEventListener("keydown", event => {

        if (overlay && event.key === "Escape") {
            event.preventDefault();
            event.stopImmediatePropagation();
            close();
            return;
        }

        if (event.ctrlKey || event.metaKey || event.altKey) return;

        const target = event.target;
        if (target instanceof Element && target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")) return;

        if (event.key === "?" || event.key === "F1") {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (overlay) close(); else open();
        }

    }, true);

    const helpButton = document.querySelector(".zg-help-btn");
    if (helpButton) {
        helpButton.textContent = "📘 วิธีใช้";
        helpButton.title = "วิธีใช้ (กด ? หรือ F1)";
    }

    window.ZGHelp = {
        open,
        close,
        openShortcuts: oldHelp && oldHelp.open ? oldHelp.open : open,
        categories: () => CATEGORIES.map(cat => cat.id)
    };

})();
