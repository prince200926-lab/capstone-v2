const fs = require('fs');
const path = require('path');

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const classrooms = [
  '12A', '12B', '12C',
  '11A', '11B', '11C',
  '10A', '10B', '10C',
  '9A', '9B', '9C',
  '8A', '8B', '8C'
];

// Class Teacher Mapping (15 distinct teachers for 15 classes)
const classTeachers = {
  '12A': { id: 'T001', name: 'Dr. Rajesh Sharma', subject: 'Physics' },
  '12B': { id: 'T004', name: 'Mrs. Priya Kapoor', subject: 'Chemistry' },
  '12C': { id: 'T002', name: 'Ms. Neha Rawat', subject: 'Physics' },
  '11A': { id: 'T009', name: 'Mr. John David', subject: 'English' },
  '11B': { id: 'T006', name: 'Mrs. Lakshmi Rao', subject: 'Mathematics' },
  '11C': { id: 'T010', name: 'Mrs. Sunita Devi', subject: 'English' },
  '10A': { id: 'T011', name: 'Mr. Ramesh Kumar', subject: 'Mathematics' },
  '10B': { id: 'T012', name: 'Mrs. Kavita Singh', subject: 'Mathematics' },
  '10C': { id: 'T021', name: 'Mr. Sanjay Mishra', subject: 'Mathematics' },
  '9A':  { id: 'T014', name: 'Ms. Deepa Joshi', subject: 'Science' },
  '9B':  { id: 'T013', name: 'Mr. Arjun Patel', subject: 'Science' },
  '9C':  { id: 'T023', name: 'Mr. Prakash Jha', subject: 'Social Science' },
  '8A':  { id: 'T015', name: 'Mr. Vikram Reddy', subject: 'English' },
  '8B':  { id: 'T016', name: 'Mrs. Fatima Mehta', subject: 'English' },
  '8C':  { id: 'T022', name: 'Mrs. Ritu Agarwal', subject: 'English' }
};

// Paths
const teachersFile = path.join(__dirname, 'backend', 'data', 'teachers.json');
const timetableFile = path.join(__dirname, 'backend', 'data', 'timetable.json');

// Read & update teachers.json
const teachers = JSON.parse(fs.readFileSync(teachersFile, 'utf8'));
teachers.forEach(t => {
  const matchEntry = Object.entries(classTeachers).find(([cls, ct]) => ct.id === t.id);
  if (matchEntry) {
    t.isClassTeacher = true;
    t.classTeacherOf = matchEntry[0];
  } else {
    t.isClassTeacher = false;
    t.classTeacherOf = null;
  }
});
fs.writeFileSync(teachersFile, JSON.stringify(teachers, null, 2), 'utf8');
console.log('✅ Updated teachers.json with Class Teacher assignments.');

// Initialize timetable structure
const timetable = {};
classrooms.forEach(c => {
  timetable[c] = {};
  days.forEach(d => {
    timetable[c][d] = new Array(8).fill(null);
  });
});

// Busy map: busy[teacherId][day][periodIndex 0..7] = classSection
const busy = {};
teachers.forEach(t => {
  busy[t.id] = {};
  days.forEach(d => {
    busy[t.id][d] = new Array(8).fill(null);
  });
});

function assignSlot(cls, day, period, subject, teacherId, type = 'single', linked = null, room = '', isCT = false) {
  const pIdx = period - 1;
  const entry = { period, subject, teacherId, type };
  if (linked) entry.linkedPeriod = linked;
  if (room) entry.room = room;
  if (isCT) entry.isCTPeriod = true;

  timetable[cls][day][pIdx] = entry;
  if (teacherId) {
    busy[teacherId][day][pIdx] = cls;
  }
}

function isFree(teacherId, day, period) {
  if (!teacherId) return true;
  const pIdx = period - 1;
  return busy[teacherId][day][pIdx] === null;
}

// -------------------------------------------------------------
// STEP 1: Assign Period 1 for ALL 15 sections on ALL 6 days as CT Period
// -------------------------------------------------------------
classrooms.forEach(cls => {
  const ct = classTeachers[cls];
  days.forEach(day => {
    assignSlot(cls, day, 1, ct.subject, ct.id, 'single', null, '', true);
  });
});

// -------------------------------------------------------------
// STEP 2: Synchronized Optionals for 11 & 12 (Period 5 & 6)
// -------------------------------------------------------------
['12A', '12B', '12C'].forEach((cls, idx) => {
  const tId = idx === 0 ? 'T024' : idx === 1 ? 'T031' : 'T025';
  ['Monday', 'Wednesday', 'Friday'].forEach(day => {
    assignSlot(cls, day, 5, 'Optional', tId, 'double', 6, 'Opt Center');
    assignSlot(cls, day, 6, 'Optional', tId, 'double', 5, 'Opt Center');
  });
  ['Tuesday', 'Thursday', 'Saturday'].forEach(day => {
    assignSlot(cls, day, 5, 'Optional', tId, 'single', null, 'Opt Center');
  });
});

['11A', '11B', '11C'].forEach((cls, idx) => {
  const tId = idx === 0 ? 'T024' : idx === 1 ? 'T031' : 'T025';
  ['Tuesday', 'Thursday', 'Saturday'].forEach(day => {
    assignSlot(cls, day, 5, 'Optional', tId, 'double', 6, 'Opt Center');
    assignSlot(cls, day, 6, 'Optional', tId, 'double', 5, 'Opt Center');
  });
  ['Monday', 'Wednesday', 'Friday'].forEach(day => {
    assignSlot(cls, day, 5, 'Optional', tId, 'single', null, 'Opt Center');
  });
});

// Helper functions for remaining slots (Periods 2 to 8)
function assignDoublePeriod(cls, day, subject, teacherId, preferredPairs = [[2,3], [3,4], [7,8]]) {
  for (const [p1, p2] of preferredPairs) {
    if (timetable[cls][day][p1-1] === null && timetable[cls][day][p2-1] === null &&
        isFree(teacherId, day, p1) && isFree(teacherId, day, p2)) {
      assignSlot(cls, day, p1, subject, teacherId, 'double', p2);
      assignSlot(cls, day, p2, subject, teacherId, 'double', p1);
      return true;
    }
  }
  return false;
}

function assignSinglePeriod(cls, day, subject, teacherId, candidatePeriods = [2,3,4,6,7,8]) {
  for (const p of candidatePeriods) {
    if (timetable[cls][day][p-1] === null && isFree(teacherId, day, p)) {
      assignSlot(cls, day, p, subject, teacherId, 'single');
      return true;
    }
  }
  return false;
}

// -------------------------------------------------------------
// STEP 3: Class 12 Core Subjects (Periods 2-8)
// -------------------------------------------------------------
// 12A (CT: T001 Phy)
assignDoublePeriod('12A', 'Monday', 'Chemistry', 'T003', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('12A', 'Wednesday', 'Chemistry', 'T003', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('12A', 'Friday', 'Chemistry', 'T003', [[2,3], [3,4], [7,8]]);
assignSinglePeriod('12A', 'Tuesday', 'Chemistry', 'T003');
assignSinglePeriod('12A', 'Thursday', 'Chemistry', 'T003');

assignDoublePeriod('12A', 'Tuesday', 'Mathematics', 'T005', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('12A', 'Thursday', 'Mathematics', 'T005', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('12A', 'Saturday', 'Mathematics', 'T005', [[2,3], [3,4], [7,8]]);
assignSinglePeriod('12A', 'Monday', 'Mathematics', 'T005');
assignSinglePeriod('12A', 'Wednesday', 'Mathematics', 'T005');

days.forEach(d => assignSinglePeriod('12A', d, 'English', 'T009', [4, 3, 2, 7, 8]));

// 12B (CT: T004 Chem)
assignDoublePeriod('12B', 'Wednesday', 'Physics', 'T001', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('12B', 'Friday', 'Physics', 'T001', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('12B', 'Tuesday', 'Physics', 'T001', [[7,8], [3,4], [2,3]]);
assignSinglePeriod('12B', 'Monday', 'Physics', 'T001');
assignSinglePeriod('12B', 'Thursday', 'Physics', 'T001');

assignDoublePeriod('12B', 'Monday', 'Mathematics', 'T005', [[7,8], [3,4], [2,3]]);
assignDoublePeriod('12B', 'Wednesday', 'Mathematics', 'T005', [[7,8], [3,4], [2,3]]);
assignDoublePeriod('12B', 'Friday', 'Mathematics', 'T005', [[7,8], [3,4], [2,3]]);
assignSinglePeriod('12B', 'Tuesday', 'Mathematics', 'T005');
assignSinglePeriod('12B', 'Saturday', 'Mathematics', 'T005');

days.forEach(d => assignSinglePeriod('12B', d, 'English', 'T009', [3, 4, 2, 7, 8]));

// 12C (CT: T002 Phy)
assignDoublePeriod('12C', 'Tuesday', 'Chemistry', 'T003', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('12C', 'Thursday', 'Chemistry', 'T003', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('12C', 'Saturday', 'Chemistry', 'T003', [[2,3], [3,4], [7,8]]);
assignSinglePeriod('12C', 'Monday', 'Chemistry', 'T003');
assignSinglePeriod('12C', 'Friday', 'Chemistry', 'T003');

assignDoublePeriod('12C', 'Monday', 'Biology', 'T007', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('12C', 'Wednesday', 'Biology', 'T007', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('12C', 'Friday', 'Biology', 'T007', [[2,3], [3,4], [7,8]]);
assignSinglePeriod('12C', 'Tuesday', 'Biology', 'T007');
assignSinglePeriod('12C', 'Saturday', 'Biology', 'T007');

days.forEach(d => assignSinglePeriod('12C', d, 'English', 'T010', [4, 3, 2, 7, 8]));

// -------------------------------------------------------------
// STEP 4: Class 11 Core Subjects
// -------------------------------------------------------------
// 11A (CT: T009 Eng)
assignDoublePeriod('11A', 'Wednesday', 'Physics', 'T002', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('11A', 'Friday', 'Physics', 'T002', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('11A', 'Saturday', 'Physics', 'T002', [[7,8], [3,4], [2,3]]);
assignSinglePeriod('11A', 'Monday', 'Physics', 'T002');
assignSinglePeriod('11A', 'Thursday', 'Physics', 'T002');

assignDoublePeriod('11A', 'Tuesday', 'Chemistry', 'T004', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('11A', 'Thursday', 'Chemistry', 'T004', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('11A', 'Saturday', 'Chemistry', 'T004', [[2,3], [3,4], [7,8]]);
assignSinglePeriod('11A', 'Monday', 'Chemistry', 'T004');
assignSinglePeriod('11A', 'Friday', 'Chemistry', 'T004');

assignDoublePeriod('11A', 'Monday', 'Mathematics', 'T006', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('11A', 'Wednesday', 'Mathematics', 'T006', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('11A', 'Friday', 'Mathematics', 'T006', [[2,3], [3,4], [7,8]]);
assignSinglePeriod('11A', 'Tuesday', 'Mathematics', 'T006');
assignSinglePeriod('11A', 'Thursday', 'Mathematics', 'T006');

// 11B (CT: T006 Math)
assignDoublePeriod('11B', 'Monday', 'Physics', 'T002', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('11B', 'Tuesday', 'Physics', 'T002', [[7,8], [3,4], [2,3]]);
assignDoublePeriod('11B', 'Thursday', 'Physics', 'T002', [[2,3], [3,4], [7,8]]);
assignSinglePeriod('11B', 'Wednesday', 'Physics', 'T002');
assignSinglePeriod('11B', 'Friday', 'Physics', 'T002');

assignDoublePeriod('11B', 'Wednesday', 'Chemistry', 'T003', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('11B', 'Friday', 'Chemistry', 'T003', [[7,8], [3,4], [2,3]]);
assignDoublePeriod('11B', 'Saturday', 'Chemistry', 'T003', [[7,8], [3,4], [2,3]]);
assignSinglePeriod('11B', 'Monday', 'Chemistry', 'T003');
assignSinglePeriod('11B', 'Thursday', 'Chemistry', 'T003');

days.forEach(d => assignSinglePeriod('11B', d, 'English', 'T010', [3, 2, 4, 7, 8]));

// 11C (CT: T010 Eng)
assignDoublePeriod('11C', 'Monday', 'Physics', 'T001', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('11C', 'Tuesday', 'Physics', 'T001', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('11C', 'Thursday', 'Physics', 'T001', [[2,3], [3,4], [7,8]]);
assignSinglePeriod('11C', 'Wednesday', 'Physics', 'T001');
assignSinglePeriod('11C', 'Saturday', 'Physics', 'T001');

assignDoublePeriod('11C', 'Wednesday', 'Chemistry', 'T004', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('11C', 'Friday', 'Chemistry', 'T004', [[2,3], [3,4], [7,8]]);
assignDoublePeriod('11C', 'Saturday', 'Chemistry', 'T004', [[7,8], [3,4], [2,3]]);
assignSinglePeriod('11C', 'Tuesday', 'Chemistry', 'T004');
assignSinglePeriod('11C', 'Thursday', 'Chemistry', 'T004');

assignDoublePeriod('11C', 'Tuesday', 'Biology', 'T007', [[7,8], [3,4], [2,3]]);
assignDoublePeriod('11C', 'Thursday', 'Biology', 'T007', [[7,8], [3,4], [2,3]]);
assignDoublePeriod('11C', 'Saturday', 'Biology', 'T007', [[3,4], [7,8], [2,3]]);
assignSinglePeriod('11C', 'Monday', 'Biology', 'T007');
assignSinglePeriod('11C', 'Friday', 'Biology', 'T007');

// Fill Activity for 11 & 12
const activityPool = [
  { sub: 'Games', tId: 'T026' },
  { sub: 'Library', tId: 'T029' },
  { sub: 'GST', tId: 'T029' },
  { sub: 'WE', tId: 'T030' }
];

['12A', '12B', '12C', '11A', '11B', '11C'].forEach(cls => {
  days.forEach(d => {
    for (let p = 2; p <= 8; p++) {
      if (timetable[cls][d][p-1] === null) {
        let placed = false;
        for (const act of activityPool) {
          if (isFree(act.tId, d, p)) {
            assignSlot(cls, d, p, act.sub, act.tId, 'single');
            placed = true;
            break;
          }
        }
        if (!placed) {
          assignSlot(cls, d, p, 'WE', 'T030', 'single');
        }
      }
    }
  });
});

// -------------------------------------------------------------
// STEP 5: Classes 10, 9, 8 (Periods 2 to 8)
// -------------------------------------------------------------
const secConfigs = {
  '10A': { m: 'T011', s: 'T013', e: 'T015', h: 'T017', sst: 'T019' },
  '10B': { m: 'T012', s: 'T014', e: 'T016', h: 'T018', sst: 'T020' },
  '10C': { m: 'T021', s: 'T021', e: 'T022', h: 'T022', sst: 'T023' },

  '9A':  { m: 'T011', s: 'T014', e: 'T015', h: 'T017', sst: 'T019' },
  '9B':  { m: 'T012', s: 'T013', e: 'T016', h: 'T018', sst: 'T020' },
  '9C':  { m: 'T021', s: 'T021', e: 'T022', h: 'T023', sst: 'T023' },

  '8A':  { m: 'T011', s: 'T013', e: 'T015', h: 'T017', sst: 'T019' },
  '8B':  { m: 'T012', s: 'T014', e: 'T016', h: 'T018', sst: 'T020' },
  '8C':  { m: 'T021', s: 'T021', e: 'T022', h: 'T022', sst: 'T023' }
};

const secKeys = ['10A', '10B', '10C', '9A', '9B', '9C', '8A', '8B', '8C'];

secKeys.forEach((cls, cIdx) => {
  const cfg = secConfigs[cls];
  const is8 = cls.startsWith('8');
  const ct = classTeachers[cls];

  days.forEach((d, dayIdx) => {
    // Subject pool excluding CT subject
    const subList = [
      { name: 'Maths', tId: cfg.m },
      { name: 'Science', tId: cfg.s },
      { name: 'Social Studies', tId: cfg.sst },
      { name: 'English', tId: cfg.e },
      { name: 'Hindi', tId: cfg.h },
      is8 ? { name: 'Sanskrit', tId: 'T027' } : { name: 'Coding', tId: 'T025' },
      { name: 'Games', tId: 'T026' }
    ].filter(item => !(item.tId === ct.id && item.name.toLowerCase().startsWith(ct.subject.toLowerCase().slice(0, 4))));

    if (subList.length < 7) {
      if (is8) subList.push({ name: 'Foreign Lang', tId: 'T028' });
      else subList.push({ name: 'Optional', tId: 'T024' });
    }

    const shift = (dayIdx * 2 + cIdx) % subList.length;
    const rotated = [...subList.slice(shift), ...subList.slice(0, shift)];

    for (let p = 2; p <= 8; p++) {
      let candidate = rotated[(p - 2) % rotated.length];
      if (!isFree(candidate.tId, d, p)) {
        const alt = rotated.find(item => isFree(item.tId, d, p));
        if (alt) candidate = alt;
        else {
          const fallbackList = [
            { name: 'Library', tId: 'T029' },
            { name: 'Games', tId: 'T026' },
            { name: 'Activity', tId: 'T031' }
          ];
          const freeFallback = fallbackList.find(f => isFree(f.tId, d, p));
          if (freeFallback) candidate = freeFallback;
        }
      }
      assignSlot(cls, d, p, candidate.name, candidate.tId, 'single');
    }
  });
});

// Write to timetable.json
fs.writeFileSync(timetableFile, JSON.stringify(timetable, null, 2), 'utf-8');
console.log('🎉 Clean Timetable written successfully to', timetableFile);

// Collision verification
let totalCollisions = 0;
days.forEach(day => {
  for (let p = 1; p <= 8; p++) {
    const map = {};
    classrooms.forEach(cls => {
      const slot = timetable[cls][day][p-1];
      if (slot && slot.teacherId) {
        if (!map[slot.teacherId]) map[slot.teacherId] = [];
        map[slot.teacherId].push(cls);
      }
    });
    for (const [tId, list] of Object.entries(map)) {
      if (list.length > 1) {
        if (tId !== 'T026' && tId !== 'T024' && tId !== 'T025' && tId !== 'T031' && tId !== 'T027' && tId !== 'T028' && tId !== 'T029' && tId !== 'T030') {
          console.warn(`Collision on ${day} P${p} for Teacher ${tId}: [${list.join(', ')}]`);
          totalCollisions++;
        }
      }
    }
  }
});

console.log('✅ Final Core Collisions:', totalCollisions);
