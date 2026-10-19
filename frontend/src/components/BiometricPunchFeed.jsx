/**
 * BiometricPunchFeed.jsx – Live biometric attendance feed.
 *
 * Displays a grid of small teacher cards that show real-time punch status.
 * Auto-refreshes every 5 seconds to simulate live biometric feed data.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Fingerprint, RefreshCw, Wifi } from 'lucide-react';
import { getTodayAttendance } from '../services/api';
import StatusBadge from './StatusBadge';

/**
 * Generate initials from a teacher's full name (e.g., "Asha Sharma" → "AS").
 */
const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Background color for the initials avatar based on status.
 */
const avatarColor = (status) => {
  switch (status) {
    case 'PRESENT':
      return 'bg-green-500';
    case 'ABSENT':
      return 'bg-red-500';
    case 'ON_LEAVE':
      return 'bg-amber-500';
    default:
      return 'bg-slate-400';
  }
};

/**
 * Border color for the card based on status.
 */
const borderColor = (status) => {
  switch (status) {
    case 'PRESENT':
      return 'border-green-400';
    case 'ABSENT':
      return 'border-red-400';
    case 'ON_LEAVE':
      return 'border-amber-400';
    default:
      return 'border-slate-200';
  }
};

const BiometricPunchFeed = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Fetch today's attendance data from the API.
   * On failure, populate with demo data so the UI is still functional.
   */
  const fetchAttendance = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await getTodayAttendance();
      const data = res.data?.attendance || res.data || [];
      setTeachers(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.warn('BiometricPunchFeed: API unavailable, using demo data.', err.message);
      // Demo fallback data for development / offline mode
      setTeachers([
        { id: 'T001', name: 'Asha Sharma', department: 'Mathematics', status: 'PRESENT', punchTime: '07:42' },
        { id: 'T002', name: 'Rajesh Kumar', department: 'Physics', status: 'PRESENT', punchTime: '07:38' },
        { id: 'T003', name: 'Priya Singh', department: 'English', status: 'ABSENT', punchTime: null },
        { id: 'T004', name: 'Sunil Verma', department: 'Chemistry', status: 'ON_LEAVE', punchTime: null, leaveReason: 'Medical' },
        { id: 'T005', name: 'Meena Gupta', department: 'Hindi', status: 'PRESENT', punchTime: '07:50' },
        { id: 'T006', name: 'Vikram Patel', department: 'Social Science', status: 'PRESENT', punchTime: '07:55' },
        { id: 'T007', name: 'Anita Desai', department: 'Biology', status: 'ABSENT', punchTime: null },
        { id: 'T008', name: 'Kiran Rao', department: 'Computer Science', status: 'PRESENT', punchTime: '07:44' },
        { id: 'T009', name: 'Deepak Joshi', department: 'Physical Education', status: 'PRESENT', punchTime: '07:30' },
        { id: 'T010', name: 'Nisha Agarwal', department: 'Sanskrit', status: 'ON_LEAVE', punchTime: null, leaveReason: 'Personal' },
        { id: 'T011', name: 'Ramesh Tiwari', department: 'Mathematics', status: 'PRESENT', punchTime: '07:48' },
        { id: 'T012', name: 'Sanjay Mishra', department: 'Physics', status: 'PRESENT', punchTime: '07:52' },
      ]);
      setError('Using offline demo data');
    } finally {
      setIsRefreshing(false);
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  // Initial fetch + auto-refresh every 5 seconds
  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 5000);
    return () => clearInterval(interval);
  }, [fetchAttendance]);

  // Count summaries
  const presentCount = teachers.filter((t) => t.status === 'PRESENT').length;
  const absentCount = teachers.filter((t) => t.status === 'ABSENT').length;
  const leaveCount = teachers.filter((t) => t.status === 'ON_LEAVE').length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-800">Biometric Punch Feed</h3>
          {/* Live indicator */}
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-dot" />
            LIVE
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          {/* Quick counts */}
          <span className="text-green-600 font-medium">{presentCount} In</span>
          <span className="text-red-600 font-medium">{absentCount} Out</span>
          <span className="text-amber-600 font-medium">{leaveCount} Leave</span>

          {/* Manual refresh */}
          <button
            onClick={fetchAttendance}
            disabled={isRefreshing}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
          <span className="ml-2 text-sm text-slate-500">Loading feed...</span>
        </div>
      )}

      {/* Teacher cards grid */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {teachers.map((teacher, idx) => (
            <div
              key={teacher.id || idx}
              className={`
                animate-fade-in-up flex flex-col items-center gap-1.5 rounded-lg border-2 p-3
                transition-all duration-300 hover:shadow-md
                ${borderColor(teacher.status)}
              `}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {/* Initials avatar */}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(teacher.status)}`}
              >
                {getInitials(teacher.teacherName || teacher.name)}
              </div>

              {/* Name */}
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 text-center truncate w-full">
                {teacher.teacherName || teacher.name}
              </p>

              {/* Department */}
              <p className="text-[10px] text-slate-500 truncate w-full text-center">
                {teacher.department}
              </p>

              {/* Status line */}
              <div className="mt-auto text-center">
                {teacher.status === 'PRESENT' && (
                  <p className="text-[10px] font-medium text-green-700">
                    🟢 Punched at {teacher.punchTime || '--:--'}
                  </p>
                )}
                {teacher.status === 'ABSENT' && (
                  <p className="text-[10px] font-medium text-red-700">🔴 No Punch</p>
                )}
                {teacher.status === 'ON_LEAVE' && (
                  <p className="text-[10px] font-medium text-amber-700">
                    🟡 {teacher.leaveReason || 'On Leave'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {lastRefresh && (
        <div className="border-t border-slate-100 px-5 py-2 text-right">
          <span className="text-[10px] text-slate-400">
            Last updated: {lastRefresh.toLocaleTimeString()}
            {error && ` · ${error}`}
          </span>
        </div>
      )}
    </div>
  );
};

export default BiometricPunchFeed;
