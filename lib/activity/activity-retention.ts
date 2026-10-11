// lib/activity/activity-retention.ts

export const ACTIVITY_RETENTION_DAYS = 30;

export function getActivityCutoff(now = new Date()) {
  return new Date(
    now.getTime() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}
