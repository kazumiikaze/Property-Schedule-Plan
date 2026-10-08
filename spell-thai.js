"use strict";

/* =========================================================
   SPELL-THAI.JS — ตัวตรวจคำผิดภาษาไทย (ใช้พจนานุกรม thai-words.js)
   วิธีตรวจ:
   1) ตัดคำด้วยพจนานุกรม (dynamic programming: ส่วนที่ไม่รู้จักน้อยที่สุด → จำนวนคำน้อยที่สุด)
   2) ส่วนที่ไม่รู้จัก → ลองแก้ 1 ตัวอักษร (เพิ่ม / ลบ / แทน / สลับ) รวมคำข้างเคียง
      ถ้าได้คำในพจนานุกรม = "น่าจะพิมพ์ผิด" พร้อมคำแนะนำ
      ถ้าไม่ได้ = "ไม่รู้จัก" (อาจเป็นชื่อเฉพาะ)
   3) ตัดคำได้ครบ แต่คำติดกัน 2–3 คำ เมื่อเพิ่ม/ลบ/แก้สระหรือวรรณยุกต์ 1 ตัว
      แล้วกลายเป็นคำที่ใช้บ่อย (เช่น อนุ+ญาติ → อนุญาต) = "น่าจะพิมพ์ผิด"
   - โหลดพจนานุกรมตอนเปิดตรวจคำผิดเท่านั้น (ไฟล์ใหญ่ ~1.5 MB)
   - ไม่แก้ app.js / style.css
========================================================= */

(function () {

    const DICT_SRC = "thai-words.js";

    /* คำทับศัพท์ / คำในงานที่พจนานุกรมไม่มี */
    const EXTRA = (
        "เซล เซลส์ มอล อีเมล อีเมล์ ไลน์ คอนโด ออฟฟิศ แพลน โปรเจกต์ โปรเจค ไซต์ ไซท์ ดีล โอเค แอดมิน " +
        "ลิงก์ ลิงค์ ไฟล์ เพจ แอป แชต แชท สติ๊กเกอร์ เทมเพลต ไอคอน คลิก เมนู ปริ้น ปรินต์ พรินต์ เว็บ " +
        "เว็บไซต์ ออนไลน์ อัปเดต อัพเดท อัพเดต อินเทอร์เน็ต คอมเมนต์ เซ็ต เคส ทีม บิล อินวอยซ์ เช็ค เช็ก " +
        "โลโก้ แบรนด์ กนอ นิคม อมตะ ซิตี้ ปิ่นทอง เหมราช โรจนะ แหลมฉบัง มาบตาพุด บางปู บางพลี ลาดกระบัง " +
        "เวลโกรว์ บ่อวิน ปลวกแดง ศรีราชา ไร่ งาน ตารางวา ตารางเมตร โฉนด นส นิติกรรม จดจำนอง ไถ่ถอน " +
        "ทาวน์โฮม ทาวน์เฮาส์ โกดัง โรงงาน คลังสินค้า ซับคอน ผู้รับเหมา ดาวน์ ดาวน์เพย์เมนต์ อีไอเอ"
    ).split(/\s+/);

    const COMB = new Set("ัิีึืุู็่้๊๋์ํฺ");
    const LEAD = new Set("เแโใไ");
    const TAIL = new Set("ะาำ");
    const MARKS = Array.from("ัิีึืุู็่้๊๋์ะ");

    const ALPHABET = [];
    for (let code = 0x0E01; code <= 0x0E4D; code += 1) {
        const ch = String.fromCharCode(code);
        if (ch !== "ฯ" && ch !== "ๆ" && ch !== "฿" && code !== 0x0E3B && code !== 0x0E3C && code !== 0x0E3D && code !== 0x0E3E) ALPHABET.push(ch);
    }

    /* ช่วงข้อความไทย (ไม่รวม ฯ ๆ ตัวเลขไทย) */
    const RUN = /[ก-ฮะ-ฺเ-ๅ็-๎]+/g;

    let dict = null;       // Map<word, freqLevel>
    let maxLen = 0;
    let loading = null;
    const extraWords = new Set();
    const cache = new Map();


    /* =====================================================
       โหลดพจนานุกรม
    ===================================================== */

    function build() {

        const raw = String(window.ZG_THAI_WORDS || "");

        dict = new Map();

        raw.split("|").forEach(entry => {
            const match = /^(.*?)(\d)?$/.exec(entry);
            if (!match || !match[1]) return;
            dict.set(match[1], match[2] ? Number(match[2]) : 0);
        });

        EXTRA.forEach(word => { if (word && !dict.has(word)) dict.set(word, 2); });
        extraWords.forEach(word => { if (!dict.has(word)) dict.set(word, 2); });

        maxLen = 0;
        dict.forEach((level, word) => { if (word.length > maxLen) maxLen = word.length; });
        maxLen = Math.min(maxLen, 40);

        window.ZG_THAI_WORDS = null;
    }

    function load() {

        if (dict) return Promise.resolve(true);
        if (loading) return loading;

        loading = new Promise(resolve => {

            if (window.ZG_THAI_WORDS) {
                build();
                resolve(true);
                return;
            }

            const script = document.createElement("script");
            script.src = DICT_SRC;
            script.async = true;

            script.onload = () => {
                try {
                    build();
                    resolve(true);
                } catch (error) {
                    console.error("[spell-thai.js]", error);
                    resolve(false);
                }
            };

            script.onerror = () => {
                console.warn("[spell-thai.js] โหลด thai-words.js ไม่ได้");
                loading = null;
                resolve(false);
            };

            document.head.appendChild(script);
        });

        return loading;
    }

    function addWords(list) {
        (list || []).forEach(word => {
            const clean = String(word || "").trim();
            if (!clean) return;
            extraWords.add(clean);
            if (dict && !dict.has(clean)) dict.set(clean, 2);
        });
        cache.clear();
    }


    /* =====================================================
       ตัดคำ
    ===================================================== */

    function clusterEnd(text, i) {
        let j = i + 1;
        if (LEAD.has(text[i]) && j < text.length) j += 1;
        while (j < text.length && COMB.has(text[j])) j += 1;
        if (j < text.length && TAIL.has(text[j])) j += 1;
        return j;
    }

    function segment(text) {

        const n = text.length;
        const bestU = new Array(n + 1).fill(Infinity);
        const bestW = new Array(n + 1).fill(Infinity);
        const back = new Array(n + 1);

        bestU[0] = 0;
        bestW[0] = 0;

        const better = (j, u, w) => u < bestU[j] || (u === bestU[j] && w < bestW[j]);

        for (let i = 0; i < n; i += 1) {

            if (bestU[i] === Infinity) continue;

            const u = bestU[i];
            const w = bestW[i];
            const limit = Math.min(n, i + maxLen);

            for (let j = i + 1; j <= limit; j += 1) {
                if (dict.has(text.slice(i, j)) && better(j, u, w + 1)) {
                    bestU[j] = u;
                    bestW[j] = w + 1;
                    back[j] = [i, true];
                }
            }

            const j = Math.min(n, clusterEnd(text, i));

            if (better(j, u + (j - i), w + 1)) {
                bestU[j] = u + (j - i);
                bestW[j] = w + 1;
                back[j] = [i, false];
            }
        }

        const tokens = [];
        let j = n;

        while (j > 0) {
            const [i, known] = back[j];
            tokens.push({ a: i, b: j, known });
            j = i;
        }

        tokens.reverse();

        /* รวมส่วนที่ไม่รู้จักที่ติดกัน */
        const merged = [];

        tokens.forEach(token => {
            const last = merged[merged.length - 1];
            if (last && !last.known && !token.known) last.b = token.b;
            else merged.push({ ...token });
        });

        return merged;
    }


    /* =====================================================
       หาคำแนะนำ
    ===================================================== */

    function edits1(word) {

        const out = new Set();

        for (let i = 0; i <= word.length; i += 1) {

            const left = word.slice(0, i);
            const right = word.slice(i);

            if (right) out.add(left + right.slice(1));
            if (right.length > 1) out.add(left + right[1] + right[0] + right.slice(2));

            ALPHABET.forEach(ch => {
                if (right) out.add(left + ch + right.slice(1));
                out.add(left + ch + right);
            });
        }

        return out;
    }

    function markEdits(word) {

        const out = new Set();

        for (let i = 0; i <= word.length; i += 1) {

            const left = word.slice(0, i);
            const right = word.slice(i);
            const isMark = right && MARKS.includes(right[0]);

            if (isMark) out.add(left + right.slice(1));

            MARKS.forEach(mark => {
                out.add(left + mark + right);
                if (isMark) out.add(left + mark + right.slice(1));
            });
        }

        return out;
    }

    function checkRun(run) {

        if (cache.has(run)) return cache.get(run);

        const results = [];
        const tokens = segment(run);

        tokens.forEach((token, k) => {

            if (token.known) return;

            let best = null;

            for (let p = 0; p <= 2; p += 1) {
                for (let q = 0; q <= 2; q += 1) {

                    if (k - p < 0 || k + q >= tokens.length) continue;

                    const a = tokens[k - p].a;
                    const b = tokens[k + q].b;
                    const win = run.slice(a, b);

                    if (win.length > 25) continue;

                    edits1(win).forEach(candidate => {

                        if (candidate.length < 2 || !dict.has(candidate)) return;

                        /* ลบตัวสะกดท้ายคำทับศัพท์ (เซล → เซ) ไม่นับ */
                        if (candidate.length === win.length - 1 && candidate === win.slice(0, -1)) return;

                        const level = dict.get(candidate) || 0;
                        if (level < 1) return;

                        const score = win.length * 10 + level;
                        if (!best || score > best.score) best = { score, a, b, wrong: win, right: candidate };
                    });
                }
            }

            if (best) results.push({ kind: "typo", wrong: best.wrong, right: best.right, index: best.a });
            else results.push({ kind: "unknown", wrong: run.slice(token.a, token.b), index: token.a });
        });

        /* ตัดคำได้ครบ → ลองรวมคำติดกันที่สระ / วรรณยุกต์ผิด */
        if (tokens.every(token => token.known)) {

            for (let i = 0; i < tokens.length; i += 1) {
                for (const span of [2, 3]) {

                    if (i + span > tokens.length) continue;

                    const a = tokens[i].a;
                    const b = tokens[i + span - 1].b;
                    const joined = run.slice(a, b);

                    if (dict.has(joined)) continue;

                    let best = null;

                    markEdits(joined).forEach(candidate => {
                        if (candidate.length < 5 || !dict.has(candidate)) return;
                        const level = dict.get(candidate) || 0;
                        if (level < 2) return;
                        if (!best || level > best.level) best = { level, candidate };
                    });

                    if (best) results.push({ kind: "typo", wrong: joined, right: best.candidate, index: a });
                }
            }
        }

        /* ตัดอันที่ซ้อนอยู่ในอันที่ยาวกว่า */
        const unique = results.filter((item, i) =>
            !results.some((other, j) => j !== i && other.kind === "typo" && item.kind === "typo" &&
                other.wrong.length > item.wrong.length && other.index <= item.index &&
                other.index + other.wrong.length >= item.index + item.wrong.length) &&
            results.findIndex(other => other.kind === item.kind && other.wrong === item.wrong) === i
        );

        if (cache.size > 3000) cache.clear();
        cache.set(run, unique);

        return unique;
    }

    /* ตรวจข้อความ → [{ kind: "typo"|"unknown", wrong, right?, index }] */
    function check(text) {

        if (!dict || !text) return [];

        const results = [];

        RUN.lastIndex = 0;

        let match;

        while ((match = RUN.exec(text))) {

            const run = match[0];

            if (run.length < 2) continue;

            /* คำย่อ เช่น ม.ค. ตร.ว. */
            if (text[match.index + run.length] === "." && run.length <= 3) continue;

            checkRun(run).forEach(item => results.push({ ...item, index: match.index + item.index }));
        }

        return results;
    }


    window.ZGThaiSpell = {
        load,
        ready: () => Boolean(dict),
        check,
        addWords,
        has: word => Boolean(dict && dict.has(word))
    };

})();
