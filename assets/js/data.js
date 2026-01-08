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

function parseISODateOnly(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    const dt = new Date(y, m - 1, d);
    return isNaN(dt) ? null : dt;
  }

  return null;
}

// Parse sheet date column (D/M/YYYY) and keep date only (ignore time)
function parseSheetDateOnly(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const datePart = trimmed.split(' ')[0];
  const match = datePart.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const dt = new Date(year, month - 1, day);
    return isNaN(dt) ? null : dt;
  }

  return parseISODateOnly(datePart);
}

// --- Data ---
function setLoadingState(isLoading) {
  const loader = document.getElementById('loader');
  if (!loader) return;
  loader.classList.toggle('hidden', !isLoading);
}

function fetchData(options = {}) {
  const { onSuccess, onError, onLoading } = options;
  const setLoading = typeof onLoading === 'function' ? onLoading : setLoadingState;
  setLoading(true);

  Papa.parse(SHEET_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      masterData = (results.data || []).map((row) => {
        const obj = {};
        for (const k in row) obj[k.trim()] = String(row[k] ?? '').trim();

        const rawDate = obj["التاريخ"];
        const rawTs = obj["Timestamp"];
        const dt = parseSheetDateOnly(rawDate) || parseSheetDateOnly(rawTs);
        if (!dt) return null;

        obj.dateObj = dt;

        // IMPORTANT:
        // Use LOCAL date-only key to prevent timezone shifting (and to remove time from charts)
        obj.isoDate = toLocalISODateOnly(dt);

        return obj;
      }).filter(Boolean);

      setLoading(false);
      if (typeof onSuccess === 'function') {
        onSuccess();
      } else if (typeof init === 'function') {
        init();
      }
    },
    error: function () {
      setLoading(false);
      if (typeof onError === 'function') {
        onError();
        return;
      }
      alert("تعذر تحميل البيانات. تأكد من نشر Google Sheet كـ CSV.");
    }
  });
}
