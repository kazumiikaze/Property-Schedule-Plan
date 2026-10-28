"use strict";

/* =========================================================
   DAY-LENS.JS — ชี้เมาส์ที่เลขวันบนหัวตาราง → แว่นแก้วใส (liquid glass) ขยายเลขนั้นให้ใหญ่
   - แว่นเดียวลอยตามเลขที่ชี้ (เลื่อนไปวันอื่นแบบนุ่ม ๆ) ไม่บังการคลิก (คลิกเลขวันยังสร้างเส้นได้)
   - วันที่ไฮไลต์ (เส้นวันที่ / เส้นแนวตั้ง) → ตัวเลขในแว่นเป็นสีเดียวกับไฮไลต์
   - ไม่ติดไปในภาพ Export / พิมพ์ · ลดการเคลื่อนไหว / ลดความโปร่งใส → แบบเรียบ
   - ไม่แก้ app.js — โหลดหลัง app.js
========================================================= */

(function () {

    const header = document.getElementById("timelineHeaderInner");

    if (!header) return;

    const style = document.createElement("style");

    style.textContent = `
.zg-day-lens {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 4800;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    color: #1f2a24;
    background:
        radial-gradient(120% 90% at 30% 22%, rgba(255, 255, 255, .78), rgba(255, 255, 255, .22) 55%, rgba(255, 255, 255, .34));
    -webkit-backdrop-filter: blur(6px) saturate(170%);
            backdrop-filter: blur(6px) saturate(170%);
    border: 1px solid rgba(255, 255, 255, .85);
    box-shadow:
        0 4px 12px rgba(20, 40, 30, .18),
        0 1px 2px rgba(20, 40, 30, .14),
        inset 0 1px 1px rgba(255, 255, 255, .95),
        inset 0 -2px 4px rgba(40, 70, 55, .10);
    opacity: 0;
    transform: translate(var(--lx, 0px), var(--ly, 0px)) scale(.55);
    transition:
        opacity .14s ease,
        transform .22s cubic-bezier(.16, 1, .3, 1);
    will-change: transform, opacity;
}
/* ขอบแก้วรับแสง (มุมซ้ายบนสว่าง) */
.zg-day-lens::before {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(140deg, rgba(255, 255, 255, .95), rgba(255, 255, 255, .15) 45%, rgba(120, 160, 140, .35));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    pointer-events: none;
}
/* ประกายแสงโค้งบนผิวแก้ว */
.zg-day-lens::after {
    content: "";
    position: absolute;
    left: 18%;
    top: 9%;
    width: 46%;
    height: 26%;
    border-radius: 50%;
    background: linear-gradient(180deg, rgba(255, 255, 255, .85), rgba(255, 255, 255, 0));
    filter: blur(.5px);
    pointer-events: none;
}
.zg-day-lens.is-on {
    opacity: 1;
    transform: translate(var(--lx, 0px), var(--ly, 0px)) scale(1);
}
.zg-day-lens.is-highlight { color: #d0342c; }
.zg-day-lens.is-highlight-vline { color: #111111; }

body.zg-dark .zg-day-lens {
    color: #eef3f0;
    background: radial-gradient(120% 90% at 30% 22%, rgba(255, 255, 255, .22), rgba(255, 255, 255, .06) 55%, rgba(255, 255, 255, .10));
    border-color: rgba(255, 255, 255, .28);
    box-shadow: 0 6px 18px rgba(0, 0, 0, .45), inset 0 1px 1px rgba(255, 255, 255, .35);
}
body.zg-dark .zg-day-lens.is-highlight { color: #ff6b62; }
body.zg-dark .zg-day-lens.is-highlight-vline { color: #ffffff; }

body.zg-exporting .zg-day-lens,
body.zg-xp-tiling .zg-day-lens { display: none !important; }

@media print { .zg-day-lens { display: none !important; } }

@media (prefers-reduced-motion: reduce) {
    .zg-day-lens { transition: opacity .1s linear; transform: translate(var(--lx, 0px), var(--ly, 0px)); }
}
@media (prefers-reduced-transparency: reduce) {
    .zg-day-lens {
        background: #ffffff;
        -webkit-backdrop-filter: none;
                backdrop-filter: none;
    }
    .zg-day-lens::after { display: none; }
    body.zg-dark .zg-day-lens { background: #26302c; }
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .zg-day-lens { background: rgba(255, 255, 255, .94); }
}
`;

    document.head.appendChild(style);

    const lens = document.createElement("div");
    lens.className = "zg-day-lens";
    lens.setAttribute("aria-hidden", "true");
    document.body.appendChild(lens);

    const SIZE = 30;

    let current = null;

    function show(label) {

        const rect = label.getBoundingClientRect();

        if (!rect.width) return;

        current = label;

        lens.textContent = (label.textContent || "").trim();

        lens.classList.toggle("is-highlight", label.classList.contains("day-number-label--highlight"));
        lens.classList.toggle("is-highlight-vline", label.classList.contains("day-number-label--highlight-vline"));

        /* กึ่งกลางแว่น = กึ่งกลางช่องวัน · ยกขึ้นเล็กน้อยให้เห็นเลขข้าง ๆ ใต้แว่น */
        const x = rect.left + rect.width / 2 - SIZE / 2;
        const y = rect.top + rect.height / 2 - SIZE / 2 - 3;

        lens.style.setProperty("--lx", `${Math.round(x)}px`);
        lens.style.setProperty("--ly", `${Math.round(y)}px`);

        lens.classList.add("is-on");
    }

    function hide() {
        current = null;
        lens.classList.remove("is-on");
    }

    header.addEventListener("mouseover", event => {

        const label = event.target instanceof Element ? event.target.closest(".day-number-label") : null;

        if (!label || label === current) return;

        show(label);
    });

    header.addEventListener("mouseleave", hide);

    /* ตารางเลื่อน / วาดหัวตารางใหม่ → ซ่อนแว่น (กันค้างผิดที่) */
    if (typeof timelineViewport !== "undefined") {
        timelineViewport.addEventListener("scroll", hide, { passive: true });
    }

    window.addEventListener("resize", hide);
    document.addEventListener("mousedown", () => { if (current) hide(); }, true);

    new MutationObserver(() => { if (current && !current.isConnected) hide(); })
        .observe(header, { childList: true });

})();
