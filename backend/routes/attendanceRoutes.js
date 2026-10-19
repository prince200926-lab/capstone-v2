/**
 * attendanceRoutes.js — CRUD endpoints for teacher attendance management.
 *
 * Endpoints
 * ---------
 * POST   /punch      - Record a single punch (CHECK_IN / CHECK_OUT)
 * POST   /batch-sync - Batch-record multiple punches at once
 * GET    /today      - Full attendance status for today (all teachers)
 * POST   /leave      - Mark a teacher as ON_LEAVE
 * GET    /report/:date - Attendance for a specific date
 *
 * All file I/O goes through dataManager; all logging goes through logger.
 *
 * CommonJS module — exports an Express Router.
 */

const express = require('express');
const path = require('path');
const { readJSON, writeJSON, getToday } = require('../utils/dataManager');
const { log } = require('../middleware/logger');

const router = express.Router();

// ---------------------------------------------------------------------------
// Path constants (relative to project root)
// ---------------------------------------------------------------------------
const DATA_DIR        = path.join(__dirname, '..', 'data');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const TEACHERS_FILE   = path.join(DATA_DIR, 'teachers.json');

// ---------------------------------------------------------------------------
// POST /punch
// ---------------------------------------------------------------------------
/**
 * Record a single attendance punch.
 *
 * Body: { deviceId, teacherId, timestamp, punchType }
 *   - punchType must be "CHECK_IN" or "CHECK_OUT"
 *
 * The punch is stored under today's date key in attendance.json.
 */
router.post('/punch', (req, res) => {
  try {
    const { deviceId, teacherId, timestamp, punchType } = req.body;

    // --- Validate required fields -------------------------------------------
    if (!teacherId || !punchType) {
      log('WARN', 'Punch request missing required fields', { method: 'POST', url: '/punch' });
      return res.status(400).json({ success: false, error: 'teacherId and punchType are required' });
    }

    if (!['CHECK_IN', 'CHECK_OUT'].includes(punchType)) {
      return res.status(400).json({ success: false, error: 'punchType must be CHECK_IN or CHECK_OUT' });
    }

    // --- Validate teacher exists --------------------------------------------
    const teachers = readJSON(TEACHERS_FILE, []);
    const teacher = Array.isArray(teachers)
      ? teachers.find(t => t.id === teacherId)
      : null;

    if (!teacher) {
      log('WARN', `Punch rejected — unknown teacherId: ${teacherId}`);
      return res.status(404).json({ success: false, error: `Teacher ${teacherId} not found` });
    }

    // --- Record the punch ---------------------------------------------------
    const today = getToday();
    const attendance = readJSON(ATTENDANCE_FILE);

    if (!attendance[today]) attendance[today] = {};

    // Derive a human-friendly punch time from the provided punchTime, timestamp, or now
    let punchTime = req.body.punchTime;
    if (!punchTime) {
      const punchDate = timestamp ? new Date(timestamp) : new Date();
      punchTime = `${String(punchDate.getHours()).padStart(2, '0')}:${String(punchDate.getMinutes()).padStart(2, '0')}`;
    }

    attendance[today][teacherId] = {
      status: 'PRESENT',
      punchTime,
      punchType,
      deviceId: deviceId || 'MANUAL',
      recordedAt: new Date().toISOString(),
    };

    writeJSON(ATTENDANCE_FILE, attendance);

    log('INFO', `Punch recorded — ${teacher.name} (${teacherId}) ${punchType} at ${punchTime}`, {
      method: 'POST', url: '/punch',
    });

    return res.status(200).json({
      success: true,
      message: `${punchType} recorded for ${teacher.name}`,
      data: {
        teacherId,
        teacherName: teacher.name,
        department: teacher.department,
        punchType,
        punchTime,
        date: today,
      },
    });
  } catch (err) {
    log('ERROR', `Punch error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /batch-sync
// ---------------------------------------------------------------------------
/**
 * Batch-import punches for a given date.
 *
 * Body: { date, punches: [{ teacherId, time }] }
 */
router.post('/batch-sync', (req, res) => {
  try {
    let { date, punches, replace = true } = req.body;
    if (!date) date = getToday();

    if (!Array.isArray(punches)) {
      return res.status(400).json({ success: false, error: 'punches[] array is required' });
    }

    const teachers = readJSON(TEACHERS_FILE, []);
    const attendance = readJSON(ATTENDANCE_FILE);

    if (!attendance[date]) attendance[date] = {};

    const punchedIds = new Set(punches.map(p => p.teacherId));

    // When replace is true (default):
    // Remove old PRESENT punches for teachers who are not in the current punches list.
    // Retain ON_LEAVE entries if any.
    if (replace) {
      for (const tId of Object.keys(attendance[date])) {
        if (!punchedIds.has(tId)) {
          if (attendance[date][tId].status !== 'ON_LEAVE') {
            delete attendance[date][tId];
          }
        }
      }
    }

    let recorded = 0;
    let skipped  = 0;

    for (const punch of punches) {
      const teacher = Array.isArray(teachers)
        ? teachers.find(t => t.id === punch.teacherId)
        : null;

      if (!teacher) {
        skipped++;
        continue;
      }

      attendance[date][punch.teacherId] = {
        status: 'PRESENT',
        punchTime: punch.time || '--:--',
        punchType: 'CHECK_IN',
        deviceId: 'BATCH_SYNC',
        recordedAt: new Date().toISOString(),
      };
      recorded++;
    }

    writeJSON(ATTENDANCE_FILE, attendance);

    log('INFO', `Batch sync for ${date}: ${recorded} recorded, ${skipped} skipped (replace: ${replace})`, {
      method: 'POST', url: '/batch-sync',
    });

    return res.status(200).json({
      success: true,
      date,
      recorded,
      skipped,
      total: punches.length,
    });
  } catch (err) {
    log('ERROR', `Batch sync error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /today
// ---------------------------------------------------------------------------
/**
 * Full attendance board for today.
 *
 * Every teacher is listed; those without a punch are marked ABSENT.
 */
router.get('/today', (req, res) => {
  try {
    const today      = getToday();
    const teachers   = readJSON(TEACHERS_FILE, []);
    const attendance = readJSON(ATTENDANCE_FILE);
    const todayData  = attendance[today] || {};

    const result = (Array.isArray(teachers) ? teachers : []).map(t => {
      const record = todayData[t.id];
      return {
        id:          t.id,
        teacherId:   t.id,
        name:        t.name,
        teacherName: t.name,
        department:  t.department,
        subject:     t.subject,
        status:      record ? record.status : 'ABSENT',
        punchTime:   record ? record.punchTime : null,
        punchType:   record ? record.punchType : null,
        isClassTeacher: Boolean(t.isClassTeacher),
        classTeacherOf: t.classTeacherOf || null,
      };
    });

    log('INFO', `Today's attendance requested — ${result.length} teachers`);

    return res.status(200).json({ success: true, date: today, attendance: result });
  } catch (err) {
    log('ERROR', `Today attendance error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /leave
// ---------------------------------------------------------------------------
/**
 * Mark a teacher as ON_LEAVE.
 *
 * Body: { teacherId, date, reason }
 */
router.post('/leave', (req, res) => {
  try {
    let { teacherId, date, reason } = req.body;
    if (!date) date = getToday();

    if (!teacherId) {
      return res.status(400).json({ success: false, error: 'teacherId is required' });
    }

    const teachers = readJSON(TEACHERS_FILE, []);
    const teacher = Array.isArray(teachers)
      ? teachers.find(t => t.id === teacherId)
      : null;

    if (!teacher) {
      return res.status(404).json({ success: false, error: `Teacher ${teacherId} not found` });
    }

    const attendance = readJSON(ATTENDANCE_FILE);
    if (!attendance[date]) attendance[date] = {};

    attendance[date][teacherId] = {
      status: 'ON_LEAVE',
      reason: reason || 'Unspecified',
      punchTime: null,
      punchType: null,
      recordedAt: new Date().toISOString(),
    };

    writeJSON(ATTENDANCE_FILE, attendance);

    log('INFO', `Leave recorded — ${teacher.name} (${teacherId}) on ${date}: ${reason || 'Unspecified'}`, {
      method: 'POST', url: '/leave',
    });

    return res.status(200).json({
      success: true,
      message: `${teacher.name} marked as ON_LEAVE for ${date}`,
      data: { teacherId, date, reason: reason || 'Unspecified' },
    });
  } catch (err) {
    log('ERROR', `Leave recording error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /absent
// ---------------------------------------------------------------------------
/**
 * Mark a teacher as ABSENT for a date.
 *
 * Body: { teacherId, date }
 */
router.post('/absent', (req, res) => {
  try {
    let { teacherId, date } = req.body;
    if (!date) date = getToday();

    if (!teacherId) {
      return res.status(400).json({ success: false, error: 'teacherId is required' });
    }

    const attendance = readJSON(ATTENDANCE_FILE);
    if (attendance[date] && attendance[date][teacherId]) {
      delete attendance[date][teacherId];
      writeJSON(ATTENDANCE_FILE, attendance);
    }

    log('INFO', `Teacher ${teacherId} marked as ABSENT for ${date}`);

    return res.status(200).json({
      success: true,
      message: `Teacher ${teacherId} marked as ABSENT for ${date}`,
      data: { teacherId, date, status: 'ABSENT' },
    });
  } catch (err) {
    log('ERROR', `Mark absent error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /report/:date
// ---------------------------------------------------------------------------
/**
 * Attendance report for a specific date.
 */
router.get('/report/:date', (req, res) => {
  try {
    const { date } = req.params;
    const teachers   = readJSON(TEACHERS_FILE, []);
    const attendance = readJSON(ATTENDANCE_FILE);
    const dayData    = attendance[date] || {};

    const result = (Array.isArray(teachers) ? teachers : []).map(t => {
      const record = dayData[t.id];
      return {
        teacherId:   t.id,
        teacherName: t.name,
        department:  t.department,
        subject:     t.subject,
        status:      record ? record.status : 'ABSENT',
        punchTime:   record ? record.punchTime : null,
        punchType:   record ? record.punchType : null,
        reason:      record ? record.reason : null,
      };
    });

    log('INFO', `Attendance report requested for ${date}`);

    return res.status(200).json({ success: true, date, attendance: result });
  } catch (err) {
    log('ERROR', `Report error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
