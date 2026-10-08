"use strict";

/* =========================================================
   TEMPLATES-FOLDER.JS — เทมเพลตจากโฟลเดอร์ templates/ ในเว็บ
   - เอาไฟล์ .json ที่ได้จากปุ่ม ⬆ Export เทมเพลต (หรือไฟล์แผน .json)
     ไปวางในโฟลเดอร์ templates/ ตั้งชื่อ template1.json, template2.json, ...
     แล้ว push → ทุกเครื่องเห็นเทมเพลตนี้ในเมนู 📋 เทมเพลต และหน้าเริ่มต้น
   - อ่านทีละไฟล์ตามเลข หยุดเมื่อเจอเลขที่ไม่มีไฟล์ (เลขต้องเรียงติดกัน)
   - ต้องเปิดผ่านเว็บ (Vercel / Live Server) — เปิดไฟล์ index.html ตรง ๆ จะอ่านโฟลเดอร์ไม่ได้
   - ไม่แก้ app.js / style.css — โหลดหลัง templates-data.js
========================================================= */

(function () {

    const FOLDER = "templates/";
    const MAX_FILES = 50;

    if (!Array.isArray(window.ZG_TEMPLATES)) window.ZG_TEMPLATES = [];

    function slug(text) {
        return String(text || "")
            .toLowerCase()
            .replace(/[^a-z0-9ก-๙]+/gi, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 40) || "template";
    }

    /* แปลงไฟล์ (Export เทมเพลต หรือไฟล์แผนปกติ) → รายการเทมเพลต */
    function toTemplates(json, fileName, index) {

        if (!json || typeof json !== "object") return [];

        if (Array.isArray(json.templates)) {
            return json.templates
                .filter(item => item && item.data && typeof item.data === "object")
                .map((item, n) => ({
                    id: item.id || `folder-${index}-${n}`,
                    name: item.name || item.data.subtitle || item.data.title || `เทมเพลต ${index}`,
                    createdAt: item.createdAt || new Date().toISOString(),
                    data: item.data
                }));
        }

        if (Array.isArray(json.categories) || Array.isArray(json.objects)) {
            const name = json.subtitle || json.title || fileName.replace(/\.json$/i, "");
            return [{
                id: `folder-${index}-${slug(name)}`,
                name,
                createdAt: json.exportedAt || new Date().toISOString(),
                data: json
            }];
        }

        return [];
    }

    async function loadAll() {

        if (location.protocol === "file:") return 0;

        let added = 0;

        for (let i = 1; i <= MAX_FILES; i += 1) {

            const fileName = `template${i}.json`;
            let response;

            try {
                response = await fetch(`${FOLDER}${fileName}`, { cache: "no-cache" });
            } catch (error) {
                break;
            }

            if (!response.ok) break;

            let json;

            try {
                json = await response.json();
            } catch (error) {
                console.warn(`[templates-folder.js] ${fileName} ไม่ใช่ JSON ที่ถูกต้อง`);
                continue;
            }

            toTemplates(json, fileName, i).forEach(item => {
                /* id ซ้ำ (ไฟล์ใหม่ของเทมเพลตเดิม) → ใช้อันที่ใหม่กว่า / ไฟล์เลขหลัง */
                const index = window.ZG_TEMPLATES.findIndex(existing => existing && existing.id === item.id);
                if (index >= 0) {
                    const before = Date.parse(window.ZG_TEMPLATES[index].createdAt) || 0;
                    const after = Date.parse(item.createdAt) || 0;
                    if (after >= before) window.ZG_TEMPLATES[index] = item;
                    added += 1;
                    return;
                }
                window.ZG_TEMPLATES.push(item);
                added += 1;
            });
        }

        if (added) {
            window.dispatchEvent(new CustomEvent("zg-templates-folder-loaded", { detail: { added } }));
        }

        return added;
    }

    window.ZGTemplatesFolder = { ready: loadAll() };

})();
