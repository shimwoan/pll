import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

// KST 시간으로 직접 지정 — dayjs가 UTC로 변환
export const EMAIL_CUTOFF = dayjs
  .tz('2026-05-19 11:46:00', 'Asia/Seoul')
  .toDate();
