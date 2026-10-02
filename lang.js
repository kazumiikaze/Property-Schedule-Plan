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