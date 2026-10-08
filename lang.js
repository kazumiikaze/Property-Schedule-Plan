"use strict";

/* =========================================================
   LANG.JS — สลับภาษาหน้าจอ ไทย / English / 日本語 (ปุ่ม 🌐)

   วิธีทำงาน (ไม่แก้ app.js และไฟล์อื่น):
   - โค้ดเดิมสร้างข้อความภาษาไทยตามปกติ
   - ไฟล์นี้คอยดู DOM (MutationObserver) แล้วแปลข้อความ UI
     ที่ตรงกับพจนานุกรมด้านล่าง ทั้งตัวหนังสือ และ title /
     placeholder / aria-label / data-placeholder
   - จำข้อความภาษาไทยต้นฉบับไว้ สลับกลับเป็นไทยได้เสมอ
   - ไม่แตะข้อความที่ผู้ใช้พิมพ์เอง (ช่อง contenteditable,
     input, textarea) และข้อมูลในแผน เช่น ชื่อหมวด ชื่อบทบาท

   ปุ่ม: #langToggleBtn (ถ้าไม่มี id จะหาปุ่มที่มี 🌐 แทน)
   กดวน: TH → EN → JP → TH
========================================================= */

(function () {

    const button =
        document.getElementById("langToggleBtn") ||
        Array.from(document.querySelectorAll(".workspace-toolbar button"))
            .find(item => item.textContent.includes("🌐"));

    const STORAGE_KEY = "zg-property-schedule-lang";

    const LANGS = ["th", "en", "ja"];

    const LANG_LABEL = { th: "TH", en: "EN", ja: "JP" };

    const ATTRS = ["title", "placeholder", "aria-label", "data-placeholder"];


    /* =====================================================
       DICTIONARY  [ไทย, English, 日本語]
    ===================================================== */

    const DICT = [

        /* ---------- toolbar ---------- */
        ["เพิ่มแผน", "Add plan", "プランを追加"],
        ["เปลี่ยนชื่อแผน", "Rename plan", "プラン名を変更"],
        ["ลบแผน", "Delete plan", "プランを削除"],
        ["ลบแผนนี้", "Delete this plan", "このプランを削除"],
        ["ต้องมีอย่างน้อย 1 แผน", "At least 1 plan is required", "プランは最低1つ必要です"],
        ["เพิ่ม", "Add", "追加"],
        ["แก้ไข", "Edit", "編集"],
        ["＋ งาน", "＋ Task", "＋ タスク"],
        ["＋ เส้นวันที่", "＋ Date line", "＋ 日付線"],
        ["＋ เส้นแนวนอน", "＋ Horizontal line", "＋ 横線"],
        ["＋ Text", "＋ Text", "＋ テキスト"],
        /* ---------- รูปภาพ (image-*.js) ---------- */
        ["🖼 รูปภาพ ▾", "🖼 Images ▾", "🖼 画像 ▾"],
        ["วางรูปบนกระดาน…", "Place image on board…", "ボードに画像を配置…"],
        ["อยู่ในตาราง เลื่อน/ซูมตามตาราง · เลือกได้หลายรูป", "Sits in the table, scrolls/zooms with it · select several", "表内に配置・表と一緒にスクロール/ズーム · 複数選択可"],
        ["วางรูปจากคลิปบอร์ด", "Paste image from clipboard", "クリップボードから貼り付け"],
        ["รูปที่คัดลอกไว้ (หรือกด Ctrl+V)", "Copied image (or press Ctrl+V)", "コピーした画像（Ctrl+V でも可）"],
        ["ใส่รูปในกล่องงาน…", "Add image to a task…", "タスクに画像を追加…"],
        ["คลิกเลือกกล่องงาน แล้วเลือกรูป (หรือลากรูปไปวางบนกล่อง)", "Click a task, then choose an image (or drop an image on it)", "タスクをクリックして画像を選択（またはドロップ）"],
        ["เปลี่ยนโลโก้แผน…", "Change plan logo…", "プランのロゴを変更…"],
        ["โลโก้ลูกค้า/โครงการ มุมซ้ายบน (เฉพาะแผนนี้)", "Customer/project logo, top left (this plan only)", "顧客/案件のロゴ（このプランのみ）"],
        ["ใช้โลโก้บริษัท (ค่าเริ่มต้น)", "Use company logo (default)", "会社のロゴを使用（既定）"],
        ["รูปที่ล็อกไว้จะกลับมาลากย้ายได้", "Locked images become movable again", "ロックした画像を再び移動可能にします"],
        ["เคล็ดลับ: ลากไฟล์รูปมาวางบนกระดาน หรือกด Ctrl+V เพื่อวางรูปที่คัดลอกไว้ได้เลย", "Tip: drop image files on the board, or press Ctrl+V to paste a copied image", "ヒント：画像ファイルをボードにドロップ、または Ctrl+V で貼り付け"],
        ["⬆ ชั้นหน้า", "⬆ Front", "⬆ 前面"],
        ["⬇ ชั้นหลัง", "⬇ Back", "⬇ 背面"],
        ["▢ กรอบ", "▢ Border", "▢ 枠"],
        ["◜ มุมโค้ง", "◜ Rounded", "◜ 角丸"],
        ["🔒 ล็อก", "🔒 Lock", "🔒 ロック"],
        ["ไม่ระบุ", "Not set", "未設定"],
        ["กำลังเจรจา", "Negotiating", "交渉中"],
        ["เสนอราคาแล้ว", "Quoted", "見積提出済み"],
        ["เซ็นสัญญาแล้ว", "Contract signed", "契約済み"],
        ["รอโอน", "Awaiting transfer", "移転待ち"],
        ["ปิดดีล", "Closed", "成約"],
        ["เขียว", "Green", "グリーン"],
        ["น้ำเงิน", "Blue", "ブルー"],
        ["ส้ม", "Orange", "オレンジ"],
        ["ม่วง", "Purple", "パープル"],
        ["แดง", "Red", "レッド"],
        ["เทาเข้ม", "Slate", "スレート"],
        ["กรอบโค้ง", "Rounded", "角丸"],
        ["แถบเต็ม", "Band", "帯"],
        ["มินิมอล", "Minimal", "ミニマル"],
        ["ลูกค้า", "Customer", "顧客"],
        ["ที่ตั้ง", "Location", "所在地"],
        ["ขนาดที่ดิน", "Land size", "土地面積"],
        ["เซลผู้ดูแล", "Sales owner", "担当営業"],
        ["ลูกค้า — ชื่อลูกค้า / บริษัท", "Customer — name / company", "顧客 — 氏名・会社名"],
        ["ที่ตั้ง — เช่น นิคมฯ อมตะซิตี้ ระยอง", "Location — e.g. Amata City Rayong", "所在地 — 例：アマタシティ・ラヨーン"],
        ["ขนาดที่ดิน — เช่น 25 ไร่", "Land size — e.g. 25 rai", "土地面積 — 例：25ライ"],
        ["เซลผู้ดูแล — ชื่อเซล", "Sales owner — name", "担当営業 — 氏名"],
        ["ข้อมูลโครงการ (ไม่ใส่ = ไม่แสดง)", "Project info (leave blank to hide)", "プロジェクト情報（空欄は非表示）"],
        ["สถานะดีล", "Deal status", "商談ステータス"],
        ["สีหัวกระดาน", "Header color", "ヘッダーの色"],
        ["🎨 ตามโลโก้ลูกค้า", "🎨 Match customer logo", "🎨 顧客ロゴに合わせる"],
        ["ตั้งโลโก้ลูกค้าก่อน (คลิกที่โลโก้)", "Set a customer logo first (click the logo)", "先に顧客ロゴを設定してください（ロゴをクリック）"],
        ["โลโก้คู่ (บริษัท + ลูกค้า)", "Dual logo (company + customer)", "ダブルロゴ（自社＋顧客）"],
        ["โลโก้บริษัทซ้าย · โลโก้ลูกค้าขวา", "Company logo left · customer logo right", "左に自社ロゴ · 右に顧客ロゴ"],
        ["ตั้งโลโก้ลูกค้าก่อน — คลิกที่โลโก้มุมซ้าย", "Set a customer logo first — click the logo at the top left", "先に顧客ロゴを設定 — 左上のロゴをクリック"],
        ["สรุป & ความคืบหน้าบนเส้นหัวกระดาน", "Summary & progress on the header line", "ヘッダーラインに概要と進捗を表示"],
        ["ระยะเวลา · จำนวนงาน · เหลืออีกกี่วัน · %", "Duration · tasks · days left · %", "期間 · タスク数 · 残り日数 · %"],
        ["ชื่อแผนตามบรรทัดรอง", "Plan name follows the subtitle", "プラン名をサブタイトルに合わせる"],
        ["แก้ชื่อลูกค้า/โครงการใต้หัวข้อ → ชื่อในช่องเลือกแผนเปลี่ยนตาม", "Edit the customer/project line under the title → the plan name updates", "タイトル下の顧客・案件名を編集 → プラン名も変わります"],
        ["สรุปบนเส้นหัวกระดาน", "Summary on the header line", "ヘッダーラインに概要を表示"],
        ["ระยะเวลา · จำนวนงาน · เหลืออีกกี่วัน", "Duration · tasks · days left", "期間 · タスク数 · 残り日数"],
        ["บันทึกทั่วไป", "General note", "一般メモ"],
        ["การ์ดว่าง พิมพ์อะไรก็ได้", "Blank card — write anything", "空のカード — 自由に記入"],
        ["เงื่อนไขการชำระเงิน", "Payment terms", "支払条件"],
        ["มัดจำ · งวด · ส่วนที่เหลือ", "Deposit · installments · balance", "手付金 · 分割 · 残金"],
        ["เอกสารที่ต้องเตรียม", "Documents to prepare", "準備書類"],
        ["รายการเอกสารของลูกค้า / ผู้ขาย", "Document list for buyer / seller", "買主・売主の書類リスト"],
        ["ผู้ติดต่อ", "Contact", "連絡先"],
        ["ชื่อ · ตำแหน่ง · โทร · อีเมล", "Name · position · phone · email", "氏名 · 役職 · 電話 · メール"],
        ["ข้อควรระวัง", "Cautions", "注意事項"],
        ["เรื่องที่ต้องระวัง / ตรวจสอบ", "Things to watch / check", "注意・確認事項"],
        ["บันทึกภายใน", "Internal note", "社内メモ"],
        ["เห็นเฉพาะบนจอ ไม่ออกตอนพิมพ์ / Export", "On screen only — not printed / exported", "画面のみ — 印刷・Export されません"],
        ["เพิ่มบันทึกแบบไหน?", "What kind of note?", "どの種類のメモを追加？"],
        ["ลากเพื่อสลับลำดับ", "Drag to reorder", "ドラッグで並べ替え"],
        ["ทำสำเนา", "Duplicate", "複製"],
        ["ตั้งเป็นบันทึกภายใน (ไม่ออกตอนพิมพ์)", "Make internal (not printed)", "社内メモにする（印刷しない）"],
        ["บันทึกภายใน (ไม่พิมพ์) — คลิกเพื่อให้พิมพ์", "Internal (not printed) — click to print it", "社内メモ（印刷しない）— クリックで印刷対象に"],
        ["🔒 ภายใน · ไม่พิมพ์", "🔒 Internal · not printed", "🔒 社内 · 印刷なし"],
        ["ลบบันทึกแล้ว", "Note deleted", "メモを削除しました"],
        ["หัวข้อบันทึก", "Note title", "メモのタイトル"],
        ["พิมพ์รายละเอียด… (Enter = ขึ้นบรรทัดใหม่)", "Type details… (Enter = new line)", "詳細を入力…（Enter = 改行）"],
        ["บันทึกท้ายกระดาน", "Board notes", "ボードメモ"],
        ["＋ เพิ่มบันทึก", "＋ Add note", "＋ メモを追加"],
        ["เลือกประเภท: ชำระเงิน · เอกสาร · ผู้ติดต่อ ฯลฯ", "Pick a type: payment · documents · contact, etc.", "種類を選択：支払 · 書類 · 連絡先 など"],
        ["หัวข้อ → ไปพิมพ์เนื้อหา · ในเนื้อหา = ขึ้นบรรทัดใหม่", "Title → go to details · in details = new line", "タイトル → 本文へ · 本文内 = 改行"],
        ["ลากสลับลำดับการ์ด", "Drag to reorder cards", "カードをドラッグで並べ替え"],
        ["ทำสำเนาการ์ด", "Duplicate the card", "カードを複製"],
        ["บันทึกภายใน — ไม่ออกตอนพิมพ์ / Export", "Internal note — not printed / exported", "社内メモ — 印刷・Export されません"],
        ["ลบ (กด ↶ ย้อนกลับได้)", "Delete (↶ Undo available)", "削除（↶ で元に戻せます）"],
        ["🏷 แปะรูป ▾", "🏷 Stickers ▾", "🏷 ステッカー ▾"],
        ["แปะรูป: เก็บรูป PNG ไว้แปะบนตาราง", "Stickers: keep PNG images to stick on the table", "ステッカー：PNG 画像を保存して表に貼る"],
        ["🏷 แปะรูป", "🏷 Stickers", "🏷 ステッカー"],
        ["ยังไม่มีรูปแปะ", "No stickers yet", "ステッカーはまだありません"],
        ["กด ＋ เพิ่ม หรือลากไฟล์ PNG มาวางที่นี่", "Press ＋ Add or drop PNG files here", "＋ 追加 を押すか PNG をここにドロップ"],
        ["คลิก = แปะกลางตาราง · ลากไปวางตรงไหนก็ได้", "Click = stick in the middle · drag to place anywhere", "クリック = 中央に貼る · ドラッグで好きな場所へ"],
        ["แปะแล้ว: ลากย้าย · ลากมุมเพื่อย่อขยาย · Delete = ลบ", "Placed: drag to move · drag a corner to resize · Delete = remove", "貼った後：ドラッグで移動 · 角で拡大縮小 · Delete = 削除"],
        ["ลบออกจากคลัง", "Remove from library", "ライブラリから削除"],
        ["เลือกได้เฉพาะไฟล์รูป (แนะนำ PNG พื้นใส)", "Image files only (transparent PNG recommended)", "画像ファイルのみ（透過 PNG 推奨）"],
        ["เพิ่มรูปแปะแล้ว", "Sticker added", "ステッカーを追加しました"],
        ["แปะรูปแล้ว — ลากมุมเพื่อย่อขยาย · Delete = ลบ", "Sticker placed — drag a corner to resize · Delete = remove", "ステッカーを貼りました — 角で拡大縮小 · Delete = 削除"],
        ["แปะรูปไม่ได้", "Couldn't place the sticker", "ステッカーを貼れません"],
        ["ลบรูปแปะออกจากคลังแล้ว (รูปที่แปะไว้ในแผนยังอยู่)", "Removed from the library (placed stickers stay in the plan)", "ライブラリから削除しました（貼ったものはプランに残ります）"],
        ["ลบรูปแปะไม่สำเร็จ", "Couldn't remove the sticker", "ステッカーを削除できません"],
        ["เบราว์เซอร์นี้เก็บรูปแปะไม่ได้", "This browser can't store stickers", "このブラウザではステッカーを保存できません"],
        ["เปิดคลังรูปแปะไม่ได้", "Can't open the sticker library", "ステッカーライブラリを開けません"],
        ["รูปแปะ", "Sticker", "ステッカー"],
        ["ทีม", "Team", "チーム"],
        ["ชุดรูปแปะของทีม (อยู่ในเว็บ)", "Team sticker set (built into the site)", "チームのステッカー（サイト内蔵）"],
        ["ลากที่ว่าง", "Drag on empty area", "空白をドラッグ"],
        ["ลากคลุมเลือกหลายชิ้น (รวม Text / เส้นแนวนอน / รูป) → ลากชิ้นไหนก็ได้ ย้ายทั้งกลุ่ม", "Box-select several items (incl. Text / horizontal lines / images) → drag any one to move the group", "範囲選択で複数選択（テキスト・横線・画像含む）→ どれかをドラッグでまとめて移動"],
        ["เลื่อนตาราง (หรือลากด้วยปุ่มกลางเมาส์)", "Scroll the table (or drag with the middle mouse button)", "表をスクロール（またはマウス中ボタンでドラッグ）"],
        ["ลากคลุม object", "Drag over objects", "オブジェクトを囲む"],
        ["ตรวจคำผิด / คำที่ยังไม่ได้กรอก", "Spell check / unfilled text", "スペル・未入力チェック"],
        ["คำผิด", "Typos", "誤字"],
        ["ไม่สม่ำเสมอ", "Inconsistent", "表記ゆれ"],
        ["ยังไม่ได้กรอก", "Not filled", "未入力"],
        ["↻ ตรวจใหม่", "↻ Re-check", "↻ 再チェック"],
        ["ไม่พบจุดที่น่าจะผิด", "No problems found", "問題は見つかりませんでした"],
        ["คำที่น่าจะผิด", "Possible typos", "誤字の可能性"],
        ["รูปแบบการพิมพ์", "Typing format", "入力の書式"],
        ["เขียนไม่เหมือนกันในแผน", "Written differently in this plan", "プラン内の表記ゆれ"],
        ["ยังไม่ได้กรอก / ยังเป็นค่าเริ่มต้น", "Not filled / still default", "未入力・初期値のまま"],
        ["ขีดเส้นใต้สีส้มใต้คำที่น่าจะผิด", "Orange underline on possible typos", "誤字の可能性にオレンジの下線"],
        ["เส้นหยักแดงของเบราว์เซอร์ (ภาษาอังกฤษ)", "Browser red squiggles (English)", "ブラウザの赤い波線（英語）"],
        ["✓ แก้", "✓ Fix", "✓ 修正"],
        ["↗ ไปที่", "↗ Go to", "↗ 移動"],
        ["ข้าม", "Skip", "スキップ"],
        ["👍 คำนี้ถูก", "👍 It's correct", "👍 正しい"],
        ["จำว่าคำนี้ถูก ไม่ต้องเตือนอีก", "Remember this word as correct", "この語を正しいと記憶"],
        ["✓ เปลี่ยนทั้งแผน", "✓ Change in whole plan", "✓ プラン全体を変更"],
        ["ทั้งแผน", "Whole plan", "プラン全体"],
        ["ยังว่างอยู่", "Still empty", "まだ空です"],
        ["การ์ดบันทึกว่าง", "Empty note card", "空のメモカード"],
        ["เว้นวรรคซ้ำ", "Double space", "スペースの重複"],
        ["มีช่องว่างหน้า / ท้ายข้อความ", "Leading / trailing spaces", "前後に空白があります"],
        ["พิมพ์ เ+เ แทน แ", "Typed เ+เ instead of แ", "แ の代わりに เ+เ"],
        ["พิมพ์ ํ+า แทน ำ", "Typed ํ+า instead of ำ", "ำ の代わりに ํ+า"],
        ["วรรณยุกต์ซ้ำ", "Repeated tone mark", "声調記号の重複"],
        ["คำซ้ำติดกัน", "Repeated word", "語の重複"],
        ["เลขไทยปนเลขอารบิก", "Thai digits mixed with Arabic digits", "タイ数字とアラビア数字の混在"],
        ["หัวข้อแผน", "Plan title", "プランのタイトル"],
        ["บรรทัดรอง", "Subtitle", "サブタイトル"],
        ["สถานะ (⚙ สถานะ)", "Status (⚙ Status)", "ステータス（⚙ ステータス）"],
        ["กล่อง Text (รายละเอียด)", "Text box (detail)", "テキストボックス（詳細）"],
        ["🔎 ตรวจก่อนไหม?", "🔎 Check first?", "🔎 先にチェックしますか？"],
        ["ไม่ต้องถามอีก (จนกว่าจะปิดหน้านี้)", "Don't ask again (until this page is closed)", "今後表示しない（このページを閉じるまで）"],
        ["ทำต่อเลย", "Continue anyway", "このまま続行"],
        ["ตรวจก่อน", "Check first", "先にチェック"],
        ["พบ", "Found", "検出："],
        ["คำที่น่าจะผิด / รูปแบบ", "possible typos / format", "誤字・書式"],
        ["จุด", "items", "件"],
        ["จุด ·", "items ·", "件 ·"],
        ["ไม่มีอะไรต้องแก้", "Nothing to fix", "修正するものはありません"],
        ["ล้าง", "Clear", "クリア"],
        ["แสดงอีกครั้ง", "Show again", "再表示"],
        ["แผงตรวจคำผิด · แก้ทั้งหมด · คลิกไปที่จุดนั้น", "Spell-check panel · fix all · click to jump there", "スペルチェックパネル · 一括修正 · クリックで移動"],
        ["เปิดอยู่", "On", "オン"],
        ["ปิดอยู่", "Off", "オフ"],
        ["ตรวจคำผิด: เปิด", "Spell check: on", "スペルチェック：オン"],
        ["ตรวจคำผิด: ปิด", "Spell check: off", "スペルチェック：オフ"],
        ["ตรวจคำผิด: เปิดอยู่ — คลิกเพื่อปิด · ▾ = ดูรายการ", "Spell check is on — click to turn off · ▾ = list", "スペルチェック オン — クリックでオフ · ▾ = 一覧"],
        ["ตรวจคำผิด: ปิดอยู่ — คลิกเพื่อเปิด", "Spell check is off — click to turn on", "スペルチェック オフ — クリックでオン"],
        ["เปิดรายการตรวจคำผิด", "Open spell-check list", "スペルチェック一覧を開く"],
        ["เปิด / ปิดการตรวจคำผิด", "Turn spell check on / off", "スペルチェックのオン／オフ"],
        ["คำที่ไม่รู้จัก (อาจเป็นชื่อเฉพาะ)", "Unknown words (may be names)", "未知の語（固有名詞の可能性）"],
        ["ไม่มีในพจนานุกรม — ถ้าเป็นชื่อเฉพาะ กด 👍 คำนี้ถูก", "Not in the dictionary — if it's a name, press 👍 It's correct", "辞書にありません — 固有名詞なら 👍 正しい を押してください"],
        ["⏳ กำลังโหลดพจนานุกรมภาษาไทย…", "⏳ Loading the Thai dictionary…", "⏳ タイ語辞書を読み込み中…"],
        ["คลิก = เปิด / ปิด · ▾ = ดูรายการ แก้ทั้งหมด", "Click = on / off · ▾ = list, fix all", "クリック = オン／オフ · ▾ = 一覧・一括修正"],
        ["🔎 กำลังตรวจคำผิดทั้งหน้า…", "🔎 Checking the whole page…", "🔎 ページ全体をチェック中…"],
        ["👁 ตัวอย่างก่อน Export — ทั้งกระดาน", "👁 Export preview — whole board", "👁 エクスポートのプレビュー — ボード全体"],
        ["👁 ตัวอย่างก่อน Export — เฉพาะตาราง", "👁 Export preview — table only", "👁 エクスポートのプレビュー — 表のみ"],
        ["ชื่อไฟล์", "File name", "ファイル名"],
        ["ตั้งให้อัตโนมัติจาก ลูกค้า / ชื่อแผน + วันที่ — แก้ได้", "Auto-named from customer / plan name + date — editable", "顧客 / プラン名 + 日付で自動命名 — 編集できます"],
        ["รูปแบบไฟล์", "File format", "ファイル形式"],
        ["ขนาดกระดาษ (แนวนอน)", "Paper size (landscape)", "用紙サイズ（横）"],
        ["การแบ่งหน้า", "Pages", "ページ分割"],
        ["หน้าเดียว", "Single page", "1 ページ"],
        ["แบ่งตามเดือน", "Split by month", "月ごとに分割"],
        ["ตามที่เห็นบนจอตอนนี้", "As shown on screen now", "現在の画面表示どおり"],
        ["ทั้งช่วงแผน หน้าละหลายเดือนเต็ม ๆ ตามที่เห็นบนจอ — อยากให้หน้าละหลายเดือนขึ้นให้ซูมออกก่อน", "Whole plan range, whole months per page as fits the screen — zoom out first for more months per page", "プラン全期間を、画面に収まる月単位でページ分け — 1 ページの月数を増やすには先にズームアウト"],
        ["ท้ายหน้า", "Page footer", "フッター"],
        ["ใส่เลขหน้า", "Page numbers", "ページ番号"],
        ["ใส่ข้อมูลบริษัท", "Company info", "会社情報"],
        ["⬆ ดาวน์โหลด", "⬆ Download", "⬆ ダウンロード"],
        ["กำลังสร้างตัวอย่าง…", "Creating preview…", "プレビューを作成中…"],
        ["สร้างตัวอย่างไม่สำเร็จ", "Could not create the preview", "プレビューを作成できませんでした"],
        ["ลองอีกครั้ง", "Try again", "もう一度お試しください"],
        ["โหลดไลบรารีไม่ได้ (ใส่โฟลเดอร์ lib/ ไว้ข้าง index.html หรือต่ออินเทอร์เน็ต)", "Could not load the library (put the lib/ folder next to index.html or connect to the internet)", "ライブラリを読み込めません（index.html の隣に lib/ を置くか、インターネットに接続してください）"],
        ["กำลังถ่ายภาพ…", "Capturing…", "キャプチャ中…"],
        ["กำลังสร้างไฟล์…", "Creating file…", "ファイルを作成中…"],
        ["สร้าง PDF ไม่ได้: โหลดไลบรารีไม่สำเร็จ", "Cannot create PDF: library failed to load", "PDF を作成できません：ライブラリの読み込みに失敗"],
        ["📄 PDF", "📄 PDF", "📄 PDF"],
        ["สำรองข้อมูล (ทุกแผนในเครื่อง)", "Backup (all plans on this computer)", "バックアップ（この端末の全プラン）"],
        ["🗄 สำรอง", "🗄 Back up", "🗄 バックアップ"],
        ["♻ กู้คืน", "♻ Restore", "♻ 復元"],
        ["ยังไม่เคยสำรองในเครื่องนี้", "Never backed up on this computer", "この端末ではまだバックアップしていません"],
        ["ยังไม่มีแผนในเครื่องให้สำรอง", "No plans on this computer to back up", "バックアップするプランがありません"],
        ["อ่านไฟล์ไม่ได้: ไม่ใช่ไฟล์ JSON", "Cannot read the file: not a JSON file", "ファイルを読み込めません：JSON ではありません"],
        ["ไฟล์นี้ไม่ใช่ไฟล์สำรองทุกแผน (ไฟล์แผนเดียวให้ใช้ปุ่ม ↓ Import)", "This is not an all-plans backup file (use ↓ Import for a single plan file)", "全プランのバックアップファイルではありません（単一プランは ↓ Import を使用）"],
        ["♻ กู้คืนจากไฟล์สำรอง", "♻ Restore from backup", "♻ バックアップから復元"],
        ["แผนที่เลือกจะถูกเพิ่มเป็นแผนใหม่ — แผนที่มีอยู่ในเครื่องไม่ถูกลบหรือเขียนทับ", "Selected plans are added as new plans — existing plans are never deleted or overwritten", "選択したプランは新しいプランとして追加されます — 既存のプランは削除・上書きされません"],
        ["เลือกทั้งหมด", "Select all", "すべて選択"],
        ["ไม่มีแผนในไฟล์", "No plans in the file", "ファイルにプランがありません"],
        ["มีอยู่แล้ว", "Already here", "既にあります"],
        ["ชื่อซ้ำ → เพิ่มเป็นแผนใหม่", "Same name → added as new", "同名 → 新規追加"],
        ["กู้คืนเทมเพลตของฉันด้วย (เฉพาะที่ยังไม่มี)", "Also restore my templates (only missing ones)", "マイテンプレートも復元（未登録のもののみ）"],
        ["ยังไม่ได้เลือกแผน", "No plan selected", "プランが選択されていません"],
        ["ดูตัวอย่างก่อน · ตั้งชื่อไฟล์ · A3/A4 · แบ่งหน้าตามเดือน", "Preview first · file name · A3/A4 · split by month", "事前プレビュー · ファイル名 · A3/A4 · 月ごとに分割"],
        ["สำรองทุกแผนเป็นไฟล์เดียว · ♻ กู้คืน", "Back up all plans in one file · ♻ restore", "全プランを 1 ファイルにバックアップ · ♻ 復元"],
        ["⭐ ชุดสำเร็จ ▾", "⭐ Presets ▾", "⭐ セット ▾"],
        ["⭐ ชุดสำเร็จ", "⭐ Presets", "⭐ セット"],
        ["ชุดสำเร็จ: เก็บกลุ่ม object ไว้กดวางซ้ำ", "Presets: save groups of objects to place again", "セット：オブジェクトのまとまりを保存して再利用"],
        ["ตั้งชื่อชุด เช่น IEAT EPP Synchronize", "Name the set, e.g. IEAT EPP Synchronize", "セット名（例：IEAT EPP Synchronize）"],
        ["⭐ บันทึก", "⭐ Save", "⭐ 保存"],
        ["ลบชุดนี้", "Delete this set", "このセットを削除"],
        ["ยังไม่มีชุดสำเร็จ", "No presets yet", "セットはまだありません"],
        ["ลากคลุมกล่องงาน เส้น รูป ข้อความ แล้วกดบันทึกด้านบน", "Drag a box around tasks, lines, images or text, then save above", "タスク・線・画像・テキストを範囲選択して上で保存"],
        ["⬆ Export", "⬆ Export", "⬆ エクスポート"],
        ["⬇ Import", "⬇ Import", "⬇ インポート"],
        ["ดาวน์โหลดชุดของฉันเป็นไฟล์", "Download my sets as a file", "マイセットをファイルでダウンロード"],
        ["เพิ่มชุดจากไฟล์", "Add sets from a file", "ファイルからセットを追加"],
        ["คลิก = วางตรงช่วงที่เห็น · ลากไปวาง = วางตรงวัน / แถวที่ปล่อย", "Click = place in view · drag = place at the day / row you drop on", "クリック = 表示中の位置に配置 · ドラッグ = 離した日付/行に配置"],
        ["วางแล้วลากย้ายได้ทั้งชุด · Alt + คลิก = เลือกชิ้นเดียว", "Placed sets move together · Alt + click = pick one piece", "配置後はまとめて移動 · Alt + クリック = 1 個だけ選択"],
        ["ลากคลุม → บันทึกเป็นชุด · คลิก / ลากการ์ดเพื่อวาง", "Box-select → save as a set · click / drag a card to place", "範囲選択 → セット保存 · カードをクリック/ドラッグで配置"],
        ["เลือกชิ้นเดียวในชุด", "Pick one piece of a set", "セット内の 1 個を選択"],
        ["บันทึกที่เลือกเป็นชุดสำเร็จ", "Save the selection as a preset set", "選択をセットとして保存"],
        ["✂ ครอบตัด", "✂ Crop", "✂ トリミング"],
        ["ครอบตัดรูป (ดับเบิลคลิกที่รูปก็ได้)", "Crop the image (or double-click it)", "画像をトリミング（ダブルクリックでも可）"],
        ["✂ ครอบตัดรูป", "✂ Crop image", "✂ 画像をトリミング"],
        ["สัดส่วน", "Ratio", "比率"],
        ["อิสระ", "Free", "自由"],
        ["เดิม", "Original", "元の比率"],
        ["↺ ทั้งรูป", "↺ Whole image", "↺ 全体"],
        ["เลือกทั้งรูป", "Select the whole image", "画像全体を選択"],
        ["ลากกรอบเพื่อย้าย · ลากมุม / ขอบเพื่อปรับขนาด · Enter = ครอบตัด · Esc = ยกเลิก · ครอบแล้วกด Ctrl+Z ย้อนกลับได้", "Drag the frame to move · drag corners / edges to resize · Enter = crop · Esc = cancel · Ctrl+Z to undo", "枠をドラッグで移動 · 角/辺で大きさ調整 · Enter = トリミング · Esc = キャンセル · Ctrl+Z で元に戻す"],
        ["ครอบตัดรูปแล้ว — Ctrl+Z เพื่อย้อนกลับ", "Image cropped — Ctrl+Z to undo", "トリミングしました — Ctrl+Z で元に戻す"],
        ["เปิดรูปเพื่อครอบตัดไม่ได้", "Couldn't open the image for cropping", "トリミング用に画像を開けません"],
        ["ครอบตัดไม่ได้: รูปนี้ถูกป้องกันการแก้ไข", "Can't crop: this image is protected", "トリミングできません：この画像は保護されています"],
        ["ดับเบิลคลิกรูป", "Double-click image", "画像をダブルクリック"],
        ["ครอบตัดรูป (✂ ในแถบเครื่องมือของรูปก็ได้)", "Crop the image (also ✂ on the image toolbar)", "画像をトリミング（画像ツールバーの ✂ でも可）"],
        ["📍 ซ้ายบน", "📍 Top left", "📍 左上"],
        ["📍 กลางบน", "📍 Top center", "📍 中央上"],
        ["📍 ขวาบน", "📍 Top right", "📍 右上"],
        ["📍 ซ้ายกลาง", "📍 Middle left", "📍 左中央"],
        ["📍 กึ่งกลาง", "📍 Center", "📍 中央"],
        ["📍 ขวากลาง", "📍 Middle right", "📍 右中央"],
        ["📍 ซ้ายล่าง", "📍 Bottom left", "📍 左下"],
        ["📍 กลางล่าง", "📍 Bottom center", "📍 中央下"],
        ["📍 ขวาล่าง", "📍 Bottom right", "📍 右下"],
        ["✋ ลากวางตรงไหนก็ได้", "✋ Drop anywhere", "✋ 好きな位置に配置"],
        ["ลากตัวหนังสือ", "Drag the text", "文字をドラッグ"],
        ["ย้ายข้อความในกล่องงาน (ใกล้ขอบ / กลาง ดูดเข้าที่ให้)", "Move text inside a task box (snaps near edges / center)", "タスク内の文字を移動（端・中央に吸着）"],
        ["เล็กลง (Ctrl+Shift+<)", "Smaller (Ctrl+Shift+<)", "小さく (Ctrl+Shift+<)"],
        ["ใหญ่ขึ้น (Ctrl+Shift+>)", "Larger (Ctrl+Shift+>)", "大きく (Ctrl+Shift+>)"],
        ["ขนาดเดิม", "Default size", "元のサイズ"],
        ["คลิกช่องที่พิมพ์ → A− / A+", "Click a text field → A− / A+", "入力欄をクリック → A− / A+"],
        ["ปรับขนาดตัวหนังสือ (ทุกช่องที่พิมพ์ได้)", "Change text size (any editable text)", "文字サイズを変更（入力できる全ての欄）"],
        ["ตัวหนา (Ctrl+B)", "Bold (Ctrl+B)", "太字 (Ctrl+B)"],
        ["ใส่/เอาจุดหน้าประโยค (Ctrl+Shift+8)", "Add/remove bullets (Ctrl+Shift+8)", "箇条書きの点を付ける/外す (Ctrl+Shift+8)"],
        ["ตัวหนา (ทั้งช่องที่กำลังพิมพ์)", "Bold (the whole field being edited)", "太字（編集中の欄全体）"],
        ["ใส่/เอาจุดหน้าประโยค · บรรทัดมีจุด กด Enter = จุดต่อให้", "Add/remove bullets · Enter on a bullet line continues the list", "箇条書きの点を付ける/外す・点のある行でEnter＝次の行にも点"],
        ["คลิกช่องที่พิมพ์ → B / •", "Click a text field → B / •", "入力欄をクリック → B / •"],
        ["หมุนข้อความ (แนวนอน / แนวตั้ง)", "Rotate text (horizontal / vertical)", "文字の向きを変える（横 / 縦）"],
        ["พื้นที่ว่าง", "Empty space", "余白"],
        ["ตัดพื้นที่ว่างบน-ล่าง", "Trim empty space (top / bottom)", "上下の余白を詰める"],
        ["ขยายตารางให้เต็มหน้ากระดาษ (PDF)", "Stretch the table to fill the page (PDF)", "表をページいっぱいに広げる（PDF）"],
        ["ขยายตารางให้เต็มหน้า (พอดี 1 หน้า)", "Stretch the table to fill the page (fit 1 page)", "表をページいっぱいに広げる（1ページに合わせる）"],
        ["บีบช่องว่างใต้หัวแผน / ในช่องบันทึก แล้วให้แถวในตารางสูงขึ้นจนเต็มหน้า", "Removes gaps under the title / in notes, then makes table rows taller to fill the page", "タイトル下・メモ内の余白を詰め、表の行を高くしてページを埋めます"],
        ["ระยะขอบ", "Margin", "余白の幅"],
        ["แคบ", "Narrow", "狭い"],
        ["ปกติ", "Normal", "標準"],
        ["กว้าง", "Wide", "広い"],
        ["กำลังขยายตารางให้เต็มหน้า…", "Fitting the table to the page…", "表をページに合わせています…"],
        ["คลิกช่องที่พิมพ์ → A→", "Click a text field → A→", "入力欄をクリック → A→"],
        ["หมุนข้อความ: แนวนอน → แนวตั้ง ↓ → แนวตั้ง ↑", "Rotate text: horizontal → vertical ↓ → vertical ↑", "文字の向き：横 → 縦↓ → 縦↑"],
        ["ลากซ้าย-ขวาเพื่อย้าย · คลิกเพื่อปรับแต่ง", "Drag left/right to move · Click to customize", "左右にドラッグで移動・クリックで設定"],
        ["เส้นในช่องเส้นวันที่", "Line in the date-line area", "日付線エリアの線"],
        ["ลาก = ย้ายวันที่ · คลิก = เมนูปรับแต่งเส้น", "Drag = change date · Click = line settings", "ドラッグ＝日付を移動・クリック＝線の設定"],
        ["ตัวหนังสือใหญ่ขึ้น / เล็กลง", "Text larger / smaller", "文字を大きく / 小さく"],
        ["ลากเพื่อยืดช่องพิมพ์ · ดับเบิลคลิก = กว้างอัตโนมัติ", "Drag to widen the text field · double-click = auto width", "ドラッグで入力欄の幅を変更 · ダブルクリック = 自動"],
        ["↔ เต็มกล่อง", "↔ Full width", "↔ 全幅"],
        ["ที่จับ ◂ ▸ ข้างข้อความ", "◂ ▸ handles beside the text", "文字横の ◂ ▸"],
        ["ยืดช่องพิมพ์ซ้าย-ขวา (ดับเบิลคลิก = อัตโนมัติ)", "Widen / narrow the text field (double-click = auto)", "入力欄の幅を調整（ダブルクリック = 自動）"],
        ["พิมพ์หัวข้อแผน", "Type the plan title", "プランのタイトルを入力"],
        ["ชื่อลูกค้า / โครงการ", "Customer / project name", "顧客・案件名"],
        ["＋ ข้อมูลโครงการ", "＋ Project info", "＋ プロジェクト情報"],
        ["🗂 หัวกระดาน", "🗂 Board header", "🗂 ボードヘッダー"],
        ["ตั้งค่าหัวกระดาน (ข้อมูลโครงการ · สถานะ · สี · รูปแบบ)", "Header settings (project info · status · color · style)", "ヘッダー設定（情報 · ステータス · 色 · スタイル）"],
        ["ระยะเวลา", "Duration", "期間"],
        ["เดือน", "months", "か月"],
        ["งาน", "tasks", "タスク"],
        ["เหลืออีก", "Days left:", "残り"],
        ["เริ่มอีก", "Starts in", "開始まで"],
        ["วัน", "days", "日"],
        ["ครบกำหนดแล้ว", "Past due", "期限到来"],
        ["หัวกระดาน", "Board header", "ボードヘッダー"],
        ["ตั้งค่า: ข้อมูลโครงการ · สถานะดีล · สี · รูปแบบ", "Settings: project info · deal status · color · style", "設定：情報 · 商談ステータス · 色 · スタイル"],
        ["คลิกป้าย", "Click a chip", "チップをクリック"],
        ["แก้ข้อมูลโครงการ / สถานะดีล", "Edit project info / deal status", "情報・商談ステータスを編集"],
        ["คลิกบรรทัดรอง", "Click the subtitle", "サブタイトルをクリック"],
        ["พิมพ์ชื่อลูกค้า → ชื่อแผนเปลี่ยนตาม", "Type the customer name → the plan name follows", "顧客名を入力 → プラン名も変更"],
        ["แก้ชื่อเสร็จ · Esc = ยกเลิก", "Finish editing · Esc = cancel", "編集完了 · Esc = キャンセル"],
        ["เพิ่มเอง", "Custom", "追加済み"],
        ["เอาออกจากรายการ", "Remove from the list", "リストから削除"],
        ["เลือก ·", "choose ·", "選択 ·"],
        ["ใช้ ·", "use ·", "使用 ·"],
        ["ปิด", "close", "閉じる"],
        ["เพิ่ม \"", "Add \"", "追加「"],
        ["\" ในรายการบทบาท", "\" to roles", "」を役割に"],
        ["\" ในรายการหมวดหมู่", "\" to categories", "」をカテゴリに"],
        ["\" ในรายชื่อ", "\" to names", "」を名前に"],
        ["หรือเลือกสีเอง", "Or pick a custom color", "または色を選ぶ"],
        ["ตัวอย่าง", "Preview", "プレビュー"],
        ["เช่น Contact, Payment, IEAT", "e.g. Contact, Payment, IEAT", "例：Contact, Payment, IEAT"],
        ["คลิกช่อง หรือกด ↓ เพื่อเลือกชื่อที่เคยใช้ · พิมพ์ชื่อใหม่แล้วกด ＋ เพื่อจำไว้", "Click the field or press ↓ to pick a used name · type a new name and press ＋ to remember it", "欄をクリックまたは ↓ で過去の名前を選択 · 新しい名前は ＋ で保存"],
        ["ชื่อบริษัท / ผู้ติดต่อ", "Company / contact name", "会社名 / 担当者"],
        ["บทบาท (เช่น Seller / Buyer)", "Role (e.g. Seller / Buyer)", "役割（例：Seller / Buyer）"],
        ["ชื่อที่เคยใช้", "Previously used names", "使ったことのある名前"],
        ["บทบาท", "Roles", "役割"],
        ["ชื่อหมวดที่เคยใช้", "Previously used categories", "使ったことのあるカテゴリ"],
        ["↑ ↓ เลือก · Enter ใช้คำนี้ · Esc ปิด", "↑ ↓ choose · Enter use · Esc close", "↑ ↓ 選択 · Enter 使用 · Esc 閉じる"],
        ["เพิ่มแถวใหม่ในหมวดนี้?", "Add a new row to this category?", "このカテゴリに新しい行を追加しますか？"],
        ["＋ เพิ่ม", "＋ Add", "＋ 追加"],
        ["ไม่", "No", "いいえ"],
        ["พิมพ์ชื่อแถว / บทบาท / หมวดหมู่", "Typing row names / roles / categories", "行名・役割・カテゴリの入力"],
        ["คลิกช่อง", "Click a field", "欄をクリック"],
        ["พิมพ์ทับคำแนะนำจาง ๆ ได้เลย", "Type right over the grey hint", "グレーのヒントの上にそのまま入力"],
        ["เสร็จ → ไปแถวถัดไป (ช่องเดียวกัน)", "Done → next row (same field)", "完了 → 次の行（同じ欄）"],
        ["แถวสุดท้ายของหมวด = ถามเพิ่มแถวใหม่", "Last row of a category = offer to add a row", "カテゴリの最後の行 = 行の追加を確認"],
        ["ชื่อ → บทบาท → แถวถัดไป", "Name → role → next row", "名前 → 役割 → 次の行"],
        ["ย้อนกลับช่องก่อนหน้า", "Back to the previous field", "前の欄に戻る"],
        ["ขึ้นบรรทัดใหม่ (ชื่อแถว)", "New line (row name)", "改行（行名）"],
        ["เลือกคำที่เคยใช้ · Enter = ใช้คำนั้น", "Choose a used word · Enter = use it", "候補を選択 · Enter = 使用"],
        ["ปิดรายการคำ / ยกเลิก (คืนข้อความเดิม)", "Close the list / cancel (restore text)", "候補を閉じる / 取り消し（元に戻す）"],
        ["รูปภาพ", "Images", "画像"],
        ["วันนี้", "Today", "今日"],
        ["ทั่วไป", "General", "一般"],
        ["ทำซ้ำ (เดินหน้า)", "Redo", "やり直し"],
        ["ค้นหางาน / คำสั่ง", "Search tasks / commands", "タスク・コマンドを検索"],
        ["เปิดหน้าวิธีใช้นี้", "Open this help", "このヘルプを開く"],
        ["เปิด/ปิดเส้นวันนี้", "Show / hide the today line", "今日の線の表示切替"],
        ["ปิดเมนู / เลิกเลือก", "Close menu / deselect", "メニューを閉じる・選択解除"],
        ["เลือก & ย้าย", "Select & move", "選択・移動"],
        ["คลิก", "Click", "クリック"],
        ["เลือก + เปิดเมนูของ object", "Select + open the object menu", "選択してメニューを開く"],
        ["เลือกหลายชิ้น แล้วลากไปพร้อมกัน", "Select several, then drag them together", "複数選択してまとめて移動"],
        ["ลาก", "Drag", "ドラッグ"],
        ["ย้าย · ลากขอบซ้าย/ขวา/บน/ล่าง = ยืดหด", "Move · drag an edge to resize", "移動 · 端をドラッグで伸縮"],
        ["เลื่อนทีละ 1 วัน", "Move by 1 day", "1日ずつ移動"],
        ["ยืด / หด วันจบ", "Stretch / shrink the end date", "終了日を伸縮"],
        ["ย้ายกล่องงานไปแถวบน / ล่าง", "Move the task to the row above / below", "タスクを上下の行へ移動"],
        ["ลบ object ที่เลือก", "Delete the selected objects", "選択したオブジェクトを削除"],
        ["คัดลอก", "Copy", "コピー"],
        ["วาง (ต่อท้ายช่วงวันเดิม)", "Paste (right after the original dates)", "貼り付け（元の期間の後ろ）"],
        ["ทำสำเนาทันที", "Duplicate now", "すぐに複製"],
        ["ดับเบิลคลิก", "Double-click", "ダブルクリック"],
        ["แก้วันที่เป็นตัวเลข", "Edit dates as numbers", "日付を数値で編集"],
        ["คลิกซ้ำ", "Click again", "もう一度クリック"],
        ["พิมพ์ข้อความในกล่อง", "Type text in the box", "ボックス内に入力"],
        ["พิมพ์เสร็จ · Shift+Enter = ขึ้นบรรทัดใหม่", "Finish typing · Shift+Enter = new line", "入力完了 · Shift+Enter = 改行"],
        ["ยกเลิกการพิมพ์ (คืนข้อความเดิม)", "Cancel typing (restore the text)", "入力を取り消し（元に戻す）"],
        ["รูปภาพ & ไฟล์", "Images & files", "画像・ファイル"],
        ["ลากไฟล์รูป", "Drag an image file", "画像ファイルをドラッグ"],
        ["วางรูปในตาราง", "Place an image in the table", "表に画像を配置"],
        ["วางรูปที่คัดลอกไว้", "Paste a copied image", "コピーした画像を貼り付け"],
        ["วางบนกล่อง", "Drop on a box", "ボックスにドロップ"],
        ["ใส่รูปในกล่องงาน", "Add an image to a task", "タスクに画像を追加"],
        ["คลิกโลโก้", "Click the logo", "ロゴをクリック"],
        ["เปลี่ยนโลโก้ของแผน", "Change the plan logo", "プランのロゴを変更"],
        ["ลากไฟล์ .json", "Drag a .json file", ".json ファイルをドラッグ"],
        ["Import แผน", "Import a plan", "プランをインポート"],
        ["⌨ วิธีใช้ & ปุ่มลัด", "⌨ Help & shortcuts", "⌨ 使い方・ショートカット"],
        ["ปุ่มลัดไม่ทำงานตอนกำลังพิมพ์ในช่องข้อความ", "Shortcuts are off while typing in a text field", "テキスト入力中はショートカットは無効です"],
        ["⌨ วิธีใช้", "⌨ Help", "⌨ 使い方"],
        ["วิธีใช้ & ปุ่มลัด (กด ?)", "Help & shortcuts (press ?)", "使い方・ショートカット（? キー）"],
        ["แสดงเส้นวันนี้", "Show the today line", "今日の線を表示"],
        ["ยังไม่รองรับไฟล์ HEIC (รูปจาก iPhone) — แปลงเป็น JPG/PNG ก่อน", "HEIC files (iPhone photos) aren't supported yet — convert to JPG/PNG first", "HEIC（iPhone の写真）は未対応です — JPG/PNG に変換してください"],
        ["ไฟล์นี้ไม่ใช่รูปภาพ", "This file is not an image", "画像ファイルではありません"],
        ["ไฟล์รูปใหญ่เกินไป (เกิน 30 MB)", "The image file is too large (over 30 MB)", "画像が大きすぎます（30 MB 超）"],
        ["เปิดรูปนี้ไม่ได้ (ไฟล์เสียหรือเป็นชนิดที่เบราว์เซอร์ไม่รองรับ)", "Can't open this image (damaged or unsupported format)", "画像を開けません（破損または未対応の形式）"],
        ["รูปภาพ: วางรูปในตาราง, รูปในกล่องงาน, โลโก้แผน", "Images: in the table, in tasks, plan logo", "画像：表に配置、タスク内、プランのロゴ"],
        ["ล็อกรูปแล้ว — ปลดล็อกได้ที่ปุ่ม 🖼 รูปภาพ", "Image locked — unlock it from the 🖼 Images button", "画像をロックしました — 🖼 画像 ボタンから解除できます"],
        ["วางรูปในตารางแล้ว — ลากย้าย/ลากมุมเพื่อปรับขนาด", "Image placed — drag to move, drag a corner to resize", "画像を配置しました — ドラッグで移動、角で拡大縮小"],
        ["รูปในแผนนี้มีขนาดรวมค่อนข้างใหญ่ — ถ้าบันทึกไม่ได้ ให้ลบรูปที่ไม่ใช้ หรือ Export เก็บไว้", "Images in this plan are fairly large — if saving fails, remove unused images or Export a copy", "このプランの画像は合計サイズが大きめです — 保存できない場合は不要な画像を削除するか Export してください"],
        ["🖼 วางรูปในตาราง · วางบนกล่องงาน = ใส่รูปในกล่อง · 📄 ไฟล์ .json = Import", "🖼 Drop to place in the table · on a task = image in the task · 📄 .json file = Import", "🖼 ドロップで表に配置 · タスク上 = タスク内の画像 · 📄 .json = インポート"],
        ["วางได้เฉพาะไฟล์รูปภาพ หรือไฟล์แผน .json", "Only image files or .json plan files can be dropped", "画像ファイルか .json プランファイルのみドロップできます"],
        ["อ่านไฟล์ไม่ได้: ไฟล์ไม่ใช่ JSON ที่ถูกต้อง", "Can't read the file: not valid JSON", "ファイルを読み込めません：正しい JSON ではありません"],
        ["ในคลิปบอร์ดยังไม่มีรูป — คัดลอกรูปก่อน แล้วลองใหม่", "No image in the clipboard — copy an image and try again", "クリップボードに画像がありません — 画像をコピーして再試行してください"],
        ["เบราว์เซอร์ไม่อนุญาตให้อ่านคลิปบอร์ด — ลองกด Ctrl+V แทน", "The browser blocked clipboard access — try Ctrl+V instead", "ブラウザがクリップボードへのアクセスを許可していません — Ctrl+V を使ってください"],
        ["ปลดล็อกรูปแล้ว", "Images unlocked", "画像のロックを解除しました"],
        ["คลิกเพื่อเปลี่ยนโลโก้ของแผนนี้ (หรือลากรูปมาวาง)", "Click to change this plan's logo (or drop an image)", "クリックでこのプランのロゴを変更（画像のドロップも可）"],
        ["เปลี่ยนโลโก้ของแผนนี้แล้ว", "Plan logo changed", "プランのロゴを変更しました"],
        ["ในคลิปบอร์ดยังไม่มีรูป", "No image in the clipboard", "クリップボードに画像がありません"],
        ["เบราว์เซอร์ไม่อนุญาตให้อ่านคลิปบอร์ด — ใช้ 'เลือกรูปโลโก้…' แทน", "The browser blocked clipboard access — use 'Choose logo image…' instead", "クリップボードを読み込めません —「ロゴ画像を選択…」を使ってください"],
        ["กลับไปใช้โลโก้บริษัทแล้ว", "Switched back to the company logo", "会社のロゴに戻しました"],
        ["ใช้เฉพาะแผนนี้ · ลากไฟล์รูปมาวางบนโลโก้ก็ได้", "This plan only · you can also drop an image on the logo", "このプランのみ · ロゴに画像をドロップしても変更できます"],
        ["แนะนำรูปพื้นใส (PNG) จะดูเนียนกว่า", "A transparent PNG looks best", "背景透過の PNG がおすすめです"],
        ["ใส่รูปในกล่องงานแล้ว", "Image added to the task", "タスクに画像を追加しました"],
        ["ยังไม่มีกล่องงานในแผนนี้ — กด ＋ งาน ก่อน", "No tasks in this plan yet — press ＋ Task first", "タスクがまだありません — 先に ＋ タスク を押してください"],
        ["คลิกกล่องงานที่ต้องการใส่รูป (Esc = ยกเลิก)", "Click the task to add the image to (Esc = cancel)", "画像を入れるタスクをクリック（Esc = キャンセル）"],
        ["ไฟล์ไม่ถูกต้อง", "Invalid file", "無効なファイルです"],
        ["ไฟล์นี้ไม่ใช่ไฟล์แผนของ Property Schedule Plan", "This is not a Property Schedule Plan file", "Property Schedule Plan のファイルではありません"],
        ["ไฟล์ไม่มีข้อมูลหมวดหมู่", "The file has no categories", "カテゴリのデータがありません"],
        ["ไฟล์ไม่มีข้อมูลบทบาท", "The file has no roles", "役割のデータがありません"],
        ["กรุณาเลือกไฟล์แผนนามสกุล .json เท่านั้น", "Please choose a .json plan file only", ".json のプランファイルを選択してください"],
        ["↺ ใช้สีตามบทบาท", "↺ Use the role color", "↺ 役割の色を使う"],
        ["สีที่เลือกจะเปลี่ยนเฉพาะ object นี้", "The color applies to this object only", "色はこのオブジェクトだけに適用されます"],
        ["รูปแบบ", "Style", "スタイル"],
        ["แก้วันที่เป็นตัวเลข (หรือดับเบิลคลิกที่ object)", "Edit dates as numbers (or double-click the object)", "日付を数値で編集（またはオブジェクトをダブルクリック）"],
        ["เปิดช่องพิมพ์ใหญ่ (หรือคลิกที่กล่องซ้ำอีกครั้งเพื่อพิมพ์ในกล่อง)", "Open a large text box (or click the box again to type in it)", "大きな入力欄を開く（またはもう一度クリックしてボックス内で入力）"],
        ["เลือกสีเอง", "Custom color", "色を選ぶ"],
        ["สีช่องของแถวใหม่ (เลือกก่อนกดเพิ่ม)", "Cell color for new rows (choose before adding)", "新しい行のセルの色（追加前に選択）"],
        ["ตั้งค่าสีแถวนี้", "Row color settings", "この行の色設定"],
        ["ใช้ทั้งหมวด", "Apply to the whole category", "カテゴリ全体に適用"],
        ["ตั้งเป็นค่าเริ่มต้น", "Set as default", "既定に設定"],
        ["คืนค่าเริ่มต้น", "Reset to default", "既定に戻す"],
        ["ใช้สีนี้กับทุกแถวในหมวดแล้ว", "Applied this color to every row in the category", "カテゴリ内のすべての行に適用しました"],
        ["ตั้งเป็นค่าเริ่มต้นแล้ว (ใช้กับแถวใหม่ และแถวที่ยังไม่ได้ตั้งสี)", "Set as default (for new rows and rows without a color)", "既定に設定しました（新しい行と色未設定の行に適用）"],
        ["สีตัวอักษรหมวดหมู่", "Category text color", "カテゴリの文字色"],
        ["บันทึกอัตโนมัติ", "Auto-save", "自動保存"],
        ["แผนบันทึกในเบราว์เซอร์นี้อัตโนมัติ — ถ้าจะใช้เครื่องอื่น ให้ Export ไฟล์ .json", "Plans auto-save in this browser — to use another computer, Export a .json file", "プランはこのブラウザに自動保存されます — 別の PC で使うには .json を Export してください"],
        ["รอบันทึก…", "Saving…", "保存待ち…"],
        ["บันทึกไม่ได้", "Can't save", "保存できません"],
        ["บันทึกในเบราว์เซอร์ไม่ได้ (พื้นที่เต็มหรือถูกปิดไว้) — คลิกเพื่อ Export ไฟล์เก็บไว้", "Can't save in the browser (storage full or blocked) — click to Export a copy", "ブラウザに保存できません（容量不足または無効）— クリックして Export"],
        ["ลบแล้ว — กด Ctrl+Z เพื่อย้อน", "Deleted — press Ctrl+Z to undo", "削除しました — Ctrl+Z で元に戻せます"],
        ["คัดลอกแล้ว — กด Ctrl+V เพื่อวาง", "Copied — press Ctrl+V to paste", "コピーしました — Ctrl+V で貼り付け"],
        ["วางแล้ว", "Pasted", "貼り付けました"],
        ["ทำสำเนาแล้ว", "Duplicated", "複製しました"],
        ["เทมเพลต", "Templates", "テンプレート"],
        ["ค้นหาเทมเพลต", "Search templates", "テンプレートを検索"],
        ["Export เทมเพลตนี้ (.json)", "Export this template (.json)", "このテンプレートを Export (.json)"],
        ["บันทึกแผนนี้เป็นเทมเพลต", "Save this plan as a template", "このプランをテンプレートとして保存"],
        ["⬆ Export เทมเพลต (.json)", "⬆ Export templates (.json)", "⬆ テンプレートを Export (.json)"],
        ["⬇ Import เทมเพลต (.json)", "⬇ Import templates (.json)", "⬇ テンプレートを Import (.json)"],
        ["ย้ายไปใช้เครื่องอื่น: Export ไฟล์ .json แล้วกด Import ที่เครื่องนั้น", "To use on another computer: Export a .json file and Import it there", "別の PC で使う：.json を Export して、その PC で Import"],
        ["กู้คืนเทมเพลตพร้อมใช้แล้ว", "Built-in templates restored", "組み込みテンプレートを復元しました"],
        ["ยังไม่มีเทมเพลตให้ Export", "No templates to export yet", "Export するテンプレートがありません"],
        ["ไฟล์นี้ไม่มีเทมเพลต", "This file has no templates", "このファイルにはテンプレートがありません"],
        ["บันทึกไม่สำเร็จ: พื้นที่ในเบราว์เซอร์เต็ม (รูปในแผนอาจใหญ่เกินไป)", "Save failed: browser storage is full (plan images may be too large)", "保存できませんでした：ブラウザの容量が不足しています（画像が大きすぎる可能性）"],
        ["เก็บหน้าตาแผนที่เปิดอยู่ทั้งหมด (หมวดหมู่ แถว สี object ข้อความ บันทึก ช่วงวันที่) ไว้ในเบราว์เซอร์นี้ — ถ้าจะใช้ที่เครื่องอื่น ให้กด \"⬆ Export เทมเพลต\" แล้วไป Import ที่เครื่องนั้น", "Saves the whole current plan layout (categories, rows, colors, objects, text, notes, dates) in this browser — to use it on another computer, press \"⬆ Export templates\" and Import it there", "現在のプラン全体（カテゴリ・行・色・オブジェクト・テキスト・メモ・期間）をこのブラウザに保存します — 別の PC では「⬆ テンプレートを Export」して Import してください"],
        ["ต้องการลบเทมเพลต", "Delete the template", "テンプレートを削除しますか"],
        ["ลบรูปบนกระดานทั้งหมด", "Delete all board images", "ボード上の画像をすべて削除"],
        ["✏️ แก้ข้อความ", "✏️ Edit text", "✏️ テキストを編集"],
        ["Enter = บันทึก · Shift+Enter = ขึ้นบรรทัดใหม่ · Esc = ยกเลิก", "Enter = save · Shift+Enter = new line · Esc = cancel", "Enter = 保存 · Shift+Enter = 改行 · Esc = キャンセル"],
        ["📅 แก้วันที่กล่องงาน", "📅 Edit task dates", "📅 タスクの日付を編集"],
        ["📅 แก้วันที่ของเส้น", "📅 Edit line date", "📅 線の日付を編集"],
        ["เคล็ดลับ: คลิกกล่องแล้วกด ← → เลื่อนทีละวัน · Shift + ← → ยืด/หด · ↑ ↓ ย้ายแถว", "Tip: click the box, then ← → move one day · Shift + ← → stretch/shrink · ↑ ↓ change row", "ヒント：ボックスをクリックして ← → で1日移動 · Shift + ← → で伸縮 · ↑ ↓ で行を移動"],
        ["เคล็ดลับ: คลิกเส้นแล้วกด ← → เลื่อนทีละวัน", "Tip: click the line, then ← → move one day", "ヒント：線をクリックして ← → で1日移動"],
        ["กรุณาเลือกวันที่ให้ครบ", "Please choose both dates", "日付を入力してください"],
        ["วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น", "End date must not be before start date", "終了日は開始日より前にできません"],
        ["รูปภาพในกล่อง", "Image in box", "ボックス内の画像"],
        ["🖼 ใส่รูป", "🖼 Add image", "🖼 画像を追加"],
        ["🔄 เปลี่ยนรูป", "🔄 Change image", "🔄 画像を変更"],
        ["🗑 ลบรูป", "🗑 Remove image", "🗑 画像を削除"],
        ["ไอคอน", "Icon", "アイコン"],
        ["เต็มกล่อง", "Fill", "全体に表示"],
        ["พอดีกล่อง", "Fit", "収める"],
        ["หรือลากรูปมาวางบนกล่อง / กด Ctrl+V ตอนเปิดเมนูนี้", "Or drop an image on the box / press Ctrl+V while this menu is open", "またはボックスに画像をドロップ / このメニューを開いたまま Ctrl+V"],
        ["โลโก้ของแผนนี้", "Logo of this plan", "このプランのロゴ"],
        ["🖼 เลือกรูปโลโก้…", "🖼 Choose logo image…", "🖼 ロゴ画像を選択…"],
        ["📋 วางรูปจากคลิปบอร์ด", "📋 Paste image from clipboard", "📋 クリップボードから貼り付け"],
        ["↺ ใช้โลโก้บริษัท (ค่าเริ่มต้น)", "↺ Use company logo (default)", "↺ 会社のロゴを使用（既定）"],
        ["💾 บันทึกโลโก้นี้ลงเครื่อง", "💾 Save this logo", "💾 このロゴを保存"],
        ["⚙ บทบาท", "⚙ Roles", "⚙ 役割"],
        ["วันเริ่มต้น", "Start", "開始日"],
        ["วันสิ้นสุด", "End", "終了日"],
        ["◀ +1เดือน", "◀ +1 month", "◀ +1ヶ月"],
        ["-เดือน", "-month", "-1ヶ月"],
        ["+1เดือน ▶", "+1 month ▶", "+1ヶ月 ▶"],
        ["เพิ่ม / ลด เดือน", "Add / remove months", "月の追加 / 削除"],
        ["เพิ่มเดือนด้านหน้า", "Add a month at the start", "先頭に1ヶ月追加"],
        ["ลดเดือนด้านหน้า", "Remove a month at the start", "先頭から1ヶ月削除"],
        ["ลดเดือนด้านท้าย", "Remove a month at the end", "末尾から1ヶ月削除"],
        ["เพิ่มเดือนด้านท้าย", "Add a month at the end", "末尾に1ヶ月追加"],
        ["เป็นเทมเพลตพร้อมใช้ที่ติดมากับเว็บ — จะถูกซ่อนจากเครื่องนี้ กดกู้คืนได้ภายหลังที่ท้ายเมนูเทมเพลต", "This is a built-in template — it will be hidden on this device. You can restore it later from the bottom of the template menu", "標準テンプレートです — この端末で非表示になります。テンプレートメニュー下部から復元できます"],
        ["ลบแล้วกู้คืนไม่ได้ ถ้ายังอยากเก็บไว้ ให้กด ⬆ Export ก่อน", "This can't be undone. Press ⬆ Export first if you want to keep it", "元に戻せません。残したい場合は先に⬆エクスポートしてください"],
        ["สถานะใช้ร่วมกันทุกแผน — เพิ่ม/แก้ที่นี่ แผนอื่นจะได้ด้วย", "Statuses are shared by all plans — changes here apply to every plan", "ステータスは全プラン共通 — ここでの変更は全プランに反映"],
        ["เลือกวิธีเริ่มทำงาน", "Choose how to start", "開始方法を選択"],
        ["ยินดีต้อนรับ — เลือกวิธีเริ่มทำแผนแรกของคุณ", "Welcome — choose how to start your first plan", "ようこそ — 最初のプランの作り方を選んでください"],
        ["ทำต่อจากแผนเดิม", "Continue previous plan", "前回のプランを続ける"],
        ["เปิดแผนล่าสุดที่ทำค้างไว้", "Open the plan you were working on", "作業中のプランを開く"],
        ["เริ่มจากเทมเพลต", "Start from a template", "テンプレートから開始"],
        ["เลือกแผนสำเร็จรูป แล้วแก้วันที่และรายละเอียดเพิ่ม เร็วที่สุด", "Pick a ready-made plan, then adjust dates and details — the fastest way", "既成のプランを選び、日付と詳細を調整 — 最速の方法"],
        ["สร้างแผนเปล่า", "Create a blank plan", "空のプランを作成"],
        ["เริ่มจากกระดานว่าง จัดหมวดหมู่และขั้นตอนเองทั้งหมด", "Start from an empty board and set everything up yourself", "空のボードから全て自分で作成"],
        ["เปิดไฟล์ .json", "Open a .json file", "jsonファイルを開く"],
        ["เปิดไฟล์แผนที่ Export ไว้ หรือได้รับจากเพื่อนร่วมงาน", "Open a plan file you exported or received from a colleague", "エクスポートしたプランや同僚から受け取ったファイルを開く"],
        ["หรือเปิดแผนอื่นล่าสุด", "Or open another recent plan", "または最近の別のプランを開く"],
        ["ลากไฟล์ .json มาวางบนหน้านี้เพื่อเปิดได้เลย", "Drag a .json file onto this page to open it", "jsonファイルをこのページにドラッグして開く"],
        ["ไม่ต้องแสดงหน้านี้ตอนเปิดเว็บ (กด 🏠 บน Toolbar เพื่อกลับมาได้)", "Don't show this page on startup (press 🏠 on the toolbar to return)", "起動時にこのページを表示しない（ツールバーの🏠で戻れます）"],
        ["✕ ปิด", "✕ Close", "✕ 閉じる"],
        ["← กลับ", "← Back", "← 戻る"],
        ["📋 เริ่มจากเทมเพลต", "📋 Start from a template", "📋 テンプレートから開始"],
        ["เลือกเทมเพลต ตั้งชื่อแผน แล้วกดสร้าง", "Choose a template, name the plan, then create", "テンプレートを選び、プラン名を付けて作成"],
        ["ชื่อแผน (เช่น ชื่อลูกค้า / โครงการ)", "Plan name (e.g. customer / project)", "プラン名（例：顧客名 / プロジェクト）"],
        ["พร้อมใช้", "Built-in", "標準"],
        ["＋ สร้างแผนเปล่า", "＋ Create a blank plan", "＋ 空のプランを作成"],
        ["ได้กระดานว่าง 3 หมวดหมู่ ช่วงเวลา 12 เดือนนับจากเดือนนี้", "An empty board with 3 categories, 12 months from this month", "3カテゴリの空のボード、今月から12ヶ月"],
        ["หน้าเริ่มต้น", "Start page", "スタートページ"],
        ["ไปที่กระดาน (Esc)", "Go to board (Esc)", "ボードへ (Esc)"],
        ["แผนใหม่", "New plan", "新しいプラン"],
        ["📋 เทมเพลต", "📋 Templates", "📋 テンプレート"],
        ["เทมเพลตแผน", "Plan templates", "プランテンプレート"],
        ["ค้นหาเทมเพลต...", "Search templates...", "テンプレートを検索..."],
        ["ในโค้ด", "In code", "コード内"],
        ["เครื่องนี้", "This device", "この端末"],
        ["＋ บันทึกแผนนี้เป็นเทมเพลต", "＋ Save this plan as template", "＋ このプランをテンプレート保存"],
        ["เอาไฟล์ที่ดาวน์โหลดไปวางทับในโฟลเดอร์โปรเจกต์ แล้ว git push → ทุกเครื่องจะเห็นเทมเพลต", "Replace the file in the project folder with the download, then git push → every device will see the templates", "ダウンロードしたファイルをプロジェクトに上書きして git push → 全端末でテンプレートが使えます"],
        ["บันทึกเป็นเทมเพลต", "Save as template", "テンプレートとして保存"],
        ["ชื่อเทมเพลต", "Template name", "テンプレート名"],
        ["สร้างเป็นแผนใหม่", "Create as new plan", "新しいプランとして作成"],
        ["แทนที่แผนที่เปิดอยู่", "Replace the current plan", "現在のプランを置き換え"],
        ["ใช้เทมเพลต", "Use template", "テンプレートを使用"],
        ["ลบเทมเพลต", "Delete template", "テンプレートを削除"],
        ["ใช้เทมเพลตนี้", "Use this template", "このテンプレートを使用"],
        ["เทมเพลตใหม่", "New template", "新しいテンプレート"],
        ["ค้นหาชื่อแผน...", "Search plans...", "プラン名を検索..."],
        ["ค้นหาชื่อแผน", "Search plans", "プラン名を検索"],
        ["ไม่พบแผนที่ค้นหา", "No matching plans", "該当するプランがありません"],
        ["↓ Import .json", "↓ Import .json", "↓ .jsonをインポート"],
        ["ล้างคำค้นหา", "Clear search", "検索をクリア"],
        ["เพิ่มกล่องงาน", "Add task", "タスクを追加"],
        ["ชื่องาน", "Task name", "タスク名"],
        ["แถว", "Row", "行"],
        ["วันเริ่มต้น (ขอบซ้าย)", "Start date (left edge)", "開始日（左端）"],
        ["วันสิ้นสุด (ขอบขวา)", "End date (right edge)", "終了日（右端）"],
        ["สร้าง", "Create", "作成"],
        ["＋ เพิ่มงานในหมวดนี้", "＋ Add task in this category", "＋ このカテゴリにタスク追加"],
        ["＋ เพิ่มงานในแถวนี้", "＋ Add task in this row", "＋ この行にタスク追加"],
        ["กรุณาเลือกวันที่", "Please select dates", "日付を選択してください"],
        ["วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น", "End date must not be before start date", "終了日は開始日より前にできません"],
        ["ขนาดโดยรวม", "Zoom", "ズーム"],
        ["พิมพ์ A3", "Print A3", "A3印刷"],
        ["🖨 พิมพ์ A3", "🖨 Print A3", "🖨 A3印刷"],
        ["ธีม", "Theme", "テーマ"],
        ["ธีมมืด", "Dark theme", "ダークテーマ"],
        ["ธีมสว่าง", "Light theme", "ライトテーマ"],
        ["เปลี่ยนภาษา", "Change language", "言語を切り替え"],
        ["⋯ เพิ่มเติม", "⋯ More", "⋯ その他"],
        ["ค้นหา/คำสั่ง... (Ctrl+K)", "Search / command... (Ctrl+K)", "検索 / コマンド... (Ctrl+K)"],
        ["ค้นหา", "Search", "検索"],
        ["🔎 ตรวจคำผิด", "🔎 Spell check", "🔎 スペルチェック"],
        ["ตรวจคำผิด: เปิดอยู่ (กดเพื่อปิด)", "Spell check: on (click to turn off)", "スペルチェック: オン（クリックでオフ）"],
        ["ตรวจคำผิด: ปิดอยู่ (กดเพื่อเปิด)", "Spell check: off (click to turn on)", "スペルチェック: オフ（クリックでオン）"],
        ["เปิด/ปิด ตรวจคำผิด", "Toggle spell check", "スペルチェックの切り替え"],
        ["▧ Export รูปภาพ", "▧ Export image", "▧ 画像をエクスポート"],
        ["▧ Export เฉพาะตาราง", "▧ Export table only", "▧ 表のみエクスポート"],
        ["Export รูปภาพ", "Export image", "画像をエクスポート"],
        ["Export เฉพาะตาราง", "Export table only", "表のみエクスポート"],
        ["กำลังสร้างไฟล์...", "Creating file...", "ファイルを作成中..."],
        ["📂 ไฟล์แผน (.json)", "📂 Plan file (.json)", "📂 プランファイル (.json)"],
        ["🖼 รูปภาพ", "🖼 Image", "🖼 画像"],
        ["ลากไฟล์รูปมาวาง หรือกด Ctrl+V เพื่อแปะรูปได้ด้วย", "You can also drag an image in or press Ctrl+V", "画像をドラッグするか Ctrl+V でも貼り付けできます"],
        ["วางรูปเพื่อแปะลงกระดาน", "Drop to place the image on the board", "ドロップしてボードに貼り付け"],
        ["ไม่พบไฟล์รูปภาพ", "No image file found", "画像ファイルが見つかりません"],
        ["แปะรูปแล้ว", "Image added", "画像を貼り付けました"],
        ["แปะรูปไม่ได้: ไม่พบ text.js ตัวใหม่", "Cannot add image: the new text.js was not found", "画像を貼り付けできません: 新しい text.js が見つかりません"],
        ["Import ไฟล์แผนไม่ได้: ไม่พบ io.js ตัวใหม่", "Cannot import plan file: the new io.js was not found", "プランファイルをインポートできません: 新しい io.js が見つかりません"],
        [
            "รูปค่อนข้างใหญ่ ถ้าแปะหลายรูป แผนอาจบันทึกในเบราว์เซอร์ไม่ได้ — ควร Export เก็บไว้",
            "The image is fairly large. With many images the plan may not fit in browser storage — please export a backup.",
            "画像が大きめです。多数貼るとブラウザに保存できない場合があります。エクスポートして保存してください。"
        ],
        ["สีพื้นหลัง", "Background color", "背景色"],
        ["↺ คืนสัดส่วนรูป", "↺ Reset aspect ratio", "↺ 縦横比を戻す"],
        ["ไฟล์แผน (ใช้ Import กลับได้)", "Plan file (can be imported)", "プランファイル（インポート可）"],
        ["💾 ไฟล์แผน (.json)", "💾 Plan file (.json)", "💾 プランファイル (.json)"],
        ["รูปภาพทั้งกระดาน", "Whole board image", "ボード全体の画像"],
        ["เฉพาะตาราง", "Table only", "表のみ"],
        ["Export ไฟล์แผนไม่ได้: ไม่พบ io.js ตัวใหม่", "Cannot export plan file: the new io.js was not found", "プランファイルをエクスポートできません: 新しい io.js が見つかりません"],
        ["Export เสร็จแล้ว", "Export complete", "エクスポート完了"],
        ["Export ไม่สำเร็จ ลองอีกครั้ง", "Export failed. Please try again.", "エクスポートに失敗しました。もう一度お試しください。"],
        [
            "Export ไม่ได้: โหลดไลบรารีไม่สำเร็จ (ใส่โฟลเดอร์ lib/ ไว้ข้าง index.html หรือต่ออินเทอร์เน็ต)",
            "Export unavailable: libraries failed to load (put the lib/ folder next to index.html or connect to the internet)",
            "エクスポートできません: ライブラリを読み込めません（index.html と同じ場所に lib/ フォルダーを置くか、インターネットに接続してください）"
        ],

        /* ---------- board ---------- */
        ["หมวดหมู่", "Category", "カテゴリー"],
        ["เลื่อนหมวดหมู่", "Scroll categories", "カテゴリーをスクロール"],
        ["เลื่อนตารางไปทางซ้าย", "Scroll left", "左へスクロール"],
        ["เลื่อนตารางไปทางขวา", "Scroll right", "右へスクロール"],
        ["เลื่อนตารางซ้ายขวา", "Scroll timeline", "タイムラインをスクロール"],
        ["เส้นวันที่ / Bracket", "Date lines / Bracket", "日付線 / ブラケット"],
        ["เลื่อนบันทึกท้ายกระดาน", "Scroll notes", "メモをスクロール"],
        ["＋ เพิ่มบันทึกท้ายกระดาน", "＋ Add note", "＋ メモを追加"],
        ["ลบบันทึก", "Delete note", "メモを削除"],
        ["วันที่อัปเดตแผน", "Plan update date", "プラン更新日"],

        /* ---------- category / row ---------- */
        ["ตั้งค่าหมวดหมู่", "Category settings", "カテゴリー設定"],
        ["สีหมวดหมู่", "Category color", "カテゴリーの色"],
        ["ลบหมวดหมู่", "Delete category", "カテゴリーを削除"],
        ["ตั้งค่าแถว", "Row settings", "行の設定"],
        ["＋ เพิ่มแถว", "＋ Add row", "＋ 行を追加"],
        ["ลบแถว", "Delete row", "行を削除"],
        ["เพิ่มหมวดหมู่", "Add category", "カテゴリーを追加"],
        ["ชื่อหมวดหมู่", "Category name", "カテゴリー名"],

        /* ---------- roles ---------- */
        ["จัดการบทบาท", "Manage roles", "役割の管理"],
        ["＋ เพิ่มบทบาท", "＋ Add role", "＋ 役割を追加"],

        /* ---------- object / text menu ---------- */
        ["วันที่", "Date", "日付"],
        ["ข้อความ", "Text", "テキスト"],
        ["บทบาท (Role)", "Role", "役割"],
        ["สี", "Color", "色"],
        ["สีเส้น", "Line color", "線の色"],
        ["ความหนาเส้น", "Line width", "線の太さ"],
        ["ไอคอน", "Icon", "アイコン"],
        ["แสดงหัวข้อ", "Show title", "見出しを表示"],
        ["ชั้น: อยู่หน้า", "Layer: front", "レイヤー: 前面"],
        ["ชั้น: อยู่หลัง", "Layer: back", "レイヤー: 背面"],
        ["ปักซ้าย", "Pin left", "左ピン"],
        ["ปักขวา", "Pin right", "右ピン"],
        ["แสดงรายละเอียด (detail)", "Show detail", "詳細を表示"],
        ["รายละเอียด...", "Detail...", "詳細..."],
        ["เส้นแนวตั้ง", "Vertical line", "縦線"],
        ["ไม่มี", "None", "なし"],
        ["เส้นประ", "Dashed", "破線"],
        ["เส้นทึบ", "Solid", "実線"],
        ["สีข้อความ", "Text color", "文字色"],
        ["สีเข้ม", "Dark", "濃い色"],
        ["สีอ่อน", "Light", "淡い色"],
        ["เลือกสีข้อความเอง", "Custom text color", "文字色を選択"],
        ["เลือกสีพื้นหลังเอง", "Custom background color", "背景色を選択"],
        ["ไม่มีสีพื้นหลัง (ใส)", "No background (transparent)", "背景なし（透明）"],
        ["ใส", "Clear", "透明"],
        ["ตำแหน่งข้อความ", "Text position", "文字の位置"],
        ["⧉ ทำสำเนา", "⧉ Duplicate", "⧉ 複製"],
        ["🗑 ลบ", "🗑 Delete", "🗑 削除"],
        ["ลบ", "Delete", "削除"],

        /* ---------- text box ---------- */
        ["พิมพ์ข้อความ...", "Type text...", "テキストを入力..."],
        ["ติดแม่เหล็กกับ object", "Snap to object", "オブジェクトに吸着"],
        ["ยกเลิกแม่เหล็ก", "Release snap", "吸着を解除"],
        ["ตั้งค่า", "Settings", "設定"],
        ["ลบกล่องข้อความ", "Delete text box", "テキストボックスを削除"],

        /* ---------- dialogs ---------- */
        ["ยกเลิก", "Cancel", "キャンセル"],
        ["หมุนจอเป็นแนวนอน เพื่อดูแผนได้ใหญ่ขึ้น", "Rotate to landscape for a larger view", "横向きにすると大きく表示できます"],
        ["ย้อนกลับ (Ctrl+Z)", "Undo (Ctrl+Z)", "元に戻す (Ctrl+Z)"],
        ["ทำซ้ำ (Ctrl+Y)", "Redo (Ctrl+Y)", "やり直し (Ctrl+Y)"],
        ["↶ ย้อนกลับ", "↶ Undo", "↶ 元に戻す"],
        ["↷ ทำซ้ำ", "↷ Redo", "↷ やり直し"],
        ["ย้อนกลับ", "Undo", "元に戻す"],
        ["ทำซ้ำ", "Redo", "やり直し"],
        ["คำสั่ง", "Commands", "コマンド"],
        ["ในแผน", "In this plan", "プラン内"],
        ["เพิ่มกล่องงาน", "Add task", "タスクを追加"],
        ["เพิ่มเส้นวันที่", "Add date line", "日付線を追加"],
        ["เพิ่มเส้นแนวนอน", "Add horizontal line", "横線を追加"],
        ["เพิ่มกล่อง Text", "Add text box", "テキストボックスを追加"],
        ["เพิ่มบันทึกท้ายกระดาน", "Add note", "メモを追加"],
        ["ซูมเข้า", "Zoom in", "ズームイン"],
        ["ซูมออก", "Zoom out", "ズームアウト"],
        ["ไปที่วันนี้", "Go to today", "今日へ移動"],
        ["Export ไฟล์แผน (.json)", "Export plan file (.json)", "プランファイルをエクスポート (.json)"],
        ["Export รูปภาพทั้งกระดาน (PNG)", "Export whole board (PNG)", "ボード全体をエクスポート (PNG)"],
        ["Export รูปภาพทั้งกระดาน (PDF)", "Export whole board (PDF)", "ボード全体をエクスポート (PDF)"],
        ["Export เฉพาะตาราง (PNG)", "Export table only (PNG)", "表のみエクスポート (PNG)"],
        ["Export เฉพาะตาราง (PDF)", "Export table only (PDF)", "表のみエクスポート (PDF)"],
        ["Import ไฟล์แผน (.json)", "Import plan file (.json)", "プランファイルをインポート (.json)"],
        ["Import รูปภาพ", "Import image", "画像をインポート"],
        ["ตั้งค่าการพิมพ์", "Print settings", "印刷設定"],
        ["สลับแผน", "Switch plan", "プランを切り替え"],
        ["สลับธีม สว่าง/มืด", "Toggle light/dark theme", "ライト/ダークテーマ切替"],
        ["เปิด/ปิด ตรวจคำผิด", "Toggle spell check", "スペルチェックの切り替え"],
        ["กล่องงาน", "Task", "タスク"],
        ["เส้นวันที่", "Date line", "日付線"],
        ["เส้นแนวตั้ง", "Vertical line", "縦線"],
        ["กล่อง Text", "Text box", "テキストボックス"],
        ["(กล่อง Text ว่าง)", "(empty text box)", "（空のテキストボックス）"],
        ["ชื่อแผน", "Plan name", "プラン名"],
        ["อยู่นอกช่วงวันเริ่มต้น–วันสิ้นสุดของตาราง", "Outside the timeline start–end range", "タイムラインの期間外です"],
        [
            "↑ ↓ เลือก · Enter ทำ · Esc ปิด · พิมพ์วันที่ เช่น 15/3/2027 เพื่อไปวันนั้น",
            "↑ ↓ select · Enter run · Esc close · type a date like 15/3/2027 to jump there",
            "↑ ↓ 選択 · Enter 実行 · Esc 閉じる · 15/3/2027 のように日付を入力するとその日へ移動"
        ],
        ["พิมพ์ A3 แนวนอน", "Print A3 landscape", "A3横向き印刷"],
        ["เนื้อหา", "Content", "内容"],
        ["ทั้งกระดาน", "Whole board", "ボード全体"],
        ["ขนาด", "Size", "サイズ"],
        ["พอดี 1 หน้า", "Fit to 1 page", "1ページに収める"],
        ["กำหนดเอง", "Custom", "カスタム"],
        ["🖨 พิมพ์", "🖨 Print", "🖨 印刷"],
        ["พอดีในหน้าเดียว", "Fits on one page", "1ページに収まります"],
        ["ตั้งค่าการพิมพ์ (ทั้งกระดาน)", "Print settings (whole board)", "印刷設定（ボード全体）"],
        ["ตั้งค่าการพิมพ์ (เฉพาะตาราง)", "Print settings (table only)", "印刷設定（表のみ）"],
        ["กำลังเตรียมหน้าพิมพ์...", "Preparing print...", "印刷を準備中..."],
        ["กำลังเปิดหน้าต่างพิมพ์...", "Opening print dialog...", "印刷ダイアログを開いています..."],
        ["เตรียมหน้าพิมพ์ไม่สำเร็จ ลองอีกครั้ง", "Could not prepare print. Please try again.", "印刷の準備に失敗しました。もう一度お試しください。"],
        ["พิมพ์ไม่ได้: ไม่พบ export-image.js ตัวใหม่", "Cannot print: the new export-image.js was not found", "印刷できません: 新しい export-image.js が見つかりません"],
        [
            "พิมพ์ไม่ได้: โหลดไลบรารีไม่สำเร็จ (ใส่โฟลเดอร์ lib/ ไว้ข้าง index.html หรือต่ออินเทอร์เน็ต)",
            "Cannot print: libraries failed to load (put the lib/ folder next to index.html or connect to the internet)",
            "印刷できません: ライブラリを読み込めません（index.html と同じ場所に lib/ フォルダーを置くか、インターネットに接続してください）"
        ],
        ["Import ไฟล์แผน", "Import plan file", "プランファイルをインポート"],
        ["ไฟล์:", "File:", "ファイル:"],
        ["เพิ่มเป็นแผนใหม่", "Add as a new plan", "新しいプランとして追加"],
        ["แทนที่แผนที่เปิดอยู่ (", "Replace the open plan (", "開いているプランを置き換え（"],
        [")", ")", "）"],
        ["ชื่อแผนใหม่", "New plan name", "新しいプラン名"],
        ["ข้อมูลเดิมของแผนนี้จะถูกแทนที่ทั้งหมด", "All current data in this plan will be replaced", "このプランの現在のデータはすべて置き換えられます"],
        ["Import ไม่สำเร็จ: ข้อมูลในไฟล์บางส่วนไม่ถูกต้อง", "Import failed: some data in the file is invalid", "インポート失敗: ファイルの一部のデータが不正です"],
        ["ตกลง", "OK", "OK"],
        ["บันทึก", "Save", "保存"],
        ["＋ เพิ่มแผนใหม่", "＋ New plan", "＋ 新しいプラン"],
        ["เพิ่มแผนใหม่", "New plan", "新しいプラン"],
        ["ชื่อแผน", "Plan name", "プラン名"],
        ["เริ่มจากแผนเปล่า", "Start from a blank plan", "空のプランから作成"],
        ["คัดลอกจากแผนที่เปิดอยู่", "Copy the current plan", "現在のプランをコピー"],
        ["สร้างแผน", "Create plan", "プランを作成"],
        ["กรุณาตั้งชื่อแผน", "Please enter a plan name", "プラン名を入力してください"],
        ["เปลี่ยนชื่อแผนแล้ว", "Plan renamed", "プラン名を変更しました"],
        ["ต้องการลบแผน", "Delete plan", "プラン"],
        ["ใช่ไหม?", "?", "を削除しますか？"],
        [
            "ลบแล้วกู้คืนไม่ได้ ถ้ายังอยากเก็บไว้ ให้ Export ก่อน",
            "This cannot be undone. Export first if you want to keep it.",
            "削除すると元に戻せません。残したい場合は先にエクスポートしてください。"
        ],
        [
            "ต้องมีอย่างน้อย 1 แผน ลบแผนสุดท้ายไม่ได้",
            "At least 1 plan is required. The last plan cannot be deleted.",
            "プランは最低1つ必要です。最後のプランは削除できません。"
        ],
        ["ระบบแผนกำลังโหลด ลองกดอีกครั้ง", "Plans are loading. Please try again.", "プランを読み込み中です。もう一度お試しください。"],
        [
            "ระบบแผนใช้ไม่ได้: ไม่พบ io.js ตัวใหม่ (ดูลำดับ <script> ใน index.html)",
            "Plans unavailable: the new io.js was not found (check the <script> order in index.html)",
            "プラン機能が使えません: 新しい io.js が見つかりません（index.html の <script> の順番を確認してください）"
        ],
        ["เปิดแผนนี้ไม่สำเร็จ ข้อมูลบางส่วนเสียหาย", "Could not open this plan. Some data is damaged.", "このプランを開けませんでした。データの一部が破損しています。"],
        [
            "บันทึกแผนในเบราว์เซอร์ไม่ได้ (พื้นที่เต็มหรือถูกปิดไว้) — ควร Export เก็บไว้",
            "Could not save plans in this browser (storage full or blocked). Please export a backup.",
            "ブラウザにプランを保存できません（容量不足または無効）。エクスポートして保存してください。"
        ],
        [
            "เบราว์เซอร์นี้ไม่ให้เก็บข้อมูล แผนจะไม่ถูกบันทึกเมื่อปิดหน้า — ควร Export เก็บไว้",
            "This browser blocks storage. Plans won't be kept after closing. Please export a backup.",
            "このブラウザは保存を許可していません。閉じるとプランは消えます。エクスポートして保存してください。"
        ]
    ];


    const MONTHS = {
        th: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."],
        en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    };

    const MONTH_RE =
        MONTHS.th.map(name => name.replace(/\./g, "\\.")).join("|");


    /* ข้อความที่มีส่วนเปลี่ยนได้ (ชื่อแผน / ตัวเลข / วันที่) */

    const PATTERNS = [

        /* หัวเดือนบนตาราง: "ม.ค. 2026" */
        {
            re: new RegExp(`^(${MONTH_RE}) (\\d{4})$`),
            en: m => `${monthEn(m[1])} ${m[2]}`,
            ja: m => `${m[2]}年${monthIndex(m[1]) + 1}月`
        },

        /* วันที่แบบไทย (พ.ศ.): "6 ม.ค. 2569" */
        {
            re: new RegExp(`^(\\d{1,2}) (${MONTH_RE}) (\\d{4})$`),
            en: m => `${m[1]} ${monthEn(m[2])} ${Number(m[3]) - 543}`,
            ja: m => `${Number(m[3]) - 543}年${monthIndex(m[2]) + 1}月${m[1]}日`
        },

        /* ปุ่มพิมพ์: "23% • 1 หน้า" */
        {
            re: /^(\d+)% • (\d+) หน้า$/,
            en: m => `${m[1]}% • ${m[2]} page${m[2] === "1" ? "" : "s"}`,
            ja: m => `${m[1]}% • ${m[2]}ページ`
        },

        /* รายชื่อแผน: "แก้ไขล่าสุด 1/10/2026 10:04" */
        {
            re: /^แก้ไขล่าสุด (.+)$/,
            en: m => `Last edited ${m[1]}`,
            ja: m => `最終更新 ${m[1]}`
        },

        /* toast ของ image-import.js */
        {
            re: /^แปะรูปแล้ว (\d+) รูป$/,
            en: m => `Added ${m[1]} images`,
            ja: m => `${m[1]}枚の画像を貼り付けました`
        },
        {
            re: /^เปิดรูป "(.*)" ไม่ได้$/,
            en: m => `Could not open image "${m[1]}"`,
            ja: m => `画像「${m[1]}」を開けませんでした`
        },
        {
            re: /^รูป "(.*)" ใหญ่เกิน (\d+) MB$/,
            en: m => `Image "${m[1]}" is larger than ${m[2]} MB`,
            ja: m => `画像「${m[1]}」が${m[2]}MBを超えています`
        },

        /* print-a3.js: "2 × 1 หน้า (ต่อกัน) · 400 × 200 mm" */
        {
            re: /^(\d+) × (\d+) หน้า \(ต่อกัน\) · (.+)$/,
            en: m => `${m[1]} × ${m[2]} pages (tiled) · ${m[3]}`,
            ja: m => `${m[1]} × ${m[2]}ページ（分割） · ${m[3]}`
        },
        {
            re: /^พอดีในหน้าเดียว · (.+)$/,
            en: m => `Fits on one page · ${m[1]}`,
            ja: m => `1ページに収まります · ${m[1]}`
        },

        /* search.js */
        {
            re: /^ไม่พบ "(.*)"$/,
            en: m => `No results for "${m[1]}"`,
            ja: m => `「${m[1]}」は見つかりません`
        },
        {
            re: /^แถวในหมวด (.*)$/,
            en: m => `Row in ${m[1]}`,
            ja: m => `${m[1]} の行`
        },
        {
            re: /^บันทึกท้ายกระดาน · (.*)$/,
            en: m => `Note · ${m[1]}`,
            ja: m => `メモ · ${m[1]}`
        },
        {
            re: /^ไปที่วันที่ (.*)$/,
            en: m => `Go to ${m[1]}`,
            ja: m => `${m[1]} へ移動`
        },

        /* toast ของ plans.js */
        {
            re: /^Import เป็นแผนใหม่ "(.*)" แล้ว$/,
            en: m => `Imported as new plan "${m[1]}"`,
            ja: m => `新しいプラン「${m[1]}」としてインポートしました`
        },
        {
            re: /^แทนที่แผน "(.*)" ด้วยไฟล์แล้ว$/,
            en: m => `Replaced plan "${m[1]}" with the file`,
            ja: m => `プラン「${m[1]}」をファイルで置き換えました`
        },
        {
            re: /^เปิดแผน "(.*)"$/,
            en: m => `Opened plan "${m[1]}"`,
            ja: m => `プラン「${m[1]}」を開きました`
        },
        {
            re: /^สร้างแผน "(.*)" แล้ว$/,
            en: m => `Created plan "${m[1]}"`,
            ja: m => `プラン「${m[1]}」を作成しました`
        },
        {
            re: /^ลบแผน "(.*)" แล้ว$/,
            en: m => `Deleted plan "${m[1]}"`,
            ja: m => `プラン「${m[1]}」を削除しました`
        },
        {
            re: /^วางรูป (\d+) รูปในตารางแล้ว$/,
            en: m => `Placed ${m[1]} images in the table`,
            ja: m => `${m[1]} 枚の画像を表に配置しました`
        },
        {
            re: /^ปลดล็อกรูปบนกระดาน \((\d+)\)$/,
            en: m => `Unlock board images (${m[1]})`,
            ja: m => `ボード画像のロック解除 (${m[1]})`
        },
        {
            re: /^ลบ (\d+) ชิ้นแล้ว — กด Ctrl\+Z เพื่อย้อน$/,
            en: m => `Deleted ${m[1]} items — press Ctrl+Z to undo`,
            ja: m => `${m[1]} 件を削除しました — Ctrl+Z で元に戻せます`
        },
        {
            re: /^คัดลอก (\d+) ชิ้นแล้ว — กด Ctrl\+V เพื่อวาง$/,
            en: m => `Copied ${m[1]} items — press Ctrl+V to paste`,
            ja: m => `${m[1]} 件をコピーしました — Ctrl+V で貼り付け`
        },
        {
            re: /^วาง (\d+) ชิ้นแล้ว$/,
            en: m => `Pasted ${m[1]} items`,
            ja: m => `${m[1]} 件を貼り付けました`
        },
        {
            re: /^ทำสำเนา (\d+) ชิ้นแล้ว$/,
            en: m => `Duplicated ${m[1]} items`,
            ja: m => `${m[1]} 件を複製しました`
        },
        {
            re: /^บันทึกแล้ว (\d{1,2}:\d{2})$/,
            en: m => `Saved ${m[1]}`,
            ja: m => `保存済み ${m[1]}`
        },
        {
            re: /^(\d+) วัน$/,
            en: m => `${m[1]} days`,
            ja: m => `${m[1]}日`
        },
        {
            re: /^📅 แก้วันที่ · (.+)$/,
            en: m => `📅 Edit dates · ${m[1]}`,
            ja: m => `📅 日付を編集 · ${m[1]}`
        },
        {
            re: /^รวม (\d+) วัน$/,
            en: m => `Total ${m[1]} days`,
            ja: m => `合計 ${m[1]} 日`
        },
        {
            re: /^รวม (\d+) วัน · บางส่วนอยู่นอกช่วงวันที่ของตาราง$/,
            en: m => `Total ${m[1]} days · partly outside the table's date range`,
            ja: m => `合計 ${m[1]} 日 · 一部が表の期間外です`
        },
        {
            re: /^พบ (\d+) จาก (\d+) แผน$/,
            en: m => `Found ${m[1]} of ${m[2]} plans`,
            ja: m => `${m[2]} 件中 ${m[1]} 件のプラン`
        },
        {
            re: /^(\d+) หมวด · (\d+) (?:object|รายการ)(.*)$/,
            en: m => `${m[1]} categories · ${m[2]} items${m[3]}`,
            ja: m => `${m[1]} カテゴリ · ${m[2]} 項目${m[3]}`
        },
        {
            re: /^บันทึกเทมเพลต "(.*)" แล้ว$/,
            en: m => `Saved template "${m[1]}"`,
            ja: m => `テンプレート「${m[1]}」を保存しました`
        },
        {
            re: /^ใช้เทมเพลต "(.*)"$/,
            en: m => `Use template "${m[1]}"`,
            ja: m => `テンプレート「${m[1]}」を使用`
        },
        {
            re: /^สร้างแผน(?:ใหม่)? "(.*)" จากเทมเพลตแล้ว$/,
            en: m => `Created plan "${m[1]}" from the template`,
            ja: m => `テンプレートからプラン「${m[1]}」を作成しました`
        },
        {
            re: /^ลบเทมเพลต "(.*)" แล้ว$/,
            en: m => `Deleted template "${m[1]}"`,
            ja: m => `テンプレート「${m[1]}」を削除しました`
        },
        {
            re: /^Export เทมเพลต "(.*)" แล้ว$/,
            en: m => `Exported template "${m[1]}"`,
            ja: m => `テンプレート「${m[1]}」を Export しました`
        },
        {
            re: /^Export เทมเพลต (\d+) อันแล้ว$/,
            en: m => `Exported ${m[1]} templates`,
            ja: m => `${m[1]} 件のテンプレートを Export しました`
        },
        {
            re: /^Import เทมเพลตแล้ว \((.*)\)$/,
            en: m => `Imported templates (${m[1]})`,
            ja: m => `テンプレートを Import しました (${m[1]})`
        },
        {
            re: /^Import ไม่สำเร็จ: (.*)$/,
            en: m => `Import failed: ${m[1]}`,
            ja: m => `Import に失敗しました：${m[1]}`
        },
        {
            re: /^บันทึกไฟล์แผน "(.*)" เป็นเทมเพลตแล้ว$/,
            en: m => `Saved plan file "${m[1]}" as a template`,
            ja: m => `プランファイル「${m[1]}」をテンプレートとして保存しました`
        },
        {
            re: /^เทมเพลตเสียหาย: (.*)$/,
            en: m => `Template is damaged: ${m[1]}`,
            ja: m => `テンプレートが破損しています：${m[1]}`
        },
        {
            re: /^เปิดไฟล์ไม่ได้: (.*)$/,
            en: m => `Can't open the file: ${m[1]}`,
            ja: m => `ファイルを開けません：${m[1]}`
        },
        {
            re: /^เปิดไฟล์ "(.*)" เป็นแผนใหม่แล้ว$/,
            en: m => `Opened file "${m[1]}" as a new plan`,
            ja: m => `ファイル「${m[1]}」を新しいプランとして開きました`
        },
        {
            re: /^เพิ่ม "(.*)" ใน(รายการบทบาท|รายการหมวดหมู่|รายชื่อ)แล้ว$/,
            en: m => `Added "${m[1]}" to ${m[2] === 'รายการบทบาท' ? 'roles' : m[2] === 'รายการหมวดหมู่' ? 'categories' : 'names'}`,
            ja: m => `「${m[1]}」を${m[2] === 'รายการบทบาท' ? '役割' : m[2] === 'รายการหมวดหมู่' ? 'カテゴリ' : '名前'}に追加しました`
        },
        {
            re: /^ลูกค้า: (.*)$/,
            en: m => `Customer: ${m[1]}`,
            ja: m => `顧客：${m[1]}`
        },
        {
            re: /^ที่ตั้ง: (.*)$/,
            en: m => `Location: ${m[1]}`,
            ja: m => `所在地：${m[1]}`
        },
        {
            re: /^ขนาดที่ดิน: (.*)$/,
            en: m => `Land size: ${m[1]}`,
            ja: m => `土地面積：${m[1]}`
        },
        {
            re: /^เซลผู้ดูแล: (.*)$/,
            en: m => `Sales owner: ${m[1]}`,
            ja: m => `担当営業：${m[1]}`
        },
        {
            re: /^เพิ่มรูปแปะ (\d+) รูปแล้ว$/,
            en: m => `Added ${m[1]} stickers`,
            ja: m => `${m[1]} 枚のステッカーを追加しました`
        },
        {
            re: /^เลือก (\d+) ชิ้น$/,
            en: m => `${m[1]} selected`,
            ja: m => `${m[1]} 件選択`
        },
        {
            re: /^เลือก (\d+) ชิ้น — ลากชิ้นไหนก็ได้เพื่อย้ายทั้งกลุ่ม · Delete = ลบ$/,
            en: m => `${m[1]} selected — drag any one to move the group · Delete = remove`,
            ja: m => `${m[1]} 件選択 — どれかをドラッグでまとめて移動 · Delete = 削除`
        },
        {
            re: /^✓ แก้ทั้งหมด \((\d+)\)$/,
            en: m => `✓ Fix all (${m[1]})`,
            ja: m => `✓ すべて修正 (${m[1]})`
        },
        {
            re: /^แก้แล้ว (\d+) จุด — กด Ctrl\+Z เพื่อย้อน$/,
            en: m => `Fixed ${m[1]} items — press Ctrl+Z to undo`,
            ja: m => `${m[1]} 件を修正しました — Ctrl+Z で元に戻せます`
        },
        {
            re: /^ยังเป็น "(.*)"$/,
            en: m => `Still "${m[1]}"`,
            ja: m => `まだ「${m[1]}」のままです`
        },
        {
            re: /^ใช้ "(.*)" (\d+) ที่ · "(.*)" (\d+) ที่$/,
            en: m => `"${m[1]}" used ${m[2]}× · "${m[3]}" ${m[4]}×`,
            ja: m => `「${m[1]}」${m[2]} 箇所 · 「${m[3]}」${m[4]} 箇所`
        },
        {
            re: /^คำที่จำว่าถูก (\d+) คำ · ข้ามไว้ (\d+)$/,
            en: m => `${m[1]} words remembered · ${m[2]} skipped`,
            ja: m => `記憶した語 ${m[1]} · スキップ ${m[2]}`
        },
        {
            re: /^คำที่จำว่าถูก (\d+) คำ$/,
            en: m => `${m[1]} words remembered`,
            ja: m => `記憶した語 ${m[1]}`
        },
        {
            re: /^· ข้ามไว้ (\d+)$/,
            en: m => `· ${m[1]} skipped`,
            ja: m => `· スキップ ${m[1]}`
        },
        {
            re: /^แถว · (.*) \(ชื่อ\)$/,
            en: m => `Row · ${m[1]} (name)`,
            ja: m => `行 · ${m[1]}（名前）`
        },
        {
            re: /^แถว · (.*) \(บทบาท\)$/,
            en: m => `Row · ${m[1]} (role)`,
            ja: m => `行 · ${m[1]}（役割）`
        },
        {
            re: /^บันทึก(.*) \(หัวข้อ\)$/,
            en: m => `Note${m[1]} (title)`,
            ja: m => `メモ${m[1]}（タイトル）`
        },
        {
            re: /^บันทึก(.*) \(เนื้อหา\)$/,
            en: m => `Note${m[1]} (body)`,
            ja: m => `メモ${m[1]}（本文）`
        },
        {
            re: /^หัวกระดาน · (.*)$/,
            en: m => `Board header · ${m[1]}`,
            ja: m => `ボードヘッダー · ${m[1]}`
        },
        {
            re: /^ตรวจเสร็จ — พบจุดที่น่าจะผิด (\d+) จุด \(ขีดเส้นสีส้มไว้แล้ว\)(?: · ยังไม่ได้กรอก (\d+) จุด)?$/,
            en: m => `Done — ${m[1]} possible problems (underlined in orange)${m[2] ? ` · ${m[2]} not filled` : ""}`,
            ja: m => `完了 — 問題の可能性 ${m[1]} 件（オレンジの下線）${m[2] ? ` · 未入力 ${m[2]} 件` : ""}`
        },
        {
            re: /^ตรวจเสร็จ — ไม่พบคำผิด ✅(?: · ยังไม่ได้กรอก (\d+) จุด)?$/,
            en: m => `Done — no typos found ✅${m[1] ? ` · ${m[1]} not filled` : ""}`,
            ja: m => `完了 — 誤字は見つかりませんでした ✅${m[1] ? ` · 未入力 ${m[1]} 件` : ""}`
        },
        {
            re: /^↔ (\d+)% ของกล่อง$/,
            en: m => `↔ ${m[1]}% of the box`,
            ja: m => `↔ ボックスの ${m[1]}%`
        }
    ];


    function monthIndex(thai) {

        return MONTHS.th.indexOf(thai);
    }


    function monthEn(thai) {

        return MONTHS.en[monthIndex(thai)] || thai;
    }


    const LOOKUP = new Map(
        DICT.map(([th, en, ja]) => [th, { en, ja }])
    );


    /* =====================================================
       TRANSLATE
    ===================================================== */

    let currentLang = "th";


    function translateCore(text) {

        if (currentLang === "th") {
            return text;
        }

        const hit = LOOKUP.get(text);

        if (hit) {
            return hit[currentLang];
        }

        for (const pattern of PATTERNS) {

            const match = text.match(pattern.re);

            if (match) {
                return pattern[currentLang](match);
            }
        }

        return text;
    }


    /* เก็บช่องว่างหน้า/หลังไว้เหมือนเดิม */
    function translateText(text) {

        const match =
            /^(\s*)([\s\S]*?)(\s*)$/.exec(text);

        if (!match || !match[2]) {
            return text;
        }

        const out =
            translateCore(match[2]);

        return out === match[2]
            ? text
            : match[1] + out + match[3];
    }


    /* ข้ามข้อความที่ผู้ใช้พิมพ์เอง */
    function isUserContent(element) {

        return !!(
            element &&
            element.closest(
                '[contenteditable="true"], textarea, script, style, .zg-text-content'
            )
        );
    }


    /* ต้นฉบับภาษาไทย + ค่าที่เราเขียนลงไปล่าสุด */
    const textOriginal = new WeakMap();
    const textWritten = new WeakMap();

    const attrOriginal = new WeakMap();   // element → { attr: original }
    const attrWritten = new WeakMap();    // element → { attr: written }


    function processTextNode(node) {

        if (isUserContent(node.parentElement)) {
            return;
        }

        const current = node.nodeValue;

        let original = textOriginal.get(node);

        /* โค้ดอื่นเปลี่ยนข้อความเอง → ถือเป็นต้นฉบับใหม่ */
        if (original === undefined || current !== textWritten.get(node)) {

            original = current;

            textOriginal.set(node, original);
        }

        const out = translateText(original);

        textWritten.set(node, out);

        if (out !== current) {
            node.nodeValue = out;
        }
    }


    function processAttr(element, attr) {

        if (!element.hasAttribute(attr)) {
            return;
        }

        const current = element.getAttribute(attr);

        const originals = attrOriginal.get(element) || {};
        const written = attrWritten.get(element) || {};

        let original = originals[attr];

        if (original === undefined || current !== written[attr]) {

            original = current;

            originals[attr] = original;
        }

        const out = translateText(original);

        written[attr] = out;

        attrOriginal.set(element, originals);
        attrWritten.set(element, written);

        if (out !== current) {
            element.setAttribute(attr, out);
        }
    }


    function processElement(element) {

        if (element.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        if (element.matches("script, style")) {
            return;
        }

        ATTRS.forEach(attr => processAttr(element, attr));
    }


    function processTree(root) {

        if (root.nodeType === Node.TEXT_NODE) {

            processTextNode(root);

            return;
        }

        if (root.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        processElement(root);

        const walker =
            document.createTreeWalker(
                root,
                NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
            );

        let node = walker.nextNode();

        while (node) {

            if (node.nodeType === Node.TEXT_NODE) {
                processTextNode(node);
            } else {
                processElement(node);
            }

            node = walker.nextNode();
        }
    }


    /* =====================================================
       OBSERVER
    ===================================================== */

    const observer =
        new MutationObserver(records => {

            for (const record of records) {

                if (record.type === "childList") {

                    record.addedNodes.forEach(processTree);

                } else if (record.type === "characterData") {

                    processTextNode(record.target);

                } else if (record.type === "attributes") {

                    processAttr(record.target, record.attributeName);
                }
            }
        });


    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ATTRS
    });


    /* =====================================================
       SWITCH
    ===================================================== */

    function readSaved() {

        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            return null;
        }
    }


    function save(value) {

        try {
            localStorage.setItem(STORAGE_KEY, value);
        } catch (error) {
            /* เก็บไม่ได้ก็ยังสลับภาษาได้ในหน้านี้ */
        }
    }


    function updateButton() {

        if (!button) {
            return;
        }

        /* ป้ายปุ่มตั้งเองตรงนี้ ไม่ผ่านพจนานุกรม */
        const label = `🌐 ${LANG_LABEL[currentLang]}`;

        const textNode =
            Array.from(button.childNodes).find(
                node => node.nodeType === Node.TEXT_NODE && node.nodeValue.includes("🌐")
            );

        if (textNode) {

            textNode.nodeValue = label;

            textWritten.set(textNode, label);
            textOriginal.set(textNode, label);

        } else {

            button.textContent = label;
        }

        if (!button.hasAttribute("title")) {
            button.setAttribute("title", "เปลี่ยนภาษา");
        }
    }


    function setLang(lang) {

        currentLang =
            LANGS.includes(lang) ? lang : "th";

        document.documentElement.lang = currentLang;

        processTree(document.body);

        updateButton();
    }


    if (button) {

        button.addEventListener("click", () => {

            const next =
                LANGS[(LANGS.indexOf(currentLang) + 1) % LANGS.length];

            setLang(next);

            save(next);
        });
    }


    setLang(readSaved() || "th");


    window.ZGLang = {

        get() {
            return currentLang;
        },

        set(lang) {
            setLang(lang);
            save(currentLang);
        }
    };

})();