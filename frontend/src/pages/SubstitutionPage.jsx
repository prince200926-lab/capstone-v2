import React, { useState, useEffect } from 'react';
import { getTodaySubstitutions, generateSubstitutions, overrideSubstitution, getAllTeachers } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import SubstitutionCircular from '../components/SubstitutionCircular';
import { Printer, RefreshCw, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';

export default function SubstitutionPage() {
  const [substitutions, setSubstitutions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showCircular, setShowCircular] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subRes, teachRes] = await Promise.all([
        getTodaySubstitutions(),
        getAllTeachers()
      ]);
      const subs = subRes.data?.substitutions || (Array.isArray(subRes.data) ? subRes.data : []);
      const teachList = teachRes.data?.teachers || (Array.isArray(teachRes.data) ? teachRes.data : []);
      setSubstitutions(subs);
      setTeachers(teachList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const res = await generateSubstitutions({ cutOffTime: '08:30:00' });
      const subs = res.data?.substitutions || (Array.isArray(res.data) ? res.data : []);
      setSubstitutions(subs);
      alert('Substitutions computed successfully!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (subId, newTeacherId) => {
    try {
      await overrideSubstitution({
        substitutionId: subId,
        newSubstituteTeacherId: newTeacherId,
        reason: 'Administrative override from dashboard'
      });
      alert('Substitute successfully reassigned!');
      loadData();
    } catch (err) {
      alert('Override failed: ' + err.message);
    }
  };

  // Group by priorities (Class 10 & 12 = P1, Class 9 & 11 = P2, Class 8 = P3)
  const p1Subs = substitutions.filter(s => s.classSection?.startsWith('12') || s.classSection?.startsWith('10') || s.priority === 1);
  const p2Subs = substitutions.filter(s => (s.classSection?.startsWith('11') || s.classSection?.startsWith('9')) && !s.classSection?.startsWith('12') && !s.classSection?.startsWith('10'));
  const p3Subs = substitutions.filter(s => s.classSection?.startsWith('8') || (!s.classSection?.startsWith('12') && !s.classSection?.startsWith('10') && !s.classSection?.startsWith('11') && !s.classSection?.startsWith('9')));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Substitution Allocation Register</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            CBSE compliance priority allocation engine with workload balancing and pedagogy matching
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCircular(!showCircular)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white rounded text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            {showCircular ? 'View Allocation Table' : 'Print Official Circular'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recalculate Allocations
          </button>
        </div>
      </div>

      <SubstitutionCircular
        substitutions={substitutions}
        visible={showCircular}
        onClose={() => setShowCircular(false)}
      />
        <div className="space-y-6">
          {/* Priority 1 (Board Classes: 10 & 12) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-rose-200 dark:border-rose-950/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-rose-100 dark:border-rose-900/40 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <h3 className="font-bold text-base text-rose-900 dark:text-rose-300">
                  Priority 1: Board Exam Classes (10 & 12)
                </h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                {p1Subs.length} Classes Protected
              </span>
            </div>

            {p1Subs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No vacant periods in Priority 1 classes today.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {p1Subs.map(s => {
                  const absentName = s.absentTeacherName || s.absentTeacher?.name || s.absentTeacherId || 'Absent';
                  const subName = s.substituteTeacherName || s.substituteTeacher?.name || (s.substituteTeacherId ? s.substituteTeacherId : 'Unassigned');
                  const subId = s.substituteTeacherId || s.substituteTeacher?.id || '';

                  return (
                    <div key={s.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">
                          Period {s.period}
                        </span>
                        {(s.period === 1 || s.isCTPeriod) && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                            ★ CT Period
                          </span>
                        )}
                        <span className="font-bold text-slate-900 dark:text-white">{s.classSection}</span>
                        <span className="text-slate-500">•</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{s.subject}</span>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-rose-600 line-through font-medium">
                            {absentName} {s.isAbsentTeacherCT ? '(CT)' : ''}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                            {subName}
                          </span>
                        </div>

                        <span className="text-xs text-slate-500 italic hidden lg:inline max-w-xs truncate" title={s.reason}>
                          ({s.reason})
                        </span>

                        <select
                          onChange={(e) => handleOverride(s.id, e.target.value)}
                          value={subId}
                          className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Change Substitute...</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.department}) {t.id === subId ? '✓' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Priority 2 (Classes 9 & 11) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-amber-950/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-amber-100 dark:border-amber-900/40 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h3 className="font-bold text-base text-amber-900 dark:text-amber-300">
                  Priority 2: Senior / Secondary Classes (9 & 11)
                </h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                {p2Subs.length} Classes
              </span>
            </div>

            {p2Subs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No vacant periods in Priority 2 classes today.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {p2Subs.map(s => {
                  const absentName = s.absentTeacherName || s.absentTeacher?.name || s.absentTeacherId || 'Absent';
                  const subName = s.substituteTeacherName || s.substituteTeacher?.name || (s.substituteTeacherId ? s.substituteTeacherId : 'Unassigned');
                  const subId = s.substituteTeacherId || s.substituteTeacher?.id || '';

                  return (
                    <div key={s.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">
                          Period {s.period}
                        </span>
                        {(s.period === 1 || s.isCTPeriod) && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                            ★ CT Period
                          </span>
                        )}
                        <span className="font-bold text-slate-900 dark:text-white">{s.classSection}</span>
                        <span className="text-slate-500">•</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{s.subject}</span>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-rose-600 line-through font-medium">
                            {absentName} {s.isAbsentTeacherCT ? '(CT)' : ''}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                            {subName}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 italic hidden lg:inline max-w-xs truncate" title={s.reason}>
                          ({s.reason})
                        </span>

                        <select
                          onChange={(e) => handleOverride(s.id, e.target.value)}
                          value={subId}
                          className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Change Substitute...</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.department}) {t.id === subId ? '✓' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Priority 3 (Class 8) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-200 dark:border-blue-950/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-blue-100 dark:border-blue-900/40 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <h3 className="font-bold text-base text-blue-900 dark:text-blue-300">
                  Priority 3: Middle School (Class 8)
                </h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                {p3Subs.length} Classes
              </span>
            </div>

            {p3Subs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No vacant periods in Class 8 today.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {p3Subs.map(s => {
                  const absentName = s.absentTeacherName || s.absentTeacher?.name || s.absentTeacherId || 'Absent';
                  const subName = s.substituteTeacherName || s.substituteTeacher?.name || (s.substituteTeacherId ? s.substituteTeacherId : 'Unassigned');
                  const subId = s.substituteTeacherId || s.substituteTeacher?.id || '';

                  return (
                    <div key={s.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">
                          Period {s.period}
                        </span>
                        {(s.period === 1 || s.isCTPeriod) && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                            ★ CT Period
                          </span>
                        )}
                        <span className="font-bold text-slate-900 dark:text-white">{s.classSection}</span>
                        <span className="text-slate-500">•</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{s.subject}</span>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-rose-600 line-through font-medium">
                            {absentName} {s.isAbsentTeacherCT ? '(CT)' : ''}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                            {subName}
                          </span>
                        </div>

                        <span className="text-xs text-slate-500 italic hidden lg:inline max-w-xs truncate" title={s.reason}>
                          ({s.reason})
                        </span>

                        <select
                          onChange={(e) => handleOverride(s.id, e.target.value)}
                          value={subId}
                          className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Change Substitute...</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.department}) {t.id === subId ? '✓' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
