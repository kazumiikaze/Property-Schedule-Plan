"use strict";

/* =========================================================
   LABEL-RICH.JS — แต่งข้อความ "บางส่วน" ในกล่องงาน · ป้ายเส้นวันที่ · กล่อง Text
   - คลิกเข้าไปพิมพ์ แล้วลากคลุมตัวอักษรบางส่วน
     → แถบ A− / A+ / B ทำเฉพาะส่วนที่คลุม (ไม่คลุม = ทั้งกล่องเหมือนเดิม)
     → ปุ่มเพิ่มในแถบ: 🎨 สีตัวอักษร · I ตัวเอียง · U ขีดเส้นใต้ · ⨯ ล้างรูปแบบส่วนที่คลุม
     → Ctrl+B / Ctrl+I / Ctrl+U / Ctrl+Shift+> < ใช้กับส่วนที่คลุมได้
   - เก็บใน object.richText (HTML ที่กรองแล้ว: span + สไตล์ที่อนุญาต + br)
     กล่อง Text: text.js เก็บเป็น rich ในข้อมูลกล่อง (ใช้ ZGLabelRich.sanitize)
     object.text ยังเป็นตัวอักษรล้วนเหมือนเดิม (ค้นหา / ตรวจคำ / ชุดสำเร็จ / Export ใช้ได้ตามเดิม)
   - บันทึกไปกับแผน · เทมเพลต · ชุดสำเร็จ · คัดลอก/วาง · Ctrl+Z ได้ครบ
   - ไม่แก้ app.js — โหลดหลัง text-size.js, label-drag.js, object-text.js
========================================================= */

(function () {

    if (typeof renderObjects !== "function" || typeof timelineObjects === "undefined") {
        console.warn("[label-rich.js] ต้องโหลดหลัง app.js");
        return;
    }

    const OBJECT_LABEL = ".canvas-object--task .canvas-object-label, .canvas-object--dateline-chip .dateline-chip-text";
    const LABEL = `${OBJECT_LABEL}, .zg-text-box .zg-text-content`;
    const STYLE_PROPS = ["font-size", "font-weight", "font-style", "text-decoration-line", "color"];
    const MIN = 6;
    const MAX = 72;
    const COLORS = ["#1e2924", "#ffffff", "#d0342c", "#e67e22", "#d4a20a", "#2e8b57", "#2f6fd6", "#8e44ad", "#e86fa8", "#7a827e"];

    const style = document.createElement("style");
    style.textContent = `
.zg-ts-bar .zg-rt { display: none; }
.zg-ts-bar.zg-rt-on .zg-rt { display: inline-flex; }
.zg-ts-bar .zg-rt-color { position: relative; font-weight: 700; }
.zg-ts-bar .zg-rt-color i { position: absolute; left: 6px; right: 6px; bottom: 4px; height: 3px; border-radius: 2px; background: var(--zg-rt-c, #d0342c); }
.zg-ts-bar .zg-rt-italic { font-style: italic; font-family: Georgia, serif; }
.zg-ts-bar .zg-rt-under { text-decoration: underline; }
.zg-rt-pop {
    position: fixed; z-index: 30010; display: none; grid-template-columns: repeat(5, 22px); gap: 5px; padding: 8px;
    border-radius: 10px; background: #fff; border: 1px solid #dfe5e1; box-shadow: 0 8px 22px rgba(0,0,0,.16);
}
.zg-rt-pop.is-open { display: grid; }
.zg-rt-pop button { width: 22px; height: 22px; border-radius: 50%; border: 1px solid rgba(0,0,0,.15); cursor: pointer; padding: 0; }
.zg-rt-pop button:hover { transform: scale(1.15); }
.zg-rt-hint { position: fixed; z-index: 30010; pointer-events: none; padding: 3px 8px; border-radius: 6px; background: #1e2924; color: #fff; font-size: 11px; display: none; }
body.zg-exporting .zg-rt-pop, body.zg-exporting .zg-rt-hint { display: none !important; }
`;
    document.head.appendChild(style);

    function findObject(id) {
        return timelineObjects.find(object => object.id === id) || null;
    }

    function objectOf(label) {
        const holder = label && label.closest(".canvas-object[data-object-id]");
        return holder ? findObject(holder.dataset.objectId) : null;
    }

    function record() {
        if (window.ZGHistory && typeof window.ZGHistory.record === "function") {
            try { window.ZGHistory.record(); } catch (error) { /* ไม่เป็นไร */ }
        }
    }


    /* =====================================================
       กรอง HTML (เก็บเฉพาะที่ปลอดภัย)
    ===================================================== */

    function escapeText(text) {
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function cleanStyle(element) {
        const out = [];
        STYLE_PROPS.forEach(prop => {
            let value = element.style.getPropertyValue(prop);
            if (!value && prop === "text-decoration-line") value = element.style.getPropertyValue("text-decoration");
            if (!value) return;
            value = String(value).trim();
            if (prop === "font-size" && !/^\d+(\.\d+)?px$/.test(value)) return;
            if (prop === "font-weight" && !/^(\d{3}|bold|normal)$/.test(value)) return;
            if (prop === "font-style" && !/^(italic|normal)$/.test(value)) return;
            if (prop === "text-decoration-line" && !/^(underline|none|line-through)( underline| line-through)*$/.test(value.replace(/\s+solid.*$/, ""))) return;
            if (prop === "color" && !/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i.test(value)) return;
            out.push(`${prop}:${prop === "text-decoration-line" ? value.replace(/\s+solid.*$/, "") : value}`);
        });
        return out.join(";");
    }

    function serializeNode(node) {
        if (node.nodeType === Node.TEXT_NODE) return escapeText(node.nodeValue);
        if (node.nodeType !== Node.ELEMENT_NODE) return "";
        const tag = node.tagName;
        if (tag === "BR") return "<br>";
        const inner = Array.from(node.childNodes).map(serializeNode).join("");
        if (tag === "DIV" || tag === "P") return (node.previousSibling ? "<br>" : "") + inner;
        const parts = [];
        const css = cleanStyle(node);
        if (css) parts.push(css);
        if (tag === "B" || tag === "STRONG") parts.push("font-weight:700");
        if (tag === "I" || tag === "EM") parts.push("font-style:italic");
        if (tag === "U") parts.push("text-decoration-line:underline");
        if (tag === "FONT" && node.getAttribute("color")) parts.push(`color:${node.getAttribute("color")}`);
        return parts.length && inner ? `<span style="${parts.join(";").replace(/"/g, "")}">${inner}</span>` : inner;
    }

    function serialize(label) {
        return Array.from(label.childNodes).map(serializeNode).join("");
    }

    function sanitizeHtml(html) {
        const box = document.createElement("div");
        box.innerHTML = String(html || "");
        return serialize(box);
    }

    function hasFormatting(label) {
        return Boolean(label.querySelector("span[style], b, strong, i, em, u, font"));
    }

    function plainOf(html) {
        const box = document.createElement("div");
        box.innerHTML = String(html || "").replace(/<br\s*\/?>/gi, "\n");
        return box.textContent;
    }

    const squash = text => String(text || "").replace(/\s+/g, "");


    /* =====================================================
       วาด: ใส่รูปแบบที่เก็บไว้กลับเข้ากล่อง
    ===================================================== */

    function applyAll() {
        document.querySelectorAll(OBJECT_LABEL).forEach(label => {
            if (document.activeElement === label) return;
            const object = objectOf(label);
            if (!object || !object.richText) return;
            /* ข้อความถูกแก้จากที่อื่น (ช่องพิมพ์ใหญ่ / หน้าต่างงาน) → รูปแบบเดิมใช้ไม่ได้แล้ว */
            if (squash(plainOf(object.richText)) !== squash(object.text)) {
                delete object.richText;
                return;
            }
            const html = sanitizeHtml(object.richText);
            if (label.innerHTML !== html) label.innerHTML = html;
        });
    }

    const originalRender = renderObjects;
    renderObjects = function () {
        const result = originalRender.apply(this, arguments);
        try { applyAll(); } catch (error) { console.error("[label-rich.js]", error); }
        return result;
    };

    /* ป้ายเส้นวันที่วาดแยกจาก renderObjects ได้ → ตามวาดรูปแบบให้ทุกครั้งที่มีการวาดใหม่ */
    let applyQueued = false;
    new MutationObserver(() => {
        if (applyQueued) return;
        applyQueued = true;
        requestAnimationFrame(() => {
            applyQueued = false;
            try { applyAll(); } catch (error) { console.error("[label-rich.js]", error); }
        });
    }).observe(document.body, { childList: true, subtree: true });

    /* พิมพ์ในกล่อง → เก็บรูปแบบไปด้วย (app.js เก็บ object.text เอง) */
    function store(label) {
        /* กล่อง Text: text.js อ่านรูปแบบจากหน้าจอตอนบันทึกเอง */
        if (!label.matches(OBJECT_LABEL)) return;
        const object = objectOf(label);
        if (!object) return;
        if (hasFormatting(label)) object.richText = serialize(label);
        else delete object.richText;
    }

    document.addEventListener("input", event => {
        const label = event.target instanceof Element ? event.target.closest(LABEL) : null;
        if (label) store(label);
    });

    /* Esc = ยกเลิกการพิมพ์ → คืนรูปแบบเดิมด้วย (object-text.js คืนแค่ตัวอักษร) */
    let snapshot = null;

    document.addEventListener("focusin", event => {
        const label = event.target instanceof Element ? event.target.closest(LABEL) : null;
        if (!label) return;
        const object = objectOf(label);
        snapshot = object ? { object, rich: object.richText || null, text: object.text } : null;
    }, true);

    window.addEventListener("keydown", event => {
        if (event.key !== "Escape" || !snapshot) return;
        const label = event.target instanceof Element ? event.target.closest(LABEL) : null;
        if (!label) return;
        const saved = snapshot;
        setTimeout(() => {
            if (saved.rich && saved.object.text === saved.text) {
                saved.object.richText = saved.rich;
                applyAll();
            }
        }, 0);
    }, true);


    /* =====================================================
       ส่วนที่คลุมอยู่ในกล่องงาน
    ===================================================== */

    function partialSelection() {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount || selection.isCollapsed) return null;
        const range = selection.getRangeAt(0);
        const node = range.commonAncestorContainer;
        const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        const label = element && element.closest(LABEL);
        if (!label || label.getAttribute("contenteditable") !== "true") return null;
        if (!String(range).trim()) return null;
        return { label, range, selection };
    }

    function startElement(range) {
        const node = range.startContainer;
        let element = node.nodeType === Node.ELEMENT_NODE ? (node.childNodes[range.startOffset] || node) : node.parentElement;
        if (element && element.nodeType !== Node.ELEMENT_NODE) element = element.parentElement;
        return element || range.commonAncestorContainer.parentElement;
    }

    /* ห่อส่วนที่คลุมด้วย span ใหม่ (ล้างค่าเดียวกันในชิ้นย่อยออก ให้ทั้งช่วงเหมือนกัน) */
    function wrapSelection(part, props) {

        const { label, range, selection } = part;

        /* คลุมตรงกับช่วงที่แต่งไว้แล้วพอดี (กดหลายปุ่มต่อกัน) → แก้ช่วงเดิม ไม่ซ้อน span เพิ่ม */
        const chosen = range.toString();
        let host = startElement(range);
        let same = null;
        while (host && host !== label && label.contains(host)) {
            if (host.tagName === "SPAN" && host.textContent === chosen) same = host;
            host = host.parentElement;
        }
        if (same) {
            Object.keys(props).forEach(prop => {
                same.querySelectorAll("span").forEach(inner => {
                    inner.style.removeProperty(prop);
                    if (!inner.getAttribute("style")) inner.replaceWith(...inner.childNodes);
                });
                if (props[prop]) same.style.setProperty(prop, props[prop]);
                else same.style.removeProperty(prop);
            });
            const again = document.createRange();
            again.selectNodeContents(same);
            selection.removeAllRanges();
            selection.addRange(again);
            store(label);
            label.dispatchEvent(new Event("input", { bubbles: true }));
            record();
            return;
        }

        const fragment = range.extractContents();

        fragment.querySelectorAll("span, b, strong, i, em, u, font").forEach(element => {
            Object.keys(props).forEach(prop => {
                element.style.removeProperty(prop);
                if (prop === "text-decoration-line") element.style.removeProperty("text-decoration");
            });
        });

        const span = document.createElement("span");
        Object.keys(props).forEach(prop => { if (props[prop]) span.style.setProperty(prop, props[prop]); });
        span.appendChild(fragment);
        range.insertNode(span);

        /* ล้าง span ว่าง / ไม่มีสไตล์ */
        label.querySelectorAll("span").forEach(element => {
            if (!element.textContent) element.remove();
            else if (!element.getAttribute("style")) element.replaceWith(...element.childNodes);
        });
        label.normalize();

        /* ยังคลุมส่วนเดิมอยู่ (กดซ้ำได้) */
        if (span.isConnected) {
            const next = document.createRange();
            next.selectNodeContents(span);
            selection.removeAllRanges();
            selection.addRange(next);
        }

        store(label);
        label.dispatchEvent(new Event("input", { bubbles: true }));
        record();
    }

    function computed(part) {
        const element = startElement(part.range) || part.label;
        return getComputedStyle(element);
    }

    function changeSize(part, direction) {
        const size = parseFloat(computed(part).fontSize) || 12;
        const step = size >= 24 ? 2 : 1;
        const next = Math.max(MIN, Math.min(MAX, Math.round(size + direction * step)));
        wrapSelection(part, { "font-size": `${next}px` });
        hint(`ขนาด ${next}px (เฉพาะส่วนที่คลุม)`);
    }

    function toggle(part, prop, onValue, offValue, isOn) {
        const on = isOn(computed(part));
        wrapSelection(part, { [prop]: on ? offValue : onValue });
    }

    function clearFormat(part) {
        const { label, range, selection } = part;
        const text = range.toString();
        range.deleteContents();
        const lines = text.split("\n");
        const fragment = document.createDocumentFragment();
        lines.forEach((line, index) => {
            if (index) fragment.appendChild(document.createElement("br"));
            fragment.appendChild(document.createTextNode(line));
        });
        const marker = document.createElement("span");
        marker.style.setProperty("font-weight", "inherit");
        range.insertNode(marker);
        /* ยกส่วนนี้ออกจาก span ที่ครอบอยู่ → กลับไปใช้รูปแบบของทั้งกล่อง */
        let host = marker.parentElement;
        while (host && host !== label) {
            const after = host.cloneNode(false);
            let sibling = marker.nextSibling;
            while (sibling) { const next = sibling.nextSibling; after.appendChild(sibling); sibling = next; }
            host.after(after);
            host.after(marker);
            host = marker.parentElement;
        }
        marker.replaceWith(fragment);
        label.querySelectorAll("span").forEach(element => { if (!element.textContent) element.remove(); });
        label.normalize();
        selection.removeAllRanges();
        store(label);
        label.dispatchEvent(new Event("input", { bubbles: true }));
        record();
        hint("ล้างรูปแบบส่วนที่คลุมแล้ว");
    }

    function setColor(part, color) {
        wrapSelection(part, { color });
    }


    /* =====================================================
       แถบ A− / A+ (text-size.js) → ทำเฉพาะส่วนที่คลุม + ปุ่มเพิ่ม
    ===================================================== */

    let hintEl = null;
    let hintTimer = 0;

    function hint(text) {
        if (!hintEl) {
            hintEl = document.createElement("div");
            hintEl.className = "zg-rt-hint";
            document.body.appendChild(hintEl);
        }
        const bar = document.querySelector(".zg-ts-bar");
        const rect = bar ? bar.getBoundingClientRect() : { left: 20, bottom: 60 };
        hintEl.textContent = text;
        hintEl.style.left = `${rect.left}px`;
        hintEl.style.top = `${rect.bottom + 6}px`;
        hintEl.style.display = "block";
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => { hintEl.style.display = "none"; }, 1400);
    }

    let pop = null;
    let popPart = null;

    function closePop() {
        if (pop) pop.classList.remove("is-open");
        popPart = null;
    }

    function openPop(anchor, part) {
        if (!pop) {
            pop = document.createElement("div");
            pop.className = "zg-rt-pop";
            pop.innerHTML = COLORS.map(color => `<button type="button" data-rt-c="${color}" title="${color}" style="background:${color}"></button>`).join("");
            pop.addEventListener("mousedown", event => { event.preventDefault(); event.stopPropagation(); });
            pop.addEventListener("click", event => {
                const button = event.target instanceof Element ? event.target.closest("[data-rt-c]") : null;
                if (!button || !popPart) return;
                const color = button.dataset.rtC;
                /* คืนช่วงที่คลุมไว้ก่อนเปิดจานสี */
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(popPart.range);
                const part = partialSelection();
                if (part) {
                    setColor(part, color);
                    const bar = document.querySelector(".zg-ts-bar .zg-rt-color");
                    if (bar) bar.style.setProperty("--zg-rt-c", color);
                }
                closePop();
            });
            document.body.appendChild(pop);
        }
        popPart = { label: part.label, range: part.range.cloneRange() };
        const rect = anchor.getBoundingClientRect();
        pop.style.left = `${Math.min(window.innerWidth - 150, rect.left)}px`;
        pop.style.top = `${rect.bottom + 6}px`;
        pop.classList.add("is-open");
    }

    function enhanceBar(bar) {
        if (bar.querySelector(".zg-rt")) return;
        bar.insertAdjacentHTML("beforeend", `
            <span class="zg-ts-sep zg-rt"></span>
            <button type="button" class="zg-rt zg-rt-color" data-rt="color" title="สีตัวอักษร — ลากคลุมข้อความบางส่วนก่อน">A<i></i></button>
            <button type="button" class="zg-rt zg-rt-italic" data-rt="italic" title="ตัวเอียง เฉพาะส่วนที่คลุม (Ctrl+I)">I</button>
            <button type="button" class="zg-rt zg-rt-under" data-rt="under" title="ขีดเส้นใต้ เฉพาะส่วนที่คลุม (Ctrl+U)">U</button>
            <button type="button" class="zg-rt" data-rt="clear" title="ล้างรูปแบบเฉพาะส่วนที่คลุม">⨯</button>`);
    }

    new MutationObserver(() => {
        const bar = document.querySelector(".zg-ts-bar");
        if (bar) enhanceBar(bar);
    }).observe(document.body, { childList: true });

    /* ปุ่มเพิ่มโชว์เฉพาะตอนพิมพ์ในกล่องงาน / ป้ายเส้นวันที่ / กล่อง Text */
    (function follow() {
        const bar = document.querySelector(".zg-ts-bar");
        if (bar) {
            const inLabel = document.activeElement instanceof Element && document.activeElement.matches(LABEL);
            bar.classList.toggle("zg-rt-on", inLabel);
            if (!inLabel) closePop();
        }
        requestAnimationFrame(follow);
    })();

    const NEED_PART = "ลากคลุมข้อความบางส่วนในกล่องก่อน";

    /* ดักก่อน text-size.js (window capture) */
    window.addEventListener("click", event => {

        const button = event.target instanceof Element ? event.target.closest(".zg-ts-bar [data-ts], .zg-ts-bar [data-rt]") : null;
        if (!button) return;

        const part = partialSelection();
        const own = button.dataset.rt;

        if (own) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (!part) { hint(NEED_PART); return; }
            if (own === "color") openPop(button, part);
            else if (own === "italic") toggle(part, "font-style", "italic", "normal", cs => cs.fontStyle === "italic");
            else if (own === "under") toggle(part, "text-decoration-line", "underline", "none", cs => /underline/.test(cs.textDecorationLine));
            else if (own === "clear") clearFormat(part);
            return;
        }

        if (!part) return;   /* ไม่ได้คลุม → ทั้งกล่องตามเดิม (text-size.js) */

        const action = button.dataset.ts;

        if (action === "up" || action === "down") {
            event.preventDefault();
            event.stopImmediatePropagation();
            changeSize(part, action === "up" ? 1 : -1);
        } else if (action === "bold") {
            event.preventDefault();
            event.stopImmediatePropagation();
            toggle(part, "font-weight", "700", "400", cs => Number(cs.fontWeight) >= 600);
        }

    }, true);

    window.addEventListener("keydown", event => {

        if (!(event.ctrlKey || event.metaKey) || event.altKey) return;

        const part = partialSelection();
        if (!part) return;

        const code = event.code;
        let handled = true;

        if (code === "KeyB" && !event.shiftKey) toggle(part, "font-weight", "700", "400", cs => Number(cs.fontWeight) >= 600);
        else if (code === "KeyI" && !event.shiftKey) toggle(part, "font-style", "italic", "normal", cs => cs.fontStyle === "italic");
        else if (code === "KeyU" && !event.shiftKey) toggle(part, "text-decoration-line", "underline", "none", cs => /underline/.test(cs.textDecorationLine));
        else if (event.shiftKey && (code === "Period" || event.key === ">")) changeSize(part, 1);
        else if (event.shiftKey && (code === "Comma" || event.key === "<")) changeSize(part, -1);
        else handled = false;

        if (handled) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }

    }, true);

    document.addEventListener("mousedown", event => {
        if (pop && pop.classList.contains("is-open") && !(event.target instanceof Element && event.target.closest(".zg-rt-pop, .zg-rt-color"))) closePop();
    }, true);

    applyAll();

    window.ZGLabelRich = {
        apply: applyAll,
        sanitize: sanitizeHtml,
        /* HTML ที่กรองแล้วของช่องนี้ ถ้ามีการแต่งบางส่วน (ไม่มี = "") */
        richOf: element => (element && hasFormatting(element) ? serialize(element) : ""),
        plainOf
    };

})();
