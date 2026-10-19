/**
 * timetableRoutes.js — Read-only endpoints for querying the school timetable.
 *
 * Endpoints
 * ---------
 * GET /class/:classSection         - Weekly timetable for a class-section
 * GET /teacher/:teacherId          - A teacher's weekly schedule
 * GET /day/:dayName                - Full school timetable for a day
 * GET /period/:dayName/:periodNum  - All teacher assignments for one period
 *
 * The timetable data lives in data/timetable.json and is keyed by
 * classSection (e.g. "12A").  Each classSection maps day names to an
 * array of { period, subject, teacherId } objects.
 *
 * CommonJS module — exports an Express Router.
 */

const express = require('express');
const path = require('path');
const { readJSON } = require('../utils/dataManager');
const { log } = require('../middleware/logger');

const router = express.Router();

// ---------------------------------------------------------------------------
// Path constants
// ---------------------------------------------------------------------------
const DATA_DIR       = path.join(__dirname, '..', 'data');
const TIMETABLE_FILE = path.join(DATA_DIR, 'timetable.json');
const TEACHERS_FILE  = path.join(DATA_DIR, 'teachers.json');

// ---------------------------------------------------------------------------
// GET /class/:classSection
// ---------------------------------------------------------------------------
/**
 * Returns the full weekly timetable for a specific class-section.
 * e.g. GET /class/12A
 */
router.get('/class/:classSection', (req, res) => {
  try {
    const { classSection } = req.params;
    const timetable = readJSON(TIMETABLE_FILE);

    const schedule = timetable[classSection];
    if (!schedule) {
      log('WARN', `Timetable not found for class ${classSection}`);
      return res.status(404).json({ success: false, error: `No timetable found for class ${classSection}` });
    }

    log('INFO', `Timetable requested for class ${classSection}`);

    return res.status(200).json({ success: true, classSection, schedule });
  } catch (err) {
    log('ERROR', `Class timetable error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /teacher/:teacherId
// ---------------------------------------------------------------------------
/**
 * Returns a teacher's full weekly schedule across all their assigned classes.
 *
 * Scans every class-section's timetable and collects the periods where this
 * teacher is assigned.
 */
router.get('/teacher/:teacherId', (req, res) => {
  try {
    const { teacherId } = req.params;
    const timetable = readJSON(TIMETABLE_FILE);
    const allTeachers = readJSON(TEACHERS_FILE, []);

    const teacher = (Array.isArray(allTeachers) ? allTeachers : []).find(t => t.id === teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, error: `Teacher ${teacherId} not found` });
    }

    // Build a weekly schedule: { Monday: [...], Tuesday: [...], ... }
    const weeklySchedule = {};
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const day of dayNames) {
      weeklySchedule[day] = [];
    }

    for (const classSection of Object.keys(timetable)) {
      for (const day of dayNames) {
        const daySlots = timetable[classSection]?.[day];
        if (!Array.isArray(daySlots)) continue;

        for (const slot of daySlots) {
          if (slot.teacherId === teacherId) {
            weeklySchedule[day].push({
              period: slot.period,
              classSection,
              subject: slot.subject,
            });
          }
        }
      }
    }

    // Sort each day's slots by period number
    for (const day of dayNames) {
      weeklySchedule[day].sort((a, b) => a.period - b.period);
    }

    log('INFO', `Weekly schedule requested for teacher ${teacherId} (${teacher.name})`);

    return res.status(200).json({
      success: true,
      teacherId,
      teacherName: teacher.name,
      department: teacher.department,
      schedule: weeklySchedule,
    });
  } catch (err) {
    log('ERROR', `Teacher timetable error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /day/:dayName
// ---------------------------------------------------------------------------
/**
 * Returns the full school timetable for a specific day (all 15 classrooms).
 * e.g. GET /day/Monday
 */
router.get('/day/:dayName', (req, res) => {
  try {
    const { dayName } = req.params;
    const timetable = readJSON(TIMETABLE_FILE);
    const allTeachers = readJSON(TEACHERS_FILE, []);

    // Build a teacher lookup map for enrichment
    const teacherMap = {};
    (Array.isArray(allTeachers) ? allTeachers : []).forEach(t => {
      teacherMap[t.id] = t;
    });

    const dayTimetable = {};

    for (const classSection of Object.keys(timetable)) {
      const daySlots = timetable[classSection]?.[dayName];
      if (!Array.isArray(daySlots)) {
        dayTimetable[classSection] = [];
        continue;
      }

      // Enrich with teacher name
      dayTimetable[classSection] = daySlots
        .map(slot => ({
          period: slot.period,
          subject: slot.subject,
          teacherId: slot.teacherId,
          teacherName: teacherMap[slot.teacherId]?.name || 'Unknown',
        }))
        .sort((a, b) => a.period - b.period);
    }

    log('INFO', `Full day timetable requested for ${dayName} — ${Object.keys(dayTimetable).length} classes`);

    return res.status(200).json({ success: true, dayName, timetable: dayTimetable });
  } catch (err) {
    log('ERROR', `Day timetable error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /period/:dayName/:periodNum
// ---------------------------------------------------------------------------
/**
 * Returns what every teacher is doing in a specific period on a specific day.
 *
 * This is especially useful for the substitution engine to quickly find
 * which teachers are free during a given period.
 */
router.get('/period/:dayName/:periodNum', (req, res) => {
  try {
    const { dayName } = req.params;
    const periodNum = parseInt(req.params.periodNum, 10);

    if (isNaN(periodNum)) {
      return res.status(400).json({ success: false, error: 'periodNum must be a number' });
    }

    const timetable = readJSON(TIMETABLE_FILE);
    const allTeachers = readJSON(TEACHERS_FILE, []);

    // Build a map: teacherId → what they're doing this period
    const assignments = {};
    const teacherList = Array.isArray(allTeachers) ? allTeachers : [];

    // Initialise all teachers as "FREE"
    teacherList.forEach(t => {
      assignments[t.id] = {
        teacherId: t.id,
        teacherName: t.name,
        department: t.department,
        status: 'FREE',
        classSection: null,
        subject: null,
      };
    });

    // Mark teachers who are teaching this period
    for (const classSection of Object.keys(timetable)) {
      const daySlots = timetable[classSection]?.[dayName];
      if (!Array.isArray(daySlots)) continue;

      const slot = daySlots.find(s => s.period === periodNum);
      if (slot && slot.teacherId && assignments[slot.teacherId]) {
        assignments[slot.teacherId].status = 'TEACHING';
        assignments[slot.teacherId].classSection = classSection;
        assignments[slot.teacherId].subject = slot.subject;
      }
    }

    const result = Object.values(assignments);
    const freeCount = result.filter(a => a.status === 'FREE').length;
    const busyCount = result.filter(a => a.status === 'TEACHING').length;

    log('INFO', `Period query: ${dayName} P${periodNum} — ${freeCount} free, ${busyCount} teaching`);

    return res.status(200).json({
      success: true,
      dayName,
      period: periodNum,
      freeTeachers: freeCount,
      busyTeachers: busyCount,
      assignments: result,
    });
  } catch (err) {
    log('ERROR', `Period query error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
