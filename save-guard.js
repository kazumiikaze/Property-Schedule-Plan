"use strict";

/* =========================================================
   SAVE-GUARD.JS — กันการแก้ไขหายหลังรีเฟรช
   ปัญหาที่พบได้:
   1) เปิดเว็บไว้ 2 แท็บ / 2 หน้าต่าง (หรือแท็บเก่าค้างไว้)
      แท็บเก่าบันทึกอัตโนมัติทุก 3 วินาที → เขียนทับงานล่าสุดจากอีกแท็บ
      → รีเฟรชแล้วขนาดตัวอักษร / ตัวหนา / ตำแหน่ง Text กลับเป็นของเก่า
      แก้: อีกแท็บบันทึกแผนเมื่อไร แท็บนี้หยุดบันทึกแผนทันที + แถบแจ้ง "โหลดล่าสุด"
   2) พื้นที่เก็บในเบราว์เซอร์ (ประมาณ 5 MB) เต็ม เพราะรูปในแผน / เทมเพลตที่บันทึกในเครื่อง
      → บันทึกไม่สำเร็จ (เดิมขึ้นข้อความแป๊บเดียว)
      แก้: แถบแจ้งค้างไว้จนกว่าจะบันทึกได้ + บอกว่าอะไรกินพื้นที่
   - ไม่แก้ app.js / style.css / plans.js — โหลดก่อน plans.js
========================================================= */

(function () {

    if (window.ZG_PREVIEW_MODE) return;   // กรอบตัวอย่างเทมเพลต (ไม่บันทึกอยู่แล้ว)

    const PLANS_KEY = "zg-property-schedule-plans-v1";
    const LIMIT = 5 * 1024 * 1024;

    let stale = false;          // อีกแท็บบันทึกแผนไปแล้ว
    let failing = false;        // บันทึกไม่สำเร็จ (พื้นที่เต็ม)
    let bar = null;


    /* ---------- ขนาดข้อมูลในเบราว์เซอร์ ---------- */

    function usage() {
        const rows = [];
        let total = 0;
        try {
            for (let i = 0; i < localStorage.length; i += 1) {
                const key = localStorage.key(i);
                const size = key.length + (localStorage.getItem(key) || "").length;   // Chrome นับเป็นตัวอักษร (~5 ล้านตัว)
                total += size;
                rows.push({ key, size });
            }
        } catch (error) { /* อ่านไม่ได้ */ }
        rows.sort((a, b) => b.size - a.size);
        return { total, rows };
    }

    function mb(bytes) {
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }

    const NAMES = {
        "zg-property-schedule-plans-v1": "แผนทั้งหมด",
        "zg-property-schedule-templates-v1": "เทมเพลตที่บันทึกในเครื่อง",
        "zg-presets-v1": "ชุดสำเร็จ (แบบเก่า)"
    };


    /* ---------- แถบแจ้งเตือน ---------- */

    const style = document.createElement("style");
    style.textContent = `
.zg-sg-bar {
    position: fixed; left: 50%; top: 10px; transform: translateX(-50%); z-index: 40000;
    max-width: min(760px, calc(100vw - 24px)); padding: 10px 14px; border-radius: 10px;
    background: #fff4e5; border: 1px solid #f0b45a; color: #5a3b00; font-size: 13px; line-height: 1.5;
    box-shadow: 0 8px 24px rgba(0,0,0,.18); display: flex; gap: 10px; align-items: flex-start;
}
.zg-sg-bar.is-error { background: #fdecec; border-color: #e58b8b; color: #6b1515; }
.zg-sg-bar b { display: block; }
.zg-sg-bar small { display: block; opacity: .85; margin-top: 2px; }
.zg-sg-bar button {
    flex: none; height: 30px; padding: 0 12px; border-radius: 7px; border: 1px solid currentColor;
    background: #fff; color: inherit; font: inherit; font-weight: 700; cursor: pointer;
}
.zg-sg-bar .zg-sg-x { border: 0; background: transparent; padding: 0 4px; font-weight: 400; }
body.zg-exporting .zg-sg-bar { display: none !important; }
`;
    document.head.appendChild(style);

    function showBar(kind) {

        if (!document.body) {
            document.addEventListener("DOMContentLoaded", () => showBar(kind), { once: true });
            return;
        }

        if (bar) bar.remove();

        bar = document.createElement("div");
        bar.className = "zg-sg-bar";

        if (kind === "stale") {
            bar.innerHTML = `
                <div><b>⚠ แผนถูกแก้ไขจากอีกแท็บ / หน้าต่างหนึ่ง</b>
                <small>แท็บนี้หยุดบันทึกอัตโนมัติแล้ว (กันเขียนทับงานล่าสุด) — กด "โหลดล่าสุด" แล้วทำงานต่อในแท็บเดียว</small></div>
                <button type="button" data-sg="reload">↻ โหลดล่าสุด</button>`;
        } else {
            const info = usage();
            const top = info.rows.slice(0, 3)
                .map(row => `${NAMES[row.key] || row.key} ${mb(row.size)}`).join(" · ");
            bar.classList.add("is-error");
            bar.innerHTML = `
                <div><b>❌ บันทึกแผนไม่สำเร็จ — พื้นที่ในเบราว์เซอร์เต็ม (${mb(info.total)} จาก ~5 MB)</b>
                <small>การแก้ไขล่าสุดจะหายถ้ารีเฟรช · กด ↑ Export เก็บไฟล์แผนไว้ก่อน
                แล้วลบเทมเพลต/แผนที่ไม่ใช้ หรือย่อรูปให้เล็กลง<br>ใช้พื้นที่มากสุด: ${top}</small></div>
                <button type="button" class="zg-sg-x" data-sg="close" title="ซ่อน">✕</button>`;
        }

        bar.addEventListener("click", event => {
            const action = event.target.closest("[data-sg]");
            if (!action) return;
            if (action.dataset.sg === "reload") location.reload();
            if (action.dataset.sg === "close" && bar) { bar.remove(); bar = null; }
        });

        document.body.appendChild(bar);
    }


    /* ---------- 1) อีกแท็บบันทึกแผน → แท็บนี้หยุดบันทึกแผน ---------- */

    window.addEventListener("storage", event => {
        if (event.storageArea !== localStorage || event.key !== PLANS_KEY) return;
        if (event.newValue === null) return;
        if (!stale) {
            stale = true;
            showBar("stale");
        }
    });


    /* ---------- 2) ดักการบันทึกแผน ---------- */

    const realSet = Storage.prototype.setItem;

    Storage.prototype.setItem = function (key, value) {

        if (this === localStorage && key === PLANS_KEY) {

            /* แท็บนี้ข้อมูลเก่าแล้ว → ไม่เขียนทับ */
            if (stale) return;

            try {
                realSet.call(this, key, value);
                if (failing) {
                    failing = false;
                    if (bar && bar.classList.contains("is-error")) { bar.remove(); bar = null; }
                }
                return;
            } catch (error) {
                failing = true;
                showBar("full");
                throw error;
            }
        }

        return realSet.call(this, key, value);
    };


    /* ---------- เปิดหน้าเว็บ: พื้นที่ใกล้เต็ม → เตือนล่วงหน้า ---------- */

    window.addEventListener("load", () => {
        const info = usage();
        if (info.total > LIMIT * 0.85) {
            console.warn("[save-guard.js] localStorage ใกล้เต็ม", mb(info.total), info.rows.slice(0, 5));
            failing = true;
            showBar("full");
            if (bar) {
                const title = bar.querySelector("b");
                if (title) title.textContent = `⚠ พื้นที่ในเบราว์เซอร์ใกล้เต็ม (${mb(info.total)} จาก ~5 MB) — อาจบันทึกไม่สำเร็จ`;
            }
        }
    });

    window.ZGSaveGuard = { usage, isStale: () => stale };

})();
