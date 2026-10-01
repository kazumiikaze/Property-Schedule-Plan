"use strict";

/* =========================================================
   TEXT.JS — กล่องข้อความอิสระ (Text Box) + แม่เหล็กติด object

   โหลดหลัง app.js (ไม่แก้โค้ดเดิมใน app.js / line.js / style.css)
   อ่านค่าจาก app.js แบบ read-only:
     timelineObjects, OBJECT_COLOR_PRESETS, OBJECT_ICON_SET,
     spellcheckEnabled, closeObjectMenu
   ใช้ class CSS ของเมนู object เดิม (.object-menu-*) จาก style.css
   เพื่อให้หน้าตาเมนูตั้งค่าเหมือนเมนูของกล่องงาน (task)

   หลักการ:
   - กล่อง text อยู่บนเลเยอร์ fixed ของตัวเอง
       ชั้นหน้า (front) = อยู่เหนือ object ทั้งหมด
       ชั้นหลัง (back)  = อยู่ใต้ object บนตาราง แต่เหนือเส้นตาราง
   - ถ้ายังไม่ติดแม่เหล็ก → ใช้พิกัดหน้าจอ x, y
   - ถ้าติดแม่เหล็ก → เก็บระยะห่าง dx, dy จากมุมซ้ายบนของ object
     แล้วทุกเฟรมจะตามตำแหน่ง object (เลื่อน/ซูม/ลาก ตามได้หมด)
     และ clip ตามขอบช่องของ object นั้น (ตารางหลัก / ช่องเส้นวันที่)
========================================================= */

(function () {

    const addTextBtn =
        document.getElementById("addTextBtn");

    const categoryBtn =
        document.getElementById("addCategoryBtn");

    if (!addTextBtn) {

        return;
    }


    /* =====================================================
       CONFIG
    ===================================================== */

    const MAGNET_DISTANCE = 20;

    const MIN_W = 40;

    const MIN_H = 24;

    const DEFAULT_W = 160;

    const DEFAULT_H = 32;

    const PROXIMITY_EVERY_N_FRAMES = 4;

    const DUPLICATE_OFFSET = 18;

    const TEXT_DARK = "#1e2924";

    const TEXT_LIGHT = "#ffffff";

    const VIEWPORT_SELECTOR =
        "#objectLayerViewport, #bracketViewport";

    const OBJECT_SELECTOR =
        "#objectLayer .canvas-object, #bracketContent .canvas-object";

    const HANDLE_DIRS =
        ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

    const PRESETS =
        typeof OBJECT_COLOR_PRESETS !== "undefined"
            ? OBJECT_COLOR_PRESETS
            : ["#4a90d9", "#d9534f", "#e1a638", "#58ad74"];

    const ICONS =
        typeof OBJECT_ICON_SET !== "undefined"
            ? OBJECT_ICON_SET
            : ["📄", "✅", "⭐"];

    const V_ALIGN = ["flex-start", "center", "flex-end"];

    const H_ALIGN = ["flex-start", "center", "flex-end"];

    const TEXT_ALIGN = ["left", "center", "right"];

    const LINE_STYLES = ["none", "dashed", "solid"];


    /* =====================================================
       STYLE (ฉีดเองในไฟล์นี้ ไม่แตะ style.css)
    ===================================================== */

    const style =
        document.createElement("style");

    style.textContent = `
.zg-text-layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
}
.zg-text-layer--front { z-index: 4500; }
.zg-text-layer--back  { z-index: 499; }   /* ใต้ object layer (500) แต่เหนือตาราง */

.zg-text-box {
    position: absolute;
    box-sizing: border-box;
    padding: 6px 8px;
    border: 1px dashed transparent;
    border-radius: 6px;
    pointer-events: auto;
    cursor: move;
    display: flex;
    flex-direction: column;
}
.zg-text-box:hover,
.zg-text-box.is-empty { border-color: #9aa5a0; }
.zg-text-box.is-selected { border-style: solid; border-color: #4a90d9; }
.zg-text-box.is-attached { border-color: rgba(58, 138, 79, .45); }
.zg-text-box.is-attached.is-selected { border-color: #3a8a4f; }

.zg-text-inner {
    width: 100%;
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.zg-text-headline {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 4px;
}
.zg-text-icon {
    flex: 0 0 auto;
    font-size: 13px;
    line-height: 1.35;
}
.zg-text-content {
    flex: 0 1 auto;
    min-width: 16px;
    max-width: 100%;
    min-height: 16px;
    outline: none;
    font-family: inherit;
    font-size: 12px;
    line-height: 1.35;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
    cursor: text;
}
.zg-text-box.is-empty .zg-text-content::before {
    content: attr(data-placeholder);
    opacity: .5;
    pointer-events: none;
}
.zg-text-detail {
    width: 100%;
    font-size: 10px;
    line-height: 1.3;
    opacity: .75;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
}

.zg-text-box .canvas-object-pin,
.zg-text-box .canvas-object-vline { pointer-events: none; }

.zg-text-controls {
    position: absolute;
    top: -26px;
    right: -1px;
    display: flex;
    gap: 3px;
}
.zg-text-btn {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid #d5dad7;
    border-radius: 5px;
    background: #ffffff;
    color: #333333;
    font-size: 11px;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, .12);
    visibility: hidden;
    opacity: 0;
    transition: opacity .12s ease, visibility 0s linear .3s;
}
.zg-text-box:hover .zg-text-btn--settings,
.zg-text-box:hover .zg-text-btn--delete,
.zg-text-box.is-selected .zg-text-btn--settings,
.zg-text-box.is-selected .zg-text-btn--delete,
.zg-text-box.is-near .zg-text-btn--magnet,
.zg-text-box.is-attached .zg-text-btn--magnet {
    visibility: visible;
    opacity: 1;
    transition-delay: 0s;
}
.zg-text-box.is-near .zg-text-btn--magnet {
    background: #fff6d6;
    border-color: #e1a638;
    animation: zgMagnetPulse 1s ease-in-out infinite;
}
.zg-text-box.is-attached .zg-text-btn--magnet {
    background: #e5f0e9;
    border-color: #3a8a4f;
}
.zg-text-btn--delete:hover { background: #fff0f1; color: #d9363e; }
@keyframes zgMagnetPulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.15); }
}

.zg-text-handle {
    position: absolute;
    width: 9px;
    height: 9px;
    box-sizing: border-box;
    background: #ffffff;
    border: 1px solid #4a90d9;
    border-radius: 2px;
    visibility: hidden;
}
.zg-text-box:hover .zg-text-handle,
.zg-text-box.is-selected .zg-text-handle { visibility: visible; }
.zg-text-handle--n  { top: -5px;    left: 50%; margin-left: -5px; cursor: ns-resize; }
.zg-text-handle--s  { bottom: -5px; left: 50%; margin-left: -5px; cursor: ns-resize; }
.zg-text-handle--e  { right: -5px;  top: 50%;  margin-top: -5px;  cursor: ew-resize; }
.zg-text-handle--w  { left: -5px;   top: 50%;  margin-top: -5px;  cursor: ew-resize; }
.zg-text-handle--ne { top: -5px;    right: -5px; cursor: nesw-resize; }
.zg-text-handle--nw { top: -5px;    left: -5px;  cursor: nwse-resize; }
.zg-text-handle--se { bottom: -5px; right: -5px; cursor: nwse-resize; }
.zg-text-handle--sw { bottom: -5px; left: -5px;  cursor: nesw-resize; }

.zg-text-magnet-highlight {
    position: absolute;
    display: none;
    box-sizing: border-box;
    border: 2px dashed #e1a638;
    border-radius: 6px;
    background: rgba(225, 166, 56, .08);
    pointer-events: none;
}

/* ---------- เมนูตั้งค่า (ใช้ .object-menu เดิม + ส่วนเสริม) ---------- */

.zg-text-menu {
    max-height: calc(100vh - 12px);
    overflow-y: auto;
}
.zg-text-bg-row {
    display: flex;
    align-items: center;
    gap: 6px;
}
.zg-text-bg-row .object-menu-color-input {
    flex: 1;
    margin-top: 0;
}
.zg-text-clear-bg {
    height: 26px;
    padding: 0 8px;
    border: 1px solid #dde3e0;
    border-radius: 6px;
    background:
        linear-gradient(45deg, #e6e6e6 25%, transparent 25%, transparent 75%, #e6e6e6 75%),
        linear-gradient(45deg, #e6e6e6 25%, #ffffff 25%, #ffffff 75%, #e6e6e6 75%);
    background-size: 8px 8px;
    background-position: 0 0, 4px 4px;
    color: #444444;
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
    white-space: nowrap;
}
.zg-text-clear-bg.active { box-shadow: 0 0 0 2px #4a90d9; border-color: #4a90d9; }

.zg-text-custom-dot {
    position: relative;
    display: inline-flex;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid #cccccc;
    background: conic-gradient(#d9534f, #e1a638, #58ad74, #4a90d9, #876bd0, #d9534f);
    cursor: pointer;
    overflow: hidden;
}
.zg-text-custom-dot.active { box-shadow: 0 0 0 2px #4a90d9; }
.zg-text-custom-dot input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    opacity: 0;
    cursor: pointer;
}

body.zg-text-dragging,
body.zg-text-dragging * { user-select: none !important; }
`;

    document.head.appendChild(style);


    /* =====================================================
       LAYERS
    ===================================================== */

    function createLayer(modifier) {

        const element =
            document.createElement("div");

        element.className =
            `zg-text-layer zg-text-layer--${modifier}`;

        document.body.appendChild(element);

        return element;
    }

    const layerBack =
        createLayer("back");

    const layerFront =
        createLayer("front");


    const highlightEl =
        document.createElement("div");

    highlightEl.className =
        "zg-text-magnet-highlight";

    layerFront.appendChild(highlightEl);


    /* =====================================================
       STATE
    ===================================================== */

    const textBoxes = [];

    let selectedBox = null;

    let dragState = null;

    let spawnCount = 0;

    let frameId = null;

    let frameCounter = 0;

    let settingsMenu = null;      // { el, box, anchor }


    /* =====================================================
       HELPERS
    ===================================================== */

    function createTextId() {

        return (
            "text-" +
            Date.now() +
            "-" +
            Math.random().toString(36).slice(2, 8)
        );
    }


    function escapeText(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }


    function isHexColor(value) {

        return /^#[0-9a-f]{6}$/i.test(String(value));
    }


    function sameColor(a, b) {

        return String(a).toLowerCase() === String(b).toLowerCase();
    }


    function intersectRect(a, b) {

        const left = Math.max(a.left, b.left);
        const top = Math.max(a.top, b.top);
        const right = Math.min(a.right, b.right);
        const bottom = Math.min(a.bottom, b.bottom);

        if (right <= left || bottom <= top) {
            return null;
        }

        return { left, top, right, bottom };
    }


    function getObjectPart(element) {

        return Array.from(element.classList).find(
            name => name.startsWith("canvas-object--")
        ) || "";
    }


    function findAttachTarget(attach) {

        const selector =
            `.canvas-object${attach.part ? "." + attach.part : ""}` +
            `[data-object-id="${CSS.escape(attach.objectId)}"]`;

        return document.querySelector(selector);
    }


    function objectStillExists(objectId) {

        return (
            typeof timelineObjects !== "undefined" &&
            timelineObjects.some(object => object.id === objectId)
        );
    }


    function getPos(box) {

        return box.attach
            ? { left: box.attach.dx, top: box.attach.dy }
            : { left: box.x, top: box.y };
    }


    function setPos(box, left, top) {

        if (box.attach) {

            box.attach.dx = left;
            box.attach.dy = top;

        } else {

            box.x = left;
            box.y = Math.max(0, top);
        }
    }


    function clampInt(value, min, max, fallback) {

        const number = Number(value);

        return Number.isInteger(number) && number >= min && number <= max
            ? number
            : fallback;
    }


    /* =====================================================
       CREATE / BUILD
    ===================================================== */

    function createTextBox() {

        const rect =
            categoryBtn
                ? categoryBtn.getBoundingClientRect()
                : { right: 120, top: 140 };

        const offset =
            (spawnCount % 5) * 14;

        spawnCount += 1;

        const box =
            addTextBox({
                x: rect.right + 12 + offset,
                y: rect.top - 2 + offset
            });

        selectBox(box);

        box.content.focus();
    }


    /* สร้างกล่องจากข้อมูล (ใช้ทั้งตอนกดปุ่ม, ทำสำเนา และตอน Import) */

    function addTextBox(data = {}) {

        const box = {

            id: data.id || createTextId(),

            x: Number.isFinite(data.x) ? data.x : 0,
            y: Number.isFinite(data.y) ? data.y : 0,

            w: Math.max(MIN_W, Number(data.w) || DEFAULT_W),
            minH: Math.max(MIN_H, Number(data.minH) || DEFAULT_H),

            /* พื้นหลังเริ่มต้น = ใส */
            bg: data.bg || "transparent",

            color: data.color || TEXT_DARK,

            textPosition: clampInt(data.textPosition, 0, 8, 0),

            iconKey: typeof data.iconKey === "string" ? data.iconKey : "",

            showHeading: data.showHeading !== false,

            layer: data.layer === "back" ? "back" : "front",

            pinLeft: clampInt(data.pinLeft, 0, 999, 0),

            pinRight: clampInt(data.pinRight, 0, 999, 0),

            showDetail: data.showDetail === true,

            detail: typeof data.detail === "string" ? data.detail : "",

            verticalLineStyle:
                LINE_STYLES.includes(data.verticalLineStyle)
                    ? data.verticalLineStyle
                    : "none",

            attach:
                data.attach && data.attach.objectId
                    ? {
                        objectId: String(data.attach.objectId),
                        part: String(data.attach.part || ""),
                        dx: Number(data.attach.dx) || 0,
                        dy: Number(data.attach.dy) || 0
                    }
                    : null,

            near: null,

            screenLeft: Number.isFinite(data.x) ? data.x : 0,
            screenTop: Number.isFinite(data.y) ? data.y : 0
        };

        buildElement(box);

        if (data.text) {

            box.content.textContent =
                String(data.text);
        }

        refreshEmptyState(box);

        textBoxes.push(box);

        placeBox(box);

        ensureLoop();

        return box;
    }


    function buildElement(box) {

        const el =
            document.createElement("div");

        el.className =
            "zg-text-box";

        el.dataset.textId =
            box.id;

        el.innerHTML = `
            <div class="zg-text-inner">
                <div class="zg-text-headline">
                    <span class="zg-text-icon"></span>
                    <div class="zg-text-content"
                        contenteditable="true"
                        data-placeholder="พิมพ์ข้อความ..."></div>
                </div>
                <div class="zg-text-detail"></div>
            </div>

            <div class="canvas-object-pin canvas-object-pin--left"></div>
            <div class="canvas-object-pin canvas-object-pin--right"></div>
            <div class="zg-text-guide"></div>

            <div class="zg-text-controls">
                <button type="button" class="zg-text-btn zg-text-btn--magnet" title="ติดแม่เหล็กกับ object">🧲</button>
                <button type="button" class="zg-text-btn zg-text-btn--settings" title="ตั้งค่า">⚙</button>
                <button type="button" class="zg-text-btn zg-text-btn--delete" title="ลบกล่องข้อความ">✕</button>
            </div>

            ${HANDLE_DIRS.map(dir => `
                <div class="zg-text-handle zg-text-handle--${dir}" data-dir="${dir}"></div>
            `).join("")}
        `;

        const content =
            el.querySelector(".zg-text-content");

        content.spellcheck =
            typeof spellcheckEnabled !== "undefined"
                ? spellcheckEnabled
                : false;

        box.el = el;
        box.content = content;
        box.headline = el.querySelector(".zg-text-headline");
        box.icon = el.querySelector(".zg-text-icon");
        box.detailEl = el.querySelector(".zg-text-detail");
        box.pinLeftEl = el.querySelector(".canvas-object-pin--left");
        box.pinRightEl = el.querySelector(".canvas-object-pin--right");
        box.guideEl = el.querySelector(".zg-text-guide");
        box.magnetBtn = el.querySelector(".zg-text-btn--magnet");


        /* ---------- พิมพ์ ---------- */

        content.addEventListener("input", () => {

            refreshEmptyState(box);
        });

        content.addEventListener("paste", event => {

            event.preventDefault();

            const plain =
                (event.clipboardData || window.clipboardData)
                    .getData("text/plain");

            document.execCommand("insertText", false, plain);
        });

        content.addEventListener("keydown", event => {

            if (event.key === "Escape") {
                content.blur();
            }
        });


        /* ---------- ลาก / ขยาย ---------- */

        el.addEventListener("mousedown", event => {

            if (event.button !== 0) {
                return;
            }

            selectBox(box);

            const handle =
                event.target.closest(".zg-text-handle");

            if (handle) {
                beginDrag(event, box, handle.dataset.dir);
                return;
            }

            if (
                event.target.closest(".zg-text-controls") ||
                event.target.closest(".zg-text-content")
            ) {
                return;
            }

            beginDrag(event, box, "move");
        });


        /* ---------- ปุ่ม ---------- */

        box.magnetBtn.addEventListener("click", event => {

            event.stopPropagation();

            toggleMagnet(box);
        });

        el.querySelector(".zg-text-btn--settings")
            .addEventListener("click", event => {

                event.stopPropagation();

                if (settingsMenu && settingsMenu.box === box) {
                    closeSettingsMenu();
                } else {
                    openSettingsMenu(box, event.currentTarget);
                }
            });

        el.querySelector(".zg-text-btn--delete")
            .addEventListener("click", event => {

                event.stopPropagation();

                removeTextBox(box);
            });


        applyBoxStyle(box);
    }


    function refreshEmptyState(box) {

        box.el.classList.toggle(
            "is-empty",
            box.content.textContent === ""
        );
    }


    /* วาดหน้าตากล่องตามค่าตั้งค่าทั้งหมด */

    function applyBoxStyle(box) {

        const el = box.el;

        el.style.width = `${box.w}px`;
        el.style.minHeight = `${box.minH}px`;
        el.style.background = box.bg;


        /* ตำแหน่งข้อความ 0–8: แถว = บน/กลาง/ล่าง, คอลัมน์ = ซ้าย/กลาง/ขวา */

        const row = Math.floor(box.textPosition / 3);
        const col = box.textPosition % 3;

        el.style.justifyContent = V_ALIGN[row];
        box.headline.style.justifyContent = H_ALIGN[col];
        box.content.style.textAlign = TEXT_ALIGN[col];
        box.detailEl.style.textAlign = TEXT_ALIGN[col];


        /* สีข้อความ */

        box.content.style.color = box.color;

        /* ใช้สีตัวอักษรเริ่มต้นบนพื้นใส → theme.js จะสลับเป็นสีอ่อนในธีมมืด */
        el.classList.toggle(
            "is-default-ink",
            box.bg === "transparent" && sameColor(box.color, TEXT_DARK)
        );
        box.icon.style.color = box.color;
        box.detailEl.style.color = box.color;


        /* ไอคอน / หัวข้อ */

        box.icon.textContent = box.iconKey;
        box.icon.style.display = box.iconKey ? "" : "none";

        box.content.style.display = box.showHeading ? "" : "none";

        box.headline.style.display =
            box.showHeading || box.iconKey ? "" : "none";


        /* รายละเอียด */

        box.detailEl.style.display = box.showDetail ? "" : "none";
        box.detailEl.textContent = box.detail || "รายละเอียด...";


        /* ปักซ้าย / ปักขวา */

        box.pinLeftEl.style.display = box.pinLeft > 0 ? "" : "none";
        box.pinLeftEl.textContent = String(box.pinLeft);

        box.pinRightEl.style.display = box.pinRight > 0 ? "" : "none";
        box.pinRightEl.textContent = String(box.pinRight);


        /* เส้นแนวตั้ง (สีตามพื้นหลัง ถ้าพื้นหลังใสใช้สีตัวอักษร) */

        if (box.verticalLineStyle === "none") {

            box.guideEl.className = "zg-text-guide";
            box.guideEl.style.display = "none";

        } else {

            box.guideEl.className =
                `zg-text-guide canvas-object-vline canvas-object-vline--${box.verticalLineStyle}`;

            box.guideEl.style.display = "";

            box.guideEl.style.borderColor =
                box.bg === "transparent" ? box.color : box.bg;
        }


        /* ชั้น หน้า / หลัง */

        const targetLayer =
            box.layer === "back" ? layerBack : layerFront;

        if (el.parentNode !== targetLayer) {

            if (targetLayer === layerFront) {
                layerFront.insertBefore(el, highlightEl);
            } else {
                targetLayer.appendChild(el);
            }
        }
    }


    function serializeBox(box) {

        return {

            id: box.id,

            text: box.content.innerText.replace(/\n$/, ""),

            x: box.attach ? box.screenLeft : box.x,
            y: box.attach ? box.screenTop : box.y,

            w: box.w,
            minH: box.minH,

            bg: box.bg,
            color: box.color,

            textPosition: box.textPosition,

            iconKey: box.iconKey,
            showHeading: box.showHeading,
            layer: box.layer,
            pinLeft: box.pinLeft,
            pinRight: box.pinRight,
            showDetail: box.showDetail,
            detail: box.detail,
            verticalLineStyle: box.verticalLineStyle,

            attach: box.attach
                ? { ...box.attach }
                : null
        };
    }


    function duplicateTextBox(box) {

        const data =
            serializeBox(box);

        data.id = null;

        data.x += DUPLICATE_OFFSET;
        data.y += DUPLICATE_OFFSET;

        if (data.attach) {

            data.attach.dx += DUPLICATE_OFFSET;
            data.attach.dy += DUPLICATE_OFFSET;
        }

        const copy =
            addTextBox(data);

        selectBox(copy);

        return copy;
    }


    function removeTextBox(box) {

        const index =
            textBoxes.indexOf(box);

        if (index >= 0) {
            textBoxes.splice(index, 1);
        }

        if (settingsMenu && settingsMenu.box === box) {
            closeSettingsMenu();
        }

        if (selectedBox === box) {
            selectedBox = null;
        }

        box.el.remove();

        highlightEl.style.display = "none";
    }


    /* =====================================================
       SELECT
    ===================================================== */

    function selectBox(box) {

        if (selectedBox === box) {
            return;
        }

        if (selectedBox) {
            selectedBox.el.classList.remove("is-selected");
        }

        selectedBox = box;

        if (box) {
            box.el.classList.add("is-selected");
        }
    }


    document.addEventListener("mousedown", event => {

        if (
            settingsMenu &&
            !settingsMenu.el.contains(event.target) &&
            !event.target.closest(".zg-text-btn--settings")
        ) {
            closeSettingsMenu();
        }

        if (
            selectedBox &&
            !event.target.closest(".zg-text-box") &&
            !event.target.closest(".zg-text-menu")
        ) {
            selectBox(null);
        }
    });


    /* =====================================================
       DRAG / RESIZE
    ===================================================== */

    function beginDrag(event, box, mode) {

        event.preventDefault();
        event.stopPropagation();

        const pos =
            getPos(box);

        const boxStyle =
            getComputedStyle(box.el);

        const chromeHeight =
            parseFloat(boxStyle.paddingTop) +
            parseFloat(boxStyle.paddingBottom) +
            parseFloat(boxStyle.borderTopWidth) +
            parseFloat(boxStyle.borderBottomWidth);

        const innerEl =
            box.el.querySelector(".zg-text-inner");

        dragState = {

            box,
            mode,

            moved: false,

            startX: event.clientX,
            startY: event.clientY,

            originLeft: pos.left,
            originTop: pos.top,
            originW: box.w,
            originH: box.el.offsetHeight,

            contentH: innerEl.offsetHeight + chromeHeight
        };

        document.body.classList.add("zg-text-dragging");

        document.addEventListener("mousemove", handleDragMove);
        document.addEventListener("mouseup", endDrag);
    }


    function handleDragMove(event) {

        if (!dragState) {
            return;
        }

        const {
            box, mode,
            startX, startY,
            originLeft, originTop,
            originW, originH,
            contentH
        } = dragState;

        const dx = event.clientX - startX;
        const dy = event.clientY - startY;

        if (Math.abs(dx) + Math.abs(dy) > 3) {
            dragState.moved = true;
        }

        let left = originLeft;
        let top = originTop;

        if (mode === "move") {

            left = originLeft + dx;
            top = originTop + dy;

        } else {

            const floorH =
                Math.max(MIN_H, contentH);

            if (mode.includes("e")) {

                box.w = Math.max(MIN_W, originW + dx);
            }

            if (mode.includes("w")) {

                box.w = Math.max(MIN_W, originW - dx);
                left = originLeft + (originW - box.w);
            }

            if (mode.includes("s")) {

                box.minH = Math.max(floorH, originH + dy);
            }

            if (mode.includes("n")) {

                box.minH = Math.max(floorH, originH - dy);
                top = originTop + (originH - box.minH);
            }
        }

        setPos(box, left, top);

        applyBoxStyle(box);

        placeBox(box);
    }


    function endDrag() {

        const state =
            dragState;

        dragState = null;

        document.body.classList.remove("zg-text-dragging");

        document.removeEventListener("mousemove", handleDragMove);
        document.removeEventListener("mouseup", endDrag);

        /* คลิกที่กล่องเฉย ๆ (ไม่ได้ลาก) → เข้าโหมดพิมพ์ */
        if (
            state &&
            state.mode === "move" &&
            !state.moved &&
            state.box.showHeading
        ) {

            focusAtEnd(state.box.content);
        }
    }


    function focusAtEnd(element) {

        element.focus();

        const range =
            document.createRange();

        range.selectNodeContents(element);
        range.collapse(false);

        const selection =
            window.getSelection();

        selection.removeAllRanges();
        selection.addRange(range);
    }


    /* =====================================================
       PLACE (เรียกทุกเฟรม)
    ===================================================== */

    function showBox(box, left, top) {

        box.screenLeft = left;
        box.screenTop = top;

        box.el.style.left = `${left}px`;
        box.el.style.top = `${top}px`;
        box.el.style.visibility = "";
    }


    function placeBox(box) {

        if (!box.attach) {

            box.el.style.clipPath = "";

            showBox(box, box.x, box.y);

            return;
        }


        const target =
            findAttachTarget(box.attach);

        if (!target) {

            if (!objectStillExists(box.attach.objectId)) {

                detach(box);

            } else {

                box.el.style.visibility = "hidden";
            }

            return;
        }


        const targetRect =
            target.getBoundingClientRect();

        const left =
            targetRect.left + box.attach.dx;

        const top =
            targetRect.top + box.attach.dy;

        showBox(box, left, top);


        const viewport =
            target.closest(VIEWPORT_SELECTOR);

        if (!viewport) {

            box.el.style.clipPath = "";

            return;
        }

        const clip =
            viewport.getBoundingClientRect();

        const right =
            left + box.el.offsetWidth;

        const bottom =
            top + box.el.offsetHeight;

        if (
            clip.right <= left ||
            clip.left >= right ||
            clip.bottom <= top ||
            clip.top >= bottom
        ) {

            box.el.style.visibility = "hidden";

            return;
        }

        box.el.style.clipPath =
            `inset(${clip.top - top}px ${right - clip.right}px ` +
            `${bottom - clip.bottom}px ${clip.left - left}px)`;
    }


    /* =====================================================
       MAGNET
    ===================================================== */

    function findNearObject(box) {

        const boxLeft = box.screenLeft;
        const boxTop = box.screenTop;
        const boxRight = boxLeft + box.el.offsetWidth;
        const boxBottom = boxTop + box.el.offsetHeight;

        const boxCenterX = (boxLeft + boxRight) / 2;
        const boxCenterY = (boxTop + boxBottom) / 2;

        let best = null;
        let bestScore = Infinity;

        document.querySelectorAll(OBJECT_SELECTOR).forEach(target => {

            const viewport =
                target.closest(VIEWPORT_SELECTOR);

            if (!viewport) {
                return;
            }

            const rect =
                intersectRect(
                    target.getBoundingClientRect(),
                    viewport.getBoundingClientRect()
                );

            if (!rect) {
                return;
            }

            const gapX =
                Math.max(0, rect.left - boxRight, boxLeft - rect.right);

            const gapY =
                Math.max(0, rect.top - boxBottom, boxTop - rect.bottom);

            const gap =
                Math.hypot(gapX, gapY);

            if (gap > MAGNET_DISTANCE) {
                return;
            }

            const centerDistance =
                Math.hypot(
                    (rect.left + rect.right) / 2 - boxCenterX,
                    (rect.top + rect.bottom) / 2 - boxCenterY
                );

            const score =
                gap * 1000 + centerDistance;

            if (score < bestScore) {

                bestScore = score;

                best = { el: target, rect };
            }
        });

        return best;
    }


    function attach(box, near) {

        const targetRect =
            near.el.getBoundingClientRect();

        box.attach = {

            objectId: near.el.dataset.objectId,

            part: getObjectPart(near.el),

            dx: box.screenLeft - targetRect.left,
            dy: box.screenTop - targetRect.top
        };

        box.near = null;
    }


    function detach(box) {

        box.x = box.screenLeft;
        box.y = Math.max(0, box.screenTop);

        box.attach = null;

        box.el.style.clipPath = "";
        box.el.style.visibility = "";
    }


    function toggleMagnet(box) {

        if (box.attach) {

            detach(box);

        } else {

            const near =
                box.near || findNearObject(box);

            if (!near) {
                return;
            }

            attach(box, near);
        }

        placeBox(box);

        updateMagnetUI(box);
    }


    function updateMagnetUI(box) {

        const isAttached = !!box.attach;
        const isNear = !isAttached && !!box.near;

        box.el.classList.toggle("is-attached", isAttached);
        box.el.classList.toggle("is-near", isNear);

        box.magnetBtn.title =
            isAttached
                ? "ยกเลิกแม่เหล็ก"
                : "ติดแม่เหล็กกับ object";
    }


    function updateHighlight() {

        const focusBox =
            (dragState && dragState.box) || selectedBox;

        const near =
            focusBox && !focusBox.attach
                ? focusBox.near
                : null;

        if (!near) {

            highlightEl.style.display = "none";

            return;
        }

        const pad = 3;

        highlightEl.style.display = "block";
        highlightEl.style.left = `${near.rect.left - pad}px`;
        highlightEl.style.top = `${near.rect.top - pad}px`;
        highlightEl.style.width = `${near.rect.right - near.rect.left + pad * 2}px`;
        highlightEl.style.height = `${near.rect.bottom - near.rect.top + pad * 2}px`;
    }


    /* =====================================================
       LOOP
    ===================================================== */

    function tick() {

        frameId = null;

        frameCounter += 1;

        const checkProximity =
            frameCounter % PROXIMITY_EVERY_N_FRAMES === 0 ||
            !!dragState;

        textBoxes.forEach(box => {

            placeBox(box);

            if (box.attach) {

                box.near = null;

            } else if (checkProximity) {

                box.near = findNearObject(box);
            }

            updateMagnetUI(box);
        });

        updateHighlight();

        if (textBoxes.length) {
            ensureLoop();
        }
    }


    function ensureLoop() {

        if (frameId === null) {
            frameId = requestAnimationFrame(tick);
        }
    }


    /* =====================================================
       SETTINGS MENU (หน้าตาเหมือนเมนูกล่องงาน)
    ===================================================== */

    function buildMenuHtml(box) {

        const isTransparent =
            box.bg === "transparent";

        const isDark =
            sameColor(box.color, TEXT_DARK);

        const isLight =
            sameColor(box.color, TEXT_LIGHT);

        return `
        <div class="object-menu-section">
            <label class="object-menu-label">สี</label>
            <div class="object-menu-swatches">
                ${PRESETS.map(color => `
                    <button type="button"
                        class="object-menu-swatch ${sameColor(color, box.bg) ? "active" : ""}"
                        data-bg="${color}" style="background:${color}"></button>
                `).join("")}
            </div>
            <div class="zg-text-bg-row">
                <input type="color" class="object-menu-color-input" data-field="bg-picker"
                    value="${isHexColor(box.bg) ? box.bg : "#ffffff"}" title="เลือกสีพื้นหลังเอง">
                <button type="button" class="zg-text-clear-bg ${isTransparent ? "active" : ""}"
                    data-field="bg-clear" title="ไม่มีสีพื้นหลัง (ใส)">ใส</button>
            </div>
        </div>

        <div class="object-menu-section">
            <label class="object-menu-label">ไอคอน</label>
            <div class="object-menu-icons">
                ${ICONS.map(icon => `
                    <button type="button"
                        class="object-menu-icon-btn ${icon === box.iconKey ? "active" : ""}"
                        data-icon="${escapeText(icon)}">${icon}</button>
                `).join("")}
            </div>
        </div>

        <div class="object-menu-row">
            <label class="object-menu-checkbox">
                <input type="checkbox" data-field="showHeading" ${box.showHeading ? "checked" : ""}>
                แสดงหัวข้อ
            </label>
            <select class="object-menu-select object-menu-select--compact" data-field="layer">
                <option value="front" ${box.layer === "front" ? "selected" : ""}>ชั้น: อยู่หน้า</option>
                <option value="back" ${box.layer === "back" ? "selected" : ""}>ชั้น: อยู่หลัง</option>
            </select>
        </div>

        <div class="object-menu-row">
            <div class="object-menu-stepper">
                <span class="object-menu-label">ปักซ้าย</span>
                <button type="button" class="object-menu-step-btn" data-step="pinLeft" data-delta="-1">−</button>
                <span data-value="pinLeft">${box.pinLeft}</span>
                <button type="button" class="object-menu-step-btn" data-step="pinLeft" data-delta="1">＋</button>
            </div>
            <div class="object-menu-stepper">
                <span class="object-menu-label">ปักขวา</span>
                <button type="button" class="object-menu-step-btn" data-step="pinRight" data-delta="-1">−</button>
                <span data-value="pinRight">${box.pinRight}</span>
                <button type="button" class="object-menu-step-btn" data-step="pinRight" data-delta="1">＋</button>
            </div>
        </div>

        <div class="object-menu-row">
            <label class="object-menu-checkbox">
                <input type="checkbox" data-field="showDetail" ${box.showDetail ? "checked" : ""}>
                แสดงรายละเอียด (detail)
            </label>
        </div>

        ${box.showDetail ? `
        <div class="object-menu-section">
            <textarea class="object-menu-input object-menu-textarea" data-field="detail">${escapeText(box.detail)}</textarea>
        </div>
        ` : ""}

        <div class="object-menu-row">
            <label class="object-menu-label">เส้นแนวตั้ง</label>
            <select class="object-menu-select object-menu-select--compact" data-field="verticalLineStyle">
                <option value="none" ${box.verticalLineStyle === "none" ? "selected" : ""}>ไม่มี</option>
                <option value="dashed" ${box.verticalLineStyle === "dashed" ? "selected" : ""}>เส้นประ</option>
                <option value="solid" ${box.verticalLineStyle === "solid" ? "selected" : ""}>เส้นทึบ</option>
            </select>

            <span class="object-menu-label" style="margin-left:auto">สีข้อความ</span>
            <label class="object-menu-radio-dot" title="สีเข้ม">
                <input type="radio" name="zgTextColorMode" value="${TEXT_DARK}" ${isDark ? "checked" : ""}>
                <span class="dot dot--dark"></span>
            </label>
            <label class="object-menu-radio-dot" title="สีอ่อน">
                <input type="radio" name="zgTextColorMode" value="${TEXT_LIGHT}" ${isLight ? "checked" : ""}>
                <span class="dot dot--light"></span>
            </label>
            <label class="zg-text-custom-dot ${!isDark && !isLight ? "active" : ""}" title="เลือกสีข้อความเอง">
                <input type="color" data-field="color-picker"
                    value="${isHexColor(box.color) ? box.color : TEXT_DARK}">
            </label>
        </div>

        <div class="object-menu-section">
            <label class="object-menu-label">ตำแหน่งข้อความ</label>
            <div class="object-menu-position-grid">
                ${Array.from({ length: 9 }).map((_, index) => `
                    <button type="button"
                        class="object-menu-position-btn ${index === box.textPosition ? "active" : ""}"
                        data-position="${index}"></button>
                `).join("")}
            </div>
        </div>

        <div class="object-menu-actions">
            <button type="button" class="object-menu-duplicate-btn" data-action="duplicate">⧉ ทำสำเนา</button>
            <button type="button" class="object-menu-delete-btn" data-action="delete">🗑 ลบ</button>
        </div>
        `;
    }


    function openSettingsMenu(box, anchor) {

        closeSettingsMenu();

        /* ปิดเมนู object ของ app.js ถ้าเปิดค้างอยู่ */
        if (typeof closeObjectMenu === "function") {
            closeObjectMenu();
        }

        const menu =
            document.createElement("div");

        menu.className =
            "object-menu zg-text-menu";

        menu.innerHTML =
            buildMenuHtml(box);

        document.body.appendChild(menu);

        settingsMenu = { el: menu, box, anchor };

        wireMenu(menu, box);

        positionMenu(menu, anchor, box);
    }


    /* สร้างเมนูใหม่ตรงตำแหน่งเดิม (ใช้ตอนเปิด/ปิดช่องรายละเอียด) */

    function rebuildSettingsMenu() {

        if (!settingsMenu) {
            return;
        }

        const { box, anchor } = settingsMenu;

        openSettingsMenu(box, anchor);
    }


    function closeSettingsMenu() {

        if (settingsMenu) {
            settingsMenu.el.remove();
        }

        settingsMenu = null;
    }


    function positionMenu(menu, anchor, box) {

        const anchorRect =
            anchor && anchor.isConnected
                ? anchor.getBoundingClientRect()
                : box.el.getBoundingClientRect();

        const margin = 6;

        let left = anchorRect.right - menu.offsetWidth;
        let top = anchorRect.bottom + margin;

        left =
            Math.max(
                margin,
                Math.min(left, window.innerWidth - menu.offsetWidth - margin)
            );

        if (top + menu.offsetHeight > window.innerHeight - margin) {

            top = anchorRect.top - menu.offsetHeight - margin;
        }

        if (top < margin) {

            top =
                Math.max(
                    margin,
                    window.innerHeight - menu.offsetHeight - margin
                );
        }

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    }


    function wireMenu(menu, box) {

        const update = () => applyBoxStyle(box);

        const bgPicker =
            menu.querySelector('[data-field="bg-picker"]');

        const clearBgBtn =
            menu.querySelector('[data-field="bg-clear"]');

        const colorPicker =
            menu.querySelector('[data-field="color-picker"]');

        const customDot =
            menu.querySelector(".zg-text-custom-dot");


        function markBg() {

            menu.querySelectorAll(".object-menu-swatch").forEach(swatch => {

                swatch.classList.toggle(
                    "active",
                    sameColor(swatch.dataset.bg, box.bg)
                );
            });

            clearBgBtn.classList.toggle(
                "active",
                box.bg === "transparent"
            );
        }


        function markTextColor() {

            const isDark = sameColor(box.color, TEXT_DARK);
            const isLight = sameColor(box.color, TEXT_LIGHT);

            menu.querySelectorAll('input[name="zgTextColorMode"]').forEach(radio => {

                radio.checked = sameColor(radio.value, box.color);
            });

            customDot.classList.toggle("active", !isDark && !isLight);
        }


        /* ---------- สีพื้นหลัง ---------- */

        menu.querySelectorAll(".object-menu-swatch").forEach(swatch => {

            swatch.addEventListener("click", () => {

                box.bg = swatch.dataset.bg;

                bgPicker.value = box.bg;

                update();
                markBg();
            });
        });

        bgPicker.addEventListener("input", () => {

            box.bg = bgPicker.value;

            update();
            markBg();
        });

        clearBgBtn.addEventListener("click", () => {

            box.bg = "transparent";

            update();
            markBg();
        });


        /* ---------- ไอคอน ---------- */

        menu.querySelectorAll(".object-menu-icon-btn").forEach(iconBtn => {

            iconBtn.addEventListener("click", () => {

                box.iconKey =
                    box.iconKey === iconBtn.dataset.icon
                        ? ""
                        : iconBtn.dataset.icon;

                update();

                menu.querySelectorAll(".object-menu-icon-btn").forEach(item => {

                    item.classList.toggle(
                        "active",
                        item.dataset.icon === box.iconKey
                    );
                });
            });
        });


        /* ---------- แสดงหัวข้อ / ชั้น ---------- */

        menu.querySelector('[data-field="showHeading"]')
            .addEventListener("change", event => {

                box.showHeading = event.target.checked;

                update();
            });

        menu.querySelector('[data-field="layer"]')
            .addEventListener("change", event => {

                box.layer = event.target.value;

                update();
            });


        /* ---------- ปักซ้าย / ปักขวา ---------- */

        menu.querySelectorAll(".object-menu-step-btn").forEach(stepBtn => {

            stepBtn.addEventListener("click", () => {

                const field = stepBtn.dataset.step;

                box[field] =
                    Math.max(0, (box[field] || 0) + Number(stepBtn.dataset.delta));

                const valueEl =
                    menu.querySelector(`[data-value="${field}"]`);

                if (valueEl) {
                    valueEl.textContent = String(box[field]);
                }

                update();
            });
        });


        /* ---------- รายละเอียด ---------- */

        menu.querySelector('[data-field="showDetail"]')
            .addEventListener("change", event => {

                box.showDetail = event.target.checked;

                update();

                rebuildSettingsMenu();
            });

        const detailInput =
            menu.querySelector('[data-field="detail"]');

        if (detailInput) {

            detailInput.addEventListener("input", () => {

                box.detail = detailInput.value;

                update();
            });
        }


        /* ---------- เส้นแนวตั้ง ---------- */

        menu.querySelector('[data-field="verticalLineStyle"]')
            .addEventListener("change", event => {

                box.verticalLineStyle = event.target.value;

                update();
            });


        /* ---------- สีข้อความ ---------- */

        menu.querySelectorAll('input[name="zgTextColorMode"]').forEach(radio => {

            radio.addEventListener("change", () => {

                if (!radio.checked) {
                    return;
                }

                box.color = radio.value;

                colorPicker.value = box.color;

                update();
                markTextColor();
            });
        });

        colorPicker.addEventListener("input", () => {

            box.color = colorPicker.value;

            update();
            markTextColor();
        });


        /* ---------- ตำแหน่งข้อความ ---------- */

        menu.querySelectorAll(".object-menu-position-btn").forEach(posBtn => {

            posBtn.addEventListener("click", () => {

                box.textPosition = Number(posBtn.dataset.position);

                update();

                menu.querySelectorAll(".object-menu-position-btn").forEach(item => {

                    item.classList.toggle("active", item === posBtn);
                });
            });
        });


        /* ---------- ทำสำเนา / ลบ ---------- */

        menu.querySelector('[data-action="duplicate"]')
            .addEventListener("click", () => {

                closeSettingsMenu();

                duplicateTextBox(box);
            });

        menu.querySelector('[data-action="delete"]')
            .addEventListener("click", () => {

                closeSettingsMenu();

                removeTextBox(box);
            });
    }


    /* =====================================================
       TOOLBAR BUTTON
    ===================================================== */

    addTextBtn.addEventListener("click", () => {

        createTextBox();
    });


    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            closeSettingsMenu();
        }
    });


    /* =====================================================
       PUBLIC API (ใช้โดย io.js / zoom-sync.js)
    ===================================================== */

    window.ZGTextBoxes = {

        serialize() {

            return textBoxes.map(serializeBox);
        },


        /*
            เรียกจาก zoom-sync.js ตอนตารางซูม:
            กล่องที่ติดกับ task / hline (object ที่ยืดหดตามซูม)
            ต้องยืดระยะแนวนอนจากขอบซ้ายของ object ตามด้วย
        */
        scaleAttachedX(ratio) {

            if (!(ratio > 0) || ratio === 1) {
                return;
            }

            textBoxes.forEach(box => {

                if (
                    box.attach &&
                    (
                        box.attach.part === "canvas-object--task" ||
                        box.attach.part === "canvas-object--hline"
                    )
                ) {

                    box.attach.dx *= ratio;
                }
            });
        },


        clear() {

            textBoxes.slice().forEach(removeTextBox);
        },


        load(list) {

            this.clear();

            if (!Array.isArray(list)) {
                return;
            }

            list.forEach(item => {

                if (item && typeof item === "object") {
                    addTextBox(item);
                }
            });
        }
    };

})();