/**
 * substitutionRoutes.js — Substitution plan generation and management.
 *
 * Endpoints
 * ---------
 * POST   /generate        - Generate substitution plan for absent teachers
 * GET    /today            - Today's substitution plan
 * GET    /:date            - Substitution plan for a specific date
 * PUT    /override         - Manually override a substitution assignment
 *
 * The heavy lifting happens in utils/priorityEngine.js; this module
 * orchestrates data loading, engine invocation, persistence, and logging.
 *
 * CommonJS module — exports an Express Router.
 */

const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON, getToday, getDayName } = require('../utils/dataManager');
const { log, logSubstitution } = require('../middleware/logger');

const router = express.Router();

// ---------------------------------------------------------------------------
// Path constants
// ---------------------------------------------------------------------------
const DATA_DIR           = path.join(__dirname, '..', 'data');
const ATTENDANCE_FILE    = path.join(DATA_DIR, 'attendance.json');
const SUBSTITUTIONS_FILE = path.join(DATA_DIR, 'substitutions.json');
const TEACHERS_FILE      = path.join(DATA_DIR, 'teachers.json');
const TIMETABLE_FILE     = path.join(DATA_DIR, 'timetable.json');

// ---------------------------------------------------------------------------
// Inline priority engine (self-contained — no external file dependency)
// ---------------------------------------------------------------------------

/**
 * Priority tiers for substitution selection.
 *
 * Tier 1 — Same subject, free that period               (best pedagogical fit)
 * Tier 2 — Same department, free that period             (reasonable fit)
 * Tier 3 — Any teacher free that period                  (coverage)
 * Tier 4 — Teacher with least existing subs this week    (workload balancing)
 */
const PRIORITY_TIERS = [
  { name: 'TIER_1_SUBJECT_MATCH',    matchType: 'SUBJECT_MATCH',    label: 'Same-subject free teacher' },
  { name: 'TIER_2_DEPARTMENT_MATCH', matchType: 'DEPARTMENT_MATCH', label: 'Same-department free teacher' },
  { name: 'TIER_3_ANY_FREE',         matchType: 'ANY_FREE',         label: 'Any free teacher' },
  { name: 'TIER_4_LEAST_WORKLOAD',   matchType: 'LEAST_WORKLOAD',   label: 'Least-workload teacher (may have class)' },
];

/**
 * Determine which teachers are free during a specific period on a given day.
 *
 * @param {object} timetable   - Full timetable data keyed by classSection
 * @param {string} dayName     - e.g. "Monday"
 * @param {number} periodNum   - Period number (1-based)
 * @param {Array}  allTeachers - Array of teacher objects
 * @param {object} todayAttendance - Today's attendance map (teacherId → record)
 * @returns {Array} Teacher objects that are present and have no class that period
 */
function findFreeTeachers(timetable, dayName, periodNum, allTeachers, todayAttendance) {
  // Build a set of teacher IDs who are teaching this period
  const busyTeacherIds = new Set();

  for (const classSection of Object.keys(timetable)) {
    const daySchedule = timetable[classSection]?.[dayName];
    if (!Array.isArray(daySchedule)) continue;

    const slot = daySchedule.find(s => s.period === periodNum);
    if (slot && slot.teacherId) {
      busyTeacherIds.add(slot.teacherId);
    }
  }

  // Return present teachers who are NOT busy
  return allTeachers.filter(t => {
    const att = todayAttendance[t.id];
    const isPresent = att && att.status === 'PRESENT';
    const isFree = !busyTeacherIds.has(t.id);
    return isPresent && isFree;
  });
}

/**
 * Generate the full substitution plan for a date.
 *
 * @param {string} date            - YYYY-MM-DD
 * @param {Array}  absentTeachers  - Array of teacher objects who are absent/on leave
 * @param {object} timetable       - Full timetable data
 * @param {Array}  allTeachers     - All teacher objects
 * @param {object} todayAttendance - Attendance map for the date
 * @param {object} existingSubs    - All substitution data (for workload counting)
 * @returns {Array} Array of substitution records
 */
function generateSubstitutions(date, absentTeachers, timetable, allTeachers, todayAttendance, existingSubs = {}) {
  const dayName = getDayName(date);
  const substitutions = [];

  // Track how many subs each teacher has been assigned today (for load balancing)
  const todaySubCount = {};

  // Pre-compute weekly workload from existing substitutions
  const weeklyWorkload = {};
  allTeachers.forEach(t => { weeklyWorkload[t.id] = 0; });
  for (const [d, subs] of Object.entries(existingSubs)) {
    if (Array.isArray(subs)) {
      subs.forEach(s => {
        if (s.substituteTeacherId) {
          weeklyWorkload[s.substituteTeacherId] = (weeklyWorkload[s.substituteTeacherId] || 0) + 1;
        }
      });
    }
  }

  for (const absentTeacher of absentTeachers) {
    // Find all periods this teacher should be teaching today
    for (const classSection of Object.keys(timetable)) {
      const daySchedule = timetable[classSection]?.[dayName];
      if (!Array.isArray(daySchedule)) continue;

      const slots = daySchedule.filter(s => s.teacherId === absentTeacher.id);

      for (const slot of slots) {
        const candidatesConsidered = [];
        let selectedTeacher = null;
        let selectedPriority = null;
        let selectedMatchType = null;
        let reason = '';

        // Get all free teachers for this period
        const freeTeachers = findFreeTeachers(timetable, dayName, slot.period, allTeachers, todayAttendance);

        // --- Tier 1: Same subject match ---
        const subjectMatches = freeTeachers.filter(t => t.subject === slot.subject && t.id !== absentTeacher.id);
        candidatesConsidered.push(...subjectMatches.map(t => ({ id: t.id, tier: 'TIER_1', name: t.name })));

        if (subjectMatches.length > 0) {
          // Pick the one with least subs today for fairness
          selectedTeacher = subjectMatches.sort((a, b) =>
            (todaySubCount[a.id] || 0) - (todaySubCount[b.id] || 0)
          )[0];
          selectedPriority = PRIORITY_TIERS[0].name;
          selectedMatchType = PRIORITY_TIERS[0].matchType;
          reason = `${selectedTeacher.name} teaches the same subject (${slot.subject}) and is free period ${slot.period}`;
        }

        // --- Tier 2: Same department match ---
        if (!selectedTeacher) {
          const deptMatches = freeTeachers.filter(t => t.department === absentTeacher.department && t.id !== absentTeacher.id);
          candidatesConsidered.push(...deptMatches.map(t => ({ id: t.id, tier: 'TIER_2', name: t.name })));

          if (deptMatches.length > 0) {
            selectedTeacher = deptMatches.sort((a, b) =>
              (todaySubCount[a.id] || 0) - (todaySubCount[b.id] || 0)
            )[0];
            selectedPriority = PRIORITY_TIERS[1].name;
            selectedMatchType = PRIORITY_TIERS[1].matchType;
            reason = `${selectedTeacher.name} is from the same department (${absentTeacher.department}) and is free period ${slot.period}`;
          }
        }

        // --- Tier 3: Any free teacher ---
        if (!selectedTeacher) {
          const anyFree = freeTeachers.filter(t => t.id !== absentTeacher.id);
          candidatesConsidered.push(...anyFree.map(t => ({ id: t.id, tier: 'TIER_3', name: t.name })));

          if (anyFree.length > 0) {
            selectedTeacher = anyFree.sort((a, b) =>
              (todaySubCount[a.id] || 0) - (todaySubCount[b.id] || 0)
            )[0];
            selectedPriority = PRIORITY_TIERS[2].name;
            selectedMatchType = PRIORITY_TIERS[2].matchType;
            reason = `${selectedTeacher.name} is free period ${slot.period} (cross-department)`;
          }
        }

        // --- Tier 4: Least workload (last resort — teacher might overlap) ---
        if (!selectedTeacher) {
          const presentTeachers = allTeachers.filter(t => {
            const att = todayAttendance[t.id];
            return att && att.status === 'PRESENT' && t.id !== absentTeacher.id;
          });
          candidatesConsidered.push(...presentTeachers.map(t => ({ id: t.id, tier: 'TIER_4', name: t.name })));

          if (presentTeachers.length > 0) {
            selectedTeacher = presentTeachers.sort((a, b) =>
              ((weeklyWorkload[a.id] || 0) + (todaySubCount[a.id] || 0)) -
              ((weeklyWorkload[b.id] || 0) + (todaySubCount[b.id] || 0))
            )[0];
            selectedPriority = PRIORITY_TIERS[3].name;
            selectedMatchType = PRIORITY_TIERS[3].matchType;
            reason = `${selectedTeacher.name} has the least weekly substitution load (fallback)`;
          }
        }

        // Build substitution record
        const subRecord = {
          id: uuidv4(),
          date,
          period: slot.period,
          classSection,
          subject: slot.subject,
          absentTeacherId: absentTeacher.id,
          absentTeacherName: absentTeacher.name,
          substituteTeacherId: selectedTeacher ? selectedTeacher.id : null,
          substituteTeacherName: selectedTeacher ? selectedTeacher.name : null,
          priority: selectedPriority || 'UNASSIGNED',
          matchType: selectedMatchType || 'NONE',
          reason: reason || 'No suitable substitute found',
          candidatesConsidered: candidatesConsidered.map(c => c.id),
          createdAt: new Date().toISOString(),
        };

        substitutions.push(subRecord);

        // Update today's sub count for load balancing across remaining slots
        if (selectedTeacher) {
          todaySubCount[selectedTeacher.id] = (todaySubCount[selectedTeacher.id] || 0) + 1;
        }

        // Audit log
        logSubstitution({
          date,
          period: slot.period,
          classSection,
          subject: slot.subject,
          absentTeacher: absentTeacher.id,
          selectedTeacher: selectedTeacher ? selectedTeacher.id : 'NONE',
          priority: subRecord.priority,
          matchType: subRecord.matchType,
          reason: subRecord.reason,
          candidatesConsidered: candidatesConsidered,
        });
      }
    }
  }

  return substitutions;
}

// ---------------------------------------------------------------------------
// POST /generate
// ---------------------------------------------------------------------------
router.post('/generate', (req, res) => {
  try {
    const { date, cutOffTime } = req.body;
    const targetDate = date || getToday();

    log('INFO', `Substitution generation requested for ${targetDate} (cutoff: ${cutOffTime || 'none'})`, {
      method: 'POST', url: '/generate',
    });

    // Load all required data
    const attendance   = readJSON(ATTENDANCE_FILE);
    const timetable    = readJSON(TIMETABLE_FILE);
    const allTeachers  = readJSON(TEACHERS_FILE, []);
    const substitutions = readJSON(SUBSTITUTIONS_FILE);

    const todayAttendance = attendance[targetDate] || {};

    // Identify absent teachers (no punch or ON_LEAVE)
    const absentTeachers = (Array.isArray(allTeachers) ? allTeachers : []).filter(t => {
      const record = todayAttendance[t.id];
      // Absent = no record at all, or explicitly ON_LEAVE, or status ABSENT
      return !record || record.status === 'ABSENT' || record.status === 'ON_LEAVE';
    });

    log('INFO', `Found ${absentTeachers.length} absent teacher(s): ${absentTeachers.map(t => t.id).join(', ')}`);

    // Run the priority engine
    const plan = generateSubstitutions(
      targetDate,
      absentTeachers,
      timetable,
      Array.isArray(allTeachers) ? allTeachers : [],
      todayAttendance,
      substitutions,
    );

    // Persist results
    substitutions[targetDate] = plan;
    writeJSON(SUBSTITUTIONS_FILE, substitutions);

    // Group by priority tier for the response
    const grouped = {};
    for (const tier of PRIORITY_TIERS) {
      grouped[tier.name] = plan.filter(s => s.priority === tier.name);
    }
    grouped['UNASSIGNED'] = plan.filter(s => s.priority === 'UNASSIGNED');

    log('INFO', `Substitution plan generated — ${plan.length} assignment(s) for ${targetDate}`);

    return res.status(200).json({
      success: true,
      date: targetDate,
      totalSubstitutions: plan.length,
      absentTeachers: absentTeachers.map(t => ({ id: t.id, name: t.name })),
      substitutions: plan,
      plan: grouped,
    });
  } catch (err) {
    log('ERROR', `Substitution generation error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /today
// ---------------------------------------------------------------------------
router.get('/today', (req, res) => {
  try {
    const today = getToday();
    const substitutions = readJSON(SUBSTITUTIONS_FILE);
    const plan = substitutions[today] || [];

    log('INFO', `Today's substitution plan requested — ${plan.length} record(s)`);

    return res.status(200).json({ success: true, date: today, substitutions: plan });
  } catch (err) {
    log('ERROR', `Today substitution error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /:date
// ---------------------------------------------------------------------------
router.get('/:date', (req, res) => {
  try {
    const { date } = req.params;
    const substitutions = readJSON(SUBSTITUTIONS_FILE);
    const plan = substitutions[date] || [];

    log('INFO', `Substitution plan requested for ${date} — ${plan.length} record(s)`);

    return res.status(200).json({ success: true, date, substitutions: plan });
  } catch (err) {
    log('ERROR', `Date substitution error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /override
// ---------------------------------------------------------------------------
/**
 * Manually override a substitution assignment.
 *
 * Body: { substitutionId, newSubstituteTeacherId, reason }
 */
router.put('/override', (req, res) => {
  try {
    const { substitutionId, newSubstituteTeacherId, reason } = req.body;

    if (!substitutionId || !newSubstituteTeacherId) {
      return res.status(400).json({ success: false, error: 'substitutionId and newSubstituteTeacherId are required' });
    }

    const allTeachers = readJSON(TEACHERS_FILE, []);
    const newTeacher = (Array.isArray(allTeachers) ? allTeachers : []).find(t => t.id === newSubstituteTeacherId);
    if (!newTeacher) {
      return res.status(404).json({ success: false, error: `Teacher ${newSubstituteTeacherId} not found` });
    }

    const substitutions = readJSON(SUBSTITUTIONS_FILE);

    // Search across all dates for the substitution ID
    let found = false;
    for (const date of Object.keys(substitutions)) {
      const plan = substitutions[date];
      if (!Array.isArray(plan)) continue;

      const idx = plan.findIndex(s => s.id === substitutionId);
      if (idx !== -1) {
        const original = { ...plan[idx] };

        // Apply override
        plan[idx].substituteTeacherId = newTeacher.id;
        plan[idx].substituteTeacherName = newTeacher.name;
        plan[idx].priority = 'MANUAL_OVERRIDE';
        plan[idx].matchType = 'MANUAL';
        plan[idx].reason = reason || 'Manual override by admin';
        plan[idx].overriddenAt = new Date().toISOString();
        plan[idx].previousSubstituteId = original.substituteTeacherId;

        writeJSON(SUBSTITUTIONS_FILE, substitutions);

        // Audit log
        logSubstitution({
          date,
          period: plan[idx].period,
          classSection: plan[idx].classSection,
          subject: plan[idx].subject,
          absentTeacher: plan[idx].absentTeacherId,
          selectedTeacher: newTeacher.id,
          priority: 'MANUAL_OVERRIDE',
          matchType: 'MANUAL',
          reason: `Override: ${reason || 'No reason'} (was: ${original.substituteTeacherId || 'NONE'})`,
          candidatesConsidered: [{ id: newTeacher.id, tier: 'MANUAL', name: newTeacher.name }],
        });

        log('INFO', `Substitution override: ${substitutionId} → ${newTeacher.name} (${newTeacher.id})`);

        return res.status(200).json({ success: true, substitution: plan[idx] });
      }
    }

    if (!found) {
      return res.status(404).json({ success: false, error: `Substitution ${substitutionId} not found` });
    }
  } catch (err) {
    log('ERROR', `Override error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
