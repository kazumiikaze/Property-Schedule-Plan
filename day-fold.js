"use strict";

/* =========================================================
   DAY-FOLD.JS — ซ่อน / รวบ วันที่บนตาราง
   ---------------------------------------------------------
   ผู้ใช้กำหนด "ช่วงพับ" (fold) ได้ 3 แบบ
     hide      ซ่อนวัน / ช่วงวัน      → เหลือแถบบาง ๆ (คลิกแถบ = เปิดกลับ)
     month     รวบทั้งเดือน           → แถบแคบมีชื่อเดือน (คลิก = เปิดกลับ)
     compress  รวบช่วงวันให้แคบลง     → ช่วงวันที่เลือกกว้างเท่า N วัน (ยังเห็นงานในช่วงนั้น)
   ช่วงที่เปิดกลับแล้ว (off) ยังจำไว้ → มีแถบ "ย่อกลับ" บนหัวตาราง กดพับกลับได้

   หลักการ: ข้อมูลทุกอย่างยังเก็บเป็น px แบบเส้นตรงเหมือนเดิม (logical)
   ไฟล์นี้แปลงเฉพาะ "ตำแหน่งที่วาดบนจอ" (display) ด้วยฟังก์ชันแปลงแกนเวลา F / G
     F(logical px) → display px     G(display px) → logical px
   - หลังวาดตาราง / object เสร็จ → เลื่อน left / width ของทุกชิ้นในตารางตาม F
   - ระหว่างลาก object → แปลงระยะเมาส์บนจอกลับเป็นระยะจริงด้วย G
   - ไม่มีช่วงพับ = F, G เป็นค่าเดิม (ไม่มีผลอะไรเลย)

   - ซ่อน / รวบวันในช่วงที่ตารางแสดง (6 เดือนแรก หรือทั้งแผน) → ที่ว่างที่ได้คืนมา
     แบ่งให้วันที่เหลือ ช่องวันกว้างขึ้นจนตารางเต็มหน้าเท่าเดิม (zoom-sync.js ย้าย object ตามวันให้)
   เก็บในแผน (ZGPlanIO) → บันทึก / เปิดแผน / ย้อนกลับ (Ctrl+Z) / Export ได้ครบ
   โหลดเป็นไฟล์สุดท้าย (หลังทุกไฟล์ที่ครอบ renderObjects / handleObjectDragMove)
========================================================= */

(function () {

    if (typeof renderSchedule !== "function" || typeof renderObjects !== "function") {
        console.error("[day-fold.js] ต้องโหลดหลัง app.js");
        return;
    }

    const DAY_MS = 86400000;
    const HIDE_W = 12;          // ความกว้างแถบของช่วงที่ซ่อน (px)
    const MONTH_W = 26;         // ความกว้างแถบของเดือนที่รวบ (px)
    const TINY_LABEL = 9;       // ช่องวันแคบกว่านี้ → ไม่แสดงเลขวัน
    const TINY_GRID = 3;        // ช่องวันแคบกว่านี้ → ไม่วาดเส้นแบ่งวัน

    const MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

    let folds = [];             // { id, kind, from, to, days?, off?, group? }
    let showAll = false;        // แสดงทุกวันชั่วคราว (ไม่ลบช่วงพับ)
    let version = 0;


    /* =====================================================
       วันที่ ↔ ข้อความ
    ===================================================== */

    function pad(n) { return String(n).padStart(2, "0"); }

    function ymd(date) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    function parseYmd(text) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || ""));
        return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
    }

    function startMidnight() {
        const s = new Date(timelineStartDate);
        return new Date(s.getFullYear(), s.getMonth(), s.getDate());
    }

    function dayIndexOf(text) {
        const date = parseYmd(text);
        if (!date) return NaN;
        return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
            Date.UTC(startMidnight().getFullYear(), startMidnight().getMonth(), startMidnight().getDate())) / DAY_MS);
    }

    function dateOfIndex(index) {
        const s = startMidnight();
        return new Date(s.getFullYear(), s.getMonth(), s.getDate() + index);
    }

    function thaiShort(date) {
        return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${String(date.getFullYear() + 543).slice(-2)}`;
    }

    function rangeText(fold) {
        const a = parseYmd(fold.from);
        const b = parseYmd(fold.to);
        if (!a || !b) return "";
        if (fold.kind === "month") return `${MONTHS_SHORT[a.getMonth()]} ${a.getFullYear() + 543}`;
        if (+a === +b) return thaiShort(a);
        if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
            return `${a.getDate()}–${b.getDate()} ${MONTHS_SHORT[a.getMonth()]} ${String(a.getFullYear() + 543).slice(-2)}`;
        }
        return `${thaiShort(a)} – ${thaiShort(b)}`;
    }

    function lengthDays(fold) {
        const a = parseYmd(fold.from);
        const b = parseYmd(fold.to);
        return a && b ? Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DAY_MS) + 1 : 0;
    }

    function uid() {
        return `fold-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    }


    /* =====================================================
       แผนที่แกนเวลา (F / G)
    ===================================================== */

    let map = null;
    let mapKey = "";

    function ready() {
        return typeof pxPerDay === "number" && pxPerDay > 0 && timelineStartDate instanceof Date && !isNaN(timelineStartDate);
    }

    function activeFolds() {
        return showAll ? [] : folds.filter(fold => !fold.off);
    }

    function segmentWidth(kind, logicalW, fold) {
        if (kind === "compress") {
            const target = Math.max(0.5, Number(fold.days) || 1) * pxPerDay;
            return Math.max(2, Math.min(target, logicalW * 0.95));
        }
        if (kind === "month") return Math.max(4, Math.min(MONTH_W, logicalW * 0.6));
        return Math.max(3, Math.min(HIDE_W, logicalW * 0.55));
    }

    function getMap() {

        if (!ready()) return null;

        const total = typeof timelineTotalDays === "number" ? timelineTotalDays : 0;
        const key = `${+startMidnight()}|${pxPerDay}|${total}|${version}|${showAll}`;

        if (map && key === mapKey) return map;

        const ppd = pxPerDay;
        const raw = [];

        activeFolds().forEach(fold => {
            const a = Math.max(0, dayIndexOf(fold.from));
            const b = Math.min(total, dayIndexOf(fold.to) + 1);
            if (Number.isFinite(a) && Number.isFinite(b) && b > a) raw.push({ fold, a, b });
        });

        raw.sort((x, y) => x.a - y.a || y.b - x.b);

        /* ช่วงซ้อนกัน → ตัดส่วนที่ซ้อนของช่วงหลังทิ้ง */
        const segs = [];
        raw.forEach(seg => {
            const last = segs[segs.length - 1];
            if (last && seg.a < last.b) seg.a = last.b;
            if (seg.b > seg.a) segs.push(seg);
        });

        const Lx = [0];
        const Dx = [0];
        let lastL = 0;
        let lastD = 0;

        segs.forEach(seg => {
            const L0 = seg.a * ppd;
            const L1 = seg.b * ppd;
            const D0 = lastD + (L0 - lastL);
            const D1 = D0 + segmentWidth(seg.fold.kind, L1 - L0, seg.fold);
            Lx.push(L0, L1);
            Dx.push(D0, D1);
            Object.assign(seg, { L0, L1, D0, D1 });
            lastL = L1;
            lastD = D1;
        });

        map = { segs, Lx, Dx, ppd };
        mapKey = key;

        return map;
    }

    /*
        ความกว้างบนจอของ "วันแรก ถึง วันที่ days" ถ้าใช้ ppd px ต่อวัน (คิดช่วงพับแบบเดียวกับ getMap)
    */
    function displayWidthFor(ppd, days) {
        const total = typeof timelineTotalDays === "number" ? timelineTotalDays : 0;
        const raw = [];
        activeFolds().forEach(fold => {
            const a = Math.max(0, dayIndexOf(fold.from));
            const b = Math.min(total, dayIndexOf(fold.to) + 1);
            if (Number.isFinite(a) && Number.isFinite(b) && b > a) raw.push({ fold, a, b });
        });
        raw.sort((x, y) => x.a - y.a || y.b - x.b);
        let width = days * ppd;
        let lastB = 0;
        raw.forEach(seg => {
            const a = Math.max(seg.a, lastB);
            if (seg.b <= a) return;
            lastB = seg.b;
            const inA = Math.min(a, days);
            const inB = Math.min(seg.b, days);
            if (inB <= inA) return;
            const logicalW = (seg.b - a) * ppd;
            const shown = segmentWidthAt(seg.fold.kind, logicalW, seg.fold, ppd);
            /* ช่วงพับที่เลยขอบช่วงที่แสดง → คิดตามสัดส่วนที่อยู่ข้างใน */
            const share = (inB - inA) / (seg.b - a);
            width += (shown - logicalW) * share;
        });
        return width;
    }

    function segmentWidthAt(kind, logicalW, fold, ppd) {
        if (kind === "compress") {
            const target = Math.max(0.5, Number(fold.days) || 1) * ppd;
            return Math.max(2, Math.min(target, logicalW * 0.95));
        }
        if (kind === "month") return Math.max(4, Math.min(MONTH_W, logicalW * 0.6));
        return Math.max(3, Math.min(HIDE_W, logicalW * 0.55));
    }

    /*
        เรียกจาก zoom-sync.js ระหว่างคำนวณแกนเวลา (ก่อนย้าย object ตามวันที่)
        ช่วงที่ตารางแสดงเต็มหน้า (6 เดือนแรก / ทั้งแผน) มีวันที่ถูกรวบ → เพิ่ม px ต่อวัน
        จนช่วงนั้นกว้างเท่าเดิม (= เต็มหน้าเหมือนตอนไม่รวบ)
    */
    window.ZGGeometryAdjust = function () {
        if (!ready() || !activeFolds().length || typeof timelineFitDays !== "function") return;
        const total = typeof timelineTotalDays === "number" ? timelineTotalDays : 0;
        const days = Math.min(timelineFitDays(timelineStartDate, total), total + 1);
        if (!(days > 0)) return;
        const base = pxPerDay;
        const target = base * days;
        /*
            คิดจาก "ทั้งแผน" ไม่ใช่แค่ช่วงที่แสดง:
            - แผนยาวกว่าหน้าจอ (เช่น 7+ เดือนในมุมมอง 6 เดือน) → เดือนถัดไปเลื่อนเข้ามาเติมที่ว่างที่ถูกรวบ ช่องวันไม่ขยาย
            - เดือนที่เหลือเลื่อนมาแล้วยังไม่เต็มหน้า → ขยายช่องวันเท่าที่ขาด
            - แผนไม่เกินหน้าจอ → ขยายให้เต็มหน้าเหมือนเดิม
        */
        const span = Math.max(days, total);
        if (displayWidthFor(base, span) >= target - 0.5) return;
        /* หา px ต่อวันที่ทำให้ทั้งแผนกว้างเท่า target (ความกว้างเพิ่มตาม px ต่อวันเสมอ) */
        let ppd = base;
        for (let i = 0; i < 8; i += 1) {
            const shown = displayWidthFor(ppd, span);
            if (!(shown > 0)) break;
            const next = ppd * target / shown;
            if (Math.abs(next - ppd) < 1e-6) break;
            ppd = next;
        }
        /* ไม่เกิน 8 เท่า (เผื่อรวบเกือบทั้งช่วง) · ไม่แคบกว่าเดิม */
        ppd = Math.max(base, Math.min(base * 8, ppd));
        if (Math.abs(ppd - base) < 1e-6) return;
        pxPerDay = ppd;
        timelineWidthPx = total * pxPerDay;
        if (typeof timelineContent !== "undefined" && timelineContent) {
            timelineContent.style.width = `${timelineWidthPx}px`;
            timelineContent.style.minWidth = `${timelineWidthPx}px`;
        }
        if (typeof bracketContent !== "undefined" && bracketContent) {
            bracketContent.style.width = `${timelineWidthPx}px`;
            bracketContent.style.minWidth = `${timelineWidthPx}px`;
        }
    };

    function interp(value, from, to) {

        if (!(value > 0)) return value;

        let i = from.length - 1;
        while (i > 0 && from[i] > value) i -= 1;

        if (i >= from.length - 1) return to[i] + (value - from[i]);

        const span = from[i + 1] - from[i];
        if (!(span > 0)) return to[i + 1];

        return to[i] + (value - from[i]) * (to[i + 1] - to[i]) / span;
    }

    /* logical px (นับจากวันเริ่ม) → px บนจอ */
    function F(x) {
        const m = getMap();
        if (!m || !m.segs.length || !Number.isFinite(x)) return x;
        return interp(x, m.Lx, m.Dx);
    }

    /* px บนจอ → logical px */
    function G(x) {
        const m = getMap();
        if (!m || !m.segs.length || !Number.isFinite(x)) return x;
        return interp(x, m.Dx, m.Lx);
    }

    function isActive() {
        const m = getMap();
        return Boolean(m && m.segs.length);
    }

    /* ช่วงพับที่ครอบตำแหน่ง logical นี้ (ไม่นับขอบ) */
    function segAt(x) {
        const m = getMap();
        if (!m) return null;
        return m.segs.find(seg => x > seg.L0 + 0.01 && x < seg.L1 - 0.01) || null;
    }

    /* ความกว้างบนจอของ 1 วัน ณ ตำแหน่ง logical นี้ */
    function dayWidthAt(x) {
        const seg = segAt(x);
        if (!seg) return pxPerDay;
        return (seg.D1 - seg.D0) / ((seg.L1 - seg.L0) / pxPerDay);
    }


    /* =====================================================
       เลื่อนตำแหน่งที่วาดบนจอ (warp)
    ===================================================== */

    /* ชิ้นที่ "จุดกึ่งกลาง" คือตำแหน่ง (ไม่ยืดตามแกน) */
    const CENTER_CLASSES = [
        "canvas-object--vline",
        "canvas-object--dateline-chip",
        "zg-dateline-stem",
        "zg-vline-stem",
        "zg-line-hit"
    ];

    /* วาดจากตำแหน่งบนจอของเส้นอีกที → แปลงเฉพาะตอนวาดพร้อมกันใน renderObjects */
    const DERIVED_CLASSES = ["zg-dateline-stem", "zg-vline-stem", "zg-line-hit"];

    function containers() {
        return [
            document.getElementById("timelineHeaderInner"),
            document.getElementById("scheduleGrid"),
            document.getElementById("objectLayer"),
            document.getElementById("bracketContent")
        ].filter(Boolean);
    }

    function widthContainers() {
        return [
            document.getElementById("timelineHeaderInner"),
            document.getElementById("timelineContent"),
            document.getElementById("bracketContent")
        ].filter(Boolean);
    }

    function hasClass(el, list) {
        for (let i = 0; i < list.length; i += 1) if (el.classList.contains(list[i])) return true;
        return false;
    }

    function px(value) {
        return typeof value === "string" && value.endsWith("px") ? parseFloat(value) : null;
    }

    function warpElement(el, allowDerived) {

        if (!el || el.nodeType !== 1 || el.dataset.zgFold !== undefined) return;
        if (!allowDerived && hasClass(el, DERIVED_CLASSES) && !el.__zgw) return;

        const st = el.style;
        const leftNow = px(st.left);

        if (leftNow === null) return;

        let w = el.__zgw;

        if (!w) {
            w = el.__zgw = { ll: leftNow, lw: px(st.width), outL: null, outW: null };
        } else {
            const leftChanged = st.left !== w.outL;
            const widthChanged = w.outW !== null ? st.width !== w.outW : px(st.width) !== null && w.lw === null;
            if (leftChanged) w.ll = leftNow;
            if (widthChanged) w.lw = px(st.width);
            if (!leftChanged && !widthChanged && w.version === version && w.key === mapKey) return;
        }

        const center = hasClass(el, CENTER_CLASSES);
        const ll = w.ll;
        const lw = w.lw;

        let outLeft;
        let outWidth = null;
        let gone = false;
        let tiny = false;

        if (lw === null) {

            outLeft = F(ll);
            const seg = segAt(ll);
            gone = Boolean(seg && seg.fold.kind !== "compress") ||
                (el.classList.contains("dynamic-v-line--day") && dayWidthAt(ll) < TINY_GRID && !isBoundary(ll));

        } else if (center) {

            const mid = ll + lw / 2;
            outLeft = F(mid) - lw / 2;
            const seg = segAt(mid);
            gone = Boolean(seg && seg.fold.kind !== "compress");

        } else {

            outLeft = F(ll);
            outWidth = Math.max(0, F(ll + lw) - outLeft);

            const seg = segAt(ll + lw / 2);
            if (seg && seg.fold.kind !== "compress" && ll >= seg.L0 - 0.5 && ll + lw <= seg.L1 + 0.5) gone = true;

            /* ซ่อนเลขวันเฉพาะในช่วงที่รวบจนแคบ (ช่องวันปกติไม่ยุ่ง — แม้จะแคบเพราะซูมออก) */
            const squeezed = Boolean(seg) || outWidth < lw - 0.5;
            if (squeezed && el.classList.contains("day-number-label") && outWidth < TINY_LABEL) tiny = true;
            if (squeezed && el.classList.contains("month-label") && outWidth < 30) tiny = true;
        }

        st.left = `${outLeft}px`;
        if (outWidth !== null) st.width = `${outWidth}px`;

        w.outL = st.left;
        w.outW = outWidth !== null ? st.width : null;
        w.version = version;
        w.key = mapKey;

        el.classList.toggle("zg-fold-gone", gone);
        el.classList.toggle("zg-fold-tiny", tiny);
    }

    function isBoundary(x) {
        const m = getMap();
        return Boolean(m && m.segs.some(seg => Math.abs(seg.L0 - x) < 0.5 || Math.abs(seg.L1 - x) < 0.5));
    }

    function warpContainerWidth(el) {

        if (!el) return;

        const st = el.style;
        const width = px(st.width);

        if (width === null) return;

        let w = el.__zgcw;

        const logicalTotal = typeof timelineWidthPx === "number" ? timelineWidthPx : NaN;

        if (!w || st.width !== w.out) {
            /* ตั้งความกว้างใหม่จากภายนอก: ถ้าเท่ากับความยาวตารางจริง = ค่า logical (Export ขยายพื้นที่ชั่วคราว = ปล่อยไว้) */
            if (Math.abs(width - logicalTotal) > 0.5) { el.__zgcw = null; return; }
            w = el.__zgcw = { logical: width, out: null };
        } else if (w.key === mapKey) {
            return;
        }

        const out = `${F(w.logical)}px`;
        st.width = out;
        if (px(st.minWidth) !== null) st.minWidth = out;
        w.out = st.width;
        w.key = mapKey;
    }

    let warping = false;

    function warpAll(allowDerived) {

        if (warping) return;
        warping = true;

        try {
            getMap();
            containers().forEach(box => {
                Array.from(box.children).forEach(el => warpElement(el, allowDerived));
            });
            widthContainers().forEach(warpContainerWidth);
            drawMarks();
        } catch (error) {
            console.error("[day-fold.js]", error);
        } finally {
            warping = false;
        }
    }

    /* ตำแหน่งที่ถูกตั้งใหม่นอกรอบวาด (เช่นระหว่างลาก) → แปลงทันทีก่อนจอวาด */
    const observer = new MutationObserver(records => {

        if (warping) return;

        const boxes = new Set(containers());
        const widthBoxes = new Set(widthContainers());
        const touched = new Set();

        records.forEach(record => {
            const target = record.target;
            if (record.type === "attributes") {
                if (widthBoxes.has(target)) touched.add(target);
                if (target.parentElement && boxes.has(target.parentElement)) touched.add(target);
            } else {
                record.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && boxes.has(node.parentElement)) touched.add(node);
                });
            }
        });

        if (!touched.size) return;
        if (!isActive() && !Array.from(touched).some(el => el.__zgw || el.__zgcw)) return;

        warping = true;
        try {
            touched.forEach(el => {
                if (widthBoxes.has(el)) warpContainerWidth(el);
                if (el.parentElement && boxes.has(el.parentElement)) warpElement(el, false);
            });
        } finally {
            warping = false;
        }
    });

    function observeAll() {
        observer.disconnect();
        const seen = new Set();
        containers().concat(widthContainers()).forEach(el => {
            if (seen.has(el)) return;
            seen.add(el);
            observer.observe(el, { attributes: true, attributeFilter: ["style"], childList: true, subtree: true });
        });
    }


    /* =====================================================
       ครอบการวาด: วาดเสร็จ (ทุกไฟล์) → แปลงตำแหน่งทั้งหมด
    ===================================================== */

    const baseRenderObjects = renderObjects;

    renderObjects = function () {
        const result = baseRenderObjects.apply(this, arguments);
        warpAll(true);
        return result;
    };

    const baseRenderSchedule = renderSchedule;

    renderSchedule = function () {
        const result = baseRenderSchedule.apply(this, arguments);
        warpAll(true);
        observeAll();
        return result;
    };


    /* =====================================================
       ลาก object: ระยะเมาส์บนจอ → ระยะจริง (ข้ามแถบที่ซ่อน = ข้ามหลายวัน)
    ===================================================== */

    function scaleOf(el) {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, s: el.offsetWidth ? rect.width / el.offsetWidth || 1 : 1 };
    }

    /* ระยะ (px บนจอ) ที่ควรขยับจริง ระหว่างเมาส์จุดเริ่ม → จุดปัจจุบัน */
    function logicalDelta(rawStart, rawNow, refEl) {

        if (!isActive()) return rawNow - rawStart;

        const ref = refEl || document.getElementById("objectLayer");
        if (!ref) return rawNow - rawStart;

        const { left, s } = scaleOf(ref);

        return (G((rawNow - left) / s) - G((rawStart - left) / s)) * s;
    }

    let pressRef = null;

    window.addEventListener("pointerdown", event => {
        const target = event.target instanceof Element ? event.target : null;
        pressRef = target && target.closest("#bracketViewport, #bracketContent")
            ? document.getElementById("bracketContent")
            : document.getElementById("objectLayer");
    }, true);

    if (typeof handleObjectDragMove === "function") {

        const baseMove = handleObjectDragMove;

        handleObjectDragMove = function (event) {

            const state = typeof objectDragState !== "undefined" ? objectDragState : null;

            if (!state || !event || !isActive() || !Number.isFinite(event.clientX)) {
                return baseMove.apply(this, arguments);
            }

            const delta = logicalDelta(state.startClientX, event.clientX, pressRef);

            const proxy = {
                clientX: state.startClientX + delta,
                clientY: event.clientY,
                pageX: event.pageX,
                pageY: event.pageY,
                screenX: event.screenX,
                screenY: event.screenY,
                shiftKey: event.shiftKey,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                button: event.button,
                buttons: event.buttons,
                target: event.target,
                type: event.type,
                zgSynthetic: event.zgSynthetic,
                preventDefault: () => event.preventDefault(),
                stopPropagation: () => event.stopPropagation(),
                stopImmediatePropagation: () => event.stopImmediatePropagation()
            };

            return baseMove.call(this, proxy);
        };
    }

    /* ตำแหน่งวางชิ้นใหม่ (กลางส่วนที่เห็น) คิดจากจอ → แปลงเป็นค่าจริง */
    if (typeof getSpawnPosition === "function") {
        const baseSpawn = getSpawnPosition;
        getSpawnPosition = function (type) {
            const result = baseSpawn.apply(this, arguments);
            if (result && type !== "dateline" && Number.isFinite(result.x)) result.x = G(result.x);
            return result;
        };
    }


    /* =====================================================
       แถบบนตาราง (marker)
    ===================================================== */

    function clearMarks() {
        document.querySelectorAll(".zg-fold-mark, .zg-fold-ghost").forEach(node => node.remove());
    }

    function mark(container, seg, part) {

        const fold = seg.fold;
        const el = document.createElement("div");

        el.className = `zg-fold-mark zg-fold-mark--${part} is-${fold.kind}`;
        el.dataset.zgFold = fold.id;
        el.style.left = `${seg.D0}px`;
        el.style.width = `${Math.max(1, seg.D1 - seg.D0)}px`;

        const days = Math.round((seg.L1 - seg.L0) / pxPerDay);

        if (part === "head") {

            el.setAttribute("role", "button");
            el.tabIndex = -1;

            const range = rangeText({ ...fold, from: ymd(dateOfIndex(seg.a)), to: ymd(dateOfIndex(seg.b - 1)) });

            el.title = fold.kind === "compress"
                ? `รวบ ${range} (${days} วัน → ${Number(fold.days) || 1} วัน) — คลิกเพื่อขยายกลับ`
                : `ซ่อน ${range} (${days} วัน) — คลิกเพื่อเปิด`;

            const label = document.createElement("span");
            label.className = "zg-fold-mark__label";

            if (fold.kind === "month") {
                const a = dateOfIndex(seg.a);
                label.textContent = MONTHS_SHORT[a.getMonth()];
            } else if (fold.kind === "compress") {
                label.textContent = seg.D1 - seg.D0 >= 46 ? `รวบ ${days}→${Number(fold.days) || 1} วัน` : seg.D1 - seg.D0 >= 22 ? "รวบ" : "";
            } else {
                label.textContent = seg.D1 - seg.D0 >= 9 ? "⋯" : "";
            }

            el.appendChild(label);

            el.addEventListener("mousedown", event => { event.stopPropagation(); event.preventDefault(); });
            el.addEventListener("click", event => {
                event.stopPropagation();
                event.preventDefault();
                if (picking) return;
                setOff(fold.id, true);
                toast(`เปิด ${rangeText(fold)} แล้ว — คลิกแถบ “ย่อกลับ” ด้านบนเพื่อพับอีกครั้ง`);
            });
            el.addEventListener("contextmenu", event => {
                event.preventDefault();
                event.stopPropagation();
                openFoldMenu(event.clientX, event.clientY, fold);
            });
        }

        container.appendChild(el);
    }

    function ghost(container, fold) {

        const a = dayIndexOf(fold.from);
        const b = dayIndexOf(fold.to) + 1;
        const total = typeof timelineTotalDays === "number" ? timelineTotalDays : 0;

        if (!(b > 0 && a < total)) return;

        const L0 = Math.max(0, a) * pxPerDay;
        const L1 = Math.min(total, b) * pxPerDay;

        const el = document.createElement("div");
        el.className = `zg-fold-ghost is-${fold.kind}`;
        el.dataset.zgFold = fold.id;
        el.style.left = `${F(L0)}px`;
        el.style.width = `${Math.max(2, F(L1) - F(L0))}px`;
        el.title = `${rangeText(fold)} — คลิกเพื่อ${fold.kind === "compress" ? "รวบ" : "ซ่อน"}กลับ`;

        const pill = document.createElement("span");
        pill.className = "zg-fold-ghost__pill";
        pill.textContent = fold.kind === "compress" ? "รวบกลับ" : "ย่อกลับ";
        el.appendChild(pill);

        el.addEventListener("mousedown", event => { event.stopPropagation(); event.preventDefault(); });
        el.addEventListener("click", event => {
            event.stopPropagation();
            event.preventDefault();
            setOff(fold.id, false);
        });
        el.addEventListener("contextmenu", event => {
            event.preventDefault();
            event.stopPropagation();
            openFoldMenu(event.clientX, event.clientY, fold);
        });

        container.appendChild(el);
    }

    function drawMarks() {

        clearMarks();

        if (!ready()) return;

        const head = document.getElementById("timelineHeaderInner");
        const grid = document.getElementById("scheduleGrid");
        const bracket = document.getElementById("bracketContent");
        const m = getMap();

        if (m) {
            m.segs.forEach(seg => {
                if (head) mark(head, seg, "head");
                if (grid) mark(grid, seg, "body");
                if (bracket) mark(bracket, seg, "bracket");
            });
        }

        if (!showAll && head) {
            folds.filter(fold => fold.off).forEach(fold => ghost(head, fold));
        }

        if (picking && picking.preview) drawPickPreview();

        updateButton();
    }


    /* =====================================================
       เปลี่ยนช่วงพับ → วาดใหม่ (คงช่วงที่กำลังดูไว้)
    ===================================================== */

    function viewport() {
        return typeof timelineViewport !== "undefined" ? timelineViewport : null;
    }

    function commit(options = {}) {

        const vp = viewport();
        const logicalLeft = vp ? G(vp.scrollLeft) : 0;

        version += 1;
        map = null;

        renderSchedule();

        if (vp) {
            vp.scrollLeft = Math.max(0, F(logicalLeft));
            vp.dispatchEvent(new Event("scroll"));
        }

        if (typeof updateAllHorizontalRanges === "function") updateAllHorizontalRanges();

        renderPanel();

        if (options.record !== false && window.ZGHistory && typeof window.ZGHistory.record === "function") {
            setTimeout(() => window.ZGHistory.record(), 0);
        }
    }

    function normalizeFold(raw) {
        if (!raw || typeof raw !== "object") return null;
        const kind = ["hide", "month", "compress"].includes(raw.kind) ? raw.kind : "hide";
        const a = parseYmd(raw.from);
        const b = parseYmd(raw.to);
        if (!a || !b) return null;
        const [from, to] = a <= b ? [raw.from, raw.to] : [raw.to, raw.from];
        const fold = { id: typeof raw.id === "string" && raw.id ? raw.id : uid(), kind, from, to };
        if (kind === "compress") fold.days = Math.max(0.5, Math.min(365, Number(raw.days) || 1));
        if (raw.off) fold.off = true;
        if (typeof raw.group === "string") fold.group = raw.group;
        return fold;
    }

    /* ช่วงใหม่ทับช่วงเดิม → ตัดช่วงเดิมที่ทับทิ้ง (ช่วงใหม่ชนะ) */
    function addFold(raw, options = {}) {

        const fold = normalizeFold(raw);
        if (!fold) return null;

        const a = dayIndexOf(fold.from);
        const b = dayIndexOf(fold.to);

        folds = folds.filter(other => {
            if (other.off) return true;
            const oa = dayIndexOf(other.from);
            const ob = dayIndexOf(other.to);
            return ob < a || oa > b;
        });

        folds.push(fold);
        folds.sort((x, y) => dayIndexOf(x.from) - dayIndexOf(y.from));

        if (options.commit !== false) commit();

        return fold;
    }

    function removeFold(id) {
        folds = folds.filter(fold => fold.id !== id);
        commit();
    }

    function setOff(id, off) {
        const fold = folds.find(item => item.id === id);
        if (!fold) return;
        if (off) fold.off = true; else delete fold.off;
        commit();
    }

    function foldCovering(index) {
        return folds.find(fold => dayIndexOf(fold.from) <= index && dayIndexOf(fold.to) >= index) || null;
    }

    function monthFold(year, month) {
        return folds.find(fold => fold.kind === "month" && parseYmd(fold.from) && parseYmd(fold.from).getFullYear() === year && parseYmd(fold.from).getMonth() === month) || null;
    }

    function toggleMonth(year, month) {
        const existing = monthFold(year, month);
        if (existing && !existing.off) {
            removeFold(existing.id);
            return;
        }
        if (existing) {
            setOff(existing.id, false);
            return;
        }
        addFold({ kind: "month", from: ymd(new Date(year, month, 1)), to: ymd(new Date(year, month + 1, 0)) });
    }

    function hideWeekends(options = {}) {

        const total = typeof timelineTotalDays === "number" ? timelineTotalDays : 0;

        folds = folds.filter(fold => fold.group !== "weekend");

        let added = 0;

        for (let i = 0; i < total; i += 1) {
            const date = dateOfIndex(i);
            if (date.getDay() !== 6) continue;
            const from = date;
            const to = i + 1 < total ? dateOfIndex(i + 1) : date;
            if (foldCovering(i) || foldCovering(i + 1)) continue;
            folds.push({ id: uid(), kind: "hide", from: ymd(from), to: ymd(to), group: "weekend" });
            added += 1;
        }

        /* ตารางเริ่มวันอาทิตย์ */
        if (total && dateOfIndex(0).getDay() === 0 && !foldCovering(0)) {
            folds.push({ id: uid(), kind: "hide", from: ymd(dateOfIndex(0)), to: ymd(dateOfIndex(0)), group: "weekend" });
        }

        folds.sort((x, y) => dayIndexOf(x.from) - dayIndexOf(y.from));
        if (options.quiet) return;
        commit();
        toast(added ? `ซ่อนเสาร์–อาทิตย์ ${added} สัปดาห์แล้ว` : "ไม่มีเสาร์–อาทิตย์ให้ซ่อน");
    }

    function clearGroup(group) {
        folds = folds.filter(fold => fold.group !== group);
        commit();
    }

    function setShowAll(value) {
        showAll = Boolean(value);
        commit();
    }


    /* =====================================================
       เก็บในแผน
    ===================================================== */

    function exportState() {
        return {
            items: folds.map(fold => ({ ...fold })),
            showAll
        };
    }

    function importState(state) {
        const items = state && Array.isArray(state.items) ? state.items : [];
        folds = items.map(normalizeFold).filter(Boolean);
        showAll = Boolean(state && state.showAll);
        version += 1;
        map = null;
    }

    const io = window.ZGPlanIO;

    if (io && typeof io.build === "function" && typeof io.apply === "function") {

        const baseBuild = io.build;

        io.build = function () {
            const data = baseBuild.apply(this, arguments);
            if (data && typeof data === "object") {
                if (folds.length) data.dayFolds = exportState();
                else delete data.dayFolds;
            }
            return data;
        };

        const baseApply = io.apply;

        io.apply = function (data) {
            importState(data && data.dayFolds);
            const result = baseApply.apply(this, arguments);
            try {
                /* เทมเพลตที่วางที่วันใหม่: ชุดเสาร์–อาทิตย์สร้างใหม่ตามช่วงวันของแผน */
                if (data && data.dayFolds && data.dayFolds.weekends) hideWeekends({ quiet: true });
                commit({ record: false });
            } catch (error) {
                console.error("[day-fold.js]", error);
            }
            return result;
        };
    }


    /* =====================================================
       ข้อความแจ้ง
    ===================================================== */

    function toast(message) {
        if (window.ZGImage && typeof window.ZGImage.toast === "function") window.ZGImage.toast(message);
    }


    /* =====================================================
       เลือกช่วงวันบนหัวตาราง
         - คลิกขวาที่เลขวัน / ชื่อเดือน → เมนู
         - Alt + ลากบนหัวตาราง → เลือกช่วงแล้วถามว่าจะซ่อน / รวบ
         - เมนู "เลือกช่วงวัน…" → คลิกวันแรก + วันสุดท้าย
    ===================================================== */

    const header = document.getElementById("timelineHeaderInner");

    function indexAtClientX(clientX) {
        if (!header) return 0;
        const { left, s } = scaleOf(header);
        const logical = G((clientX - left) / s);
        const total = typeof timelineTotalDays === "number" ? timelineTotalDays : 1;
        return Math.max(0, Math.min(total - 1, Math.floor(logical / pxPerDay + 1e-6)));
    }

    let picking = null;   // { kind: null|"hide"|"compress", start: index|null, preview: {a,b}|null }
    let pickBanner = null;

    function startPick(kind, startIndex) {

        cancelPick();

        picking = { kind, start: Number.isFinite(startIndex) ? startIndex : null, preview: null };

        document.body.classList.add("zg-fold-picking");

        pickBanner = document.createElement("div");
        pickBanner.className = "zg-fold-banner";
        pickBanner.setAttribute("role", "status");
        pickBanner.innerHTML = `<span class="zg-fold-banner__text"></span><button type="button" class="zg-fold-banner__cancel">ยกเลิก (Esc)</button>`;
        pickBanner.querySelector("button").addEventListener("click", cancelPick);
        document.body.appendChild(pickBanner);

        updateBanner();
    }

    function updateBanner() {
        if (!pickBanner || !picking) return;
        const verb = picking.kind === "compress" ? "รวบ" : picking.kind === "hide" ? "ซ่อน" : "ซ่อน / รวบ";
        pickBanner.querySelector(".zg-fold-banner__text").textContent = picking.start === null
            ? `คลิกวันแรกของช่วงที่จะ${verb}บนหัวตาราง`
            : `เริ่ม ${thaiShort(dateOfIndex(picking.start))} — คลิกวันสุดท้ายของช่วง`;
    }

    function cancelPick() {
        picking = null;
        document.body.classList.remove("zg-fold-picking");
        if (pickBanner) pickBanner.remove();
        pickBanner = null;
        document.querySelectorAll(".zg-fold-pick").forEach(node => node.remove());
    }

    function drawPickPreview() {

        document.querySelectorAll(".zg-fold-pick").forEach(node => node.remove());

        if (!picking || !picking.preview || !header) return;

        const a = Math.min(picking.preview.a, picking.preview.b);
        const b = Math.max(picking.preview.a, picking.preview.b);

        const left = F(a * pxPerDay);
        const right = F((b + 1) * pxPerDay);

        [header, document.getElementById("scheduleGrid")].forEach(box => {
            if (!box) return;
            const el = document.createElement("div");
            el.className = "zg-fold-pick";
            el.dataset.zgFold = "pick";
            el.style.left = `${left}px`;
            el.style.width = `${Math.max(2, right - left)}px`;
            if (box === header) {
                const tag = document.createElement("span");
                tag.className = "zg-fold-pick__tag";
                tag.textContent = `${b - a + 1} วัน`;
                el.appendChild(tag);
            }
            box.appendChild(el);
        });
    }

    function finishPick(a, b, clientX, clientY) {

        const kind = picking ? picking.kind : null;
        cancelPick();

        const from = Math.min(a, b);
        const to = Math.max(a, b);
        const range = { from: ymd(dateOfIndex(from)), to: ymd(dateOfIndex(to)) };
        const days = to - from + 1;

        if (kind === "hide") {
            addFold({ kind: "hide", ...range });
            toast(`ซ่อน ${rangeText(range)} (${days} วัน) แล้ว — คลิกแถบเพื่อเปิด`);
            return;
        }

        openChoice(clientX, clientY, range, days, kind === "compress");
    }

    if (header) {

        header.addEventListener("mousemove", event => {
            if (!picking || picking.start === null) return;
            const index = indexAtClientX(event.clientX);
            picking.preview = { a: picking.start, b: index };
            drawPickPreview();
        });

        /* โหมดเลือกช่วง: คลิกบนหัวตาราง = เลือกวัน (ไม่สร้างเส้นวันที่) */
        header.addEventListener("click", event => {

            if (!picking) return;

            event.preventDefault();
            event.stopImmediatePropagation();

            const index = indexAtClientX(event.clientX);

            if (picking.start === null) {
                picking.start = index;
                picking.preview = { a: index, b: index };
                drawPickPreview();
                updateBanner();
                return;
            }

            finishPick(picking.start, index, event.clientX, event.clientY);

        }, true);

        header.addEventListener("mousedown", event => {

            if (picking) {
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
            }

            /*
                v2: กดค้างแล้วลากบนเลขวัน = เลือกช่วงวัน (ไม่ต้องกด Alt)
                  - ลากเกิน 6px ถึงนับเป็นการเลือกช่วง · คลิกเฉย ๆ ยังสร้างเส้นวันเหมือนเดิม
                  - Alt + กด = เข้าโหมดเลือกช่วงทันที (แบบเดิม)
                ปล่อยเมาส์ → ถามว่าจะ ซ่อน / รวบให้เหลือกี่วัน
            */
            if (event.button !== 0) return;
            if (event.target instanceof Element && event.target.closest(".zg-fold-mark, .zg-fold-ghost")) return;

            const start = indexAtClientX(event.clientX);
            const startX = event.clientX;
            let active = false;

            const activate = () => {
                active = true;
                picking = { kind: null, start, preview: { a: start, b: start }, drag: true };
                document.body.classList.add("zg-fold-picking", "zg-fold-dragging");
                const selection = window.getSelection();
                if (selection) selection.removeAllRanges();
                drawPickPreview();
            };

            if (event.altKey) {
                event.preventDefault();
                event.stopImmediatePropagation();
                activate();
            }

            const move = moveEvent => {
                if (!active) {
                    if (Math.abs(moveEvent.clientX - startX) < 6) return;
                    activate();
                }
                if (!picking) return;
                moveEvent.preventDefault();
                picking.preview = { a: start, b: indexAtClientX(moveEvent.clientX) };
                drawPickPreview();
            };

            const up = upEvent => {
                window.removeEventListener("mousemove", move, true);
                window.removeEventListener("mouseup", up, true);
                document.body.classList.remove("zg-fold-dragging");
                if (!active || !picking) return;
                const end = indexAtClientX(upEvent.clientX);
                finishPick(start, end, upEvent.clientX, upEvent.clientY);
                /* กันคลิกที่ตามมาไปสร้างเส้นวัน */
                const swallow = clickEvent => { clickEvent.stopImmediatePropagation(); clickEvent.preventDefault(); };
                window.addEventListener("click", swallow, { capture: true, once: true });
                setTimeout(() => window.removeEventListener("click", swallow, true), 0);
            };

            window.addEventListener("mousemove", move, true);
            window.addEventListener("mouseup", up, true);

        }, true);

        header.addEventListener("contextmenu", event => {

            if (event.target instanceof Element && event.target.closest(".zg-fold-mark, .zg-fold-ghost")) return;

            event.preventDefault();

            if (picking) {
                cancelPick();
                return;
            }

            openDayMenu(event.clientX, event.clientY, indexAtClientX(event.clientX));
        });
    }

    window.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        if (picking) {
            cancelPick();
            event.stopImmediatePropagation();
        }
        if (popover) closePopover();
    }, true);


    /* =====================================================
       เมนูลอย (คลิกขวา / ถามจำนวนวัน)
    ===================================================== */

    let popover = null;

    function closePopover() {
        if (popover) popover.remove();
        popover = null;
    }

    function openPopover(x, y, build) {

        closePopover();

        const el = document.createElement("div");
        el.className = "zg-fold-pop";
        el.setAttribute("role", "menu");

        build(el);

        document.body.appendChild(el);

        const rect = el.getBoundingClientRect();
        const left = Math.min(window.innerWidth - rect.width - 8, Math.max(8, x));
        const top = y + rect.height + 8 > window.innerHeight ? Math.max(8, y - rect.height - 4) : y + 4;

        el.style.left = `${left}px`;
        el.style.top = `${top}px`;

        popover = el;

        const first = el.querySelector("button, input");
        if (first) setTimeout(() => first.focus({ preventScroll: true }), 0);
    }

    document.addEventListener("mousedown", event => {
        if (popover && !(event.target instanceof Element && event.target.closest(".zg-fold-pop"))) closePopover();
    }, true);

    function item(parent, text, onClick, options = {}) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `zg-fold-pop__item${options.danger ? " is-danger" : ""}`;
        button.setAttribute("role", "menuitem");
        button.innerHTML = `<span class="zg-fold-pop__text"></span>${options.hint ? `<span class="zg-fold-pop__hint"></span>` : ""}`;
        button.querySelector(".zg-fold-pop__text").textContent = text;
        if (options.hint) button.querySelector(".zg-fold-pop__hint").textContent = options.hint;
        button.addEventListener("click", () => {
            closePopover();
            onClick();
        });
        parent.appendChild(button);
        return button;
    }

    function separator(parent) {
        const hr = document.createElement("div");
        hr.className = "zg-fold-pop__sep";
        parent.appendChild(hr);
    }

    function heading(parent, text) {
        const h = document.createElement("div");
        h.className = "zg-fold-pop__head";
        h.textContent = text;
        parent.appendChild(h);
    }

    function openDayMenu(x, y, index) {

        const date = dateOfIndex(index);
        const covering = foldCovering(index);

        openPopover(x, y, el => {

            heading(el, `${thaiShort(date)}`);

            if (covering && covering.off) {
                item(el, covering.kind === "compress" ? "รวบช่วงนี้กลับ" : "ซ่อนช่วงนี้กลับ", () => setOff(covering.id, false), { hint: rangeText(covering) });
                item(el, "ลบช่วงนี้ออกจากรายการ", () => removeFold(covering.id));
                separator(el);
            }

            item(el, "ซ่อนวันนี้", () => {
                addFold({ kind: "hide", from: ymd(date), to: ymd(date) });
                toast(`ซ่อน ${thaiShort(date)} แล้ว — คลิกแถบเพื่อเปิด`);
            });

            item(el, "ซ่อนช่วงวัน…", () => startPick("hide", index), { hint: "คลิกวันสุดท้าย" });
            item(el, "รวบช่วงวัน…", () => startPick("compress", index), { hint: "ให้แคบลง" });

            separator(el);

            const monthName = `${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear() + 543}`;
            const existing = monthFold(date.getFullYear(), date.getMonth());

            item(el, existing && !existing.off ? `เปิดเดือน ${monthName}` : `รวบเดือน ${monthName}`, () => toggleMonth(date.getFullYear(), date.getMonth()));

            item(el, "ซ่อนเสาร์–อาทิตย์ทั้งหมด", hideWeekends);

            if (folds.length) {
                separator(el);
                item(el, showAll ? "พับช่วงที่ซ่อนกลับ" : "แสดงทุกวันชั่วคราว", () => setShowAll(!showAll));
                item(el, "จัดการวันที่ซ่อน / รวบ…", () => openPanel());
            }
        });
    }

    function openFoldMenu(x, y, fold) {
        openPopover(x, y, el => {
            heading(el, `${fold.kind === "compress" ? "รวบ" : fold.kind === "month" ? "รวบเดือน" : "ซ่อน"} ${rangeText(fold)}`);
            if (fold.off) item(el, fold.kind === "compress" ? "รวบกลับ" : "ซ่อนกลับ", () => setOff(fold.id, false));
            else item(el, fold.kind === "compress" ? "ขยายกลับ (ชั่วคราว)" : "เปิด (ชั่วคราว)", () => setOff(fold.id, true));
            if (fold.kind === "compress") {
                item(el, "เปลี่ยนความกว้าง…", () => openChoice(x, y, { from: fold.from, to: fold.to }, lengthDays(fold), true, fold));
            }
            item(el, "ลบออก (แสดงตามปกติ)", () => removeFold(fold.id), { danger: true });
        });
    }

    /* หลังเลือกช่วง: ซ่อน / รวบให้เหลือ N วัน */
    function openChoice(x, y, range, days, compressOnly, editing) {

        openPopover(x, y, el => {

            heading(el, `${rangeText(range)} · ${days} วัน`);

            if (!compressOnly) {
                item(el, "ซ่อนช่วงนี้", () => {
                    addFold({ kind: "hide", ...range });
                    toast(`ซ่อน ${rangeText(range)} แล้ว — คลิกแถบเพื่อเปิด`);
                });
                separator(el);
            }

            const row = document.createElement("form");
            row.className = "zg-fold-pop__form";

            const suggested = editing ? Number(editing.days) : Math.max(1, Math.min(days - 1, Math.round(days / 4)));

            row.innerHTML = `
                <label class="zg-fold-pop__field">
                    <span>รวบให้กว้างเท่า</span>
                    <input type="number" min="1" max="${Math.max(1, days - 1)}" step="1" inputmode="numeric" value="${suggested}" aria-label="จำนวนวันหลังรวบ">
                    <span>วัน</span>
                </label>
                <div class="zg-fold-pop__chips"></div>
                <button type="submit" class="zg-fold-pop__primary">รวบ</button>
            `;

            const input = row.querySelector("input");
            const chips = row.querySelector(".zg-fold-pop__chips");

            [7, 14, Math.round(days / 2)].filter((v, i, list) => v >= 1 && v < days && list.indexOf(v) === i).forEach(value => {
                const chip = document.createElement("button");
                chip.type = "button";
                chip.className = "zg-fold-pop__chip";
                chip.textContent = value === 7 ? "1 สัปดาห์" : value === 14 ? "2 สัปดาห์" : `ครึ่งหนึ่ง (${value})`;
                chip.addEventListener("click", () => { input.value = String(value); input.focus(); });
                chips.appendChild(chip);
            });

            row.addEventListener("submit", event => {
                event.preventDefault();
                const value = Math.max(1, Math.min(Math.max(1, days - 1), Math.round(Number(input.value) || 1)));
                closePopover();
                if (editing) {
                    editing.days = value;
                    delete editing.off;
                    commit();
                } else {
                    addFold({ kind: "compress", ...range, days: value });
                }
                toast(`รวบ ${rangeText(range)} จาก ${days} เหลือกว้าง ${value} วันแล้ว`);
            });

            if (days < 2) {
                row.querySelector("button[type='submit']").disabled = true;
                input.disabled = true;
            }

            el.appendChild(row);
        });
    }


    /* =====================================================
       แผงจัดการ (ปุ่มบนแถบเครื่องมือ)
    ===================================================== */

    let panel = null;
    let button = null;

    const ICON = `<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" focusable="false"><path d="M3 4h3l2 6-2 6H3l2-6zM17 4h-3l-2 6 2 6h3l-2-6z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;

    function mountButton() {

        const group = document.querySelector(".toolbar-date-group") || document.querySelector(".toolbar-group--date");
        if (!group || group.querySelector(".zg-fold-btn")) return;

        button = document.createElement("button");
        button.type = "button";
        button.className = "toolbar-control zg-fold-btn";
        button.title = "ซ่อน / รวบวันที่ (คลิกขวาที่เลขวันบนหัวตารางก็ได้)";
        button.setAttribute("aria-haspopup", "dialog");
        button.innerHTML = `${ICON}<span class="zg-fold-btn__text">ซ่อน/รวบวัน</span><span class="zg-fold-btn__count" hidden></span>`;
        button.addEventListener("click", event => {
            event.stopPropagation();
            if (panel) closePanel(); else openPanel();
        });

        group.appendChild(button);
        updateButton();
    }

    function updateButton() {
        if (!button) return;
        const count = folds.filter(fold => !fold.off).length;
        const badge = button.querySelector(".zg-fold-btn__count");
        badge.hidden = !count || showAll;
        badge.textContent = String(count);
        button.classList.toggle("is-on", Boolean(count) && !showAll);
    }

    function closePanel() {
        if (panel) panel.remove();
        panel = null;
        if (button) button.setAttribute("aria-expanded", "false");
    }

    function openPanel() {

        closePopover();
        closePanel();

        panel = document.createElement("div");
        panel.className = "zg-fold-panel";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-label", "ซ่อน / รวบวันที่");

        document.body.appendChild(panel);

        renderPanel();
        positionPanel();

        if (button) button.setAttribute("aria-expanded", "true");
    }

    function positionPanel() {
        if (!panel) return;
        const anchor = button ? button.getBoundingClientRect() : { left: 20, bottom: 80 };
        const width = panel.offsetWidth || 360;
        panel.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, anchor.left))}px`;
        panel.style.top = `${anchor.bottom + 8}px`;
        panel.style.maxHeight = `${Math.max(240, window.innerHeight - anchor.bottom - 24)}px`;
    }

    document.addEventListener("mousedown", event => {
        if (!panel) return;
        const target = event.target instanceof Element ? event.target : null;
        if (target && (target.closest(".zg-fold-panel, .zg-fold-btn, .zg-fold-pop"))) return;
        closePanel();
    }, true);

    window.addEventListener("resize", positionPanel);

    function monthsInRange() {
        const list = [];
        if (!ready()) return list;
        const start = startMidnight();
        const end = typeof timelineEndDate !== "undefined" ? new Date(timelineEndDate) : start;
        const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
        for (let guard = 0; guard < 60 && cursor <= end; guard += 1) {
            list.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return list;
    }

    function escapeText(text) {
        return String(text).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch]));
    }

    let formKind = "hide";

    function renderPanel() {

        if (!panel) return;

        const list = folds.filter(fold => fold.group !== "weekend");
        const weekend = folds.filter(fold => fold.group === "weekend");
        const startText = ready() ? ymd(startMidnight()) : "";
        const endText = typeof timelineEndDate !== "undefined" ? ymd(new Date(timelineEndDate)) : "";

        const vp = viewport();
        const viewFrom = vp && ready() ? Math.floor(G(vp.scrollLeft) / pxPerDay) : 0;
        const defFrom = ready() ? ymd(dateOfIndex(Math.max(0, viewFrom))) : "";
        const defTo = ready() ? ymd(dateOfIndex(Math.max(0, viewFrom) + 6)) : "";

        panel.innerHTML = `
            <div class="zg-fold-panel__top">
                <h3 class="zg-fold-panel__title">ซ่อน / รวบวันที่</h3>
                <button type="button" class="zg-fold-panel__close" aria-label="ปิด" data-act="close">✕</button>
            </div>

            <form class="zg-fold-add" data-act="add">
                <div class="zg-fold-seg" role="radiogroup" aria-label="ชนิด">
                    <button type="button" role="radio" data-kind="hide" aria-checked="${formKind === "hide"}">ซ่อน</button>
                    <button type="button" role="radio" data-kind="compress" aria-checked="${formKind === "compress"}">รวบให้แคบ</button>
                </div>
                <div class="zg-fold-add__dates">
                    <label><span>ตั้งแต่</span><input type="date" name="from" value="${defFrom}" min="${startText}" max="${endText}" required></label>
                    <label><span>ถึง</span><input type="date" name="to" value="${defTo}" min="${startText}" max="${endText}" required></label>
                </div>
                <label class="zg-fold-add__days" ${formKind === "compress" ? "" : "hidden"}>
                    <span>ให้กว้างเท่า</span><input type="number" name="days" min="1" step="1" value="3" inputmode="numeric"><span>วัน</span>
                </label>
                <button type="submit" class="zg-fold-add__go">${formKind === "compress" ? "รวบช่วงนี้" : "ซ่อนช่วงนี้"}</button>
                <p class="zg-fold-add__tip">หรือลากบนเลขวันที่หัวตาราง = เลือกช่วงวัน · คลิกขวาที่เลขวัน = เมนู</p>
            </form>

            <div class="zg-fold-sect">
                <div class="zg-fold-sect__head"><span>รวบทั้งเดือน</span></div>
                <div class="zg-fold-months">
                    ${monthsInRange().map(({ year, month }) => {
                        const fold = monthFold(year, month);
                        const on = Boolean(fold && !fold.off);
                        return `<button type="button" class="zg-fold-month${on ? " is-on" : ""}" aria-pressed="${on}" data-month="${year}-${month}">${MONTHS_SHORT[month]}<small>${String(year + 543).slice(-2)}</small></button>`;
                    }).join("")}
                </div>
            </div>

            <div class="zg-fold-sect">
                <div class="zg-fold-sect__head">
                    <span>เสาร์–อาทิตย์</span>
                    ${weekend.length
                        ? `<button type="button" class="zg-fold-link" data-act="weekend-off">แสดงกลับ (${weekend.length})</button>`
                        : `<button type="button" class="zg-fold-link" data-act="weekend">ซ่อนทั้งหมด</button>`}
                </div>
            </div>

            <div class="zg-fold-sect">
                <div class="zg-fold-sect__head"><span>ช่วงที่ซ่อน / รวบ</span><span class="zg-fold-muted">${list.length || ""}</span></div>
                ${list.length ? `<ul class="zg-fold-list">
                    ${list.map(fold => `
                        <li class="zg-fold-row${fold.off ? " is-off" : ""}" data-id="${escapeText(fold.id)}">
                            <span class="zg-fold-row__kind is-${fold.kind}" aria-hidden="true"></span>
                            <span class="zg-fold-row__main">
                                <span class="zg-fold-row__range">${escapeText(rangeText(fold))}</span>
                                <span class="zg-fold-row__meta">${fold.kind === "compress" ? `รวบ ${lengthDays(fold)} → ${fold.days} วัน` : fold.kind === "month" ? "รวบทั้งเดือน" : `ซ่อน ${lengthDays(fold)} วัน`}${fold.off ? " · เปิดอยู่" : ""}</span>
                            </span>
                            <button type="button" class="zg-fold-switch" role="switch" aria-checked="${!fold.off}" data-act="toggle" title="${fold.off ? "พับกลับ" : "เปิดชั่วคราว"}"><span></span></button>
                            <button type="button" class="zg-fold-x" data-act="remove" aria-label="ลบ ${escapeText(rangeText(fold))}" title="ลบ">✕</button>
                        </li>`).join("")}
                </ul>` : `<p class="zg-fold-empty">ยังไม่มี — เลือกช่วงด้านบน หรือคลิกขวาที่วันบนหัวตาราง</p>`}
            </div>

            <div class="zg-fold-foot">
                <label class="zg-fold-check"><input type="checkbox" data-act="showall" ${showAll ? "checked" : ""} ${folds.length ? "" : "disabled"}><span>แสดงทุกวันชั่วคราว</span></label>
                <button type="button" class="zg-fold-link is-danger" data-act="clear" ${folds.length ? "" : "disabled"}>ล้างทั้งหมด</button>
            </div>
        `;

        panel.querySelector("[data-act='close']").addEventListener("click", closePanel);

        panel.querySelectorAll(".zg-fold-seg [data-kind]").forEach(radio => {
            radio.addEventListener("click", () => {
                formKind = radio.dataset.kind;
                const form = panel.querySelector(".zg-fold-add");
                const keep = { from: form.from.value, to: form.to.value };
                renderPanel();
                const again = panel.querySelector(".zg-fold-add");
                again.from.value = keep.from;
                again.to.value = keep.to;
                if (formKind === "compress") {
                    const len = lengthDays(keep);
                    again.days.value = String(Math.max(1, Math.min(Math.max(1, len - 1), Math.round(len / 4) || 1)));
                }
            });
        });

        const form = panel.querySelector(".zg-fold-add");

        form.addEventListener("submit", event => {
            event.preventDefault();
            const from = form.from.value;
            const to = form.to.value;
            if (!parseYmd(from) || !parseYmd(to)) return;
            const range = parseYmd(from) <= parseYmd(to) ? { from, to } : { from: to, to: from };
            const days = lengthDays(range);
            if (formKind === "compress") {
                if (days < 2) { toast("รวบได้เมื่อเลือกตั้งแต่ 2 วันขึ้นไป"); return; }
                const value = Math.max(1, Math.min(days - 1, Math.round(Number(form.days.value) || 1)));
                addFold({ kind: "compress", ...range, days: value });
                toast(`รวบ ${rangeText(range)} เหลือกว้าง ${value} วันแล้ว`);
            } else {
                addFold({ kind: "hide", ...range });
                toast(`ซ่อน ${rangeText(range)} (${days} วัน) แล้ว`);
            }
        });

        panel.querySelectorAll("[data-month]").forEach(chip => {
            chip.addEventListener("click", () => {
                const [year, month] = chip.dataset.month.split("-").map(Number);
                toggleMonth(year, month);
            });
        });

        const act = (name, fn) => panel.querySelectorAll(`[data-act='${name}']`).forEach(el => el.addEventListener("click", fn));

        act("weekend", hideWeekends);
        act("weekend-off", () => clearGroup("weekend"));
        act("clear", () => {
            folds = [];
            showAll = false;
            commit();
            toast("แสดงทุกวันตามปกติแล้ว");
        });

        panel.querySelectorAll(".zg-fold-row").forEach(row => {
            const id = row.dataset.id;
            row.querySelector("[data-act='toggle']").addEventListener("click", () => {
                const fold = folds.find(f => f.id === id);
                if (fold) setOff(id, !fold.off);
            });
            row.querySelector("[data-act='remove']").addEventListener("click", () => removeFold(id));
        });

        const all = panel.querySelector("[data-act='showall']");
        if (all) all.addEventListener("change", () => setShowAll(all.checked));
    }


    /* =====================================================
       หน้าตา
    ===================================================== */

    const style = document.createElement("style");
    style.id = "zg-day-fold-style";
    style.textContent = `
:root {
    --zgf-ink: #26302b;
    --zgf-muted: #6f7a74;
    --zgf-line: rgba(30, 41, 36, .14);
    --zgf-brand: #2f7442;
    --zgf-brand-soft: rgba(47, 116, 66, .09);
    --zgf-hatch-a: #eef1ef;
    --zgf-hatch-b: #f8f9f8;
    --zgf-shadow: 0 1px 2px rgba(20, 34, 27, .06), 0 10px 28px -10px rgba(20, 34, 27, .28);
    --zgf-ease: cubic-bezier(.22, 1, .36, 1);
}

/* ช่องวัน / เส้นในช่วงที่ซ่อน */
.zg-fold-gone { visibility: hidden !important; pointer-events: none !important; }
.zg-fold-tiny { color: transparent !important; text-shadow: none !important; }
.zg-fold-tiny * { visibility: hidden !important; }

/* ---------- แถบช่วงพับ ---------- */
.zg-fold-mark {
    position: absolute;
    top: 0;
    bottom: 0;
    box-sizing: border-box;
    pointer-events: none;
}
.zg-fold-mark.is-hide,
.zg-fold-mark.is-month {
    background: repeating-linear-gradient(135deg, var(--zgf-hatch-a) 0 3px, var(--zgf-hatch-b) 3px 6px);
    border-left: 1px solid var(--zgf-line);
    border-right: 1px solid var(--zgf-line);
}
.zg-fold-mark--body.is-hide,
.zg-fold-mark--body.is-month,
.zg-fold-mark--bracket.is-hide,
.zg-fold-mark--bracket.is-month { z-index: 3; }
.zg-fold-mark.is-compress {
    background: rgba(47, 116, 66, .035);
    border-left: 1px dotted rgba(47, 116, 66, .35);
    border-right: 1px dotted rgba(47, 116, 66, .35);
}
.zg-fold-mark--body.is-compress,
.zg-fold-mark--bracket.is-compress { z-index: 1; }

.zg-fold-mark--head {
    z-index: 8;
    pointer-events: auto;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color .18s ease, box-shadow .18s ease;
}
.zg-fold-mark--head.is-compress {
    align-items: flex-end;
    background: transparent;
    border: 0;
    box-shadow: inset 0 3px 0 rgba(47, 116, 66, .45);
}
.zg-fold-mark--head:hover,
.zg-fold-mark--head:focus-visible { background: var(--zgf-brand-soft); box-shadow: inset 0 0 0 1px rgba(47, 116, 66, .35); outline: none; }
.zg-fold-mark--head.is-compress:hover { box-shadow: inset 0 3px 0 var(--zgf-brand), inset 0 0 0 1px rgba(47, 116, 66, .3); }

.zg-fold-mark__label {
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    color: var(--zgf-muted);
    white-space: nowrap;
    pointer-events: none;
    user-select: none;
}
.zg-fold-mark--head.is-month .zg-fold-mark__label {
    writing-mode: vertical-rl;
    letter-spacing: .02em;
    color: var(--zgf-ink);
}
.zg-fold-mark--head.is-compress .zg-fold-mark__label {
    margin-bottom: 3px;
    padding: 1px 6px;
    border-radius: 999px;
    background: #ffffff;
    color: var(--zgf-brand);
    box-shadow: 0 0 0 1px rgba(47, 116, 66, .25);
}

/* ---------- ช่วงที่เปิดกลับแล้ว: แถบ "ย่อกลับ" บาง ๆ ด้านบน ---------- */
.zg-fold-ghost {
    position: absolute;
    top: 0;
    height: 7px;
    z-index: 8;
    box-sizing: border-box;
    border: 1.5px dashed rgba(47, 116, 66, .45);
    border-top: 0;
    border-radius: 0 0 6px 6px;
    cursor: pointer;
    transition: border-color .18s ease, background-color .18s ease;
}
.zg-fold-ghost:hover { border-color: var(--zgf-brand); background: var(--zgf-brand-soft); }
.zg-fold-ghost__pill {
    position: absolute;
    left: 50%;
    top: 7px;
    transform: translate(-50%, -2px);
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--zgf-brand);
    color: #ffffff;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity .15s ease, transform .2s var(--zgf-ease);
    box-shadow: 0 4px 12px -4px rgba(20, 34, 27, .35);
}
.zg-fold-ghost:hover .zg-fold-ghost__pill { opacity: 1; transform: translate(-50%, 2px); }

/* ---------- เลือกช่วง ---------- */
body.zg-fold-picking #timelineHeaderInner,
body.zg-fold-picking #timelineHeaderInner * { cursor: crosshair !important; }
body.zg-fold-dragging,
body.zg-fold-dragging * { user-select: none !important; -webkit-user-select: none !important; }
.zg-fold-pick {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 9;
    pointer-events: none;
    background: rgba(47, 116, 66, .14);
    box-shadow: inset 1px 0 0 var(--zgf-brand), inset -1px 0 0 var(--zgf-brand);
}
.zg-fold-pick__tag {
    position: absolute;
    left: 50%;
    bottom: 2px;
    transform: translateX(-50%);
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--zgf-brand);
    color: #ffffff;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
}
.zg-fold-banner {
    position: fixed;
    left: 50%;
    top: 14px;
    transform: translateX(-50%);
    z-index: 20000;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 8px 8px 16px;
    border-radius: 999px;
    background: #1f2a24;
    color: #ffffff;
    font-size: 13px;
    box-shadow: var(--zgf-shadow);
}
.zg-fold-banner__cancel {
    border: 0;
    border-radius: 999px;
    padding: 5px 12px;
    background: rgba(255, 255, 255, .14);
    color: #ffffff;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
}
.zg-fold-banner__cancel:hover { background: rgba(255, 255, 255, .24); }

/* ---------- เมนูลอย ---------- */
.zg-fold-pop {
    position: fixed;
    z-index: 20001;
    min-width: 220px;
    max-width: 300px;
    padding: 6px;
    border-radius: 12px;
    background: #ffffff;
    border: 1px solid rgba(30, 41, 36, .1);
    box-shadow: var(--zgf-shadow);
    font-size: 13px;
    color: var(--zgf-ink);
    animation: zgFoldIn .16s var(--zgf-ease);
}
@keyframes zgFoldIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.zg-fold-pop__head {
    padding: 6px 10px 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--zgf-muted);
}
.zg-fold-pop__item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}
.zg-fold-pop__item:hover,
.zg-fold-pop__item:focus-visible { background: #f1f4f2; outline: none; }
.zg-fold-pop__item.is-danger { color: #b5372f; }
.zg-fold-pop__hint { font-size: 11px; color: var(--zgf-muted); }
.zg-fold-pop__sep { height: 1px; margin: 4px 6px; background: rgba(30, 41, 36, .08); }
.zg-fold-pop__form { padding: 4px 10px 8px; display: grid; gap: 8px; }
.zg-fold-pop__field { display: flex; align-items: center; gap: 8px; }
.zg-fold-pop__field input,
.zg-fold-add__days input {
    width: 64px;
    height: 30px;
    box-sizing: border-box;
    padding: 0 8px;
    border: 1px solid #d8dfdb;
    border-radius: 8px;
    font: inherit;
    font-variant-numeric: tabular-nums;
    color: inherit;
    background: #ffffff;
}
.zg-fold-pop__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.zg-fold-pop__chip {
    padding: 4px 10px;
    border: 1px solid #dde4e0;
    border-radius: 999px;
    background: #ffffff;
    font: inherit;
    font-size: 12px;
    color: var(--zgf-ink);
    cursor: pointer;
}
.zg-fold-pop__chip:hover { border-color: var(--zgf-brand); color: var(--zgf-brand); }
.zg-fold-pop__primary,
.zg-fold-add__go {
    height: 32px;
    border: 0;
    border-radius: 8px;
    background: var(--zgf-brand);
    color: #ffffff;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
}
.zg-fold-pop__primary:hover,
.zg-fold-add__go:hover { background: #276338; }
.zg-fold-pop__primary:disabled { opacity: .45; cursor: default; }

/* ---------- ปุ่มบนแถบเครื่องมือ ---------- */
.zg-fold-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.zg-fold-btn svg { flex: 0 0 auto; color: var(--zgf-muted); }
.zg-fold-btn.is-on svg { color: var(--zgf-brand); }
.zg-fold-btn__count {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    box-sizing: border-box;
    border-radius: 999px;
    background: var(--zgf-brand);
    color: #ffffff;
    font-size: 11px;
    font-weight: 600;
    line-height: 18px;
    text-align: center;
    font-variant-numeric: tabular-nums;
}

/* ---------- แผงจัดการ ---------- */
.zg-fold-panel {
    position: fixed;
    z-index: 20000;
    width: 360px;
    max-width: calc(100vw - 16px);
    overflow: auto;
    box-sizing: border-box;
    padding: 14px 16px 12px;
    border-radius: 14px;
    background: #ffffff;
    border: 1px solid rgba(30, 41, 36, .1);
    box-shadow: var(--zgf-shadow);
    color: var(--zgf-ink);
    font-size: 13px;
    animation: zgFoldIn .18s var(--zgf-ease);
}
.zg-fold-panel__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.zg-fold-panel__title { margin: 0; font-size: 15px; font-weight: 600; }
.zg-fold-panel__close {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--zgf-muted);
    font-size: 13px;
    cursor: pointer;
}
.zg-fold-panel__close:hover { background: #f1f4f2; color: var(--zgf-ink); }

.zg-fold-add {
    display: grid;
    gap: 10px;
    padding: 12px;
    border-radius: 12px;
    background: #f6f8f7;
}
.zg-fold-seg {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 3px;
    border-radius: 9px;
    background: #e9eeeb;
}
.zg-fold-seg button {
    height: 28px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    font: inherit;
    color: var(--zgf-muted);
    cursor: pointer;
}
.zg-fold-seg button[aria-checked="true"] {
    background: #ffffff;
    color: var(--zgf-ink);
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(20, 34, 27, .12);
}
.zg-fold-add__dates { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.zg-fold-add__dates label { display: grid; gap: 4px; font-size: 11px; color: var(--zgf-muted); }
.zg-fold-add__dates input {
    height: 32px;
    box-sizing: border-box;
    padding: 0 8px;
    border: 1px solid #d8dfdb;
    border-radius: 8px;
    font: inherit;
    font-size: 12px;
    color: var(--zgf-ink);
    background: #ffffff;
}
.zg-fold-add__days { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--zgf-muted); }
.zg-fold-add__days[hidden] { display: none; }
.zg-fold-add__tip { margin: 0; font-size: 11px; line-height: 1.5; color: var(--zgf-muted); }

.zg-fold-sect { margin-top: 14px; }
.zg-fold-sect__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--zgf-ink);
}
.zg-fold-muted { color: var(--zgf-muted); font-weight: 400; font-variant-numeric: tabular-nums; }
.zg-fold-months { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
.zg-fold-month {
    display: grid;
    justify-items: center;
    gap: 1px;
    padding: 6px 0;
    border: 1px solid #e1e7e3;
    border-radius: 9px;
    background: #ffffff;
    font: inherit;
    font-size: 12px;
    color: var(--zgf-ink);
    cursor: pointer;
    transition: border-color .15s ease, background-color .15s ease;
}
.zg-fold-month small { font-size: 10px; color: var(--zgf-muted); font-variant-numeric: tabular-nums; }
.zg-fold-month:hover { border-color: rgba(47, 116, 66, .5); }
.zg-fold-month.is-on {
    border-color: var(--zgf-brand);
    background: repeating-linear-gradient(135deg, #eaf3ed 0 3px, #f5faf6 3px 6px);
    color: var(--zgf-brand);
    font-weight: 600;
}
.zg-fold-link {
    border: 0;
    background: transparent;
    padding: 2px 4px;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    color: var(--zgf-brand);
    cursor: pointer;
    border-radius: 6px;
}
.zg-fold-link:hover { background: var(--zgf-brand-soft); }
.zg-fold-link.is-danger { color: #b5372f; }
.zg-fold-link.is-danger:hover { background: rgba(181, 55, 47, .08); }
.zg-fold-link:disabled { opacity: .4; cursor: default; background: transparent; }

.zg-fold-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.zg-fold-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 6px 7px 8px;
    border-radius: 9px;
}
.zg-fold-row:hover { background: #f6f8f7; }
.zg-fold-row__kind {
    flex: 0 0 auto;
    width: 10px;
    height: 22px;
    border-radius: 3px;
    background: repeating-linear-gradient(135deg, #dfe5e1 0 2px, #f3f5f4 2px 4px);
    box-shadow: inset 0 0 0 1px rgba(30, 41, 36, .12);
}
.zg-fold-row__kind.is-compress { background: rgba(47, 116, 66, .14); box-shadow: inset 0 2px 0 rgba(47, 116, 66, .6); }
.zg-fold-row__main { flex: 1 1 auto; min-width: 0; display: grid; }
.zg-fold-row__range { font-weight: 500; font-variant-numeric: tabular-nums; }
.zg-fold-row__meta { font-size: 11px; color: var(--zgf-muted); }
.zg-fold-row.is-off .zg-fold-row__range { color: var(--zgf-muted); }
.zg-fold-switch {
    flex: 0 0 auto;
    position: relative;
    width: 32px;
    height: 18px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: #cfd7d2;
    cursor: pointer;
    transition: background-color .18s ease;
}
.zg-fold-switch span {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(20, 34, 27, .25);
    transition: transform .2s var(--zgf-ease);
}
.zg-fold-switch[aria-checked="true"] { background: var(--zgf-brand); }
.zg-fold-switch[aria-checked="true"] span { transform: translateX(14px); }
.zg-fold-x {
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--zgf-muted);
    font-size: 11px;
    cursor: pointer;
}
.zg-fold-x:hover { background: rgba(181, 55, 47, .08); color: #b5372f; }
.zg-fold-empty { margin: 0; padding: 10px 0 2px; font-size: 12px; color: var(--zgf-muted); }
.zg-fold-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(30, 41, 36, .08);
}
.zg-fold-check { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; }
.zg-fold-check input { accent-color: var(--zgf-brand); }

.zg-fold-panel :focus-visible,
.zg-fold-pop :focus-visible { outline: 2px solid rgba(47, 116, 66, .55); outline-offset: 1px; }

/* Export / พิมพ์: เหลือแถบช่วงพับ ไม่เอาตัวช่วยแก้ไข */
body.zg-exporting .zg-fold-ghost,
body.zg-exporting .zg-fold-pick,
body.zg-xp-tiling .zg-fold-ghost { display: none !important; }
@media print { .zg-fold-ghost, .zg-fold-pick, .zg-fold-panel, .zg-fold-pop, .zg-fold-banner { display: none !important; } }

/* ธีมมืด */
body.zg-dark {
    --zgf-ink: #e3e9e5;
    --zgf-muted: #9aa6a0;
    --zgf-line: rgba(255, 255, 255, .14);
    --zgf-hatch-a: #252d2a;
    --zgf-hatch-b: #2c3531;
}
body.zg-dark .zg-fold-pop,
body.zg-dark .zg-fold-panel { background: #222a27; border-color: #3a4440; }
body.zg-dark .zg-fold-add { background: #2a3330; }
body.zg-dark .zg-fold-seg { background: #1d2422; }
body.zg-dark .zg-fold-seg button[aria-checked="true"],
body.zg-dark .zg-fold-month,
body.zg-dark .zg-fold-add__dates input,
body.zg-dark .zg-fold-add__days input,
body.zg-dark .zg-fold-pop__field input,
body.zg-dark .zg-fold-pop__chip { background: #2b3330; border-color: #3a4440; color: var(--zgf-ink); color-scheme: dark; }
body.zg-dark .zg-fold-pop__item:hover,
body.zg-dark .zg-fold-row:hover { background: #2b3330; }
body.zg-dark .zg-fold-mark--head.is-compress .zg-fold-mark__label { background: #222a27; }

@media (prefers-reduced-motion: reduce) {
    .zg-fold-pop, .zg-fold-panel { animation: none; }
    .zg-fold-switch span, .zg-fold-ghost__pill { transition: none; }
}
`;
    document.head.appendChild(style);


    /* =====================================================
       เริ่มต้น
    ===================================================== */

    mountButton();
    observeAll();
    warpAll(true);

    window.ZGFold = {
        x: F,
        inv: G,
        isActive,
        delta: logicalDelta,
        list: () => folds.map(fold => ({ ...fold })),
        add: raw => addFold(raw),
        remove: removeFold,
        setOff,
        toggleMonth,
        hideWeekends,
        showAll: setShowAll,
        clear: () => { folds = []; showAll = false; commit(); },
        /* เลื่อนทั้งแผน N วัน (plan-shift.js) → ช่วงที่ซ่อน/รวบเลื่อนตาม · เสาร์–อาทิตย์สร้างใหม่ */
        shift: days => {
            days = Math.round(Number(days) || 0);
            if (!days || !folds.length) return;
            const weekend = folds.some(fold => fold.group === "weekend");
            const move = text => { const d = parseYmd(text); d.setDate(d.getDate() + days); return ymd(d); };
            folds = folds.filter(fold => fold.group !== "weekend").map(fold => ({ ...fold, from: move(fold.from), to: move(fold.to) }));
            if (weekend) hideWeekends({ quiet: true });
            commit({ record: false });
        },
        openPanel,
        refresh: () => { version += 1; map = null; warpAll(true); }
    };

})();
