"use strict";

/* =========================================================
   IMAGE-LOGO.JS — เปลี่ยนโลโก้ของแต่ละแผน
   - คลิกโลโก้มุมซ้ายบนของกระดาน → เลือกรูป / วางจากคลิปบอร์ด /
     กลับไปใช้โลโก้บริษัท
   - ลากไฟล์รูปมาวางบนโลโก้ได้เลย
   - เมนู 🖼 รูปภาพ ▾ → "เปลี่ยนโลโก้แผน…"
   - โลโก้เก็บแยกตามแผน (data.logo) → บันทึก, Export/Import,
     เทมเพลต, ย้อนกลับ ได้ครบ · แผนที่ไม่ได้ตั้ง = โลโก้บริษัท

   ไม่แก้ app.js / style.css — โหลดหลัง image-board.js
========================================================= */

(function () {

    const Z = window.ZGImage;

    const logo = document.querySelector(".plan-header .title-logo, .title-logo");

    if (!Z || !logo || !window.ZGPlanIO) {

        console.error("[image-logo.js] ต้องโหลดหลัง io.js และ image-board.js");

        return;
    }

    const DEFAULT_SRC = logo.getAttribute("src") || "logo.png";
    const DEFAULT_ALT = logo.getAttribute("alt") || "";

    logo.dataset.zgDefaultSrc = DEFAULT_SRC;

    let customLogo = null;


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.title-logo.zg-logo-editable { cursor: pointer; transition: filter .12s ease, box-shadow .12s ease; border-radius: 6px; }
.title-logo.zg-logo-editable:hover { box-shadow: 0 0 0 2px rgba(58, 138, 79, .45); }
.title-logo.zg-logo-drop { box-shadow: 0 0 0 3px #3a8a4f !important; }
.title-logo.zg-logo-custom { max-width: clamp(60px, 9vw, 150px); }

.zg-logo-pop {
    position: fixed;
    z-index: 26000;
    width: 280px;
    padding: 12px;
    border: 1px solid #dde3e0;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 12px 32px rgba(0, 0, 0, .16);
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12.5px;
    color: #1e2924;
}
.zg-logo-pop-title { font-weight: 700; font-size: 13.5px; margin-bottom: 8px; }
.zg-logo-pop-preview {
    height: 70px;
    margin-bottom: 10px;
    border: 1px dashed #c9d1cd;
    border-radius: 10px;
    background: #f6f8f7;
    display: flex;
    align-items: center;
    justify-content: center;
}
.zg-logo-pop-preview img { max-width: 90%; max-height: 56px; object-fit: contain; }
.zg-logo-pop button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}
.zg-logo-pop button:hover:not([disabled]) { background: #eef6f0; }
.zg-logo-pop button[disabled] { opacity: .4; cursor: default; }
.zg-logo-pop-hint { margin-top: 6px; color: #8a938d; font-size: 11px; line-height: 1.5; }
body.zg-dark .zg-logo-pop { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-logo-pop-preview { background: #ffffff; }
body.zg-dark .zg-logo-pop button:hover:not([disabled]) { background: #2b3a31; }
body.zg-exporting .zg-logo-pop { display: none !important; }
body.zg-exporting .title-logo { box-shadow: none !important; }
`;

    document.head.appendChild(style);

    logo.classList.add("zg-logo-editable");
    logo.title = "คลิกเพื่อเปลี่ยนโลโก้ของแผนนี้ (หรือลากรูปมาวาง)";


    /* =====================================================
       APPLY
    ===================================================== */

    function show() {

        if (customLogo) {

            logo.src = customLogo;
            logo.alt = "โลโก้แผน";
            logo.classList.add("zg-logo-custom");

        } else {

            logo.src = DEFAULT_SRC;
            logo.alt = DEFAULT_ALT;
            logo.classList.remove("zg-logo-custom");
        }

        /* ความสูงหัวกระดานอาจเปลี่ยน → ให้ระบบจัดหน้าคำนวณใหม่ */
        if (window.ZGZoomFocus && typeof window.ZGZoomFocus.refresh === "function") {
            logo.addEventListener("load", () => window.ZGZoomFocus.refresh(), { once: true });
        }
    }

    function setLogo(src, silent) {

        customLogo = typeof src === "string" && src.startsWith("data:image/") ? src : null;

        show();

        if (!silent) Z.recordHistory();
    }

    async function setFromFile(file) {

        try {

            const result = await Z.processImage(file, { maxSide: 400, keepBelowChars: 120000 });

            setLogo(result.src);

            Z.toast("เปลี่ยนโลโก้ของแผนนี้แล้ว");

        } catch (error) {

            Z.toast(error.message, true);
        }
    }

    async function pickLogo() {

        const files = await Z.pickImageFiles();

        if (files.length) setFromFile(files[0]);
    }

    async function pasteLogo() {

        try {

            const items = await navigator.clipboard.read();

            for (const clip of items) {

                const type = clip.types.find(item => item.startsWith("image/"));

                if (type) {

                    const blob = await clip.getType(type);

                    setFromFile(new File([blob], "logo." + type.split("/")[1], { type }));

                    return;
                }
            }

            Z.toast("ในคลิปบอร์ดยังไม่มีรูป", true);

        } catch (error) {

            Z.toast("เบราว์เซอร์ไม่อนุญาตให้อ่านคลิปบอร์ด — ใช้ 'เลือกรูปโลโก้…' แทน", true);
        }
    }

    function resetLogo() {

        setLogo(null);

        Z.toast("กลับไปใช้โลโก้บริษัทแล้ว");
    }


    /* =====================================================
       POPOVER
    ===================================================== */

    let pop = null;

    function closePop() {

        if (pop) {
            pop.remove();
            pop = null;
        }
    }

    function openPop() {

        closePop();

        Z.closeMenu && Z.closeMenu();

        pop = document.createElement("div");

        pop.className = "zg-logo-pop";

        pop.innerHTML = `
            <div class="zg-logo-pop-title">โลโก้ของแผนนี้</div>
            <div class="zg-logo-pop-preview"><img src="${Z.escapeHtml(customLogo || DEFAULT_SRC)}" alt=""></div>
            <button type="button" data-logo="pick">🖼 เลือกรูปโลโก้…</button>
            ${navigator.clipboard && navigator.clipboard.read ? `<button type="button" data-logo="paste">📋 วางรูปจากคลิปบอร์ด</button>` : ""}
            <button type="button" data-logo="reset" ${customLogo ? "" : "disabled"}>↺ ใช้โลโก้บริษัท (ค่าเริ่มต้น)</button>
            ${customLogo ? `<button type="button" data-logo="download">💾 บันทึกโลโก้นี้ลงเครื่อง</button>` : ""}
            <div class="zg-logo-pop-hint">ใช้เฉพาะแผนนี้ · ลากไฟล์รูปมาวางบนโลโก้ก็ได้<br>แนะนำรูปพื้นใส (PNG) จะดูเนียนกว่า</div>
        `;

        pop.addEventListener("click", event => {

            const button = event.target.closest("button[data-logo]");

            if (!button || button.disabled) return;

            const action = button.dataset.logo;

            closePop();

            if (action === "pick") pickLogo();
            if (action === "paste") pasteLogo();
            if (action === "reset") resetLogo();
            if (action === "download") Z.downloadDataURL(customLogo, "logo");
        });

        document.body.appendChild(pop);

        const rect = logo.getBoundingClientRect();

        const left = Math.max(6, Math.min(rect.left, window.innerWidth - pop.offsetWidth - 6));
        const top = Math.min(rect.bottom + 8, window.innerHeight - pop.offsetHeight - 6);

        pop.style.left = `${left}px`;
        pop.style.top = `${Math.max(6, top)}px`;
    }

    logo.addEventListener("click", event => {

        event.stopPropagation();

        if (pop) {
            closePop();
        } else {
            openPop();
        }
    });

    document.addEventListener("mousedown", event => {

        if (pop && !pop.contains(event.target) && event.target !== logo) closePop();
    });

    document.addEventListener("keydown", event => {

        if (pop && event.key === "Escape") closePop();
    });

    window.addEventListener("resize", closePop);


    /* =====================================================
       DROP บนโลโก้
    ===================================================== */

    function overLogo(event) {

        if (event.target instanceof Element && event.target.closest(".zg-iplan, .zg-start, .zg-plan-overlay, .zg-tpl-overlay")) {
            return false;
        }

        const rect = logo.getBoundingClientRect();

        const pad = 10;

        return (
            event.clientX >= rect.left - pad && event.clientX <= rect.right + pad &&
            event.clientY >= rect.top - pad && event.clientY <= rect.bottom + pad
        );
    }

    document.addEventListener("dragover", event => {

        if (!Z.transferHasFiles(event.dataTransfer)) return;

        logo.classList.toggle("zg-logo-drop", overLogo(event));

    }, true);

    document.addEventListener("dragleave", event => {

        if (!event.relatedTarget) logo.classList.remove("zg-logo-drop");

    }, true);

    document.addEventListener("drop", event => {

        const hit = Z.transferHasFiles(event.dataTransfer) && overLogo(event);

        logo.classList.remove("zg-logo-drop");

        if (!hit) return;

        const files = Z.filesFromTransfer(event.dataTransfer).filter(file => Z.isImageFile(file) || Z.isHeic(file));

        if (!files.length) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        setFromFile(files[0]);

    }, true);


    /* =====================================================
       SAVE / LOAD กับแผน
    ===================================================== */

    const io = window.ZGPlanIO;

    const originalBuild = io.build;

    io.build = function () {

        const data = originalBuild.apply(this, arguments);

        if (data && typeof data === "object") {
            data.logo = customLogo || "";
        }

        return data;
    };

    const originalApply = io.apply;

    io.apply = function (data) {

        const result = originalApply.apply(this, arguments);

        try {
            setLogo(data && data.logo, true);
        } catch (error) {
            console.error("[image-logo.js]", error);
        }

        return result;
    };


    Z.addMenuItem({
        order: 50,
        group: "plan",
        icon: "🏷",
        label: "เปลี่ยนโลโก้แผน…",
        sub: "โลโก้ลูกค้า/โครงการ มุมซ้ายบน (เฉพาะแผนนี้)",
        run: pickLogo
    });

    Z.addMenuItem({
        order: 51,
        group: "plan",
        icon: "↺",
        label: "ใช้โลโก้บริษัท (ค่าเริ่มต้น)",
        visible: () => Boolean(customLogo),
        run: resetLogo
    });

    window.ZGPlanLogo = {
        get: () => customLogo,
        set: src => setLogo(src),
        reset: resetLogo
    };

})();
