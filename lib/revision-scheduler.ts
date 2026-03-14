/**
 * Revision scheduler - deprecated
 * Revisions are now managed through TopicMastery.needsRevision auto-calculated field
 * These functions are kept for backward compatibility but do nothing
 */

export async function scheduleRevisions(topicId: string): Promise<void> {
  // No-op: Revisions are auto-managed via TopicMastery model
}

export async function getPendingRevisions(userId: string) {
  // No-op: Return empty array - revisions are fetched via TopicMastery
  return []
}

