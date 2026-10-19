/**
 * logger.js — Robust request / application logger with daily file rotation.
 *
 * Features
 * --------
 * - Writes to `logs/app-YYYY-MM-DD.log`       (general application log)
 * - Writes to `logs/substitution-audit-YYYY-MM-DD.log` (engine audit trail)
 * - Console output with ANSI colours
 * - Log levels: INFO, WARN, ERROR, ENGINE
 * - Express middleware that captures method, url, status, response time
 * - `logSubstitution(details)` for full substitution-engine audit records
 *
 * CommonJS module.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Directory that holds all log files. */
const LOGS_DIR = path.join(__dirname, '..', 'logs');

/** ANSI colour codes for pretty console output. */
const COLORS = {
  INFO:    '\x1b[36m',   // cyan
  WARN:    '\x1b[33m',   // yellow
  ERROR:   '\x1b[31m',   // red
  ENGINE:  '\x1b[35m',   // magenta
  RESET:   '\x1b[0m',
};

/**
 * Return today's date as YYYY-MM-DD (used for log file naming).
 */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Ensure the logs directory exists.
 */
function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

/**
 * Append a line to a log file (creates the file if missing).
 * @param {string} fileName - Name of the log file (e.g. "app-2026-10-19.log")
 * @param {string} line     - Fully-formatted log line
 */
function appendToFile(fileName, line) {
  ensureLogsDir();
  const filePath = path.join(LOGS_DIR, fileName);
  fs.appendFileSync(filePath, line + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// Core log function
// ---------------------------------------------------------------------------

/**
 * Write a structured log entry to file and console.
 *
 * Format:
 *   [ISO_TIMESTAMP] [LEVEL] [METHOD URL] [STATUS] [RESPONSE_TIME_MS] - MESSAGE
 *
 * When called outside an HTTP context, METHOD/URL/STATUS/RESPONSE_TIME can be
 * omitted and will render as "-".
 *
 * @param {'INFO'|'WARN'|'ERROR'|'ENGINE'} level   - Log level
 * @param {string}                          message - Human-readable message
 * @param {object}                          [meta]  - Optional structured metadata
 * @param {string}                          [meta.method]       - HTTP method
 * @param {string}                          [meta.url]          - Request URL
 * @param {number}                          [meta.status]       - HTTP status code
 * @param {number}                          [meta.responseTime] - Duration in ms
 */
function log(level = 'INFO', message = '', meta = {}) {
  const timestamp = new Date().toISOString();
  const method       = meta.method       || '-';
  const url          = meta.url          || '-';
  const status       = meta.status       || '-';
  const responseTime = meta.responseTime != null ? `${meta.responseTime}ms` : '-';

  // Build the formatted line
  const line = `[${timestamp}] [${level}] [${method} ${url}] [${status}] [${responseTime}] - ${message}`;

  // 1. Write to daily app log file
  appendToFile(`app-${todayStr()}.log`, line);

  // 2. Pretty-print to console with colours
  const colour = COLORS[level] || COLORS.INFO;
  console.log(`${colour}${line}${COLORS.RESET}`);
}

// ---------------------------------------------------------------------------
// Substitution audit logger
// ---------------------------------------------------------------------------

/**
 * Log a detailed substitution-engine decision to a dedicated audit file.
 *
 * Each record captures *why* a particular teacher was selected, which
 * candidates were considered, the priority tier, and match type.
 *
 * @param {object} details
 * @param {string} details.date           - YYYY-MM-DD
 * @param {number} details.period         - Period number
 * @param {string} details.classSection   - e.g. "12A"
 * @param {string} details.subject        - e.g. "Physics"
 * @param {string} details.absentTeacher  - Teacher ID of absent teacher
 * @param {string} details.selectedTeacher- Teacher ID of chosen substitute
 * @param {string} details.priority       - Priority tier label
 * @param {string} details.matchType      - e.g. "SUBJECT_MATCH", "DEPARTMENT_MATCH", "ANY_FREE"
 * @param {string} details.reason         - Human-readable explanation
 * @param {Array}  details.candidatesConsidered - List of teacher IDs evaluated
 */
function logSubstitution(details = {}) {
  const timestamp = new Date().toISOString();

  const entry = {
    timestamp,
    ...details,
  };

  const line = `[${timestamp}] [ENGINE] ${JSON.stringify(entry)}`;

  // Write to the dedicated substitution audit log
  appendToFile(`substitution-audit-${todayStr()}.log`, line);

  // Also mirror to the general app log at ENGINE level for unified searching
  log('ENGINE', `Substitution decision: period ${details.period} ${details.classSection} → ${details.selectedTeacher || 'NONE'} (${details.matchType || '-'})`, {
    method: 'ENGINE',
    url: `/${details.date || '-'}`,
  });
}

// ---------------------------------------------------------------------------
// Express middleware
// ---------------------------------------------------------------------------

/**
 * Express middleware that logs every request and its response.
 *
 * Captures the response status code and duration by hooking into the `finish`
 * event so the log line is written *after* the response has been sent.
 */
function logMiddleware(req, res, next) {
  const start = Date.now();

  // Hook into the response 'finish' event
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR'
               : res.statusCode >= 400 ? 'WARN'
               : 'INFO';

    log(level, `${req.method} ${req.originalUrl} completed`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime,
    });
  });

  next();
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  logMiddleware,
  log,
  logSubstitution,
};
