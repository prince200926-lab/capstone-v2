/**
 * workloadBalancer.js
 * ===================
 * Tracks and balances substitution workload across teachers.
 * Ensures fair distribution by monitoring daily caps, weekly counts,
 * and free-period availability so no single teacher is overburdened.
 */

/**
 * Returns the ISO-week boundaries (Monday 00:00 → Saturday 23:59)
 * for the school week containing `currentDate`.
 *
 * @param {string} currentDate - ISO date string, e.g. "2026-10-20"
 * @returns {{ weekStart: Date, weekEnd: Date }}
 */
function getSchoolWeekBounds(currentDate) {
  const d = new Date(currentDate);
  // getDay(): 0=Sun … 6=Sat  →  shift so Monday=0
  const jsDay = d.getDay(); // 0-6
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay; // how many days back to Monday

  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  // School week ends Saturday 23:59:59
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 5); // Saturday
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/**
 * Counts how many substitutions a teacher has been assigned
 * during the current school week (Monday → Saturday).
 *
 * @param {string} teacherId         - e.g. "T002"
 * @param {Array}  substitutionsData - all substitution records in the system
 * @param {string} currentDate       - ISO date string for "today"
 * @returns {number} weekly substitution count
 */
function getWeeklySubstitutionCount(teacherId, substitutionsData, currentDate) {
  const { weekStart, weekEnd } = getSchoolWeekBounds(currentDate);

  return substitutionsData.filter((sub) => {
    // Match the substitute teacher
    if (
      sub.substituteTeacher?.id !== teacherId &&
      sub.substituteTeacherId !== teacherId
    ) {
      return false;
    }

    // Check date falls within school week
    const subDate = new Date(sub.date);
    return subDate >= weekStart && subDate <= weekEnd;
  }).length;
}

/**
 * Counts how many substitutions a teacher has been assigned on a specific date.
 *
 * @param {string} teacherId         - e.g. "T002"
 * @param {Array}  substitutionsData - all substitution records
 * @param {string} date              - ISO date string, e.g. "2026-10-20"
 * @returns {number} daily substitution count
 */
function getDailySubstitutionCount(teacherId, substitutionsData, date) {
  return substitutionsData.filter((sub) => {
    const matchesTeacher =
      sub.substituteTeacher?.id === teacherId ||
      sub.substituteTeacherId === teacherId;
    return matchesTeacher && sub.date === date;
  }).length;
}

/**
 * Analyses a teacher's free-period budget for a given day.
 *
 * @param {string} teacherId          - e.g. "T002"
 * @param {object} timetable          - full timetable data keyed by classSection
 * @param {string} dayName            - e.g. "Monday"
 * @param {Array}  currentAssignments - substitutions already assigned today
 * @returns {{ total: number, teaching: number, free: number, substitutions: number, remainingFree: number }}
 */
function getTeacherFreePeriodsToday(
  teacherId,
  timetable,
  dayName,
  currentAssignments = []
) {
  // Standard school day has 8 periods
  const TOTAL_PERIODS = 8;

  // Collect every period where this teacher is scheduled in the timetable
  const teachingPeriods = new Set();

  // timetable is expected to be an object keyed by classSection, e.g.
  //   { "12A": { "Monday": [{ period: 1, teacherId: "T001", subject: "Physics" }, ...] } }
  // OR an array of timetable entries
  if (Array.isArray(timetable)) {
    // Array format: [{ classSection, day, period, teacherId, subject }, ...]
    timetable.forEach((entry) => {
      if (
        entry.teacherId === teacherId &&
        entry.day?.toLowerCase() === dayName.toLowerCase()
      ) {
        teachingPeriods.add(entry.period);
      }
    });
  } else if (typeof timetable === "object" && timetable !== null) {
    // Object format keyed by classSection
    Object.values(timetable).forEach((classTT) => {
      const daySchedule =
        classTT[dayName] ||
        classTT[dayName.toLowerCase()] ||
        classTT[dayName.toUpperCase()];
      if (Array.isArray(daySchedule)) {
        daySchedule.forEach((slot) => {
          if (slot.teacherId === teacherId) {
            teachingPeriods.add(slot.period);
          }
        });
      }
    });
  }

  // Count substitutions already assigned to this teacher today
  const substitutionPeriods = new Set();
  currentAssignments.forEach((sub) => {
    const matchesTeacher =
      sub.substituteTeacher?.id === teacherId ||
      sub.substituteTeacherId === teacherId;
    if (matchesTeacher) {
      substitutionPeriods.add(sub.period);
    }
  });

  const teaching = teachingPeriods.size;
  const substitutions = substitutionPeriods.size;
  const free = TOTAL_PERIODS - teaching;
  const remainingFree = free - substitutions;

  return {
    total: TOTAL_PERIODS,
    teaching,
    free,
    substitutions,
    remainingFree: Math.max(0, remainingFree),
  };
}

/**
 * Checks whether a teacher has hit (or exceeded) the daily substitution cap.
 *
 * @param {string}  teacherId         - e.g. "T002"
 * @param {Array}   substitutionsData - all substitution records
 * @param {string}  date              - ISO date string
 * @param {number}  [cap=2]           - maximum allowed substitutions per day
 * @returns {boolean} true if already at or over the cap
 */
function hasExceededDailyCap(teacherId, substitutionsData, date, cap = 2) {
  const dailyCount = getDailySubstitutionCount(teacherId, substitutionsData, date);
  return dailyCount >= cap;
}

/**
 * Generates a comprehensive workload report for every teacher for a given date.
 *
 * @param {Array}  allTeachers       - array of teacher objects { id, name, ... }
 * @param {Array}  substitutionsData - all substitution records
 * @param {string} date              - ISO date string
 * @param {object} [timetable={}]    - full timetable data (optional, for free-period calc)
 * @param {string} [dayName=""]      - day name (optional, for free-period calc)
 * @returns {Array} report entries
 */
function getWorkloadReport(
  allTeachers,
  substitutionsData,
  date,
  timetable = {},
  dayName = ""
) {
  // Derive dayName from date if not provided
  if (!dayName) {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    dayName = days[new Date(date).getDay()];
  }

  // Today's assignments for free-period calculation
  const todayAssignments = substitutionsData.filter((s) => s.date === date);

  return allTeachers.map((teacher) => {
    const weeklySubCount = getWeeklySubstitutionCount(
      teacher.id,
      substitutionsData,
      date
    );
    const dailySubCount = getDailySubstitutionCount(
      teacher.id,
      substitutionsData,
      date
    );
    const freePeriods = getTeacherFreePeriodsToday(
      teacher.id,
      timetable,
      dayName,
      todayAssignments
    );
    const exceeded = hasExceededDailyCap(teacher.id, substitutionsData, date);

    return {
      teacherId: teacher.id,
      name: teacher.name,
      weeklySubCount,
      dailySubCount,
      freePeriods,
      available: !exceeded && freePeriods.remainingFree > 0,
    };
  });
}

// ─── Module Exports ──────────────────────────────────────────────────────────
module.exports = {
  getWeeklySubstitutionCount,
  getDailySubstitutionCount,
  getTeacherFreePeriodsToday,
  hasExceededDailyCap,
  getWorkloadReport,
  getSchoolWeekBounds, // exported for unit-testing convenience
};
