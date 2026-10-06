/**
 * BACKEND DONASI BENCANA ALAM
 * Tempel di Spreadsheet: Extensions > Apps Script.
 * Setelah itu: Deploy > New deployment > Web app
 *   Execute as: Me  |  Who has access: Anyone
 */

var SHEET_NAME = "Donasi";        // nama sheet (dibuat otomatis)
var TARGET = 100000000;           // target dana (Rp) - ubah sesuai kebutuhan
var MAX_LIST = 20;                // jumlah donatur terbaru yang ditampilkan
var HEADERS = ["Waktu", "Nama", "Telepon", "Program", "Nominal", "Pesan", "Anonim", "Status"];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#0f2a3d").setFontColor("#ffffff");
    sh.setFrozenRows(1);
    sh.getRange("C:C").setNumberFormat("@");   // telepon sebagai teks
    sh.getRange("E:E").setNumberFormat("#,##0");
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Cegah formula injection di Spreadsheet
function safe_(v) {
  v = String(v == null ? "" : v);
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function doGet() {
  try {
    var sh = getSheet_();
    var last = sh.getLastRow();
    var rows = last > 1 ? sh.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];

    var total = 0, count = 0, top = 0, list = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var amt = Number(r[4]) || 0;
      var status = String(r[7] || "").toLowerCase();
      if (!amt || status === "ditolak") continue;
      total += amt;
      count++;
      if (amt > top) top = amt;
      var anon = r[6] === true || String(r[6]).toLowerCase() === "true" || String(r[6]).toLowerCase() === "ya";
      var t = r[0] instanceof Date ? r[0].toISOString() : String(r[0]);
      list.push({
        name: anon ? "Hamba Allah" : String(r[1]),
        anon: anon,
        program: String(r[3]),
        amount: amt,
        note: String(r[5]).replace(/^'/, ""),
        time: t
      });
    }
    list = list.reverse().slice(0, MAX_LIST);   // terbaru dulu
    return json_({ success: true, total: total, count: count, top: top, target: TARGET, donors: list });
  } catch (err) {
    return json_({ success: false, message: "Terjadi kesalahan server." });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var d = JSON.parse(e.postData.contents);

    var name = String(d.name || "").trim().substring(0, 60);
    var phone = String(d.phone || "").replace(/\D/g, "");
    var program = String(d.program || "").trim().substring(0, 40);
    var amount = Math.floor(Number(d.amount));
    var note = String(d.note || "").trim().substring(0, 200);
    var anon = d.anon === true;

    if (name.length < 2) return json_({ success: false, message: "Nama tidak valid." });
    if (phone.length < 9 || phone.length > 15) return json_({ success: false, message: "Nomor telepon tidak valid." });
    if (!program) return json_({ success: false, message: "Program belum dipilih." });
    if (!(amount >= 10000) || amount > 1000000000) return json_({ success: false, message: "Nominal tidak valid." });

    getSheet_().appendRow([new Date(), safe_(name), phone, safe_(program), amount, safe_(note), anon, "Menunggu"]);
    return json_({ success: true });
  } catch (err) {
    return json_({ success: false, message: "Gagal menyimpan, coba lagi." });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// Opsional: jalankan sekali untuk membuat sheet & header
function setup() { getSheet_(); }
