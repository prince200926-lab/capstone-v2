/**
 * teacherRoutes.js — Teacher information and workload endpoints.
 *
 * Endpoints
 * ---------
 * GET /                   - All teachers
 * GET /:teacherId         - Specific teacher with weekly schedule
 * GET /:teacherId/workload - Substitution count for current week
 *
 * CommonJS module — exports an Express Router.
 */

const express = require('express');
const path = require('path');
const { readJSON, getToday, getDayName } = require('../utils/dataManager');
const { log } = require('../middleware/logger');

const router = express.Router();

// ---------------------------------------------------------------------------
// Path constants
// ---------------------------------------------------------------------------
const DATA_DIR           = path.join(__dirname, '..', 'data');
const TEACHERS_FILE      = path.join(DATA_DIR, 'teachers.json');
const TIMETABLE_FILE     = path.join(DATA_DIR, 'timetable.json');
const SUBSTITUTIONS_FILE = path.join(DATA_DIR, 'substitutions.json');

// ---------------------------------------------------------------------------
// Helper — get dates for the current ISO week (Mon–Sun)
// ---------------------------------------------------------------------------
/**
 * Returns an array of YYYY-MM-DD strings for the current week (Mon → Sun).
 */
function getCurrentWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  // Calculate Monday: if Sunday (0) treat as 7 so we go back 6 days
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

// ---------------------------------------------------------------------------
// GET / & POST / - Teacher roster and creation
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    const teachers = readJSON(TEACHERS_FILE, []);
    return res.status(200).json({
      success: true,
      count: Array.isArray(teachers) ? teachers.length : 0,
      teachers: Array.isArray(teachers) ? teachers : [],
    });
  } catch (err) {
    log('ERROR', `Teachers list error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/', (req, res) => {
  try {
    const { id, name, department, subjects, designation, type, assignedClasses, contact } = req.body;

    if (!name || !department) {
      return res.status(400).json({ success: false, error: 'Name and Department are required' });
    }

    const { writeJSON } = require('../utils/dataManager');
    const teachers = readJSON(TEACHERS_FILE, []);

    // Generate ID if not provided
    const newId = id || `T${String(teachers.length + 1).padStart(3, '0')}`;

    if (teachers.some(t => t.id === newId)) {
      return res.status(400).json({ success: false, error: `Teacher with ID ${newId} already exists` });
    }

    const newTeacher = {
      id: newId,
      name,
      department,
      subjects: Array.isArray(subjects) ? subjects : [subjects || department],
      designation: designation || 'TGT',
      type: type || 'secondary',
      assignedClasses: Array.isArray(assignedClasses) ? assignedClasses : (assignedClasses ? assignedClasses.split(',').map(s => s.trim()) : []),
      contact: contact || '9876543000'
    };

    teachers.push(newTeacher);
    writeJSON(TEACHERS_FILE, teachers);

    log('INFO', `New teacher added: ${name} (${newId}) - ${department}`);
    return res.status(201).json({ success: true, teacher: newTeacher });
  } catch (err) {
    log('ERROR', `Add teacher error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /:teacherId
// ---------------------------------------------------------------------------
/**
 * Returns a specific teacher's info including their weekly schedule.
 */
router.get('/:teacherId', (req, res) => {
  try {
    const { teacherId } = req.params;

    // Guard: reject the literal string "workload" so it doesn't collide
    // with the /:teacherId/workload route (Express matches top-down, but
    // this is a safety net).
    if (teacherId === 'workload') return res.status(400).json({ success: false, error: 'Invalid teacher ID' });

    const teachers = readJSON(TEACHERS_FILE, []);
    const teacher = (Array.isArray(teachers) ? teachers : []).find(t => t.id === teacherId);

    if (!teacher) {
      log('WARN', `Teacher not found: ${teacherId}`);
      return res.status(404).json({ success: false, error: `Teacher ${teacherId} not found` });
    }

    // Build weekly schedule from timetable
    const timetable = readJSON(TIMETABLE_FILE);
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklySchedule = {};

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

    // Sort each day by period
    for (const day of dayNames) {
      weeklySchedule[day].sort((a, b) => a.period - b.period);
    }

    log('INFO', `Teacher info requested: ${teacher.name} (${teacherId})`);

    return res.status(200).json({
      success: true,
      teacher: {
        ...teacher,
        weeklySchedule,
      },
    });
  } catch (err) {
    log('ERROR', `Teacher info error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /:teacherId/workload
// ---------------------------------------------------------------------------
/**
 * Returns the substitution count for the current week.
 *
 * Scans substitutions.json for every date in the current week and counts
 * how many times this teacher was assigned as a substitute.
 */
router.get('/:teacherId/workload', (req, res) => {
  try {
    const { teacherId } = req.params;

    const teachers = readJSON(TEACHERS_FILE, []);
    const teacher = (Array.isArray(teachers) ? teachers : []).find(t => t.id === teacherId);

    if (!teacher) {
      return res.status(404).json({ success: false, error: `Teacher ${teacherId} not found` });
    }

    const substitutions = readJSON(SUBSTITUTIONS_FILE);
    const weekDates = getCurrentWeekDates();

    let totalSubstitutions = 0;
    const dailyBreakdown = {};

    for (const date of weekDates) {
      const daySubs = substitutions[date];
      if (!Array.isArray(daySubs)) {
        dailyBreakdown[date] = 0;
        continue;
      }

      const count = daySubs.filter(s => s.substituteTeacherId === teacherId).length;
      dailyBreakdown[date] = count;
      totalSubstitutions += count;
    }

    log('INFO', `Workload requested for ${teacher.name}: ${totalSubstitutions} subs this week`);

    return res.status(200).json({
      success: true,
      teacherId,
      teacherName: teacher.name,
      weekDates: { from: weekDates[0], to: weekDates[6] },
      totalSubstitutions,
      dailyBreakdown,
    });
  } catch (err) {
    log('ERROR', `Workload error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
