"use strict";

/* =========================================================
   PREVIEW-GUARD.JS — โหมดหน้าต่างตัวอย่าง (ใช้โดย template-preview.js)
   - เปิด index.html?zgPreview=1 ในกรอบซ่อน เพื่อวาดเทมเพลตจริงแล้วถ่ายเป็นภาพตัวอย่าง
   - ในโหมดนี้ "ห้ามบันทึกอะไรลงเครื่อง": การเขียน localStorage / sessionStorage
     เก็บไว้ในหน่วยความจำของกรอบนั้นเท่านั้น (อ่านค่าจริงได้ตามปกติ)
     → แผน / เทมเพลต / การตั้งค่าของผู้ใช้ไม่ถูกเขียนทับ
   - ต้องโหลดเป็นสคริปต์แรกสุดใน <head> (ก่อนไฟล์อื่นทั้งหมด)
   - หน้าเว็บปกติ (ไม่มี ?zgPreview) → ไฟล์นี้ไม่ทำอะไรเลย
========================================================= */

(function () {

    if (!/[?&]zgPreview=1\b/.test(location.search)) return;

    window.ZG_PREVIEW_MODE = true;
    document.documentElement.classList.add("zg-preview-mode");

    /*
        แทนที่เมธอดที่ Storage.prototype ของกรอบนี้เท่านั้น (คนละชุดกับหน้าเว็บหลัก)
        — ห้ามใช้ defineProperty กับ localStorage ตรง ๆ เพราะจะกลายเป็นการ "บันทึกค่า" จริง
    */
    const proto = Storage.prototype;
    const realGet = proto.getItem;
    const realKey = proto.key;
    const realLength = Object.getOwnPropertyDescriptor(proto, "length");
    const memory = new WeakMap();

    function state(storage) {
        let entry = memory.get(storage);
        if (!entry) {
            entry = { written: new Map(), removed: new Set() };
            memory.set(storage, entry);
        }
        return entry;
    }

    proto.getItem = function (key) {
        key = String(key);
        const entry = state(this);
        if (entry.written.has(key)) return entry.written.get(key);
        if (entry.removed.has(key)) return null;
        return realGet.call(this, key);
    };

    proto.setItem = function (key, value) {
        key = String(key);
        const entry = state(this);
        entry.removed.delete(key);
        entry.written.set(key, String(value));
    };

    proto.removeItem = function (key) {
        key = String(key);
        const entry = state(this);
        entry.written.delete(key);
        entry.removed.add(key);
    };

    proto.clear = function () {
        const entry = state(this);
        entry.written.clear();
        const count = realLength ? realLength.get.call(this) : 0;
        for (let i = 0; i < count; i += 1) entry.removed.add(realKey.call(this, i));
    };

    /* IndexedDB (คลังรูปแปะ) — โหมดตัวอย่างไม่ต้องใช้ */
    try {
        Object.defineProperty(window, "indexedDB", { value: undefined, configurable: true });
    } catch (error) { /* ไม่เป็นไร */ }

})();
