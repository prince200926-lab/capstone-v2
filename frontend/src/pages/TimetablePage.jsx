import React, { useState, useEffect } from 'react';
import { getClassTimetable, getAllTeachers } from '../services/api';
import PeriodBlock from '../components/PeriodBlock';
import { Calendar, Filter, UserCheck, Award } from 'lucide-react';

const classrooms = [
  '12A', '12B', '12C',
  '11A', '11B', '11C',
  '10A', '10B', '10C',
  '9A', '9B', '9C',
  '8A', '8B', '8C'
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetablePage() {
  const [selectedClass, setSelectedClass] = useState('12A');
  const [timetable, setTimetable] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadTeachers() {
      try {
        const res = await getAllTeachers();
        const list = res.data?.teachers || (Array.isArray(res.data) ? res.data : []);
        setTeachers(list);
      } catch (err) {
        console.error('Failed to load teachers:', err);
      }
    }
    loadTeachers();
  }, []);

  useEffect(() => {
    async function loadSchedule() {
      try {
        setLoading(true);
        const res = await getClassTimetable(selectedClass);
        setTimetable(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, [selectedClass]);

  // Lookup teacher details by ID
  const getTeacher = (id) => teachers.find(t => t.id === id);

  // Find class teacher for the active section
  const classTeacher = teachers.find(t => t.isClassTeacher && t.classTeacherOf === selectedClass);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Master Academic Timetable</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Class section schedules, double-period allocations, and designated Class Teacher anchors
          </p>
        </div>

        {/* Class Selector Pills */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Section:</span>
          {classrooms.map(cls => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                selectedClass === cls
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Class Teacher Banner */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-amber-300 bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-xs">
                Class {selectedClass} Class Teacher:
              </span>
              <span className="px-1.5 py-0.5 rounded font-semibold bg-amber-200 text-amber-900 text-[11px]">
                {classTeacher ? classTeacher.name : 'Assigned CT'}
              </span>
              {classTeacher && (
                <span className="text-slate-500 font-normal">
                  ({classTeacher.department})
                </span>
              )}
            </div>
            <p className="text-slate-600 mt-0.5 text-[11px]">
              Fixed <strong>Period 1 (Mon–Sat)</strong> is dedicated to the Class Teacher's subject & morning attendance assembly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-white border border-amber-300 font-medium text-amber-900 text-[11px]">
            ★ Period 1 Enforced Across All 6 Days
          </span>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm overflow-x-auto">
        <div className="min-w-[850px]">
          {/* Header Row */}
          <div className="grid grid-cols-9 gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-500 text-center">
            <div className="text-left font-bold text-slate-700 dark:text-slate-300">Day / Period</div>
            <div className="text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/30 rounded py-0.5">
              P1 (08:30) ★ CT
            </div>
            <div>P2 (09:15)</div>
            <div>P3 (10:00)</div>
            <div>P4 (10:45)</div>
            <div>P5 (12:00)</div>
            <div>P6 (12:45)</div>
            <div>P7 (01:30)</div>
            <div>P8 (02:15)</div>
          </div>

          {/* Day Rows */}
          {days.map(day => {
            const periods = timetable?.schedule?.[day] || timetable?.[day] || [];
            return (
              <div key={day} className="grid grid-cols-9 gap-2 items-center py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-b-0">
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  {day}
                </div>
                {Array.from({ length: 8 }, (_, i) => i + 1).map(pNum => {
                  const pData = periods.find(p => p.period === pNum);
                  const teacherObj = pData?.teacherId ? getTeacher(pData.teacherId) : null;
                  const teacherDisplay = teacherObj ? teacherObj.name : pData?.teacherId;

                  return (
                    <div key={pNum} className="h-full">
                      <PeriodBlock
                        subject={pData?.subject}
                        teacher={teacherDisplay}
                        room={pData?.room}
                        isDouble={pData?.type === 'double'}
                        isEmpty={!pData}
                        isCT={pNum === 1 || Boolean(pData?.isCTPeriod)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-6 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
        <span className="font-bold text-slate-800 dark:text-slate-200">Subject Legend:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-blue-500/20 border border-blue-500/40"></span> Physics / Science</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/40"></span> Chemistry</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-purple-500/20 border border-purple-500/40"></span> Mathematics</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500/40"></span> English / Language</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-rose-500/20 border border-rose-500/40"></span> Synchronized Optional</span>
        <span className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> ★ Fixed CT Period (P1)</span>
      </div>
    </div>
  );
}
