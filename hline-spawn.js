"use strict";

/* =========================================================
   HLINE-SPAWN.JS — จุดเกิดของ "เส้นแนวนอน" และ "เส้นวันที่" ใหม่
   เดิม: เกิดกลางส่วนตารางที่มองเห็น
   ใหม่: เกิดใต้คำว่า "เส้นวันที่ / Bracket" ในช่อง bracket
         - เส้นแนวนอน : ขอบซ้ายตรงกับข้อความ
         - เส้นวันที่  : กล่องข้อความ (chip) ขอบซ้ายตรงกับข้อความ
                        วันที่ = วันที่อยู่ตรงตำแหน่งนั้นพอดี
         กดหลายครั้ง → เยื้องลงทีละนิด ไม่ทับกันสนิท

   ไม่แก้ app.js
   - ห่อ getSpawnPosition() เฉพาะ "hline" / "dateline"
   - เส้นวันที่: app.js ตั้งวันที่เป็น "กลางจอ" หลังสร้าง
     → ดักตอน renderObjects() ครั้งถัดไป แล้วเปลี่ยนวันที่ให้ตรงจุดเกิด
   โหลดหลัง app.js
========================================================= */

(function () {

    if (typeof getSpawnPosition !== "function" || typeof renderObjects !== "function") {

        console.error("[hline-spawn.js] ไม่พบฟังก์ชันของ app.js (ต้องโหลดหลัง app.js)");

        return;
    }

    const GAP_BELOW_LABEL = 6;      // ระยะห่างใต้ข้อความ (px)

    const STEP_Y = 8;               // กดซ้ำ เยื้องลงทีละ (px)

    const HLINE_MIN_Y = 14;         // ค่าต่ำสุดเดียวกับตอนลากใน app.js

    const DATELINE_MIN =
        typeof DATELINE_MIN_Y === "number" ? DATELINE_MIN_Y : 14;


    /* ตำแหน่งใต้ข้อความ (พิกัดบนจอ) — null = หาไม่เจอ */
    function labelAnchor(objectWidth) {

        const label = document.querySelector("#bracketArea .bracket-label");

        if (!label || !bracketContent || !bracketViewport) {
            return null;
        }

        const labelRect = label.getBoundingClientRect();
        const contentRect = bracketContent.getBoundingClientRect();
        const viewportRect = bracketViewport.getBoundingClientRect();

        if (!labelRect.width || !contentRect.width) {
            return null;
        }

        const correction =
            typeof getBracketHorizontalCorrection === "function"
                ? getBracketHorizontalCorrection()
                : 0;

        /* ชิดซ้ายตรงกับข้อความ แต่ต้องอยู่ในส่วนที่มองเห็นของช่อง bracket */
        let screenLeft = labelRect.left;

        screenLeft = Math.max(screenLeft, viewportRect.left + 4);
        screenLeft = Math.min(screenLeft, viewportRect.right - objectWidth - 4);

        /* ไม่ให้เกิดเลยวันสิ้นสุดของตาราง */
        if (typeof timelineWidthPx === "number" && timelineWidthPx > 0) {
            screenLeft = Math.min(
                screenLeft,
                contentRect.left + correction + timelineWidthPx - objectWidth
            );
        }

        return {
            /* x ภายใน bracketContent (ก่อนบวก correction แบบที่ app.js ทำ) */
            x: screenLeft - contentRect.left - correction,
            y: labelRect.bottom - contentRect.top + GAP_BELOW_LABEL
        };
    }


    function clampY(y, minY, height) {

        const maxY = Math.max(minY, bracketContent.clientHeight - height);

        return Math.min(Math.max(y, minY), maxY);
    }


    function stagger(counter) {

        return typeof counter === "number"
            ? ((counter - 1) % 3) * STEP_Y
            : 0;
    }


    /* =====================================================
       SPAWN POSITION
    ===================================================== */

    const originalGetSpawnPosition = getSpawnPosition;

    getSpawnPosition = function (type) {

        const result = originalGetSpawnPosition.apply(this, arguments);

        if (type !== "hline" && type !== "dateline") {
            return result;
        }

        try {

            const size = getDefaultObjectSize(type);

            const anchor = labelAnchor(size.width);

            if (!anchor) {
                return result;
            }

            if (type === "hline") {

                return {
                    x: Math.max(0, anchor.x),
                    y: clampY(
                        anchor.y + stagger(hlineSpawnCounter),
                        HLINE_MIN_Y,
                        Math.max(size.height, 6)
                    )
                };
            }

            /* dateline: x ไม่ได้ใช้วาด (วาดจากวันที่) แต่ใส่ไว้ให้ตรงกัน */
            return {
                x: Math.max(0, anchor.x),
                y: clampY(
                    anchor.y + stagger(datelineSpawnCounter),
                    DATELINE_MIN,
                    Math.max(size.height, 18)
                )
            };

        } catch (error) {

            console.error("[hline-spawn.js]", error);

            return result;
        }
    };


    /* =====================================================
       DATELINE DATE — ให้วันที่ตรงกับจุดเกิด (ใต้ข้อความ)
    ===================================================== */

    let pendingDateline = null;     // { knownIds: Set }

    const addDateLineButton = document.getElementById("addDateLineBtn");

    if (addDateLineButton) {

        /* capture: ทำงานก่อน handler ของ app.js */
        addDateLineButton.addEventListener("click", () => {

            pendingDateline = {
                knownIds: new Set(timelineObjects.map(object => object.id))
            };

        }, true);
    }


    function dateAtSpawn(object) {

        const width = Math.max(object.width, 24);

        const anchor = labelAnchor(width);

        if (!anchor || !(pxPerDay > 0)) {
            return null;
        }

        /* chip วาดที่ dateToLeft(date) - width/2 → จุดเส้น = ขอบซ้าย chip + width/2 */
        const lineX = anchor.x + width / 2;

        const lastDay =
            Math.max(0, (typeof timelineTotalDays === "number" ? timelineTotalDays : 1) - 1);

        const dayOffset =
            clamp(Math.round(lineX / pxPerDay), 0, lastDay);

        return addDays(timelineStartDate, dayOffset);
    }


    const originalRenderObjects = renderObjects;

    renderObjects = function () {

        if (pendingDateline) {

            const pending = pendingDateline;

            pendingDateline = null;

            try {

                timelineObjects.forEach(object => {

                    if (object.type !== "dateline" || pending.knownIds.has(object.id)) {
                        return;
                    }

                    const date = dateAtSpawn(object);

                    if (date) {
                        object.linkedHeaderDate = date;
                    }
                });

            } catch (error) {

                console.error("[hline-spawn.js]", error);
            }
        }

        return originalRenderObjects.apply(this, arguments);
    };

})();