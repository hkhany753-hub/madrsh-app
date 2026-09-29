export const SUBJECTS = [
  'ریاضی و آمار',
  'اقتصاد',
  'عربی',
  'فلسفه',
  'منطق',
  'تاریخ',
  'جغرافیا',
  'علوم و فنون ادبی',
  'هوش و استعداد معلمی',
  'تعلیم و تربیت اسلامی',
] as const;

export type Subject = (typeof SUBJECTS)[number];

export const ACTIVITY_TYPES = [
  'مطالعه',
  'تست',
  'مرور',
  'خلاصه‌نویسی',
  'حل تمرین',
  'آزمون',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type SubjectColor = { bg: string; text: string; border: string; dot: string };

export const SUBJECT_COLORS: Record<string, SubjectColor> = {
  'ریاضی و آمار': { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', dot: 'bg-sky-500' },
  اقتصاد: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  عربی: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-500' },
  فلسفه: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', dot: 'bg-rose-500' },
  منطق: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', dot: 'bg-cyan-500' },
  تاریخ: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-500' },
  جغرافیا: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', dot: 'bg-teal-500' },
  'علوم و فنون ادبی': { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20', dot: 'bg-pink-500' },
  'هوش و استعداد معلمی': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', dot: 'bg-indigo-500' },
  'تعلیم و تربیت اسلامی': { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', dot: 'bg-green-500' },
};

export function getSubjectColor(subject: string): SubjectColor {
  return SUBJECT_COLORS[subject] || { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', dot: 'bg-slate-500' };
}

export const LEADERBOARD_PERIODS = [
  { key: 'today', label: 'امروز' },
  { key: 'week', label: 'این هفته' },
  { key: 'month', label: 'این ماه' },
  { key: 'all', label: 'کل زمان' },
] as const;

export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number]['key'];
