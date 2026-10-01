"use strict";

/* =========================================================
   LINE.JS — เชื่อมปลายเส้นแนวนอน (hline) เข้ากับยอดสามเหลี่ยม
   ของกล่องเส้นวันที่ (dateline)

   ต้องโหลดก่อน app.js
   อ้างตัวแปร/ฟังก์ชันของ app.js ตอนถูกเรียกใช้เท่านั้น:
     timelineObjects, timelineStartDate, dateToLeft

   ข้อมูลที่ hline เก็บเพิ่ม:
     anchorStartId  id ของ dateline ที่ปลายซ้ายเกาะอยู่ (null = ไม่เชื่อม)
     anchorEndId    id ของ dateline ที่ปลายขวาเกาะอยู่ (null = ไม่เชื่อม)
========================================================= */

/* ยอดสามเหลี่ยมอยู่สูงกว่าขอบบนของกล่องประมาณ 6px */
const CARET_TIP_OFFSET = 6;

/* ปล่อยปลายเส้นห่างจากยอดในแนวนอนไม่เกินนี้ → ดูดติด */
const SNAP_DISTANCE_X = 30;

/* ห่างในแนวตั้งไม่เกินนี้ → ดูดติด (เผื่อไว้มาก เพราะลากปลายเส้นเปลี่ยนแค่แกน X
   ส่วนแกน Y เส้นจะถูกดึงไปหายอดเองหลังดูดติด) */
const SNAP_DISTANCE_Y = 400;

/* ตำแหน่ง y ต่ำสุดของ dateline เพื่อให้ยอด/เส้นไม่ถูกตัดที่ขอบบน */
const DATELINE_MIN_Y = 21;

/* เส้น hline คือ border-top 2px ที่ขอบบนของ element → กึ่งกลางเส้นอยู่ที่ y + 1 */
const HLINE_CENTER_OFFSET = 1;


function findAnchorDateline(id) {

    return id
        ? timelineObjects.find(
            item =>
                item.id === id &&
                item.type === "dateline"
        ) || null
        : null;
}


function datelineTipX(dateline) {

    return dateToLeft(
        dateline.linkedHeaderDate ||
        timelineStartDate
    );
}


/* =========================================================
   คำนวณตำแหน่ง/ความกว้างของ hline จาก dateline
   เรียกก่อน render ทุกครั้ง
========================================================= */

function resolveHLineAnchors(object) {

    const startD = findAnchorDateline(object.anchorStartId);

    const endD = findAnchorDateline(object.anchorEndId);

    /* dateline ถูกลบไปแล้ว → ปลดการเชื่อมเอง */
    if (object.anchorStartId && !startD) {
        object.anchorStartId = null;
    }

    if (object.anchorEndId && !endD) {
        object.anchorEndId = null;
    }

    if (!startD && !endD) {
        return;
    }

    /* เชื่อมสองข้าง → ให้ dateline ทั้งคู่อยู่ความสูงเดียวกัน
       เส้นจะได้แตะยอดทั้งสองพอดี */
    if (startD && endD) {
        endD.y = startD.y;
    }

    const startX = startD ? datelineTipX(startD) : object.x;

    const endX = endD
        ? datelineTipX(endD)
        : object.x + object.width;

    object.x = Math.min(startX, endX);

    object.width = Math.max(24, Math.abs(endX - startX));

    const referenceD = startD || endD;

    object.y = Math.max(
        0,
        referenceD.y - CARET_TIP_OFFSET - HLINE_CENTER_OFFSET
    );
}


/* =========================================================
   ตอนลาก dateline: ดึง dateline อีกฝั่งของ hline ให้ y ตามกัน
   (เรียกจาก handleObjectDragMove โหมด move-dateline)
========================================================= */

function syncLinkedDatelineY(dateline) {

    timelineObjects.forEach(item => {

        if (item.type !== "hline") {
            return;
        }

        const touches =
            item.anchorStartId === dateline.id ||
            item.anchorEndId === dateline.id;

        if (!touches) {
            return;
        }

        const other = findAnchorDateline(
            item.anchorStartId === dateline.id
                ? item.anchorEndId
                : item.anchorStartId
        );

        if (other) {
            other.y = dateline.y;
        }
    });
}


/* =========================================================
   ลากปลายเส้น: ปลายที่ลากข้ามอีกปลายได้ (เส้นจะสลับซ้าย/ขวาเอง)
   เรียกจาก handleObjectDragMove แทนโค้ดเดิมของ resize-start / resize-end
   ของ hline
========================================================= */

/* พิกัด X จริงของปลายที่กำลังลาก ใช้ตอนปล่อยเมาส์เพื่อหา dateline ที่จะดูดติด */
let hlineDragPointX = null;

function resizeHLine(object, mode, originX, originWidth, deltaX) {

    const fixedX = mode === "resize-start"
        ? originX + originWidth
        : originX;

    const movingX = mode === "resize-start"
        ? originX + deltaX
        : originX + originWidth + deltaX;

    hlineDragPointX = movingX;

    object.x = Math.min(fixedX, movingX);

    object.width = Math.max(24, Math.abs(movingX - fixedX));
}


/* =========================================================
   ปลดการเชื่อมตอนเริ่มลาก (เรียกจาก beginObjectDrag)
========================================================= */

function releaseHLineAnchors(object, mode) {

    if (mode === "resize-start") {

        object.anchorStartId = null;

    } else if (mode === "resize-end") {

        object.anchorEndId = null;

    } else if (mode === "move") {

        object.anchorStartId = null;
        object.anchorEndId = null;
    }
}


/* =========================================================
   ปล่อยปลายเส้นใกล้ยอดสามเหลี่ยม → ดูดติด
   (เรียกจาก endObjectDrag)
========================================================= */

function snapHLineAfterDrag(object, mode) {

    if (mode !== "resize-start" && mode !== "resize-end") {
        return;
    }

    /* anchor ของปลายที่ "ไม่ได้ลาก" (ยังติดอยู่) */
    const fixedAnchorId = mode === "resize-start"
        ? object.anchorEndId
        : object.anchorStartId;

    const fixedX = mode === "resize-start"
        ? object.x + object.width
        : object.x;

    const pointX = hlineDragPointX != null
        ? hlineDragPointX
        : (mode === "resize-start" ? object.x : object.x + object.width);

    hlineDragPointX = null;

    const pointY = object.y + HLINE_CENTER_OFFSET;

    let best = null;
    let bestScore = Infinity;

    timelineObjects.forEach(item => {

        if (item.type !== "dateline" || item.id === fixedAnchorId) {
            return;
        }

        const dx = Math.abs(pointX - datelineTipX(item));

        const dy = Math.abs(pointY - (item.y - CARET_TIP_OFFSET));

        if (dx > SNAP_DISTANCE_X || dy > SNAP_DISTANCE_Y) {
            return;
        }

        const score = dx + dy * 0.25;

        if (score < bestScore) {
            best = item;
            bestScore = score;
        }
    });

    const movedAnchorId = best ? best.id : null;

    /* ปลายที่ลากอยู่ทางซ้ายของปลายที่ติดอยู่ → มันกลายเป็นปลาย "start" */
    if (pointX < fixedX) {

        object.anchorStartId = movedAnchorId;
        object.anchorEndId = fixedAnchorId;

    } else {

        object.anchorStartId = fixedAnchorId;
        object.anchorEndId = movedAnchorId;
    }
}