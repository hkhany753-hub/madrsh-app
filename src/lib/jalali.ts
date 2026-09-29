/*
  Jalali (Persian) date conversion utilities.
  Algorithm based on the standard Gregorian <-> Jalali conversion.
*/

export function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

export function toGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy: number;
  if (jy > 979) {
    gy = 1600;
    jy -= 979;
  } else {
    gy = 621;
  }
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor((jy % 33 + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gm = 0;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) {
    gd -= sal_a[gm];
  }
  return [gy, gm, gd];
}

export function gregorianToJalali(date: Date): [number, number, number] {
  return toJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  const [gy, gm, gd] = toGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd);
}

const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => faDigits[parseInt(d, 10)]);
}

export function toEnglishDigits(input: string): string {
  return input.replace(/[۰-۹]/g, (d) => String(faDigits.indexOf(d)));
}

export const jalaliMonthNames = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const jalaliDayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

// JavaScript getDay(): 0=Sunday, 1=Monday, ... 6=Saturday
// Jalali week starts on Saturday (شنبه)
// Map: JS Sat(6) -> 0, JS Sun(0) -> 1, JS Mon(1) -> 2, ... JS Fri(5) -> 6
export function getJalaliDayOfWeek(date: Date): number {
  const jsDay = date.getDay();
  return (jsDay + 1) % 7;
}

export function formatJalaliDate(date: Date): string {
  const [jy, jm, jd] = gregorianToJalali(date);
  const dayName = jalaliDayNames[getJalaliDayOfWeek(date)];
  return `${dayName} ${toPersianDigits(jd)} ${jalaliMonthNames[jm - 1]} ${toPersianDigits(jy)}`;
}

export function formatJalaliDateShort(date: Date): string {
  const [jy, jm, jd] = gregorianToJalali(date);
  return `${toPersianDigits(jd)} ${jalaliMonthNames[jm - 1]} ${toPersianDigits(jy)}`;
}

export function formatJalaliMonthYear(jy: number, jm: number): string {
  return `${jalaliMonthNames[jm - 1]} ${toPersianDigits(jy)}`;
}

export function getJalaliMonthDays(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // Esfand: 29 in leap years, 30 otherwise
  const isLeap = ((((jy + 38) % 2820) * 682) % 2816) < 682;
  return isLeap ? 30 : 29;
}

export function getCurrentJalaliDate(): [number, number, number] {
  return gregorianToJalali(new Date());
}

export function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return toPersianDigits(`${h}:${m}`);
}

export function formatTimeWithSeconds(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return toPersianDigits(`${h}:${m}:${s}`);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${toPersianDigits(m)} دقیقه`;
  if (m === 0) return `${toPersianDigits(h)} ساعت`;
  return `${toPersianDigits(h)} ساعت و ${toPersianDigits(m)} دقیقه`;
}

export function formatDurationShort(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return toPersianDigits(`${h}:${m.toString().padStart(2, '0')}`);
}

// Convert a Date to YYYY-MM-DD string (for storing as date in DB)
export function dateToISODate(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Get today's date as YYYY-MM-DD
export function todayISODate(): string {
  return dateToISODate(new Date());
}

// Parse a YYYY-MM-DD string back to a Date
export function isoDateToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Format a stored ISO date (YYYY-MM-DD) as a Jalali date string
export function formatStoredDate(iso: string): string {
  return formatJalaliDateShort(isoDateToDate(iso));
}

// Get the start of the current Jalali week (Saturday)
export function getStartOfWeek(): Date {
  const today = new Date();
  const jsDay = today.getDay();
  // Saturday = 6 in JS, we want to go back to the most recent Saturday
  const diff = jsDay === 6 ? 0 : jsDay + 1;
  const start = new Date(today);
  start.setDate(today.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

// Get the start of the current Jalali month
export function getStartOfJalaliMonth(): Date {
  const [jy, jm, jd] = getCurrentJalaliDate();
  return jalaliToGregorian(jy, jm, 1);
}

// Get date range for current Jalali month
export function getCurrentJalaliMonthRange(): { start: Date; end: Date; jy: number; jm: number } {
  const [jy, jm] = getCurrentJalaliDate();
  const start = jalaliToGregorian(jy, jm, 1);
  const days = getJalaliMonthDays(jy, jm);
  const end = jalaliToGregorian(jy, jm, days);
  end.setHours(23, 59, 59, 999);
  return { start, end, jy, jm };
}

// Get all dates in a Jalali month as Date objects
export function getJalaliMonthDates(jy: number, jm: number): Date[] {
  const days = getJalaliMonthDays(jy, jm);
  const dates: Date[] = [];
  for (let d = 1; d <= days; d++) {
    dates.push(jalaliToGregorian(jy, jm, d));
  }
  return dates;
}

// Get a relative time string in Persian
export function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'همین الان';
  if (minutes < 60) return `${toPersianDigits(minutes)} دقیقه پیش`;
  if (hours < 24) return `${toPersianDigits(hours)} ساعت پیش`;
  if (days < 30) return `${toPersianDigits(days)} روز پیش`;
  return formatJalaliDateShort(date);
}
