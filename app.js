"use strict";


/* =========================================================
   ELEMENTS
========================================================= */

const scheduleArea =
    document.getElementById("scheduleArea");

const categorySidebar =
    document.getElementById("categorySidebar");

const partySidebar =
    document.getElementById("partySidebar");

const timelineViewport =
    document.getElementById("timelineViewport");

const timelineContent =
    document.getElementById("timelineContent");

const timelineHeader =
    document.getElementById("timelineHeader");

const timelineHeaderInner =
    document.getElementById("timelineHeaderInner");

const scheduleGrid =
    document.getElementById("scheduleGrid");

const objectLayer =
    document.getElementById("objectLayer");

const objectLayerViewport =
    document.getElementById("objectLayerViewport");

const hlineLayer =
    document.getElementById("hlineLayer");

const addCategoryBtn =
    document.getElementById("addCategoryBtn");

const categoryMenu =
    document.getElementById("categoryMenu");

const categoryColorPicker =
    document.getElementById("categoryColorPicker");

const deleteCategoryBtn =
    document.getElementById("deleteCategoryBtn");

const categoryScrollbar =
    document.getElementById("categoryScrollbar");

const categoryScrollRange =
    document.getElementById("categoryScrollRange");


/* =========================================================
   TOOLBAR MORE MENU
========================================================= */

const toolbarMoreBtn =
    document.getElementById("toolbarMoreBtn");

const toolbarMoreMenu =
    document.getElementById("toolbarMoreMenu");


/* =========================================================
   OBJECT INSERT / ROLE BUTTONS
========================================================= */

const addTaskBtn =
    document.getElementById("addTaskBtn");

const addDateLineBtn =
    document.getElementById("addDateLineBtn");

const addHLineBtn =
    document.getElementById("addHLineBtn");

const manageRolesBtn =
    document.getElementById("manageRolesBtn");

const roleManagerPanel =
    document.getElementById("roleManagerPanel");

const roleManagerList =
    document.getElementById("roleManagerList");

const addRoleBtn =
    document.getElementById("addRoleBtn");

const closeRoleManagerBtn =
    document.getElementById("closeRoleManagerBtn");


/* =========================================================
   HORIZONTAL TIMELINE
========================================================= */

const scrollTimelineLeft =
    document.getElementById("scrollTimelineLeft");

const scrollTimelineRight =
    document.getElementById("scrollTimelineRight");

const timelineHorizontalRange =
    document.getElementById("timelineHorizontalRange");

const timelineStartInput =
    document.getElementById("timelineStartInput");

const timelineEndInput =
    document.getElementById("timelineEndInput");

const extendStartBtn =
    document.getElementById("extendStartBtn");

const shrinkStartBtn =
    document.getElementById("shrinkStartBtn");

const shrinkEndBtn =
    document.getElementById("shrinkEndBtn");

const extendEndBtn =
    document.getElementById("extendEndBtn");

const zoomOutBtn =
    document.getElementById("zoomOutBtn");

const zoomInBtn =
    document.getElementById("zoomInBtn");

const zoomText =
    document.getElementById("zoomText");


/* =========================================================
   BRACKET
========================================================= */

const bracketViewport =
    document.getElementById("bracketViewport");

const bracketContent =
    document.getElementById("bracketContent");


/* =========================================================
   NOTES
========================================================= */

const addNoteBtn =
    document.getElementById("addNoteBtn");

const notesViewport =
    document.getElementById("notesViewport");

const notesTrack =
    document.getElementById("notesTrack");

const notesHorizontalRange =
    document.getElementById("notesHorizontalRange");


/* =========================================================
   FOOTER
========================================================= */

const bottomHotZone =
    document.getElementById("bottomHotZone");

const companyFooter =
    document.getElementById("companyFooter");


/* =========================================================
   CONFIG
========================================================= */

const VISIBLE_CATEGORY_COUNT = 3;

const DEFAULT_CATEGORY_NAME = "Category";

const DEFAULT_ROW_TEXT = "type...";

const DEFAULT_ROW_ROLE = "type...";

const TIMELINE_SCROLL_STEP = 160;

/*
    ใช้เป็นค่า fallback เท่านั้น
    (กรณีวัดความกว้าง viewport ยังไม่ได้)
*/
const BASE_PX_PER_DAY = 6;

const VISIBLE_MONTHS_DEFAULT = 6;

const ZOOM_STEP = 0.1;

const ZOOM_MIN = 0.4;

const ZOOM_MAX = 2.5;

const MS_PER_DAY = 86400000;

const MIN_RANGE_DAYS = 7;

const THAI_MONTHS_SHORT = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.",
    "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.",
    "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

const OBJECT_MIN_DURATION_DAYS = 1;

const DEFAULT_TASK_DURATION_DAYS = 14;

const DEFAULT_HLINE_DURATION_DAYS = 10;

const DEFAULT_ROLE_COLORS = [
    "#4a90d9",
    "#d9534f",
    "#e1a638",
    "#58ad74",
    "#876bd0",
    "#e64694"
];

/*
    ============================================================
    Unified Canvas Model (แนวทาง C)
    ทุก object (task / hline / dateline / vline) ใช้พิกัด
    {x, y, width, height} เป็นค่าหลักเสมอ ไม่ผูกกับ row/date
    ถาวรอีกต่อไป (คำนวณจาก row/date แค่ตอน "สร้างครั้งแรก"
    เพื่อกำหนดตำแหน่ง default เท่านั้น)
    ============================================================
*/

const OBJECT_ICON_SET = [
    "📄", "🌱", "💰", "🏭", "📦", "✅",
    "🔑", "📅", "🚚", "⚙️", "🏗️", "📋",
    "🏢", "✏️", "🔄", "⭐"
];

const OBJECT_COLOR_PRESETS = [
    "#4a90d9", "#d9534f", "#e1a638", "#58ad74",
    "#876bd0", "#e64694", "#3fbf9e", "#f2994a",
    "#5c6ac4", "#2ecc71", "#c0392b", "#7f8c8d",
    "#16a085", "#8e44ad", "#2980b9", "#e67e22"
];

const TEXT_POSITION_CLASSES = [
    "align-tl", "align-tc", "align-tr",
    "align-ml", "align-mc", "align-mr",
    "align-bl", "align-bc", "align-br"
];


/* =========================================================
   GEOMETRY
========================================================= */

let verticalScrollY = 0;

let categoryHeight = 0;

let totalContentHeight = 0;

let maxVerticalScroll = 0;

let timelineStartDate =
    new Date(2026, 0, 6);

let timelineEndDate =
    new Date(2027, 2, 2);

let zoomScale = 1;

let pxPerDay = BASE_PX_PER_DAY;

let timelineTotalDays = 1;

let timelineWidthPx = 0;

/*
    เก็บตำแหน่ง top/height ของแต่ละ
    category และแต่ละแถว ใช้เป็น
    "ตำแหน่ง default ตอนสร้าง object ใหม่"
    เท่านั้น (ไม่ใช้ผูก object ถาวรแล้ว)
*/
let categorySlotMap = {};

let rowSlotMap = {};

/* =========================================================
   IDS
========================================================= */

let idCounter = 0;


function createId(prefix = "item") {

    idCounter += 1;

    return (
        prefix +
        "-" +
        Date.now() +
        "-" +
        idCounter +
        "-" +
        Math.random()
            .toString(36)
            .slice(2, 8)
    );
}


function createCategoryId() {

    return createId("category");
}


function createRowId() {

    return createId("row");
}


function createNoteId() {

    return createId("note");
}


function createObjectId() {

    return createId("object");
}


function createRoleId() {

    return createId("role");
}


/* =========================================================
   HELPERS
========================================================= */

function clamp(
    value,
    minimum,
    maximum
) {

    return Math.min(
        maximum,
        Math.max(
            minimum,
            value
        )
    );
}

function escapeHtml(
    value
) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}


function getElementMaxScroll(
    element
) {

    if (!element) {

        return 0;
    }

    return Math.max(
        0,
        element.scrollWidth -
        element.clientWidth
    );
}

function parseDateInputValue(
    value
) {

    const parts =
        value.split("-").map(Number);


    return new Date(
        parts[0],
        parts[1] - 1,
        parts[2]
    );
}


function formatDateInputValue(
    date
) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;
}


function formatThaiDateShort(
    date
) {

    return (
        `${date.getDate()} ` +
        `${THAI_MONTHS_SHORT[date.getMonth()]} ` +
        `${date.getFullYear() + 543}`
    );
}


function daysBetween(
    dateA,
    dateB
) {

    return Math.round(
        (dateB - dateA) /
        MS_PER_DAY
    );
}


function addMonths(
    date,
    amount
) {

    const result =
        new Date(date);


    result.setMonth(
        result.getMonth() +
        amount
    );


    return result;
}


function addDays(
    date,
    amount
) {

    const result =
        new Date(date);


    result.setDate(
        result.getDate() +
        amount
    );


    return result;
}


/* =========================================================
   CATEGORY STATE
========================================================= */

function createDefaultRow(
    index = 0
) {

    return {

        id:
            createRowId(),

        text:
            DEFAULT_ROW_TEXT,

        role:
            DEFAULT_ROW_ROLE,

        type:
            index % 2 === 0
                ? "seller"
                : "buyer"
    };
}


function createDefaultCategory(
    color = "#d9dcde"
) {

    return {

        id:
            createCategoryId(),

        name:
            DEFAULT_CATEGORY_NAME,

        color,

        rows: [

            createDefaultRow(0),

            createDefaultRow(1)

        ]
    };
}


let categories = [

    createDefaultCategory(),

    createDefaultCategory(),

    createDefaultCategory()

];


let selectedCategoryId =
    null;


let activeRowMenu =
    null;


/* =========================================================
   ROW SELECTION (สำหรับเพิ่ม object)
========================================================= */

let selectedRowContext =
    null;


function selectRow(
    categoryId,
    rowId
) {

    selectedRowContext = {
        categoryId,
        rowId
    };


    partySidebar
        .querySelectorAll(".party-row")
        .forEach(
            element => {

                element.classList.toggle(
                    "selected",
                    element.dataset.rowId ===
                    rowId
                );
            }
        );
}


/* =========================================================
   OBJECT ROLES STATE
========================================================= */

let objectRoles = [

    {
        id: createRoleId(),
        name: "งานทั่วไป",
        color: "#f0f0f0"
    },

    {
        id: createRoleId(),
        name: "สำคัญ",
        color: "#d9534f"
    },

    {
        id: createRoleId(),
        name: "รอดำเนินการ",
        color: "#e1a638"
    }

];


function getRole(
    roleId
) {

    return (
        objectRoles.find(
            role =>
                role.id ===
                roleId
        ) ||
        objectRoles[0] ||
        {
            color: "#888888",
            name: "-"
        }
    );
}


/* =========================================================
   TIMELINE OBJECTS STATE (Unified Canvas Model)
========================================================= */

let timelineObjects = [];

/*
    ★ แก้บั๊ก "ตารางหายตอนรันหน้าเว็บ":
    ตัวแปรนี้ถูกใช้ใน initialize()/renderNotes()/deleteNote()
    แต่ไม่เคยถูกประกาศมาก่อน ทำให้ initialize() พังตั้งแต่
    บรรทัดแรกด้วย ReferenceError (เพราะไฟล์เป็น "use strict")
    และ renderSchedule() เลยไม่เคยถูกเรียกเลย
*/
let boardNotes = [];

let datelineSpawnCounter = 0;

let hlineSpawnCounter = 0;

function getDefaultObjectSize(
    type
) {

    if (type === "dateline") {

        return { width: 130, height: 46 };
    }

    if (type === "hline") {

        return { width: 160, height: 26 };
    }

    if (type === "vline") {

        return { width: 0, height: 0 };
    }

    return { width: 160, height: 30 };
}


function getSpawnPosition(
    type
) {

    if (type === "dateline") {

        datelineSpawnCounter += 1;

        const offset =
            (datelineSpawnCounter % 6) * 18;

        return {
            x: 24 + offset,
            y: 24 + offset
        };
    }

    if (type === "hline") {

        hlineSpawnCounter += 1;

        const hlineWidth =
            getDefaultObjectSize("hline").width;

        return {
            /* กึ่งกลางของส่วนตารางที่มองเห็นอยู่ตอนนี้ */
            x:
                timelineViewport.scrollLeft +
                (timelineViewport.clientWidth - hlineWidth) / 2,

            y: 24 + ((hlineSpawnCounter % 3) * 8)   // พิกัดภายในช่อง bracket
        };
    }

    const slot =
        selectedRowContext &&
        rowSlotMap[selectedRowContext.rowId];

    const baseLeft =
        timelineViewport.scrollLeft + 40;

    if (!slot) {

        return {
            x: baseLeft,
            y: verticalScrollY + 40
        };
    }

    return {
        x: baseLeft,
        y: slot.top + slot.height * 0.2
    };
}


function createTimelineObject(
    type
) {

    const size =
        getDefaultObjectSize(type);

    const spawn =
        getSpawnPosition(type);

    return {

        id:
            createObjectId(),

        type,

        x: spawn.x,
        y: spawn.y,
        width: size.width,
        height: size.height,

        roleId:
            (type !== "vline")
                ? (
                    type === "task"
                        ? (
                            objectRoles[0]
                                ? objectRoles[0].id
                                : null
                        )
                        : (
                            /*
                                ★ เส้นแนวนอน / เส้นวันที่
                                default = role ที่ 2 (สีแดง)
                                ส่วนกล่องงาน (task) ยังใช้
                                role แรก (สีเทาอ่อนมากๆ)
                            */
                            objectRoles[1]
                                ? objectRoles[1].id
                                : (
                                    objectRoles[0]
                                        ? objectRoles[0].id
                                        : null
                                )
                        )
                )
                : null,

        text:
            type === "task"
                ? "title"
                : type === "hline"
                    ? "เส้นแนวนอน"
                    : type === "dateline"
                        ? "title"
                        : "",


        detail: "",

        linkedHeaderDate:
            (type === "dateline" || type === "vline")
                ? new Date(timelineStartDate)
                : null,

        lineColor:
            type === "vline" ? "#000000" : null,

        lineThickness:
            type === "vline" ? 1 : null,

        iconKey: "",

        showHeading: true,

        layer: "front",

        pinLeft: 0,

        pinRight: 0,

        showDetail: false,

        verticalLineStyle: "none",

        textColorMode: "dark",

        textPosition: 4,

        anchorStartId: null,

        anchorEndId: null
    };
}


function deleteTimelineObject(
    objectId
) {

    const index =
        timelineObjects.findIndex(
            object =>
                object.id ===
                objectId
        );


    if (index < 0) {

        return;
    }


    timelineObjects.splice(
        index,
        1
    );


    renderObjects();
}


function duplicateTimelineObject(
    objectId
) {

    const source =
        timelineObjects.find(
            object =>
                object.id ===
                objectId
        );


    if (!source) {

        return;
    }


    const copy = {

        ...source,

        id:
            createObjectId(),

        x:
            source.x + 18,

        y:
            source.y + 18
    };


    timelineObjects.push(
        copy
    );


    renderObjects();
}


/* =========================================================
   FIND CATEGORY
========================================================= */

function findCategory(
    categoryId
) {

    return categories.find(
        category =>
            category.id ===
            categoryId
    );
}


function findCategoryIndex(
    categoryId
) {

    return categories.findIndex(
        category =>
            category.id ===
            categoryId
    );
}


function findRow(
    category,
    rowId
) {

    if (!category) {

        return null;
    }

    return category.rows.find(
        row =>
            row.id ===
            rowId
    );
}


/* =========================================================
   NORMALIZE
========================================================= */

function normalizeCategoryRows(
    category
) {

    if (
        typeof category.name !== "string" ||
        !category.name.trim()
    ) {

        category.name =
            DEFAULT_CATEGORY_NAME;
    }


    if (!category.color) {

        category.color =
            "#888888";
    }


    if (
        !Array.isArray(
            category.rows
        )
    ) {

        category.rows = [];
    }


    if (
        category.rows.length === 0
    ) {

        category.rows.push(
            createDefaultRow(0)
        );
    }


    category.rows.forEach(
        (
            row,
            index
        ) => {

            if (!row.id) {

                row.id =
                    createRowId();
            }


            if (
                typeof row.text !== "string" ||
                !row.text.trim()
            ) {

                row.text =
                    DEFAULT_ROW_TEXT;
            }


            if (
                typeof row.role !== "string" ||
                !row.role.trim()
            ) {

                row.role =
                    DEFAULT_ROW_ROLE;
            }


            if (
                row.type !== "seller" &&
                row.type !== "buyer"
            ) {

                row.type =
                    index % 2 === 0
                        ? "seller"
                        : "buyer";
            }
        }
    );
}


/* =========================================================
   GEOMETRY
========================================================= */

function calculateGeometry() {

    if (!scheduleArea) {

        return;
    }


    const viewportHeight =
        scheduleArea.clientHeight;


    categoryHeight =
        viewportHeight /
        VISIBLE_CATEGORY_COUNT;


    totalContentHeight =
        categoryHeight *
        categories.length;


    maxVerticalScroll =
        Math.max(
            0,
            totalContentHeight -
            viewportHeight
        );


    verticalScrollY =
        clamp(
            verticalScrollY,
            0,
            maxVerticalScroll
        );


    categorySidebar.style.height =
        `${totalContentHeight}px`;


    partySidebar.style.height =
        `${totalContentHeight}px`;


    timelineContent.style.height =
        `${totalContentHeight}px`;


    /* ซิงค์ objectLayer / hlineLayer ให้สูงเท่าเนื้อหาทั้งหมด */

    const areaTop = scheduleArea.offsetTop;
    const areaHeight = scheduleArea.offsetHeight;

    objectLayerViewport.style.top = `${areaTop}px`;
    objectLayerViewport.style.height = `${areaHeight}px`;

    objectLayer.style.height = `${totalContentHeight}px`;
    hlineLayer.style.height = `${Math.max(totalContentHeight, scheduleArea.offsetHeight)}px`;
}

/* =========================================================
   TIMELINE DATE GEOMETRY
========================================================= */

function calculateTimelineGeometry() {

    timelineTotalDays =
        Math.max(
            1,
            daysBetween(
                timelineStartDate,
                timelineEndDate
            )
        );


    const viewportWidth =
        timelineViewport.clientWidth;


    const referenceEndDate =
        addMonths(
            timelineStartDate,
            VISIBLE_MONTHS_DEFAULT
        );


    const referenceDays =
        Math.max(
            1,
            daysBetween(
                timelineStartDate,
                referenceEndDate
            )
        );


    const fitBasePxPerDay =
        viewportWidth > 0
            ? viewportWidth / referenceDays
            : BASE_PX_PER_DAY;


    pxPerDay =
        fitBasePxPerDay *
        zoomScale;


    timelineWidthPx =
        timelineTotalDays *
        pxPerDay;


    timelineContent.style.width =
        `${timelineWidthPx}px`;


    timelineContent.style.minWidth =
        `${timelineWidthPx}px`;


    if (bracketContent) {

        bracketContent.style.width =
            `${timelineWidthPx}px`;

        bracketContent.style.minWidth =
            `${timelineWidthPx}px`;
    }
}

function snapToDevicePixel(
    value
) {

    const dpr =
        window.devicePixelRatio || 1;

    return Math.round(value * dpr) / dpr;
}

function getBracketHorizontalCorrection() {

    const objectSideLeft =
        objectLayerViewport.getBoundingClientRect().left;

    const bracketSideLeft =
        bracketViewport.getBoundingClientRect().left;

    return (
        objectSideLeft -
        bracketSideLeft
    );
}

function dateToLeft(
    date
) {

    return (
        daysBetween(
            timelineStartDate,
            date
        ) *
        pxPerDay
    );
}


function leftDeltaToDayOffset(
    leftPx
) {

    return Math.round(
        leftPx /
        pxPerDay
    );
}


/* =========================================================
   DATE GRIDLINES + TIMELINE HEADER
========================================================= */

function createVerticalLine(
    container,
    left,
    tier
) {

    const line =
        document.createElement(
            "div"
        );


    line.className =
        `dynamic-v-line dynamic-v-line--${tier}`;


    line.style.left =
        `${left}px`;


    container.appendChild(
        line
    );
}


function createMonthLabel(
    left,
    date
) {

    const label =
        document.createElement(
            "div"
        );


    label.className =
        "month-label";


    label.style.left =
        `${left + 4}px`;


    label.textContent =
        `${THAI_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;


    timelineHeaderInner.appendChild(
        label
    );
}


function createDayLabel(
    left,
    dayNumber,
    dayDate
) {

    const label =
        document.createElement(
            "div"
        );


    label.className =
        "day-number-label";


    label.style.left =
        `${left}px`;


    label.style.width =
        `${pxPerDay}px`;


    label.style.fontSize =
        `${clamp(pxPerDay * 0.55, 5, 9)}px`;


    /*
        ★ ต้องมี data-date เพื่อให้
        highlightLinkedHeaderDate() หาเจอ
        (สำหรับข้อ 9 - ทำเลขวันเป็นสีแดง)
    */

    label.dataset.date =
        formatDateInputValue(dayDate);


    label.textContent =
        String(dayNumber);


    label.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            createVLineAtDate(
                dayDate
            );
        }
    );


    timelineHeaderInner.appendChild(
        label
    );
}


function createDateLineAtDate(
    date
) {

    const object =
        createTimelineObject(
            "dateline"
        );

    object.linkedHeaderDate =
        new Date(date);

    object.text =
        formatThaiDateShort(
            date
        );

    timelineObjects.push(
        object
    );

    renderObjects();
}

function createVLineAtDate(
    date
) {

    const object =
        createTimelineObject("vline");

    object.linkedHeaderDate =
        new Date(date);

    timelineObjects.push(
        object
    );

    renderObjects();
}


function renderDayTicks() {

    for (
        let dayOffset = 0;
        dayOffset < timelineTotalDays;
        dayOffset += 1
    ) {

        const dayDate =
            new Date(
                timelineStartDate
            );


        dayDate.setDate(
            dayDate.getDate() +
            dayOffset
        );


        const left =
            dayOffset *
            pxPerDay;


        const isMonthBoundary =
            dayDate.getDate() === 1;


        if (
            dayOffset > 0 &&
            !isMonthBoundary
        ) {

            createVerticalLine(
                scheduleGrid,
                left,
                "day"
            );


            createVerticalLine(
                timelineHeaderInner,
                left,
                "day"
            );
        }


        createDayLabel(
            left,
            dayDate.getDate(),
            dayDate
        );
    }
}


function createDateGridLines() {

    timelineHeaderInner.innerHTML =
        "";


    let cursor =
        new Date(
            timelineStartDate.getFullYear(),
            timelineStartDate.getMonth(),
            1
        );


    if (cursor < timelineStartDate) {

        createMonthLabel(
            0,
            cursor
        );


        cursor =
            addMonths(cursor, 1);
    }


    while (cursor <= timelineEndDate) {

        const left =
            daysBetween(
                timelineStartDate,
                cursor
            ) *
            pxPerDay;


        createVerticalLine(
            scheduleGrid,
            left,
            "month"
        );


        createVerticalLine(
            timelineHeaderInner,
            left,
            "month"
        );


        createMonthLabel(
            left,
            cursor
        );


        cursor =
            addMonths(cursor, 1);
    }


    renderDayTicks();


    timelineHeaderInner.style.width =
        `${timelineWidthPx}px`;


    timelineHeaderInner.style.minWidth =
        `${timelineWidthPx}px`;


    syncTimelineHeaderScroll();
}


/* =========================================================
   SYNC HEADER SCROLL กับ TIMELINE VIEWPORT
========================================================= */

/* =========================================================
   OBJECT LAYER SYNC (ข้อ 1/2/3 — objectLayer ย้ายออกมาอยู่
   นอก schedule-area แล้ว จึงต้องซิงค์ตำแหน่ง scroll เอง
========================================================= */

let isSyncingHorizontalScroll =
    false;


function syncObjectLayerTransform() {

    const roundedX =
        snapToDevicePixel(
            timelineViewport.scrollLeft
        );

    const roundedY =
        snapToDevicePixel(verticalScrollY);

    objectLayer.style.transform =
        `translate(${-roundedX}px, ${-roundedY}px)`;

    hlineLayer.style.transform =
        `translate(${-roundedX}px, ${-roundedY}px)`;
}


function syncTimelineHeaderScroll() {

    timelineHeaderInner.style.transform =
        `translateX(${-timelineViewport.scrollLeft}px)`;


    if (
        bracketViewport &&
        !isSyncingHorizontalScroll &&
        bracketViewport.scrollLeft !==
            timelineViewport.scrollLeft
    ) {

        isSyncingHorizontalScroll =
            true;

        bracketViewport.scrollLeft =
            timelineViewport.scrollLeft;

        isSyncingHorizontalScroll =
            false;
    }


    syncObjectLayerTransform();
}


/* =========================================================
   RENDER SCHEDULE
========================================================= */

function renderSchedule() {

    categories.forEach(
        normalizeCategoryRows
    );


    calculateGeometry();
    calculateTimelineGeometry();


    categorySidebar.innerHTML =
        "";


    partySidebar.innerHTML =
        "";


    scheduleGrid.innerHTML =
        "";


    categorySlotMap = {};

    rowSlotMap = {};


    categories.forEach(
        (
            category,
            categoryIndex
        ) => {

            renderCategory(
                category,
                categoryIndex
            );


            renderPartyRows(
                category,
                categoryIndex
            );
        }
    );


    createTimelineGrid();


    updateVerticalPosition();

    updateScrollbar();


    renderObjects();


    requestAnimationFrame(
        updateAllHorizontalRanges
    );
}


/* =========================================================
   CATEGORY
========================================================= */

function renderCategory(
    category,
    categoryIndex
) {

    categorySlotMap[category.id] = {

        top:
            categoryIndex *
            categoryHeight,

        height:
            categoryHeight
    };


    const categoryElement =
        document.createElement(
            "div"
        );


    categoryElement.className =
        "category";


    categoryElement.dataset.categoryId =
        category.id;


    categoryElement.style.top =
        `${
            categoryIndex *
            categoryHeight
        }px`;


    categoryElement.style.height =
        `${categoryHeight}px`;


    categoryElement.style.backgroundColor =
        category.color;


    const categoryName =
        document.createElement(
            "div"
        );


    categoryName.className =
        "category-name";


    categoryName.contentEditable =
        "true";


    categoryName.spellcheck =
        false;


    categoryName.textContent =
        category.name;


    categoryName.addEventListener(
        "input",
        () => {

            category.name =
                categoryName.textContent;
        }
    );


    categoryName.addEventListener(
        "mousedown",
        event => {

            event.stopPropagation();
        }
    );


    categoryElement.appendChild(
        categoryName
    );


    /* MORE BUTTON */

    const moreButton =
        document.createElement(
            "button"
        );


    moreButton.type =
        "button";


    moreButton.className =
        "category-more-btn";


    moreButton.textContent =
        "⋮";


    moreButton.title =
        "ตั้งค่าหมวดหมู่";


    moreButton.addEventListener(
        "mousedown",
        event => {

            event.stopPropagation();
        }
    );


    moreButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            event.stopPropagation();


            openCategoryMenu(
                event,
                category.id,
                moreButton
            );
        }
    );


    categoryElement.appendChild(
        moreButton
    );


    categorySidebar.appendChild(
        categoryElement
    );
}


/* =========================================================
   PARTY ROWS
========================================================= */

function renderPartyRows(
    category,
    categoryIndex
) {

    const rowCount =
        Math.max(
            1,
            category.rows.length
        );


    const rowHeight =
        categoryHeight /
        rowCount;


    category.rows.forEach(
        (
            row,
            rowIndex
        ) => {

            /*
                ยังไม่มีแถวที่เลือกเลย
                ให้ default เป็นแถวแรกสุด
            */

            if (!selectedRowContext) {

                selectedRowContext = {
                    categoryId:
                        category.id,

                    rowId:
                        row.id
                };
            }


            const rowElement =
                document.createElement(
                    "div"
                );


            rowElement.className =
                "party-row";


            rowElement.dataset.categoryId =
                category.id;


            rowElement.dataset.rowId =
                row.id;


            rowElement.dataset.rowIndex =
                String(
                    rowIndex
                );


            const rowTop =
                (
                    categoryIndex *
                    categoryHeight
                ) +
                (
                    rowIndex *
                    rowHeight
                );


            rowElement.style.top =
                `${rowTop}px`;


            rowElement.style.height =
                `${rowHeight}px`;


            rowSlotMap[row.id] = {

                top:
                    rowTop,

                height:
                    rowHeight,

                categoryId:
                    category.id
            };


            if (
                selectedRowContext.rowId ===
                row.id
            ) {

                rowElement.classList.add(
                    "selected"
                );
            }


            const content =
                document.createElement(
                    "div"
                );


            content.className =
                "party-content";


            /* MAIN */

            const mainText =
                document.createElement(
                    "div"
                );


            mainText.className =
                "party-main";


            /*
                ข้อ 6 — เอาไฮไลท์สีที่ช่อง type
                (seller-text / buyer-text) ออก
            */


            mainText.contentEditable =
                "true";


            mainText.spellcheck =
                false;


            mainText.textContent =
                row.text;


            mainText.addEventListener(
                "input",
                () => {

                    row.text =
                        mainText.textContent;
                }
            );


            /* ROLE */

            const roleText =
                document.createElement(
                    "div"
                );


            roleText.className =
                "party-role";


            roleText.contentEditable =
                "true";


            roleText.spellcheck =
                false;


            roleText.textContent =
                row.role;


            roleText.addEventListener(
                "input",
                () => {

                    row.role =
                        roleText.textContent;
                }
            );


            content.appendChild(
                mainText
            );


            content.appendChild(
                roleText
            );


            rowElement.appendChild(
                content
            );


            /*
                คลิกที่แถว (นอกปุ่ม/ช่องพิมพ์)
                เพื่อเลือกเป็นแถวปัจจุบัน
            */

            rowElement.addEventListener(
                "click",
                event => {

                    if (
                        event.target.closest(
                            "button"
                        ) ||
                        event.target.closest(
                            "[contenteditable='true']"
                        )
                    ) {

                        return;
                    }


                    selectRow(
                        category.id,
                        row.id
                    );
                }
            );


            /* ROW MENU */

            const rowMoreButton =
                document.createElement(
                    "button"
                );


            rowMoreButton.type =
                "button";


            rowMoreButton.className =
                "row-more-btn";


            rowMoreButton.textContent =
                "⋮";


            rowMoreButton.title =
                "ตั้งค่าแถว";


            rowMoreButton.addEventListener(
                "mousedown",
                event => {

                    event.stopPropagation();
                }
            );


            rowMoreButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();


                    openRowMenu(
                        event,
                        category.id,
                        row.id,
                        rowMoreButton
                    );
                }
            );


            rowElement.appendChild(
                rowMoreButton
            );


            partySidebar.appendChild(
                rowElement
            );
        }
    );
}


/* =========================================================
   TIMELINE GRID
========================================================= */

function createTimelineGrid() {

    scheduleGrid.innerHTML =
        "";


    categories.forEach(
        (
            category,
            categoryIndex
        ) => {

            const rowCount =
                Math.max(
                    1,
                    category.rows.length
                );


            const rowHeight =
                categoryHeight /
                rowCount;


            const categoryTop =
                categoryIndex *
                categoryHeight;


            /*
                เส้นแบ่งแต่ละ Type
            */

            for (
                let rowIndex = 1;
                rowIndex < rowCount;
                rowIndex += 1
            ) {

                createGridLine(
                    categoryTop +
                    rowIndex *
                    rowHeight
                );
            }


            /*
                เส้นล่าง Category
            */

            createGridLine(
                categoryTop +
                categoryHeight
            );
        }
    );

    createDateGridLines();
}


function createGridLine(
    top
) {

    const line =
        document.createElement(
            "div"
        );


    line.className =
        "dynamic-h-line";


    line.style.top =
        `${top}px`;


    scheduleGrid.appendChild(
        line
    );
}


/* =========================================================
   OBJECT RENDERING (Unified Canvas Model)
========================================================= */

function renderObjects() {

    objectLayer.innerHTML =
        "";

    hlineLayer.innerHTML =
        "";

    bracketContent
        .querySelectorAll(".canvas-object")
        .forEach(
            element => element.remove()
        );

    timelineHeaderInner
        .querySelectorAll(
            ".day-number-label--highlight, .day-number-label--highlight-vline"
        )
        .forEach(
            label =>
                label.classList.remove(
                    "day-number-label--highlight",
                    "day-number-label--highlight-vline"
                )
        );

    timelineObjects.forEach(
        object => {

            if (object.type === "hline") {

                resolveHLineAnchors(object);
            }
        }
    );


    const sortedObjects =
        timelineObjects
            .slice()
            .sort(
                (a, b) =>
                    (a.layer === "back" ? 0 : 1) -
                    (b.layer === "back" ? 0 : 1)
            );


    sortedObjects.forEach(
        object => {

            if (object.type === "vline") {

                renderVLineObject(
                    object
                );

                highlightLinkedHeaderDate(
                    object
                );

            } else if (object.type === "hline") {

                /* เส้นแนวนอน อยู่ในช่อง bracket (ไม่เลื่อนตามแนวตั้งของตาราง) */

                renderCanvasObject(
                    object,
                    bracketContent
                );

            } else if (
                object.type === "dateline"
            ) {

                renderDateLineObject(
                    object
                );

                highlightLinkedHeaderDate(
                    object
                );

            } else {

                renderCanvasObject(
                    object,
                    objectLayer
                );
            }
        }
    );
}


function highlightLinkedHeaderDate(
    object
) {

    if (!object.linkedHeaderDate) {

        return;
    }

    const iso =
        formatDateInputValue(
            object.linkedHeaderDate
        );

    const label =
        timelineHeaderInner.querySelector(
            `.day-number-label[data-date="${iso}"]`
        );

    if (label) {

        label.classList.add(
            object.type === "vline"
                ? "day-number-label--highlight-vline"
                : "day-number-label--highlight"
        );
    }
}


/* =========================================================
   DATE LINE (ข้อ 2 / ข้อ 4)
   — เส้นประแนวตั้งอยู่ใน objectLayer คาดทับตารางได้เลย
   — กล่องข้อความ (chip) อยู่ใน bracketContent
========================================================= */

function renderDateLineObject(
    object
) {

    const left =
        snapToDevicePixel(
            dateToLeft(
                object.linkedHeaderDate ||
                timelineStartDate
            )
        );


    const role =
        object.roleId
            ? getRole(object.roleId)
            : null;

    const lineColor =
        role
            ? role.color
            : "#d0342c";


    /* เส้นประคาดทับตาราง */

    const line =
        document.createElement("div");

    line.className =
        "canvas-object canvas-object--dateline-line";

    line.dataset.objectId =
        object.id;

    line.style.left =
        `${left}px`;

    line.style.borderColor =
        lineColor;

    line.addEventListener(
        "mousedown",
        event => {

            beginObjectDrag(
                event,
                object,
                "move-dateline"
            );
        }
    );

    line.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            if (suppressNextClick) {

                suppressNextClick =
                    false;

                return;
            }

            openObjectMenu(
                object,
                line
            );
        }
    );

    objectLayer.appendChild(
        line
    );


    /* กล่องข้อความปลายเส้น (chip) */

    const chip =
        document.createElement("div");

    chip.className =
        "canvas-object canvas-object--dateline-chip";

    chip.dataset.objectId =
        object.id;

    chip.style.left =
        `${left - (
            Math.max(object.width, 24) / 2
        ) + getBracketHorizontalCorrection()}px`;

    chip.style.top =
        `${object.y}px`;

    chip.style.width =
        `${Math.max(object.width, 24)}px`;

    chip.style.borderColor =
        lineColor;


    const caret =
        document.createElement("div");

    caret.className =
        "dateline-chip-caret";

    caret.style.borderBottomColor =
        lineColor;

    chip.appendChild(
        caret
    );


    const text =
        document.createElement("div");

    text.className =
        "dateline-chip-text";

    text.contentEditable =
        "true";

    text.textContent =
        object.text;

    text.addEventListener(
        "focusout",
        () => {

            object.text =
                text.innerText;
        }
    );

    chip.appendChild(
        text
    );


    const dateBadge =
        document.createElement("div");

    dateBadge.className =
        "canvas-object-date-badge";

    dateBadge.textContent =
        formatThaiDateShort(
            object.linkedHeaderDate ||
            timelineStartDate
        );

    chip.appendChild(
        dateBadge
    );


    const handleStart =
        document.createElement("div");

    handleStart.className =
        "canvas-object-handle canvas-object-handle--start";

    chip.appendChild(
        handleStart
    );


    const handleEnd =
        document.createElement("div");

    handleEnd.className =
        "canvas-object-handle canvas-object-handle--end";

    chip.appendChild(
        handleEnd
    );


    chip.addEventListener(
        "mousedown",
        event => {

            if (event.target === handleStart) {

                return beginObjectDrag(
                    event,
                    object,
                    "resize-start"
                );
            }

            if (event.target === handleEnd) {

                return beginObjectDrag(
                    event,
                    object,
                    "resize-end"
                );
            }

            if (
                event.target.closest(
                    "[contenteditable]"
                )
            ) {

                return;
            }

            beginObjectDrag(
                event,
                object,
                "move-dateline"
            );
        }
    );


    chip.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            if (suppressNextClick) {

                suppressNextClick =
                    false;

                return;
            }

            if (
                event.target.closest(
                    "[contenteditable]"
                )
            ) {

                return;
            }

            openObjectMenu(
                object,
                chip
            );
        }
    );


    bracketContent.appendChild(
        chip
    );
}

function renderVLineObject(
    object
) {

    const left =
        dateToLeft(
            object.linkedHeaderDate ||
            timelineStartDate
        );

    const HIT_PADDING = 5; // px ต่อฝั่ง รวม hit-area = 10px

    const line =
        document.createElement("div");

    line.className =
        "canvas-object canvas-object--vline";

    line.dataset.objectId =
        object.id;

    line.style.left =
        `${left - HIT_PADDING}px`;

    line.style.width =
        `${HIT_PADDING * 2}px`;

    const rawThickness =
        object.lineThickness || 1;

    const thickness =
        snapToDevicePixel(rawThickness);

    const halfThickness =
        Math.round(thickness / 2);

    line.style.setProperty(
        "--vline-offset",
        `${HIT_PADDING - halfThickness}px`
    );

    line.style.setProperty(
        "--vline-thickness",
        `${thickness}px`
    );

    line.style.setProperty(
        "--vline-color",
        object.lineColor || "#000000"
    );


    line.addEventListener(
        "mousedown",
        event => {

            beginObjectDrag(
                event,
                object,
                "move-dateline"
            );
        }
    );


    line.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            if (suppressNextClick) {

                suppressNextClick =
                    false;

                return;
            }

            openObjectMenu(
                object,
                line
            );
        }
    );


    objectLayer.appendChild(
        line
    );
}


function renderCanvasObject(
    object,
    container
) {

    const element =
        document.createElement(
            "div"
        );


    element.className =
        `canvas-object canvas-object--${object.type}`;


    element.dataset.objectId =
        object.id;


    element.style.left =
        `${
            object.x +
            (object.type === "hline"
                ? getBracketHorizontalCorrection()
                : 0)
        }px`;


    element.style.top =
        `${object.y}px`;


    element.style.width =
        `${Math.max(object.width, 24)}px`;


    element.style.height =
        `${Math.max(
            object.height,
            object.type === "hline" ? 6 : 18
        )}px`;


    const role =
        object.roleId
            ? getRole(object.roleId)
            : null;


    if (object.type === "task") {

        element.style.background =
            role.color;

        element.classList.add(
            object.textColorMode === "light"
                ? "text-light"
                : "text-dark"
        );

        element.classList.add(
            TEXT_POSITION_CLASSES[object.textPosition] ||
            "align-mc"
        );


        if (object.pinLeft > 0) {

            const pinLeftTick =
                document.createElement("div");

            pinLeftTick.className =
                "canvas-object-pin canvas-object-pin--left";

            pinLeftTick.textContent =
                String(object.pinLeft);

            element.appendChild(
                pinLeftTick
            );
        }


        if (object.pinRight > 0) {

            const pinRightTick =
                document.createElement("div");

            pinRightTick.className =
                "canvas-object-pin canvas-object-pin--right";

            pinRightTick.textContent =
                String(object.pinRight);

            element.appendChild(
                pinRightTick
            );
        }


        if (object.verticalLineStyle !== "none") {

            const guide =
                document.createElement("div");

            guide.className =
                `canvas-object-vline canvas-object-vline--${object.verticalLineStyle}`;

            guide.style.borderColor =
                role.color;

            element.appendChild(
                guide
            );
        }

    } else if (object.type === "hline") {

        element.style.borderTopColor =
            role.color;

    } else if (object.type === "dateline") {

        element.style.borderColor =
            role.color;
    }


    const labelWrap =
        document.createElement("div");

    labelWrap.className =
        "canvas-object-label-wrap";


    if (object.iconKey) {

        const icon =
            document.createElement("span");

        icon.className =
            "canvas-object-icon";

        icon.textContent =
            object.iconKey;

        labelWrap.appendChild(
            icon
        );
    }


    if (object.showHeading) {

        const label =
            document.createElement("span");

        label.className =
            "canvas-object-label";

        label.textContent =
            object.text;


        if (object.type === "task") {

            /* พิมพ์ที่กล่องได้เลย */

            label.contentEditable =
                "true";

            label.spellcheck =
                false;


            /* ปรับความสูงกล่องตามจำนวนบรรทัด (ขยาย/หดจากกึ่งกลาง) */
            const fitHeightToText = () => {

                const range =
                    document.createRange();

                range.selectNodeContents(
                    label
                );

                const textHeight =
                    Math.max(
                        range.getBoundingClientRect().height,
                        14
                    );

                const needed =
                    Math.ceil(textHeight) + 12;   // เผื่อ padding บน-ล่าง

                /* ความสูงก่อนเริ่มขยาย (เก็บไว้เพื่อหดกลับได้) */
                const base =
                    object.baseHeight != null
                        ? object.baseHeight
                        : object.height;

                const newHeight =
                    Math.max(base, needed);

                object.baseHeight =
                    newHeight > base
                        ? base
                        : null;

                if (newHeight === object.height) {

                    return;
                }

                object.y =
                    Math.max(
                        0,
                        object.y +
                            (object.height - newHeight) / 2
                    );

                object.height =
                    newHeight;

                element.style.top =
                    `${object.y}px`;

                element.style.height =
                    `${newHeight}px`;
            };


            /* บันทึกค่า + ปรับความสูง โดยไม่ render ใหม่ เพื่อไม่ให้ cursor หลุด */
            label.addEventListener(
                "input",
                () => {

                    object.text =
                        label.innerText;

                    fitHeightToText();
                }
            );


            /* วางข้อความเป็น plain text เท่านั้น */
            label.addEventListener(
                "paste",
                event => {

                    event.preventDefault();

                    const plain =
                        (event.clipboardData ||
                            window.clipboardData
                        ).getData("text/plain");

                    document.execCommand(
                        "insertText",
                        false,
                        plain
                    );
                }
            );


            label.addEventListener(
                "keydown",
                event => {

                    if (event.key === "Escape") {

                        label.blur();
                    }
                }
            );
        }


        labelWrap.appendChild(
            label
        );
    }


    if (
        object.type === "dateline" &&
        object.linkedHeaderDate
    ) {

        const dateBadge =
            document.createElement("span");

        dateBadge.className =
            "canvas-object-date-badge";

        dateBadge.textContent =
            formatThaiDateShort(
                object.linkedHeaderDate
            );

        labelWrap.appendChild(
            dateBadge
        );
    }


    if (
        object.showDetail &&
        object.type === "task"
    ) {

        const detail =
            document.createElement("div");

        detail.className =
            "canvas-object-detail";

        detail.textContent =
            object.detail || "รายละเอียด...";

        labelWrap.appendChild(
            detail
        );
    }


    element.appendChild(
        labelWrap
    );


    const handleStart =
        document.createElement("div");

    handleStart.className =
        "canvas-object-handle canvas-object-handle--start";

    element.appendChild(
        handleStart
    );


    const handleEnd =
        document.createElement("div");

    handleEnd.className =
        "canvas-object-handle canvas-object-handle--end";

    element.appendChild(
        handleEnd
    );


    let handleTop =
        null;

    let handleBottom =
        null;


    if (object.type === "task") {

        /* ข้อ 1 — ขยายกล่องงานบน/ล่างได้ */

        handleTop =
            document.createElement("div");

        handleTop.className =
            "canvas-object-handle canvas-object-handle--top";

        element.appendChild(
            handleTop
        );


        handleBottom =
            document.createElement("div");

        handleBottom.className =
            "canvas-object-handle canvas-object-handle--bottom";

        element.appendChild(
            handleBottom
        );
    }


    element.addEventListener(
        "mousedown",
        event => {

            if (event.target === handleStart) {

                return beginObjectDrag(
                    event,
                    object,
                    "resize-start"
                );
            }

            if (event.target === handleEnd) {

                return beginObjectDrag(
                    event,
                    object,
                    "resize-end"
                );
            }

            if (event.target === handleTop) {

                return beginObjectDrag(
                    event,
                    object,
                    "resize-top"
                );
            }

            if (event.target === handleBottom) {

                return beginObjectDrag(
                    event,
                    object,
                    "resize-bottom"
                );
            }

            if (
                event.target.closest(
                    "[contenteditable], button"
                )
            ) {

                return;
            }

            beginObjectDrag(
                event,
                object,
                "move"
            );
        }
    );


    element.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            if (suppressNextClick) {

                suppressNextClick =
                    false;

                return;
            }

            if (
                event.target.closest(
                    "[contenteditable]"
                )
            ) {

                return;
            }


            openObjectMenu(
                object,
                element
            );
        }
    );


    container.appendChild(
        element
    );
}


/* =========================================================
   OBJECT DRAG / RESIZE (Unified)
========================================================= */

let objectDragState =
    null;


let suppressNextClick =
    false;


function beginObjectDrag(
    event,
    object,
    mode
) {

    event.preventDefault();

    event.stopPropagation();

    if (object.type === "hline") {

        releaseHLineAnchors(object, mode);
    }

    objectDragState = {

        object,

        mode,

        startClientX:
            event.clientX,

        startClientY:
            event.clientY,

        originX:
            object.x,

        originY:
            object.y,

        originWidth:
            object.width,

        originHeight:
            object.height,

        originDate:
            object.linkedHeaderDate
                ? new Date(object.linkedHeaderDate)
                : null
    };


    document.addEventListener(
        "mousemove",
        handleObjectDragMove
    );


    document.addEventListener(
        "mouseup",
        endObjectDrag
    );
}


function handleObjectDragMove(
    event
) {

    if (!objectDragState) {

        return;
    }


    const {
        object,
        mode,
        startClientX,
        startClientY,
        originX,
        originY,
        originWidth,
        originHeight,
        originDate
    } = objectDragState;


    const deltaX =
        event.clientX -
        startClientX;

    const deltaY =
        event.clientY -
        startClientY;


    if (mode === "move") {

        object.x =
            originX + deltaX;

        if (object.type === "hline") {

            object.y =
                clamp(
                    originY + deltaY,
                    14,
                    Math.max(
                        14,
                        bracketContent.clientHeight -
                            Math.max(object.height, 6)
                    )
                );

        } else {

            object.y =
                Math.max(0, originY + deltaY);
        }

        } else if (
        object.type === "hline" &&
        (mode === "resize-start" || mode === "resize-end")
    ) {

        resizeHLine(
            object,
            mode,
            originX,
            originWidth,
            deltaX
        );

    } else if (mode === "resize-start") {

        const newWidth =
            originWidth - deltaX;

        if (newWidth >= 24) {

            object.x =
                originX + deltaX;

            object.width =
                newWidth;
        }

    } else if (mode === "resize-end") {

        object.width =
            Math.max(24, originWidth + deltaX);

    } else if (mode === "resize-top") {

        const newHeight =
            originHeight - deltaY;

        if (newHeight >= 16) {

            object.y =
                originY + deltaY;

            object.height =
                newHeight;

            object.baseHeight =
                null;
        }

    } else if (mode === "resize-bottom") {

        object.height =
            Math.max(16, originHeight + deltaY);

        object.baseHeight =
            null;

    

    } else if (mode === "move-dateline") {

        const dayOffset =
            leftDeltaToDayOffset(
                deltaX
            );

        const newDate =
            new Date(
                originDate ||
                timelineStartDate
            );

        newDate.setDate(
            newDate.getDate() +
            dayOffset
        );

        object.linkedHeaderDate =
            newDate;

        object.y =
            Math.max(
                DATELINE_MIN_Y,
                Math.min(
                    originY + deltaY,
                    bracketContent.clientHeight -
                        Math.max(object.height, 18)
                )
            );

        syncLinkedDatelineY(object);
    }


    suppressNextClick =
        true;


    renderObjects();
}


function endObjectDrag() {

    if (
        objectDragState &&
        objectDragState.object.type === "hline" &&
        (
            objectDragState.mode === "resize-start" ||
            objectDragState.mode === "resize-end"
        )
    ) {

        snapHLineAfterDrag(
            objectDragState.object,
            objectDragState.mode
        );

        renderObjects();
    }

    objectDragState =
        null;


    document.removeEventListener(
        "mousemove",
        handleObjectDragMove
    );


    document.removeEventListener(
        "mouseup",
        endObjectDrag
    );


    setTimeout(
        () => {

            suppressNextClick =
                false;
        },
        0
    );
}


/* =========================================================
   OBJECT MENU (แก้ไข object — ดีไซน์ใหม่)
========================================================= */

let activeObjectMenu =
    null;


/*
    ★ ใช้หา element ของ object นี้ที่ถูก render ใหม่ล่าสุด
    หลัง renderObjects() (ซึ่ง teardown/rebuild DOM ทั้งหมด)
    เพื่อไม่ให้ positionFloatingMenu ไปอ้าง element
    ที่หลุดจาก DOM แล้ว (ทำให้เมนูเด้งไปมุมซ้ายบน)
*/
function findFreshAnchor(
    object,
    fallbackElement
) {

    return (
        document.querySelector(
            `.canvas-object[data-object-id="${object.id}"]`
        ) ||
        fallbackElement
    );
}


function openObjectMenu(
    object,
    anchorElement
) {

    closeCategoryMenu();

    closeRowMenu();

    closeToolbarMoreMenu();

    closeObjectMenu();


    const isTask =
        object.type === "task";

    const isDateline =
        object.type === "dateline";

    const isVLine =
        object.type === "vline";

    const role =
        object.roleId
            ? getRole(object.roleId)
            : null;


    const menu =
        document.createElement("div");

    menu.className =
        "object-menu";


    menu.innerHTML = `

        ${(isDateline || isVLine) ? `
        <div class="object-menu-section">
            <label class="object-menu-label">วันที่</label>
            <input type="date" class="object-menu-input" id="objMenuDateInput"
                value="${formatDateInputValue(object.linkedHeaderDate || timelineStartDate)}">
        </div>
        ` : ""}

        ${object.type === "hline" ? `
        <div class="object-menu-section">
            <label class="object-menu-label">ข้อความ</label>
            <input type="text" class="object-menu-input" id="objMenuTextInput" value="${escapeHtml(object.text)}">
        </div>
        ` : ""}

        ${role ? `
        <div class="object-menu-section">
            <label class="object-menu-label">บทบาท (Role)</label>
            <select class="object-menu-select" id="objMenuRoleSelect">
                ${objectRoles.map(roleOption => `
                    <option value="${roleOption.id}" ${roleOption.id === object.roleId ? "selected" : ""}>${roleOption.name}</option>
                `).join("")}
            </select>
        </div>

        <div class="object-menu-section">
            <label class="object-menu-label">สี</label>
            <div class="object-menu-swatches" id="objMenuSwatches">
                ${OBJECT_COLOR_PRESETS.map(color => `
                    <button type="button" class="object-menu-swatch ${color === role.color ? "active" : ""}"
                        data-color="${color}" style="background:${color}"></button>
                `).join("")}
            </div>
            <input type="color" class="object-menu-color-input" id="objMenuColorInput" value="${role.color}">
        </div>
        ` : ""}

        ${isVLine ? `
        <div class="object-menu-section">
            <label class="object-menu-label">สีเส้น</label>
            <div class="object-menu-swatches" id="objMenuVLineColorSwatches">
                ${OBJECT_COLOR_PRESETS.map(color => `
                    <button type="button" class="object-menu-vline-swatch ${color === object.lineColor ? "active" : ""}"
                        data-color="${color}" style="background:${color}"></button>
                `).join("")}
            </div>
            <input type="color" class="object-menu-color-input" id="objMenuVLineColorInput" value="${object.lineColor || "#000000"}">
        </div>

        <div class="object-menu-row">
            <div class="object-menu-stepper">
                <span class="object-menu-label">ความหนาเส้น</span>
                <button type="button" class="object-menu-step-btn" id="objMenuLineThicknessMinus">−</button>
                <span id="objMenuLineThicknessValue">${object.lineThickness || 1}</span>
                <button type="button" class="object-menu-step-btn" id="objMenuLineThicknessPlus">＋</button>
            </div>
        </div>
        ` : ""}

        ${isTask ? `
        <div class="object-menu-section">
            <label class="object-menu-label">ไอคอน</label>
            <div class="object-menu-icons" id="objMenuIcons">
                ${OBJECT_ICON_SET.map(icon => `
                    <button type="button" class="object-menu-icon-btn ${icon === object.iconKey ? "active" : ""}"
                        data-icon="${icon}">${icon}</button>
                `).join("")}
            </div>
        </div>

        <div class="object-menu-row">
            <label class="object-menu-checkbox">
                <input type="checkbox" id="objMenuShowHeading" ${object.showHeading ? "checked" : ""}>
                แสดงหัวข้อ
            </label>
            <select class="object-menu-select object-menu-select--compact" id="objMenuLayerSelect">
                <option value="front" ${object.layer === "front" ? "selected" : ""}>ชั้น: อยู่หน้า</option>
                <option value="back" ${object.layer === "back" ? "selected" : ""}>ชั้น: อยู่หลัง</option>
            </select>
        </div>

        <div class="object-menu-row">
            <div class="object-menu-stepper">
                <span class="object-menu-label">ปักซ้าย</span>
                <button type="button" class="object-menu-step-btn" data-step="pinLeft" data-delta="-1">−</button>
                <span id="objMenuPinLeftValue">${object.pinLeft}</span>
                <button type="button" class="object-menu-step-btn" data-step="pinLeft" data-delta="1">＋</button>
            </div>
            <div class="object-menu-stepper">
                <span class="object-menu-label">ปักขวา</span>
                <button type="button" class="object-menu-step-btn" data-step="pinRight" data-delta="-1">−</button>
                <span id="objMenuPinRightValue">${object.pinRight}</span>
                <button type="button" class="object-menu-step-btn" data-step="pinRight" data-delta="1">＋</button>
            </div>
        </div>

        <div class="object-menu-row">
            <label class="object-menu-checkbox">
                <input type="checkbox" id="objMenuShowDetail" ${object.showDetail ? "checked" : ""}>
                แสดงรายละเอียด (detail)
            </label>
        </div>

        ${object.showDetail ? `
        <div class="object-menu-section">
            <textarea class="object-menu-input object-menu-textarea" id="objMenuDetailInput">${object.detail || ""}</textarea>
        </div>
        ` : ""}

        <div class="object-menu-row">
            <label class="object-menu-label">เส้นแนวตั้ง</label>
            <select class="object-menu-select object-menu-select--compact" id="objMenuVLineSelect">
                <option value="none" ${object.verticalLineStyle === "none" ? "selected" : ""}>ไม่มี</option>
                <option value="dashed" ${object.verticalLineStyle === "dashed" ? "selected" : ""}>เส้นประ</option>
                <option value="solid" ${object.verticalLineStyle === "solid" ? "selected" : ""}>เส้นทึบ</option>
            </select>

            <span class="object-menu-label" style="margin-left:auto">สีข้อความ</span>
            <label class="object-menu-radio-dot">
                <input type="radio" name="objMenuTextColor" value="dark" ${object.textColorMode === "dark" ? "checked" : ""}>
                <span class="dot dot--dark"></span>
            </label>
            <label class="object-menu-radio-dot">
                <input type="radio" name="objMenuTextColor" value="light" ${object.textColorMode === "light" ? "checked" : ""}>
                <span class="dot dot--light"></span>
            </label>
        </div>

        <div class="object-menu-section">
            <label class="object-menu-label">ตำแหน่งข้อความ</label>
            <div class="object-menu-position-grid" id="objMenuPositionGrid">
                ${Array.from({ length: 9 }).map((_, index) => `
                    <button type="button" class="object-menu-position-btn ${index === object.textPosition ? "active" : ""}"
                        data-position="${index}"></button>
                `).join("")}
            </div>
        </div>
        ` : ""}

        <div class="object-menu-actions">
            <button type="button" class="object-menu-duplicate-btn" id="objMenuDuplicateBtn">⧉ ทำสำเนา</button>
            <button type="button" class="object-menu-delete-btn" id="objMenuDeleteBtn">🗑 ลบ</button>
        </div>
    `;


    const textInput =
        menu.querySelector("#objMenuTextInput");

    if (textInput) {

        textInput.addEventListener("input", event => {

            object.text =
                event.target.value;

            renderObjects();
        });
    }


    const dateInput =
        menu.querySelector("#objMenuDateInput");

    if (dateInput) {

        dateInput.addEventListener("change", () => {

            object.linkedHeaderDate =
                parseDateInputValue(dateInput.value);

            renderObjects();
        });
    }


    const roleSelect =
        menu.querySelector("#objMenuRoleSelect");

    if (roleSelect) {

        roleSelect.addEventListener("change", () => {

            /* ข้อ 5 — ทำให้เปลี่ยนบทบาทได้จริง */

            object.roleId =
                roleSelect.value;

            renderObjects();

            closeObjectMenu();

            openObjectMenu(
                object,
                findFreshAnchor(object, anchorElement)
            );
        });
    }


    const colorInput =
        menu.querySelector("#objMenuColorInput");

    if (colorInput) {

        colorInput.addEventListener("input", () => {

            getRole(object.roleId).color =
                colorInput.value;

            renderObjects();

            renderRoleManagerList();
        });
    }


    menu.querySelectorAll(".object-menu-swatch")
        .forEach(swatchBtn => {

            swatchBtn.addEventListener("click", () => {

                getRole(object.roleId).color =
                    swatchBtn.dataset.color;

                renderObjects();

                renderRoleManagerList();

                closeObjectMenu();

                openObjectMenu(
                    object,
                    findFreshAnchor(object, anchorElement)
                );
            });
        });


    menu.querySelectorAll(".object-menu-icon-btn")
        .forEach(iconBtn => {

            iconBtn.addEventListener("click", () => {

                object.iconKey =
                    object.iconKey === iconBtn.dataset.icon
                        ? ""
                        : iconBtn.dataset.icon;

                renderObjects();

                closeObjectMenu();

                openObjectMenu(
                    object,
                    findFreshAnchor(object, anchorElement)
                );
            });
        });


    const showHeadingInput =
        menu.querySelector("#objMenuShowHeading");

    if (showHeadingInput) {

        showHeadingInput.addEventListener("change", () => {

            object.showHeading =
                showHeadingInput.checked;

            renderObjects();
        });
    }


    const layerSelect =
        menu.querySelector("#objMenuLayerSelect");

    if (layerSelect) {

        layerSelect.addEventListener("change", () => {

            object.layer =
                layerSelect.value;

            renderObjects();
        });
    }


    menu.querySelectorAll(".object-menu-step-btn")
        .forEach(stepBtn => {

            stepBtn.addEventListener("click", () => {

                const field =
                    stepBtn.dataset.step;

                const delta =
                    Number(stepBtn.dataset.delta);

                object[field] =
                    Math.max(0, (object[field] || 0) + delta);

                const valueEl =
                    menu.querySelector(
                        field === "pinLeft"
                            ? "#objMenuPinLeftValue"
                            : "#objMenuPinRightValue"
                    );

                if (valueEl) {

                    valueEl.textContent =
                        String(object[field]);
                }

                renderObjects();
            });
        });


    const showDetailInput =
        menu.querySelector("#objMenuShowDetail");

    if (showDetailInput) {

        showDetailInput.addEventListener("change", () => {

            object.showDetail =
                showDetailInput.checked;

            renderObjects();

            closeObjectMenu();

            openObjectMenu(
                object,
                findFreshAnchor(object, anchorElement)
            );
        });
    }


    const detailInput =
        menu.querySelector("#objMenuDetailInput");

    if (detailInput) {

        detailInput.addEventListener("input", () => {

            object.detail =
                detailInput.value;

            renderObjects();
        });
    }


    const vlineSelect =
        menu.querySelector("#objMenuVLineSelect");

    if (vlineSelect) {

        vlineSelect.addEventListener("change", () => {

            object.verticalLineStyle =
                vlineSelect.value;

            renderObjects();
        });
    }


    menu.querySelectorAll("input[name='objMenuTextColor']")
        .forEach(radio => {

            radio.addEventListener("change", () => {

                if (radio.checked) {

                    object.textColorMode =
                        radio.value;

                    renderObjects();
                }
            });
        });


    menu.querySelectorAll(".object-menu-position-btn")
        .forEach(posBtn => {

            posBtn.addEventListener("click", () => {

                object.textPosition =
                    Number(posBtn.dataset.position);

                renderObjects();

                menu.querySelectorAll(".object-menu-position-btn")
                    .forEach(b => b.classList.remove("active"));

                posBtn.classList.add("active");
            });
        });


    const lineColorInput =
        menu.querySelector("#objMenuVLineColorInput");

    if (lineColorInput) {

        lineColorInput.addEventListener("input", () => {

            object.lineColor =
                lineColorInput.value;

            renderObjects();
        });
    }


    menu.querySelectorAll("#objMenuVLineColorSwatches .object-menu-vline-swatch")
        .forEach(swatchBtn => {

            swatchBtn.addEventListener("click", () => {

                object.lineColor =
                    swatchBtn.dataset.color;

                if (lineColorInput) {
                    lineColorInput.value =
                        object.lineColor;
                }

                menu.querySelectorAll("#objMenuVLineColorSwatches .object-menu-vline-swatch")
                    .forEach(btn => {
                        btn.classList.toggle(
                            "active",
                            btn === swatchBtn
                        );
                    });

                renderObjects();
            });
        });


    const thicknessMinusBtn =
        menu.querySelector("#objMenuLineThicknessMinus");

    const thicknessPlusBtn =
        menu.querySelector("#objMenuLineThicknessPlus");

    if (thicknessMinusBtn && thicknessPlusBtn) {

        const thicknessValueEl =
            menu.querySelector("#objMenuLineThicknessValue");

        thicknessMinusBtn.addEventListener("click", () => {

            object.lineThickness =
                Math.max(1, (object.lineThickness || 1) - 1);

            thicknessValueEl.textContent =
                String(object.lineThickness);

            renderObjects();
        });

        thicknessPlusBtn.addEventListener("click", () => {

            object.lineThickness =
                Math.min(8, (object.lineThickness || 1) + 1);

            thicknessValueEl.textContent =
                String(object.lineThickness);

            renderObjects();
        });
    }

    menu.querySelector("#objMenuDuplicateBtn")
        .addEventListener("click", () => {

            duplicateTimelineObject(object.id);

            closeObjectMenu();
        });


    menu.querySelector("#objMenuDeleteBtn")
        .addEventListener("click", () => {

            deleteTimelineObject(object.id);

            closeObjectMenu();
        });


    document.body.appendChild(
        menu
    );


    activeObjectMenu =
        menu;


    positionFloatingMenu(
        menu,
        anchorElement
    );
}


function closeObjectMenu() {

    if (
        activeObjectMenu &&
        activeObjectMenu.parentNode
    ) {

        activeObjectMenu.parentNode.removeChild(
            activeObjectMenu
        );
    }


    activeObjectMenu =
        null;
}


/* =========================================================
   ADD OBJECT BUTTONS
========================================================= */

addTaskBtn.addEventListener(
    "click",
    () => {

        if (!selectedRowContext) {

            return;
        }


        timelineObjects.push(
            createTimelineObject("task")
        );


        renderObjects();
    }
);


addHLineBtn.addEventListener(
    "click",
    () => {

        timelineObjects.push(
            createTimelineObject("hline")
        );


        renderObjects();
    }
);


addDateLineBtn.addEventListener(
    "click",
    () => {

        const object =
            createTimelineObject("dateline");


        /* วันที่ตรงกลางของส่วนตารางที่มองเห็นอยู่ตอนนี้ */

        const centerPx =
            timelineViewport.scrollLeft +
            timelineViewport.clientWidth / 2;

        const dayOffset =
            clamp(
                Math.round(centerPx / pxPerDay),
                0,
                timelineTotalDays
            );

        object.linkedHeaderDate =
            addDays(
                timelineStartDate,
                dayOffset
            );


        timelineObjects.push(
            object
        );


        renderObjects();
    }
);


/* =========================================================
   ROLE MANAGER
========================================================= */

function renderRoleManagerList() {

    roleManagerList.innerHTML =
        "";


    objectRoles.forEach(
        role => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "role-manager-item";


            const colorInput =
                document.createElement(
                    "input"
                );


            colorInput.type =
                "color";


            colorInput.value =
                role.color;


            colorInput.addEventListener(
                "input",
                () => {

                    role.color =
                        colorInput.value;


                    renderObjects();
                }
            );


            row.appendChild(
                colorInput
            );


            const nameInput =
                document.createElement(
                    "input"
                );


            nameInput.type =
                "text";


            nameInput.className =
                "role-manager-name-input";


            nameInput.value =
                role.name;


            nameInput.addEventListener(
                "input",
                () => {

                    role.name =
                        nameInput.value;


                    renderObjects();
                }
            );


            row.appendChild(
                nameInput
            );


            const deleteButton =
                document.createElement(
                    "button"
                );


            deleteButton.type =
                "button";


            deleteButton.className =
                "role-manager-delete-btn";


            deleteButton.textContent =
                "ลบ";


            if (
                objectRoles.length <= 1
            ) {

                deleteButton.disabled =
                    true;
            }


            deleteButton.addEventListener(
                "click",
                () => {

                    if (
                        objectRoles.length <= 1
                    ) {

                        return;
                    }


                    const index =
                        objectRoles.findIndex(
                            item =>
                                item.id ===
                                role.id
                        );


                    if (index < 0) {

                        return;
                    }


                    const fallbackRole =
                        objectRoles.find(
                            item =>
                                item.id !==
                                role.id
                        );


                    timelineObjects.forEach(
                        object => {

                            if (
                                object.roleId ===
                                role.id
                            ) {

                                object.roleId =
                                    fallbackRole.id;
                            }
                        }
                    );


                    objectRoles.splice(
                        index,
                        1
                    );


                    renderRoleManagerList();

                    renderObjects();
                }
            );


            row.appendChild(
                deleteButton
            );


            roleManagerList.appendChild(
                row
            );
        }
    );
}


function openRoleManager() {

    renderRoleManagerList();


    roleManagerPanel.classList.add(
        "open"
    );
}


function closeRoleManager() {

    roleManagerPanel.classList.remove(
        "open"
    );
}


manageRolesBtn.addEventListener(
    "click",
    () => {

        openRoleManager();
    }
);


closeRoleManagerBtn.addEventListener(
    "click",
    () => {

        closeRoleManager();
    }
);


addRoleBtn.addEventListener(
    "click",
    () => {

        objectRoles.push({

            id:
                createRoleId(),

            name:
                "บทบาทใหม่",

            color:
                DEFAULT_ROLE_COLORS[
                    objectRoles.length %
                    DEFAULT_ROLE_COLORS.length
                ]
        });


        renderRoleManagerList();
    }
);


/* =========================================================
   VERTICAL POSITION
========================================================= */

function updateVerticalPosition() {

    const transform =
        `translateY(${-verticalScrollY}px)`;


    categorySidebar.style.transform =
        transform;


    partySidebar.style.transform =
        transform;


    timelineContent.style.transform =
        transform;


    syncObjectLayerTransform();
}


/* =========================================================
   VERTICAL SCROLLBAR
========================================================= */

function updateScrollbar() {

    const hasOverflow =
        categories.length >
        VISIBLE_CATEGORY_COUNT;


    categoryScrollbar.classList.toggle(
        "visible",
        hasOverflow
    );


    if (!hasOverflow) {

        categoryScrollRange.min =
            "0";


        categoryScrollRange.max =
            "0";


        categoryScrollRange.value =
            "0";


        return;
    }


    categoryScrollRange.min =
        "0";


    categoryScrollRange.max =
        String(
            Math.round(
                maxVerticalScroll
            )
        );


    categoryScrollRange.value =
        String(
            Math.round(
                verticalScrollY
            )
        );
}


function setVerticalScroll(
    value
) {

    verticalScrollY =
        clamp(
            value,
            0,
            maxVerticalScroll
        );


    updateVerticalPosition();


    categoryScrollRange.value =
        String(
            Math.round(
                verticalScrollY
            )
        );
}


/* =========================================================
   CATEGORY SCROLL RANGE
========================================================= */

categoryScrollRange.addEventListener(
    "input",
    event => {

        setVerticalScroll(
            Number(
                event.target.value
            )
        );
    }
);


/* =========================================================
   MOUSE WHEEL
   เฉพาะเมื่อ cursor อยู่ในตาราง
========================================================= */

scheduleArea.addEventListener(
    "wheel",
    event => {

        if (
            maxVerticalScroll <= 0
        ) {

            return;
        }


        const delta =
            event.deltaY;


        if (
            Math.abs(delta) <
            0.01
        ) {

            return;
        }


        event.preventDefault();


        setVerticalScroll(
            verticalScrollY +
            delta
        );
    },
    {
        passive: false
    }
);


/* =========================================================
   ADD CATEGORY
========================================================= */

/* =========================================================
   ADD CATEGORY — หน้าต่างตั้งชื่อ + เลือกสี + ปุ่มตกลง
========================================================= */

const newCategoryStyle =
    document.createElement("style");

newCategoryStyle.textContent = `
.new-category-dialog {
    position: fixed;
    width: 250px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #ffffff;
    border: 1px solid #d5dad7;
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, .16);
    z-index: 26000;
    font-size: 12px;
}
.new-category-dialog .ncd-title { font-weight: 700; font-size: 13px; }
.new-category-dialog .ncd-label { color: #7a827e; font-size: 10px; }
.new-category-dialog input[type="text"] {
    width: 100%; height: 30px; padding: 0 8px;
    border: 1px solid #dde3e0; border-radius: 6px;
    font-family: inherit; font-size: 12px;
}
.new-category-dialog .ncd-swatches {
    display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px;
}
.new-category-dialog .ncd-swatch {
    width: 100%; aspect-ratio: 1; padding: 0; cursor: pointer;
    border-radius: 4px; border: 1px solid rgba(0, 0, 0, .12);
}
.new-category-dialog .ncd-swatch.active { box-shadow: 0 0 0 2px #333 inset; }
.new-category-dialog input[type="color"] {
    width: 100%; height: 26px; padding: 2px;
    border: 1px solid #dde3e0; border-radius: 6px; cursor: pointer;
}
.new-category-dialog .ncd-actions { display: flex; gap: 8px; margin-top: 4px; }
.new-category-dialog .ncd-actions button {
    flex: 1; height: 30px; border-radius: 6px; cursor: pointer;
    font-family: inherit; font-size: 12px;
    border: 1px solid #dde3e0; background: #ffffff;
}
.new-category-dialog .ncd-actions .ncd-ok {
    background: #3a8a4f; border-color: #3a8a4f; color: #ffffff; font-weight: 700;
}
`;

document.head.appendChild(
    newCategoryStyle
);


let newCategoryDialog =
    null;


function closeNewCategoryDialog() {

    if (
        newCategoryDialog &&
        newCategoryDialog.parentNode
    ) {

        newCategoryDialog.parentNode.removeChild(
            newCategoryDialog
        );
    }

    newCategoryDialog =
        null;
}


function openNewCategoryDialog() {

    closeNewCategoryDialog();


    let chosenColor =
        "#d9dcde";


    const dialog =
        document.createElement("div");

    dialog.className =
        "new-category-dialog";

    dialog.innerHTML = `
        <div class="ncd-title">เพิ่มหมวดหมู่</div>

        <div>
            <div class="ncd-label">ชื่อหมวดหมู่</div>
            <input type="text" id="ncdName" value="${DEFAULT_CATEGORY_NAME}" maxlength="60">
        </div>

        <div>
            <div class="ncd-label">สี</div>
            <div class="ncd-swatches" id="ncdSwatches">
                ${OBJECT_COLOR_PRESETS.map(color => `
                    <button type="button" class="ncd-swatch" data-color="${color}" style="background:${color}"></button>
                `).join("")}
            </div>
            <input type="color" id="ncdColor" value="${chosenColor}" style="margin-top:4px">
        </div>

        <div class="ncd-actions">
            <button type="button" id="ncdCancel">ยกเลิก</button>
            <button type="button" class="ncd-ok" id="ncdOk">ตกลง</button>
        </div>
    `;


    const nameInput =
        dialog.querySelector("#ncdName");

    const colorInput =
        dialog.querySelector("#ncdColor");

    const swatchButtons =
        dialog.querySelectorAll(".ncd-swatch");


    function setColor(
        color
    ) {

        chosenColor =
            color;

        colorInput.value =
            color;

        swatchButtons.forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.color.toLowerCase() ===
                    color.toLowerCase()
                );
            }
        );
    }


    swatchButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => setColor(button.dataset.color)
            );
        }
    );


    colorInput.addEventListener(
        "input",
        () => setColor(colorInput.value)
    );


    function confirmAdd() {

        const name =
            nameInput.value.trim() ||
            DEFAULT_CATEGORY_NAME;

        const category =
            createDefaultCategory(
                chosenColor
            );

        category.name =
            name;

        categories.push(
            category
        );

        closeNewCategoryDialog();

        renderSchedule();

        /*
            หมวดใหม่อยู่ด้านล่างสุด
            เลื่อนไปให้เห็นอัตโนมัติ
        */

        setVerticalScroll(
            maxVerticalScroll
        );
    }


    dialog.querySelector("#ncdOk")
        .addEventListener("click", confirmAdd);

    dialog.querySelector("#ncdCancel")
        .addEventListener("click", closeNewCategoryDialog);


    dialog.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                confirmAdd();
            }

            if (event.key === "Escape") {

                closeNewCategoryDialog();
            }
        }
    );


    document.body.appendChild(
        dialog
    );

    newCategoryDialog =
        dialog;


    setColor(
        chosenColor
    );


    /* วางหน้าต่างใต้ปุ่ม (ชิดซ้ายของปุ่ม) */

    const rect =
        addCategoryBtn.getBoundingClientRect();

    dialog.style.left =
        `${Math.min(
            rect.left,
            window.innerWidth - dialog.offsetWidth - 6
        )}px`;

    dialog.style.top =
        `${rect.bottom + 6}px`;


    nameInput.focus();

    nameInput.select();
}


/* คลิกนอกหน้าต่าง = ปิด (ไม่เพิ่มหมวด) */

document.addEventListener(
    "mousedown",
    event => {

        if (
            newCategoryDialog &&
            !newCategoryDialog.contains(event.target) &&
            !event.target.closest("#addCategoryBtn")
        ) {

            closeNewCategoryDialog();
        }
    }
);


addCategoryBtn.addEventListener(
    "click",
    () => {

        closeCategoryMenu();

        closeRowMenu();

        closeToolbarMoreMenu();


        if (newCategoryDialog) {

            closeNewCategoryDialog();

        } else {

            openNewCategoryDialog();
        }
    }
);


/* =========================================================
   CATEGORY MENU
========================================================= */

function openCategoryMenu(
    event,
    categoryId,
    button
) {

    closeRowMenu();

    closeToolbarMoreMenu();

    closeObjectMenu();


    selectedCategoryId =
        categoryId;


    const category =
        findCategory(
            categoryId
        );


    if (!category) {

        return;
    }


    categoryColorPicker.value =
        category.color;


    categoryMenu.classList.add(
        "open"
    );


    positionFloatingMenu(
        categoryMenu,
        button
    );
}


function closeCategoryMenu() {

    categoryMenu.classList.remove(
        "open"
    );


    selectedCategoryId =
        null;
}


/* =========================================================
   CATEGORY COLOR
========================================================= */

categoryColorPicker.addEventListener(
    "input",
    event => {

        if (!selectedCategoryId) {

            return;
        }


        const category =
            findCategory(
                selectedCategoryId
            );


        if (!category) {

            return;
        }


        category.color =
            event.target.value;


        const element =
            categorySidebar.querySelector(
                `[data-category-id="${selectedCategoryId}"]`
            );


        if (element) {

            element.style.backgroundColor =
                category.color;
        }
    }
);


/* =========================================================
   DELETE CATEGORY
========================================================= */

deleteCategoryBtn.addEventListener(
    "click",
    () => {

        if (!selectedCategoryId) {

            return;
        }


        if (
            categories.length <= 1
        ) {

            return;
        }


        const index =
            findCategoryIndex(
                selectedCategoryId
            );


        if (index < 0) {

            return;
        }


        categories.splice(
            index,
            1
        );


        /*
            ★ ไม่ต้องกรอง timelineObjects อีกแล้ว
            เพราะ Unified Canvas Model ไม่ผูก
            object กับ category/row ถาวร (ข้อ 2)
        */

        if (
            selectedRowContext &&
            selectedRowContext.categoryId ===
            selectedCategoryId
        ) {

            selectedRowContext =
                null;
        }


        closeCategoryMenu();


        renderSchedule();
    }
);


/* =========================================================
   ROW MENU
========================================================= */

function openRowMenu(
    event,
    categoryId,
    rowId,
    button
) {

    closeCategoryMenu();

    closeRowMenu();

    closeToolbarMoreMenu();

    closeObjectMenu();


    const category =
        findCategory(
            categoryId
        );


    if (!category) {

        return;
    }


    const row =
        findRow(
            category,
            rowId
        );


    if (!row) {

        return;
    }


    const menu =
        document.createElement(
            "div"
        );


    menu.className =
        "row-action-menu";


    /*
        เพิ่มแถว
    */

    const addButton =
        document.createElement(
            "button"
        );


    addButton.type =
        "button";


    addButton.className =
        "row-action-item";


    addButton.textContent =
        "＋ เพิ่มแถว";


    addButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            addRowAfter(
                categoryId,
                rowId
            );


            closeRowMenu();
        }
    );


    menu.appendChild(
        addButton
    );


    /*
        ลบแถว
    */

    const deleteButton =
        document.createElement(
            "button"
        );


    deleteButton.type =
        "button";


    deleteButton.className =
        "row-action-item row-delete-item";


    deleteButton.textContent =
        "ลบแถว";


    if (
        category.rows.length <= 1
    ) {

        deleteButton.disabled =
            true;
    }


    deleteButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            deleteRow(
                categoryId,
                rowId
            );


            closeRowMenu();
        }
    );


    menu.appendChild(
        deleteButton
    );


    document.body.appendChild(
        menu
    );


    activeRowMenu =
        menu;


    positionFloatingMenu(
        menu,
        button
    );
}


/* =========================================================
   ADD ROW
========================================================= */

function addRowAfter(
    categoryId,
    rowId
) {

    const category =
        findCategory(
            categoryId
        );


    if (!category) {

        return;
    }


    const rowIndex =
        category.rows.findIndex(
            row =>
                row.id ===
                rowId
        );


    const insertIndex =
        rowIndex >= 0
            ? rowIndex + 1
            : category.rows.length;


    const newRow =
        createDefaultRow(
            insertIndex
        );


    category.rows.splice(
        insertIndex,
        0,
        newRow
    );


    /*
        สลับสีข้อความตามลำดับ
    */

    category.rows.forEach(
        (
            row,
            index
        ) => {

            row.type =
                index % 2 === 0
                    ? "seller"
                    : "buyer";
        }
    );


    renderSchedule();
}


/* =========================================================
   DELETE ROW
========================================================= */

function deleteRow(
    categoryId,
    rowId
) {

    const category =
        findCategory(
            categoryId
        );


    if (!category) {

        return;
    }


    if (
        category.rows.length <= 1
    ) {

        return;
    }


    const rowIndex =
        category.rows.findIndex(
            row =>
                row.id ===
                rowId
        );


    if (
        rowIndex < 0
    ) {

        return;
    }


    category.rows.splice(
        rowIndex,
        1
    );


    category.rows.forEach(
        (
            row,
            index
        ) => {

            row.type =
                index % 2 === 0
                    ? "seller"
                    : "buyer";
        }
    );


    /*
        ★ ไม่ต้องกรอง timelineObjects อีกแล้ว
        (เหตุผลเดียวกับ deleteCategory ด้านบน)
    */

    if (
        selectedRowContext &&
        selectedRowContext.rowId ===
        rowId
    ) {

        selectedRowContext =
            null;
    }


    renderSchedule();
}


/* =========================================================
   CLOSE ROW MENU
========================================================= */

function closeRowMenu() {

    if (
        activeRowMenu &&
        activeRowMenu.parentNode
    ) {

        activeRowMenu.parentNode.removeChild(
            activeRowMenu
        );
    }


    activeRowMenu =
        null;
}


/* =========================================================
   TOOLBAR MORE MENU
========================================================= */

function openToolbarMoreMenu() {

    closeCategoryMenu();

    closeRowMenu();

    closeObjectMenu();


    toolbarMoreMenu.classList.add(
        "open"
    );


    positionFloatingMenu(
        toolbarMoreMenu,
        toolbarMoreBtn
    );
}


function closeToolbarMoreMenu() {

    toolbarMoreMenu.classList.remove(
        "open"
    );
}


toolbarMoreBtn.addEventListener(
    "click",
    event => {

        event.preventDefault();

        event.stopPropagation();


        if (
            toolbarMoreMenu.classList.contains(
                "open"
            )
        ) {

            closeToolbarMoreMenu();

        } else {

            openToolbarMoreMenu();
        }
    }
);


/* =========================================================
   TOOLBAR MORE MENU — ACTIONS (ข้อ 9)
========================================================= */

const toolbarSpellcheckBtn =
    document.getElementById("toolbarSpellcheckBtn");

const toolbarExportImageBtn =
    document.getElementById("toolbarExportImageBtn");

const toolbarExportTableBtn =
    document.getElementById("toolbarExportTableBtn");


let spellcheckEnabled =
    false;


if (toolbarSpellcheckBtn) {

    toolbarSpellcheckBtn.addEventListener(
        "click",
        () => {

            spellcheckEnabled =
                !spellcheckEnabled;

            document
                .querySelectorAll(
                    "[contenteditable='true']"
                )
                .forEach(
                    element => {

                        element.spellcheck =
                            spellcheckEnabled;
                    }
                );

            toolbarSpellcheckBtn.classList.toggle(
                "active",
                spellcheckEnabled
            );

            closeToolbarMoreMenu();
        }
    );
}


if (toolbarExportImageBtn) {

    toolbarExportImageBtn.addEventListener(
        "click",
        () => {

            closeToolbarMoreMenu();

            document.body.classList.remove(
                "print-table-only"
            );

            window.print();
        }
    );
}


if (toolbarExportTableBtn) {

    toolbarExportTableBtn.addEventListener(
        "click",
        () => {

            closeToolbarMoreMenu();

            document.body.classList.add(
                "print-table-only"
            );

            window.print();
        }
    );
}


window.addEventListener(
    "afterprint",
    () => {

        document.body.classList.remove(
            "print-table-only"
        );
    }
);


/* =========================================================
   FLOATING MENU POSITION
========================================================= */

function positionFloatingMenu(
    menu,
    button
) {

    const rect =
        button.getBoundingClientRect();


    const margin =
        6;


    let left =
        rect.right -
        menu.offsetWidth;


    let top =
        rect.bottom +
        margin;


    if (
        left <
        margin
    ) {

        left =
            margin;
    }


    if (
        left +
        menu.offsetWidth >
        window.innerWidth -
        margin
    ) {

        left =
            window.innerWidth -
            menu.offsetWidth -
            margin;
    }


    if (
        top +
        menu.offsetHeight >
        window.innerHeight -
        margin
    ) {

        top =
            rect.top -
            menu.offsetHeight -
            margin;
    }


    menu.style.left =
        `${left}px`;


    menu.style.top =
        `${top}px`;
}


/* =========================================================
   GLOBAL MENU CLOSE
========================================================= */

document.addEventListener(
    "mousedown",
    event => {

        if (
            categoryMenu.classList.contains(
                "open"
            ) &&
            !categoryMenu.contains(
                event.target
            ) &&
            !event.target.closest(
                ".category-more-btn"
            )
        ) {

            closeCategoryMenu();
        }


        if (
            activeRowMenu &&
            !activeRowMenu.contains(
                event.target
            ) &&
            !event.target.closest(
                ".row-more-btn"
            )
        ) {

            closeRowMenu();
        }


        if (
            toolbarMoreMenu.classList.contains(
                "open"
            ) &&
            !toolbarMoreMenu.contains(
                event.target
            ) &&
            !event.target.closest(
                "#toolbarMoreBtn"
            )
        ) {

            closeToolbarMoreMenu();
        }


        if (
            activeObjectMenu &&
            !activeObjectMenu.contains(
                event.target
            ) &&
            !event.target.closest(
                ".canvas-object"
            )
        ) {

            closeObjectMenu();
        }
    }
);


/* =========================================================
   TIMELINE MAX SCROLL
========================================================= */

function getTimelineMaxScroll() {

    return getElementMaxScroll(
        timelineViewport
    );
}


/* =========================================================
   UPDATE TIMELINE RANGE
========================================================= */

function updateTimelineHorizontalRange() {

    const maxScroll =
        getTimelineMaxScroll();


    timelineHorizontalRange.min =
        "0";


    timelineHorizontalRange.max =
        String(
            Math.round(
                maxScroll
            )
        );


    timelineHorizontalRange.value =
        String(
            Math.round(
                timelineViewport.scrollLeft
            )
        );


    timelineHorizontalRange.disabled =
        maxScroll <= 0;
}


/* =========================================================
   TIMELINE RANGE
========================================================= */

timelineHorizontalRange.addEventListener(
    "input",
    event => {

        timelineViewport.scrollLeft =
            Number(
                event.target.value
            );


        syncTimelineHeaderScroll();
    }
);


/* =========================================================
   TIMELINE BUTTONS
========================================================= */

scrollTimelineLeft.addEventListener(
    "click",
    () => {

        timelineViewport.scrollBy({

            left:
                -TIMELINE_SCROLL_STEP,

            behavior:
                "smooth"
        });
    }
);


scrollTimelineRight.addEventListener(
    "click",
    () => {

        timelineViewport.scrollBy({

            left:
                TIMELINE_SCROLL_STEP,

            behavior:
                "smooth"
        });
    }
);


/* =========================================================
   TIMELINE SCROLL EVENT
========================================================= */

timelineViewport.addEventListener(
    "scroll",
    () => {

        timelineHorizontalRange.value =
            String(
                Math.round(
                    timelineViewport.scrollLeft
                )
            );


        syncTimelineHeaderScroll();
    }
);

/* =========================================================
   DATE INPUT SYNC
========================================================= */

function syncDateInputs() {

    timelineStartInput.value =
        formatDateInputValue(
            timelineStartDate
        );


    timelineEndInput.value =
        formatDateInputValue(
            timelineEndDate
        );
}


timelineStartInput.addEventListener(
    "change",
    event => {

        const candidate =
            parseDateInputValue(
                event.target.value
            );


        if (
            !isNaN(candidate) &&
            daysBetween(
                candidate,
                timelineEndDate
            ) >= MIN_RANGE_DAYS
        ) {

            timelineStartDate =
                candidate;


            renderSchedule();

        } else {

            syncDateInputs();
        }
    }
);


timelineEndInput.addEventListener(
    "change",
    event => {

        const candidate =
            parseDateInputValue(
                event.target.value
            );


        if (
            !isNaN(candidate) &&
            daysBetween(
                timelineStartDate,
                candidate
            ) >= MIN_RANGE_DAYS
        ) {

            timelineEndDate =
                candidate;


            renderSchedule();

        } else {

            syncDateInputs();
        }
    }
);


/* =========================================================
   MONTH ADJUST BUTTONS
========================================================= */

extendStartBtn.addEventListener(
    "click",
    () => {

        timelineStartDate =
            addMonths(
                timelineStartDate,
                -1
            );


        syncDateInputs();

        renderSchedule();
    }
);


shrinkStartBtn.addEventListener(
    "click",
    () => {

        const candidate =
            addMonths(
                timelineStartDate,
                1
            );


        if (
            daysBetween(
                candidate,
                timelineEndDate
            ) >= MIN_RANGE_DAYS
        ) {

            timelineStartDate =
                candidate;


            syncDateInputs();

            renderSchedule();
        }
    }
);


shrinkEndBtn.addEventListener(
    "click",
    () => {

        const candidate =
            addMonths(
                timelineEndDate,
                -1
            );


        if (
            daysBetween(
                timelineStartDate,
                candidate
            ) >= MIN_RANGE_DAYS
        ) {

            timelineEndDate =
                candidate;


            syncDateInputs();

            renderSchedule();
        }
    }
);


extendEndBtn.addEventListener(
    "click",
    () => {

        timelineEndDate =
            addMonths(
                timelineEndDate,
                1
            );


        syncDateInputs();

        renderSchedule();
    }
);


/* =========================================================
   ZOOM
========================================================= */

function updateZoomDisplay() {

    zoomText.textContent =
        `${Math.round(zoomScale * 100)}%`;
}


function setZoomScale(
    value
) {

    zoomScale =
        clamp(
            value,
            ZOOM_MIN,
            ZOOM_MAX
        );


    updateZoomDisplay();

    renderSchedule();
}


zoomOutBtn.addEventListener(
    "click",
    () => {

        setZoomScale(
            zoomScale -
            ZOOM_STEP
        );
    }
);


zoomInBtn.addEventListener(
    "click",
    () => {

        setZoomScale(
            zoomScale +
            ZOOM_STEP
        );
    }
);


/* =========================================================
   NOTES
========================================================= */

function createNote() {

    return {

        id:
            createNoteId(),

        header:
            "Header",

        body:
            DEFAULT_ROW_TEXT
    };
}


function renderNotes() {

    notesTrack.innerHTML =
        "";


    boardNotes.forEach(
        note => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "note-card";


            card.dataset.noteId =
                note.id;


            /* HEADER */

            const header =
                document.createElement(
                    "div"
                );


            header.className =
                "note-header";


            header.contentEditable =
                "true";


            header.spellcheck =
                false;


            header.textContent =
                note.header;


            header.addEventListener(
                "input",
                () => {

                    note.header =
                        header.textContent;
                }
            );


            /* BODY */

            const body =
                document.createElement(
                    "div"
                );


            body.className =
                "note-body";


            body.contentEditable =
                "true";


            body.spellcheck =
                false;


            body.textContent =
                note.body;


            body.addEventListener(
                "input",
                () => {

                    note.body =
                        body.textContent;
                }
            );


            /* DELETE */

            const deleteButton =
                document.createElement(
                    "button"
                );


            deleteButton.type =
                "button";


            deleteButton.className =
                "note-delete-btn";


            deleteButton.textContent =
                "ลบ";


            deleteButton.title =
                "ลบบันทึก";


            deleteButton.addEventListener(
                "click",
                () => {

                    deleteNote(
                        note.id
                    );
                }
            );


            card.appendChild(
                header
            );


            card.appendChild(
                body
            );


            card.appendChild(
                deleteButton
            );


            notesTrack.appendChild(
                card
            );
        }
    );


    requestAnimationFrame(
        updateNotesHorizontalRange
    );
}


/* =========================================================
   ADD NOTE
========================================================= */

addNoteBtn.addEventListener(
    "click",
    () => {

        boardNotes.push(
            createNote()
        );


        renderNotes();


        requestAnimationFrame(
            () => {

                notesViewport.scrollLeft =
                    getElementMaxScroll(
                        notesViewport
                    );


                updateNotesHorizontalRange();
            }
        );
    }
);


/* =========================================================
   DELETE NOTE
========================================================= */

function deleteNote(
    noteId
) {

    const index =
        boardNotes.findIndex(
            note =>
                note.id ===
                noteId
        );


    if (
        index < 0
    ) {

        return;
    }


    boardNotes.splice(
        index,
        1
    );


    renderNotes();
}


/* =========================================================
   NOTES RANGE
========================================================= */

function updateNotesHorizontalRange() {

    const maxScroll =
        getElementMaxScroll(
            notesViewport
        );


    notesHorizontalRange.min =
        "0";


    notesHorizontalRange.max =
        String(
            Math.round(
                maxScroll
            )
        );


    notesHorizontalRange.value =
        String(
            Math.round(
                notesViewport.scrollLeft
            )
        );


    notesHorizontalRange.disabled =
        maxScroll <= 0;
}


notesHorizontalRange.addEventListener(
    "input",
    event => {

        notesViewport.scrollLeft =
            Number(
                event.target.value
            );
    }
);


notesViewport.addEventListener(
    "scroll",
    () => {

        notesHorizontalRange.value =
            String(
                Math.round(
                    notesViewport.scrollLeft
                )
            );
    }
);


/* =========================================================
   DRAG SCROLL
========================================================= */

function enableDragScroll(
    element,
    onMove = null
) {

    let dragging =
        false;


    let startX =
        0;


    let startScrollLeft =
        0;


    element.addEventListener(
        "mousedown",
        event => {

            /*
                ไม่ลากเมื่อคลิก element
                ที่ใช้พิมพ์, ปุ่ม
                หรือ object บนตาราง
            */

            if (
                event.target.closest(
                    "button"
                ) ||
                event.target.closest(
                    "input"
                ) ||
                event.target.closest(
                    "[contenteditable='true']"
                ) ||
                event.target.closest(
                    ".canvas-object"
                )
            ) {

                return;
            }


            dragging =
                true;


            startX =
                event.clientX;


            startScrollLeft =
                element.scrollLeft;


            element.classList.add(
                "dragging"
            );


            event.preventDefault();
        }
    );


    window.addEventListener(
        "mousemove",
        event => {

            if (!dragging) {

                return;
            }


            const delta =
                event.clientX -
                startX;


            element.scrollLeft =
                startScrollLeft -
                delta;


            if (
                typeof onMove ===
                "function"
            ) {

                onMove();
            }
        }
    );


    window.addEventListener(
        "mouseup",
        () => {

            if (!dragging) {

                return;
            }


            dragging =
                false;


            element.classList.remove(
                "dragging"
            );
        }
    );
}


/* =========================================================
   ENABLE DRAG
========================================================= */

enableDragScroll(
    timelineViewport,
    () => {

        updateTimelineHorizontalRange();

        syncTimelineHeaderScroll();
    }
);


enableDragScroll(
    bracketViewport
);


/*
    ซิงค์ scroll แนวนอนของ timelineViewport
    กับ bracketViewport (เส้นวันที่) ทั้งสองทาง
    (ข้อ 2 — dateline ต้องเลื่อนตามตารางเสมอ)
*/

timelineViewport.addEventListener(
    "scroll",
    syncTimelineHeaderScroll
);


bracketViewport.addEventListener(
    "scroll",
    () => {

        if (isSyncingHorizontalScroll) {

            return;
        }

        if (
            bracketViewport.scrollLeft ===
            timelineViewport.scrollLeft
        ) {

            return;
        }

        isSyncingHorizontalScroll =
            true;

        timelineViewport.scrollLeft =
            bracketViewport.scrollLeft;

        isSyncingHorizontalScroll =
            false;

        syncTimelineHeaderScroll();
    }
);


enableDragScroll(
    notesViewport,
    updateNotesHorizontalRange
);


/* =========================================================
   FOOTER AUTO HIDE
========================================================= */

let footerHideTimer =
    null;


function showCompanyFooter() {

    clearTimeout(
        footerHideTimer
    );


    companyFooter.classList.add(
        "visible"
    );
}


function hideCompanyFooter(
    delay = 350
) {

    clearTimeout(
        footerHideTimer
    );


    footerHideTimer =
        setTimeout(
            () => {

                companyFooter.classList.remove(
                    "visible"
                );
            },
            delay
        );
}


bottomHotZone.addEventListener(
    "mouseenter",
    showCompanyFooter
);


companyFooter.addEventListener(
    "mouseenter",
    showCompanyFooter
);


companyFooter.addEventListener(
    "mouseleave",
    () => {

        hideCompanyFooter(
            300
        );
    }
);


bottomHotZone.addEventListener(
    "mouseleave",
    () => {

        /*
            ให้เวลาผู้ใช้เลื่อน cursor
            จาก hot-zone เข้า footer
        */

        hideCompanyFooter(
            450
        );
    }
);


/* =========================================================
   UPDATE ALL HORIZONTAL RANGES
========================================================= */

function updateAllHorizontalRanges() {

    updateTimelineHorizontalRange();
    updateNotesHorizontalRange();

    syncTimelineHeaderScroll();
}


/* =========================================================
   RESIZE
========================================================= */

let resizeFrame =
    null;


window.addEventListener(
    "resize",
    () => {

        if (resizeFrame) {

            cancelAnimationFrame(
                resizeFrame
            );
        }


        resizeFrame =
            requestAnimationFrame(
                () => {

                    renderSchedule();

                    updateAllHorizontalRanges();

                    resizeFrame =
                        null;
                }
            );
    }
);


/* =========================================================
   PREVENT ENTER FROM CREATING EXTRA DIVS
   IN SINGLE-LINE EDITABLE AREAS
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Enter"
        ) {

            return;
        }


        const target =
            event.target;


        if (
            target.classList.contains(
                "category-name"
            ) ||
            target.classList.contains(
                "party-main"
            ) ||
            target.classList.contains(
                "party-role"
            ) ||
            target.classList.contains(
                "note-header"
            )
        ) {

            event.preventDefault();

            target.blur();
        }
    }
);


/* =========================================================
   ESCAPE
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;
        }


        closeCategoryMenu();

        closeRowMenu();

        closeToolbarMoreMenu();

        closeObjectMenu();

        closeRoleManager();
    }
);


/* =========================================================
   INITIALIZE
========================================================= */

function initialize() {

    boardNotes = [
        createNote()
    ];


    renderNotes();

    syncDateInputs();

    updateZoomDisplay();


    requestAnimationFrame(
        () => {

            requestAnimationFrame(
                () => {

                    renderSchedule();


                    updateAllHorizontalRanges();


                    companyFooter.classList.remove(
                        "visible"
                    );
                }
            );
        }
    );
}


initialize();