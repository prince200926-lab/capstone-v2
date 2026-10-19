/**
 * priorityEngine.js
 * =================
 * Core substitution-priority algorithm for the School Teacher Attendance
 * & Auto-Substitution System.
 *
 * Responsibilities:
 *  1. Identify all vacant periods caused by absent teachers on a given day.
 *  2. Sort vacancies by class priority (Board years first).
 *  3. Score every eligible substitute teacher and pick the best match.
 *  4. Handle double-period linking.
 *  5. Return a fully-auditable substitution plan with candidate trails.
 */

const {
  getWeeklySubstitutionCount,
  getDailySubstitutionCount,
  getTeacherFreePeriodsToday,
  hasExceededDailyCap,
} = require("./workloadBalancer");

// ──────────────────────────────────────────────────────────────────────────────
// Subject → Department Mapping
// ──────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, string>} normalised-subject → department */
const SUBJECT_DEPARTMENT_MAP = {
  physics: "Science",
  chemistry: "Science",
  biology: "Science",
  science: "Science",

  mathematics: "Mathematics",
  maths: "Mathematics",

  english: "Languages",
  hindi: "Languages",
  sanskrit: "Languages",
  french: "Languages",

  sst: "Social",
  gst: "Social",

  coding: "Technology",
  "computer science": "Technology",
  optional: "Technology",

  games: "Activity",
  pe: "Activity",
  library: "Activity",
  we: "Activity",
  art: "Activity",
};

// ──────────────────────────────────────────────────────────────────────────────
// Exported Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the numeric class from a classSection string and returns a priority.
 *   Priority 1 (P1): Classes 10 & 12 — Board exam years → SOLVE FIRST
 *   Priority 2 (P2): Classes 9 & 11 — Senior secondary → SOLVE SECOND
 *   Priority 3 (P3): All others (e.g. 8) — Middle school  → SOLVE LAST
 *
 * @param {string} classSection - e.g. "12A", "9B", "8C"
 * @returns {number} 1 | 2 | 3
 */
function getClassPriority(classSection) {
  // Parse leading digits: "12A" → 12, "9B" → 9
  const classNum = parseInt(classSection, 10);

  if (classNum === 10 || classNum === 12) return 1; // Board years
  if (classNum === 9 || classNum === 11) return 2; // Senior secondary
  return 3; // Everything else (middle school, primary, etc.)
}

/**
 * Maps a subject name to its department.
 *
 * @param {string} subject - e.g. "Physics", "Hindi"
 * @returns {string} department name or "General" if unknown
 */
function getSubjectDepartment(subject) {
  if (!subject) return "General";
  return SUBJECT_DEPARTMENT_MAP[subject.toLowerCase()] || "General";
}

/**
 * Checks whether two subjects belong to the same department (allied match).
 *
 * @param {string} subject1 - e.g. "Physics"
 * @param {string} subject2 - e.g. "Chemistry"
 * @returns {boolean}
 */
function isAlliedSubject(subject1, subject2) {
  const dept1 = getSubjectDepartment(subject1);
  const dept2 = getSubjectDepartment(subject2);

  // Both must resolve to a real department (not "General")
  if (dept1 === "General" || dept2 === "General") return false;
  return dept1 === dept2;
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Derives the English day name from an ISO date string.
 * @param {string} dateStr - e.g. "2026-10-19"
 * @returns {string} e.g. "Monday"
 */
function getDayName(dateStr) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[new Date(dateStr).getDay()];
}

/**
 * Looks up a teacher object by ID from the allTeachers array.
 * @param {string} id
 * @param {Array} allTeachers
 * @returns {object|undefined}
 */
function findTeacher(id, allTeachers) {
  return allTeachers.find((t) => t.id === id);
}

/**
 * Determines the primary subject a teacher teaches.
 * Tries `teacher.subject`, `teacher.subjects[0]`, or `teacher.department`.
 * @param {object} teacher
 * @returns {string}
 */
function getTeacherSubject(teacher) {
  if (teacher.subject) return teacher.subject;
  if (Array.isArray(teacher.subjects) && teacher.subjects.length > 0)
    return teacher.subjects[0];
  return teacher.department || "";
}

/**
 * Checks whether a teacher teaches a given class section in the timetable.
 * @param {string} teacherId
 * @param {string} classSection
 * @param {object} timetable
 * @param {string} dayName
 * @returns {boolean}
 */
function teacherTeachesClassSection(teacherId, classSection, timetable, dayName) {
  if (Array.isArray(timetable)) {
    return timetable.some(
      (e) =>
        e.teacherId === teacherId &&
        e.classSection === classSection &&
        e.day?.toLowerCase() === dayName.toLowerCase()
    );
  }

  // Object format keyed by classSection
  const classTT = timetable[classSection];
  if (!classTT) return false;
  const daySchedule =
    classTT[dayName] ||
    classTT[dayName.toLowerCase()] ||
    classTT[dayName.toUpperCase()];
  if (!Array.isArray(daySchedule)) return false;
  return daySchedule.some((slot) => slot.teacherId === teacherId);
}

/**
 * Determines whether a teacher is scheduled to teach in a specific period.
 * @param {string} teacherId
 * @param {number} period
 * @param {object} timetable
 * @param {string} dayName
 * @returns {boolean}
 */
function isTeacherScheduledInPeriod(teacherId, period, timetable, dayName) {
  if (Array.isArray(timetable)) {
    return timetable.some(
      (e) =>
        e.teacherId === teacherId &&
        e.period === period &&
        e.day?.toLowerCase() === dayName.toLowerCase()
    );
  }

  // Object format
  for (const classTT of Object.values(timetable)) {
    const daySchedule =
      classTT[dayName] ||
      classTT[dayName.toLowerCase()] ||
      classTT[dayName.toUpperCase()];
    if (!Array.isArray(daySchedule)) continue;
    if (daySchedule.some((s) => s.teacherId === teacherId && s.period === period)) {
      return true;
    }
  }
  return false;
}

// ──────────────────────────────────────────────────────────────────────────────
// Core Algorithm
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Generates optimal substitution assignments for a school day.
 *
 * @param {string} date             - ISO date, e.g. "2026-10-20"
 * @param {string[]} absentTeacherIds - IDs of teachers confirmed absent
 * @param {object}   timetable      - complete timetable data (object or array)
 * @param {Array}    allTeachers     - full teacher roster [{ id, name, subject, ... }]
 * @param {Array}    todayAttendance - attendance records [{ teacherId, status }]
 * @param {Array}    [existingSubstitutions=[]] - prior substitution records (for weekly counts)
 * @returns {Array}  substitution records
 */
function generateSubstitutions(
  date,
  absentTeacherIds,
  timetable,
  allTeachers,
  todayAttendance,
  existingSubstitutions = []
) {
  // ── Step 1: Determine day name ──────────────────────────────────────────
  const dayName = getDayName(date);

  // Build a quick lookup of present teachers
  const presentTeacherIds = new Set();
  todayAttendance.forEach((rec) => {
    // Accept both "present" / "PRESENT" / "checked_in" style statuses
    const status = (rec.status || "").toLowerCase();
    if (
      status === "present" ||
      status === "checked_in" ||
      status === "check_in" ||
      status === "on_time" ||
      status === "late"
    ) {
      presentTeacherIds.add(rec.teacherId);
    }
  });

  // ── Step 2: Collect all vacant periods ─────────────────────────────────
  const vacantPeriods = [];

  absentTeacherIds.forEach((absentId) => {
    const absentTeacher = findTeacher(absentId, allTeachers);
    const absentName = absentTeacher ? absentTeacher.name : absentId;

    if (Array.isArray(timetable)) {
      // Array format
      timetable
        .filter(
          (entry) =>
            entry.teacherId === absentId &&
            entry.day?.toLowerCase() === dayName.toLowerCase()
        )
        .forEach((entry) => {
          vacantPeriods.push({
            period: entry.period,
            classSection: entry.classSection,
            subject: entry.subject,
            absentTeacherId: absentId,
            absentTeacherName: absentName,
            type: entry.type || "single",
            linkedPeriod: entry.linkedPeriod || null,
          });
        });
    } else if (typeof timetable === "object" && timetable !== null) {
      // Object format keyed by classSection
      Object.entries(timetable).forEach(([classSection, classTT]) => {
        const daySchedule =
          classTT[dayName] ||
          classTT[dayName.toLowerCase()] ||
          classTT[dayName.toUpperCase()];
        if (!Array.isArray(daySchedule)) return;

        daySchedule
          .filter((slot) => slot.teacherId === absentId)
          .forEach((slot) => {
            const absentTeacherObj = allTeachers.find((t) => t.id === absentId);
            const isAbsentTeacherCT = Boolean(
              absentTeacherObj?.isClassTeacher &&
              absentTeacherObj?.classTeacherOf === classSection
            );
            vacantPeriods.push({
              period: slot.period,
              classSection,
              subject: slot.subject,
              absentTeacherId: absentId,
              absentTeacherName: absentName,
              type: slot.type || "single",
              linkedPeriod: slot.linkedPeriod || null,
              isCTPeriod: Boolean(slot.isCTPeriod || slot.period === 1),
              isAbsentTeacherCT,
            });
          });
      });
    }
  });

  // ── Step 3: Sort by class priority (P1 first, then by period) ──────────
  vacantPeriods.sort((a, b) => {
    const prioA = getClassPriority(a.classSection);
    const prioB = getClassPriority(b.classSection);
    if (prioA !== prioB) return prioA - prioB; // lower priority number = higher importance
    return a.period - b.period; // same priority? earlier period first
  });

  // ── Step 4: Assign substitutes ─────────────────────────────────────────
  const results = [];
  // Track assignments made during THIS run (period → Set of teacherIds)
  const periodAssignments = {};
  // Track daily substitution counts within THIS run
  const runDailyCounts = {};

  // Track which vacant slots have been handled (for double-period linking)
  const handledKeys = new Set();

  /** Generates a unique key for a vacant slot */
  const slotKey = (v) => `${v.classSection}_P${v.period}`;

  /** Running substitution ID counter */
  let subIdCounter = 1;

  /**
   * Builds the eligible-teacher pool for a given period, scores them,
   * and returns sorted candidates.
   */
  function scoreCandidates(vacancy) {
    const candidates = [];

    allTeachers.forEach((teacher) => {
      // ─ Eligibility checks ─────────────────────────────────────────────
      // 1. Must be present today
      if (!presentTeacherIds.has(teacher.id)) return;

      // 2. Must NOT be one of the absent teachers
      if (absentTeacherIds.includes(teacher.id)) return;

      // 3. Must be free in this period (not scheduled in own timetable)
      if (isTeacherScheduledInPeriod(teacher.id, vacancy.period, timetable, dayName))
        return;

      // 4. Must not already be assigned a substitution in this period (this run)
      if (
        periodAssignments[vacancy.period] &&
        periodAssignments[vacancy.period].has(teacher.id)
      )
        return;

      // 5. Must not have exceeded daily cap (existing + this run)
      const existingDaily = getDailySubstitutionCount(
        teacher.id,
        existingSubstitutions,
        date
      );
      const runDaily = runDailyCounts[teacher.id] || 0;
      if (existingDaily + runDaily >= 2) return; // cap = 2

      // ─ Scoring ────────────────────────────────────────────────────────
      let score = 0;
      const reasons = [];
      const teacherSubject = getTeacherSubject(teacher);

      // +50: Exact same subject
      if (
        teacherSubject &&
        teacherSubject.toLowerCase() === vacancy.subject.toLowerCase()
      ) {
        score += 50;
        reasons.push(`Same subject specialist (${vacancy.subject})`);
      }
      // +30: Allied subject (same department, but not exact match)
      else if (isAlliedSubject(teacherSubject, vacancy.subject)) {
        score += 30;
        reasons.push(
          `Allied subject (${teacherSubject} → ${getSubjectDepartment(vacancy.subject)} dept)`
        );
      }

      // +20: Lowest weekly substitution count (we invert: fewer subs = more points)
      const weeklySubs = getWeeklySubstitutionCount(
        teacher.id,
        existingSubstitutions,
        date
      );
      // Scale: 0 weekly subs → +20, 1 → +15, 2 → +10, 3 → +5, ≥4 → 0
      const weeklyBonus = Math.max(0, 20 - weeklySubs * 5);
      score += weeklyBonus;
      reasons.push(`${weeklySubs} substitutions this week`);

      // +10: More remaining free periods today
      const todayRunAssignments = results
        .filter((r) => r.substituteTeacher.id === teacher.id)
        .map((r) => r);
      const freePeriodInfo = getTeacherFreePeriodsToday(
        teacher.id,
        timetable,
        dayName,
        todayRunAssignments
      );
      // Scale: ≥4 remaining → +10, 3 → +8, 2 → +5, 1 → +2, 0 → 0
      const freeBonus = Math.min(10, freePeriodInfo.remainingFree * 2.5) | 0;
      score += freeBonus;
      reasons.push(`Free in Period ${vacancy.period}`);

      // +5: Already teaches the same class section
      if (
        teacherTeachesClassSection(
          teacher.id,
          vacancy.classSection,
          timetable,
          dayName
        )
      ) {
        score += 5;
        reasons.push(`Already teaches ${vacancy.classSection}`);
      }

      candidates.push({
        teacherId: teacher.id,
        name: teacher.name,
        score,
        reasons,
        selected: false, // will be set to true for the winner
      });
    });

    // Sort descending by score
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  /**
   * Creates a substitution record and updates internal tracking maps.
   */
  function assignSubstitution(vacancy, candidate, linkedSubId = null) {
    const subId = `SUB_${String(subIdCounter).padStart(3, "0")}`;
    subIdCounter++;

    // Mark candidate as selected
    candidate.selected = true;

    // Determine match type
    let matchType = "no_match";
    const teacherObj = findTeacher(candidate.teacherId, allTeachers);
    const teacherSubject = teacherObj ? getTeacherSubject(teacherObj) : "";
    if (
      teacherSubject &&
      teacherSubject.toLowerCase() === vacancy.subject.toLowerCase()
    ) {
      matchType = "exact_subject";
    } else if (isAlliedSubject(teacherSubject, vacancy.subject)) {
      matchType = "allied_subject";
    } else {
      matchType = "available_teacher";
    }

    const record = {
      id: subId,
      date,
      period: vacancy.period,
      classSection: vacancy.classSection,
      subject: vacancy.subject,
      absentTeacher: {
        id: vacancy.absentTeacherId,
        name: vacancy.absentTeacherName,
      },
      substituteTeacher: {
        id: candidate.teacherId,
        name: candidate.name,
      },
      priority: getClassPriority(vacancy.classSection),
      matchType,
      score: candidate.score,
      reason: candidate.reasons.join(". ") + ".",
      isDoublePeriod: vacancy.type === "double",
      linkedSubstitutionId: linkedSubId,
      isCTPeriod: Boolean(vacancy.isCTPeriod),
      isAbsentTeacherCT: Boolean(vacancy.isAbsentTeacherCT),
      candidates: [], // will be populated below
    };

    // Track this assignment
    if (!periodAssignments[vacancy.period]) {
      periodAssignments[vacancy.period] = new Set();
    }
    periodAssignments[vacancy.period].add(candidate.teacherId);

    runDailyCounts[candidate.teacherId] =
      (runDailyCounts[candidate.teacherId] || 0) + 1;

    return record;
  }

  // ── Main assignment loop ───────────────────────────────────────────────
  for (const vacancy of vacantPeriods) {
    const key = slotKey(vacancy);
    if (handledKeys.has(key)) continue; // already assigned (double-period partner)
    handledKeys.add(key);

    // ── Double-period handling ─────────────────────────────────────────
    if (vacancy.type === "double" && vacancy.linkedPeriod != null) {
      // Find the linked vacancy
      const linkedVacancy = vacantPeriods.find(
        (v) =>
          v.period === vacancy.linkedPeriod &&
          v.classSection === vacancy.classSection &&
          v.absentTeacherId === vacancy.absentTeacherId
      );

      if (linkedVacancy) {
        handledKeys.add(slotKey(linkedVacancy));

        // Try to find a teacher who is free for BOTH periods
        const candidatesFirst = scoreCandidates(vacancy);

        // Filter for teachers also free in the linked period
        const dualCandidates = candidatesFirst.filter((c) => {
          // Check availability in the linked period as well
          if (
            isTeacherScheduledInPeriod(
              c.teacherId,
              linkedVacancy.period,
              timetable,
              dayName
            )
          )
            return false;
          if (
            periodAssignments[linkedVacancy.period] &&
            periodAssignments[linkedVacancy.period].has(c.teacherId)
          )
            return false;
          // Check cap allows TWO more (need both periods)
          const existingDaily = getDailySubstitutionCount(
            c.teacherId,
            existingSubstitutions,
            date
          );
          const runDaily = runDailyCounts[c.teacherId] || 0;
          return existingDaily + runDaily + 1 < 2; // needs room for 2 total assignments
        });

        if (dualCandidates.length > 0) {
          // Assign same teacher to both periods
          const winner = dualCandidates[0];

          // Create placeholder IDs (they reference each other)
          const firstRecord = assignSubstitution(vacancy, { ...winner });
          const secondRecord = assignSubstitution(linkedVacancy, { ...winner });

          // Link them
          firstRecord.linkedSubstitutionId = secondRecord.id;
          secondRecord.linkedSubstitutionId = firstRecord.id;

          // Attach candidate audit trails
          firstRecord.candidates = candidatesFirst.map((c) => ({
            teacherId: c.teacherId,
            name: c.name,
            score: c.score,
            selected: c.teacherId === winner.teacherId,
          }));
          secondRecord.candidates = firstRecord.candidates;

          results.push(firstRecord);
          results.push(secondRecord);
          continue;
        }

        // Fallback: assign each period separately
        const fallbackFirst = scoreCandidates(vacancy);
        if (fallbackFirst.length > 0) {
          const winnerFirst = fallbackFirst[0];
          const rec = assignSubstitution(vacancy, { ...winnerFirst });
          rec.candidates = fallbackFirst.map((c) => ({
            teacherId: c.teacherId,
            name: c.name,
            score: c.score,
            selected: c.teacherId === winnerFirst.teacherId,
          }));
          results.push(rec);
        }

        const fallbackSecond = scoreCandidates(linkedVacancy);
        if (fallbackSecond.length > 0) {
          const winnerSecond = fallbackSecond[0];
          const rec = assignSubstitution(linkedVacancy, { ...winnerSecond });
          rec.candidates = fallbackSecond.map((c) => ({
            teacherId: c.teacherId,
            name: c.name,
            score: c.score,
            selected: c.teacherId === winnerSecond.teacherId,
          }));
          results.push(rec);
        }

        continue;
      }
    }

    // ── Single-period (or orphaned double) handling ────────────────────
    const candidates = scoreCandidates(vacancy);

    if (candidates.length > 0) {
      const winner = candidates[0];
      const record = assignSubstitution(vacancy, { ...winner });
      record.candidates = candidates.map((c) => ({
        teacherId: c.teacherId,
        name: c.name,
        score: c.score,
        selected: c.teacherId === winner.teacherId,
      }));
      results.push(record);
    } else {
      // No eligible substitute found — record the vacancy anyway for visibility
      results.push({
        id: `SUB_${String(subIdCounter).padStart(3, "0")}`,
        date,
        period: vacancy.period,
        classSection: vacancy.classSection,
        subject: vacancy.subject,
        absentTeacher: {
          id: vacancy.absentTeacherId,
          name: vacancy.absentTeacherName,
        },
        substituteTeacher: null,
        priority: getClassPriority(vacancy.classSection),
        matchType: "unassigned",
        score: 0,
        reason: "No eligible substitute found for this period.",
        isDoublePeriod: vacancy.type === "double",
        linkedSubstitutionId: null,
        candidates: [],
      });
      subIdCounter++;
    }
  }

  return results;
}

// ──────────────────────────────────────────────────────────────────────────────
// Module Exports
// ──────────────────────────────────────────────────────────────────────────────

module.exports = {
  generateSubstitutions,
  getClassPriority,
  getSubjectDepartment,
  isAlliedSubject,
};
