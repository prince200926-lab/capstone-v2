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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Morning Command Center</h1>
          <p className="text-indigo-100 text-sm mt-1">
            Real-time biometric punch stream & automated priority substitution allocation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition backdrop-blur-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-sm font-semibold shadow-lg transition"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Allocating...
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                Run Cut-Off & Auto-Substitution
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Faculty</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{totalTeachers}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Punched In (Present)</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{presentCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Absent / Unreported</p>
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">{absentCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Substitutions Active</p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{substitutions.length}</h3>
          </div>
        </div>
      </div>

      {/* Live Biometric Punch Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Live Biometric Punch Feed</h2>
            <p className="text-xs text-slate-500">Live RFID & fingerprint device sync status (Polls every 6s)</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Hardware Stream Connected
          </span>
        </div>
        <BiometricPunchFeed attendanceData={attendance} onRefresh={fetchStats} />
      </div>
    </div>
  );
}
