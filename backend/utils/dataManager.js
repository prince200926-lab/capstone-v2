/**
 * dataManager.js — Centralised file I/O utilities for the backend.
 *
 * Every route uses these helpers so that JSON read/write logic (including
 * error handling and logging) lives in one place.
 *
 * CommonJS module.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Returns today's date as a YYYY-MM-DD string in the local timezone.
 * @returns {string} e.g. "2026-10-19"
 */
function getToday() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns the English day-of-week name for a YYYY-MM-DD string.
 * @param {string} dateStr - e.g. "2026-10-19"
 * @returns {string} e.g. "Monday"
 */
function getDayName(dateStr) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const d = new Date(dateStr + 'T00:00:00'); // force local midnight
  return days[d.getDay()];
}

// ---------------------------------------------------------------------------
// JSON file I/O
// ---------------------------------------------------------------------------

/**
 * Read and parse a JSON file.  Returns the parsed object, or a fallback value
 * (`{}` by default) if the file doesn't exist or contains invalid JSON.
 *
 * @param {string} filePath - Absolute or project-relative path to the JSON file.
 * @param {*}      [fallback={}] - Value to return on failure.
 * @returns {*} Parsed data or fallback.
 */
function readJSON(filePath, fallback = {}) {
  try {
    // Resolve to an absolute path so callers can pass relative paths
    const resolved = path.resolve(filePath);

    if (!fs.existsSync(resolved)) {
      // First access — silently return the fallback so the caller can
      // seed the file later via writeJSON.
      return fallback;
    }

    const raw = fs.readFileSync(resolved, 'utf-8');

    // Guard against empty files (e.g. freshly created with no content)
    if (!raw.trim()) return fallback;

    return JSON.parse(raw);
  } catch (err) {
    // Log to stderr so the logger middleware (which may depend on us) can
    // still initialise without a circular-dependency issue.
    console.error(`[dataManager] readJSON error for "${filePath}":`, err.message);
    return fallback;
  }
}

/**
 * Serialise `data` as pretty-printed JSON and write it atomically to `filePath`.
 * Parent directories are created automatically if they don't exist.
 *
 * @param {string} filePath - Absolute or project-relative path.
 * @param {*}      data     - Any JSON-serialisable value.
 * @returns {boolean} `true` on success, `false` on failure.
 */
function writeJSON(filePath, data) {
  try {
    const resolved = path.resolve(filePath);
    const dir = path.dirname(resolved);

    // Ensure the directory tree exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(resolved, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[dataManager] writeJSON error for "${filePath}":`, err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  getToday,
  getDayName,
  readJSON,
  writeJSON,
};
