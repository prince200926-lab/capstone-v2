import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, RefreshCw, Calendar, AlertCircle } from 'lucide-react';
import BiometricPunchFeed from '../components/BiometricPunchFeed';
import { getTodayAttendance, generateSubstitutions, getTodaySubstitutions } from '../services/api';

export default function Dashboard() {
  const [attendance, setAttendance] = useState([]);
  const [substitutions, setSubstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const attRes = await getTodayAttendance();
      const attData = attRes.data?.attendance || (Array.isArray(attRes.data) ? attRes.data : []);
      setAttendance(attData);

      const subRes = await getTodaySubstitutions();
      const subData = subRes.data?.substitutions || (Array.isArray(subRes.data) ? subRes.data : []);
      setSubstitutions(subData);
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await generateSubstitutions({ cutOffTime: '08:30:00' });
      const subs = res.data?.substitutions || (Array.isArray(res.data) ? res.data : []);
      setSubstitutions(subs);
      alert(`Success! Generated ${subs.length} substitutions.`);
      fetchStats();
    } catch (err) {
      alert('Error generating substitutions: ' + (err.response?.data?.error || err.message));
    } finally {
      setGenerating(false);
    }
  };

  const totalTeachers = attendance.length || 32;
  const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
  const absentCount = attendance.filter(a => a.status === 'ABSENT').length;
  const leaveCount = attendance.filter(a => a.status === 'ON_LEAVE').length;

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Faculty Attendance & Substitution Control</h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Shift: 08:00 – 15:00
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Real-time biometric punch stream & automated priority substitution allocation
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded text-xs font-semibold shadow-xs transition"
          >
            {generating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Allocating...
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                Run Cut-Off & Generate Substitutions
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Teaching Staff</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalTeachers}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Sanctioned faculty</p>
          </div>
          <div className="w-10 h-10 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Present On Duty</p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1">{presentCount}</h3>
            <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">{Math.round((presentCount / (totalTeachers || 1)) * 100)}% attendance rate</p>
          </div>
          <div className="w-10 h-10 rounded border border-emerald-200 bg-emerald-50 flex items-center justify-center text-emerald-700">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Absent / Unreported</p>
            <h3 className="text-2xl font-bold text-rose-700 mt-1">{absentCount}</h3>
            <p className="text-[11px] text-rose-600 mt-0.5 font-medium">{absentCount > 0 ? 'Requires substitution' : 'All staff reported'}</p>
          </div>
          <div className="w-10 h-10 rounded border border-rose-200 bg-rose-50 flex items-center justify-center text-rose-700">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Substitutions</p>
            <h3 className="text-2xl font-bold text-amber-700 mt-1">{substitutions.length}</h3>
            <p className="text-[11px] text-amber-600 mt-0.5 font-medium">For today's timetable</p>
          </div>
          <div className="w-10 h-10 rounded border border-amber-200 bg-amber-50 flex items-center justify-center text-amber-700">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Live Biometric Punch Grid */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Biometric Attendance Terminal Monitor</h2>
            <p className="text-xs text-slate-500">Live RFID & fingerprint terminal sync status (Polls every 6s)</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            Terminal Online
          </span>
        </div>
        <BiometricPunchFeed attendanceData={attendance} onRefresh={fetchStats} />
      </div>
    </div>
  );
}
