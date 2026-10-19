/**
 * StatusBadge.jsx – Reusable colored pill badge component.
 *
 * Renders status labels like PRESENT, ABSENT, ON_LEAVE, and priority
 * tags (P1, P2, P3) as compact, color-coded pills.
 */

import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

/**
 * Mapping of status keys → visual config (color classes + optional icon).
 * Each entry defines Tailwind classes for bg, text, and an optional Lucide icon.
 */
const STATUS_CONFIG = {
  PRESENT: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    icon: CheckCircle,
    label: 'Present',
  },
  ABSENT: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    icon: XCircle,
    label: 'Absent',
  },
  ON_LEAVE: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
    icon: Clock,
    label: 'On Leave',
  },
  // Priority badges for substitution assignments
  P1: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    icon: null,
    label: 'Priority 1',
  },
  P2: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
    icon: null,
    label: 'Priority 2',
  },
  P3: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
    icon: null,
    label: 'Priority 3',
  },
  // Match type badges
  EXACT: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    icon: null,
    label: 'Exact Match',
  },
  ALLIED: {
    bg: 'bg-sky-100',
    text: 'text-sky-800',
    border: 'border-sky-300',
    icon: null,
    label: 'Allied Subject',
  },
  GENERAL: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    icon: null,
    label: 'General',
  },
};

/**
 * @param {Object} props
 * @param {'PRESENT'|'ABSENT'|'ON_LEAVE'|'P1'|'P2'|'P3'|'EXACT'|'ALLIED'|'GENERAL'} props.status
 * @param {string} [props.className] – extra classes to merge
 * @param {boolean} [props.showIcon=true] – whether to show the leading icon
 * @param {'sm'|'md'} [props.size='sm'] – badge size variant
 */
const StatusBadge = ({ status, className = '', showIcon = true, size = 'sm' }) => {
  // Fall back to a neutral gray badge for unknown statuses
  const config = STATUS_CONFIG[status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    icon: null,
    label: status || 'Unknown',
  };

  const Icon = config.icon;

  // Size variants
  const sizeClasses = size === 'md'
    ? 'px-3 py-1 text-sm'
    : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}
      `}
    >
      {/* Optional leading icon */}
      {showIcon && Icon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  );
};

export default StatusBadge;
