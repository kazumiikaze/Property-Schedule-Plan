"use strict";

/* =========================================================
   TEXT-FIT.JS — ชื่อหมวดหมู่ / ชื่อแถว ไม่ตัดกลางคำ
   ปัญหาเดิม: ช่องแคบ (จอเล็ก / แบ่งครึ่งจอ) คำยาวถูกหักกลางคำ เช่น "Contac t"
   วิธีแก้: วัดคำที่ยาวที่สุด (ตัดคำไทยด้วย Intl.Segmenter) ถ้ายาวกว่าช่อง
            → ย่อเฉพาะกล่องนั้นด้วย zoom ให้คำนั้นพอดีบรรทัด (ไม่ต่ำกว่า MIN_SCALE)
   - ไม่ยุ่งกับขนาดที่ผู้ใช้ตั้งเอง (text-size.js) — คูณลงจากขนาดนั้น
   - ไม่แก้ app.js / style.css — โหลดหลัง text-size.js, cat-text.js
========================================================= */

(function () {

    const SELECTOR = [
        "#categorySidebar .category-name",
        "#partySidebar .party-main"
    ].join(", ");

    const MIN_SCALE = 0.55;

    const segmenter =
        typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
            ? new Intl.Segmenter("th", { granularity: "word" })
            : null;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    function words(text) {

        if (segmenter) {
            return Array.from(segmenter.segment(text))
                .filter(part => part.isWordLike)
                .map(part => part.segment);
        }

        return text.split(/\s+/).filter(Boolean);
    }

    /* คำติดกันที่ห้ามหัก (เช่น "Land/Office", "e-PP") นับเป็นคำเดียว */
    function longestWord(text, font) {

        context.font = font;

        let longest = 0;

        text.split(/\s+/).forEach(chunk => {

            if (!chunk) return;

            /* chunk ภาษาไทยยาว ๆ ไม่มีวรรค → ให้เบราว์เซอร์ตัดตามคำ วัดทีละคำ */
            const parts = /[฀-๿]/.test(chunk) ? words(chunk) : [chunk];

            parts.forEach(word => {
                longest = Math.max(longest, context.measureText(word).width);
            });
        });

        return longest;
    }

    function fit(element) {

        const text = (element.innerText || element.textContent || "").trim();

        if (!text) {
            if (element.style.zoom) element.style.zoom = "";
            return;
        }

        const previous = element.style.zoom;

        element.style.zoom = "";

        const style = getComputedStyle(element);

        /*
            พื้นที่จริง = ช่องของกล่องแม่ (ชื่ออาจกว้างแค่ตัวหนังสือ — cat-text.js ตั้ง flex: 0 1 auto)
            ลบ padding ของกล่องแม่ และระยะเลื่อน left ของชื่อ (cat-text.js ขยับ 8px)
        */
        const parent = element.parentElement;
        const parentStyle = parent ? getComputedStyle(parent) : null;

        const parentRoom = parent
            ? parent.clientWidth - (parseFloat(parentStyle.paddingLeft) || 0) - (parseFloat(parentStyle.paddingRight) || 0)
                - Math.abs(parseFloat(style.left) || 0)
            : element.clientWidth;

        const available =
            Math.min(parentRoom, parent ? Infinity : element.clientWidth) -
            (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);

        if (!(available > 0)) {
            element.style.zoom = previous;
            return;
        }

        const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

        const need = longestWord(text, font) * 1.04 + 1;

        const scale = need > available ? Math.max(MIN_SCALE, available / need) : 1;

        element.style.zoom = scale < 0.995 ? scale.toFixed(3) : "";

        /* จำขนาดตัวอักษรตอนวัด → ถ้าผู้ใช้กด A+/A− (style เปลี่ยน) ค่อยวัดใหม่ */
        element.dataset.zgFitFs = element.style.fontSize || "";
    }

    let frame = 0;

    function fitAll() {

        cancelAnimationFrame(frame);

        frame = requestAnimationFrame(() => {
            document.querySelectorAll(SELECTOR).forEach(fit);
        });
    }

    function start() {

        ["categorySidebar", "partySidebar"].forEach(id => {

            const target = document.getElementById(id);

            if (!target) return;

            new MutationObserver(records => {

                /* zoom ที่เราตั้งเองไม่ต้องคำนวณซ้ำ */
                const external = records.some(record =>
                    record.type !== "attributes" || record.attributeName !== "style" ||
                    !record.target.matches || !record.target.matches(SELECTOR) ||
                    (record.target.style.fontSize || "") !== (record.target.dataset.zgFitFs || ""));

                if (external) fitAll();

            }).observe(target, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["style", "class"] });
        });

        window.addEventListener("resize", fitAll);

        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);

        fitAll();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

    window.ZGTextFit = { refresh: fitAll };

})();
