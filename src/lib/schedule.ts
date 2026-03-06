// Blog auto-pipeline: site rotation engine
// Mon=koreaai, Wed=apppro, Fri=richbukae

export type TargetSite = 'koreaai' | 'apppro' | 'richbukae';

const ROTATION_SCHEDULE: Record<number, TargetSite> = {
  1: 'koreaai',   // Monday
  3: 'apppro',    // Wednesday
  5: 'richbukae', // Friday
};

export function getTodayTargetSite(): TargetSite | null {
  // Use KST (UTC+9)
  const now = new Date();
  const kstOffset = 9 * 60;
  const kstTime = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60000);
  const day = kstTime.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return ROTATION_SCHEDULE[day] ?? null;
}

export function getTargetSiteForDay(dayOfWeek: number): TargetSite | null {
  return ROTATION_SCHEDULE[dayOfWeek] ?? null;
}

export function getAllTargetSites(): TargetSite[] {
  return ['koreaai', 'apppro', 'richbukae'];
}
