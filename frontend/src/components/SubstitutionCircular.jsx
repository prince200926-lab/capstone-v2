/**
 * SubstitutionCircular.jsx – Printable official substitution notice.
 *
 * Renders a formal, print-optimized circular for daily substitution
 * assignments. Uses the .print-circular class for print media styling.
 */

import React, { useRef } from 'react';
import { Printer, X } from 'lucide-react';

/**
 * Priority label + description mapping.
 */
const PRIORITY_META = {
  1: { label: 'Priority 1 – Board Classes (10 & 12)', className: 'text-red-700' },
  2: { label: 'Priority 2 – Pre-Board Classes (9 & 11)', className: 'text-orange-700' },
  3: { label: 'Priority 3 – Class 8', className: 'text-blue-700' },
};

/**
 * @param {Object} props
 * @param {Array} props.substitutions – Array of substitution assignment objects
 * @param {string} props.date – Display date string
 * @param {boolean} props.visible – Whether the circular overlay is shown
 * @param {Function} props.onClose – Callback to close the circular overlay
 */
const SubstitutionCircular = ({ substitutions = [], date, visible, onClose }) => {
  const circularRef = useRef(null);

  if (!visible) return null;

  // Group substitutions by priority (1, 2, 3)
  const grouped = substitutions.reduce((acc, sub) => {
    const p = sub.priority || 3;
    if (!acc[p]) acc[p] = [];
    acc[p].push(sub);
    return acc;
  }, {});

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Running serial number across all groups
  let serialNo = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4 no-print">
      {/* Circular container */}
      <div
        ref={circularRef}
        className="print-circular relative mx-auto w-full max-w-4xl rounded-lg bg-white shadow-2xl"
      >
        {/* Action bar (hidden in print) */}
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-6 py-3">
          <span className="text-sm font-medium text-slate-600">
            Preview – Substitution Circular
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print Circular
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ===== Circular Content (print-friendly) ===== */}
        <div className="px-10 py-8">
          {/* School Header */}
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
              Delhi Public School, Model Town
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              (Affiliated to CBSE, New Delhi)
            </p>
            <div className="mx-auto mt-3 h-px w-3/4 bg-slate-300" />
          </div>

          {/* Title + Date */}
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-800 underline decoration-2 underline-offset-4">
              DAILY SUBSTITUTION CIRCULAR
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Date: <strong>{date || new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
            </p>
          </div>

          {/* Substitution Tables – grouped by priority */}
          {[1, 2, 3].map((priority) => {
            const items = grouped[priority];
            if (!items || items.length === 0) return null;
            const meta = PRIORITY_META[priority];

            return (
              <div key={priority} className="mb-6">
                {/* Priority section header */}
                <h3 className={`mb-2 text-sm font-bold ${meta.className}`}>
                  {meta.label}
                </h3>

                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold w-12">S.No</th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold w-16">Period</th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Class &amp; Section</th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Subject</th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Absent Teacher</th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Substitute Teacher</th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Match Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((sub, idx) => {
                      serialNo += 1;
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="border border-slate-300 px-3 py-2 text-center">{serialNo}</td>
                          <td className="border border-slate-300 px-3 py-2 text-center">{sub.period}</td>
                          <td className="border border-slate-300 px-3 py-2">{sub.classSection}</td>
                          <td className="border border-slate-300 px-3 py-2">{sub.subject}</td>
                          <td className="border border-slate-300 px-3 py-2">
                            {sub.absentTeacherName || sub.absentTeacher?.name || sub.absentTeacherId || 'Absent'}
                            {sub.reason && (
                              <span className="block text-xs text-slate-500">({sub.reason})</span>
                            )}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 font-medium">
                            {sub.substituteTeacherName || sub.substituteTeacher?.name || sub.substituteTeacherId || 'Unassigned'}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-xs">
                            {sub.matchType === 'exact' && 'Exact Subject'}
                            {sub.matchType === 'allied' && 'Allied Subject'}
                            {sub.matchType === 'general' && 'General'}
                            {!['exact', 'allied', 'general'].includes(sub.matchType) && (sub.matchType || '—')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* Empty state */}
          {substitutions.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No substitutions generated for this date.
            </p>
          )}

          {/* Footer */}
          <div className="mt-10 flex items-end justify-between border-t border-slate-300 pt-6">
            <div className="text-xs text-slate-500">
              <p>Generated on {new Date().toLocaleString('en-IN')}</p>
              <p>Total substitutions: {substitutions.length}</p>
            </div>
            <div className="text-center">
              <div className="mb-1 h-px w-48 bg-slate-400" />
              <p className="text-sm font-medium text-slate-700">Substitution Coordinator</p>
              <p className="text-xs text-slate-500">Vice Principal's Office</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubstitutionCircular;
