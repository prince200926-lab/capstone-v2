import React, { useState, useEffect } from 'react';
import { getTodayAttendance, batchSync, markLeave } from '../services/api';
import { Search, Filter, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await getTodayAttendance();
      const list = res.data?.attendance || (Array.isArray(res.data) ? res.data : []);
      setAttendance(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleSimulateBatch = async () => {
    try {
      setLoading(true);
      // Simulate 28 punches leaving out T001 and T011 for demonstration
      const punches = [
        { teacherId: 'T002', time: '08:05:12' },
        { teacherId: 'T003', time: '08:08:44' },
        { teacherId: 'T004', time: '08:11:02' },
        { teacherId: 'T005', time: '08:12:15' },
        { teacherId: 'T006', time: '08:14:30' },
        { teacherId: 'T007', time: '08:15:00' },
        { teacherId: 'T008', time: '08:16:22' },
        { teacherId: 'T009', time: '08:17:19' },
        { teacherId: 'T010', time: '08:18:50' },
        { teacherId: 'T012', time: '08:19:10' },
        { teacherId: 'T013', time: '08:20:00' },
        { teacherId: 'T014', time: '08:21:40' },
        { teacherId: 'T015', time: '08:22:11' },
        { teacherId: 'T016', time: '08:23:05' },
        { teacherId: 'T017', time: '08:24:18' },
        { teacherId: 'T018', time: '08:25:01' },
        { teacherId: 'T019', time: '08:25:45' },
        { teacherId: 'T020', time: '08:26:30' },
        { teacherId: 'T021', time: '08:27:00' },
        { teacherId: 'T022', time: '08:27:40' },
        { teacherId: 'T023', time: '08:28:10' },
        { teacherId: 'T024', time: '08:28:55' },
        { teacherId: 'T025', time: '08:29:12' },
        { teacherId: 'T026', time: '08:29:30' },
        { teacherId: 'T027', time: '08:29:45' },
        { teacherId: 'T028', time: '08:30:00' },
        { teacherId: 'T029', time: '08:30:10' },
        { teacherId: 'T030', time: '08:30:20' }
      ];
      await batchSync({ punches });
      alert('Simulated 28 Biometric Punches! T001 (Physics) and T011 (Maths) left unpunched.');
      fetchAttendance();
    } catch (err) {
      alert('Batch sync failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = attendance.filter(item => {
    const tName = (item.teacherName || item.name || '').toLowerCase();
    const tDept = (item.department || '').toLowerCase();
    const tId = (item.teacherId || item.id || '').toLowerCase();
    const q = search.toLowerCase();

    const matchesSearch = tName.includes(q) || tDept.includes(q) || tId.includes(q);
    if (filter === 'ALL') return matchesSearch;
    return matchesSearch && item.status === filter;
  });

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Biometric Attendance Register</h1>
          <p className="text-xs text-slate-500 mt-0.5">Live hardware punch records synchronized directly from terminal RFID/biometric gate readers</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-slate-700 font-medium bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            Biometric Terminal Active
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by teacher name, department, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {['ALL', 'PRESENT', 'ABSENT', 'ON_LEAVE'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                filter === f
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-3.5">ID</th>
              <th className="py-2.5 px-3.5">Teacher Name</th>
              <th className="py-2.5 px-3.5">Department</th>
              <th className="py-2.5 px-3.5">Designation</th>
              <th className="py-2.5 px-3.5">Punch Time</th>
              <th className="py-2.5 px-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(t => (
              <tr key={t.teacherId} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                <td className="py-3 px-4 font-mono text-xs text-slate-500">{t.teacherId || t.id}</td>
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{t.teacherName || t.name}</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{t.department}</td>
                <td className="py-3 px-4 text-xs font-medium text-slate-500">{t.designation || 'Faculty'}</td>
                <td className="py-3 px-4 font-mono text-xs">
                  {t.punchTime ? (
                    <span className="text-emerald-600 font-semibold">{t.punchTime}</span>
                  ) : (
                    <span className="text-slate-400 italic">No punch</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={t.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
