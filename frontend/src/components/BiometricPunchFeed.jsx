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

const BiometricPunchFeed = ({ attendanceData, onRefresh }) => {
  const [internalTeachers, setInternalTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // If parent supplies attendanceData, use it; otherwise fallback to self-fetched
  const teachers = attendanceData && attendanceData.length > 0 ? attendanceData : internalTeachers;

  /**
   * Fetch today's attendance data from the API.
   */
  const fetchAttendance = useCallback(async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
      setLastRefresh(new Date());
      return;
    }

    try {
      setIsRefreshing(true);
      const res = await getTodayAttendance();
      const data = res.data?.attendance || res.data || [];
      setInternalTeachers(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.warn('BiometricPunchFeed: API unavailable, using demo data.', err.message);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, [onRefresh]);

  // Initial fetch + auto-refresh every 5 seconds if no parent props
  useEffect(() => {
    if (!attendanceData || attendanceData.length === 0) {
      fetchAttendance();
    }
    const interval = setInterval(fetchAttendance, 5000);
    return () => clearInterval(interval);
  }, [fetchAttendance, attendanceData]);

  // Count summaries
  const presentCount = teachers.filter((t) => t.status === 'PRESENT').length;
  const absentCount = teachers.filter((t) => t.status === 'ABSENT').length;
  const leaveCount = teachers.filter((t) => t.status === 'ON_LEAVE').length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 bg-slate-50">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-slate-700" />
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">Terminal Punch Records</h3>
          <span className="flex items-center gap-1 rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            LIVE
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">{presentCount} Present</span>
          <span className="font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">{absentCount} Absent</span>
          <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">{leaveCount} Leave</span>

          <button
            onClick={fetchAttendance}
            disabled={isRefreshing}
            className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
          <span className="ml-2 text-xs text-slate-500">Syncing terminal records...</span>
        </div>
      )}

      {/* Teacher cards grid */}
      {!loading && (
        <div className="grid grid-cols-2 gap-2.5 p-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {teachers.map((teacher, idx) => {
            const isPresent = teacher.status === 'PRESENT';
            const isAbsent = teacher.status === 'ABSENT';
            const isLeave = teacher.status === 'ON_LEAVE';

            return (
              <div
                key={teacher.id || idx}
                className={`
                  flex flex-col gap-1.5 rounded border p-2.5 text-left transition
                  ${isPresent ? 'bg-white border-slate-200 hover:border-slate-400' : ''}
                  ${isAbsent ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300' : ''}
                  ${isLeave ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300' : ''}
                `}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono font-medium text-slate-400">
                    {teacher.teacherId || teacher.id}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                    isPresent ? 'bg-emerald-100 text-emerald-800' :
                    isAbsent ? 'bg-rose-100 text-rose-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {isPresent ? 'IN' : isAbsent ? 'OUT' : 'LV'}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {teacher.teacherName || teacher.name}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {teacher.department}
                  </p>
                </div>

                <div className="pt-1 mt-auto border-t border-slate-100">
                  {isPresent && (
                    <span className="text-[10px] font-mono font-medium text-emerald-700">
                      {teacher.punchTime || '--:--'}
                    </span>
                  )}
                  {isAbsent && (
                    <span className="text-[10px] font-medium text-rose-600">
                      Unreported
                    </span>
                  )}
                  {isLeave && (
                    <span className="text-[10px] font-medium text-amber-700 truncate block">
                      {teacher.leaveReason || 'Leave'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {lastRefresh && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-right">
          <span className="text-[10px] text-slate-500 font-mono">
            Last sync: {lastRefresh.toLocaleTimeString()} {error && ` · ${error}`}
          </span>
        </div>
      )}
    </div>
  );
};

export default BiometricPunchFeed;
