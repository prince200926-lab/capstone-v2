import React, { useState, useEffect } from 'react';
import { getClassTimetable } from '../services/api';
import PeriodBlock from '../components/PeriodBlock';
import { Calendar, Filter } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
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
    load();
  }, [selectedClass]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Master Weekly Timetable</h1>
          <p className="text-sm text-slate-500">
            Inspect verified schedules, double-period allocations, and synchronized optional blocks
          </p>
        </div>

        {/* Class Selector Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {classrooms.map(cls => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedClass === cls
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="grid grid-cols-9 gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-500 text-center">
            <div className="text-left font-bold text-slate-700 dark:text-slate-300">Day / Period</div>
            <div>P1 (08:30)</div>
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
                  return (
                    <div key={pNum} className="h-full">
                      <PeriodBlock
                        subject={pData?.subject}
                        teacher={pData?.teacherId}
                        room={pData?.room}
                        isDouble={pData?.type === 'double'}
                        isEmpty={!pData}
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
      <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-6 text-xs text-slate-600 dark:text-slate-400">
        <span className="font-bold text-slate-800 dark:text-slate-200">Subject Legend:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-blue-500/20 border border-blue-500/40"></span> Physics / Science</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/40"></span> Chemistry</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-purple-500/20 border border-purple-500/40"></span> Mathematics</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500/40"></span> English / Language</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-rose-500/20 border border-rose-500/40"></span> Synchronized Optional</span>
      </div>
    </div>
  );
}
