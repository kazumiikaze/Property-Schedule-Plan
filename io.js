"use strict";

/* =========================================================
   IO.JS — Export / Import แผนทั้งหมดเป็นไฟล์ .json

   โหลดหลัง app.js และ text.js (ไม่แก้โค้ดเดิม)
   ใช้ state และฟังก์ชันของ app.js:
     categories, timelineObjects, objectRoles, boardNotes,
     timelineStartDate, timelineEndDate, zoomScale,
     selectedRowContext, verticalScrollY,
     renderSchedule, renderNotes, syncDateInputs, updateZoomDisplay,
     formatDateInputValue, parseDateInputValue, close*Menu
   และ window.ZGTextBoxes ของ text.js
========================================================= */

(function () {

    /*
        หาปุ่มด้วย id ก่อน ถ้าใน index.html ยังไม่ได้ใส่ id
        จะหาจากปุ่มที่มีคำว่า Export / Import บน toolbar แล้วใส่ id ให้เอง
        (ไฟล์อื่น เช่น export-image.js หาปุ่มด้วย id เดียวกัน)
    */
    function findToolbarButton(id, word) {

        let button =
            document.getElementById(id);

        if (!button) {

            button =
                Array.from(document.querySelectorAll(".workspace-toolbar button"))
                    .find(item => item.textContent.includes(word));

            if (button) {
                button.id = id;
            }
        }

        return button || null;
    }

    const exportBtn =
        findToolbarButton("exportPlanBtn", "Export");

    const importBtn =
        findToolbarButton("importPlanBtn", "Import");

    /*
        ★ ไม่ return ออกไปถ้าหาปุ่มไม่เจอ
        เพราะ plans.js ต้องใช้ window.ZGPlanIO ด้านล่างเสมอ
    */
    if (!exportBtn || !importBtn) {

        console.warn(
            "[io.js] ไม่พบปุ่ม #exportPlanBtn / #importPlanBtn — ปุ่ม Export/Import จะยังไม่ทำงาน"
        );
    }


    const FILE_APP = "property-schedule-plan";

    const FILE_VERSION = 1;

    const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;


    const titleEl =
        document.querySelector(".plan-header .title");

    const subtitleEl =
        document.querySelector(".plan-header .subtitle");


    /* =====================================================
       HELPERS
    ===================================================== */

    function clone(value) {

        return JSON.parse(JSON.stringify(value));
    }


    function dateToText(date) {

        return date instanceof Date && !isNaN(date)
            ? formatDateInputValue(date)
            : null;
    }


    function textToDate(text) {

        return typeof text === "string" && DATE_PATTERN.test(text)
            ? parseDateInputValue(text)
            : null;
    }


    function todayText() {

        return formatDateInputValue(new Date());
    }


    function safeFileName(name) {

        return (
            String(name || "plan")
                .trim()
                .replace(/[\\/:*?"<>|\s]+/g, "-")
                .replace(/-+/g, "-")
                .slice(0, 60) ||
            "plan"
        );
    }


    /* =====================================================
       EXPORT
    ===================================================== */

    function buildExportData() {

        return {

            app: FILE_APP,

            version: FILE_VERSION,

            exportedAt: new Date().toISOString(),

            title: titleEl ? titleEl.innerText.trim() : "",

            subtitle: subtitleEl ? subtitleEl.innerText.trim() : "",

            updateDate: window.ZGUpdateDate
                ? window.ZGUpdateDate.get()
                : "",

            timeline: {

                start: dateToText(timelineStartDate),

                end: dateToText(timelineEndDate),

                zoom: zoomScale,

                /* x / width ของ task / hline เป็น px ที่ค่านี้ (ใช้แปลงตอน Import) */
                pxPerDay: pxPerDay,

                scrollLeft: timelineViewport.scrollLeft
            },

            categories: clone(categories),

            roles: clone(objectRoles),

            objects: timelineObjects.map(object => ({

                ...clone(object),

                /* เก็บวันที่เป็น YYYY-MM-DD กันเพี้ยนเรื่อง timezone */
                linkedHeaderDate: dateToText(object.linkedHeaderDate)
            })),

            notes: clone(boardNotes),

            texts: window.ZGTextBoxes
                ? window.ZGTextBoxes.serialize()
                : []
        };
    }


    function exportPlan() {

        const data =
            buildExportData();

        const blob =
            new Blob(
                [JSON.stringify(data, null, 2)],
                { type: "application/json" }
            );

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            `${safeFileName(data.title)}_${todayText()}.json`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }


    /* =====================================================
       IMPORT
    ===================================================== */

    function validate(data) {

        if (!data || typeof data !== "object") {
            return "ไฟล์ไม่ถูกต้อง";
        }

        if (data.app !== FILE_APP) {
            return "ไฟล์นี้ไม่ใช่ไฟล์แผนของ Property Schedule Plan";
        }

        if (!Array.isArray(data.categories) || data.categories.length === 0) {
            return "ไฟล์ไม่มีข้อมูลหมวดหมู่";
        }

        if (!Array.isArray(data.roles) || data.roles.length === 0) {
            return "ไฟล์ไม่มีข้อมูลบทบาท";
        }

        return null;
    }


    function applyImportData(data) {

        closeCategoryMenu();
        closeRowMenu();
        closeToolbarMoreMenu();
        closeObjectMenu();
        closeRoleManager();


        /* ---------- หัวกระดาน ---------- */

        if (titleEl && typeof data.title === "string") {
            titleEl.textContent = data.title;
        }

        if (subtitleEl && typeof data.subtitle === "string") {
            subtitleEl.textContent = data.subtitle;
        }


        /* ---------- วันที่อัปเดต ---------- */

        if (window.ZGUpdateDate && data.updateDate) {
            window.ZGUpdateDate.set(data.updateDate);
        }


        /* ---------- ช่วงเวลา / ซูม ---------- */

        const timeline =
            data.timeline || {};

        const start =
            textToDate(timeline.start);

        const end =
            textToDate(timeline.end);

        if (start && end && end > start) {

            timelineStartDate = start;
            timelineEndDate = end;
        }

        if (Number.isFinite(timeline.zoom)) {

            zoomScale =
                clamp(timeline.zoom, ZOOM_MIN, ZOOM_MAX);
        }


        /* ---------- ข้อมูลหลัก ---------- */

        categories =
            clone(data.categories);

        objectRoles =
            clone(data.roles);

        timelineObjects =
            (Array.isArray(data.objects) ? data.objects : [])
                .filter(object => object && object.id && object.type)
                .map(object => ({

                    ...clone(object),

                    linkedHeaderDate: textToDate(object.linkedHeaderDate)
                }));

        boardNotes =
            Array.isArray(data.notes)
                ? clone(data.notes)
                : [];


        selectedRowContext = null;

        verticalScrollY = 0;


        /*
            บอก zoom-sync.js ว่าตำแหน่ง object ในไฟล์ถูกบันทึกที่ px ต่อวันเท่าไร
            → render ด้านล่างจะแปลงให้ตรงกับหน้าจอ/ซูมปัจจุบันเอง
            (ไฟล์เก่าที่ไม่มี pxPerDay = ใช้ค่า px ตามไฟล์ตรง ๆ)
        */
        const savedPxPerDay =
            Number(timeline.pxPerDay);

        if (window.ZGZoomSync) {

            window.ZGZoomSync.setBaseline(
                savedPxPerDay,
                timelineStartDate
            );
        }


        /* ---------- วาดใหม่ ---------- */

        syncDateInputs();

        updateZoomDisplay();

        renderNotes();

        renderSchedule();


        /* รอให้ object วาดเสร็จก่อน แล้วค่อยวางกล่อง text (เพราะบางกล่องติดแม่เหล็กกับ object) */

        requestAnimationFrame(() => {

            if (Number.isFinite(timeline.scrollLeft)) {

                timelineViewport.scrollLeft =
                    timeline.scrollLeft;

                updateAllHorizontalRanges();
            }

            if (window.ZGTextBoxes) {

                window.ZGTextBoxes.load(data.texts);

                if (savedPxPerDay > 0 && pxPerDay > 0) {

                    window.ZGTextBoxes.scaleAttachedX(
                        pxPerDay / savedPxPerDay
                    );
                }
            }
        });
    }


    function importPlanFile(file) {

        /* กันเลือก "ไฟล์ทั้งหมด" แล้วเลือกไฟล์อื่นมา */
        if (!/\.json$/i.test(file.name || "")) {
            alert("กรุณาเลือกไฟล์แผนนามสกุล .json เท่านั้น");
            return;
        }

        const reader =
            new FileReader();

        reader.onload = () => {

            let data;

            try {

                data = JSON.parse(String(reader.result));

            } catch (error) {

                alert("อ่านไฟล์ไม่ได้: ไฟล์ไม่ใช่ JSON ที่ถูกต้อง");

                return;
            }

            const problem =
                validate(data);

            if (problem) {

                alert(problem);

                return;
            }

            try {

                /* มีระบบหลายแผน (plans.js) → ให้เลือกว่าเพิ่มเป็นแผนใหม่ หรือแทนที่แผนนี้ */
                if (window.ZGPlans && typeof window.ZGPlans.importData === "function") {

                    window.ZGPlans.importData(data, file.name);

                } else {

                    applyImportData(data);
                }

            } catch (error) {

                console.error(error);

                alert("Import ไม่สำเร็จ: ข้อมูลในไฟล์บางส่วนไม่ถูกต้อง");
            }
        };

        reader.readAsText(file);
    }


    const fileInput =
        document.createElement("input");

    fileInput.type = "file";

    /* แสดงเฉพาะไฟล์ .json ในหน้าต่างเลือกไฟล์ */
    fileInput.accept = ".json";

    fileInput.style.display = "none";

    fileInput.addEventListener("change", () => {

        const file =
            fileInput.files && fileInput.files[0];

        if (file) {
            importPlanFile(file);
        }

        /* รีเซ็ต เพื่อให้เลือกไฟล์เดิมซ้ำได้ */
        fileInput.value = "";
    });

    document.body.appendChild(fileInput);


    /* =====================================================
       BUTTONS
    ===================================================== */

    if (exportBtn) {
        exportBtn.addEventListener("click", exportPlan);
    }

    if (importBtn) {
        importBtn.addEventListener("click", () => fileInput.click());
    }


    /* =====================================================
       PUBLIC API (ใช้โดย plans.js — เก็บ/สลับหลายแผน)
    ===================================================== */

    window.ZGPlanIO = {

        FILE_APP,

        FILE_VERSION,

        build: buildExportData,

        /* ดาวน์โหลดไฟล์แผน .json (ใช้โดยเมนู Export ของ export-image.js) */
        exportFile: exportPlan,

        /* เปิดหน้าต่างเลือกไฟล์แผน .json (ใช้โดยเมนู Import ของ image-import.js) */
        importFile: () => fileInput.click(),

        validate,

        apply: applyImportData
    };

})();