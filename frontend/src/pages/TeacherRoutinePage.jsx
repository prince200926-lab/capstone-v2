import React, { useState, useEffect } from 'react';
import { 
  getAllTeachers, 
  getTeacherSchedule, 
  getTodayAttendance, 
  getTodaySubstitutions 
} from '../services/api';
import { 
  Clock, 
  User, 
  Calendar, 
  BookOpen, 
  Search, 
  Award, 
  ArrowRight, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Users,
  Layers,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

const PERIOD_TIMES = [
  { period: 1, time: '08:30 – 09:15', label: 'Period 1 (CT)' },
  { period: 2, time: '09:15 – 10:00', label: 'Period 2' },
  { period: 3, time: '10:00 – 10:45', label: 'Period 3' },
  { period: 4, time: '10:45 – 11:30', label: 'Period 4' },
  { period: 5, time: '12:00 – 12:45', label: 'Period 5' },
  { period: 6, time: '12:45 – 01:30', label: 'Period 6' },
  { period: 7, time: '01:30 – 02:15', label: 'Period 7' },
  { period: 8, time: '02:15 – 03:00', label: 'Period 8' }
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TeacherRoutinePage() {
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' (default substitutions) | 'teacher'
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('T001');
  const [teacherSchedule, setTeacherSchedule] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [todaySubstitutions, setTodaySubstitutions] = useState([]);
  
  // Matrix mode: strictly for TODAY, filtered by period ('ALL' or 1..8)
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // Today's Day Name
  const todayName = (() => {
    const dayIndex = new Date().getDay();
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayMap[dayIndex] || 'Monday';
  })();
  const effectiveToday = todayName === 'Sunday' ? 'Monday' : todayName;
  const todayDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // 1. Initial Load: Teachers, Today Attendance, Today Substitutions
  useEffect(() => {
    async function loadMeta() {
      try {
        setLoading(true);
        const [tRes, aRes, sRes] = await Promise.all([
          getAllTeachers(),
          getTodayAttendance(),
          getTodaySubstitutions()
        ]);
        const tList = tRes.data?.teachers || (Array.isArray(tRes.data) ? tRes.data : []);
        const aList = aRes.data?.attendance || (Array.isArray(aRes.data) ? aRes.data : []);
        const sList = sRes.data?.substitutions || (Array.isArray(sRes.data) ? sRes.data : []);

        setTeachers(tList);
        setTodayAttendance(aList);
        setTodaySubstitutions(sList);

        if (tList.length > 0 && !selectedTeacherId) {
          setSelectedTeacherId(tList[0].id);
        }
      } catch (err) {
        console.error('Failed to load routine metadata', err);
      } finally {
        setLoading(false);
      }
    }
    loadMeta();
  }, []);

  // 2. Load Selected Teacher Schedule
  useEffect(() => {
    if (!selectedTeacherId) return;
    async function loadTeacherRoutine() {
      try {
        const res = await getTeacherSchedule(selectedTeacherId);
        setTeacherSchedule(res.data?.schedule || null);
      } catch (err) {
        console.error('Failed to load teacher schedule', err);
      }
    }
    loadTeacherRoutine();
  }, [selectedTeacherId]);

  // Active Teacher Profile
  const activeTeacher = teachers.find(t => t.id === selectedTeacherId);
  const activeTeacherAttendance = todayAttendance.find(a => a.teacherId === selectedTeacherId || a.id === selectedTeacherId);

  // Substitutions where this teacher is assigned as the substitute today
  const mySubstituteDuties = todaySubstitutions.filter(s => {
    const subId = s.substituteTeacherId || s.substituteTeacher?.id;
    return subId === selectedTeacherId;
  });

  // Filtered substitutions for Live Matrix (Strictly Today)
  const filteredMatrixSubstitutions = todaySubstitutions.filter(s => {
    if (selectedPeriodFilter === 'ALL') return true;
    return s.period === Number(selectedPeriodFilter);
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Faculty Routine & Class Duty Portal
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Today's Live Duties
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time classroom duty tracking: inspect which teacher has to cover which class today
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Live Substitution Matrix (Today)
            </button>
            <button
              onClick={() => setViewMode('teacher')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'teacher'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              My Schedule & Routine
            </button>
          </div>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition"
            title="Print schedule"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: LIVE CLASSROOM SUBSTITUTION MATRIX (TODAY ONLY)                   */}
      {/* ========================================================================= */}
      {viewMode === 'matrix' && (
        <div className="space-y-6">
          {/* Date & Period Filter Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Live Substitutions for Today
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {todayDateFormatted}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Substitutions are computed day-by-day based on morning attendance. Only classes requiring replacement coverage are shown.
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {todaySubstitutions.length} Total Substitution Duties Today
                </span>
              </div>
            </div>

            {/* Period Filter Buttons */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">
                Filter by Period:
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setSelectedPeriodFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    selectedPeriodFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  All Periods ({todaySubstitutions.length})
                </button>

                {PERIOD_TIMES.map(({ period, time }) => {
                  const countForPeriod = todaySubstitutions.filter(s => s.period === period).length;
                  return (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriodFilter(String(period))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                        selectedPeriodFilter === String(period)
                          ? 'bg-indigo-600 text-white shadow-sm font-bold'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <span>P{period}</span>
                      <span className="text-[10px] font-mono text-slate-400">({time.split('–')[0].trim()})</span>
                      {countForPeriod > 0 && (
                        <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          selectedPeriodFilter === String(period) ? 'bg-white text-indigo-700' : 'bg-amber-500 text-white'
                        }`}>
                          {countForPeriod}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Substitution Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Active Class Substitutions ({filteredMatrixSubstitutions.length} Classes)
              </h3>
              <span className="text-xs text-slate-500">
                {selectedPeriodFilter === 'ALL' ? 'Across All Periods Today' : `Period ${selectedPeriodFilter} Only`}
              </span>
            </div>

            {filteredMatrixSubstitutions.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  No Substitutions Required {selectedPeriodFilter !== 'ALL' ? `in Period ${selectedPeriodFilter}` : 'Today'}!
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {todaySubstitutions.length === 0
                    ? 'All scheduled faculty members are punched in and present. Every classroom is covered by its regular teacher.'
                    : `No classes have absent teachers during Period ${selectedPeriodFilter}. All scheduled classes are running normally.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMatrixSubstitutions.map(sub => {
                  const absentName = sub.absentTeacherName || sub.absentTeacher?.name || sub.absentTeacherId || 'Absent Teacher';
                  const subName = sub.substituteTeacherName || sub.substituteTeacher?.name || sub.substituteTeacherId || 'Assigned Substitute';
                  const timeStr = PERIOD_TIMES[sub.period - 1]?.time || '';

                  return (
                    <div
                      key={sub.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-emerald-400 dark:border-emerald-800/80 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Period & Class Header */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                Period {sub.period}
                              </span>
                              <span className="text-xs font-mono font-medium text-slate-400">
                                {timeStr}
                              </span>
                            </div>
                            <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                              Class {sub.classSection}
                            </h4>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Room {sub.classSection}
                            </span>
                            {(sub.period === 1 || sub.isCTPeriod) && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 shadow-2xs">
                                ★ CT Period
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Subject */}
                        <div className="mb-4">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</p>
                          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                            {sub.subject}
                          </p>
                        </div>

                        {/* Replacement Card: Absent -> Substitute */}
                        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                          {/* Absent Teacher */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Regular Faculty:</span>
                            <span className="text-rose-600 line-through font-semibold">
                              {absentName} {sub.isAbsentTeacherCT ? '(CT)' : ''}
                            </span>
                          </div>

                          {/* Arrow Divider */}
                          <div className="flex items-center gap-2 py-0.5">
                            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                            <span className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                              Assigned To Go
                            </span>
                            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                          </div>

                          {/* Substitute Teacher To Go */}
                          <div className="flex items-center gap-2.5 pt-1">
                            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                              {subName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-black text-xs text-emerald-950 dark:text-emerald-200 truncate">
                                {subName}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {sub.reason || 'Optimal Pedagogical Match'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Duty Confirmation */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Duty Action</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                          Go to Room {sub.classSection} at {timeStr.split('–')[0].trim()}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: INDIVIDUAL TEACHER ROUTINE                                        */}
      {/* ========================================================================= */}
      {viewMode === 'teacher' && (
        <div className="space-y-6">
          {/* Faculty Quick Picker */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Select Faculty Member
                </label>
                <p className="text-[11px] text-slate-500">View their daily timetable & assigned substitute duties today</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <select
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.department} - {t.designation}){t.isClassTeacher ? ` [★ CT: ${t.classTeacherOf}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Teacher Profile Summary Card */}
          {activeTeacher && (
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg font-black shadow-md">
                  {activeTeacher.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold">{activeTeacher.name}</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 uppercase tracking-wider">
                      {activeTeacher.id} • {activeTeacher.designation}
                    </span>
                    {activeTeacher.isClassTeacher && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded bg-amber-500 text-slate-950 shadow-xs">
                        <Award className="w-3 h-3 text-slate-950" />
                        Class Teacher: {activeTeacher.classTeacherOf}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 flex items-center gap-3">
                    <span><strong>Dept:</strong> {activeTeacher.department}</span>
                    <span>•</span>
                    <span><strong>Classes:</strong> {activeTeacher.assignedClasses?.join(', ')}</span>
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                  activeTeacherAttendance?.status === 'PRESENT'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${activeTeacherAttendance?.status === 'PRESENT' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                  {activeTeacherAttendance?.status === 'PRESENT' 
                    ? `Punched In (${activeTeacherAttendance.punchTime || 'Present'})`
                    : 'Absent / Unreported'}
                </div>
              </div>
            </div>
          )}

          {/* Today's Live Duties & Substitution Alerts */}
          {mySubstituteDuties.length > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 shadow-sm animate-pulse-once">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm mb-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Active Substitution Duty Assigned Today ({mySubstituteDuties.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mySubstituteDuties.map(sub => (
                  <div key={sub.id} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                        Period {sub.period} ({PERIOD_TIMES[sub.period - 1]?.time})
                      </span>
                      <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                        Class {sub.classSection} • {sub.subject}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Substituting for: <strong className="text-rose-600 line-through">{sub.absentTeacherName || sub.absentTeacher?.name}</strong>
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      Duty Confirmed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today at a Glance: Period 1 to 8 Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Today's Timeline ({effectiveToday} - {todayDateFormatted})
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                8 Scheduled Periods
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PERIOD_TIMES.map(({ period, time, label }) => {
                const todaySlots = teacherSchedule?.[effectiveToday] || [];
                const regularSlot = todaySlots.find(s => s.period === period);
                const subDuty = mySubstituteDuties.find(s => s.period === period);

                const isFree = !regularSlot && !subDuty;
                const isCT = period === 1 && activeTeacher?.isClassTeacher;

                return (
                  <div
                    key={period}
                    className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${
                      subDuty
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-800 ring-2 ring-emerald-500/20'
                        : regularSlot
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60'
                          : 'bg-slate-50/70 dark:bg-slate-900/40 border-dashed border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-extrabold font-mono text-slate-500">
                          Period {period}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {time}
                        </span>
                      </div>

                      {/* Case 1: Assigned Substitute Duty */}
                      {subDuty && (
                        <div>
                          <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-300 mb-0.5">
                            <Sparkles className="w-3 h-3" /> Substitute Duty
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            Class {subDuty.classSection}
                          </h4>
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            {subDuty.subject}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            For {subDuty.absentTeacherName || subDuty.absentTeacher?.name}
                          </p>
                        </div>
                      )}

                      {/* Case 2: Regular Scheduled Class */}
                      {!subDuty && regularSlot && (
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              Class {regularSlot.classSection}
                            </h4>
                            {isCT && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                                ★ CT
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mt-0.5">
                            {regularSlot.subject}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Room {regularSlot.classSection}
                          </p>
                        </div>
                      )}

                      {/* Case 3: Free / Prep Period */}
                      {isFree && (
                        <div className="py-2 text-center">
                          <p className="text-xs font-semibold text-slate-400">
                            Free Period
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Prep / Available for Sub
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                      <span className={`font-semibold ${
                        subDuty ? 'text-emerald-700 dark:text-emerald-300' : regularSlot ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400'
                      }`}>
                        {subDuty ? 'Substitute Duty' : regularSlot ? 'Teaching' : 'Open'}
                      </span>
                      <span className="text-slate-400">
                        {regularSlot?.classSection ? `Go to Room ${regularSlot.classSection}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regular Full Weekly Schedule Matrix */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm overflow-x-auto">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Regular Weekly Timetable ({activeTeacher?.name})
                </h3>
                <p className="text-xs text-slate-500">Permanent schedule across all 6 days (Monday through Saturday)</p>
              </div>
            </div>

            <div className="min-w-[800px]">
              {/* Header */}
              <div className="grid grid-cols-9 gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 text-center">
                <div className="text-left text-slate-700 dark:text-slate-300">Day / Period</div>
                {PERIOD_TIMES.map(p => (
                  <div key={p.period} className="flex flex-col">
                    <span>P{p.period}</span>
                    <span className="text-[9px] font-mono text-slate-400">{p.time.split('–')[0].trim()}</span>
                  </div>
                ))}
              </div>

              {/* Day Rows */}
              {DAYS.map(day => {
                const daySlots = teacherSchedule?.[day] || [];
                const isCurrentDay = day === effectiveToday;

                return (
                  <div 
                    key={day} 
                    className={`grid grid-cols-9 gap-2 items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0 ${
                      isCurrentDay ? 'bg-indigo-50/30 dark:bg-indigo-950/20 rounded-lg' : ''
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {day}
                      {isCurrentDay && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                      )}
                    </div>

                    {PERIOD_TIMES.map(p => {
                      const slot = daySlots.find(s => s.period === p.period);
                      const isCT = p.period === 1 && activeTeacher?.isClassTeacher;

                      if (!slot) {
                        return (
                          <div 
                            key={p.period} 
                            className="h-14 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-[11px] text-slate-400"
                          >
                            —
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={p.period} 
                          className={`h-14 rounded-lg border p-1.5 flex flex-col justify-between transition hover:shadow-sm ${
                            isCT 
                              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                              : 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {slot.classSection}
                            </span>
                            {isCT && (
                              <span className="text-[8px] font-extrabold px-1 rounded bg-amber-500 text-slate-950">
                                CT
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold truncate">
                            {slot.subject}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
