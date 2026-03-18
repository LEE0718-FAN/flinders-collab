import { addDays, differenceInCalendarDays, format, isValid, parseISO, startOfDay } from 'date-fns';

const FLINDERS_WEEK_STARTS = [
  { date: '2025-03-03', semester: 1, week: 1 },
  { date: '2025-03-10', semester: 1, week: 2 },
  { date: '2025-03-17', semester: 1, week: 3 },
  { date: '2025-03-24', semester: 1, week: 4 },
  { date: '2025-03-31', semester: 1, week: 5 },
  { date: '2025-04-07', semester: 1, week: 6 },
  { date: '2025-04-28', semester: 1, week: 7 },
  { date: '2025-05-05', semester: 1, week: 8 },
  { date: '2025-05-12', semester: 1, week: 9 },
  { date: '2025-05-19', semester: 1, week: 10 },
  { date: '2025-05-26', semester: 1, week: 11 },
  { date: '2025-06-02', semester: 1, week: 12 },
  { date: '2025-06-09', semester: 1, week: 13 },
  { date: '2025-06-16', semester: 1, week: 14 },
  { date: '2025-07-28', semester: 2, week: 1 },
  { date: '2025-08-04', semester: 2, week: 2 },
  { date: '2025-08-11', semester: 2, week: 3 },
  { date: '2025-08-18', semester: 2, week: 4 },
  { date: '2025-08-25', semester: 2, week: 5 },
  { date: '2025-09-01', semester: 2, week: 6 },
  { date: '2025-09-08', semester: 2, week: 7 },
  { date: '2025-09-15', semester: 2, week: 8 },
  { date: '2025-10-06', semester: 2, week: 9 },
  { date: '2025-10-13', semester: 2, week: 10 },
  { date: '2025-10-20', semester: 2, week: 11 },
  { date: '2025-10-27', semester: 2, week: 12 },
  { date: '2025-11-03', semester: 2, week: 13 },
  { date: '2026-03-02', semester: 1, week: 1 },
  { date: '2026-03-09', semester: 1, week: 2 },
  { date: '2026-03-16', semester: 1, week: 3 },
  { date: '2026-03-23', semester: 1, week: 4 },
  { date: '2026-03-30', semester: 1, week: 5 },
  { date: '2026-04-06', semester: 1, week: 6 },
  { date: '2026-04-27', semester: 1, week: 7 },
  { date: '2026-05-04', semester: 1, week: 8 },
  { date: '2026-05-11', semester: 1, week: 9 },
  { date: '2026-05-18', semester: 1, week: 10 },
  { date: '2026-05-25', semester: 1, week: 11 },
  { date: '2026-06-01', semester: 1, week: 12 },
  { date: '2026-06-08', semester: 1, week: 13 },
  { date: '2026-06-15', semester: 1, week: 14 },
  { date: '2026-07-27', semester: 2, week: 1 },
  { date: '2026-08-03', semester: 2, week: 2 },
  { date: '2026-08-10', semester: 2, week: 3 },
  { date: '2026-08-17', semester: 2, week: 4 },
  { date: '2026-08-24', semester: 2, week: 5 },
  { date: '2026-08-31', semester: 2, week: 6 },
  { date: '2026-09-07', semester: 2, week: 7 },
  { date: '2026-09-14', semester: 2, week: 8 },
  { date: '2026-10-05', semester: 2, week: 9 },
  { date: '2026-10-12', semester: 2, week: 10 },
  { date: '2026-10-19', semester: 2, week: 11 },
  { date: '2026-10-26', semester: 2, week: 12 },
  { date: '2026-11-02', semester: 2, week: 13 },
  { date: '2027-03-01', semester: 1, week: 1 },
  { date: '2027-03-08', semester: 1, week: 2 },
  { date: '2027-03-15', semester: 1, week: 3 },
  { date: '2027-03-22', semester: 1, week: 4 },
  { date: '2027-03-29', semester: 1, week: 5 },
  { date: '2027-04-05', semester: 1, week: 6 },
  { date: '2027-04-26', semester: 1, week: 7 },
  { date: '2027-05-03', semester: 1, week: 8 },
  { date: '2027-05-10', semester: 1, week: 9 },
  { date: '2027-05-17', semester: 1, week: 10 },
  { date: '2027-05-24', semester: 1, week: 11 },
  { date: '2027-05-31', semester: 1, week: 12 },
  { date: '2027-06-07', semester: 1, week: 13 },
  { date: '2027-06-14', semester: 1, week: 14 },
  { date: '2027-07-26', semester: 2, week: 1 },
  { date: '2027-08-02', semester: 2, week: 2 },
  { date: '2027-08-09', semester: 2, week: 3 },
  { date: '2027-08-16', semester: 2, week: 4 },
  { date: '2027-08-23', semester: 2, week: 5 },
  { date: '2027-08-30', semester: 2, week: 6 },
  { date: '2027-09-06', semester: 2, week: 7 },
  { date: '2027-09-13', semester: 2, week: 8 },
  { date: '2027-10-04', semester: 2, week: 9 },
  { date: '2027-10-11', semester: 2, week: 10 },
  { date: '2027-10-18', semester: 2, week: 11 },
  { date: '2027-10-25', semester: 2, week: 12 },
  { date: '2027-11-01', semester: 2, week: 13 },
].map((entry) => ({ ...entry, parsedDate: parseISO(entry.date) }));

function normalizeDate(dateLike) {
  if (!dateLike) return null;
  const value = dateLike instanceof Date
    ? dateLike
    : typeof dateLike === 'string'
      ? parseISO(dateLike)
      : new Date(dateLike);
  if (!isValid(value)) return null;
  return startOfDay(value);
}

export function isFlindersUser(user) {
  const email = String(user?.email || '').toLowerCase();
  const accountType = String(user?.account_type || user?.user_metadata?.account_type || '').toLowerCase();
  const university = String(user?.user_metadata?.university || '').toLowerCase();
  return accountType === 'flinders' || email.endsWith('@flinders.edu.au') || university.includes('flinders');
}

export function getFlindersWeekInfo(dateLike) {
  const target = normalizeDate(dateLike);
  if (!target) return null;

  for (let index = 0; index < FLINDERS_WEEK_STARTS.length; index += 1) {
    const current = FLINDERS_WEEK_STARTS[index];
    const next = FLINDERS_WEEK_STARTS[index + 1];
    const start = current.parsedDate;
    const nextStart = next?.parsedDate ?? addDays(start, 7);
    const spanDays = differenceInCalendarDays(nextStart, start);
    const rangeEnd = addDays(nextStart, -1);

    if (target < start || target > rangeEnd) continue;

    if (spanDays > 7 && target >= addDays(start, 7)) {
      return {
        semester: current.semester,
        isBreak: true,
        label: 'Mid-sem break',
        shortLabel: 'Break',
      };
    }

    return {
      semester: current.semester,
      week: current.week,
      isBreak: false,
      label: `Week ${current.week}`,
      shortLabel: `Wk ${current.week}`,
    };
  }

  return null;
}

export function getFlindersWeekLabel(dateLike, options = {}) {
  const info = getFlindersWeekInfo(dateLike);
  if (!info) return null;
  return options.short ? info.shortLabel : info.label;
}

export function getFlindersWeekLabelForDates(dates, options = {}) {
  const labels = dates
    .map((date) => ({ date, info: getFlindersWeekInfo(date) }))
    .filter((entry) => entry.info);

  const weekdayTeachingWeek = labels.find((entry) => {
    const normalized = normalizeDate(entry.date);
    const day = normalized?.getDay();
    return !entry.info.isBreak && day >= 1 && day <= 5;
  });
  if (weekdayTeachingWeek) {
    return options.short ? weekdayTeachingWeek.info.shortLabel : weekdayTeachingWeek.info.label;
  }

  const teachingWeek = labels.find((entry) => !entry.info.isBreak);
  if (teachingWeek) return options.short ? teachingWeek.info.shortLabel : teachingWeek.info.label;

  const breakWeek = labels[0];
  if (breakWeek) return options.short ? breakWeek.info.shortLabel : breakWeek.info.label;

  return null;
}

export function formatFlindersWeekContext(dateLike) {
  const info = getFlindersWeekInfo(dateLike);
  if (!info) return null;
  if (info.isBreak) return info.label;
  return `${info.label} · Semester ${info.semester}`;
}

export const getFlindersWeekContext = formatFlindersWeekContext;

export function getFlindersWeekDebugDate(dateLike) {
  const normalized = normalizeDate(dateLike);
  return normalized ? format(normalized, 'yyyy-MM-dd') : null;
}
