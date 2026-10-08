"use strict";

/* =========================================================
   START.JS — หน้าเริ่มต้น (เลือกวิธีเริ่มทำแผน)
   แสดงตอนเปิดเว็บ และกดปุ่ม 🏠 บน Toolbar เพื่อกลับมาได้ตลอด

     [ ↩ ทำต่อจากแผนเดิม ]  (มีเมื่อเคยมีแผนแล้ว + เลือกแผนล่าสุดอื่นได้)
     [ 📋 เริ่มจากเทมเพลต ]
     [ ＋ สร้างแผนเปล่า   ]
     [ 📂 เปิดไฟล์ .json  ]  (ลากไฟล์มาวางบนหน้านี้ได้)

   - เปิดเว็บครั้งแรก (ยังไม่มีแผน) → ไม่มีปุ่มปิด ต้องเลือกวิธีเริ่ม
   - ติ๊ก "ไม่ต้องแสดงตอนเปิดเว็บ" → เข้ากระดานเลย (กด 🏠 เมื่อต้องการ)

   ต้องโหลดหลัง io.js, plans.js, templates-data.js, templates.js (ก่อน lang.js)
========================================================= */

(function () {

    const PLANS_KEY = "zg-property-schedule-plans-v1";
    const SKIP_KEY = "zg-start-skip-v1";

    const RECENT_LIMIT = 4;


    /* =====================================================
       สถานะตอนเปิดเว็บ (อ่านก่อน plans.js เริ่มทำงาน)
    ===================================================== */

    function readStoredPlans() {

        try {

            const parsed = JSON.parse(localStorage.getItem(PLANS_KEY) || "null");

            if (!parsed || !Array.isArray(parsed.plans)) {
                return [];
            }

            return parsed.plans.filter(plan => plan && plan.id && plan.data);

        } catch (error) {

            return [];
        }
    }

    const firstVisit = readStoredPlans().length === 0;

    function readStoredActiveId() {

        try {
            const parsed = JSON.parse(localStorage.getItem(PLANS_KEY) || "null");
            return parsed && parsed.activeId ? parsed.activeId : null;
        } catch (error) {
            return null;
        }
    }

    let skipOnLoad = false;

    try {
        skipOnLoad = localStorage.getItem(SKIP_KEY) === "1";
    } catch (error) { /* ignore */ }


    /* =====================================================
       HELPERS
    ===================================================== */

    function escapeText(value) {

        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function formatTime(iso) {

        if (!iso) return "";

        const date = new Date(iso);

        if (isNaN(date)) return "";

        const pad = n => String(n).padStart(2, "0");

        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    /* รอให้ plans.js พร้อม (มันเริ่มหลัง app.js วาดตารางเสร็จ) */
    function whenPlansReady(callback, tries = 0) {

        if (window.ZGPlans && window.ZGPlans.isReady && window.ZGPlans.isReady()) {
            callback();
            return;
        }

        if (tries > 200) {
            console.error("[start.js] plans.js ไม่พร้อมใช้งาน");
            return;
        }

        setTimeout(() => whenPlansReady(callback, tries + 1), 50);
    }

    function templateList() {

        return window.ZGTemplates && typeof window.ZGTemplates.list === "function"
            ? window.ZGTemplates.list()
            : [];
    }

    function templateSummary(data) {

        const categories = Array.isArray(data && data.categories) ? data.categories.length : 0;
        const objects = Array.isArray(data && data.objects) ? data.objects.length : 0;

        const timeline = (data && data.timeline) || {};

        const range = timeline.start && timeline.end
            ? ` · ${timeline.start.slice(0, 7)} → ${timeline.end.slice(0, 7)}`
            : "";

        return `${categories} หมวด · ${objects} รายการ${range}`;
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.zg-start {
    position: fixed;
    inset: 0;
    z-index: 25500;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    box-sizing: border-box;
    overflow: hidden;
    /* พื้นหลังขุ่นค่อนใส + เบลอหน้าหลัก */
    background: rgba(28, 38, 33, .30);
    -webkit-backdrop-filter: blur(7px) saturate(1.1);
    backdrop-filter: blur(7px) saturate(1.1);
    font-family: Arial, Helvetica, sans-serif;
    color: #1e2924;
    animation: zgStartFade .18s ease-out;
}
.zg-start[hidden] { display: none; }
/* หน้าต่างลอย (pop up) */
.zg-start__panel {
    position: relative;
    width: 100%;
    max-width: 940px;
    max-height: calc(100vh - 48px);
    margin: auto;
    padding: 30px 30px 22px;
    box-sizing: border-box;
    overflow-y: auto;
    border: 1px solid rgba(255, 255, 255, .7);
    border-radius: 22px;
    background: rgba(250, 252, 251, .90);
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
    box-shadow: 0 24px 70px rgba(10, 30, 20, .28), 0 2px 8px rgba(0, 0, 0, .08);
    animation: zgStartPop .2s ease-out;
}
.zg-start__panel--sub { max-width: 640px; }
.zg-start__panel--sub > .zg-start__view {
    max-width: none;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
}
@keyframes zgStartFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes zgStartPop { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
.zg-start__close {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 1;
    height: 32px;
    padding: 0 12px;
    border: 1px solid #dde3e0;
    border-radius: 8px;
    background: #ffffff;
    color: #555f5a;
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
}
.zg-start__close:hover { background: #f0f4f2; }
.zg-start__head { text-align: center; margin-bottom: 24px; }
.zg-start__logo { width: 56px; height: 56px; object-fit: contain; }
.zg-start__title { margin: 8px 0 4px; font-size: 26px; font-weight: 700; }
.zg-start__sub { color: #6f7873; font-size: 14px; }

.zg-start__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 16px;
}
.zg-start__card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    min-height: 190px;
    padding: 22px 20px 18px;
    box-sizing: border-box;
    border: 1px solid #dde3e0;
    border-radius: 16px;
    background: #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .04);
    font-family: inherit;
    text-align: left;
    color: inherit;
    cursor: pointer;
    transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
}
.zg-start__card:hover {
    transform: translateY(-2px);
    border-color: #9fd0aa;
    box-shadow: 0 10px 26px rgba(30, 80, 45, .12);
}
.zg-start__card:focus-visible { outline: 3px solid #8cc79c; outline-offset: 2px; }
/* การ์ดทุกใบสีเดียวกัน */
.zg-start__icon {
    width: 46px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: #eef6f0;
    font-size: 24px;
}
.zg-start__card-title { font-size: 16px; font-weight: 700; }
.zg-start__card-desc { color: #6f7873; font-size: 12.5px; line-height: 1.5; }
.zg-start__card-meta {
    margin-top: auto;
    width: 100%;
    padding-top: 10px;
    border-top: 1px dashed #e3e7e5;
    color: #2f7442;
    font-size: 12px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.zg-start__card-meta small { display: block; color: #8a938d; font-weight: 400; margin-top: 2px; }

.zg-start__recent { margin-top: 22px; }
.zg-start__recent-title { color: #6f7873; font-size: 12px; margin: 0 0 8px 2px; }
.zg-start__recent-list { display: flex; flex-wrap: wrap; gap: 8px; }
.zg-start__recent-item {
    display: inline-flex;
    flex-direction: column;
    gap: 2px;
    min-width: 160px;
    max-width: 240px;
    padding: 8px 12px;
    border: 1px solid #dde3e0;
    border-radius: 10px;
    background: #ffffff;
    font-family: inherit;
    text-align: left;
    color: inherit;
    cursor: pointer;
}
.zg-start__recent-item:hover { border-color: #9fd0aa; background: #f6fbf7; }
.zg-start__recent-name { font-size: 12.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.zg-start__recent-time { color: #8a938d; font-size: 10.5px; }

.zg-start__foot {
    margin-top: 22px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    color: #6f7873;
    font-size: 12px;
}
.zg-start__drop-hint { text-align: center; color: #8a938d; font-size: 12px; margin-top: 14px; }

/* ---------- หน้าย่อย (เทมเพลต / แผนเปล่า) ---------- */
.zg-start__view {
    max-width: 640px;
    margin: 0 auto;
    padding: 22px;
    border: 1px solid #dde3e0;
    border-radius: 16px;
    background: #ffffff;
    box-shadow: 0 10px 30px rgba(0, 0, 0, .06);
}
.zg-start__back {
    margin-bottom: 12px;
    padding: 6px 10px;
    border: 0;
    border-radius: 8px;
    background: #f0f4f2;
    color: #3d4541;
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
}
.zg-start__view-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.zg-start__view-sub { color: #6f7873; font-size: 12.5px; margin-bottom: 14px; }
.zg-start__tpl-list { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; }
.zg-start__tpl {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid #dde3e0;
    border-radius: 12px;
    background: #ffffff;
    font-family: inherit;
    text-align: left;
    color: inherit;
    cursor: pointer;
}
.zg-start__tpl:hover { border-color: #9fd0aa; background: #f6fbf7; }
.zg-start__tpl.selected { border-color: #3a8a4f; background: #eef8f1; box-shadow: 0 0 0 2px rgba(58, 138, 79, .2); }
.zg-start__tpl-icon { font-size: 22px; }
.zg-start__tpl-text { flex: 1; min-width: 0; }
.zg-start__tpl-name { font-weight: 700; font-size: 13.5px; }
.zg-start__tpl-meta { color: #8a938d; font-size: 11px; margin-top: 2px; }
.zg-start__badge { margin-left: 6px; padding: 1px 7px; border-radius: 999px; background: #e5f0e9; color: #1e7a46; font-size: 10px; font-weight: 700; }
.zg-start__empty { padding: 18px; color: #8a938d; text-align: center; line-height: 1.6; }
.zg-start__field { margin-top: 14px; }
.zg-start__label { display: block; color: #6f7873; font-size: 11.5px; margin-bottom: 4px; }
.zg-start__input {
    width: 100%;
    height: 38px;
    box-sizing: border-box;
    padding: 0 12px;
    border: 1px solid #dde3e0;
    border-radius: 10px;
    font-family: inherit;
    font-size: 14px;
    color: inherit;
    background: #ffffff;
}
.zg-start__input:focus { outline: none; border-color: #8cc79c; box-shadow: 0 0 0 3px rgba(140, 199, 156, .25); }
.zg-start__actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.zg-start__btn {
    height: 38px;
    padding: 0 18px;
    border: 1px solid #dde3e0;
    border-radius: 10px;
    background: #ffffff;
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
}
.zg-start__btn--ok { background: #3a8a4f; border-color: #3a8a4f; color: #ffffff; font-weight: 700; }
.zg-start__btn--ok:disabled { opacity: .5; cursor: default; }
.zg-start__error { margin-top: 10px; color: #c0392b; font-size: 12px; min-height: 16px; }

.zg-start.is-dragging .zg-start__panel { outline: 3px dashed #3a8a4f; outline-offset: 6px; }

.zg-home-btn { font-size: 14px; }

/* ---------- ธีมมืด ---------- */
body.zg-dark .zg-start { background: rgba(0, 0, 0, .42); color: #e3e9e5; }
body.zg-dark .zg-start__panel { background: rgba(28, 34, 31, .90); border-color: rgba(255, 255, 255, .08); box-shadow: 0 24px 70px rgba(0, 0, 0, .5); }
body.zg-dark .zg-start__panel--sub > .zg-start__view { background: transparent; }
body.zg-dark .zg-start__card,
body.zg-dark .zg-start__view,
body.zg-dark .zg-start__recent-item,
body.zg-dark .zg-start__tpl,
body.zg-dark .zg-start__input,
body.zg-dark .zg-start__btn:not(.zg-start__btn--ok),
body.zg-dark .zg-start__close { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-start__icon,
body.zg-dark .zg-start__back { background: #2b3330; color: #e3e9e5; }
body.zg-dark .zg-start__tpl.selected { background: #26372d; }

body.zg-exporting .zg-start { display: none !important; }

@media (max-width: 560px) {
    .zg-start { padding: 12px; }
    .zg-start__panel { padding: 22px 16px 16px; max-height: calc(100vh - 24px); }
    .zg-start__title { font-size: 21px; }
    .zg-start__card { min-height: 0; }
}
`;

    document.head.appendChild(style);


    /* =====================================================
       ELEMENT
    ===================================================== */

    const root = document.createElement("div");

    root.className = "zg-start";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "หน้าเริ่มต้น");

    document.body.appendChild(root);

    const fileInput = document.createElement("input");

    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.style.display = "none";

    document.body.appendChild(fileInput);


    let isFirstVisit = firstVisit;

    /* id ของแผนเปล่าที่ plans.js สร้างให้อัตโนมัติตอนเปิดครั้งแรก */
    let autoPlanId = null;

    if (firstVisit) {
        whenPlansReady(() => { autoPlanId = window.ZGPlans.activeId(); });
    }


    function logoSrc() {

        const logo = document.querySelector(".title-logo");

        /* หน้าเริ่มต้นใช้โลโก้บริษัทเสมอ (ไม่ใช่โลโก้ที่ตั้งเฉพาะแผน) */
        return logo ? (logo.dataset.zgDefaultSrc || logo.getAttribute("src")) : "logo.png";
    }

    function canClose() {
        return !isFirstVisit;
    }


    /* ---------- หน้าแรก (การ์ด) ---------- */

    function renderHome() {

        const plans = window.ZGPlans && window.ZGPlans.isReady && window.ZGPlans.isReady()
            ? window.ZGPlans.list()
            : readStoredPlans().map(plan => ({ id: plan.id, name: plan.name, updatedAt: plan.updatedAt }));

        const sorted = plans.slice().sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

        const activeId =
            (window.ZGPlans && window.ZGPlans.isReady && window.ZGPlans.isReady() && window.ZGPlans.activeId()) ||
            readStoredActiveId();

        const current = sorted.find(plan => plan.id === activeId) || sorted[0];

        const recent = sorted.filter(plan => !current || plan.id !== current.id).slice(0, RECENT_LIMIT);

        const showContinue = !isFirstVisit && Boolean(current);

        root.innerHTML = `
            <div class="zg-start__panel">
                ${canClose() ? `<button type="button" class="zg-start__close" data-action="close" title="ไปที่กระดาน (Esc)">✕ ปิด</button>` : ""}

                <div class="zg-start__head">
                    <img class="zg-start__logo" src="${escapeText(logoSrc())}" alt="">
                    <div class="zg-start__title">Property Schedule Plan</div>
                    <div class="zg-start__sub">${showContinue ? "เลือกวิธีเริ่มทำงาน" : "ยินดีต้อนรับ — เลือกวิธีเริ่มทำแผนแรกของคุณ"}</div>
                </div>

                <div class="zg-start__grid">
                    ${showContinue ? `
                    <button type="button" class="zg-start__card zg-start__card--primary" data-action="continue">
                        <span class="zg-start__icon">↩</span>
                        <span class="zg-start__card-title">ทำต่อจากแผนเดิม</span>
                        <span class="zg-start__card-desc">เปิดแผนล่าสุดที่ทำค้างไว้</span>
                        <span class="zg-start__card-meta">${escapeText(current.name)}<small>แก้ไขล่าสุด ${escapeText(formatTime(current.updatedAt))}</small></span>
                    </button>` : ""}

                    <button type="button" class="zg-start__card ${showContinue ? "" : "zg-start__card--primary"}" data-action="template">
                        <span class="zg-start__icon">📋</span>
                        <span class="zg-start__card-title">เริ่มจากเทมเพลต</span>
                        <span class="zg-start__card-desc">เลือกแผนสำเร็จรูป แล้วแก้วันที่และรายละเอียดเพิ่ม เร็วที่สุด</span>
                    </button>

                    <button type="button" class="zg-start__card" data-action="blank">
                        <span class="zg-start__icon">＋</span>
                        <span class="zg-start__card-title">สร้างแผนเปล่า</span>
                        <span class="zg-start__card-desc">เริ่มจากกระดานว่าง จัดหมวดหมู่และขั้นตอนเองทั้งหมด</span>
                    </button>

                    <button type="button" class="zg-start__card" data-action="file">
                        <span class="zg-start__icon">📂</span>
                        <span class="zg-start__card-title">เปิดไฟล์ .json</span>
                        <span class="zg-start__card-desc">เปิดไฟล์แผนที่ Export ไว้ หรือได้รับจากเพื่อนร่วมงาน</span>
                    </button>
                </div>

                ${showContinue && recent.length ? `
                <div class="zg-start__recent">
                    <div class="zg-start__recent-title">หรือเปิดแผนอื่นล่าสุด</div>
                    <div class="zg-start__recent-list">
                        ${recent.map(plan => `
                            <button type="button" class="zg-start__recent-item" data-plan-id="${escapeText(plan.id)}">
                                <span class="zg-start__recent-name">${escapeText(plan.name)}</span>
                                <span class="zg-start__recent-time">${escapeText(formatTime(plan.updatedAt))}</span>
                            </button>
                        `).join("")}
                    </div>
                </div>` : ""}

                <div class="zg-start__drop-hint">ลากไฟล์ .json มาวางบนหน้านี้เพื่อเปิดได้เลย</div>

                ${canClose() ? `
                <label class="zg-start__foot">
                    <input type="checkbox" data-action="skip" ${skipOnLoad ? "checked" : ""}>
                    ไม่ต้องแสดงหน้านี้ตอนเปิดเว็บ (กด 🏠 บน Toolbar เพื่อกลับมาได้)
                </label>` : ""}

                <div class="zg-start__error" style="text-align:center"></div>
            </div>
        `;


    }


    /* ---------- หน้าเลือกเทมเพลต ---------- */

    function renderTemplates() {

        const list = templateList();

        let selected = list[0] || null;

        root.innerHTML = `
            <div class="zg-start__panel zg-start__panel--sub">
                <div class="zg-start__view">
                    <button type="button" class="zg-start__back" data-action="home">← กลับ</button>
                    <div class="zg-start__view-title">📋 เริ่มจากเทมเพลต</div>
                    <div class="zg-start__view-sub">เลือกเทมเพลต ตั้งชื่อแผน แล้วกดสร้าง</div>

                    <div class="zg-start__tpl-list">
                        ${list.length ? list.map((item, index) => `
                            <button type="button" class="zg-start__tpl ${index === 0 ? "selected" : ""}" data-tpl-id="${escapeText(item.id)}">
                                <span class="zg-start__tpl-icon">🗂</span>
                                <span class="zg-start__tpl-text">
                                    <div class="zg-start__tpl-name">${escapeText(item.name)}${item.builtin ? `<span class="zg-start__badge">พร้อมใช้</span>` : ""}</div>
                                    <div class="zg-start__tpl-meta">${escapeText(templateSummary(item.data))}</div>
                                </span>
                            </button>
                        `).join("") : `
                            <div class="zg-start__empty">ยังไม่มีเทมเพลต<br>เปิดไฟล์เทมเพลต .json ได้จากการ์ด "เปิดไฟล์ .json"</div>
                        `}
                    </div>

                    ${list.length ? `
                    <div class="zg-start__field">
                        <label class="zg-start__label" for="zgStartTplName">ชื่อแผน (เช่น ชื่อลูกค้า / โครงการ)</label>
                        <input type="text" id="zgStartTplName" class="zg-start__input" maxlength="80" value="${escapeText(selected.name)}">
                    </div>
                    <div class="zg-start__error"></div>
                    <div class="zg-start__actions">
                        <button type="button" class="zg-start__btn" data-action="home">ยกเลิก</button>
                        <button type="button" class="zg-start__btn zg-start__btn--ok" data-action="create-template">สร้างแผน</button>
                    </div>` : ""}
                </div>
            </div>
        `;

        const nameInput = root.querySelector("#zgStartTplName");

        let nameTouched = false;

        if (nameInput) {

            nameInput.addEventListener("input", () => { nameTouched = true; });

            nameInput.addEventListener("keydown", event => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    createFromTemplate();
                }
            });
        }

        root.querySelectorAll(".zg-start__tpl").forEach(button => {

            button.addEventListener("click", () => {

                root.querySelectorAll(".zg-start__tpl").forEach(other => other.classList.remove("selected"));

                button.classList.add("selected");

                selected = list.find(item => item.id === button.dataset.tplId) || selected;

                if (nameInput && !nameTouched) {
                    nameInput.value = selected.name;
                }
            });

            button.addEventListener("dblclick", () => createFromTemplate());
        });

        function createFromTemplate() {

            if (!selected) return;

            const name = (nameInput && nameInput.value.trim()) || selected.name;

            const data = JSON.parse(JSON.stringify(selected.data));

            const problem = window.ZGPlanIO && window.ZGPlanIO.validate ? window.ZGPlanIO.validate(data) : null;

            if (problem) {
                showError(`เทมเพลตเสียหาย: ${problem}`);
                return;
            }

            createPlanFromData(name, data, `สร้างแผน "${name}" จากเทมเพลตแล้ว`);
        }

        root.querySelector("[data-action='create-template']")?.addEventListener("click", createFromTemplate);

        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
    }


    /* ---------- หน้าสร้างแผนเปล่า ---------- */

    function renderBlank() {

        root.innerHTML = `
            <div class="zg-start__panel zg-start__panel--sub">
                <div class="zg-start__view">
                    <button type="button" class="zg-start__back" data-action="home">← กลับ</button>
                    <div class="zg-start__view-title">＋ สร้างแผนเปล่า</div>
                    <div class="zg-start__view-sub">ได้กระดานว่าง 3 หมวดหมู่ ช่วงเวลา 12 เดือนนับจากเดือนนี้</div>

                    <div class="zg-start__field">
                        <label class="zg-start__label" for="zgStartBlankName">ชื่อแผน (เช่น ชื่อลูกค้า / โครงการ)</label>
                        <input type="text" id="zgStartBlankName" class="zg-start__input" maxlength="80" value="แผนใหม่">
                    </div>
                    <div class="zg-start__error"></div>
                    <div class="zg-start__actions">
                        <button type="button" class="zg-start__btn" data-action="home">ยกเลิก</button>
                        <button type="button" class="zg-start__btn zg-start__btn--ok" data-action="create-blank">สร้างแผน</button>
                    </div>
                </div>
            </div>
        `;

        const input = root.querySelector("#zgStartBlankName");

        function create() {

            const name = input.value.trim() || "แผนใหม่";

            whenPlansReady(() => {

                if (isFirstVisit) {

                    /* เปิดครั้งแรก กระดานที่เห็นอยู่คือแผนเปล่าแล้ว → แค่ตั้งชื่อ */
                    window.ZGPlans.renameCurrent(name);

                } else {

                    window.ZGPlans.createBlank(name);
                }

                finish();
            });
        }

        root.querySelector("[data-action='create-blank']").addEventListener("click", create);

        input.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                create();
            }
        });

        input.focus();
        input.select();
    }


    /* =====================================================
       ACTIONS
    ===================================================== */

    function showError(message) {

        const box = root.querySelector(".zg-start__error");

        if (box) box.textContent = message;
    }

    function finish() {

        isFirstVisit = false;

        close();
    }

    function createPlanFromData(name, data, message) {

        whenPlansReady(() => {

            const removeId = isFirstVisit ? autoPlanId : null;

            window.ZGPlans.createFromData(name, data, message);

            /* เปิดครั้งแรก → ลบแผนเปล่าที่ระบบสร้างให้อัตโนมัติ */
            if (removeId) {
                window.ZGPlans.removeSilently(removeId);
            }

            finish();
        });
    }

    function openFile(file) {

        if (!file) return;

        if (!/\.json$/i.test(file.name || "")) {
            showError("กรุณาเลือกไฟล์ .json เท่านั้น");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {

            let data;

            try {
                data = JSON.parse(String(reader.result));
            } catch (error) {
                showError("อ่านไฟล์ไม่ได้: ไม่ใช่ไฟล์ .json ที่ถูกต้อง");
                return;
            }

            /* ไฟล์เทมเพลต → เพิ่มเข้ารายการเทมเพลต แล้วพาไปหน้าเลือกเทมเพลต */
            if (data && data.app === "zg-property-schedule-templates") {

                if (window.ZGTemplates && window.ZGTemplates.importData) {

                    window.ZGTemplates.importData(data, file.name);

                    /* templates.js จะเปิดเมนูเทมเพลต → ปิดไว้ก่อน ใช้หน้าของเราแทน */
                    document.querySelectorAll(".zg-tpl-menu").forEach(menu => menu.remove());
                    document.getElementById("templateBtn")?.classList.remove("active");

                    renderTemplates();
                }

                return;
            }

            const problem = window.ZGPlanIO && window.ZGPlanIO.validate ? window.ZGPlanIO.validate(data) : "ไม่พบระบบ Import";

            if (problem) {
                showError(`เปิดไฟล์ไม่ได้: ${problem}`);
                return;
            }

            const name = String(file.name).replace(/\.json$/i, "").replace(/_\d{4}-?\d{2}-?\d{2}$/, "") || "แผนจากไฟล์";

            createPlanFromData(name, data, `เปิดไฟล์ "${file.name}" เป็นแผนใหม่แล้ว`);
        };

        reader.readAsText(file);
    }

    fileInput.addEventListener("change", () => {

        const file = fileInput.files && fileInput.files[0];

        fileInput.value = "";

        openFile(file);
    });


    /* คลิกพื้นหลังเบลอ (นอกหน้าต่าง) → ปิด */
    let downOnBackdrop = false;

    root.addEventListener("mousedown", event => { downOnBackdrop = event.target === root; });

    root.addEventListener("click", event => {

        if (event.target === root) {
            if (downOnBackdrop && canClose()) close();
            return;
        }

        const target = event.target.closest("[data-action], [data-plan-id]");

        if (!target) return;

        const action = target.dataset.action;

        if (target.dataset.planId) {

            const id = target.dataset.planId;

            whenPlansReady(() => {
                window.ZGPlans.switchTo(id);
                finish();
            });

            return;
        }

        if (action === "close" || action === "continue") {
            if (canClose()) close();
            return;
        }

        if (action === "template") return renderTemplates();
        if (action === "blank") return renderBlank();
        if (action === "home") return renderHome();

        if (action === "file") {
            showError("");
            fileInput.click();
        }
    });

    root.addEventListener("change", event => {

        if (event.target.matches("[data-action='skip']")) {

            skipOnLoad = event.target.checked;

            try {
                localStorage.setItem(SKIP_KEY, skipOnLoad ? "1" : "0");
            } catch (error) { /* ignore */ }
        }
    });


    /* ลากไฟล์มาวาง */
    let dragDepth = 0;

    root.addEventListener("dragenter", event => {
        if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes("Files")) return;
        event.preventDefault();
        dragDepth += 1;
        root.classList.add("is-dragging");
    });

    root.addEventListener("dragover", event => {
        if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    });

    root.addEventListener("dragleave", () => {
        dragDepth = Math.max(0, dragDepth - 1);
        if (!dragDepth) root.classList.remove("is-dragging");
    });

    root.addEventListener("drop", event => {

        event.preventDefault();
        event.stopPropagation();

        dragDepth = 0;
        root.classList.remove("is-dragging");

        const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];

        openFile(file);
    });


    document.addEventListener("keydown", event => {

        if (event.key === "Escape" && !root.hidden && canClose()) {

            /* อยู่หน้าย่อย → กลับหน้าแรกก่อน */
            if (root.querySelector(".zg-start__view")) {
                renderHome();
            } else {
                close();
            }
        }
    });


    /* =====================================================
       OPEN / CLOSE
    ===================================================== */

    function open() {

        if (typeof closeObjectMenu === "function") closeObjectMenu();
        if (typeof closeCategoryMenu === "function") closeCategoryMenu();
        if (typeof closeRowMenu === "function") closeRowMenu();

        renderHome();

        root.hidden = false;

        document.documentElement.classList.add("zg-start-open");
    }

    function close() {

        root.hidden = true;

        root.innerHTML = "";

        document.documentElement.classList.remove("zg-start-open");
    }


    /* =====================================================
       ปุ่ม 🏠 บน Toolbar (ซ้ายสุดของกลุ่มแผน)
    ===================================================== */

    if (!document.getElementById("homeBtn")) {

        const home = document.createElement("button");

        home.type = "button";
        home.id = "homeBtn";
        home.className = "toolbar-square-btn zg-home-btn";
        home.title = "หน้าเริ่มต้น";
        home.setAttribute("aria-label", "หน้าเริ่มต้น");
        home.textContent = "🏠";

        const group =
            document.querySelector(".toolbar-group--plan") ||
            (document.getElementById("planSelectBtn") || {}).parentElement;

        if (group) {
            group.insertBefore(home, group.firstChild);
        }

        home.addEventListener("click", event => {
            event.preventDefault();
            open();
        });
    }


    /* เปิดตอนโหลดหน้า: ครั้งแรกเสมอ / ครั้งต่อไปถ้าไม่ได้ติ๊กข้าม */
    if (firstVisit || !skipOnLoad) {
        open();
    }


    window.ZGStart = { open, close };

})();
