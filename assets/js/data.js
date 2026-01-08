/* Data loading + date utilities */
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSA8oCh4yfOK5khe_kd0O7gylN9RDKxtnJ7yxouZd7YobQwNisyy5X91oZvXpOnMrFde7Wss0Y4pDhk/pub?output=csv";

let masterData = [];

// --- Date helpers (force D/M/Y everywhere) ---
function formatDateDMY(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

// Convert YYYY-MM-DD (from <input type=date>) into D/M/Y for display
function prettyFromISODate(iso) {
  if (!iso) return "--/--/----";
  const parts = iso.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return "--/--/----";
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

// Build a safe local "date-only" key from a Date object (YYYY-MM-DD) WITHOUT timezone shifting
function toLocalISODateOnly(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Robust-ish timestamp parse:
// - if it parses directly, use it
// - if Google Forms style (M/D/YYYY HH:mm:ss) it usually parses; still keep date-only key local
function parseTimestamp(raw) {
  if (!raw) return null;
  const dt = new Date(raw);
  if (!isNaN(dt)) return dt;

  // Fallback manual parse: M/D/YYYY or D/M/YYYY + optional time
  // Accepts: 1/7/2026 13:05:00 or 07/01/2026 13:05
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;

  const a = Number(m[1]);
  const b = Number(m[2]);
  const y = Number(m[3]);
  const hh = Number(m[4] || 0);
  const mm = Number(m[5] || 0);
  const ss = Number(m[6] || 0);

  // Assume US if sheet is Google Forms default (M/D/YYYY). If your sheet is D/M/YYYY, swap here.
  const month = a; // M
  const day = b; // D
  const dt2 = new Date(y, month - 1, day, hh, mm, ss);
  return isNaN(dt2) ? null : dt2;
}

// --- Data ---
function fetchData() {
  document.getElementById('loader').classList.remove('hidden');

  Papa.parse(SHEET_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      masterData = (results.data || []).map((row) => {
        const obj = {};
        for (const k in row) obj[k.trim()] = String(row[k] ?? '').trim();

        const rawTs = obj["Timestamp"];
        const dt = parseTimestamp(rawTs);
        if (!dt) return null;

        obj.dateObj = dt;

        // IMPORTANT:
        // Use LOCAL date-only key to prevent timezone shifting (and to remove time from charts)
        obj.isoDate = toLocalISODateOnly(dt);

        return obj;
      }).filter(Boolean);

      document.getElementById('loader').classList.add('hidden');
      init();
    },
    error: function () {
      document.getElementById('loader').classList.add('hidden');
      alert("تعذر تحميل البيانات. تأكد من نشر Google Sheet كـ CSV.");
    }
  });
}
