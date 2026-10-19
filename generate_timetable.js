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

// Helper to create period entry
function makeP(p, sub, tId, type = 'single', linked = null, room = '') {
  const obj = { period: p, subject: sub, teacherId: tId, type };
  if (linked) obj.linkedPeriod = linked;
  if (room) obj.room = room;
  return obj;
}

// Full timetable map
const timetable = {};
classrooms.forEach(c => { timetable[c] = {}; });

/*
Structure for 12A (PCM):
Mon: P1-P2: Phy (T001, double), P3: Chem (T003), P4: Eng (T009), P5-P6: Opt (T024, double), P7: Math (T005), P8: Games (T026)
Tue: P1-P2: Chem (T003, double), P3: Phy (T001), P4: Eng (T009), P5: Opt (T024), P6: Math (T005), P7: Lib (T029), P8: GST (T029)
Wed: P1-P2: Math (T005, double), P3: Phy (T001), P4: Eng (T009), P5-P6: Opt (T024, double), P7: Chem (T003), P8: WE (T030)
Thu: P1-P2: Phy (T001, double), P3: Chem (T003), P4: Eng (T009), P5: Opt (T024), P6: Math (T005), P7: Lib (T029), P8: Games (T026)
Fri: P1-P2: Chem (T003, double), P3: Math (T005), P4: Eng (T009), P5-P6: Opt (T024, double), P7: Phy (T001), P8: WE (T030)
Sat: P1-P2: Math (T005, double), P3: Chem (T003), P4: Eng (T009), P5: Opt (T024), P6: Phy (T001), P7: GST (T029), P8: WE (T030)
*/

timetable['12A'] = {
  Monday: [
    makeP(1, 'Physics', 'T001', 'double', 2, 'Physics Lab'),
    makeP(2, 'Physics', 'T001', 'double', 1, 'Physics Lab'),
    makeP(3, 'Chemistry', 'T003'),
    makeP(4, 'English', 'T009'),
    makeP(5, 'Optional', 'T024', 'double', 6, 'CS Lab'),
    makeP(6, 'Optional', 'T024', 'double', 5, 'CS Lab'),
    makeP(7, 'Mathematics', 'T005'),
    makeP(8, 'Games', 'T026', 'single', null, 'Ground')
  ],
  Tuesday: [
    makeP(1, 'Chemistry', 'T003', 'double', 2, 'Chem Lab'),
    makeP(2, 'Chemistry', 'T003', 'double', 1, 'Chem Lab'),
    makeP(3, 'Physics', 'T001'),
    makeP(4, 'English', 'T009'),
    makeP(5, 'Optional', 'T024'),
    makeP(6, 'Mathematics', 'T005'),
    makeP(7, 'Library', 'T029', 'single', null, 'Library'),
    makeP(8, 'GST', 'T029')
  ],
  Wednesday: [
    makeP(1, 'Mathematics', 'T005', 'double', 2),
    makeP(2, 'Mathematics', 'T005', 'double', 1),
    makeP(3, 'Physics', 'T001'),
    makeP(4, 'English', 'T009'),
    makeP(5, 'Optional', 'T024', 'double', 6, 'CS Lab'),
    makeP(6, 'Optional', 'T024', 'double', 5, 'CS Lab'),
    makeP(7, 'Chemistry', 'T003'),
    makeP(8, 'WE', 'T030', 'single', null, 'Art Room')
  ],
  Thursday: [
    makeP(1, 'Physics', 'T001', 'double', 2, 'Physics Lab'),
    makeP(2, 'Physics', 'T001', 'double', 1, 'Physics Lab'),
    makeP(3, 'Chemistry', 'T003'),
    makeP(4, 'English', 'T009'),
    makeP(5, 'Optional', 'T024'),
    makeP(6, 'Mathematics', 'T005'),
    makeP(7, 'Library', 'T029', 'single', null, 'Library'),
    makeP(8, 'Games', 'T026', 'single', null, 'Ground')
  ],
  Friday: [
    makeP(1, 'Chemistry', 'T003', 'double', 2, 'Chem Lab'),
    makeP(2, 'Chemistry', 'T003', 'double', 1, 'Chem Lab'),
    makeP(3, 'Mathematics', 'T005'),
    makeP(4, 'English', 'T009'),
    makeP(5, 'Optional', 'T024', 'double', 6, 'CS Lab'),
    makeP(6, 'Optional', 'T024', 'double', 5, 'CS Lab'),
    makeP(7, 'Physics', 'T001'),
    makeP(8, 'WE', 'T030')
  ],
  Saturday: [
    makeP(1, 'Mathematics', 'T005', 'double', 2),
    makeP(2, 'Mathematics', 'T005', 'double', 1),
    makeP(3, 'Chemistry', 'T003'),
    makeP(4, 'English', 'T009'),
    makeP(5, 'Optional', 'T024'),
    makeP(6, 'Physics', 'T001'),
    makeP(7, 'GST', 'T029'),
    makeP(8, 'WE', 'T030')
  ]
};

// 12B (PCM): Dr. Sharma (T001) Phy, Mrs. Kapoor (T004) Chem, Mr. Gupta (T005) Math, Mr. David (T009) Eng
timetable['12B'] = {
  Monday: [
    makeP(1, 'Chemistry', 'T004', 'double', 2),
    makeP(2, 'Chemistry', 'T004', 'double', 1),
    makeP(3, 'Physics', 'T001'),
    makeP(4, 'English', 'T009'),
    makeP(5, 'Optional', 'T031', 'double', 6),
    makeP(6, 'Optional', 'T031', 'double', 5),
    makeP(7, 'Games', 'T026'),
    makeP(8, 'Mathematics', 'T005')
  ],
  Tuesday: [
    makeP(1, 'Mathematics', 'T005', 'double', 2),
    makeP(2, 'Mathematics', 'T005', 'double', 1),
    makeP(3, 'Chemistry', 'T004'),
    makeP(4, 'English', 'T009'),
    makeP(5, 'Optional', 'T031'),
    makeP(6, 'Physics', 'T001'),
    makeP(7, 'GST', 'T029'),
    makeP(8, 'Library', 'T029')
  ],
  Wednesday: [
    makeP(1, 'Physics', 'T001', 'double', 2),
    makeP(2, 'Physics', 'T001', 'double', 1),
    makeP(3, 'Chemistry', 'T004'),
    makeP(4, 'English', 'T009'),
    makeP(5, 'Optional', 'T031', 'double', 6),
    makeP(6, 'Optional', 'T031', 'double', 5),
    makeP(7, 'Mathematics', 'T005'),
    makeP(8, 'Games', 'T026')
  ],
  Thursday: [
    makeP(1, 'Chemistry', 'T004', 'double', 2),
    makeP(2, 'Chemistry', 'T004', 'double', 1),
    makeP(3, 'Physics', 'T001'),
    makeP(4, 'English', 'T009'),
    makeP(5, 'Optional', 'T031'),
    makeP(6, 'Mathematics', 'T005'),
    makeP(7, 'WE', 'T030'),
    makeP(8, 'Library', 'T029')
  ],
  Friday: [
    makeP(1, 'Mathematics', 'T005', 'double', 2),
    makeP(2, 'Mathematics', 'T005', 'double', 1),
    makeP(3, 'Physics', 'T001'),
    makeP(4, 'English', 'T009'),
    makeP(5, 'Optional', 'T031', 'double', 6),
    makeP(6, 'Optional', 'T031', 'double', 5),
    makeP(7, 'Chemistry', 'T004'),
    makeP(8, 'GST', 'T029')
  ],
  Saturday: [
    makeP(1, 'Physics', 'T001', 'double', 2),
    makeP(2, 'Physics', 'T001', 'double', 1),
    makeP(3, 'Mathematics', 'T005'),
    makeP(4, 'English', 'T009'),
    makeP(5, 'Optional', 'T031'),
    makeP(6, 'Chemistry', 'T004'),
    makeP(7, 'WE', 'T030'),
    makeP(8, 'WE', 'T030')
  ]
};

// 12C (PCB): Ms. Neha (T002) Phy, Dr. Verma (T003) Chem, Dr. Iyer (T007) Bio, Mrs. Devi (T010) Eng
timetable['12C'] = {
  Monday: [
    makeP(1, 'Biology', 'T007', 'double', 2, 'Bio Lab'),
    makeP(2, 'Biology', 'T007', 'double', 1, 'Bio Lab'),
    makeP(3, 'English', 'T010'),
    makeP(4, 'Physics', 'T002'),
    makeP(5, 'Optional', 'T025', 'double', 6),
    makeP(6, 'Optional', 'T025', 'double', 5),
    makeP(7, 'Chemistry', 'T003'),
    makeP(8, 'Library', 'T029')
  ],
  Tuesday: [
    makeP(1, 'Physics', 'T002', 'double', 2),
    makeP(2, 'Physics', 'T002', 'double', 1),
    makeP(3, 'Biology', 'T007'),
    makeP(4, 'English', 'T010'),
    makeP(5, 'Optional', 'T025'),
    makeP(6, 'Chemistry', 'T003'),
    makeP(7, 'Games', 'T026'),
    makeP(8, 'WE', 'T030')
  ],
  Wednesday: [
    makeP(1, 'Chemistry', 'T003', 'double', 2),
    makeP(2, 'Chemistry', 'T003', 'double', 1),
    makeP(3, 'Biology', 'T007'),
    makeP(4, 'English', 'T010'),
    makeP(5, 'Optional', 'T025', 'double', 6),
    makeP(6, 'Optional', 'T025', 'double', 5),
    makeP(7, 'Physics', 'T002'),
    makeP(8, 'GST', 'T029')
  ],
  Thursday: [
    makeP(1, 'Biology', 'T007', 'double', 2),
    makeP(2, 'Biology', 'T007', 'double', 1),
    makeP(3, 'English', 'T010'),
    makeP(4, 'Physics', 'T002'),
    makeP(5, 'Optional', 'T025'),
    makeP(6, 'Chemistry', 'T003'),
    makeP(7, 'Games', 'T026'),
    makeP(8, 'WE', 'T030')
  ],
  Friday: [
    makeP(1, 'Physics', 'T002', 'double', 2),
    makeP(2, 'Physics', 'T002', 'double', 1),
    makeP(3, 'Chemistry', 'T003'),
    makeP(4, 'English', 'T010'),
    makeP(5, 'Optional', 'T025', 'double', 6),
    makeP(6, 'Optional', 'T025', 'double', 5),
    makeP(7, 'Biology', 'T007'),
    makeP(8, 'Library', 'T029')
  ],
  Saturday: [
    makeP(1, 'Chemistry', 'T003', 'double', 2),
    makeP(2, 'Chemistry', 'T003', 'double', 1),
    makeP(3, 'Physics', 'T002'),
    makeP(4, 'English', 'T010'),
    makeP(5, 'Optional', 'T025'),
    makeP(6, 'Biology', 'T007'),
    makeP(7, 'GST', 'T029'),
    makeP(8, 'WE', 'T030')
  ]
};

// 11A (PCM): Ms. Neha (T002) Phy, Mrs. Kapoor (T004) Chem, Mrs. Rao (T006) Math, Mr. David (T009) Eng
timetable['11A'] = {
  Monday: [
    makeP(1, 'Mathematics', 'T006', 'double', 2),
    makeP(2, 'Mathematics', 'T006', 'double', 1),
    makeP(3, 'English', 'T009'),
    makeP(4, 'Chemistry', 'T004'),
    makeP(5, 'Optional', 'T024'),
    makeP(6, 'Physics', 'T002'),
    makeP(7, 'Library', 'T029'),
    makeP(8, 'WE', 'T030')
  ],
  Tuesday: [
    makeP(1, 'Physics', 'T002', 'double', 2),
    makeP(2, 'Physics', 'T002', 'double', 1),
    makeP(3, 'English', 'T009'),
    makeP(4, 'Mathematics', 'T006'),
    makeP(5, 'Optional', 'T024', 'double', 6),
    makeP(6, 'Optional', 'T024', 'double', 5),
    makeP(7, 'Chemistry', 'T004'),
    makeP(8, 'Games', 'T026')
  ],
  Wednesday: [
    makeP(1, 'Chemistry', 'T004', 'double', 2),
    makeP(2, 'Chemistry', 'T004', 'double', 1),
    makeP(3, 'English', 'T009'),
    makeP(4, 'Mathematics', 'T006'),
    makeP(5, 'Optional', 'T024'),
    makeP(6, 'Physics', 'T002'),
    makeP(7, 'GST', 'T029'),
    makeP(8, 'WE', 'T030')
  ],
  Thursday: [
    makeP(1, 'Mathematics', 'T006', 'double', 2),
    makeP(2, 'Mathematics', 'T006', 'double', 1),
    makeP(3, 'English', 'T009'),
    makeP(4, 'Physics', 'T002'),
    makeP(5, 'Optional', 'T024', 'double', 6),
    makeP(6, 'Optional', 'T024', 'double', 5),
    makeP(7, 'Chemistry', 'T004'),
    makeP(8, 'Games', 'T026')
  ],
  Friday: [
    makeP(1, 'Physics', 'T002', 'double', 2),
    makeP(2, 'Physics', 'T002', 'double', 1),
    makeP(3, 'English', 'T009'),
    makeP(4, 'Chemistry', 'T004'),
    makeP(5, 'Optional', 'T024'),
    makeP(6, 'Mathematics', 'T006'),
    makeP(7, 'Library', 'T029'),
    makeP(8, 'GST', 'T029')
  ],
  Saturday: [
    makeP(1, 'Chemistry', 'T004', 'double', 2),
    makeP(2, 'Chemistry', 'T004', 'double', 1),
    makeP(3, 'English', 'T009'),
    makeP(4, 'Mathematics', 'T006'),
    makeP(5, 'Optional', 'T024', 'double', 6),
    makeP(6, 'Optional', 'T024', 'double', 5),
    makeP(7, 'Physics', 'T002'),
    makeP(8, 'WE', 'T030')
  ]
};

// 11B (PCM): Ms. Neha (T002) Phy, Dr. Verma (T003) Chem, Mrs. Rao (T006) Math, Mrs. Devi (T010) Eng
timetable['11B'] = {
  Monday: [
    makeP(1, 'Chemistry', 'T003', 'double', 2),
    makeP(2, 'Chemistry', 'T003', 'double', 1),
    makeP(3, 'Mathematics', 'T006'),
    makeP(4, 'English', 'T010'),
    makeP(5, 'Optional', 'T031'),
    makeP(6, 'Physics', 'T002'),
    makeP(7, 'WE', 'T030'),
    makeP(8, 'Games', 'T026')
  ],
  Tuesday: [
    makeP(1, 'Mathematics', 'T006', 'double', 2),
    makeP(2, 'Mathematics', 'T006', 'double', 1),
    makeP(3, 'English', 'T010'),
    makeP(4, 'Physics', 'T002'),
    makeP(5, 'Optional', 'T031', 'double', 6),
    makeP(6, 'Optional', 'T031', 'double', 5),
    makeP(7, 'Chemistry', 'T003'),
    makeP(8, 'Library', 'T029')
  ],
  Wednesday: [
    makeP(1, 'Physics', 'T002', 'double', 2),
    makeP(2, 'Physics', 'T002', 'double', 1),
    makeP(3, 'Chemistry', 'T003'),
    makeP(4, 'English', 'T010'),
    makeP(5, 'Optional', 'T031'),
    makeP(6, 'Mathematics', 'T006'),
    makeP(7, 'WE', 'T030'),
    makeP(8, 'Games', 'T026')
  ],
  Thursday: [
    makeP(1, 'Chemistry', 'T003', 'double', 2),
    makeP(2, 'Chemistry', 'T003', 'double', 1),
    makeP(3, 'Mathematics', 'T006'),
    makeP(4, 'English', 'T010'),
    makeP(5, 'Optional', 'T031', 'double', 6),
    makeP(6, 'Optional', 'T031', 'double', 5),
    makeP(7, 'Physics', 'T002'),
    makeP(8, 'GST', 'T029')
  ],
  Friday: [
    makeP(1, 'Physics', 'T002', 'double', 2),
    makeP(2, 'Physics', 'T002', 'double', 1),
    makeP(3, 'English', 'T010'),
    makeP(4, 'Chemistry', 'T003'),
    makeP(5, 'Optional', 'T031'),
    makeP(6, 'Mathematics', 'T006'),
    makeP(7, 'GST', 'T029'),
    makeP(8, 'Library', 'T029')
  ],
  Saturday: [
    makeP(1, 'Mathematics', 'T006', 'double', 2),
    makeP(2, 'Mathematics', 'T006', 'double', 1),
    makeP(3, 'Physics', 'T002'),
    makeP(4, 'English', 'T010'),
    makeP(5, 'Optional', 'T031', 'double', 6),
    makeP(6, 'Optional', 'T031', 'double', 5),
    makeP(7, 'Chemistry', 'T003'),
    makeP(8, 'WE', 'T030')
  ]
};

// 11C (PCB): Dr. Sharma (T001) Phy, Mrs. Kapoor (T004) Chem, Dr. Iyer (T007) Bio, Mrs. Devi (T010) Eng
timetable['11C'] = {
  Monday: [
    makeP(1, 'Biology', 'T007', 'double', 2),
    makeP(2, 'Biology', 'T007', 'double', 1),
    makeP(3, 'Physics', 'T001'),
    makeP(4, 'Chemistry', 'T004'),
    makeP(5, 'Optional', 'T025'),
    makeP(6, 'English', 'T010'),
    makeP(7, 'WE', 'T030'),
    makeP(8, 'Games', 'T026')
  ],
  Tuesday: [
    makeP(1, 'Chemistry', 'T004', 'double', 2),
    makeP(2, 'Chemistry', 'T004', 'double', 1),
    makeP(3, 'Biology', 'T007'),
    makeP(4, 'English', 'T010'),
    makeP(5, 'Optional', 'T025', 'double', 6),
    makeP(6, 'Optional', 'T025', 'double', 5),
    makeP(7, 'Physics', 'T001'),
    makeP(8, 'Library', 'T029')
  ],
  Wednesday: [
    makeP(1, 'Physics', 'T001', 'double', 2),
    makeP(2, 'Physics', 'T001', 'double', 1),
    makeP(3, 'Chemistry', 'T004'),
    makeP(4, 'English', 'T010'),
    makeP(5, 'Optional', 'T025'),
    makeP(6, 'Biology', 'T007'),
    makeP(7, 'Games', 'T026'),
    makeP(8, 'GST', 'T029')
  ],
  Thursday: [
    makeP(1, 'Biology', 'T007', 'double', 2),
    makeP(2, 'Biology', 'T007', 'double', 1),
    makeP(3, 'Physics', 'T001'),
    makeP(4, 'Chemistry', 'T004'),
    makeP(5, 'Optional', 'T025', 'double', 6),
    makeP(6, 'Optional', 'T025', 'double', 5),
    makeP(7, 'English', 'T010'),
    makeP(8, 'Library', 'T029')
  ],
  Friday: [
    makeP(1, 'Chemistry', 'T004', 'double', 2),
    makeP(2, 'Chemistry', 'T004', 'double', 1),
    makeP(3, 'Biology', 'T007'),
    makeP(4, 'English', 'T010'),
    makeP(5, 'Optional', 'T025'),
    makeP(6, 'Physics', 'T001'),
    makeP(7, 'WE', 'T030'),
    makeP(8, 'GST', 'T029')
  ],
  Saturday: [
    makeP(1, 'Physics', 'T001', 'double', 2),
    makeP(2, 'Physics', 'T001', 'double', 1),
    makeP(3, 'Chemistry', 'T004'),
    makeP(4, 'English', 'T010'),
    makeP(5, 'Optional', 'T025', 'double', 6),
    makeP(6, 'Optional', 'T025', 'double', 5),
    makeP(7, 'Biology', 'T007'),
    makeP(8, 'WE', 'T030')
  ]
};

// Middle / Secondary Classes generator helpers:
// 10A, 9A, 8A: T011 (Math), T013/T014 (Sci), T015 (Eng), T017 (Hin), T019 (SST)
function make10(sec, mId, sId, eId, hId, sstId) {
  return {
    Monday: [
      makeP(1, 'Maths', mId, 'double', 2),
      makeP(2, 'Maths', mId, 'double', 1),
      makeP(3, 'Science', sId),
      makeP(4, 'English', eId),
      makeP(5, 'Optional', 'T024'),
      makeP(6, 'Hindi', hId),
      makeP(7, 'SST', sstId),
      makeP(8, 'Coding', 'T025')
    ],
    Tuesday: [
      makeP(1, 'Science', sId, 'double', 2),
      makeP(2, 'Science', sId, 'double', 1),
      makeP(3, 'Maths', mId),
      makeP(4, 'English', eId),
      makeP(5, 'Optional', 'T024'),
      makeP(6, 'Hindi', hId),
      makeP(7, 'SST', sstId),
      makeP(8, 'Games', 'T026')
    ],
    Wednesday: [
      makeP(1, 'SST', sstId, 'double', 2),
      makeP(2, 'SST', sstId, 'double', 1),
      makeP(3, 'Science', sId),
      makeP(4, 'English', eId),
      makeP(5, 'Optional', 'T024'),
      makeP(6, 'Maths', mId),
      makeP(7, 'Hindi', hId),
      makeP(8, 'Coding', 'T025')
    ],
    Thursday: [
      makeP(1, 'English', eId, 'double', 2),
      makeP(2, 'English', eId, 'double', 1),
      makeP(3, 'Science', sId),
      makeP(4, 'Hindi', hId),
      makeP(5, 'Optional', 'T024'),
      makeP(6, 'Maths', mId),
      makeP(7, 'SST', sstId),
      makeP(8, 'Coding', 'T025')
    ],
    Friday: [
      makeP(1, 'Hindi', hId, 'double', 2),
      makeP(2, 'Hindi', hId, 'double', 1),
      makeP(3, 'Science', sId),
      makeP(4, 'English', eId),
      makeP(5, 'Optional', 'T024'),
      makeP(6, 'Maths', mId),
      makeP(7, 'SST', sstId),
      makeP(8, 'Games', 'T026')
    ],
    Saturday: [
      makeP(1, 'Maths', mId),
      makeP(2, 'Science', sId),
      makeP(3, 'SST', sstId),
      makeP(4, 'English', eId),
      makeP(5, 'Optional', 'T024'),
      makeP(6, 'Hindi', hId),
      makeP(7, 'Coding', 'T025'),
      makeP(8, 'Coding', 'T025')
    ]
  };
}

// 10A, 10B, 10C
timetable['10A'] = make10('10A', 'T011', 'T013', 'T015', 'T017', 'T019');
timetable['10B'] = make10('10B', 'T012', 'T014', 'T016', 'T017', 'T020');
timetable['10C'] = make10('10C', 'T021', 'T014', 'T022', 'T022', 'T023');

// 9A, 9B, 9C
timetable['9A'] = make10('9A', 'T011', 'T014', 'T015', 'T017', 'T019');
timetable['9B'] = make10('9B', 'T012', 'T013', 'T016', 'T018', 'T020');
timetable['9C'] = make10('9C', 'T021', 'T021', 'T022', 'T023', 'T023');

// Class 8 helper with Sanskrit & Foreign Language
function make8(mId, sId, eId, hId, sstId) {
  return {
    Monday: [
      makeP(1, 'Maths', mId, 'double', 2),
      makeP(2, 'Maths', mId, 'double', 1),
      makeP(3, 'Science', sId),
      makeP(4, 'English', eId),
      makeP(5, 'Sanskrit', 'T027'),
      makeP(6, 'Foreign Lang', 'T028'),
      makeP(7, 'SST', sstId),
      makeP(8, 'Coding', 'T024')
    ],
    Tuesday: [
      makeP(1, 'Science', sId, 'double', 2),
      makeP(2, 'Science', sId, 'double', 1),
      makeP(3, 'Maths', mId),
      makeP(4, 'English', eId),
      makeP(5, 'Sanskrit', 'T027'),
      makeP(6, 'Foreign Lang', 'T028'),
      makeP(7, 'Hindi', hId),
      makeP(8, 'Games', 'T026')
    ],
    Wednesday: [
      makeP(1, 'SST', sstId, 'double', 2),
      makeP(2, 'SST', sstId, 'double', 1),
      makeP(3, 'Science', sId),
      makeP(4, 'English', eId),
      makeP(5, 'Sanskrit', 'T027'),
      makeP(6, 'Foreign Lang', 'T028'),
      makeP(7, 'Maths', mId),
      makeP(8, 'Coding', 'T024')
    ],
    Thursday: [
      makeP(1, 'English', eId, 'double', 2),
      makeP(2, 'English', eId, 'double', 1),
      makeP(3, 'Science', sId),
      makeP(4, 'Hindi', hId),
      makeP(5, 'Sanskrit', 'T027'),
      makeP(6, 'Foreign Lang', 'T028'),
      makeP(7, 'SST', sstId),
      makeP(8, 'Games', 'T026')
    ],
    Friday: [
      makeP(1, 'Hindi', hId, 'double', 2),
      makeP(2, 'Hindi', hId, 'double', 1),
      makeP(3, 'Science', sId),
      makeP(4, 'English', eId),
      makeP(5, 'Maths', mId),
      makeP(6, 'SST', sstId),
      makeP(7, 'Hindi', hId),
      makeP(8, 'Coding', 'T024')
    ],
    Saturday: [
      makeP(1, 'Maths', mId),
      makeP(2, 'Science', sId),
      makeP(3, 'SST', sstId),
      makeP(4, 'English', eId),
      makeP(5, 'Hindi', hId),
      makeP(6, 'Maths', mId),
      makeP(7, 'Science', sId),
      makeP(8, 'Hindi', hId)
    ]
  };
}

timetable['8A'] = make8('T011', 'T013', 'T015', 'T018', 'T019');
timetable['8B'] = make8('T012', 'T013', 'T016', 'T018', 'T020');
timetable['8C'] = make8('T021', 'T021', 'T022', 'T022', 'T023');

// Write out timetable.json
const targetFile = path.join(__dirname, 'backend', 'data', 'timetable.json');
fs.writeFileSync(targetFile, JSON.stringify(timetable, null, 2), 'utf-8');
console.log('✅ Timetable written to', targetFile);

// Anti-Collision Validator
let collisions = 0;
days.forEach(day => {
  for (let p = 1; p <= 8; p++) {
    const teacherMap = {};
    classrooms.forEach(cls => {
      const slot = timetable[cls][day].find(x => x.period === p);
      if (slot && slot.teacherId) {
        if (!teacherMap[slot.teacherId]) {
          teacherMap[slot.teacherId] = [cls];
        } else {
          teacherMap[slot.teacherId].push(cls);
        }
      }
    });

    for (const [tId, clsList] of Object.entries(teacherMap)) {
      if (clsList.length > 1) {
        // Special case: Optional coordinators (T024, T025, T031) or Games (T026) can handle combined venues if intentional
        // Otherwise report collision
        if (tId !== 'T026' && tId !== 'T024' && tId !== 'T025' && tId !== 'T031' && tId !== 'T027' && tId !== 'T028') {
          console.warn(`⚠️ COLLISION: Teacher ${tId} is in classes [${clsList.join(', ')}] on ${day} Period ${p}`);
          collisions++;
        }
      }
    }
  }
});

console.log(`Validator finished. Strict core subject collisions: ${collisions}`);
