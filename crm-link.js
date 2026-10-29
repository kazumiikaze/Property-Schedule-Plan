"use strict";

/* =========================================================
   CRM-LINK.JS — ใช้ร่วมกับระบบ CRM (เปิดผังงานจาก CRM · บันทึกกลับเข้า CRM)
   ---------------------------------------------------------
   ทำงานเฉพาะเมื่อเปิดเว็บผ่านลิงก์จาก CRM:
     ?customer_id=..&job_id=..&expires=..&token=..&crm=<ที่อยู่ API>
      [&customer_name=..&job_title=..&version=N]
   เปิดเว็บตามปกติ (ไม่มีค่าเหล่านี้) → ไฟล์นี้ไม่ทำอะไรเลย

   - โหลดผังล่าสุด (หรือเวอร์ชันที่ระบุ) จาก CRM → เปิดเป็นแผนชื่อ <customer_id>_<job_id>
     ยังไม่มีผัง → แผนเปล่า หัวข้อ = ชื่องาน (ใช้เทมเพลตแทนที่ได้ตามปกติ)
   - แถบ CRM มุมขวาบน: ลูกค้า · งาน · เวอร์ชัน · สถานะ · 💾 บันทึกเข้า CRM · เลือกเวอร์ชัน
   - บันทึก = ส่งไฟล์แผน + ภาพผัง (PNG) → CRM เก็บเป็นเวอร์ชันใหม่ (ไม่ทับของเดิม)
   - ส่งข้อมูลไปเฉพาะ CRM ที่อยู่ในรายชื่ออนุญาต (CRM_ALLOWED) เท่านั้น
   - เรียก CRM แค่ตอนเปิด (GET 1 ครั้ง) และตอนกดบันทึก (POST 1 ครั้ง)
========================================================= */

(function () {

    const params = new URLSearchParams(location.search);
    const link = {
        customerId: params.get("customer_id") || "",
        jobId: params.get("job_id") || "",
        expires: Number(params.get("expires")) || 0,
        token: params.get("token") || "",
        api: params.get("crm") || "",
        customerName: params.get("customer_name") || "",
        jobTitle: params.get("job_title") || "",
        version: Number(params.get("version")) || null
    };

    if (!link.customerId || !link.jobId || !link.token || !link.api) return;

    /* CRM ที่อนุญาตให้รับ/ส่งผัง (เพิ่มโดเมน CRM จริงตรงนี้ตอนใช้งานจริง) */
    const CRM_ALLOWED = [
        "http://127.0.0.1:8090",
        "http://localhost:8090"
    ].concat(Array.isArray(window.ZG_CRM_ALLOWED) ? window.ZG_CRM_ALLOWED : []);

    const LINKS_KEY = "zg-crm-links-v1";
    const NAME_KEY = "zg-crm-saved-by";
    const IMAGE_WIDTH = 1800;          // ภาพผังที่ส่งให้ CRM (ย่อจาก A3 ให้ไฟล์ไม่ใหญ่)
    const CHECK_MS = 2500;             // ตรวจว่ามีการแก้ไขที่ยังไม่บันทึกเข้า CRM

    let apiBase = "";
    try {
        const u = new URL(link.api);
        apiBase = u.href.endsWith("/") ? u.href : `${u.href}/`;
        if (!CRM_ALLOWED.includes(u.origin)) apiBase = "";
    } catch (error) {
        apiBase = "";
    }

    const linkKey = `${apiBase}|${link.customerId}|${link.jobId}`;
    const planName = `${link.customerId}_${link.jobId}`;

    const state = {
        planId: null,
        version: null,          // เวอร์ชันที่เปิดอยู่ (ฐานของงานในเครื่อง)
        latest: null,           // เวอร์ชันล่าสุดใน CRM
        versions: [],
        savedHash: "",
        dirty: false,
        busy: false,
        status: "",             // ข้อความสถานะ
        tone: "",               // ok | warn | bad | busy
        error: ""
    };


    /* =====================================================
       เก็บในเครื่อง: งานไหนผูกกับแผนไหน · แก้ค้างไว้หรือเปล่า
    ===================================================== */

    function readLinks() {
        try { return JSON.parse(localStorage.getItem(LINKS_KEY) || "{}") || {}; } catch (error) { return {}; }
    }

    function writeLink(patch) {
        try {
            const all = readLinks();
            all[linkKey] = { ...(all[linkKey] || {}), ...patch, at: new Date().toISOString() };
            localStorage.setItem(LINKS_KEY, JSON.stringify(all));
        } catch (error) { /* เก็บไม่ได้ก็ไม่เป็นไร */ }
    }

    function savedLink() {
        return readLinks()[linkKey] || null;
    }


    /* =====================================================
       ตรวจการแก้ไข (เทียบลายนิ้วมือของไฟล์แผน)
    ===================================================== */

    function planData() {
        const data = window.ZGPlanIO.build();
        return data;
    }

    function fingerprint(data) {
        const copy = { ...data };
        delete copy.exportedAt;
        const text = JSON.stringify(copy);
        let h = 2166136261;
        for (let i = 0; i < text.length; i += 1) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return `${text.length}:${(h >>> 0).toString(36)}`;
    }

    function onCrmPlan() {
        return state.planId && window.ZGPlans && window.ZGPlans.activeId() === state.planId;
    }

    function checkDirty() {
        if (!onCrmPlan() || state.busy || !state.savedHash) return;
        let dirty = false;
        try { dirty = fingerprint(planData()) !== state.savedHash; } catch (error) { return; }
        if (dirty !== state.dirty) {
            state.dirty = dirty;
            writeLink({ dirty, baseVersion: state.version });
            render();
        }
    }

    function markClean() {
        try { state.savedHash = fingerprint(planData()); } catch (error) { state.savedHash = ""; }
        state.dirty = false;
        writeLink({ planId: state.planId, baseVersion: state.version, dirty: false, savedHash: state.savedHash });
    }


    /* =====================================================
       เรียก CRM
    ===================================================== */

    function authParams(extra) {
        return new URLSearchParams({ customer_id: link.customerId, job_id: link.jobId, expires: String(link.expires), token: link.token, ...(extra || {}) });
    }

    function errorText(status, body) {
        if (status === 401) return "ลิงก์หมดอายุ — กลับไปกด \"เปิดผังงาน\" ใน CRM ใหม่";
        if (status === 403) return "ลิงก์ไม่ถูกต้อง — เปิดจากปุ่มใน CRM อีกครั้ง";
        if (status === 404) return "ไม่พบเวอร์ชันที่ขอใน CRM";
        if (status === 413) return `ไฟล์ใหญ่เกินที่ CRM รับได้${body && body.max_mb ? ` (${body.max_mb} MB)` : ""}`;
        if (status === 429) return "บันทึกถี่เกินไป — รอสักครู่แล้วกดใหม่";
        if (status === 0) return "เชื่อมต่อ CRM ไม่ได้ — ตรวจอินเทอร์เน็ต / CRM แล้วลองใหม่";
        return (body && body.error) ? `CRM ตอบกลับ: ${body.error}` : `CRM ตอบกลับผิดพลาด (${status})`;
    }

    async function request(url, options) {
        let res;
        try {
            res = await fetch(url, { cache: "no-store", ...options });
        } catch (error) {
            return { status: 0, body: null };
        }
        let body = null;
        try { body = await res.json(); } catch (error) { body = null; }
        return { status: res.status, body };
    }

    function fetchPlan(version) {
        return request(`${apiBase}schedule_get.php?${authParams(version ? { version: String(version) } : null)}`);
    }


    /* =====================================================
       เปิดผังจาก CRM
    ===================================================== */

    function waitFor(test, timeout = 15000) {
        return new Promise(resolve => {
            const started = Date.now();
            (function tick() {
                if (test()) return resolve(true);
                if (Date.now() - started > timeout) return resolve(false);
                setTimeout(tick, 80);
            })();
        });
    }

    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    function findLocalPlan() {
        const list = window.ZGPlans.list();
        const remembered = savedLink();
        if (remembered && list.some(p => p.id === remembered.planId)) return remembered.planId;
        const byName = list.find(p => p.name === planName);
        return byName ? byName.id : null;
    }

    /* ใส่ข้อความหัวกระดาน (ไม่ส่ง blur → ไม่ไปเปลี่ยนชื่อแผนตามบรรทัดรองของ header-plus.js) */
    function setHeaderText(selector, text) {
        const el = document.querySelector(selector);
        if (!el || !text) return;
        el.textContent = text;
        el.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function localStamp(date = new Date()) {
        const p = n => String(n).padStart(2, "0");
        return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
    }

    async function openFromCrm(versionWanted, { askIfDirty = true } = {}) {

        setStatus("กำลังโหลดผังจาก CRM…", "busy");
        const { status, body } = await fetchPlan(versionWanted);

        if (status !== 200 || !body) {
            state.error = errorText(status, body);
            setStatus(state.error, "bad");
            return false;
        }

        state.error = "";
        state.versions = Array.isArray(body.versions) ? body.versions : [];
        state.latest = state.versions.length ? state.versions[0].version : null;
        if (body.customer && body.customer.name && !link.customerName) link.customerName = body.customer.name;
        if (body.job && body.job.title && !link.jobTitle) link.jobTitle = body.job.title;

        const existing = findLocalPlan();
        const remembered = savedLink();

        /* เครื่องนี้มีงานที่ยังไม่ได้บันทึกเข้า CRM */
        if (existing && remembered && remembered.dirty && askIfDirty) {
            const sameBase = body.version === remembered.baseVersion;
            const keep = window.confirm(sameBase
                ? `เครื่องนี้มีงานของ ${planName} ที่ยังไม่ได้บันทึกเข้า CRM\n\nตกลง = ใช้งานในเครื่องต่อ\nยกเลิก = โหลดเวอร์ชัน ${body.version || "-"} จาก CRM มาแทน`
                : `CRM มีเวอร์ชัน ${body.version || "-"} แต่เครื่องนี้มีงานที่ยังไม่ได้บันทึก (แก้จากเวอร์ชัน ${remembered.baseVersion || "-"})\n\nตกลง = ใช้งานในเครื่องต่อ (บันทึกแล้วจะเป็นเวอร์ชันใหม่)\nยกเลิก = โหลดเวอร์ชัน ${body.version || "-"} จาก CRM มาแทน`);
            if (keep) {
                if (window.ZGPlans.activeId() !== existing) window.ZGPlans.switchTo(existing);
                state.planId = existing;
                state.version = remembered.baseVersion || null;
                state.savedHash = remembered.savedHash || "";
                state.dirty = true;
                setStatus("ใช้งานที่ยังไม่ได้บันทึกในเครื่องนี้ต่อ", "warn");
                return true;
            }
        }

        if (body.plan) {
            if (existing) {
                if (window.ZGPlans.activeId() !== existing) window.ZGPlans.switchTo(existing);
                await sleep(120);
                window.ZGPlans.replaceCurrent(body.plan);
            } else {
                window.ZGPlans.createFromData(planName, body.plan, `เปิดผังจาก CRM (เวอร์ชัน ${body.version})`);
            }
            state.version = body.version;
        } else {
            if (existing) {
                if (window.ZGPlans.activeId() !== existing) window.ZGPlans.switchTo(existing);
            } else {
                window.ZGPlans.createBlank(planName);
                await sleep(200);
                setHeaderText(".plan-header .title", link.jobTitle);
                setHeaderText(".plan-header .subtitle", link.customerName);
                if (window.ZGPlans.currentName() !== planName) window.ZGPlans.renameCurrent(planName);
                if (window.ZGHistory && typeof window.ZGHistory.record === "function") window.ZGHistory.record();
            }
            state.version = null;
        }

        await sleep(700);           // ให้แผนวาดเสร็จก่อนจับลายนิ้วมือ
        state.planId = window.ZGPlans.activeId();
        markClean();
        setStatus(body.plan ? `เปิดเวอร์ชัน ${body.version} จาก CRM แล้ว` : "ยังไม่มีผังใน CRM — เริ่มทำได้เลย แล้วกดบันทึกเข้า CRM", body.plan ? "ok" : "");
        return true;
    }


    /* =====================================================
       บันทึกเข้า CRM
    ===================================================== */

    /* ภาพกระดาน A3 ใบเดียว → ใช้ทำทั้งภาพตัวอย่าง (PNG) และ PDF */
    async function makeBoard() {
        if (!window.ZGPrintA3 || typeof window.ZGPrintA3.buildA3Canvas !== "function") return null;
        try {
            const big = await window.ZGPrintA3.buildA3Canvas();
            return big && big.width ? big : null;
        } catch (error) {
            console.warn("[crm-link.js] ภาพกระดานไม่สำเร็จ", error);
            return null;
        }
    }

    function makeImage(big) {
        if (!big) return null;
        try {
            const scale = Math.min(1, IMAGE_WIDTH / big.width);
            const out = document.createElement("canvas");
            out.width = Math.round(big.width * scale);
            out.height = Math.round(big.height * scale);
            const g = out.getContext("2d");
            g.imageSmoothingQuality = "high";
            g.drawImage(big, 0, 0, out.width, out.height);
            return out.toDataURL("image/png");
        } catch (error) {
            console.warn("[crm-link.js] ภาพผังไม่สำเร็จ", error);
            return null;
        }
    }

    async function makePdf(big) {
        if (!big || typeof window.ZGPrintA3.pdfBlob !== "function") return null;
        try {
            const blob = await window.ZGPrintA3.pdfBlob(big);
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*;base64,/, "data:application/pdf;base64,"));
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn("[crm-link.js] PDF ไม่สำเร็จ", error);
            return null;
        }
    }

    async function saveToCrm(note, savedBy) {

        if (state.busy || !apiBase) return;
        if (!onCrmPlan()) {
            setStatus(`เปิดแผน ${planName} ก่อน แล้วค่อยบันทึก`, "warn");
            return;
        }

        state.busy = true;
        setStatus("กำลังสร้างภาพผัง + PDF…", "busy");
        const data = planData();
        const board = await makeBoard();
        const image = makeImage(board);
        const pdf = await makePdf(board);

        setStatus("กำลังส่งเข้า CRM…", "busy");
        const { status, body } = await request(`${apiBase}schedule_save.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_id: link.customerId,
                job_id: link.jobId,
                expires: link.expires,
                token: link.token,
                plan_json: data,
                image_png: image,
                plan_pdf: pdf,
                plan_name: planName,
                note: note || "",
                saved_by: savedBy || ""
            })
        });
        state.busy = false;

        if (status !== 200 || !body || !body.saved) {
            setStatus(errorText(status, body), "bad");
            return;
        }

        state.version = body.version;
        state.latest = body.version;
        state.versions.unshift({ version: body.version, saved_at: localStamp(), note: note || "", saved_by: savedBy || "" });
        markClean();
        const time = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
        setStatus(`บันทึกเวอร์ชัน ${body.version} เข้า CRM แล้ว ✓ ${time}`, "ok");
    }


    /* =====================================================
       แถบ CRM
    ===================================================== */

    const style = document.createElement("style");
    style.textContent = `
.zg-crm {
    position: fixed; z-index: 26000; right: 16px; top: 120px; max-width: min(620px, calc(100vw - 32px));
    display: flex; align-items: center; gap: 10px; padding: 7px 8px 7px 12px;
    background: #ffffff; border: 1px solid #d7e3dc; border-left: 4px solid #2e8b57; border-radius: 12px;
    box-shadow: 0 6px 22px -8px rgba(30, 41, 36, .28), 0 1px 2px rgba(30, 41, 36, .06);
    font: 12.5px/1.35 "Segoe UI", Tahoma, sans-serif; color: #26302b;
}
.zg-crm__tag { flex: none; padding: 2px 7px; border-radius: 6px; background: #e8f3ec; color: #2e8b57; font-weight: 700; font-size: 11px; letter-spacing: .04em; }
.zg-crm__who { flex: 0 1 auto; min-width: 150px; display: flex; flex-direction: column; }
.zg-crm__who b { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }
.zg-crm__who small { color: #6f7a74; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }
.zg-crm__state { flex: none; display: flex; align-items: center; gap: 5px; padding-left: 10px; border-left: 1px solid #e3e9e5; color: #4d5852; white-space: nowrap; }
.zg-crm__dot { width: 8px; height: 8px; border-radius: 50%; background: #9aa5a0; flex: none; }
.zg-crm[data-tone="ok"] .zg-crm__dot { background: #2e8b57; }
.zg-crm[data-tone="warn"] .zg-crm__dot { background: #d4a20a; }
.zg-crm[data-tone="bad"] .zg-crm__dot { background: #d0342c; }
.zg-crm[data-tone="busy"] .zg-crm__dot { background: #2f6fd6; animation: zgCrmPulse 1s ease-in-out infinite; }
@keyframes zgCrmPulse { 50% { opacity: .3; } }
.zg-crm__msg { max-width: 230px; overflow: hidden; text-overflow: ellipsis; }
.zg-crm button {
    flex: none; height: 30px; padding: 0 11px; border-radius: 8px; border: 1px solid #d5ddd8; background: #fff; color: #26302b;
    font: 600 12.5px "Segoe UI", Tahoma, sans-serif; cursor: pointer; white-space: nowrap;
}
.zg-crm button:hover { background: #f4f7f5; }
.zg-crm button:disabled { opacity: .5; cursor: default; }
.zg-crm .zg-crm__save { background: #2e8b57; border-color: #2e8b57; color: #fff; }
.zg-crm .zg-crm__save:hover { background: #267549; }
.zg-crm .zg-crm__save.is-dirty { box-shadow: 0 0 0 3px rgba(46, 139, 87, .22); }
.zg-crm .zg-crm__min { width: 30px; padding: 0; color: #6f7a74; }
.zg-crm.is-min .zg-crm__who, .zg-crm.is-min .zg-crm__state, .zg-crm.is-min .zg-crm__ver { display: none; }
.zg-crm-pop {
    position: fixed; z-index: 26010; width: 300px; padding: 14px; border-radius: 12px; background: #fff;
    border: 1px solid #dfe6e2; box-shadow: 0 14px 34px -10px rgba(30, 41, 36, .35);
    font: 13px/1.45 "Segoe UI", Tahoma, sans-serif; color: #26302b;
}
.zg-crm-pop h4 { margin: 0 0 8px; font-size: 14px; }
.zg-crm-pop label { display: block; margin: 8px 0 3px; color: #5b6560; font-size: 12px; }
.zg-crm-pop input, .zg-crm-pop textarea { width: 100%; box-sizing: border-box; padding: 7px 9px; border: 1px solid #d5ddd8; border-radius: 8px; font: inherit; }
.zg-crm-pop input:focus, .zg-crm-pop textarea:focus { outline: none; border-color: #2e8b57; box-shadow: 0 0 0 3px rgba(46, 139, 87, .15); }
.zg-crm-pop .row { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.zg-crm-pop button { height: 32px; padding: 0 14px; border-radius: 8px; border: 1px solid #d5ddd8; background: #fff; font: 600 13px "Segoe UI", Tahoma, sans-serif; cursor: pointer; }
.zg-crm-pop .primary { background: #2e8b57; border-color: #2e8b57; color: #fff; }
.zg-crm-pop ul { list-style: none; margin: 0; padding: 0; max-height: 300px; overflow: auto; }
.zg-crm-pop li button { width: 100%; height: auto; padding: 7px 9px; margin: 2px 0; text-align: left; border-color: transparent; font-weight: 400; }
.zg-crm-pop li button:hover { background: #f4f7f5; border-color: #e3e9e5; }
.zg-crm-pop li button.is-on { background: #e8f3ec; border-color: #b8dcc5; }
.zg-crm-pop li small { display: block; color: #7b8681; }
.zg-crm-pop .hint { color: #7b8681; font-size: 12px; margin-top: 6px; }
body.zg-exporting .zg-crm, body.zg-print-capture .zg-crm, body.zg-pre-shot .zg-crm,
body.zg-exporting .zg-crm-pop, body.zg-print-capture .zg-crm-pop { display: none !important; }
@media print { .zg-crm, .zg-crm-pop { display: none !important; } }
`;
    document.head.appendChild(style);

    const bar = document.createElement("div");
    bar.className = "zg-crm";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "เชื่อมต่อ CRM");

    let pop = null;

    function esc(text) {
        return String(text == null ? "" : text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    function setStatus(text, tone) {
        state.status = text;
        state.tone = tone || "";
        render();
    }

    function render() {
        const canSave = Boolean(apiBase) && !state.error && !state.busy;
        const dirtyNote = state.dirty && !state.busy && state.tone !== "bad" ? "ยังไม่ได้บันทึกเข้า CRM" : "";
        const tone = state.busy ? "busy" : (dirtyNote ? "warn" : state.tone);
        const message = state.busy ? state.status : (dirtyNote || state.status);
        bar.dataset.tone = tone;
        bar.innerHTML = `
            <span class="zg-crm__tag">CRM</span>
            <span class="zg-crm__who"><b title="${esc(link.customerName)}">${esc(link.customerName || link.customerId)}</b>
                <small title="${esc(link.jobTitle)}">${esc(link.jobId)}${link.jobTitle ? ` · ${esc(link.jobTitle)}` : ""}</small></span>
            <button type="button" class="zg-crm__ver" title="เลือกเวอร์ชันที่บันทึกไว้ใน CRM" ${state.versions.length ? "" : "disabled"}>${state.version ? `v${state.version}` : "ใหม่"}${state.latest && state.version && state.latest !== state.version ? ` / ล่าสุด v${state.latest}` : ""} ▾</button>
            <span class="zg-crm__state" title="${esc(message)}"><span class="zg-crm__dot"></span><span class="zg-crm__msg">${esc(message)}</span></span>
            <button type="button" class="zg-crm__save${state.dirty ? " is-dirty" : ""}" ${canSave ? "" : "disabled"}>💾 บันทึกเข้า CRM</button>
            <button type="button" class="zg-crm__min" title="ย่อ / ขยายแถบ CRM" aria-label="ย่อ / ขยายแถบ CRM">${bar.classList.contains("is-min") ? "⤢" : "–"}</button>`;
    }

    function place() {
        const toolbar = document.querySelector(".workspace-toolbar");
        const bottom = toolbar ? toolbar.getBoundingClientRect().bottom : 100;
        bar.style.top = `${Math.round(bottom + 8)}px`;
    }

    function closePop() {
        if (pop) { pop.remove(); pop = null; }
    }

    function openPop(anchor, html) {
        closePop();
        pop = document.createElement("div");
        pop.className = "zg-crm-pop";
        pop.innerHTML = html;
        document.body.appendChild(pop);
        const r = anchor.getBoundingClientRect();
        pop.style.top = `${Math.round(r.bottom + 8)}px`;
        pop.style.left = `${Math.round(Math.max(8, Math.min(window.innerWidth - pop.offsetWidth - 8, r.right - pop.offsetWidth)))}px`;
        return pop;
    }

    function openSavePop(anchor) {
        let name = "";
        try { name = localStorage.getItem(NAME_KEY) || ""; } catch (error) { name = ""; }
        const p = openPop(anchor, `
            <h4>บันทึกเข้า CRM</h4>
            <div class="hint">${esc(link.customerName || link.customerId)} · ${esc(link.jobId)} → เวอร์ชันใหม่ (ไม่ทับของเดิม)</div>
            <label for="zgCrmNote">หมายเหตุเวอร์ชันนี้ (ไม่บังคับ)</label>
            <textarea id="zgCrmNote" rows="2" placeholder="เช่น แก้วันโอนตามที่ลูกค้าขอ"></textarea>
            <label for="zgCrmBy">ชื่อผู้บันทึก</label>
            <input id="zgCrmBy" value="${esc(name)}" placeholder="ชื่อของคุณ">
            <div class="row"><button type="button" data-act="cancel">ยกเลิก</button><button type="button" class="primary" data-act="save">💾 บันทึก</button></div>`);
        p.querySelector("#zgCrmNote").focus();
        p.addEventListener("click", event => {
            const act = event.target instanceof Element ? event.target.closest("[data-act]") : null;
            if (!act) return;
            if (act.dataset.act === "save") {
                const note = p.querySelector("#zgCrmNote").value.trim();
                const by = p.querySelector("#zgCrmBy").value.trim();
                try { localStorage.setItem(NAME_KEY, by); } catch (error) { /* ไม่เป็นไร */ }
                closePop();
                saveToCrm(note, by);
            } else {
                closePop();
            }
        });
        p.addEventListener("keydown", event => {
            if (event.key === "Escape") closePop();
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) p.querySelector('[data-act="save"]').click();
            event.stopPropagation();
        });
    }

    function openVersionPop(anchor) {
        const items = state.versions.map(v => `
            <li><button type="button" data-v="${v.version}" class="${v.version === state.version ? "is-on" : ""}">
                <b>เวอร์ชัน ${v.version}</b>${v.version === state.latest ? " · ล่าสุด" : ""}
                <small>${esc(v.saved_at || "")}${v.saved_by ? ` · ${esc(v.saved_by)}` : ""}${v.note ? ` · ${esc(v.note)}` : ""}</small></button></li>`).join("");
        const p = openPop(anchor, `<h4>เวอร์ชันใน CRM</h4><ul>${items}</ul><div class="hint">เปิดเวอร์ชันเก่าแล้วบันทึก = เป็นเวอร์ชันใหม่ล่าสุด (ไม่ทับของเดิม)</div>`);
        p.addEventListener("click", async event => {
            const btn = event.target instanceof Element ? event.target.closest("[data-v]") : null;
            if (!btn) return;
            const v = Number(btn.dataset.v);
            closePop();
            if (v === state.version && !state.dirty) return;
            if (state.dirty && !window.confirm(`งานที่ยังไม่ได้บันทึกเข้า CRM จะถูกแทนด้วยเวอร์ชัน ${v}\nดำเนินการต่อไหม?`)) return;
            await openFromCrm(v, { askIfDirty: false });
        });
    }

    bar.addEventListener("click", event => {
        const btn = event.target instanceof Element ? event.target.closest("button") : null;
        if (!btn || btn.disabled) return;
        if (btn.classList.contains("zg-crm__save")) openSavePop(btn);
        else if (btn.classList.contains("zg-crm__ver")) openVersionPop(btn);
        else if (btn.classList.contains("zg-crm__min")) { bar.classList.toggle("is-min"); render(); }
    });
    ["mousedown", "pointerdown"].forEach(type => bar.addEventListener(type, event => event.stopPropagation()));

    document.addEventListener("mousedown", event => {
        if (pop && !(event.target instanceof Element && (event.target.closest(".zg-crm-pop") || event.target.closest(".zg-crm")))) closePop();
    }, true);

    /* ปิดหน้าทั้งที่ยังไม่บันทึกเข้า CRM → เตือน */
    window.addEventListener("beforeunload", event => {
        checkDirty();
        if (state.dirty) {
            event.preventDefault();
            event.returnValue = "";
        }
    });

    window.addEventListener("resize", place);


    /* =====================================================
       เริ่ม
    ===================================================== */

    async function start() {

        document.body.appendChild(bar);
        place();

        if (!apiBase) {
            state.error = "ที่อยู่ CRM ในลิงก์ไม่ได้รับอนุญาต — ไม่ส่งข้อมูลออกไป";
            setStatus(state.error, "bad");
            return;
        }
        if (link.expires && link.expires * 1000 < Date.now()) {
            state.error = errorText(401);
            setStatus(state.error, "bad");
            return;
        }

        setStatus("กำลังเตรียม…", "busy");
        await waitFor(() => window.ZGPlans && window.ZGPlans.isReady() && window.ZGPlanIO);
        if (window.ZGStart && typeof window.ZGStart.close === "function") window.ZGStart.close();
        place();

        await openFromCrm(link.version);
        setInterval(checkDirty, CHECK_MS);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();

    window.ZGCrmLink = {
        state: () => ({ ...state, planName, api: apiBase }),
        save: (note, by) => saveToCrm(note, by),
        reload: version => openFromCrm(version, { askIfDirty: false })
    };

})();
