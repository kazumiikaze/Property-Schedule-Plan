"use strict";

/* =========================================================
   PLAN-SHIFT.JS — เลื่อนทั้งแผน (งาน เส้น รูป) ไปเริ่มวันใหม่

   ปัญหาเดิม:
   - ใช้เทมเพลต → แผนไปอยู่ที่วัน/เดือนที่บันทึกเทมเพลตไว้เสมอ
   - เปลี่ยน "วันเริ่มต้น" บนผัง → หัวตารางเลื่อน แต่ object ค้างอยู่วันเดิม

   ระบบนี้:
   1) ZGPlanShift.shiftData(data, days)  เลื่อนข้อมูลแผน (.json) ทั้งก้อน
        - task / hline เก็บ x เป็น px นับจากวันเริ่ม → เลื่อนวันเริ่มก็ตามไปเอง
        - dateline / vline (linkedHeaderDate) และรูป (day) เป็นวันที่จริง → บวกวันเพิ่ม
   2) ZGPlanShift.shiftLive(days)        เลื่อนแผนที่เปิดอยู่ (ย้อนกลับได้ด้วย Ctrl+Z)
   3) ปุ่ม 🔗 ข้างช่อง "วันเริ่มต้น"     เปิด = เปลี่ยนวันเริ่มแล้วงานทั้งหมดเลื่อนตาม
                                          ปิด = แบบเดิม (งานอยู่วันที่เดิม เปลี่ยนแค่ช่วงที่แสดง)
   4) ZGPlanShift.picker(...)             ช่องเลือก "วางแผนเริ่มที่วันที่" ใช้ร่วมกัน
                                          (เมนูเทมเพลต / หน้าเริ่มต้น)

   โหลดหลัง app.js, zoom-sync.js, io.js — ก่อน templates.js / start.js
========================================================= */

(function () {

    if (typeof timelineStartDate === "undefined" || typeof renderSchedule !== "function") {
        console.warn("[plan-shift.js] ต้องโหลดหลัง app.js");
        return;
    }

    const LINK_KEY = "zg-start-link-v1";
    const DAY_MS = 86400000;
    const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

    const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


    /* =====================================================
       HELPERS
    ===================================================== */

    function lang() {
        try {
            return (window.ZGLang && window.ZGLang.get && window.ZGLang.get()) || "th";
        } catch (error) {
            return "th";
        }
    }

    function L(th, en, ja) {
        const current = lang();
        return current === "en" ? en : current === "ja" ? ja : th;
    }

    function escapeText(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function toDate(text) {
        if (text instanceof Date) return isNaN(text) ? null : new Date(text.getFullYear(), text.getMonth(), text.getDate());
        if (typeof text !== "string" || !DATE_PATTERN.test(text.slice(0, 10))) return null;
        const [y, m, d] = text.slice(0, 10).split("-").map(Number);
        const date = new Date(y, m - 1, d);
        return isNaN(date) ? null : date;
    }

    function toText(date) {
        return formatDateInputValue(date);
    }

    function plusDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    /* จำนวนวันจาก a → b (ไม่เพี้ยนเพราะเวลา / timezone) */
    function diffDays(a, b) {
        return Math.round(
            (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
                Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DAY_MS
        );
    }

    function prettyDate(date) {
        if (!date) return "";
        return L(
            `${date.getDate()} ${THAI_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`,
            `${date.getDate()} ${MONTHS_EN[date.getMonth()]} ${date.getFullYear()}`,
            `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
        );
    }

    function signedDays(days) {
        if (!days) return L("ไม่เลื่อน", "no shift", "移動なし");
        const sign = days > 0 ? "+" : "−";
        return L(`เลื่อน ${sign}${Math.abs(days)} วัน`, `shift ${sign}${Math.abs(days)} day(s)`, `${sign}${Math.abs(days)} 日移動`);
    }

    function record() {
        if (window.ZGHistory && typeof window.ZGHistory.record === "function") window.ZGHistory.record();
    }

    function toast(message) {
        if (window.ZGImage && typeof window.ZGImage.toast === "function") window.ZGImage.toast(message);
    }


    /* =====================================================
       1) เลื่อนข้อมูลแผน (.json)
    ===================================================== */

    function dataStart(data) {
        return toDate(data && data.timeline && data.timeline.start);
    }

    function dataEnd(data) {
        return toDate(data && data.timeline && data.timeline.end);
    }

    /*
        ความกว้างต่อวัน (pxPerDay) ของ app.js = กว้างจอ ÷ จำนวนวันใน 6 เดือนนับจากวันเริ่ม
        → 6 เดือนมี 181–184 วันแล้วแต่เดือนที่เริ่ม: เลื่อนวันเริ่มแล้วกล่องทุกกล่องกว้าง/แคบลงนิด ๆ
          แต่ตัวอักษรเท่าเดิม → ข้อความที่พอดีกล่องพอดีขึ้นบรรทัดใหม่ (หน้าตาเพี้ยนจากที่บันทึก)
        แก้: ปรับ zoom ชดเชยให้ px ต่อวันเท่าเดิม → กล่อง / ข้อความ เหมือนเดิมทุก px
    */
    function referenceDays(start) {
        if (typeof addMonths !== "function" || typeof daysBetween !== "function") return 0;
        return Math.max(1, daysBetween(start, addMonths(start, typeof VISIBLE_MONTHS_DEFAULT === "number" ? VISIBLE_MONTHS_DEFAULT : 6)));
    }

    /* totalDays = จำนวนวันจริงของแผน (วันเริ่ม → วันจบ ไม่รวม +1 ของ table-fit.js) */
    function keepScaleFactor(oldStart, newStart, totalDays) {
        /* ใช้สูตรเดียวกับ app.js (6 เดือน / พอดีทั้งแผน) */
        if (typeof timelineFitDays === "function" && Number.isFinite(totalDays)) {
            const a = timelineFitDays(oldStart, totalDays);
            const b = timelineFitDays(newStart, totalDays);
            return a > 0 && b > 0 ? b / a : 1;
        }
        const a = referenceDays(oldStart);
        const b = referenceDays(newStart);
        return a > 0 && b > 0 ? b / a : 1;
    }

    function shiftData(data, days) {

        days = Math.round(Number(days) || 0);

        if (!data || !days) return data;

        const timeline = data.timeline || (data.timeline = {});
        const start = toDate(timeline.start);
        const end = toDate(timeline.end);

        if (start) timeline.start = toText(plusDays(start, days));
        if (end) timeline.end = toText(plusDays(end, days));

        if (start && Number.isFinite(Number(timeline.zoom))) {
            const total = end ? Math.round((end - start) / 86400000) : NaN;
            timeline.zoom = Number(timeline.zoom) * keepScaleFactor(start, plusDays(start, days), total);
        }

        /* scrollLeft เป็น px นับจากวันเริ่ม → คงไว้ (เห็นช่วงเดิมของแผน) */

        (Array.isArray(data.objects) ? data.objects : []).forEach(object => {
            const date = object ? toDate(object.linkedHeaderDate) : null;
            if (date) object.linkedHeaderDate = toText(plusDays(date, days));
        });

        (Array.isArray(data.images) ? data.images : []).forEach(item => {
            if (item && Number.isFinite(Number(item.day))) item.day = Number(item.day) + days;
        });

        /* ช่วงวันที่ซ่อน/รวบ (เก็บเป็นวันที่จริง) → เลื่อนตามแผน · ชุดเสาร์–อาทิตย์ → สร้างใหม่ตามวันของช่วงใหม่ */
        const folds = data.dayFolds;
        if (folds && Array.isArray(folds.items)) {
            const weekend = folds.items.some(item => item && item.group === "weekend");
            folds.items = folds.items.filter(item => item && item.group !== "weekend").map(item => {
                const from = toDate(item.from);
                const to = toDate(item.to);
                return from && to ? { ...item, from: toText(plusDays(from, days)), to: toText(plusDays(to, days)) } : item;
            });
            if (weekend) folds.weekends = true;
        }

        return data;
    }


    /* =====================================================
       2) เลื่อนแผนที่เปิดอยู่
    ===================================================== */

    function shiftLive(days, options = {}) {

        days = Math.round(Number(days) || 0);

        if (!days) return false;

        /* จดสภาพก่อนเลื่อนไว้ก่อน (ซ้ำกับขั้นล่าสุด = ไม่เพิ่ม) → Ctrl+Z กลับมาตรงนี้พอดี */
        record();

        const newStart = plusDays(timelineStartDate, days);

        /* กล่อง / ข้อความ กว้างเท่าเดิมทุก px (ดู keepScaleFactor) */
        if (typeof zoomScale === "number") {
            zoomScale = Math.max(typeof ZOOM_MIN === "number" ? ZOOM_MIN : 0.1,
                Math.min(typeof ZOOM_MAX === "number" ? ZOOM_MAX : 10, zoomScale * keepScaleFactor(timelineStartDate, newStart,
                    Math.round((timelineEndDate - timelineStartDate) / 86400000))));
        }

        /* task / hline: x นับจากวันเริ่ม → บอก zoom-sync ว่าไม่ต้องแปลงกลับไปวันเดิม */
        if (window.ZGZoomSync && typeof window.ZGZoomSync.setBaseline === "function") {
            window.ZGZoomSync.setBaseline(pxPerDay, newStart);
        }

        timelineStartDate = newStart;

        if (options.keepEnd !== true) {
            timelineEndDate = plusDays(timelineEndDate, days);
        }

        timelineObjects.forEach(object => {
            if (object && object.linkedHeaderDate instanceof Date && !isNaN(object.linkedHeaderDate)) {
                object.linkedHeaderDate = plusDays(object.linkedHeaderDate, days);
            }
        });

        if (window.ZGBoardImages && typeof window.ZGBoardImages.list === "function") {
            const list = window.ZGBoardImages.list();
            if (list && list.length) {
                window.ZGBoardImages.load(list.map(item => ({ ...item, day: Number(item.day) + days })));
            }
        }

        syncDateInputs();
        renderSchedule();

        /* ช่วงวันที่ซ่อน/รวบ เลื่อนตามแผน */
        if (window.ZGFold && typeof window.ZGFold.shift === "function") window.ZGFold.shift(days);

        if (typeof updateAllHorizontalRanges === "function") updateAllHorizontalRanges();

        record();

        return true;
    }


    /* =====================================================
       3) ปุ่ม 🔗 งานตามวันเริ่ม (ข้างช่องวันเริ่มต้น)
    ===================================================== */

    function readLink() {
        try {
            return localStorage.getItem(LINK_KEY) !== "0";
        } catch (error) {
            return true;
        }
    }

    function writeLink(value) {
        try {
            localStorage.setItem(LINK_KEY, value ? "1" : "0");
        } catch (error) { /* ignore */ }
    }

    let linked = readLink();

    const style = document.createElement("style");

    style.textContent = `
.zg-link-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 9px;
    border: 1px solid #dde3e0;
    border-radius: 999px;
    background: #ffffff;
    color: #6f7873;
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color .15s ease, border-color .15s ease, color .15s ease;
}
.zg-link-btn:hover { border-color: #b9c4bd; color: #3d4541; }
.zg-link-btn[aria-pressed="true"] { background: #e8f4ec; border-color: #9fd0aa; color: #1e6b3c; }
.zg-link-btn:focus-visible { outline: 2px solid #3a8a4f; outline-offset: 2px; }
.zg-link-btn-icon { font-size: 12px; line-height: 1; }
/* จอไม่กว้าง: เหลือแค่ไอคอน (สถานะดูจากสีเขียว / ชี้ดูคำอธิบาย) ไม่ให้ toolbar ขึ้นแถวเพิ่ม */
@media (max-width: 1499px) {
    .zg-link-btn { width: 30px; padding: 0; justify-content: center; }
    .zg-link-btn-text { display: none; }
}
html.zg-screen-xl .zg-link-btn { height: 32px; font-size: 12px; }
body.zg-dark .zg-link-btn { background: #2b3330; border-color: #3a4440; color: #a9b4ae; }
body.zg-dark .zg-link-btn[aria-pressed="true"] { background: #1f3a2a; border-color: #2f6b45; color: #9fe0b3; }

/* ---------- ช่องเลือกวันวางแผน (ใช้ร่วม: เมนูเทมเพลต / หน้าเริ่มต้น / ชุดสำเร็จ) ---------- */
.zg-place { display: flex; flex-direction: column; gap: 6px; }
.zg-place-label { display: flex; flex-direction: column; gap: 5px; color: #6f7873; font-size: 11px; font-weight: 600; line-height: 1.5; }
.zg-place-input {
    width: 100%;
    height: 34px;
    box-sizing: border-box;
    padding: 0 10px;
    border: 1px solid #dde3e0;
    border-radius: 8px;
    background: #ffffff;
    color: #1e2924;
    font-family: inherit;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}
.zg-place-input:focus { outline: none; border-color: #3a8a4f; box-shadow: 0 0 0 3px rgba(58, 138, 79, .16); }
.zg-place-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.zg-place-chip {
    padding: 3px 9px;
    border: 1px solid #dde3e0;
    border-radius: 999px;
    background: #ffffff;
    color: #3d4541;
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
}
.zg-place-chip:hover { border-color: #9fd0aa; background: #f6fbf7; }
.zg-place-chip.on { border-color: #3a8a4f; background: #eef8f1; color: #1e6b3c; font-weight: 700; }
.zg-place-chip:focus-visible { outline: 2px solid #3a8a4f; outline-offset: 1px; }
.zg-place-note { color: #6f7873; font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums; }
.zg-place-note b { color: #1e2924; font-weight: 700; }
body.zg-dark .zg-place-input,
body.zg-dark .zg-place-chip { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-place-chip.on { background: #1f3a2a; border-color: #2f6b45; color: #9fe0b3; }
body.zg-dark .zg-place-note,
body.zg-dark .zg-place-label { color: #a9b4ae; }
body.zg-dark .zg-place-note b { color: #e3e9e5; }

body.zg-exporting .zg-link-btn { visibility: hidden; }
`;

    document.head.appendChild(style);

    const startInput = document.getElementById("timelineStartInput");

    let linkButton = null;

    function paintLink() {

        if (!linkButton) return;

        linkButton.setAttribute("aria-pressed", linked ? "true" : "false");

        linkButton.innerHTML =
            `<span class="zg-link-btn-icon" aria-hidden="true">${linked ? "🔗" : "⛓"}</span>` +
            `<span class="zg-link-btn-text">${escapeText(linked ? L("งานตามวันเริ่ม", "Move tasks", "連動") : L("งานอยู่กับที่", "Keep dates", "固定"))}</span>`;

        linkButton.setAttribute("aria-label", linked
            ? L("งานเลื่อนตามวันเริ่มต้น: เปิด", "Move tasks with start date: on", "開始日に連動：オン")
            : L("งานเลื่อนตามวันเริ่มต้น: ปิด", "Move tasks with start date: off", "開始日に連動：オフ"));

        linkButton.title = linked
            ? L("เปิดอยู่: เปลี่ยนวันเริ่มต้น → งาน เส้น รูป ทั้งแผนเลื่อนตามไปด้วย (กดเพื่อปิด)",
                "On: changing the start date moves every task, line and image with it (click to turn off)",
                "オン：開始日を変えると全ての項目が一緒に移動します")
            : L("ปิดอยู่: เปลี่ยนวันเริ่มต้น → งานอยู่วันที่เดิม เปลี่ยนแค่ช่วงที่แสดง (กดเพื่อเปิด)",
                "Off: changing the start date only changes the visible range; items keep their dates (click to turn on)",
                "オフ：表示範囲だけ変わり、項目の日付は固定");
    }

    if (startInput) {

        linkButton = document.createElement("button");
        linkButton.type = "button";
        linkButton.id = "startLinkBtn";
        linkButton.className = "zg-link-btn";

        /* วางต่อจากช่องวันเริ่มต้น (ก่อนป้าย "วันสิ้นสุด") */
        startInput.insertAdjacentElement("afterend", linkButton);

        paintLink();

        linkButton.addEventListener("click", () => {
            linked = !linked;
            writeLink(linked);
            paintLink();
            toast(linked
                ? L("🔗 เปลี่ยนวันเริ่มต้นแล้ว งานทั้งแผนจะเลื่อนตาม", "🔗 Tasks now move with the start date", "🔗 開始日に連動します")
                : L("งานอยู่วันที่เดิม — เปลี่ยนวันเริ่มต้นแค่เปลี่ยนช่วงที่แสดง", "Tasks keep their dates", "項目の日付を固定します"));
        });

        /* เปลี่ยนภาษา (ปุ่ม 🌐) → เขียนป้ายใหม่ */
        document.addEventListener("click", event => {
            if (event.target instanceof Element && event.target.closest("#langToggleBtn, .zg-lang-menu, [data-lang]")) {
                setTimeout(paintLink, 60);
            }
        });

        /*
            ดักก่อน app.js (capture ที่ document): โหมด 🔗 → เลื่อนทั้งแผนแทน
            โหมดปิด → ปล่อยให้ app.js ทำแบบเดิม
        */
        document.addEventListener("change", event => {

            if (event.target !== startInput || !linked) return;

            event.stopPropagation();

            const candidate = toDate(startInput.value);

            if (!candidate) {
                syncDateInputs();
                return;
            }

            const days = diffDays(timelineStartDate, candidate);

            if (!days) {
                syncDateInputs();
                scrollToStart();
                return;
            }

            shiftLive(days);

            scrollToStart();

        }, true);

        /* โหมด 🔗 ปิด → app.js เปลี่ยนวันเริ่มเอง (event ถึงช่องนี้ตามปกติ) → เลื่อนไปเริ่มที่วันนั้นด้วย */
        startInput.addEventListener("change", () => {
            if (!linked) scrollToStart();
        });
    }


    /* =====================================================
       4) ช่องเลือก "วางแผนเริ่มที่วันที่"
       picker(container, { sourceStart, sourceEnd, initial }) → { get(), days() }
    ===================================================== */

    /* เลือกวันเริ่มต้นแล้ว → ตารางเลื่อนไปเริ่มที่วันนั้น (ช่องแรกที่เห็น = วันเริ่มต้น) */
    function scrollToStart() {

        requestAnimationFrame(() => {

            if (typeof timelineViewport === "undefined") return;

            timelineViewport.scrollLeft = 0;
            timelineViewport.dispatchEvent(new Event("scroll"));

            if (typeof updateAllHorizontalRanges === "function") updateAllHorizontalRanges();
        });
    }

    function monthStart(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    function today() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    function picker(container, options = {}) {

        const sourceStart = toDate(options.sourceStart) || null;
        const sourceEnd = toDate(options.sourceEnd) || null;
        const boardStart = toDate(timelineStartDate);

        const choices = [
            { key: "board", label: L("ตามผังตอนนี้", "Current board", "現在のボード"), date: boardStart },
            { key: "month", label: L("ต้นเดือนนี้", "This month", "今月初め"), date: monthStart(today()) },
            { key: "next", label: L("ต้นเดือนหน้า", "Next month", "来月初め"), date: monthStart(plusDays(monthStart(today()), 40)) },
            { key: "source", label: options.sourceLabel || L("วันเดิมของเทมเพลต", "Original dates", "元の日付"), date: sourceStart }
        ].filter(item => item.date);

        /* ค่าเริ่มต้น = วันเริ่มของผังที่เปิดอยู่ (เทมเพลตไม่จำวันที่ — จำแค่การจัดวาง · เลื่อนแล้วหน้าตาเหมือนเดิมเป๊ะ) */
        const initial = toDate(options.initial) || boardStart || sourceStart || today();

        container.classList.add("zg-place");

        container.innerHTML = `
            <label class="zg-place-label">${escapeText(options.label || L("วางแผนเริ่มที่วันที่", "Start the plan on", "開始日"))}
                <input type="date" class="zg-place-input" value="${toText(initial)}" required>
            </label>
            <div class="zg-place-chips" role="group" aria-label="${escapeText(L("ทางลัดวันที่", "Date shortcuts", "日付ショートカット"))}">
                ${choices.map(item => `<button type="button" class="zg-place-chip" data-key="${item.key}" title="${escapeText(prettyDate(item.date))}">${escapeText(item.label)}</button>`).join("")}
            </div>
            <div class="zg-place-note" aria-live="polite"></div>
        `;

        const input = container.querySelector(".zg-place-input");
        const note = container.querySelector(".zg-place-note");

        function value() {
            return toDate(input.value) || initial;
        }

        function days() {
            return sourceStart ? diffDays(sourceStart, value()) : 0;
        }

        function paint() {

            const start = value();

            container.querySelectorAll(".zg-place-chip").forEach(chip => {
                const item = choices.find(choice => choice.key === chip.dataset.key);
                chip.classList.toggle("on", Boolean(item) && diffDays(item.date, start) === 0);
            });

            if (sourceStart && sourceEnd) {
                const shift = days();
                note.innerHTML =
                    `${escapeText(L("ช่วงแผน", "Plan range", "期間"))} <b>${escapeText(prettyDate(start))} – ${escapeText(prettyDate(plusDays(sourceEnd, shift)))}</b>` +
                    ` · ${escapeText(signedDays(shift))}`;
            } else {
                note.textContent = prettyDate(start);
            }

            if (typeof options.onChange === "function") options.onChange(start);
        }

        container.addEventListener("click", event => {
            const chip = event.target instanceof Element ? event.target.closest(".zg-place-chip") : null;
            if (!chip) return;
            const item = choices.find(choice => choice.key === chip.dataset.key);
            if (!item) return;
            input.value = toText(item.date);
            paint();
        });

        input.addEventListener("input", paint);
        input.addEventListener("change", paint);

        paint();

        return { get: value, days, input };
    }


    window.ZGPlanShift = {
        shiftData,
        shiftLive,
        picker,
        dataStart,
        dataEnd,
        diffDays,
        toDate,
        prettyDate,
        isLinked: () => linked
    };

})();
