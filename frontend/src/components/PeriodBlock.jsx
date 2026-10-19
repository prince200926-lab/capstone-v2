/**
 * PeriodBlock.jsx – Reusable period cell for timetable grids.
 *
 * Renders a single period showing subject name, teacher name, and room.
 * Visually indicates double periods with a special border treatment.
 */

import React from 'react';

/**
 * Subject-type → color mapping for visual differentiation in the timetable.
 * Uses Tailwind bg/border/text classes.
 */
const SUBJECT_COLORS = {
  Science: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800', dot: 'bg-blue-500' },
  Physics: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800', dot: 'bg-blue-500' },
  Chemistry: { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-800', dot: 'bg-cyan-500' },
  Biology: { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-800', dot: 'bg-teal-500' },
  Mathematics: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800', dot: 'bg-purple-500' },
  Math: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800', dot: 'bg-purple-500' },
  English: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800', dot: 'bg-green-500' },
  Hindi: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  Sanskrit: { bg: 'bg-lime-50', border: 'border-lime-300', text: 'text-lime-800', dot: 'bg-lime-500' },
  History: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', dot: 'bg-amber-500' },
  Geography: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800', dot: 'bg-orange-500' },
  'Social Science': { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', dot: 'bg-amber-500' },
  'Computer Science': { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  'Physical Education': { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-800', dot: 'bg-rose-500' },
  Art: { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-800', dot: 'bg-pink-500' },
};

/** Fallback neutral color for unlisted subjects */
const DEFAULT_COLOR = { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700', dot: 'bg-slate-500' };

/**
 * Look up color config by trying the exact subject name, then checking
 * if any key is a substring of the subject (handles "Applied Mathematics", etc.).
 */
const getSubjectColor = (subject) => {
  if (!subject) return DEFAULT_COLOR;
  if (SUBJECT_COLORS[subject]) return SUBJECT_COLORS[subject];
  // Partial match
  const key = Object.keys(SUBJECT_COLORS).find((k) =>
    subject.toLowerCase().includes(k.toLowerCase())
  );
  return key ? SUBJECT_COLORS[key] : DEFAULT_COLOR;
};

/**
 * @param {Object} props
 * @param {string} props.subject – Subject name (e.g., "Physics")
 * @param {string} props.teacher – Teacher display name
 * @param {string} [props.room] – Optional room number
 * @param {boolean} [props.isDouble=false] – Whether this period is part of a double period
 * @param {'first'|'second'|null} [props.doublePosition] – Position in the double pair
 * @param {boolean} [props.isEmpty=false] – If true, renders an empty/free cell
 */
const PeriodBlock = ({
  subject,
  teacher,
  room,
  isDouble = false,
  doublePosition = null,
  isEmpty = false,
}) => {
  // Empty / free period cell
  if (isEmpty || !subject) {
    return (
      <div className="flex h-full min-h-[80px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-xs text-slate-400">
        Free
      </div>
    );
  }

  const colors = getSubjectColor(subject);

  // Double-period styling: remove right border on first, left border on second
  const doubleBorderClass =
    isDouble && doublePosition === 'first'
      ? 'rounded-r-none border-r-0'
      : isDouble && doublePosition === 'second'
        ? 'rounded-l-none border-l-0'
        : '';

  return (
    <div
      className={`
        relative flex min-h-[80px] flex-col justify-between rounded-lg border p-2
        transition-shadow duration-200 hover:shadow-md
        ${colors.bg} ${colors.border} ${doubleBorderClass}
      `}
    >
      {/* Subject name + color dot */}
      <div className="flex items-start gap-1.5">
        <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${colors.dot}`} />
        <span className={`text-sm font-semibold leading-tight ${colors.text}`}>
          {subject}
        </span>
      </div>

      {/* Teacher name */}
      <p className="mt-1 text-xs text-slate-600 truncate">{teacher}</p>

      {/* Room badge (bottom-right) */}
      {room && (
        <span className="mt-auto self-end text-[10px] font-medium text-slate-400">
          {room}
        </span>
      )}

      {/* Double-period connector indicator */}
      {isDouble && doublePosition === 'first' && (
        <div className="absolute -right-px top-1/2 z-10 flex h-8 -translate-y-1/2 items-center">
          <div className={`h-full w-0.5 ${colors.dot} rounded-full opacity-60`} />
        </div>
      )}
    </div>
  );
};

export default PeriodBlock;
