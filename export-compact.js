"use strict";

/* =========================================================
   EXPORT-COMPACT.JS — Export / พิมพ์ A3 ไม่ให้เหลือพื้นที่ว่างบน-ล่างเยอะ
   ใช้กับทุกรูปแบบ (PNG / PDF A3 / PDF A4 / หลายหน้าตามเดือน / พิมพ์ A3)

   1) ตัดขอบว่าง      : ตัดพื้นขาวบน-ล่างของภาพ เหลือระยะขอบตามที่เลือก
   2) ช่องว่างใต้หัวแผน : บีบช่องว่างระหว่างหัวแผนกับตาราง (ที่ของปุ่ม + หมวดหมู่)
   3) ช่องบันทึก        : ส่วนว่างในกล่องบันทึก / ระหว่างบันทึกกับป้าย Update ถูกบีบลง
      (ไม่ยุ่งกับตาราง / ช่องเส้นวันที่ — ขนาดแถวและวันที่ตรงเหมือนเดิม)
   4) ภาพเล็กลง → ขยายเต็มหน้ากระดาษได้มากขึ้นเอง
   5) ตัวเลือก: เปิด/ปิด "ตัดพื้นที่ว่าง" + ระยะขอบ แคบ / ปกติ / กว้าง
      (ใช้ร่วมกันทั้งหน้าตัวอย่าง Export และพิมพ์ A3)
   + ลบเส้นดำบาง ๆ ที่ขอบซ้าย/ขวาสุดของภาพ (ถ้ามี)

   วิธีทำ: ครอบ ZGExportImage.capture (export-image.js) จดตำแหน่งตาราง
   แล้วแต่งภาพที่ถ่ายได้ (ไม่แตะหน้าเว็บจริง) — ไม่แก้ app.js / style.css
========================================================= */

(function () {

    const exporter = window.ZGExportImage;

    if (!exporter || typeof exporter.capture !== "function") {
        console.warn("[export-compact.js] ไม่พบ export-image.js");
        return;
    }

    const STORE_KEY = "zg-export-compact-v1";

    /* ช่องว่างที่เหลือไว้หลังบีบ (px บนจอ) */
    const KEEP_GAP = 14;

    const MARGINS = {
        narrow: { ratio: 0.01, mm: 4, px: 10 },
        normal: { ratio: 0.022, mm: 8, px: 24 },
        wide: { ratio: 0.04, mm: 14, px: 48 }
    };

    const options = { trim: true, fill: true, margin: "normal" };

    /* kind → { h: ความสูงหลังบีบ ÷ เดิม } (จากการ export ครั้งล่าสุด) */
    const shrink = {};

    try {
        const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
        if (saved && typeof saved === "object") {
            if (typeof saved.trim === "boolean") options.trim = saved.trim;
            if (typeof saved.fill === "boolean") options.fill = saved.fill;
            if (MARGINS[saved.margin]) options.margin = saved.margin;
        }
    } catch (error) { /* ใช้ค่าเริ่มต้น */ }

    function save() {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(options)); } catch (error) { /* ไม่เป็นไร */ }
    }

    function margin() {
        return MARGINS[options.margin] || MARGINS.normal;
    }


    /* =====================================================
       จดตำแหน่งตารางก่อนถ่าย (ส่วนที่ "ห้ามบีบ")
    ===================================================== */

    function measure(kind) {

        const crop = typeof exporter.getCropRect === "function" ? exporter.getCropRect(kind) : null;
        if (!crop) return null;

        const header = document.getElementById("timelineHeader");
        const bracket = document.getElementById("bracketArea") || document.querySelector(".bracket-area");
        const schedule = document.getElementById("scheduleArea");

        const tops = [header, schedule].filter(Boolean).map(element => element.getBoundingClientRect().top);
        const bottoms = [bracket, schedule].filter(Boolean).map(element => element.getBoundingClientRect().bottom);

        if (!tops.length || !bottoms.length) return null;

        return {
            kind,
            cropTop: crop.top,
            tableTop: Math.min(...tops),
            tableBottom: Math.max(...bottoms)
        };
    }

    const originalCapture = exporter.capture;

    exporter.capture = async function (kind, captureOptions = {}) {

        const ratio = Number(captureOptions.pixelRatio) > 0 ? Number(captureOptions.pixelRatio) : 2;

        /* วัดในสภาพเดียวกับตอนถ่าย (ซ่อนตัวช่วย) */
        let info = null;
        const had = document.body.classList.contains("zg-exporting");
        try {
            if (!had) document.body.classList.add("zg-exporting");
            info = measure(kind);
        } catch (error) {
            info = null;
        } finally {
            if (!had) document.body.classList.remove("zg-exporting");
        }

        const canvas = await originalCapture.apply(this, arguments);

        if (canvas && info) {
            canvas.zgCompact = {
                ratio,
                kind,
                keepFrom: Math.max(0, Math.round((info.tableTop - info.cropTop) * ratio)),
                keepTo: Math.round((info.tableBottom - info.cropTop) * ratio)
            };
        }

        return canvas;
    };


    /* =====================================================
       แต่งภาพ
    ===================================================== */

    function rowInfo(data, width, height) {

        const pixels = new Uint32Array(data.buffer);
        const hashes = new Int32Array(height);
        const blank = new Uint8Array(height);

        for (let y = 0; y < height; y += 1) {

            let hash = 0x811c9dc5 | 0;
            let white = 1;
            const start = y * width;

            for (let x = 0; x < width; x += 1) {

                const value = pixels[start + x];

                hash = Math.imul(hash ^ value, 16777619);

                if (white) {
                    const r = value & 255, g = (value >> 8) & 255, b = (value >> 16) & 255;
                    if (r < 246 || g < 246 || b < 246) white = 0;
                }
            }

            hashes[y] = hash;
            blank[y] = white;
        }

        return { hashes, blank };
    }

    /* เส้นแนวตั้งเข้ม ๆ ที่ขอบซ้าย/ขวาสุด (ไม่ใช่ส่วนของกระดาน) → ทาขาว */
    function cleanEdges(ctx, width, height) {

        const columns = [0, 1, 2, width - 3, width - 2, width - 1].filter(x => x >= 0 && x < width);
        const unique = Array.from(new Set(columns));

        unique.forEach(x => {
            const column = ctx.getImageData(x, 0, 1, height).data;
            let dark = 0;
            for (let y = 0; y < height; y += 1) {
                const i = y * 4;
                if (column[i] + column[i + 1] + column[i + 2] < 360) dark += 1;
            }
            if (dark > height * 0.6) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x, 0, 1, height);
            }
        });
    }

    /*
        แถวที่ "เหมือนแถวก่อนหน้าทุกจุด" ติดกันยาวเกิน keep → เหลือแค่ keep แถว
        ทำเฉพาะเหนือตารางและใต้ช่องเส้นวันที่
    */
    function keptRanges(info, meta, height, keep) {

        const ranges = [];
        let runStart = -1;

        const protectFrom = meta ? meta.keepFrom : height;
        const protectTo = meta ? meta.keepTo : -1;

        let y = 0;

        while (y < height) {

            const inProtected = y >= protectFrom && y < protectTo;

            if (!inProtected && y > 0 && info.hashes[y] === info.hashes[y - 1]) {

                if (runStart < 0) runStart = y;

                /* แถวซ้ำ: เก็บถ้ายังไม่เกิน keep */
                if (y - runStart < keep) ranges.push(y);

            } else {

                runStart = -1;
                ranges.push(y);
            }

            y += 1;
        }

        return ranges;
    }

    function process(canvas, override) {

        if (!canvas) return canvas;

        const opts = Object.assign({}, options, override || {});

        if (!opts.trim) return canvas;

        const cacheKey = `${opts.trim}`;
        if (canvas.zgCompactCache && canvas.zgCompactCache.key === cacheKey) return canvas.zgCompactCache.canvas;

        const meta = canvas.zgCompact || null;
        const ratio = meta ? meta.ratio : 2;
        const width = canvas.width;
        const height = canvas.height;

        let result = canvas;

        try {

            /* ทำบนสำเนา (ภาพต้นฉบับใช้ซ้ำได้ตอนปิดตัวเลือก) */
            const work = document.createElement("canvas");
            work.width = width;
            work.height = height;
            const wctx = work.getContext("2d", { willReadFrequently: true });
            wctx.drawImage(canvas, 0, 0);

            cleanEdges(wctx, width, height);

            const data = wctx.getImageData(0, 0, width, height).data;
            const info = rowInfo(data, width, height);

            const keep = Math.max(4, Math.round(KEEP_GAP * ratio));
            let rows = keptRanges(info, meta && meta.kind !== "table" ? meta : { keepFrom: 0, keepTo: height }, height, keep);

            /* ตัดแถวขาวล้วนบนสุด / ล่างสุด */
            let first = 0;
            while (first < rows.length && info.blank[rows[first]]) first += 1;
            let last = rows.length - 1;
            while (last > first && info.blank[rows[last]]) last -= 1;
            rows = rows.slice(first, last + 1);

            if (!rows.length) return canvas;

            const out = document.createElement("canvas");
            out.width = width;
            out.height = rows.length;
            const octx = out.getContext("2d");
            octx.fillStyle = "#ffffff";
            octx.fillRect(0, 0, out.width, out.height);

            /* คัดลอกเป็นช่วงต่อเนื่อง (เร็ว) */
            let i = 0;
            while (i < rows.length) {
                let j = i;
                while (j + 1 < rows.length && rows[j + 1] === rows[j] + 1) j += 1;
                const from = rows[i];
                const count = j - i + 1;
                octx.drawImage(work, 0, from, width, count, 0, i, width, count);
                i = j + 1;
            }

            out.zgCompact = meta ? { ...meta, compacted: true } : { ratio, compacted: true };
            result = out;

            /* จำสัดส่วนที่หดลง → พิมพ์ A3 ใช้ประมาณ % / จำนวนหน้าก่อนถ่ายจริง */
            if (meta && meta.kind) shrink[meta.kind] = { h: out.height / height };

        } catch (error) {
            console.error("[export-compact.js]", error);
            result = canvas;
        }

        canvas.zgCompactCache = { key: cacheKey, canvas: result };

        return result;
    }

    /* PNG: เติมขอบขาวรอบภาพตามระยะขอบที่เลือก */
    function withMargin(canvas) {
        const meta = canvas.zgCompact || {};
        const pad = Math.round(margin().px * (meta.ratio || 2));
        const out = document.createElement("canvas");
        out.width = canvas.width + pad * 2;
        out.height = canvas.height + pad * 2;
        const ctx = out.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(canvas, pad, pad);
        return out;
    }

    /* =====================================================
       ขยายตารางให้เต็มหน้ากระดาษ
       ภาพกว้างกว่าสัดส่วนกระดาษ → บนล่างของกระดาษยังว่าง
       → ถ่ายใหม่ตอน "กระดานสูงขึ้น" ชั่วคราว (แถวในตารางสูงขึ้น) ให้สัดส่วนพอดีหน้า
    ===================================================== */

    function frames(count) {
        return new Promise(resolve => {
            const step = left => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
            step(count);
        });
    }

    /* aspect = กว้าง ÷ สูง ของพื้นที่วางภาพบนกระดาษ */
    function fillFactor(canvases, aspect) {

        const list = (canvases || []).filter(Boolean);
        if (!list.length || !(aspect > 0)) return 1;

        const width = Math.max(...list.map(canvas => canvas.width));
        const height = Math.max(...list.map(canvas => canvas.height));
        const meta = list[0].zgCompact || {};
        const band = Math.max(1, (meta.keepTo || height) - (meta.keepFrom || 0));

        const extra = width / aspect - height;

        if (extra <= height * 0.03) return 1;

        return Math.min(3, 1 + extra / band);
    }

    function relayout() {
        if (typeof renderSchedule === "function") renderSchedule();
        if (typeof timelineViewport !== "undefined" && timelineViewport) {
            timelineViewport.dispatchEvent(new Event("scroll"));
        }
    }

    async function withStretch(factor, task) {

        const plan = document.querySelector(".plan");

        if (!plan || !(factor > 1.02)) return task();

        const rect = plan.getBoundingClientRect();
        const newHeight = Math.round(rect.height * factor);

        const saved = { height: plan.style.height, bottom: plan.style.bottom };
        const descriptor = Object.getOwnPropertyDescriptor(window, "innerHeight");

        try {

            /* ให้ตัวถ่ายภาพเห็นหน้าสูงพอ (ถ่ายตามขนาดหน้าต่าง) */
            Object.defineProperty(window, "innerHeight", {
                configurable: true,
                get: () => Math.ceil(rect.top + newHeight)
            });

            plan.style.bottom = "auto";
            plan.style.height = `${newHeight}px`;

            await frames(3);
            relayout();
            await frames(3);

            return await task();

        } finally {

            plan.style.height = saved.height;
            plan.style.bottom = saved.bottom;

            if (descriptor) Object.defineProperty(window, "innerHeight", descriptor);
            else delete window.innerHeight;

            await frames(3);
            relayout();
            await frames(2);
        }
    }

    window.ZGExportCompact = {
        options,
        save,
        margin,
        MARGINS,
        process,
        withMargin,
        fillFactor,
        withStretch,
        shrinkOf: kind => (options.trim && shrink[kind] ? shrink[kind].h : 1)
    };

})();
