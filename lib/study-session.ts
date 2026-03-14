/**
 * Study session utilities - deprecated
 * Study sessions are now logged via the Session Log page API
 * This function is kept for backward compatibility but does nothing
 */

export async function logDailyStudySession(
  userId: string,
  activity: 'grammar' | 'vocabulary' | 'essay'
): Promise<void> {
  // No-op: Study sessions are now logged via /api/study-sessions
}

