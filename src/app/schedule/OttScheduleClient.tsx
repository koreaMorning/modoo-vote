'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import s from './schedule.module.css';

const platforms = [
  { id: 'netflix',  label: '넷플릭스',    color: '#E50914' },
  { id: 'tving',   label: '티빙',         color: '#FF2C55' },
  { id: 'wavve',   label: '웨이브',       color: '#006DFB' },
  { id: 'coupang', label: '쿠팡플레이',   color: '#C10000' },
  { id: 'disney',  label: '디즈니+',      color: '#113CCF' },
] as const;

type PlatformId = typeof platforms[number]['id'];

type ShowCell     = { title: string; genre: string; description: string; badges: string[]; ep: string };
type UpcomingCell = { title: string; date: string; description: string };

type RankRow     = { rank: number } & Record<PlatformId, ShowCell>;
type UpcomingRow = Record<PlatformId, UpcomingCell>;

const EMPTY_SHOW: ShowCell         = { title: '-', genre: '', description: '', badges: [], ep: '' };
const EMPTY_UPCOMING: UpcomingCell = { title: '-', date: '', description: '' };

interface DbRow {
  platform: string;
  type: string;
  rank: number | null;
  title: string;
  genre: string | null;
  description: string | null;
  badges: string[] | null;
  ep: string | null;
  upcoming_date: string | null;
}

function buildRanks(data: DbRow[]): RankRow[] {
  const map = new Map<number, Partial<Record<PlatformId, ShowCell>>>();
  for (const row of data) {
    if (row.type !== 'rank' || row.rank == null) continue;
    if (!map.has(row.rank)) map.set(row.rank, {});
    map.get(row.rank)![row.platform as PlatformId] = {
      title: row.title,
      genre: row.genre ?? '',
      description: row.description ?? '',
      badges: row.badges ?? [],
      ep: row.ep ?? '',
    };
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([rank, cells]) => ({
      rank,
      netflix:  cells.netflix  ?? EMPTY_SHOW,
      tving:    cells.tving    ?? EMPTY_SHOW,
      wavve:    cells.wavve    ?? EMPTY_SHOW,
      coupang:  cells.coupang  ?? EMPTY_SHOW,
      disney:   cells.disney   ?? EMPTY_SHOW,
    }));
}

function buildUpcoming(data: DbRow[]): UpcomingRow[] {
  const byPlatform: Partial<Record<PlatformId, UpcomingCell[]>> = {};
  for (const row of data) {
    if (row.type !== 'upcoming') continue;
    const pid = row.platform as PlatformId;
    if (!byPlatform[pid]) byPlatform[pid] = [];
    byPlatform[pid]!.push({
      title: row.title,
      date: row.upcoming_date ?? '',
      description: row.description ?? '',
    });
  }
  const len = Math.max(...platforms.map((p) => byPlatform[p.id]?.length ?? 0), 0);
  return Array.from({ length: len }, (_, i) => ({
    netflix:  (byPlatform.netflix  ?? [])[i] ?? EMPTY_UPCOMING,
    tving:    (byPlatform.tving    ?? [])[i] ?? EMPTY_UPCOMING,
    wavve:    (byPlatform.wavve    ?? [])[i] ?? EMPTY_UPCOMING,
    coupang:  (byPlatform.coupang  ?? [])[i] ?? EMPTY_UPCOMING,
    disney:   (byPlatform.disney   ?? [])[i] ?? EMPTY_UPCOMING,
  }));
}

export default function OttScheduleClient() {
  const [active, setActive]       = useState<PlatformId>('netflix');
  const [ranks, setRanks]         = useState<RankRow[]>([]);
  const [upcoming, setUpcoming]   = useState<UpcomingRow[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('ott_schedule')
      .select('*')
      .order('rank', { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setRanks(buildRanks(data as DbRow[]));
          setUpcoming(buildUpcoming(data as DbRow[]));
        }
        setLoading(false);
      });
  }, []);

  const activePlatform = platforms.find((p) => p.id === active)!;

  return (
    <div>
      {/* 플랫폼 탭 */}
      <div className={s.tabsWrap}>
        {platforms.map((p) => (
          <button
            key={p.id}
            className={`${s.platformTab} ${active === p.id ? s.platformTabActive : ''}`}
            onClick={() => setActive(p.id)}
          >
            <span className={s.platformDot} style={{ background: p.color }} />
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>불러오는 중…</p>
      ) : (
        <>
          {/* 순위 리스트 */}
          <div className={s.rankList}>
            {ranks.map((row) => {
              const show = row[active];
              return (
                <div key={row.rank} className={s.rankItem}>
                  <div className={`${s.rankNum} ${row.rank <= 3 ? s.rankNumTop3 : ''}`}>
                    {row.rank}
                  </div>
                  <div className={s.rankContent}>
                    <div className={s.rankTitle}>{show.title}</div>
                    <div className={s.rankGenre}>{show.genre}</div>
                    <div className={s.rankDesc}>{show.description}</div>
                    <div className={s.rankBottom}>
                      {show.badges.includes('NEW') && <span className={s.badgeNew}>NEW</span>}
                      {show.badges.includes('HOT') && <span className={s.badgeHot}>HOT</span>}
                      <span className={s.progEp}>{show.ep}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 공개 예정 */}
          {upcoming.length > 0 && (
            <div className={s.upcomingSection}>
              <div className={s.upcomingSectionTitle}>— 공 개 예 정 —</div>
              {upcoming.map((row, i) => {
                const show = row[active];
                return (
                  <div key={i} className={s.upcomingListItem}>
                    <div className={s.upcomingMonthBadge}>
                      {show.date.match(/(\d+월)/)?.[1] ?? '예정'}
                    </div>
                    <div className={s.upcomingListContent}>
                      <div className={s.upcomingListTitle}>{show.title}</div>
                      <div className={s.upcomingListDate}>{show.date}</div>
                      <div className={s.upcomingListDesc}>{show.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className={s.platformIndicator} style={{ borderColor: activePlatform.color }}>
        <span style={{ color: activePlatform.color }}>{activePlatform.label}</span> TOP 10
      </div>
    </div>
  );
}
