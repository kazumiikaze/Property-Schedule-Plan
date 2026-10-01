PROPERTY SCHEDULE PLAN — PHASE 1

เปิดใช้งาน:
1) เปิด index.html ใน Chrome/Edge ได้โดยตรง หรือใช้ local server ก็ได้
2) Toolbar เริ่มทำงานแล้วสำหรับ:
   - + งาน
   - + เส้นวันที่
   - + เส้นแนวนอน
   - วันเริ่มต้น / วันสิ้นสุด
   - ขยาย/ลดช่วงเดือนซ้ายและขวา
   - Zoom 70–130%
   - ค้นหา task ที่เพิ่มใหม่ด้วย Ctrl+K
3) ข้อมูลที่เพิ่มจะบันทึกใน localStorage ของ browser อัตโนมัติ

โครงสร้าง:
- index.html      โครงหน้าเดิม + hook สำหรับระบบ
- style.css       layout เดิม + dynamic layer
- js/state.js     state + localStorage
- js/renderer.js  date -> X และ render object
- js/toolbar.js   event ของ toolbar
- js/app.js       boot ระบบ + auto-hide footer
- logo.png        logo เดิม

หมายเหตุ:
Phase 1 ตั้งใจรักษา layout เดิมไว้ก่อน ปุ่ม Print / Export / Import / ตรวจคำผิด / Role editor แบบเต็ม ยังไม่ได้เปิด logic จริง เพื่อไม่ให้กระทบ layout ก่อนระบบ state/render เสถียร
