export interface RankablePoll {
  id: string;
  created_at: string;
  is_breaking: boolean;
  is_pinned: boolean;
  is_main_article: boolean;
  source_count: number;
  total_votes?: number;
  view_count?: number;
}

export function editorialScore(poll: RankablePoll): number {
  let score = 0;
  if (poll.is_main_article) score += 50;
  score += (poll.source_count - 1) * 10;
  const hoursAgo = (Date.now() - new Date(poll.created_at).getTime()) / 3_600_000;
  if (hoursAgo <= 24) score += 20;
  else if (hoursAgo <= 72) score += 10;
  return score;
}

export function participationScore(poll: RankablePoll, commentCount: number): number {
  const hours = (Date.now() - new Date(poll.created_at).getTime()) / 3_600_000;
  const raw =
    (poll.total_votes ?? 0) * 2 +
    (poll.view_count ?? 0) * 0.3 +
    commentCount * 1.5;
  return raw / Math.sqrt(hours + 2);
}

export function getAlpha(totalUsers: number): number {
  if (totalUsers < 100) return 0;
  if (totalUsers < 500) return 0.3;
  if (totalUsers < 1000) return 0.6;
  return 0.9;
}

export function finalScore(
  poll: RankablePoll,
  commentCount: number,
  alpha: number
): number {
  return (
    editorialScore(poll) * (1 - alpha) +
    participationScore(poll, commentCount) * alpha
  );
}

export function rankPolls<T extends RankablePoll>(
  polls: T[],
  commentCounts: Record<string, number>,
  totalUsers: number
): T[] {
  const alpha = getAlpha(totalUsers);
  return [...polls].sort((a, b) => {
    if (a.is_breaking !== b.is_breaking) return a.is_breaking ? -1 : 1;
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return (
      finalScore(b, commentCounts[b.id] ?? 0, alpha) -
      finalScore(a, commentCounts[a.id] ?? 0, alpha)
    );
  });
}
