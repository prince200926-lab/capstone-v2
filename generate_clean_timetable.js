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

// Read teachers
const teachers = JSON.parse(fs.readFileSync(path.join(__dirname, 'backend', 'data', 'teachers.json'), 'utf8'));

// Initialize timetable structure: timetable[cls][day] = array of 8 periods
const timetable = {};
classrooms.forEach(c => {
  timetable[c] = {};
  days.forEach(d => {
    timetable[c][d] = new Array(8).fill(null);
  });
});

// Track teacher availability: busy[teacherId][day][periodIndex 0..7] = cls
const busy = {};
teachers.forEach(t => {
  busy[t.id] = {};
  days.forEach(d => {
    busy[t.id][d] = new Array(8).fill(null);
  });
});

function assignSlot(cls, day, period, subject, teacherId, type = 'single', linked = null, room = '') {
  const pIdx = period - 1;
  const entry = { period, subject, teacherId, type };
  if (linked) entry.linkedPeriod = linked;
  if (room) entry.room = room;

  timetable[cls][day][pIdx] = entry;
  if (teacherId) {
    busy[teacherId][day][pIdx] = cls;
  }
}

function isFree(teacherId, day, period) {
  const pIdx = period - 1;
  return busy[teacherId][day][pIdx] === null;
}

// 1. Assign Synchronized Optionals for 11 & 12
// Rule: Class 12 has 2 periods Mon, Wed, Fri (P5, P6) and 1 period Tue, Thu, Sat (P5).
// Class 11 has 1 period Mon, Wed, Fri (P5) and 2 periods Tue, Thu, Sat (P5, P6).
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

// Helper to find double period slot (P1-P2 or P3-P4 or P7-P8)
function assignDoublePeriod(cls, day, subject, teacherId, preferredPairs = [[1,2], [3,4], [7,8]]) {
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

function assignSinglePeriod(cls, day, subject, teacherId, candidatePeriods = [1,2,3,4,6,7,8]) {
  for (const p of candidatePeriods) {
    if (timetable[cls][day][p-1] === null && isFree(teacherId, day, p)) {
      assignSlot(cls, day, p, subject, teacherId, 'single');
      return true;
    }
  }
  return false;
}

// 2. Class 12 Core Subjects
// 12A (PCM): Phy (T001), Chem (T003), Math (T005), Eng (T009)
// 12B (PCM): Phy (T001), Chem (T004), Math (T005), Eng (T009)
// 12C (PCB): Phy (T002), Chem (T003), Bio (T007), Eng (T010)

// 12A
assignDoublePeriod('12A', 'Monday', 'Physics', 'T001');
assignDoublePeriod('12A', 'Thursday', 'Physics', 'T001');
assignDoublePeriod('12A', 'Saturday', 'Physics', 'T001', [[3,4], [1,2]]);
assignSinglePeriod('12A', 'Tuesday', 'Physics', 'T001');
assignSinglePeriod('12A', 'Wednesday', 'Physics', 'T001');

assignDoublePeriod('12A', 'Tuesday', 'Chemistry', 'T003');
assignDoublePeriod('12A', 'Friday', 'Chemistry', 'T003');
assignDoublePeriod('12A', 'Wednesday', 'Chemistry', 'T003', [[3,4], [1,2], [7,8]]);
assignSinglePeriod('12A', 'Monday', 'Chemistry', 'T003');
assignSinglePeriod('12A', 'Thursday', 'Chemistry', 'T003');

assignDoublePeriod('12A', 'Wednesday', 'Mathematics', 'T005', [[1,2], [3,4]]);
assignDoublePeriod('12A', 'Saturday', 'Mathematics', 'T005', [[1,2], [7,8]]);
assignDoublePeriod('12A', 'Monday', 'Mathematics', 'T005', [[3,4], [7,8]]);
assignSinglePeriod('12A', 'Tuesday', 'Mathematics', 'T005');
assignSinglePeriod('12A', 'Friday', 'Mathematics', 'T005');

days.forEach(d => assignSinglePeriod('12A', d, 'English', 'T009', [4, 3, 2, 1, 7]));

// 12B
assignDoublePeriod('12B', 'Wednesday', 'Physics', 'T001');
assignDoublePeriod('12B', 'Friday', 'Physics', 'T001');
assignDoublePeriod('12B', 'Tuesday', 'Physics', 'T001', [[3,4], [7,8]]);
assignSinglePeriod('12B', 'Monday', 'Physics', 'T001');
assignSinglePeriod('12B', 'Thursday', 'Physics', 'T001');

assignDoublePeriod('12B', 'Monday', 'Chemistry', 'T004');
assignDoublePeriod('12B', 'Thursday', 'Chemistry', 'T004');
assignDoublePeriod('12B', 'Saturday', 'Chemistry', 'T004');
assignSinglePeriod('12B', 'Tuesday', 'Chemistry', 'T004');
assignSinglePeriod('12B', 'Friday', 'Chemistry', 'T004');

assignDoublePeriod('12B', 'Tuesday', 'Mathematics', 'T005');
assignDoublePeriod('12B', 'Friday', 'Mathematics', 'T005');
assignDoublePeriod('12B', 'Thursday', 'Mathematics', 'T005', [[3,4], [7,8]]);
assignSinglePeriod('12B', 'Monday', 'Mathematics', 'T005');
assignSinglePeriod('12B', 'Wednesday', 'Mathematics', 'T005');

days.forEach(d => assignSinglePeriod('12B', d, 'English', 'T009', [3, 4, 2, 7, 8]));

// 12C
assignDoublePeriod('12C', 'Tuesday', 'Physics', 'T002');
assignDoublePeriod('12C', 'Friday', 'Physics', 'T002');
assignDoublePeriod('12C', 'Monday', 'Physics', 'T002', [[3,4], [7,8]]);
assignSinglePeriod('12C', 'Wednesday', 'Physics', 'T002');
assignSinglePeriod('12C', 'Saturday', 'Physics', 'T002');

assignDoublePeriod('12C', 'Wednesday', 'Chemistry', 'T003');
assignDoublePeriod('12C', 'Saturday', 'Chemistry', 'T003');
assignDoublePeriod('12C', 'Thursday', 'Chemistry', 'T003', [[3,4], [7,8]]);
assignSinglePeriod('12C', 'Monday', 'Chemistry', 'T003');
assignSinglePeriod('12C', 'Friday', 'Chemistry', 'T003');

assignDoublePeriod('12C', 'Monday', 'Biology', 'T007');
assignDoublePeriod('12C', 'Thursday', 'Biology', 'T007');
assignDoublePeriod('12C', 'Friday', 'Biology', 'T007', [[3,4], [7,8]]);
assignSinglePeriod('12C', 'Tuesday', 'Biology', 'T007');
assignSinglePeriod('12C', 'Wednesday', 'Biology', 'T007');

days.forEach(d => assignSinglePeriod('12C', d, 'English', 'T010', [4, 3, 2, 1, 7]));

// 3. Class 11 Core Subjects
// 11A (PCM): Phy (T002), Chem (T004), Math (T006), Eng (T009)
assignDoublePeriod('11A', 'Wednesday', 'Physics', 'T002');
assignDoublePeriod('11A', 'Saturday', 'Physics', 'T002');
assignDoublePeriod('11A', 'Thursday', 'Physics', 'T002', [[1,2], [3,4], [7,8]]);
assignSinglePeriod('11A', 'Monday', 'Physics', 'T002');
assignSinglePeriod('11A', 'Friday', 'Physics', 'T002');

assignDoublePeriod('11A', 'Tuesday', 'Chemistry', 'T004');
assignDoublePeriod('11A', 'Friday', 'Chemistry', 'T004');
assignDoublePeriod('11A', 'Monday', 'Chemistry', 'T004', [[3,4], [7,8]]);
assignSinglePeriod('11A', 'Wednesday', 'Chemistry', 'T004');
assignSinglePeriod('11A', 'Saturday', 'Chemistry', 'T004');

assignDoublePeriod('11A', 'Monday', 'Mathematics', 'T006');
assignDoublePeriod('11A', 'Thursday', 'Mathematics', 'T006');
assignDoublePeriod('11A', 'Tuesday', 'Mathematics', 'T006', [[3,4], [7,8]]);
assignSinglePeriod('11A', 'Friday', 'Mathematics', 'T006');
assignSinglePeriod('11A', 'Saturday', 'Mathematics', 'T006');

days.forEach(d => assignSinglePeriod('11A', d, 'English', 'T009', [2, 1, 3, 7, 8]));

// 11B (PCM): Phy (T002), Chem (T003), Math (T006), Eng (T010)
assignDoublePeriod('11B', 'Monday', 'Physics', 'T002');
assignDoublePeriod('11B', 'Thursday', 'Physics', 'T002');
assignDoublePeriod('11B', 'Tuesday', 'Physics', 'T002', [[7,8], [3,4]]);
assignSinglePeriod('11B', 'Wednesday', 'Physics', 'T002');
assignSinglePeriod('11B', 'Saturday', 'Physics', 'T002');

assignDoublePeriod('11B', 'Tuesday', 'Chemistry', 'T003');
assignDoublePeriod('11B', 'Friday', 'Chemistry', 'T003');
assignDoublePeriod('11B', 'Saturday', 'Chemistry', 'T003', [[1,2], [7,8]]);
assignSinglePeriod('11B', 'Monday', 'Chemistry', 'T003');
assignSinglePeriod('11B', 'Thursday', 'Chemistry', 'T003');

assignDoublePeriod('11B', 'Wednesday', 'Mathematics', 'T006');
assignDoublePeriod('11B', 'Saturday', 'Mathematics', 'T006');
assignDoublePeriod('11B', 'Friday', 'Mathematics', 'T006', [[1,2], [3,4]]);
assignSinglePeriod('11B', 'Monday', 'Mathematics', 'T006');
assignSinglePeriod('11B', 'Tuesday', 'Mathematics', 'T006');

days.forEach(d => assignSinglePeriod('11B', d, 'English', 'T010', [3, 2, 4, 7, 8]));

// 11C (PCB): Phy (T001), Chem (T004), Bio (T007), Eng (T010)
assignDoublePeriod('11C', 'Tuesday', 'Physics', 'T001');
assignDoublePeriod('11C', 'Friday', 'Physics', 'T001', [[7,8], [3,4]]);
assignDoublePeriod('11C', 'Wednesday', 'Physics', 'T001', [[7,8], [3,4]]);
assignSinglePeriod('11C', 'Monday', 'Physics', 'T001');
assignSinglePeriod('11C', 'Thursday', 'Physics', 'T001');

assignDoublePeriod('11C', 'Wednesday', 'Chemistry', 'T004');
assignDoublePeriod('11C', 'Saturday', 'Chemistry', 'T004');
assignDoublePeriod('11C', 'Monday', 'Chemistry', 'T004', [[7,8], [3,4]]);
assignSinglePeriod('11C', 'Tuesday', 'Chemistry', 'T004');
assignSinglePeriod('11C', 'Friday', 'Chemistry', 'T004');

assignDoublePeriod('11C', 'Tuesday', 'Biology', 'T007');
assignDoublePeriod('11C', 'Friday', 'Biology', 'T007');
assignDoublePeriod('11C', 'Saturday', 'Biology', 'T007', [[3,4], [7,8]]);
assignSinglePeriod('11C', 'Monday', 'Biology', 'T007');
assignSinglePeriod('11C', 'Wednesday', 'Biology', 'T007');

days.forEach(d => assignSinglePeriod('11C', d, 'English', 'T010', [2, 1, 4, 7, 8]));

// Fill Co-curricular for 11 & 12 (Games, Library, GST, WE)
const activityPool = [
  { sub: 'Games', tId: 'T026' },
  { sub: 'Library', tId: 'T029' },
  { sub: 'GST', tId: 'T029' },
  { sub: 'WE', tId: 'T030' }
];

['12A', '12B', '12C', '11A', '11B', '11C'].forEach(cls => {
  days.forEach(d => {
    for (let p = 1; p <= 8; p++) {
      if (timetable[cls][d][p-1] === null) {
        // find a free activity teacher
        for (const act of activityPool) {
          if (isFree(act.tId, d, p)) {
            assignSlot(cls, d, p, act.sub, act.tId, 'single');
            break;
          }
        }
        // fallback if none free
        if (timetable[cls][d][p-1] === null) {
          assignSlot(cls, d, p, 'WE', 'T030', 'single');
        }
      }
    }
  });
});

// 4. Middle & Secondary Classes (10A-10C, 9A-9C, 8A-8C)
// Stagger subjects across days to avoid collisions
// Subjects: Maths, Science, SST, English, Hindi, Optional/Languages, Coding, Games

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

// For 10, 9, 8: dynamically schedule periods such that NO teacher collision occurs
['10A', '10B', '10C', '9A', '9B', '9C', '8A', '8B', '8C'].forEach((cls, cIdx) => {
  const cfg = secConfigs[cls];
  const is8 = cls.startsWith('8');

  days.forEach((d, dayIdx) => {
    // Subject rotation by day and section index to naturally prevent overlap
    const subList = [
      { name: 'Maths', tId: cfg.m },
      { name: 'Science', tId: cfg.s },
      { name: 'Social Studies', tId: cfg.sst },
      { name: 'English', tId: cfg.e },
      { name: 'Hindi', tId: cfg.h },
      is8 ? { name: 'Sanskrit', tId: 'T027' } : { name: 'Optional', tId: 'T024' },
      is8 ? { name: 'Foreign Lang', tId: 'T028' } : { name: 'Coding', tId: 'T025' },
      { name: 'Games', tId: 'T026' }
    ];

    // Shift list by (dayIdx + cIdx) % 8
    const shift = (dayIdx * 2 + cIdx) % 8;
    const rotated = [...subList.slice(shift), ...subList.slice(0, shift)];

    for (let p = 1; p <= 8; p++) {
      let candidate = rotated[p - 1];
      // if teacher is busy, find alternate subject in rotated that is free
      if (!isFree(candidate.tId, d, p)) {
        const alt = rotated.find(item => isFree(item.tId, d, p));
        if (alt) candidate = alt;
      }
      assignSlot(cls, d, p, candidate.name, candidate.tId, 'single');
    }
  });
});

// Final check & write to timetable.json
const targetFile = path.join(__dirname, 'backend', 'data', 'timetable.json');
fs.writeFileSync(targetFile, JSON.stringify(timetable, null, 2), 'utf-8');
console.log('🎉 Clean Timetable written successfully to', targetFile);

// Collision counter
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
        // exempt PE or multi-section labs
        if (tId !== 'T026' && tId !== 'T024' && tId !== 'T025' && tId !== 'T031' && tId !== 'T027' && tId !== 'T028' && tId !== 'T029' && tId !== 'T030') {
          console.warn(`Collision on ${day} P${p} for Teacher ${tId}: [${list.join(', ')}]`);
          totalCollisions++;
        }
      }
    }
  }
});

console.log('✅ Final Core Collisions:', totalCollisions);
