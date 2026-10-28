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
            <rect x="52" y="125" width="202" height="2" rx="1" fill="#d6ddd9"/><circle cx="60" cy="126" r="2" fill="${C.mute}"/>
            <g class="hg-zone hg-z6"><rect x="6" y="129" width="248" height="15" rx="4" fill="#f0f3f1"/><text x="130" y="139" font-size="7" text-anchor="middle" fill="${C.mute}">บันทึกท้ายกระดาน</text></g>`),

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
            <line x1="57.5" y1="20" x2="57.5" y2="124" stroke="${C.red}" stroke-width="1.5"/>
            <g><text x="57.5" y="133" font-size="7" text-anchor="middle" fill="${C.ink}">เซ็นสัญญา</text><text x="57.5" y="141" font-size="5.5" text-anchor="middle" fill="${C.mute}">3 ก.พ. 2569</text></g>
            <text x="64" y="108" font-size="6" fill="${C.red}">＋ เส้นวันที่ = เส้นทึบ</text>
            <g class="hg-day"><circle cx="133.5" cy="10" r="7" fill="none" stroke="${C.purple}" stroke-width="1.5"/></g>
            <line class="hg-drop" x1="133.5" y1="20" x2="133.5" y2="96" stroke="${C.purple}" stroke-width="1.5" stroke-dasharray="4 3"/>
            <g class="hg-chip"><text x="140" y="108" font-size="6" fill="${C.purple}">คลิกเลขวัน = เส้นประ</text></g>
            ${cursor("hg-cur-day", 133, 9)}`),

        hline: () => svg(`${board({ rows: 2, bracket: 92 })}
            <line x1="60" y1="20" x2="60" y2="150" stroke="${C.red}" stroke-width="1.5"/>
            <line x1="200" y1="20" x2="200" y2="150" stroke="${C.purple}" stroke-width="1.5" stroke-dasharray="4 3"/>
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
                <text x="42" y="78" font-size="7" text-anchor="middle" fill="${C.green}" font-weight="700">PDF · PNG · JPEG · JSON</text></g>`),

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

        /* ---------- แถบเครื่องมือ: ปุ่มขาว → กดแล้วเขียว · เมนูเปิดอยู่ = เขียวค้าง ---------- */
        ribbon: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="6" y="12" width="248" height="64" rx="9" fill="#f6f8f7" stroke="${C.line}"/>
            <g class="hg-chip-imp"><rect x="12" y="18" width="22" height="24" rx="5" fill="#fff" stroke="${C.line}"/><text x="23" y="33" font-size="5.5" text-anchor="middle" fill="${C.ink}">Import</text></g>
            <rect class="hg-chip-exp" x="36" y="18" width="24" height="24" rx="5" fill="#fff" stroke="${C.line}"/>
            <text class="hg-chip-exp-t" x="48" y="33" font-size="5.5" text-anchor="middle" fill="${C.ink}">Export</text>
            <rect x="62" y="18" width="20" height="24" rx="5" fill="#fff" stroke="${C.line}"/><text x="72" y="33" font-size="5.5" text-anchor="middle" fill="${C.ink}">พิมพ์</text>
            <rect x="12" y="46" width="70" height="24" rx="5" fill="#fff" stroke="${C.line}"/><text x="47" y="61" font-size="6" text-anchor="middle" fill="${C.ink}">รูปภาพ · แปะรูป</text>
            ${["＋งาน", "วันที่", "แนวนอน", "Text", "เทมเพลต"].map((t, i) => `
                <rect class="${i === 0 ? "hg-tile-on" : ""}" x="${88 + i * 25}" y="18" width="23" height="52" rx="6" fill="#fff" stroke="${C.line}"/>
                <circle cx="${99.5 + i * 25}" cy="36" r="6" fill="${C.greenSoft}"/>
                <text class="${i === 0 ? "hg-tile-on-t" : ""}" x="${99.5 + i * 25}" y="58" font-size="5" text-anchor="middle" fill="${C.ink}">${t}</text>`).join("")}
            <rect x="216" y="18" width="34" height="24" rx="6" fill="#fff" stroke="${C.line}"/><text x="233" y="33" font-size="7" text-anchor="middle">🔍</text>
            <rect x="216" y="46" width="34" height="24" rx="6" fill="#fff" stroke="${C.line}"/><text x="233" y="61" font-size="6.5" text-anchor="middle" fill="${C.ink}">− % +</text>
            <rect x="6" y="84" width="248" height="58" rx="6" fill="#fafbfa" stroke="${C.grid}"/>
            <rect class="hg-rib-task" x="40" y="100" width="56" height="16" rx="4" fill="${C.blue}"/>
            <g class="hg-rib-menu"><rect x="36" y="44" width="52" height="54" rx="7" fill="#fff" stroke="${C.line}" filter="drop-shadow(0 3px 5px rgba(0,0,0,.15))"/>
                ${["PDF", "PNG", "JPEG", "JSON"].map((t, i) => `<text x="46" y="${57 + i * 12}" font-size="7" fill="${C.ink}">${t}</text>`).join("")}</g>
            ${cursor("hg-cur-rib")}`),

        /* ---------- การ์ดช่วงเวลา: วันเริ่ม → วันจบ · ± เดือน ---------- */
        rangeCard: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="24" y="16" width="212" height="86" rx="12" fill="#fff" stroke="${C.line}"/>
            <text x="36" y="32" font-size="7" fill="${C.mute}">ช่วงเวลาของตาราง</text>
            <rect x="36" y="38" width="80" height="20" rx="6" fill="#f3f6f4"/><text x="76" y="51" font-size="7.5" text-anchor="middle" fill="${C.ink}">1 ก.ย. 2026</text>
            <text x="130" y="52" font-size="9" text-anchor="middle" fill="${C.green}">→</text>
            <rect x="144" y="38" width="80" height="20" rx="6" fill="#f3f6f4"/>
            <text class="hg-dateA" x="184" y="51" font-size="7.5" text-anchor="middle" fill="${C.ink}">28 ก.พ. 2027</text>
            <text class="hg-dateB" x="184" y="51" font-size="7.5" text-anchor="middle" fill="${C.green}" font-weight="700">31 มี.ค. 2027</text>
            <text x="36" y="80" font-size="6.5" fill="${C.mute}">เริ่ม</text>
            <rect x="54" y="70" width="40" height="16" rx="5" fill="#fff" stroke="${C.line}"/><text x="64" y="81" font-size="8" text-anchor="middle">−</text><text x="84" y="81" font-size="8" text-anchor="middle">+</text>
            <text x="144" y="80" font-size="6.5" fill="${C.mute}">จบ</text>
            <rect x="160" y="70" width="40" height="16" rx="5" fill="#fff" stroke="${C.line}"/><text x="170" y="81" font-size="8" text-anchor="middle">−</text>
            <rect class="hg-plus-on" x="181" y="71" width="18" height="14" rx="4" fill="#fff"/><text class="hg-plus-on-t" x="190" y="81" font-size="8" text-anchor="middle" fill="${C.ink}">+</text>
            <text x="216" y="81" font-size="8" text-anchor="middle">🔗</text>
            <rect x="24" y="114" width="212" height="24" rx="6" fill="#fafbfa" stroke="${C.grid}"/>
            <rect class="hg-range-bar" x="32" y="122" width="170" height="8" rx="4" fill="${C.greenSoft}" stroke="${C.green}"/>
            ${cursor("hg-cur-range")}`),

        /* ---------- หน้าเริ่มต้น → เลือกเทมเพลต (มีภาพตัวอย่าง) ---------- */
        startScreen: () => svg(`
            <rect width="260" height="150" rx="10" fill="#eef2f0"/>
            <rect x="10" y="8" width="240" height="134" rx="12" fill="#ffffff"/>
            <g class="hg-home">
                <text x="130" y="30" font-size="9" text-anchor="middle" font-weight="700" fill="${C.ink}">Property Schedule Plan</text>
                ${[["↩", "ทำต่อ"], ["📋", "เทมเพลต"], ["＋", "แผนเปล่า"]].map(([icon, label], i) => `
                    <rect x="${26 + i * 72}" y="44" width="64" height="74" rx="9" fill="#fff" stroke="${i === 1 ? C.green : C.line}"/>
                    <rect x="${34 + i * 72}" y="52" width="20" height="20" rx="6" fill="${C.greenSoft}"/><text x="${44 + i * 72}" y="66" font-size="10" text-anchor="middle">${icon}</text>
                    <text x="${34 + i * 72}" y="88" font-size="7.5" font-weight="700" fill="${C.ink}">${label}</text>`).join("")}
            </g>
            <g class="hg-tplview">
                <text x="20" y="24" font-size="8" font-weight="700" fill="${C.ink}">📋 เริ่มจากเทมเพลต</text>
                ${["ซื้อที่ดิน", "เช่าโกดัง", "สัญญาเช่า"].map((t, i) => `<rect x="18" y="${32 + i * 22}" width="70" height="18" rx="5" fill="#fff" stroke="${C.line}"/><text x="24" y="${44 + i * 22}" font-size="7" fill="${C.ink}">${t}</text>`).join("")}
                <rect class="hg-tplsel" x="18" y="32" width="70" height="18" rx="5" fill="rgba(58,138,79,.12)" stroke="${C.green}"/>
                <rect x="96" y="32" width="144" height="80" rx="8" fill="#f6f8f7" stroke="${C.line}"/>
                <g class="hg-pvA"><rect x="102" y="40" width="20" height="66" fill="#e3a07e"/><rect x="128" y="44" width="34" height="10" rx="2" fill="${C.blue}"/><rect x="150" y="62" width="50" height="10" rx="2" fill="${C.orange}"/><rect x="176" y="80" width="40" height="10" rx="2" fill="${C.pink}"/></g>
                <g class="hg-pvB"><rect x="102" y="40" width="20" height="66" fill="#9fc7a9"/><rect x="132" y="48" width="60" height="10" rx="2" fill="${C.purple}"/><rect x="170" y="70" width="50" height="10" rx="2" fill="${C.green}"/></g>
                <text x="232" y="28" font-size="6.5" text-anchor="end" fill="${C.mute}">🔍 ดูขนาดจริง</text>
                <rect class="hg-make" x="186" y="118" width="54" height="16" rx="5" fill="${C.green}"/><text x="213" y="129" font-size="7" text-anchor="middle" fill="#fff" font-weight="700">สร้างแผน</text>
            </g>
            ${cursor("hg-cur-start")}`),

        /* ---------- ลากบนเลขวัน → ซ่อน / รวบช่วงวัน ---------- */
        foldDrag: () => {
            const day = i => 10 + i * 19;
            const num = (i, cls = "") => `<text class="${cls}" x="${day(i) + 9.5}" y="14" font-size="7" text-anchor="middle" fill="${C.mute}">${i + 1}</text><line x1="${day(i)}" y1="20" x2="${day(i)}" y2="116" stroke="${C.grid}"/>`;
            return svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="0" y="0" width="260" height="20" fill="#f6f8f7"/>
            ${[0, 1, 2].map(i => num(i)).join("")}
            <g class="hg-fmid">${[3, 4, 5, 6, 7, 8].map(i => num(i)).join("")}<rect x="96" y="56" width="60" height="16" rx="4" fill="${C.pink}"/></g>
            <g class="hg-fright">${[9, 10, 11, 12].map(i => num(i)).join("")}<rect x="190" y="86" width="56" height="16" rx="4" fill="${C.orange}"/></g>
            ${[20, 50, 80, 116].map(y => `<line x1="0" y1="${y}" x2="260" y2="${y}" stroke="${y === 20 ? "#c9d1cd" : C.grid}"/>`).join("")}
            <rect x="16" y="26" width="44" height="16" rx="4" fill="${C.blue}"/>
            <rect class="hg-fband" x="67" y="0" width="0" height="116" fill="rgba(58,138,79,.13)" stroke="${C.green}" stroke-dasharray="3 2"/>
            <g class="hg-fmenu"><rect x="120" y="24" width="88" height="40" rx="7" fill="#fff" stroke="${C.line}" filter="drop-shadow(0 3px 6px rgba(0,0,0,.15))"/>
                <rect x="124" y="28" width="80" height="15" rx="4" fill="${C.greenSoft}"/><text x="130" y="38.5" font-size="7" fill="${C.ink}">ซ่อนช่วงนี้</text>
                <text x="130" y="56" font-size="7" fill="${C.ink}">รวบช่วงนี้ (เหลือ N วัน)</text></g>
            <rect class="hg-fstrip" x="67" y="0" width="10" height="116" rx="2" fill="#dfe6e2"/>
            <text x="130" y="134" font-size="7.5" text-anchor="middle" fill="${C.mute}">ลากบนเลขวัน → เลือกช่วง → ซ่อน / รวบ · คลิกแถบ = เปิดกลับ</text>
            ${cursor("hg-cur-fold")}`);
        },

        /* ---------- รวบทั้งเดือน ---------- */
        foldMonth: () => {
            const month = (x, label, color) => `<rect x="${x}" y="0" width="80" height="20" fill="#f6f8f7" stroke="${C.grid}"/><text x="${x + 40}" y="14" font-size="8" text-anchor="middle" fill="${C.ink}" font-weight="700">${label}</text>
                <line x1="${x}" y1="20" x2="${x}" y2="116" stroke="#b7c2bc"/><rect x="${x + 12}" y="40" width="52" height="16" rx="4" fill="${color}"/>`;
            return svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            ${month(10, "ก.ย.", C.blue)}
            <g class="hg-mmid">${month(90, "ต.ค.", C.pink)}</g>
            <g class="hg-mright">${month(170, "พ.ย.", C.orange)}</g>
            <g class="hg-mstrip"><rect x="90" y="0" width="16" height="116" fill="#e3e9e5" stroke="${C.line}"/><text x="98" y="60" font-size="7" text-anchor="middle" fill="${C.ink}" font-weight="700" transform="rotate(-90 98 60)" style="transform-box: view-box">ต.ค.</text></g>
            ${[20, 116].map(y => `<line x1="0" y1="${y}" x2="260" y2="${y}" stroke="${C.grid}"/>`).join("")}
            <g class="hg-mmenu"><rect x="120" y="22" width="96" height="44" rx="7" fill="#fff" stroke="${C.line}" filter="drop-shadow(0 3px 6px rgba(0,0,0,.15))"/>
                <rect x="124" y="26" width="88" height="15" rx="4" fill="${C.greenSoft}"/><text x="130" y="36.5" font-size="7" fill="${C.ink}">รวบเดือน ต.ค.</text>
                <text x="130" y="55" font-size="7" fill="${C.ink}">ซ่อนเสาร์–อาทิตย์ทั้งหมด</text></g>
            <text x="130" y="134" font-size="7.5" text-anchor="middle" fill="${C.mute}">คลิกขวาที่หัวตาราง → รวบเดือน · ซ่อนเสาร์–อาทิตย์</text>
            ${cursor("hg-cur-month")}`);
        },

        /* ---------- แผง ซ่อน/รวบวัน ---------- */
        foldPanel: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="40" y="10" width="180" height="130" rx="12" fill="#fff" stroke="${C.line}" filter="drop-shadow(0 4px 8px rgba(0,0,0,.08))"/>
            <text x="54" y="28" font-size="8.5" font-weight="700" fill="${C.ink}">ซ่อน / รวบวัน</text>
            ${[["ซ่อน 4–9 ก.ย.", "hg-tg1"], ["รวบ 1–31 ต.ค. → 8 วัน", ""], ["เสาร์–อาทิตย์", ""]].map(([t, cls], i) => `
                <rect x="50" y="${38 + i * 24}" width="160" height="20" rx="6" fill="#f6f8f7"/>
                <text x="58" y="${51 + i * 24}" font-size="7" fill="${C.ink}">${t}</text>
                <rect class="${cls ? cls + "-bg" : ""}" x="180" y="${42 + i * 24}" width="22" height="12" rx="6" fill="${C.green}"/>
                <circle class="${cls}" cx="196" cy="${48 + i * 24}" r="4.5" fill="#fff"/>`).join("")}
            <rect x="50" y="112" width="160" height="18" rx="6" fill="#fff" stroke="${C.green}"/>
            <text x="130" y="124" font-size="7" text-anchor="middle" fill="${C.green}" font-weight="700">👁 แสดงทุกวันชั่วคราว</text>
            ${cursor("hg-cur-panel")}`),

        /* ---------- แว่นขยายเลขวัน ---------- */
        lens: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="10" y="60" width="240" height="14" rx="3" fill="#f6f8f7" stroke="${C.grid}"/>
            ${Array.from({ length: 31 }, (_, i) => `<text x="${16 + i * 7.6}" y="69.5" font-size="4.2" text-anchor="middle" fill="${C.mute}">${i + 1}</text>`).join("")}
            <g class="hg-lens">
                <circle cx="0" cy="0" r="22" fill="rgba(255,255,255,.82)" stroke="#ffffff" stroke-width="2.5" filter="drop-shadow(0 4px 6px rgba(20,40,30,.25))"/>
                <circle cx="0" cy="0" r="22" fill="none" stroke="rgba(58,138,79,.35)"/>
                <text class="hg-ln1" x="0" y="6" font-size="17" text-anchor="middle" font-weight="700" fill="${C.ink}">8</text>
                <text class="hg-ln2" x="0" y="6" font-size="17" text-anchor="middle" font-weight="700" fill="${C.red}">17</text>
                <text class="hg-ln3" x="0" y="6" font-size="17" text-anchor="middle" font-weight="700" fill="${C.ink}">26</text>
            </g>
            <text x="130" y="128" font-size="7.5" text-anchor="middle" fill="${C.mute}">ชี้เลขวันที่ตัวเล็ก → แว่นขยายให้อ่านง่าย (ไม่ติดไปตอนพิมพ์)</text>`),

        /* ---------- เลื่อนดูตาราง: Space + ลาก / ปุ่มกลางเมาส์ ---------- */
        pan: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <clipPath id="hgPanClip"><rect x="10" y="10" width="240" height="96" rx="6"/></clipPath>
            <rect x="10" y="10" width="240" height="96" rx="6" fill="#fafbfa" stroke="${C.line}"/>
            <g clip-path="url(#hgPanClip)"><g class="hg-pan">
                ${Array.from({ length: 22 }, (_, i) => `<line x1="${10 + i * 19}" y1="10" x2="${10 + i * 19}" y2="106" stroke="${C.grid}"/>`).join("")}
                <rect x="30" y="24" width="60" height="16" rx="4" fill="${C.blue}"/><rect x="120" y="50" width="80" height="16" rx="4" fill="${C.orange}"/>
                <rect x="230" y="76" width="90" height="16" rx="4" fill="${C.pink}"/><rect x="300" y="30" width="70" height="16" rx="4" fill="${C.green}"/>
            </g></g>
            <g class="hg-hand"><text x="150" y="70" font-size="18" text-anchor="middle">✋</text></g>
            <g class="hg-spacekey"><rect x="80" y="116" width="100" height="22" rx="5" fill="#fff" stroke="#cfd6d2"/><rect x="80" y="134" width="100" height="4" rx="2" fill="#cfd6d2"/><text x="130" y="131" font-size="8.5" text-anchor="middle" font-weight="700" fill="${C.ink}">Space</text></g>
            <text x="196" y="131" font-size="7" fill="${C.mute}">+ ลาก</text>`),

        /* ---------- ย่อขยายกล่อง Text ได้ทุกมุม ---------- */
        textResize: () => svg(`${board()}
            <rect class="hg-tbox" x="70" y="40" width="100" height="34" rx="4" fill="#fff" stroke="${C.purple}" stroke-dasharray="4 3"/>
            <text x="78" y="61" font-size="9" fill="${C.ink}" font-weight="700">ลากได้ทุกมุม</text>
            <circle cx="70" cy="40" r="3.5" fill="#fff" stroke="${C.purple}" stroke-width="1.5"/>
            <circle class="hg-h-tr" cx="170" cy="40" r="3.5" fill="#fff" stroke="${C.purple}" stroke-width="1.5"/>
            <circle class="hg-h-bl" cx="70" cy="74" r="3.5" fill="#fff" stroke="${C.purple}" stroke-width="1.5"/>
            <circle class="hg-h-br" cx="170" cy="74" r="3.5" fill="#fff" stroke="${C.purple}" stroke-width="1.5"/>
            ${cursor("hg-cur-tres", 170, 74)}`),

        /* ---------- บันทึกเทมเพลต = เก็บทุกอย่างตามที่เห็น ---------- */
        tplSave: () => {
            const mini = (x, cls) => `<g class="${cls}" transform="translate(${x} 30)"><rect width="96" height="80" rx="6" fill="#fff" stroke="${C.line}"/>
                <rect x="4" y="4" width="54" height="8" rx="4" fill="${C.greenSoft}"/><rect x="4" y="16" width="16" height="56" fill="#e3a07e"/>
                <rect x="26" y="20" width="30" height="10" rx="2" fill="${C.blue}"/><rect x="44" y="36" width="40" height="10" rx="2" fill="${C.pink}" opacity=".55"/>
                <text x="28" y="60" font-size="7" fill="${C.purple}" font-weight="700">ข้อความ</text><rect x="66" y="52" width="22" height="16" rx="2" fill="#dbe9df"/></g>`;
            return svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            ${mini(10, "")}
            <g class="hg-saveflow"><text x="130" y="66" font-size="16" text-anchor="middle" fill="${C.green}">➜</text><text x="130" y="82" font-size="6.5" text-anchor="middle" fill="${C.mute}">💾 เทมเพลต</text></g>
            ${mini(154, "hg-clone")}
            <g class="hg-okbadge"><rect x="160" y="116" width="84" height="18" rx="9" fill="${C.greenSoft}"/><text x="202" y="128" font-size="7" text-anchor="middle" fill="${C.green}" font-weight="700">✓ เหมือนเดิมทุกอย่าง</text></g>
            <text x="58" y="128" font-size="6.5" text-anchor="middle" fill="${C.mute}">ตำแหน่ง ขนาด สี ฟอนต์</text>`);
        },

        /* ---------- วางแผน / เทมเพลต ที่วันใหม่ (ทุกอย่างเลื่อนตามกัน) ---------- */
        planShift: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            ${["ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => `<rect x="${10 + i * 60}" y="30" width="60" height="16" fill="#f6f8f7" stroke="${C.grid}"/><text x="${40 + i * 60}" y="41" font-size="7.5" text-anchor="middle" fill="${C.ink}">${m}</text><line x1="${10 + i * 60}" y1="46" x2="${10 + i * 60}" y2="112" stroke="#c9d1cd"/>`).join("")}
            <g class="hg-shift">
                <rect x="16" y="54" width="44" height="14" rx="4" fill="${C.blue}"/><rect x="40" y="74" width="50" height="14" rx="4" fill="${C.orange}"/>
                <line x1="66" y1="46" x2="66" y2="112" stroke="${C.red}" stroke-width="1.5"/>
                <rect x="70" y="94" width="20" height="12" rx="2" fill="#dfe8e2"/>
            </g>
            <rect x="60" y="6" width="140" height="18" rx="9" fill="#fff" stroke="${C.line}"/>
            <text class="hg-shA" x="130" y="18" font-size="7.5" text-anchor="middle" fill="${C.ink}">📅 วางแผนเริ่ม 1 ก.ย. 2026</text>
            <text class="hg-shB" x="130" y="18" font-size="7.5" text-anchor="middle" fill="${C.green}" font-weight="700">📅 วางแผนเริ่ม 1 พ.ย. 2026</text>
            <text x="130" y="130" font-size="7.5" text-anchor="middle" fill="${C.mute}">งาน เส้น รูป ข้อความ ช่วงที่ซ่อน/รวบ — เลื่อนไปด้วยกันทั้งหมด</text>`),

        /* ---------- หมวด Payment: ช่องเตี้ยครึ่งหนึ่ง ---------- */
        catPayment: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="10" y="10" width="54" height="48" fill="#f3a86b"/><text x="37" y="38" font-size="8" text-anchor="middle" fill="#fff" font-weight="700">Contact</text>
            <rect x="10" y="58" width="54" height="48" fill="#a98fd6"/><text x="37" y="86" font-size="8" text-anchor="middle" fill="#fff" font-weight="700">IEAT</text>
            <g class="hg-paycat"><rect x="10" y="106" width="54" height="24" fill="#e86fa8"/><text x="37" y="121" font-size="8" text-anchor="middle" fill="#fff" font-weight="700">Payment</text>
                <rect x="64" y="106" width="186" height="24" fill="#fff5fa" stroke="${C.grid}"/>
                <rect x="96" y="111" width="40" height="14" rx="3" fill="${C.pink}"/><text x="116" y="121" font-size="6.5" text-anchor="middle" fill="#fff">10%</text>
                <rect x="176" y="111" width="40" height="14" rx="3" fill="${C.pink}"/><text x="196" y="121" font-size="6.5" text-anchor="middle" fill="#fff">30%</text></g>
            ${[10, 58, 106, 130].map(y => `<line x1="64" y1="${y}" x2="250" y2="${y}" stroke="${y === 106 ? "#b7c2bc" : C.grid}"/>`).join("")}
            <rect x="96" y="20" width="56" height="28" rx="4" fill="${C.blue}"/><rect x="150" y="68" width="70" height="28" rx="4" fill="${C.orange}"/>
            <g class="hg-halfmark"><line x1="252" y1="58" x2="252" y2="106" stroke="${C.green}" stroke-width="1.5"/><line x1="252" y1="106" x2="252" y2="130" stroke="${C.pink}" stroke-width="3"/>
                <text x="246" y="122" font-size="7" text-anchor="end" fill="${C.pink}" font-weight="700">½</text></g>
            <text x="157" y="144" font-size="7" text-anchor="middle" fill="${C.mute}">หมวด Payment เตี้ยครึ่งหนึ่ง · ใช้ได้ทุกอย่างเหมือนหมวดปกติ</text>`),

        /* ---------- + หมวดหมู่ → เลือกชนิด ---------- */
        catAdd: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="40" y="12" width="180" height="126" rx="12" fill="#fff" stroke="${C.line}" filter="drop-shadow(0 4px 8px rgba(0,0,0,.08))"/>
            <text x="54" y="30" font-size="8.5" font-weight="700" fill="${C.ink}">🗂 เพิ่มหมวดหมู่</text>
            <text x="54" y="44" font-size="6.5" fill="${C.mute}">ชนิดหมวด</text>
            <rect x="54" y="48" width="74" height="26" rx="6" fill="#fff" stroke="${C.line}"/><rect x="60" y="54" width="8" height="14" rx="2" fill="#cfd8d3"/><text x="74" y="64" font-size="7" fill="${C.ink}">หมวดปกติ</text>
            <rect class="hg-kindpick" x="132" y="48" width="74" height="26" rx="6" fill="#fff" stroke="${C.line}"/><rect x="138" y="57" width="8" height="7" rx="2" fill="#f3b7cf"/><text x="152" y="64" font-size="7" fill="${C.ink}">Payment</text>
            <text x="54" y="88" font-size="6.5" fill="${C.mute}">ชื่อหมวดหมู่</text>
            <rect x="54" y="92" width="152" height="16" rx="5" fill="#f3f6f4"/>
            <text class="hg-payname" x="60" y="103" font-size="7.5" fill="${C.ink}">Payment</text>
            <rect x="160" y="116" width="46" height="15" rx="5" fill="${C.green}"/><text x="183" y="126.5" font-size="7" text-anchor="middle" fill="#fff" font-weight="700">ตกลง</text>
            ${cursor("hg-cur-kind")}`),

        /* ---------- แต่งข้อความบางส่วน ---------- */
        richText: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <g transform="translate(46 14)"><rect width="168" height="22" rx="7" fill="#1e2924"/>
                ${["A−", "A+", "B", "A", "I", "U", "⨯"].map((t, i) => `<g class="${i === 1 ? "hg-rbtn1" : i === 2 ? "hg-rbtn2" : i === 3 ? "hg-rbtn3" : ""}"><text x="${14 + i * 23}" y="15" font-size="8.5" text-anchor="middle" fill="#fff" font-weight="700">${t}</text></g>`).join("")}
                <rect x="72" y="16" width="14" height="2" rx="1" fill="${C.red}"/></g>
            <rect x="50" y="50" width="160" height="80" rx="8" fill="${C.blue}"/>
            <rect class="hg-rsel" x="66" y="74" width="0" height="20" rx="2" fill="rgba(255,255,255,.45)"/>
            <text class="hg-rpart" x="68" y="89" font-size="11" fill="#fff">Payment</text>
            <text x="68" y="112" font-size="11" fill="#fff">10% (same day)</text>
            ${cursor("hg-cur-rich")}`),

        /* ---------- ลากข้อความในกล่องได้อิสระ ---------- */
        labelFree: () => svg(`${board()}
            <rect x="70" y="40" width="70" height="56" rx="6" fill="${C.pink}"/>
            <g class="hg-lfree"><text x="105" y="72" font-size="9" text-anchor="middle" fill="#fff" font-weight="700">Payment 10%</text></g>
            <rect class="hg-lfree-box" x="68" y="62" width="74" height="14" rx="3" fill="none" stroke="#fff" stroke-dasharray="3 2"/>
            <text x="130" y="134" font-size="7.5" text-anchor="middle" fill="${C.mute}">ลากตัวหนังสือไปตรงไหนก็ได้ (ออกนอกกล่องได้) · Alt = ดูดเข้าตำแหน่ง</text>
            ${cursor("hg-cur-lfree", 105, 70)}`),

        /* ---------- ยืดข้อความแนวตั้ง ---------- */
        vertResize: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="100" y="16" width="60" height="118" rx="7" fill="${C.red}"/>
            <g class="hg-vlabel"><rect class="hg-vbox" x="122" y="50" width="16" height="50" rx="3" fill="none" stroke="#fff" stroke-dasharray="3 2"/>
                <text x="130" y="75" font-size="9" text-anchor="middle" fill="#fff" font-weight="700" transform="rotate(-90 130 75)" style="transform-box: view-box">Sign Contact</text></g>
            <rect class="hg-vh-top" x="119" y="45" width="22" height="9" rx="3" fill="#fff" stroke="${C.green}" stroke-width="1.5"/>
            <rect class="hg-vh-bot" x="119" y="96" width="22" height="9" rx="3" fill="#fff" stroke="${C.green}" stroke-width="1.5"/>
            <text x="200" y="76" font-size="7.5" fill="${C.mute}">ลาก ▴ ▾</text><text x="200" y="88" font-size="7.5" fill="${C.mute}">ยืดขึ้น-ลง</text>
            ${cursor("hg-cur-vres", 130, 100)}`),

        /* ---------- รูปที่ล็อก: คลิกแก้ไข / ปลดล็อก / ลบได้ ---------- */
        imgLock: () => svg(`${board()}
            <g><rect x="80" y="40" width="70" height="48" rx="4" fill="#dbe9df"/><path d="M86 82 L104 60 L118 74 L128 66 L144 82 Z" fill="${C.green}"/>
                <rect class="hg-locksel" x="78" y="38" width="74" height="52" rx="5" fill="none" stroke="${C.green}" stroke-width="1.5" stroke-dasharray="4 3"/>
                <rect x="120" y="44" width="28" height="11" rx="3" fill="rgba(30,41,36,.78)"/><text x="134" y="52" font-size="6" text-anchor="middle" fill="#fff">🔒 ล็อก</text></g>
            <g class="hg-lockbar"><rect x="60" y="100" width="150" height="20" rx="6" fill="#fff" stroke="${C.line}" filter="drop-shadow(0 2px 4px rgba(0,0,0,.12))"/>
                <text x="70" y="113" font-size="7" fill="${C.ink}">◐  ▢  🔓 ปลดล็อก  ✂  ⧉</text><text x="198" y="113" font-size="8" text-anchor="middle">🗑</text></g>
            ${cursor("hg-cur-lock", 115, 64)}`),

        /* ---------- งานอยู่กับที่ / งานตามวันเริ่ม ---------- */
        linkShift: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="12" y="10" width="78" height="20" rx="6" fill="#f3f6f4"/>
            <text class="hg-ls-d1" x="51" y="23.5" font-size="8" text-anchor="middle" fill="${C.ink}">01/09/2026</text>
            <text class="hg-ls-d2" x="51" y="23.5" font-size="8" text-anchor="middle" fill="${C.green}" font-weight="700">01/10/2026</text>
            <rect class="hg-ls-btn" x="98" y="10" width="92" height="20" rx="6" fill="#fff" stroke="${C.line}"/>
            <text class="hg-ls-off" x="144" y="23.5" font-size="7.5" text-anchor="middle" fill="${C.ink}">⛓ งานอยู่กับที่</text>
            <text class="hg-ls-on" x="144" y="23.5" font-size="7.5" text-anchor="middle" fill="#fff" font-weight="700">🔗 งานตามวันเริ่ม</text>
            <rect x="198" y="10" width="54" height="20" rx="6" fill="#fff" stroke="${C.line}"/><text x="225" y="23.5" font-size="7" text-anchor="middle" fill="${C.ink}">)( ซ่อน/รวบ</text>
            <g class="hg-ls-head">${["ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => `<rect x="${12 + i * 60}" y="40" width="60" height="14" fill="#f6f8f7" stroke="${C.grid}"/><text x="${42 + i * 60}" y="50" font-size="7" text-anchor="middle" fill="${C.ink}">${m}</text>`).join("")}</g>
            <rect x="12" y="54" width="240" height="64" fill="#fafbfa" stroke="${C.grid}"/>
            <g class="hg-ls-tasks"><rect x="30" y="62" width="44" height="16" rx="4" fill="${C.blue}"/><rect x="60" y="86" width="56" height="16" rx="4" fill="${C.orange}"/><line x1="96" y1="54" x2="96" y2="118" stroke="${C.red}" stroke-width="1.5"/></g>
            <text x="132" y="136" font-size="7.5" text-anchor="middle" fill="${C.mute}">เปิด 🔗 แล้วเปลี่ยนวันเริ่ม → งานทั้งหมดเลื่อนตามไปด้วย</text>
            ${cursor("hg-cur-ls")}`),

        /* ---------- ↕ เท่ากระดาษ · ↔ ทั้งแผน ---------- */
        viewModes: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect class="hg-vm-b1" x="136" y="8" width="56" height="16" rx="5" fill="#fff" stroke="${C.line}"/>
            <text class="hg-vm-t1" x="164" y="19" font-size="7" text-anchor="middle" fill="${C.ink}">↕ เท่ากระดาษ</text>
            <rect class="hg-vm-b2" x="196" y="8" width="54" height="16" rx="5" fill="#fff" stroke="${C.line}"/>
            <text class="hg-vm-t2" x="223" y="19" font-size="7" text-anchor="middle" fill="${C.ink}">↔ ทั้งแผน</text>
            <rect x="10" y="30" width="240" height="112" rx="4" fill="#f6f8f7" stroke="${C.line}"/>
            <rect x="14" y="34" width="70" height="10" rx="5" fill="${C.greenSoft}"/>
            <g class="hg-vm-table"><rect x="14" y="48" width="232" height="44" fill="#fff" stroke="${C.grid}"/>
                <rect x="14" y="48" width="26" height="44" fill="#cfd8d3"/>
                <g class="hg-vm-tasks"><rect x="50" y="53" width="40" height="14" rx="3" fill="${C.blue}"/><rect x="96" y="72" width="60" height="14" rx="3" fill="${C.pink}"/><rect x="170" y="53" width="40" height="14" rx="3" fill="${C.orange}"/></g>
                <rect class="hg-vm-more" x="216" y="48" width="30" height="44" fill="url(#hgVmFade)"/></g>
            <defs><linearGradient id="hgVmFade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#e3e9e5"/></linearGradient></defs>
            <rect class="hg-vm-br" x="14" y="96" width="232" height="14" fill="#fafbfa" stroke="${C.grid}"/>
            <rect class="hg-vm-notes" x="14" y="114" width="232" height="24" rx="3" fill="#fff" stroke="${C.line}"/>
            <text x="130" y="148" font-size="7" text-anchor="middle" fill="${C.mute}">ตารางสูงเท่าตอนพิมพ์ · แผนไม่เกิน 6 เดือน / 3 หมวด เห็นในจอเดียว</text>
            ${cursor("hg-cur-vm")}`),

        /* ---------- หน้าต่างตั้งค่า ลากย้ายได้ ---------- */
        panelDrag: () => svg(`${board()}
            <g class="hg-pd-win"><rect x="150" y="26" width="96" height="112" rx="9" fill="#fff" stroke="${C.line}" filter="drop-shadow(0 4px 8px rgba(0,0,0,.12))"/>
                <rect x="185" y="31" width="26" height="4" rx="2" fill="${C.green}"/>
                <text x="160" y="50" font-size="7" fill="${C.mute}">สี</text>
                ${[0, 1, 2, 3, 4].map(i => `<circle cx="${166 + i * 16}" cy="60" r="5" fill="${[C.blue, C.red, C.orange, C.green, C.purple][i]}"/>`).join("")}
                <rect x="158" y="74" width="80" height="12" rx="4" fill="#f3f6f4"/><rect x="158" y="92" width="80" height="12" rx="4" fill="#f3f6f4"/>
                <rect x="158" y="114" width="38" height="14" rx="4" fill="#fff" stroke="${C.line}"/><rect x="200" y="114" width="38" height="14" rx="4" fill="#fde2e2"/></g>
            <rect x="40" y="31" width="60" height="22" rx="5" fill="${C.red}"/>
            ${cursor("hg-cur-pd")}
            <text x="130" y="148" font-size="7" text-anchor="middle" fill="${C.mute}">จับแถบ ━ ด้านบนหน้าต่าง แล้วลากไปวางตรงไหนก็ได้</text>`),

        /* ---------- แม่เหล็กหมวด ---------- */
        magnet: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="10" y="12" width="40" height="60" fill="#cfd8d3"/><rect x="10" y="72" width="40" height="30" fill="#dfe6e2"/><rect x="10" y="102" width="40" height="40" fill="#cfd8d3"/>
            <text x="30" y="45" font-size="7" text-anchor="middle" fill="${C.ink}" font-weight="700">หมวด 1</text>
            <text x="30" y="90" font-size="6.5" text-anchor="middle" fill="${C.ink}" font-weight="700">หมวดเล็ก</text>
            ${[12, 72, 102, 142].map(y => `<line x1="10" y1="${y}" x2="250" y2="${y}" stroke="#b7c2bc"/>`).join("")}
            <g class="hg-mg-box"><rect class="hg-mg-rect" x="110" y="12" width="50" height="60" rx="5" fill="${C.blue}"/></g>
            <g class="hg-mg-icon"><text x="200" y="50" font-size="16" text-anchor="middle">🧲</text></g>
            ${cursor("hg-cur-mg")}`),

        /* ---------- ยืด / ย่อ กล่องป้ายเส้นวันที่ ---------- */
        chipResize: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="0" y="20" width="260" height="110" fill="#fafbfa" stroke="${C.grid}"/>
            <line x1="130" y1="20" x2="130" y2="58" stroke="${C.red}" stroke-width="1.5"/>
            <rect class="hg-cr-box" x="95" y="58" width="70" height="30" rx="7" fill="#fff" stroke="${C.green}" stroke-dasharray="3 2"/>
            <text x="130" y="72" font-size="8" text-anchor="middle" fill="${C.ink}">title</text>
            <text x="130" y="82" font-size="6" text-anchor="middle" fill="${C.mute}">25 ก.ย. 2569</text>
            <rect class="hg-cr-h" x="161" y="66" width="8" height="14" rx="3" fill="#fff" stroke="${C.green}" stroke-width="1.5"/>
            <rect class="hg-cr-hl" x="91" y="66" width="8" height="14" rx="3" fill="#fff" stroke="${C.green}" stroke-width="1.5"/>
            <rect class="hg-cr-hb" x="123" y="84" width="14" height="8" rx="3" fill="#fff" stroke="${C.green}" stroke-width="1.5"/>
            ${cursor("hg-cur-cr", 165, 73)}`),

        /* ---------- กรอบรูป ---------- */
        imgFrame: () => svg(`${board()}
            <rect class="hg-if-frame" x="90" y="34" width="70" height="90" rx="3" fill="none" stroke="${C.green}" stroke-width="2"/>
            <g><rect x="100" y="54" width="50" height="50" rx="3" fill="#dbe9df"/><path d="M104 100 L118 80 L128 92 L136 84 L146 100 Z" fill="${C.green}"/><circle cx="138" cy="66" r="5" fill="${C.orange}"/></g>
            <rect class="hg-if-hb" x="118" y="120" width="14" height="7" rx="3" fill="#fff" stroke="${C.green}" stroke-width="1.5"/>
            <g class="hg-if-btn"><rect x="172" y="60" width="70" height="18" rx="6" fill="#fff" stroke="${C.line}"/><text x="207" y="72" font-size="7.5" text-anchor="middle" fill="${C.ink}">▣ พอดีรูป</text></g>
            ${cursor("hg-cur-if", 125, 123)}`),

        /* ---------- ปลายเส้นประ: ลากลง + ดูดติดเส้นแนวนอน ---------- */
        stemGrip: () => svg(`${board({ rows: 2, bracket: 92 })}
            <line x1="133.5" y1="20" x2="133.5" y2="92" stroke="${C.purple}" stroke-width="1.5" stroke-dasharray="4 3"/>
            <line class="hg-sg-stem" x1="133.5" y1="92" x2="133.5" y2="118" stroke="${C.purple}" stroke-width="1.5" stroke-dasharray="4 3"/>
            <rect x="60" y="117" width="73.5" height="2" rx="1" fill="${C.red}"/>
            <line x1="60" y1="20" x2="60" y2="118" stroke="${C.red}" stroke-width="1.5"/>
            <text x="97" y="112" font-size="7" text-anchor="middle" fill="${C.red}">60 วัน</text>
            <rect class="hg-sg-glow" x="56" y="113" width="82" height="10" rx="3" fill="none" stroke="${C.orange}" stroke-width="2"/>
            <g class="hg-sg-grip"><circle cx="133.5" cy="92" r="4" fill="#fff" stroke="${C.green}" stroke-width="2"/></g>
            <g class="hg-sg-tip"><rect x="150" y="108" width="88" height="16" rx="5" fill="#1e2924"/><text x="194" y="119" font-size="7.5" text-anchor="middle" fill="#fff">🧲 ติดเส้นแนวนอน</text></g>
            <text x="194" y="84" font-size="6.5" text-anchor="middle" fill="${C.mute}">ค่าเริ่มต้น: จบที่ขอบตาราง</text>
            ${cursor("hg-cur-sg", 134, 93)}`),

        /* ---------- จัดบรรทัด ชิดซ้าย / กลาง / ชิดขวา ---------- */
        textAlign: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <g><rect x="64" y="18" width="132" height="22" rx="6" fill="#1e2924"/>
                ${[0, 1, 2].map(i => `<rect class="hg-ta-on hg-ta-on${i}" x="${70 + i * 42}" y="21" width="36" height="16" rx="4" fill="${C.green}"/>`).join("")}
                ${[0, 1, 2].map(i => [[2, 14], i === 0 ? [2, 10] : i === 2 ? [6, 14] : [4, 12], [2, 14]].map(([a, b], r) => `<rect x="${80 + i * 42 + a}" y="${24 + r * 3.6}" width="${b - a}" height="1.6" rx=".8" fill="#fff"/>`).join("")).join("")}</g>
            <rect x="60" y="54" width="140" height="66" rx="6" fill="#fff" stroke="${C.blue}" stroke-dasharray="3 2"/>
            <rect class="hg-ta-l" style="--c:19px;--r:38px" x="66" y="64" width="90" height="8" rx="3" fill="${C.ink}"/>
            <rect class="hg-ta-l" style="--c:34px;--r:68px" x="66" y="80" width="60" height="8" rx="3" fill="${C.ink}" opacity=".75"/>
            <rect class="hg-ta-l" style="--c:26.5px;--r:53px" x="66" y="96" width="75" height="8" rx="3" fill="${C.ink}" opacity=".55"/>
            <text x="130" y="138" font-size="7" text-anchor="middle" fill="${C.mute}">ข้อความอยู่ที่เดิม จัดแค่บรรทัดข้างใน</text>
            ${cursor("hg-cur-ta", 88, 30)}`),

        /* ---------- Tab จัดคอลัมน์ ---------- */
        tabAlign: () => svg(`
            <rect width="260" height="150" rx="10" fill="#ffffff"/>
            <rect x="24" y="24" width="212" height="92" rx="8" fill="#fff" stroke="${C.line}"/>
            <text x="34" y="40" font-size="8" font-weight="700" fill="${C.ink}">Term of Payment</text>
            ${[["Deposit", 58], ["Down (10%)", 76], ["Transfer (85%)", 94]].map(([t, y], i) => `
                <text x="34" y="${y}" font-size="8" fill="${C.ink}">${t}</text>
                <g class="hg-tab-col hg-tab-col${i}"><text x="132" y="${y}" font-size="8" fill="${C.ink}">: 30 วัน</text></g>`).join("")}
            <line class="hg-tab-guide" x1="131" y1="48" x2="131" y2="100" stroke="${C.green}" stroke-dasharray="2 2"/>
            <g class="hg-tab-key"><rect x="96" y="124" width="68" height="18" rx="5" fill="#fff" stroke="${C.ink}"/><text x="130" y="136" font-size="8" text-anchor="middle" fill="${C.ink}" font-weight="700">Tab ⇥</text></g>`),

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
            intro: "รู้จักหน้าตาโปรแกรม หน้าเริ่มต้น และขั้นตอนทำแผนแบบเร็วที่สุด",
            topics: [
                { title: "หน้าตาโปรแกรม", art: "layout",
                  steps: ["แถบเครื่องมือด้านบน — ไฟล์ รูปภาพ เพิ่มงาน/เส้น/ข้อความ ช่วงเวลา มุมมอง ค้นหา",
                          "หัวกระดาน — ชื่อแผน / ลูกค้า / โลโก้ · ＋ หมวดหมู่ อยู่ซ้ายหัวเดือน",
                          "ซ้าย = หมวดหมู่ + ผู้เกี่ยวข้อง · ขวา = ตารางเวลา",
                          "ใต้ตาราง = ช่องเส้นวันที่ (ติดตาราง เส้นวันที่ลากต่อกัน) → แถบเลื่อนซ้าย-ขวา → บันทึกท้ายกระดาน + แถบบริษัท"],
                  tip: "เส้นขอบเขียวที่กระพริบในภาพ คือโซนที่กำลังอธิบาย" },
                { title: "หน้าเริ่มต้น", art: "startScreen",
                  steps: ["เปิดเว็บ / กด 🏠 → ทำต่อจากแผนเดิม · เริ่มจากเทมเพลต · สร้างแผนเปล่า",
                          "เริ่มจากเทมเพลต: คลิกชื่อทางซ้าย → เห็นภาพตัวอย่างทางขวา · คลิกภาพ = ขนาดจริง",
                          "ตั้งชื่อแผน + วันที่เริ่ม → สร้างแผน"],
                  tip: "ลากไฟล์ .json มาวางบนหน้าเริ่มต้นเพื่อเปิดแผนได้เลย" },
                { title: "ทำแผนแรก", art: "taskAdd",
                  steps: ["แผนเปล่าเริ่มที่ 1 ต.ค. → 28 ก.พ. · หมวดปกติ / หมวดเล็ก / หมวดปกติ (เปลี่ยนได้ทั้งหมด)",
                          "ตั้งวันเริ่ม–วันจบที่การ์ดช่วงเวลา",
                          "กด ＋ งาน → กล่องเต็มหมวดพอดี แล้วลากไปวันที่ต้องการ",
                          "ใส่เส้นวันที่ / ข้อความ แล้วพิมพ์ A3 ได้เลย"],
                  tip: "ทุกอย่างบันทึกอัตโนมัติ ไม่ต้องกดเซฟ" },
                { title: "บันทึกอัตโนมัติ & หลายแผน", art: "save",
                  steps: ["ทุกการแก้ไขบันทึกเองภายใน 3 วินาที — ดูป้าย ✓ บันทึกแล้ว ข้างชื่อแผน",
                          "ช่องชื่อแผนมุมซ้ายบน = สลับแผน · ＋ แผนใหม่ · ✎ เปลี่ยนชื่อ · ลบ",
                          "ชื่อยาวแสดง … ในช่อง — ชี้ค้างเพื่อดูชื่อเต็ม"],
                  tip: "ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้ — ย้ายเครื่องดูหมวด 💾" },
                { title: "หน้าต่างตั้งค่า ลากย้ายได้", art: "panelDrag",
                  steps: ["หน้าต่างตั้งค่าทุกบาน (สี สถานะ หมวดหมู่ แถว ข้อความ รูป ชุดสำเร็จ ฯลฯ) มีแถบ ━ ด้านบน",
                          "กดค้างที่แถบ (หรือขอบว่างของหน้าต่าง) แล้วลากไปวางตรงไหนก็ได้",
                          "เปิดขึ้นมาล้นจอ → ดันกลับเข้าจอเอง · สูงกว่าจอ → เลื่อนดูในหน้าต่าง",
                          "ดับเบิลคลิกแถบ = กลับตำแหน่งเดิม"] }
            ]
        },
        {
            id: "toolbar", icon: "🧰", name: "แถบเครื่องมือ & มุมมอง", color: "#2f7442",
            intro: "ปุ่มจัดเป็นกลุ่ม · ปกติสีขาว กดใช้งานอยู่สีเขียว",
            topics: [
                { title: "กลุ่มปุ่ม & สีของปุ่ม", art: "ribbon",
                  steps: ["ซ้าย: ไฟล์ (Import · Export · พิมพ์ A3) และ รูปภาพ · แปะรูป",
                          "กลาง: ＋ งาน · เส้นวันที่ · เส้นแนวนอน · Text · เทมเพลต · ชุดสำเร็จ · ผู้เกี่ยวข้อง",
                          "ขวา: ค้นหา · ขนาดโดยรวม [ − | % | + ] · ธีม · ภาษา · ↕ เท่ากระดาษ · ↔ ทั้งแผน",
                          "กดปุ่ม = เขียววาบ · ปุ่มที่เปิดเมนู/แผงอยู่ = เขียวค้างจนกว่าจะปิด"],
                  tip: "จอแคบ ปุ่มเรียงต่อกันและซ่อนชื่อ — ชี้ค้างเพื่อดูชื่อปุ่ม" },
                { title: "การ์ดช่วงเวลา (วันเริ่ม → วันจบ)", art: "rangeCard",
                  steps: ["คลิกวันที่ในการ์ด = เลือกวันเริ่ม / วันจบ",
                          "ปุ่ม − + ใต้ เริ่ม / จบ = ลดหรือเพิ่มทีละ 1 เดือน",
                          "ปุ่ม ซ่อน/รวบวัน อยู่ในการ์ดนี้ (ดูหมวด 🪗)"] },
                { title: "งานอยู่กับที่ / งานตามวันเริ่ม", art: "linkShift",
                  steps: ["ปุ่มข้างวันที่: ⛓ งานอยู่กับที่ (ขาว) ↔ 🔗 งานตามวันเริ่ม (เขียว) — กดสลับ",
                          "งานอยู่กับที่ = เปลี่ยนวันเริ่ม แล้วงาน / เส้น / รูป อยู่วันที่เดิม",
                          "งานตามวันเริ่ม = เปลี่ยนวันเริ่ม แล้วทั้งแผนเลื่อนตามไปด้วย หน้าตาเหมือนเดิม"],
                  tip: "เลื่อนผิด กด Ctrl+Z ย้อนกลับได้" },
                { title: "↕ เท่ากระดาษ · ↔ ทั้งแผน", art: "viewModes",
                  steps: ["↕ เท่ากระดาษ (เขียว = เปิด) — ตารางสูงเท่าตอนพิมพ์ ทุกอย่างอยู่ในจอเดียว",
                          "↔ ทั้งแผน (เขียว = เปิด) — แผนไม่เกิน 6 เดือน พอดีความกว้างตาราง",
                          "ตารางเห็นสูงสุด 6 เดือน × 3 หมวด — เกินนั้นเลื่อนดูด้วย scrollbar",
                          "กดอีกครั้ง = ปิด กลับไปผังเดิม · เครื่องจำไว้ให้"],
                  tip: "ไม่มีผลกับภาพพิมพ์ / Export" },
                { title: "ซูม & ค้นหา", art: "keys",
                  steps: ["[ − | % | + ] = ย่อ / ขยายตาราง (ขยายแล้วเลื่อนดูได้)",
                          "ช่องค้นหา (Ctrl+K) = หางาน / คำสั่ง แล้วพาไปที่นั้น"],
                  keys: [["Ctrl", "K"]] }
            ]
        },
        {
            id: "category", icon: "🗂", name: "หมวดหมู่ & แถว", color: "#e86fa8",
            intro: "หมวดหมู่ด้านซ้าย · หมวดเล็ก (สูงครึ่งเดียว) · แถวผู้เกี่ยวข้อง",
            topics: [
                { title: "เพิ่มหมวด: ปกติ / หมวดเล็ก", art: "catAdd",
                  steps: ["กด ＋ หมวดหมู่ (ซ้ายหัวเดือน)",
                          "เลือกชนิด: หมวดปกติ หรือ หมวดเล็ก (สูงครึ่งหนึ่ง เหมาะกับงวดชำระเงิน)",
                          "ตั้งชื่อ + สี → ตกลง (คลิกช่องชื่อ = เลือกชื่อที่เคยใช้)"],
                  tip: "หมวดใหม่ต่อท้ายด้านล่างสุด ตารางเลื่อนลงให้เห็นเอง" },
                { title: "หมวดเล็ก", art: "catPayment",
                  steps: ["สูงครึ่งหนึ่งของหมวดปกติ · 1 แถว",
                          "แผนเปล่าเริ่มด้วย หมวดปกติ → หมวดเล็ก → หมวดปกติ",
                          "ทำได้ทุกอย่างเหมือนหมวดปกติ: ชื่อ สี ⋮ เพิ่ม/ลบแถว วางงาน ลบหมวด"] },
                { title: "ชื่อหมวด / แถว & ตำแหน่งข้อความ", art: "catText",
                  steps: ["คลิกชื่อหมวด / ชื่อบริษัท / บทบาท แล้วพิมพ์ได้เลย (ค่าเริ่มต้นตัวอักษร 15)",
                          "Enter = ขึ้นบรรทัดใหม่ · Tab = ช่องถัดไป · Ctrl+Enter = ไปแถวถัดไป · คลิกที่อื่น = เสร็จ",
                          "⋮ ที่หมวด = สี · ตำแหน่งข้อความ 9 จุด · ขนาด A− A+ · ตัวหนา · เพิ่ม/ลบแถว · ลบหมวด",
                          "ตารางเห็นทีละ 3 หมวด — มีมากกว่านั้นเลื่อนขึ้นลงด้วย scrollbar ซ้ายมือ"] }
            ]
        },
        {
            id: "task", icon: "📦", name: "กล่องงาน", color: "#4a90d9",
            intro: "เพิ่ม ย้าย ยืด พิมพ์ แต่งสี กล่องงานในตาราง",
            topics: [
                { title: "เพิ่มกล่องงาน", art: "taskAdd",
                  steps: ["กด ＋ งาน บนแถบเครื่องมือ",
                          "ตั้งชื่อ / วันที่ / สถานะ ในหน้าต่างที่ขึ้นมา",
                          "กดตกลง → กล่องสูงเต็มหมวด ขอบบน-ล่างตรงเส้นหมวดพอดี"] },
                { title: "ย้ายวัน / แม่เหล็กหมวด", art: "magnet",
                  steps: ["กดค้างที่กล่องแล้วลากซ้าย-ขวา = เปลี่ยนวัน (ลากชิดขอบ ตารางเลื่อนตามให้)",
                          "กล่องเต็มหมวดมีแม่เหล็ก 🧲: ลากขึ้นลงนิดหน่อยยังติดหมวดเดิม",
                          "ลากลึกจนกึ่งกลางกล่องถึงครึ่งหมวดถัดไป = ย้ายหมวด และเต็มหมวดนั้นพอดี (หมวดเล็กก็พอดี)",
                          "กล่องทั่วไป: ขอบเข้าใกล้เส้นหมวด → ดูดติดเส้น · กด Alt ค้าง = ลากอิสระ"],
                  keys: [["←", "→"], ["↑", "↓"], ["Alt", "ลาก"]] },
                { title: "ยืด / หด ระยะเวลา", art: "taskResize",
                  steps: ["เอาเมาส์ไปที่ขอบซ้ายหรือขวาของกล่อง", "ลากออก = นานขึ้น · ลากเข้า = สั้นลง", "หรือ Shift + ← → ปรับวันจบ"],
                  keys: [["Shift", "← →"]] },
                { title: "พิมพ์ข้อความในกล่อง", art: "taskType",
                  steps: ["คลิกกล่อง 1 ครั้ง = เลือก · คลิกซ้ำ = เริ่มพิมพ์",
                          "Enter = เสร็จ · Shift+Enter = ขึ้นบรรทัดใหม่ · Esc = ยกเลิก",
                          "✏️ แก้ข้อความ ในเมนูกล่อง = ช่องพิมพ์ใหญ่"] },
                { title: "แต่งข้อความบางส่วน (กล่องงาน · ป้ายเส้นวันที่ · Text)", art: "richText",
                  steps: ["คลิกเข้าไปพิมพ์ในกล่องงาน ป้ายเส้นวันที่ หรือกล่อง Text แล้วลากคลุมตัวอักษรบางส่วน",
                          "แถบด้านบน: A− / A+ / B ทำเฉพาะส่วนที่คลุม",
                          "เพิ่มเติม: A สีตัวอักษร · I ตัวเอียง · U ขีดเส้นใต้ · ⨯ ล้างรูปแบบ"],
                  keys: [["Ctrl", "B"], ["Ctrl", "I"], ["Ctrl", "U"]],
                  tip: "ไม่ได้คลุม = ปรับทั้งกล่อง · แก้ด้วยช่องพิมพ์ใหญ่ รูปแบบบางส่วนจะหาย" },
                { title: "ย้ายข้อความในกล่องอิสระ", art: "labelFree",
                  steps: ["กดค้างที่ตัวหนังสือในกล่องแล้วลาก", "วางตรงไหนก็ได้ ออกนอกกล่องได้", "กด Alt ค้างระหว่างลาก = ดูดเข้า 9 ตำแหน่งมาตรฐาน"],
                  tip: "เลือกตำแหน่งข้อความจากเมนูกล่อง = กลับไปตำแหน่งมาตรฐาน" },
                { title: "ยืดช่องข้อความ (แนวนอน / แนวตั้ง)", art: "vertResize",
                  steps: ["เลือกกล่อง → ที่จับสองข้างข้อความ ลากเพื่อยืดช่องพิมพ์ (ยื่นออกนอกกล่องได้)",
                          "ข้อความแนวตั้ง (หมุนด้วย A→) → ที่จับอยู่บน-ล่าง",
                          "ดับเบิลคลิกที่จับ = ขนาดอัตโนมัติ"] },
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
                  steps: ["＋ เส้นวันที่ = เส้นทึบ พร้อมป้ายชื่อในช่องเส้นวันที่",
                          "คลิกเลขวันบนหัวตาราง = เส้นประ (เส้นแนวตั้ง) กลางช่องของวันนั้น",
                          "ลากเส้น / ป้าย เพื่อเปลี่ยนวัน · คลิก = เมนูปรับแต่ง สี",
                          "ความหนาเส้น: ลากแถบเลื่อนในเมนู (0.5 – 6 px) เส้นเปลี่ยนตามทันที · ปุ่มลัด บาง / ปกติ / หนา",
                          "เส้นทึบลากต่อจากตารางลงไปถึงป้ายไม่ขาด ทั้งบนจอ ตอนพิมพ์ และ Export",
                          "ป้ายชื่อไม่มีกรอบ / สามเหลี่ยม (ดูสะอาด) — ชี้เมาส์เห็นกรอบจาง ๆ · คลิก ลาก พิมพ์ ยืดย่อ ได้เหมือนเดิม"],
                  tip: "คลิกเลขวัน = เส้นประ · กดค้างแล้วลากบนเลขวัน = เลือกช่วงเพื่อซ่อน/รวบ" },
                { title: "ปลายเส้นประ: ยืด / หด & ดูดติดเส้นแนวนอน", art: "stemGrip",
                  steps: ["ค่าเริ่มต้น เส้นประจบที่ขอบล่างตาราง (ไม่ยื่นลงช่องเส้นวันที่)",
                          "ชี้ที่ปลายเส้น → จุดเขียว · ลากลง = ยืดลงช่องเส้นวันที่ · ลากขึ้น = หด",
                          "ลากผ่านปลายเส้นแนวนอน → 🧲 ดูดติดพอดี · ย้ายเส้นแนวนอนทีหลัง ปลายเส้นตามไปเอง",
                          "ดับเบิลคลิกจุดเขียว = ยาวเต็มช่อง ↔ กลับขอบตาราง"],
                  keys: [["Alt", "ลาก"], ["Ctrl", "Z"]],
                  tip: "Alt ค้างระหว่างลาก = ลากอิสระ ไม่ดูด" },
                { title: "ยืด / ย่อ กล่องป้ายเส้นวันที่", art: "chipResize",
                  steps: ["คลิกป้าย (เลือก) → ที่จับ ซ้าย · ขวา · ล่าง · มุม",
                          "ซ้าย / ขวา = กว้างขึ้น / แคบลง (ยังอยู่กึ่งกลางเส้น) · ล่าง = สูง / เตี้ย",
                          "ดับเบิลคลิกที่จับ = ขนาดเริ่มต้น"],
                  tip: "ตอนพิมพ์ / Export ป้ายขนาดเท่าบนจอ ไม่ทับกัน" },
                { title: "เส้นแนวนอน (ช่วงเวลา)", art: "hline",
                  steps: ["กด ＋ เส้นแนวนอน",
                          "ลากปลายเส้นไปใกล้เส้นวันที่ (ทึบ) หรือเส้นแนวตั้ง (ประ) → ดูดติดเอง",
                          "อยากให้เส้นประลงมาชนเส้นแนวนอน → ลากปลายเส้นประลงมา จะดูดติดให้ (ดูหัวข้อปลายเส้นประ)",
                          "ย้ายเส้นวันที่ทีหลัง ปลายเส้นแนวนอนยืดตามให้"] }
            ]
        },
        {
            id: "fold", icon: "🪗", name: "ซ่อน / รวบวัน", color: "#0f8a7e",
            intro: "ซ่อนวันที่ไม่ใช้ รวบเดือนหรือช่วงยาว ๆ ให้แคบ — วันที่เหลือกว้างขึ้นเต็มหน้าเอง · เปิดกลับได้ทุกเมื่อ",
            topics: [
                { title: "ลากเลือกช่วงบนเลขวัน", art: "foldDrag",
                  steps: ["กดค้างที่เลขวันบนหัวตาราง แล้วลากไปวันสุดท้ายของช่วง",
                          "ปล่อยเมาส์ → ซ่อนช่วงนี้ หรือ รวบช่วงนี้ (เหลือกี่วันก็ได้)",
                          "ช่วงที่ซ่อนเหลือแถบบาง ๆ — คลิกแถบ = เปิดกลับ",
                          "ที่ว่างที่ได้คืนมา แบ่งให้วันที่เหลือ → ช่องวันกว้างขึ้น ตารางเต็มหน้าพอดี (งานยังอยู่วันเดิม)"],
                  tip: "คลิกเลขวันเฉย ๆ (ไม่ลาก) ยังสร้างเส้นประเหมือนเดิม" },
                { title: "รวบเดือน & เสาร์–อาทิตย์", art: "foldMonth",
                  steps: ["คลิกขวาที่หัวตาราง (ชื่อเดือน / เลขวัน)", "รวบเดือน = ทั้งเดือนเหลือแถบแคบมีชื่อเดือน", "ซ่อนเสาร์–อาทิตย์ทั้งหมด ได้ในเมนูเดียวกัน"] },
                { title: "แผงจัดการ ซ่อน/รวบวัน", art: "foldPanel",
                  steps: ["กดปุ่ม )( ซ่อน/รวบวัน ในการ์ดช่วงเวลา",
                          "เห็นทุกช่วง — สวิตช์ = เปิด/ปิดชั่วคราว · ลบได้",
                          "👁 แสดงทุกวันชั่วคราว = ดูครบโดยไม่ลบช่วงที่ตั้งไว้"] },
                { title: "แว่นขยายเลขวัน", art: "lens",
                  steps: ["ตารางยาวหลายเดือน เลขวันจะเล็ก", "ชี้เมาส์ที่เลขวัน → แว่นขยายเลขนั้นให้อ่านง่าย", "วันที่มีเส้นวันที่ เลขในแว่นเป็นสีเดียวกับเส้น"] }
            ]
        },
        {
            id: "text", icon: "🔤", name: "ข้อความ & บันทึก", color: "#8e44ad",
            intro: "กล่อง Text อิสระ แม่เหล็ก การแต่งตัวอักษร และบันทึกท้ายกระดาน",
            topics: [
                { title: "กล่อง Text + แม่เหล็ก", art: "textBox",
                  steps: ["กด ＋ Text แล้วพิมพ์", "ลากกล่องเข้าใกล้งาน / เส้น / รูป → ขอบส้มกระพริบ", "กด 🧲 = ติดกัน ย้าย object แล้ว Text ตามไปด้วย"],
                  tip: "ติดแล้วปุ่ม 🧲 จะซ่อน — ชี้ตรงตำแหน่งปุ่มเพื่อปลด" },
                { title: "ย่อขยายกล่อง Text", art: "textResize",
                  steps: ["คลิกกล่อง Text → จุดจับที่มุมทั้ง 4", "ลากมุมไหนก็ได้ = ย่อ / ขยายกล่อง", "Delete = ลบ · Ctrl+D = ทำสำเนา · Esc = เลิกเลือก"],
                  keys: [["Delete"], ["Ctrl", "D"], ["Esc"]] },
                { title: "ขนาด ตัวหนา จุดหน้าประโยค", art: "textStyle",
                  steps: ["คลิกช่องที่พิมพ์ได้ → แถบเล็กขึ้นด้านบน", "A− / A+ = ขนาด · B = ตัวหนา · • = จุดหน้าประโยค", "ใช้ได้ทุกช่อง: กล่องงาน Text ป้ายเส้นวันที่ หมวดหมู่ แถว บันทึก หัวกระดาน"],
                  keys: [["Ctrl", "B"], ["Ctrl", "Shift", "8"], ["Ctrl", "Shift", "> <"]] },
                { title: "จัดบรรทัด ชิดซ้าย / กลาง / ชิดขวา", art: "textAlign",
                  steps: ["คลิกช่องที่พิมพ์ได้ → แถบเล็กด้านบน มี 3 ปุ่มจัดบรรทัด (ต่อจาก A→)",
                          "ชิดซ้าย (ชิดหน้า) · กึ่งกลาง · ชิดขวา (ชิดหลัง) — ปุ่มที่ใช้อยู่เป็นสีเขียว",
                          "ข้อความอยู่ที่เดิม ไม่ผูกกับตำแหน่ง 9 จุด — จัดแค่บรรทัดข้างใน · กดปุ่มเดิมซ้ำ = กลับค่าเดิม",
                          "ชื่อหมวด / ชื่อแถว / บทบาท: ก้อนข้อความอยู่ตำแหน่งเดิมในช่อง จัดเฉพาะบรรทัดในตัวข้อความ (เห็นชัดเมื่อมีหลายบรรทัด)",
                          "ใช้ได้ทุกช่อง: กล่องงาน Text ป้ายเส้นวันที่ หมวดหมู่ แถว บันทึก หัวกระดาน"],
                  tip: "ข้อความบรรทัดเดียวในช่องแคบจะไม่เห็นต่าง — ยืดช่องข้อความให้กว้างก่อน" },
                { title: "หมุนข้อความแนวตั้ง", art: "textRotate",
                  steps: ["คลิกช่องที่พิมพ์ได้", "กด A→ วนไป: แนวนอน → แนวตั้ง ↓ → แนวตั้ง ↑"] },
                { title: "บันทึกท้ายกระดาน", art: "layout",
                  steps: ["การ์ดบันทึกด้านล่าง (เช่น Term of Payment) — คลิกหัวข้อ / เนื้อหาแล้วพิมพ์ได้เลย",
                          "＋ เพิ่มบันทึกท้ายกระดาน = การ์ดใหม่ · ตัวอักษรเริ่มต้น 18 (ปรับด้วย A− A+)",
                          "ข้อความยาวเลื่อนดูในการ์ดได้"] },
                { title: "จัดคอลัมน์ให้ตรงด้วย Tab", art: "tabAlign",
                  steps: ["ตัวอักษรกว้างไม่เท่ากัน → เคาะ Space หลายทีให้ \":\" ตรงกันไม่ได้",
                          "พิมพ์หัวข้อ → กด Tab → พิมพ์ต่อ (เช่น  Deposit ⇥ : 30 วัน)",
                          "ทุกบรรทัดที่มี Tab ในช่องเดียวกัน เรียงตรงกันให้เอง (บรรทัดสั้นเติม Tab ให้)",
                          "Shift+Tab = ลบ Tab หน้าเคอร์เซอร์ · ใช้ได้ในบันทึกท้ายกระดาน และกล่อง Text"],
                  keys: [["Tab"], ["Shift", "Tab"]] }
            ]
        },
        {
            id: "image", icon: "🖼", name: "รูปภาพ & สติ๊กเกอร์", color: "#f2a541",
            intro: "ใส่รูป โลโก้ สติ๊กเกอร์ ปรับกรอบ ล็อก และครอบตัด",
            topics: [
                { title: "วางรูปในตาราง", art: "image",
                  steps: ["ลากไฟล์รูปจากเครื่องมาวางบนตาราง หรือกด รูปภาพ", "หรือคัดลอกรูปแล้วกด Ctrl+V", "แถบเครื่องมือรูป = ความโปร่งใส ชั้นหน้า/หลัง กรอบ มุมโค้ง ทำสำเนา ลบ"],
                  keys: [["Ctrl", "V"]] },
                { title: "กรอบรูป: ย่อขยาย / พอดีรูป", art: "imgFrame",
                  steps: ["ลากมุม = ย่อขยาย (คงสัดส่วนรูป)",
                          "ลากที่จับด้านข้าง = ยืด / หดกรอบด้านเดียว",
                          "▣ พอดีรูป (ในแถบเครื่องมือรูป) = หดกรอบกลับพอดีรูป"] },
                { title: "สติ๊กเกอร์ (แปะรูป)", art: "sticker",
                  steps: ["กด แปะรูป ▾ (กลุ่มรูปภาพ)", "คลิกรูป = แปะกลางตาราง · ลาก = วางตรงไหนก็ได้", "ลากลงช่องเส้นวันที่ได้ด้วย — สติ๊กเกอร์อยู่บนสุดเสมอ"] },
                { title: "ล็อกรูป", art: "imgLock",
                  steps: ["คลิกรูป → 🔒 ล็อก = ลากย้าย / ยืดไม่ได้", "รูปที่ล็อก คลิกได้ → แก้ความโปร่งใส ชั้น กรอบ ครอบตัด ได้", "🔓 ปลดล็อก หรือ 🗑 / Delete = ลบ ได้ตลอด"] },
                { title: "ครอบตัดรูป", art: "crop",
                  steps: ["ดับเบิลคลิกรูป หรือกด ✂ ในแถบเครื่องมือรูป", "ลากกรอบให้เหลือส่วนที่ต้องการ", "กดตกลง"] }
            ]
        },
        {
            id: "select", icon: "🧩", name: "เลือกหลายชิ้น & เลื่อนดู", color: "#2e8b57",
            intro: "เลือก ย้าย คัดลอก ลบ ทีละหลายชิ้น และเลื่อนดูตาราง",
            topics: [
                { title: "ลากคลุม → ย้าย / คัดลอก / ลบทั้งกลุ่ม", art: "marquee",
                  steps: ["กดค้างที่ที่ว่างในตาราง (หรือที่ว่างใต้ตาราง) แล้วลากเป็นกรอบ",
                          "ทุกชิ้นในกรอบถูกเลือก — งาน เส้น Text รูป",
                          "ลากชิ้นไหนก็ได้ = ย้ายทั้งกลุ่ม · Delete = ลบทั้งหมด",
                          "Ctrl+C / Ctrl+V = คัดลอก / วางครบทั้งกลุ่ม (รวมข้อความที่ติดแม่เหล็ก)"],
                  keys: [["Shift", "คลิก"], ["Delete"], ["Ctrl", "C"], ["Ctrl", "V"]] },
                { title: "เลื่อนดูตาราง", art: "pan",
                  steps: ["กด Space ค้าง แล้วลาก = เลื่อนตาราง (ลากบนกล่องงานก็ได้)", "หรือกดปุ่มกลางเมาส์ (ล้อ) ค้างแล้วลาก", "ล้อเมาส์ในตาราง = เลื่อนขึ้นลง · scrollbar ล่าง / ซ้าย"],
                  keys: [["Space", "ลาก"]] }
            ]
        },
        {
            id: "reuse", icon: "⭐", name: "เทมเพลต & ชุดสำเร็จ", color: "#d4a20a",
            intro: "เก็บการจัดวางไว้ใช้ซ้ำ — ทั้งแผน (เทมเพลต) หรือบางชิ้น (ชุดสำเร็จ) · จำแค่การจัดวาง ไม่จำวันที่",
            topics: [
                { title: "บันทึกเทมเพลต", art: "tplSave",
                  steps: ["จัดแผนให้เรียบร้อย → 📋 เทมเพลต → ＋ บันทึกแผนนี้เป็นเทมเพลต",
                          "จำการจัดวางทุกอย่าง: ตำแหน่ง ขนาด สี ความโปร่งใส ฟอนต์ ข้อความ รูป เส้นที่เชื่อมกัน หมวด/แถว",
                          "ไม่จำวันที่ — ใช้ทีหลังที่วันไหนก็ได้ หน้าตาเหมือนตอนบันทึกเป๊ะ"] },
                { title: "ใช้เทมเพลต", art: "planShift",
                  steps: ["📋 เทมเพลต → ชี้ชื่อ = ดูภาพตัวอย่าง · 👁 = ขนาดจริง",
                          "คลิกชื่อ → สร้างแผนใหม่ / แทนที่แผนที่เปิดอยู่",
                          "\"วางแผนเริ่มที่วันที่\" = ตามผังตอนนี้ (เปลี่ยนได้) → ทั้งแผนเลื่อนไปเริ่มวันนั้น"],
                  tip: "เสาร์–อาทิตย์ที่ซ่อนไว้ คำนวณใหม่ให้ตรงวันของช่วงใหม่" },
                { title: "บันทึกชุดสำเร็จ", art: "presetSave",
                  steps: ["ลากคลุม object ที่ใช้บ่อย",
                          "⭐ ชุดสำเร็จ ▾ → ＋ บันทึกที่เลือกเป็นชุด → ตั้งชื่อ",
                          "จำการจัดวาง + ถ่ายภาพจริงของชุดไว้ให้ (ไม่จำวันที่)"] },
                { title: "วางชุดสำเร็จ", art: "presetPlace",
                  steps: ["เปิด ⭐ ชุดสำเร็จ → ชี้การ์ด = ภาพจริง + กรอบเส้นประเขียวขนาดจริงบนตาราง",
                          "คลิกการ์ด = วางช่วงที่เห็นบนจอ แถว/หมวดเดิม · ลากการ์ด = วางตรงที่ปล่อย",
                          "เลือกวันใน 📅 วางที่ = วางวันนั้น · วางแล้วติดเป็นกลุ่ม (Alt+คลิก = เลือกชิ้นเดียว)"] },
                { title: "ให้ทั้งทีมเห็น (ตั้งชื่อไฟล์)", art: "template",
                  steps: ["เทมเพลต: 📋 → กด ⬆ ข้างชื่อ → ได้ไฟล์ → ตั้งชื่อ template1.json, template2.json … → ใส่โฟลเดอร์ templates/",
                          "ชุดสำเร็จ: ⭐ → ⬆ Export (ชุดของฉันทั้งหมดในไฟล์เดียว) → ตั้งชื่อ preset1.json, preset2.json … → ใส่โฟลเดอร์ presets/",
                          "ตัวพิมพ์เล็ก · เลขเริ่ม 1 เรียงติดกัน ห้ามข้ามเลข · สูงสุด 50 ไฟล์",
                          "commit + push ขึ้นเว็บ → ทุกเครื่องเห็น (ต้องเปิดผ่าน Vercel / Live Server)"],
                  tip: "มี template1 กับ template3 แต่ไม่มี template2 → template3 จะไม่ขึ้น" }
            ]
        },
        {
            id: "output", icon: "🖨", name: "พิมพ์ & Export", color: "#5b6cc4",
            intro: "พิมพ์ A3 เต็มหน้า และส่งออกเป็น PDF / รูป / ไฟล์แผน · ตารางบนจอไม่เปลี่ยนหลังพิมพ์",
            topics: [
                { title: "พิมพ์ A3", art: "printA3",
                  steps: ["กด พิมพ์ A3 (กลุ่มไฟล์ ซ้ายบน) หรือ Ctrl+P",
                          "ได้ภาพกระดานทั้งแผน ยืดเต็มกระดาษ A3 แนวนอน + แถบบริษัทด้านล่าง (โลโก้ · ZERO GREEN CO., LTD. · เบอร์โทร / อีเมล)",
                          "หัวข้อแผนขยายให้อ่านชัด · ป้ายเส้นวันที่ขนาดเท่าบนจอ ไม่ทับกัน",
                          "เส้นวันที่ลากต่อจากตารางลงช่องเส้นวันที่ไม่ขาด เหมือนบนจอ"],
                  keys: [["Ctrl", "P"]],
                  tip: "คลิกที่ว่างให้ไม่มีชิ้นไหนถูกเลือกค้างก่อนพิมพ์" },
                { title: "Export PDF / PNG / JPEG / JSON", art: "exportImg",
                  steps: ["กด Export ▾ (ข้าง Import)",
                          "PDF / PNG / JPEG = ภาพ A3 แบบเดียวกับพิมพ์ (บันทึกท้ายกระดานตัวใหญ่ขึ้น · กล่องข้อความอยู่ที่เดิม)",
                          "JSON = ไฟล์แผน เอาไปเปิดเครื่องอื่น / เก็บสำรอง"] },
                { title: "Import (เปิดไฟล์แผน)", art: "backup",
                  steps: ["กด Import แล้วเลือกไฟล์ .json", "หรือกด 🏠 แล้วลากไฟล์ .json มาวางบนหน้าเริ่มต้น", "เลือกเปิดเป็นแผนใหม่ หรือแทนที่แผนที่เปิดอยู่"] }
            ]
        },
        {
            id: "data", icon: "💾", name: "บันทึก & ย้ายเครื่อง", color: "#5f6a64",
            intro: "ข้อมูลอยู่ที่ไหน และย้ายไปเครื่องอื่นยังไงไม่ให้หาย",
            topics: [
                { title: "ย้ายแผนไปเครื่องอื่น", art: "backup",
                  steps: ["เครื่องเดิม: Export ▾ → JSON", "เครื่องใหม่: Import (หรือลากไฟล์ .json มาวางบนหน้าเริ่มต้น)", "เทมเพลต / ชุดของทีม: ใส่ไฟล์ในโฟลเดอร์ templates/ presets/ แล้ว push (ดูหมวด ⭐)"],
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
                    [["Ctrl", "Z"], "ย้อนกลับ"], [["Ctrl", "Y"], "ทำซ้ำ"], [["Ctrl", "K"], "ค้นหางาน / คำสั่ง"], [["Ctrl", "P"], "พิมพ์ A3"],
                    [["Delete"], "ลบที่เลือก (รวมกล่อง Text / รูป)"], [["Ctrl", "C"], "คัดลอก"], [["Ctrl", "V"], "วาง"], [["Ctrl", "D"], "ทำสำเนา"],
                    [["Ctrl", "B / I / U"], "ตัวหนา / เอียง / ขีดเส้นใต้"], [["Alt", "ลากกล่อง"], "ลากอิสระ (ไม่ดูดหมวด)"], [["Alt", "ลากข้อความ"], "ดูดเข้าตำแหน่งมาตรฐาน"],
                    [["← →"], "เลื่อนทีละวัน"], [["Shift", "← →"], "ยืด/หด วันจบ"], [["↑ ↓"], "ย้ายแถว"],
                    [["Space", "ลาก"], "เลื่อนตาราง"], [["ลาก", "เลขวัน"], "เลือกช่วงเพื่อซ่อน / รวบ"], [["คลิกขวา", "หัวตาราง"], "เมนูซ่อน / รวบวัน"],
                    [["Esc"], "ปิดเมนู / เลิกเลือก"], [["T"], "เปิด/ปิดเส้นวันนี้"], [["?", "F1"], "เปิดวิธีใช้"]
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

/* แถบเครื่องมือ */
.zg-hg-svg .hg-cur-rib { animation: hgCurRib 6s infinite; }
@keyframes hgCurRib { 0% { transform: translate(150px, 120px); } 15%, 36% { transform: translate(99px, 44px); } 50%, 86% { transform: translate(48px, 30px); } 100% { transform: translate(150px, 120px); } }
.zg-hg-svg .hg-tile-on { animation: hgTileOn 6s infinite; }
@keyframes hgTileOn { 0%, 18% { fill: #ffffff; stroke: #d6ddd9; } 21%, 30% { fill: #3a8a4f; stroke: #3a8a4f; } 34%, 100% { fill: #ffffff; stroke: #d6ddd9; } }
.zg-hg-svg .hg-tile-on-t { animation: hgTileOnT 6s infinite; }
@keyframes hgTileOnT { 0%, 18% { fill: #26302b; } 21%, 30% { fill: #ffffff; } 34%, 100% { fill: #26302b; } }
.zg-hg-svg .hg-rib-task { animation: hgImg 6s infinite; transform-origin: center; animation-name: hgRibTask; }
@keyframes hgRibTask { 0%, 24% { opacity: 0; transform: translateY(-4px); } 30%, 92% { opacity: 1; transform: none; } 100% { opacity: 0; } }
.zg-hg-svg .hg-chip-exp { animation: hgChipExp 6s infinite; }
@keyframes hgChipExp { 0%, 50% { fill: #ffffff; stroke: #d6ddd9; } 53%, 86% { fill: #3a8a4f; stroke: #3a8a4f; } 90%, 100% { fill: #ffffff; stroke: #d6ddd9; } }
.zg-hg-svg .hg-chip-exp-t { animation: hgChipExpT 6s infinite; }
@keyframes hgChipExpT { 0%, 50% { fill: #26302b; } 53%, 86% { fill: #ffffff; } 90%, 100% { fill: #26302b; } }
.zg-hg-svg .hg-rib-menu { animation: hgRibMenu 6s infinite; }
@keyframes hgRibMenu { 0%, 52% { opacity: 0; transform: translateY(-4px); } 56%, 86% { opacity: 1; transform: none; } 90%, 100% { opacity: 0; } }

/* การ์ดช่วงเวลา */
.zg-hg-svg .hg-cur-range { animation: hgCurRange 4.4s infinite; }
@keyframes hgCurRange { 0% { transform: translate(120px, 130px); } 25%, 60% { transform: translate(191px, 79px); } 100% { transform: translate(120px, 130px); } }
.zg-hg-svg .hg-plus-on { animation: hgPlusOn 4.4s infinite; }
@keyframes hgPlusOn { 0%, 28% { fill: #ffffff; } 31%, 40% { fill: #3a8a4f; } 44%, 100% { fill: #ffffff; } }
.zg-hg-svg .hg-plus-on-t { animation: hgPlusOnT 4.4s infinite; }
@keyframes hgPlusOnT { 0%, 28% { fill: #26302b; } 31%, 40% { fill: #ffffff; } 44%, 100% { fill: #26302b; } }
.zg-hg-svg .hg-dateA { animation: hgSwapA 4.4s infinite; }
.zg-hg-svg .hg-dateB { animation: hgSwapB 4.4s infinite; }
@keyframes hgSwapA { 0%, 32% { opacity: 1; } 36%, 92% { opacity: 0; } 100% { opacity: 1; } }
@keyframes hgSwapB { 0%, 32% { opacity: 0; } 36%, 92% { opacity: 1; } 100% { opacity: 0; } }
.zg-hg-svg .hg-range-bar { animation: hgRangeBar 4.4s infinite; }
@keyframes hgRangeBar { 0%, 32% { width: 170px; } 45%, 92% { width: 196px; } 100% { width: 170px; } }

/* หน้าเริ่มต้น */
.zg-hg-svg .hg-cur-start { animation: hgCurStart 7s infinite; }
@keyframes hgCurStart { 0% { transform: translate(200px, 135px); } 14%, 26% { transform: translate(140px, 84px); } 40% { transform: translate(60px, 44px); } 48%, 56% { transform: translate(52px, 62px); } 72%, 92% { transform: translate(214px, 128px); } 100% { transform: translate(200px, 135px); } }
.zg-hg-svg .hg-home { animation: hgHome 7s infinite; }
@keyframes hgHome { 0%, 27% { opacity: 1; } 31%, 96% { opacity: 0; } 100% { opacity: 1; } }
.zg-hg-svg .hg-tplview { animation: hgTplView 7s infinite; }
@keyframes hgTplView { 0%, 28% { opacity: 0; transform: translateY(6px); } 33%, 95% { opacity: 1; transform: none; } 100% { opacity: 0; } }
.zg-hg-svg .hg-tplsel { animation: hgTplSel 7s infinite; }
@keyframes hgTplSel { 0%, 52% { transform: none; } 55%, 100% { transform: translateY(22px); } }
.zg-hg-svg .hg-pvA { animation: hgPvA 7s infinite; }
@keyframes hgPvA { 0%, 34% { opacity: 0; } 40%, 52% { opacity: 1; } 55%, 100% { opacity: 0; } }
.zg-hg-svg .hg-pvB { animation: hgPvB 7s infinite; }
@keyframes hgPvB { 0%, 55% { opacity: 0; } 60%, 95% { opacity: 1; } 100% { opacity: 0; } }
.zg-hg-svg .hg-make { animation: hgMake 7s infinite; transform-origin: center; }
@keyframes hgMake { 0%, 78% { transform: scale(1); } 81% { transform: scale(.92); } 85%, 100% { transform: scale(1); } }

/* ลากบนเลขวัน → ซ่อน */
.zg-hg-svg .hg-cur-fold { animation: hgCurFold 6s infinite; }
@keyframes hgCurFold { 0% { transform: translate(60px, 70px); } 10%, 14% { transform: translate(70px, 9px); } 36% { transform: translate(178px, 9px); } 44% { transform: translate(178px, 9px); } 52%, 58% { transform: translate(150px, 34px); } 76%, 100% { transform: translate(110px, 70px); } }
.zg-hg-svg .hg-fband { animation: hgFBand 6s infinite; }
@keyframes hgFBand { 0%, 14% { width: 0; opacity: 1; } 36%, 58% { width: 114px; opacity: 1; } 62%, 100% { width: 114px; opacity: 0; } }
.zg-hg-svg .hg-fmenu { animation: hgFMenu 6s infinite; }
@keyframes hgFMenu { 0%, 40% { opacity: 0; transform: translateY(-4px); } 44%, 58% { opacity: 1; transform: none; } 61%, 100% { opacity: 0; } }
.zg-hg-svg .hg-fmid { animation: hgFMid 6s infinite; }
@keyframes hgFMid { 0%, 59% { opacity: 1; } 63%, 94% { opacity: 0; } 100% { opacity: 1; } }
.zg-hg-svg .hg-fright { animation: hgFRight 6s infinite; }
@keyframes hgFRight { 0%, 59% { transform: none; } 66%, 94% { transform: translateX(-104px); } 100% { transform: none; } }
.zg-hg-svg .hg-fstrip { animation: hgFStrip 6s infinite; }
@keyframes hgFStrip { 0%, 60% { opacity: 0; } 66%, 94% { opacity: 1; } 100% { opacity: 0; } }

/* รวบเดือน */
.zg-hg-svg .hg-cur-month { animation: hgCurMonth 6s infinite; }
@keyframes hgCurMonth { 0% { transform: translate(60px, 100px); } 15%, 24% { transform: translate(128px, 10px); } 36%, 46% { transform: translate(150px, 32px); } 70%, 100% { transform: translate(60px, 100px); } }
.zg-hg-svg .hg-mmenu { animation: hgMMenu 6s infinite; }
@keyframes hgMMenu { 0%, 24% { opacity: 0; transform: translateY(-4px); } 28%, 46% { opacity: 1; transform: none; } 49%, 100% { opacity: 0; } }
.zg-hg-svg .hg-mmid { animation: hgFMidM 6s infinite; }
@keyframes hgFMidM { 0%, 48% { opacity: 1; } 53%, 94% { opacity: 0; } 100% { opacity: 1; } }
.zg-hg-svg .hg-mright { animation: hgMRight 6s infinite; }
@keyframes hgMRight { 0%, 48% { transform: none; } 56%, 94% { transform: translateX(-64px); } 100% { transform: none; } }
.zg-hg-svg .hg-mstrip { animation: hgFStripM 6s infinite; }
@keyframes hgFStripM { 0%, 50% { opacity: 0; } 56%, 94% { opacity: 1; } 100% { opacity: 0; } }

/* แผงซ่อน/รวบวัน */
.zg-hg-svg .hg-cur-panel { animation: hgCurPanel 4.4s infinite; }
@keyframes hgCurPanel { 0% { transform: translate(120px, 130px); } 25%, 70% { transform: translate(193px, 49px); } 100% { transform: translate(120px, 130px); } }
.zg-hg-svg .hg-tg1 { animation: hgTg1 4.4s infinite; }
@keyframes hgTg1 { 0%, 30% { transform: none; } 35%, 65% { transform: translateX(-10px); } 70%, 100% { transform: none; } }
.zg-hg-svg .hg-tg1-bg { animation: hgTg1Bg 4.4s infinite; }
@keyframes hgTg1Bg { 0%, 30% { fill: #3a8a4f; } 35%, 65% { fill: #c9d1cd; } 70%, 100% { fill: #3a8a4f; } }

/* แว่นขยายเลขวัน */
.zg-hg-svg .hg-lens { animation: hgLens 6s infinite; }
@keyframes hgLens { 0%, 24% { transform: translate(69px, 67px); } 34%, 58% { transform: translate(137px, 67px); } 68%, 92% { transform: translate(206px, 67px); } 100% { transform: translate(69px, 67px); } }
.zg-hg-svg .hg-ln1 { animation: hgLn1 6s infinite; }
.zg-hg-svg .hg-ln2 { animation: hgLn2 6s infinite; }
.zg-hg-svg .hg-ln3 { animation: hgLn3 6s infinite; }
@keyframes hgLn1 { 0%, 26% { opacity: 1; } 29%, 97% { opacity: 0; } 100% { opacity: 1; } }
@keyframes hgLn2 { 0%, 30% { opacity: 0; } 33%, 60% { opacity: 1; } 63%, 100% { opacity: 0; } }
@keyframes hgLn3 { 0%, 64% { opacity: 0; } 67%, 94% { opacity: 1; } 97%, 100% { opacity: 0; } }

/* เลื่อนดูตาราง */
.zg-hg-svg .hg-pan { animation: hgPan 5s infinite; }
@keyframes hgPan { 0%, 15% { transform: none; } 50%, 62% { transform: translateX(-110px); } 92%, 100% { transform: none; } }
.zg-hg-svg .hg-hand { animation: hgHand 5s infinite; }
@keyframes hgHand { 0%, 15% { transform: translateX(40px); } 50%, 62% { transform: translateX(-60px); } 92%, 100% { transform: translateX(40px); } }
.zg-hg-svg .hg-spacekey { animation: hgSpaceKey 5s infinite; }
@keyframes hgSpaceKey { 0%, 8% { transform: none; } 12%, 90% { transform: translateY(2.5px); } 95%, 100% { transform: none; } }

/* ย่อขยาย Text */
.zg-hg-svg .hg-tbox { animation: hgTBox 4s infinite; }
@keyframes hgTBox { 0%, 15% { width: 100px; height: 34px; } 55%, 88% { width: 150px; height: 54px; } 100% { width: 100px; height: 34px; } }
.zg-hg-svg .hg-h-tr { animation: hgHTr 4s infinite; }
@keyframes hgHTr { 0%, 15% { transform: none; } 55%, 88% { transform: translateX(50px); } 100% { transform: none; } }
.zg-hg-svg .hg-h-bl { animation: hgHBl 4s infinite; }
@keyframes hgHBl { 0%, 15% { transform: none; } 55%, 88% { transform: translateY(20px); } 100% { transform: none; } }
.zg-hg-svg .hg-h-br, .zg-hg-svg .hg-cur-tres { animation: hgHBr 4s infinite; }
@keyframes hgHBr { 0%, 15% { transform: none; } 55%, 88% { transform: translate(50px, 20px); } 100% { transform: none; } }

/* บันทึกเทมเพลต */
.zg-hg-svg .hg-saveflow { animation: hgSaveFlow 4.4s infinite; }
@keyframes hgSaveFlow { 0%, 10% { opacity: .2; transform: translateX(-8px); } 30%, 92% { opacity: 1; transform: none; } 100% { opacity: .2; } }
.zg-hg-svg .hg-clone { animation: hgClone 4.4s infinite; }
@keyframes hgClone { 0%, 30% { opacity: 0; } 45%, 92% { opacity: 1; } 100% { opacity: 0; } }
.zg-hg-svg .hg-okbadge { animation: hgOk 4.4s infinite; transform-origin: center; }
@keyframes hgOk { 0%, 50% { opacity: 0; transform: scale(.7); } 58%, 92% { opacity: 1; transform: scale(1); } 100% { opacity: 0; } }

/* วางแผนที่วันใหม่ */
.zg-hg-svg .hg-shift { animation: hgShift 5s infinite; }
@keyframes hgShift { 0%, 25% { transform: none; } 55%, 90% { transform: translateX(120px); } 100% { transform: none; } }
.zg-hg-svg .hg-shA { animation: hgSwapA2 5s infinite; }
.zg-hg-svg .hg-shB { animation: hgSwapB2 5s infinite; }
@keyframes hgSwapA2 { 0%, 22% { opacity: 1; } 26%, 92% { opacity: 0; } 100% { opacity: 1; } }
@keyframes hgSwapB2 { 0%, 22% { opacity: 0; } 26%, 92% { opacity: 1; } 100% { opacity: 0; } }

/* หมวด Payment */
.zg-hg-svg .hg-paycat { animation: hgImg 4s infinite; transform-origin: center; animation-name: hgPayCat; }
@keyframes hgPayCat { 0%, 15% { opacity: 0; transform: translateY(8px); } 30%, 92% { opacity: 1; transform: none; } 100% { opacity: 0; } }
.zg-hg-svg .hg-halfmark { animation: hgPayCat 4s infinite; }
.zg-hg-svg .hg-cur-kind { animation: hgCurKind 4.4s infinite; }
@keyframes hgCurKind { 0% { transform: translate(90px, 125px); } 25%, 45% { transform: translate(170px, 62px); } 75%, 92% { transform: translate(183px, 124px); } 100% { transform: translate(90px, 125px); } }
.zg-hg-svg .hg-kindpick { animation: hgKindPick 4.4s infinite; }
@keyframes hgKindPick { 0%, 28% { fill: #ffffff; stroke: #d6ddd9; } 32%, 92% { fill: #eef8f1; stroke: #3a8a4f; } 100% { fill: #ffffff; stroke: #d6ddd9; } }
.zg-hg-svg .hg-payname { animation: hgSwapB 4.4s infinite; }

/* แต่งข้อความบางส่วน */
.zg-hg-svg .hg-cur-rich { animation: hgCurRich 6s infinite; }
@keyframes hgCurRich { 0% { transform: translate(64px, 84px); } 18% { transform: translate(112px, 84px); } 30%, 38% { transform: translate(83px, 26px); } 46%, 52% { transform: translate(106px, 26px); } 60%, 70% { transform: translate(129px, 26px); } 85%, 100% { transform: translate(180px, 120px); } }
.zg-hg-svg .hg-rsel { animation: hgRSel 6s infinite; }
@keyframes hgRSel { 0%, 3% { width: 0; } 18%, 80% { width: 50px; } 88%, 100% { width: 0; opacity: 0; } }
.zg-hg-svg .hg-rpart { animation: hgRPart 6s infinite; }
@keyframes hgRPart { 0%, 33% { font-size: 11px; font-weight: 400; fill: #ffffff; } 38%, 48% { font-size: 15px; font-weight: 400; fill: #ffffff; } 52%, 62% { font-size: 15px; font-weight: 700; fill: #ffffff; } 66%, 94% { font-size: 15px; font-weight: 700; fill: #ffe14b; } 100% { font-size: 11px; font-weight: 400; fill: #ffffff; } }
.zg-hg-svg .hg-rbtn1 { animation: hgBtn 6s 1.9s infinite; } .zg-hg-svg .hg-rbtn2 { animation: hgBtn 6s 2.9s infinite; } .zg-hg-svg .hg-rbtn3 { animation: hgBtn 6s 3.9s infinite; }

/* ลากข้อความอิสระ */
.zg-hg-svg .hg-lfree, .zg-hg-svg .hg-lfree-box, .zg-hg-svg .hg-cur-lfree { animation: hgLFree 4.6s infinite; }
@keyframes hgLFree { 0%, 12% { transform: none; } 45%, 60% { transform: translate(70px, -36px); } 85%, 100% { transform: none; } }

/* ยืดข้อความแนวตั้ง */
.zg-hg-svg .hg-vbox { animation: hgVBox 4s infinite; }
@keyframes hgVBox { 0%, 15% { y: 50px; height: 50px; } 55%, 88% { y: 24px; height: 102px; } 100% { y: 50px; height: 50px; } }
.zg-hg-svg .hg-vh-top { animation: hgVTop 4s infinite; }
@keyframes hgVTop { 0%, 15% { transform: none; } 55%, 88% { transform: translateY(-26px); } 100% { transform: none; } }
.zg-hg-svg .hg-vh-bot, .zg-hg-svg .hg-cur-vres { animation: hgVBot 4s infinite; }
@keyframes hgVBot { 0%, 15% { transform: none; } 55%, 88% { transform: translateY(26px); } 100% { transform: none; } }

/* รูปที่ล็อก */
.zg-hg-svg .hg-cur-lock { animation: hgCurLock 5s infinite; }
@keyframes hgCurLock { 0% { transform: translate(-40px, 50px); } 18%, 40% { transform: none; } 70%, 92% { transform: translate(83px, 46px); } 100% { transform: translate(-40px, 50px); } }
.zg-hg-svg .hg-locksel { animation: hgSel2 5s infinite; }
@keyframes hgSel2 { 0%, 20% { opacity: 0; } 24%, 92% { opacity: 1; } 100% { opacity: 0; } }
.zg-hg-svg .hg-lockbar { animation: hgLockBar 5s infinite; }
@keyframes hgLockBar { 0%, 22% { opacity: 0; transform: translateY(6px); } 28%, 92% { opacity: 1; transform: none; } 100% { opacity: 0; } }

/* งานอยู่กับที่ / งานตามวันเริ่ม */
.zg-hg-svg .hg-cur-ls { animation: hgCurLs 6s infinite; }
@keyframes hgCurLs { 0% { transform: translate(150px, 120px); } 15%, 30% { transform: translate(144px, 20px); } 45%, 62% { transform: translate(51px, 20px); } 80%, 100% { transform: translate(150px, 120px); } }
.zg-hg-svg .hg-ls-btn { animation: hgLsBtn 6s infinite; }
@keyframes hgLsBtn { 0%, 22% { fill: #ffffff; stroke: #d6ddd9; } 25%, 95% { fill: #3a8a4f; stroke: #3a8a4f; } 100% { fill: #ffffff; stroke: #d6ddd9; } }
.zg-hg-svg .hg-ls-off { animation: hgLsOff 6s infinite; }
@keyframes hgLsOff { 0%, 22% { opacity: 1; } 25%, 95% { opacity: 0; } 100% { opacity: 1; } }
.zg-hg-svg .hg-ls-on { animation: hgLsOn 6s infinite; }
@keyframes hgLsOn { 0%, 22% { opacity: 0; } 25%, 95% { opacity: 1; } 100% { opacity: 0; } }
.zg-hg-svg .hg-ls-d1 { animation: hgLsD1 6s infinite; }
@keyframes hgLsD1 { 0%, 52% { opacity: 1; } 55%, 95% { opacity: 0; } 100% { opacity: 1; } }
.zg-hg-svg .hg-ls-d2 { animation: hgLsD2 6s infinite; }
@keyframes hgLsD2 { 0%, 52% { opacity: 0; } 55%, 95% { opacity: 1; } 100% { opacity: 0; } }
.zg-hg-svg .hg-ls-head { animation: hgLsHead 6s infinite; }
@keyframes hgLsHead { 0%, 55% { transform: none; } 70%, 95% { transform: translateX(-60px); } 100% { transform: none; } }

/* ↕ เท่ากระดาษ · ↔ ทั้งแผน */
.zg-hg-svg .hg-cur-vm { animation: hgCurVm 7s infinite; }
@keyframes hgCurVm { 0% { transform: translate(120px, 140px); } 15%, 30% { transform: translate(164px, 16px); } 50%, 65% { transform: translate(223px, 16px); } 85%, 100% { transform: translate(120px, 140px); } }
.zg-hg-svg .hg-vm-b1 { animation: hgVmB1 7s infinite; }
@keyframes hgVmB1 { 0%, 20% { fill: #ffffff; stroke: #d6ddd9; } 23%, 95% { fill: #3a8a4f; stroke: #3a8a4f; } 100% { fill: #ffffff; stroke: #d6ddd9; } }
.zg-hg-svg .hg-vm-t1 { animation: hgVmT1 7s infinite; }
@keyframes hgVmT1 { 0%, 20% { fill: #26302b; } 23%, 95% { fill: #ffffff; } 100% { fill: #26302b; } }
.zg-hg-svg .hg-vm-b2 { animation: hgVmB2 7s infinite; }
@keyframes hgVmB2 { 0%, 55% { fill: #ffffff; stroke: #d6ddd9; } 58%, 95% { fill: #3a8a4f; stroke: #3a8a4f; } 100% { fill: #ffffff; stroke: #d6ddd9; } }
.zg-hg-svg .hg-vm-t2 { animation: hgVmT2 7s infinite; }
@keyframes hgVmT2 { 0%, 55% { fill: #26302b; } 58%, 95% { fill: #ffffff; } 100% { fill: #26302b; } }
.zg-hg-svg .hg-vm-table { animation: hgVmTable 7s infinite; transform-origin: 0 0; transform-box: view-box; }
@keyframes hgVmTable { 0%, 22% { transform: none; } 32%, 95% { transform: translateY(0) scaleY(1.35); } 100% { transform: none; } }
.zg-hg-svg .hg-vm-br { animation: hgVmBr 7s infinite; }
@keyframes hgVmBr { 0%, 22% { transform: none; } 32%, 95% { transform: translateY(15px); } 100% { transform: none; } }
.zg-hg-svg .hg-vm-notes { animation: hgVmNotes 7s infinite; }
@keyframes hgVmNotes { 0%, 22% { y: 114px; height: 24px; } 32%, 95% { y: 129px; height: 9px; } 100% { y: 114px; height: 24px; } }
.zg-hg-svg .hg-vm-tasks { animation: hgVmTasks 7s infinite; transform-origin: 14px 0; transform-box: view-box; }
@keyframes hgVmTasks { 0%, 58% { transform: none; } 68%, 95% { transform: scaleX(.78); } 100% { transform: none; } }
.zg-hg-svg .hg-vm-more { animation: hgVmMore 7s infinite; }
@keyframes hgVmMore { 0%, 58% { opacity: 1; } 68%, 95% { opacity: 0; } 100% { opacity: 1; } }

/* หน้าต่างลากย้าย */
.zg-hg-svg .hg-pd-win { animation: hgPdWin 5s infinite; }
@keyframes hgPdWin { 0%, 20% { transform: none; } 55%, 85% { transform: translate(-120px, -6px); } 100% { transform: none; } }
.zg-hg-svg .hg-cur-pd { animation: hgCurPd 5s infinite; }
@keyframes hgCurPd { 0% { transform: translate(120px, 120px); } 15%, 20% { transform: translate(198px, 33px); } 55%, 85% { transform: translate(78px, 27px); } 100% { transform: translate(120px, 120px); } }

/* แม่เหล็กหมวด */
.zg-hg-svg .hg-cur-mg { animation: hgCurMg 6s infinite; }
@keyframes hgCurMg { 0% { transform: translate(135px, 42px); } 25% { transform: translate(135px, 58px); } 35% { transform: translate(135px, 58px); } 65%, 85% { transform: translate(135px, 92px); } 100% { transform: translate(135px, 42px); } }
.zg-hg-svg .hg-mg-rect { animation: hgMgRect 6s infinite; }
@keyframes hgMgRect { 0%, 50% { y: 12px; height: 60px; } 58%, 92% { y: 72px; height: 30px; } 100% { y: 12px; height: 60px; } }
.zg-hg-svg .hg-mg-icon { animation: hgMgIcon 6s infinite; transform-origin: center; }
@keyframes hgMgIcon { 0%, 20% { transform: scale(1); } 28% { transform: scale(1.25); } 36%, 52% { transform: scale(1); } 58% { transform: scale(1.25) rotate(-12deg); } 66%, 100% { transform: scale(1); } }

/* กล่องป้ายเส้นวันที่ */
.zg-hg-svg .hg-cr-box { animation: hgCrBox 4.4s infinite; }
@keyframes hgCrBox { 0%, 15% { x: 95px; width: 70px; height: 30px; } 50%, 85% { x: 75px; width: 110px; height: 40px; } 100% { x: 95px; width: 70px; height: 30px; } }
.zg-hg-svg .hg-cr-h, .zg-hg-svg .hg-cur-cr { animation: hgCrH 4.4s infinite; }
@keyframes hgCrH { 0%, 15% { transform: none; } 50%, 85% { transform: translate(20px, 5px); } 100% { transform: none; } }
.zg-hg-svg .hg-cr-hl { animation: hgCrHl 4.4s infinite; }
@keyframes hgCrHl { 0%, 15% { transform: none; } 50%, 85% { transform: translate(-20px, 5px); } 100% { transform: none; } }
.zg-hg-svg .hg-cr-hb { animation: hgCrHb 4.4s infinite; }
@keyframes hgCrHb { 0%, 15% { transform: none; } 50%, 85% { transform: translateY(10px); } 100% { transform: none; } }

/* กรอบรูป */
.zg-hg-svg .hg-if-frame { animation: hgIfFrame 5s infinite; }
@keyframes hgIfFrame { 0%, 15% { x: 90px; y: 34px; width: 70px; height: 90px; } 40%, 60% { x: 90px; y: 34px; width: 70px; height: 74px; } 72%, 92% { x: 100px; y: 54px; width: 50px; height: 50px; } 100% { x: 90px; y: 34px; width: 70px; height: 90px; } }
.zg-hg-svg .hg-if-hb { animation: hgIfHb 5s infinite; }
@keyframes hgIfHb { 0%, 15% { transform: none; } 40%, 60% { transform: translateY(-16px); } 72%, 100% { opacity: 0; } }
.zg-hg-svg .hg-cur-if { animation: hgCurIf 5s infinite; }
@keyframes hgCurIf { 0% { transform: none; } 15% { transform: none; } 40%, 55% { transform: translateY(-16px); } 66%, 92% { transform: translate(82px, -54px); } 100% { transform: none; } }
.zg-hg-svg .hg-if-btn { animation: hgIfBtn 5s infinite; transform-origin: center; }
@keyframes hgIfBtn { 0%, 66% { transform: scale(1); } 70% { transform: scale(.92); } 75%, 100% { transform: scale(1); } }

/* ปลายเส้นประ */
.zg-hg-svg .hg-sg-stem { transform-box: fill-box; transform-origin: 50% 0; animation: hgSgStem 5s infinite; }
@keyframes hgSgStem { 0%, 15% { transform: scaleY(0); } 55%, 88% { transform: scaleY(1); } 100% { transform: scaleY(0); } }
.zg-hg-svg .hg-sg-grip, .zg-hg-svg .hg-cur-sg { animation: hgSgGrip 5s infinite; }
@keyframes hgSgGrip { 0%, 15% { transform: none; } 55%, 88% { transform: translateY(26px); } 100% { transform: none; } }
.zg-hg-svg .hg-sg-glow, .zg-hg-svg .hg-sg-tip { opacity: 0; animation: hgSgGlow 5s infinite; }
@keyframes hgSgGlow { 0%, 48% { opacity: 0; } 55%, 88% { opacity: 1; } 95%, 100% { opacity: 0; } }

/* จัดบรรทัด */
.zg-hg-svg .hg-ta-l { animation: hgTaL 6s infinite; }
@keyframes hgTaL { 0%, 30% { transform: none; } 36%, 63% { transform: translateX(var(--c)); } 69%, 94% { transform: translateX(var(--r)); } 100% { transform: none; } }
.zg-hg-svg .hg-ta-on { opacity: 0; }
.zg-hg-svg .hg-ta-on0 { animation: hgTaOn0 6s infinite; }
.zg-hg-svg .hg-ta-on1 { animation: hgTaOn1 6s infinite; }
.zg-hg-svg .hg-ta-on2 { animation: hgTaOn2 6s infinite; }
@keyframes hgTaOn0 { 0%, 30% { opacity: 1; } 33%, 96% { opacity: 0; } 100% { opacity: 1; } }
@keyframes hgTaOn1 { 0%, 31% { opacity: 0; } 34%, 63% { opacity: 1; } 66%, 100% { opacity: 0; } }
@keyframes hgTaOn2 { 0%, 64% { opacity: 0; } 67%, 96% { opacity: 1; } 100% { opacity: 0; } }
.zg-hg-svg .hg-cur-ta { animation: hgCurTa 6s infinite; }
@keyframes hgCurTa { 0%, 26% { transform: none; } 32%, 60% { transform: translateX(42px); } 66%, 92% { transform: translateX(84px); } 100% { transform: none; } }

/* Tab จัดคอลัมน์ */
.zg-hg-svg .hg-tab-col0 { animation: hgTabCol0 4.5s infinite; }
.zg-hg-svg .hg-tab-col1 { animation: hgTabCol1 4.5s infinite; }
.zg-hg-svg .hg-tab-col2 { animation: hgTabCol2 4.5s infinite; }
@keyframes hgTabCol0 { 0%, 30% { transform: translateX(-60px); } 45%, 90% { transform: none; } 100% { transform: translateX(-60px); } }
@keyframes hgTabCol1 { 0%, 30% { transform: translateX(-46px); } 45%, 90% { transform: none; } 100% { transform: translateX(-46px); } }
@keyframes hgTabCol2 { 0%, 30% { transform: translateX(-30px); } 45%, 90% { transform: none; } 100% { transform: translateX(-30px); } }
.zg-hg-svg .hg-tab-guide { opacity: 0; animation: hgTabGuide 4.5s infinite; }
@keyframes hgTabGuide { 0%, 40% { opacity: 0; } 50%, 85% { opacity: 1; } 95%, 100% { opacity: 0; } }
.zg-hg-svg .hg-tab-key { transform-box: fill-box; transform-origin: center; animation: hgTabKey 4.5s infinite; }
@keyframes hgTabKey { 0%, 28% { transform: none; } 33% { transform: scale(.9); } 40%, 100% { transform: none; } }

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
            : `<div class="zg-hg__empty">ไม่พบหัวข้อที่ตรงกับ "${esc(query)}"<br>ลองคำอื่น เช่น "สี" "เทมเพลต" "แม่เหล็ก"</div>`;
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
                    <input type="search" class="zg-hg__search" placeholder="ค้นหาวิธีใช้… เช่น สี, เทมเพลต" aria-label="ค้นหาวิธีใช้">
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

        if (event.key === "?" || event.key === "F1" || (event.code === "Slash" && event.shiftKey)) {   /* Slash = แป้นไทย (ฦ) ก็เปิดได้ */
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
