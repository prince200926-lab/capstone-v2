import React, { useState, useEffect } from 'react';
import { getAllTeachers, punchAttendance, markLeave, markAbsent, batchSync, createTeacher, getTodayAttendance } from '../services/api';
import { ShieldCheck, UserPlus, UserCheck, Zap, CheckSquare, Square, Search, Filter, RefreshCw, Clock, Lock, Key, Eye, EyeOff, LogOut } from 'lucide-react';

const ADMIN_SECRET = 'admin123';

export default function AdminPanelPage() {
  // Authentication State
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('admin_unlocked') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState('batch'); // 'batch' | 'single' | 'newTeacher'
  const [teachers, setTeachers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);

  // Custom Batch State
  const [selectedForBatch, setSelectedForBatch] = useState(new Set());
  const [batchSearch, setBatchSearch] = useState('');
  const [batchDeptFilter, setBatchDeptFilter] = useState('ALL');
  const [baseTime, setBaseTime] = useState('08:15');

  // Single Manual Punch State
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [punchStatus, setPunchStatus] = useState('PRESENT');
  const [punchTime, setPunchTime] = useState('08:15');
  const [leaveReason, setLeaveReason] = useState('Medical Leave');

  // New Teacher Form State
  const [newTeacher, setNewTeacher] = useState({
    id: '',
    name: '',
    department: 'Mathematics',
    subjects: 'Mathematics',
    designation: 'TGT',
    type: 'secondary',
    assignedClasses: '10A, 9A, 8A',
    contact: ''
  });

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_SECRET) {
      setIsUnlocked(true);
      sessionStorage.setItem('admin_unlocked', 'true');
      setAuthError('');
      setPasswordInput('');
    } else {
      setAuthError('Access Denied: Invalid Administrative Password');
    }
  };

  const handleLogout = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('admin_unlocked');
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, aRes] = await Promise.all([
        getAllTeachers(),
        getTodayAttendance()
      ]);
      const tList = tRes.data?.teachers || (Array.isArray(tRes.data) ? tRes.data : []);
      const aList = aRes.data?.attendance || (Array.isArray(aRes.data) ? aRes.data : []);
      setTeachers(tList);
      setAttendance(aList);

      if (tList.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(tList[0].id);
      }

      // Default batch selection: all except T001 (Dr. Sharma) and T011 (Mr. Kumar) for realistic demo
      const initialSelected = new Set(
        tList.filter(t => t.id !== 'T001' && t.id !== 'T011').map(t => t.id)
      );
      setSelectedForBatch(initialSelected);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Batch Toggle Handlers
  const toggleTeacher = (id) => {
    const next = new Set(selectedForBatch);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedForBatch(next);
  };

  const handleSelectAll = () => {
    setSelectedForBatch(new Set(teachers.map(t => t.id)));
  };

  const handleDeselectAll = () => {
    setSelectedForBatch(new Set());
  };

  const handlePresetDemo = () => {
    // Dr. Sharma (Physics 12A) and Mr. Ramesh Kumar (Maths 10A) ABSENT
    const demoSet = new Set(teachers.filter(t => t.id !== 'T001' && t.id !== 'T011').map(t => t.id));
    setSelectedForBatch(demoSet);
  };

  // Run Custom Batch Punch
  const handleExecuteCustomBatch = async () => {
    if (selectedForBatch.size === 0) {
      if (!confirm('You have selected 0 teachers. This will leave ALL teachers marked ABSENT. Continue?')) {
        return;
      }
    }

    try {
      setLoading(true);
      const [h, m] = baseTime.split(':').map(Number);

      const punches = Array.from(selectedForBatch).map((tId, idx) => {
        const offsetMins = (m + Math.floor(idx / 2)) % 60;
        const offsetHours = h + Math.floor((m + Math.floor(idx / 2)) / 60);
        const timeStr = `${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}:${String((idx * 7) % 60).padStart(2, '0')}`;
        return { teacherId: tId, time: timeStr };
      });

      await batchSync({ punches, replace: true });
      const absentCount = teachers.length - selectedForBatch.size;
      alert(`Success! Recorded ${punches.length} PRESENT punches. ${absentCount} teacher(s) marked ABSENT. Main Dashboard is now synchronized.`);
      loadData();
    } catch (err) {
      alert('Batch sync failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Single Attendance Submission
  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId) return;

    try {
      setLoading(true);
      if (punchStatus === 'PRESENT') {
        await punchAttendance({
          deviceId: 'ADMIN_CONSOLE',
          teacherId: selectedTeacherId,
          punchTime: punchTime,
          timestamp: new Date().toISOString(),
          punchType: 'CHECK_IN'
        });
        alert(`Recorded PRESENT for ${selectedTeacherId} at ${punchTime}`);
      } else if (punchStatus === 'ON_LEAVE') {
        await markLeave({
          teacherId: selectedTeacherId,
          reason: leaveReason
        });
        alert(`Marked ON LEAVE for ${selectedTeacherId}: ${leaveReason}`);
      } else {
        await markAbsent({
          teacherId: selectedTeacherId
        });
        alert(`Marked ABSENT for ${selectedTeacherId}. Punch cleared.`);
      }
      loadData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Add New Teacher
  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await createTeacher({
        ...newTeacher,
        subjects: newTeacher.subjects.split(',').map(s => s.trim()),
        assignedClasses: newTeacher.assignedClasses.split(',').map(c => c.trim())
      });
      alert(`Teacher ${newTeacher.name} successfully created!`);
      setNewTeacher({
        id: '',
        name: '',
        department: 'Mathematics',
        subjects: 'Mathematics',
        designation: 'TGT',
        type: 'secondary',
        assignedClasses: '10A, 9A, 8A',
        contact: ''
      });
      loadData();
    } catch (err) {
      alert('Error creating teacher: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Filtered teachers for custom batch list
  const departments = ['ALL', ...new Set(teachers.map(t => t.department))];
  const filteredBatchTeachers = teachers.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(batchSearch.toLowerCase()) ||
                          t.department.toLowerCase().includes(batchSearch.toLowerCase()) ||
                          t.id.toLowerCase().includes(batchSearch.toLowerCase());
    const matchesDept = batchDeptFilter === 'ALL' || t.department === batchDeptFilter;
    return matchesSearch && matchesDept;
  });

  if (!isUnlocked) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-500 mx-auto flex items-center justify-center shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Administrative Access</h2>
            <p className="text-xs text-slate-500">
              Enter the master security passcode to access the Attendance Simulation and Faculty Management Console
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Admin Security Passcode
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter passcode..."
                  value={passwordInput}
                  onChange={e => {
                    setPasswordInput(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  autoFocus
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold animate-pulse text-center">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-sm shadow-md transition"
            >
              Unlock Console
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Administrative Control Console</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Unlocked
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Custom batch punch simulation, manual overrides, and faculty enrollment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Lock Console Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition"
            title="Lock administrative console"
          >
            <LogOut className="w-3.5 h-3.5" />
            Lock Console
          </button>

          {/* 3 Tabs */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'batch'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Custom Batch Punch
          </button>
          <button
            onClick={() => setActiveTab('single')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'single'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Single Teacher Mark
          </button>
          <button
            onClick={() => setActiveTab('newTeacher')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'newTeacher'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Add New Faculty
          </button>
        </div>
      </div>
    </div>

      {/* TAB 1: Custom Batch Punch Simulator */}
      {activeTab === 'batch' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Custom Batch Biometric Punch Simulator
              </h2>
              <p className="text-xs text-slate-500">
                Select exactly which teachers punch in (Present) and which teachers stay unpunched (Absent)
              </p>
            </div>

            {/* Live Count Indicator */}
            <div className="flex items-center gap-3">
              <span className="text-xs px-3 py-1.5 rounded-lg font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                ✓ {selectedForBatch.size} Present
              </span>
              <span className="text-xs px-3 py-1.5 rounded-lg font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                ✕ {teachers.length - selectedForBatch.size} Absent
              </span>
            </div>
          </div>

          {/* Quick Selection Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                Select All ({teachers.length})
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                Deselect All (0)
              </button>
              <button
                type="button"
                onClick={handlePresetDemo}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/25"
                title="Sets up 29 Present, leaving Dr. Sharma (Physics) and Mr. Kumar (Maths) absent"
              >
                ★ Preset: Leave T001 & T011 Absent
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Base Time:</span>
                <input
                  type="time"
                  value={baseTime}
                  onChange={e => setBaseTime(e.target.value)}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-mono text-xs"
                />
              </div>

              <button
                onClick={handleExecuteCustomBatch}
                disabled={loading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                Send Batch Punches ({selectedForBatch.size})
              </button>
            </div>
          </div>

          {/* Search & Dept Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search faculty by name, department, or ID..."
                value={batchSearch}
                onChange={e => setBatchSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <select
              value={batchDeptFilter}
              onChange={e => setBatchDeptFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            >
              {departments.map(d => (
                <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>
              ))}
            </select>
          </div>

          {/* Interactive Checklist Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredBatchTeachers.map(t => {
              const isChecked = selectedForBatch.has(t.id);
              return (
                <div
                  key={t.id}
                  onClick={() => toggleTeacher(t.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between select-none ${
                    isChecked
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-rose-400 dark:text-rose-600 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{t.name}</span>
                        {t.isClassTeacher && (
                          <span className="flex-shrink-0 text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                            CT: {t.classTeacherOf}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {t.id} • {t.department} ({t.designation || 'Faculty'})
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isChecked
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                  }`}>
                    {isChecked ? 'PRESENT' : 'ABSENT'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Single Manual Punch */}
      {activeTab === 'single' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm max-w-xl mx-auto">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            Individual Teacher Attendance Punch
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Manually sign in a specific teacher, mark approved leave, or log an unexcused absence
          </p>

          <form onSubmit={handleMarkAttendance} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Faculty Member
              </label>
              <select
                value={selectedTeacherId}
                onChange={e => setSelectedTeacherId(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.id} — {t.name} ({t.department}){t.isClassTeacher ? ` [★ CT: ${t.classTeacherOf}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Attendance Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['PRESENT', 'ABSENT', 'ON_LEAVE'].map(st => (
                  <button
                    type="button"
                    key={st}
                    onClick={() => setPunchStatus(st)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      punchStatus === st
                        ? st === 'PRESENT'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : st === 'ABSENT'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {punchStatus === 'PRESENT' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Punch In Timestamp (HH:MM)
                </label>
                <input
                  type="time"
                  value={punchTime}
                  onChange={e => setPunchTime(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>
            )}

            {punchStatus === 'ON_LEAVE' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Leave
                </label>
                <input
                  type="text"
                  value={leaveReason}
                  onChange={e => setLeaveReason(e.target.value)}
                  placeholder="e.g. Medical Leave, Official Duty, Planned"
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-md transition"
            >
              Save Attendance Record
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Add New Faculty Member */}
      {activeTab === 'newTeacher' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              Enroll New Faculty Member
            </h2>
            <p className="text-xs text-slate-500">
              Add a new teacher to the master roster with department specialization and class assignments
            </p>
          </div>

          <form onSubmit={handleAddTeacher} className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Smita Sengupta"
                  value={newTeacher.name}
                  onChange={e => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Teacher ID (Optional - auto-generated if blank)
                </label>
                <input
                  type="text"
                  placeholder="e.g. T033"
                  value={newTeacher.id}
                  onChange={e => setNewTeacher({ ...newTeacher, id: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={newTeacher.department}
                  onChange={e => setNewTeacher({ ...newTeacher, department: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Biology">Biology</option>
                  <option value="Science">Science (General)</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Social Science">Social Science (SST)</option>
                  <option value="Languages">Languages (Sanskrit / French)</option>
                  <option value="Technology">Technology & Coding</option>
                  <option value="Activity">Physical Education / Activity</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subjects (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physics, Applied Physics"
                  value={newTeacher.subjects}
                  onChange={e => setNewTeacher({ ...newTeacher, subjects: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Designation
                </label>
                <select
                  value={newTeacher.designation}
                  onChange={e => setNewTeacher({ ...newTeacher, designation: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                >
                  <option value="PGT">PGT (Post Graduate Teacher - Classes 11 & 12)</option>
                  <option value="TGT">TGT (Trained Graduate Teacher - Classes 8, 9, 10)</option>
                  <option value="Specialist">Specialist / Lab Instructor / PET</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Classes (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12A, 11C"
                  value={newTeacher.assignedClasses}
                  onChange={e => setNewTeacher({ ...newTeacher, assignedClasses: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md transition"
              >
                Enroll Faculty Member
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
