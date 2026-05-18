'use client';

import { useState } from 'react';
import s from './schedule.module.css';

const platforms = [
  { id: 'netflix', label: '넷플릭스', color: '#E50914' },
  { id: 'tving', label: '티빙', color: '#FF2C55' },
  { id: 'wavve', label: '웨이브', color: '#006DFB' },
  { id: 'coupang', label: '쿠팡플레이', color: '#C10000' },
  { id: 'disney', label: '디즈니+', color: '#113CCF' },
] as const;

type PlatformId = typeof platforms[number]['id'];

type ShowCell = { title: string; genre: string; desc: string; badges: string[]; ep: string };
type UpcomingCell = { title: string; date: string; desc: string };

const ranks: {
  rank: number;
  change: string;
  changeType?: string;
  netflix: ShowCell;
  tving: ShowCell;
  wavve: ShowCell;
  disney: ShowCell;
  coupang: ShowCell;
}[] = [
  {
    rank: 1,
    change: 'NEW',
    netflix: { title: '폭풍의 계절', genre: '스릴러 · 범죄 · 16부작', desc: '전직 형사가 연쇄 실종 사건을 추적하며 충격적 진실과 마주한다', badges: ['NEW'], ep: '1-2화 공개' },
    tving: { title: '봄날의 기억', genre: '로맨스 · 드라마 · 12부작', desc: '10년 만에 재회한 첫사랑, 다시 시작할 수 있을까', badges: ['NEW'], ep: '1-2화 공개' },
    wavve: { title: '마지막 형사', genre: '액션 · 범죄 · 10부작', desc: '은퇴를 앞둔 형사의 마지막 사건, 도시를 뒤흔들다', badges: ['HOT'], ep: '5-6화 공개' },
    disney: { title: '마블: 새벽의 전사', genre: '액션 · SF · 6부작', desc: '새로운 히어로의 등장, 마블 유니버스가 다시 열린다', badges: ['NEW'], ep: '1화 공개' },
    coupang: { title: '야구의 신', genre: '스포츠 · 드라마 · 8부작', desc: '무명 투수의 기적 같은 역전 스토리', badges: ['HOT'], ep: '3-4화 공개' },
  },
  {
    rank: 2,
    change: '▼ 1',
    changeType: 'down',
    netflix: { title: '오징어 게임 3', genre: '스릴러 · 서바이벌 · 9부작', desc: '다시 시작된 게임, 이번엔 누가 살아남을 것인가', badges: ['HOT'], ep: '전체 공개' },
    tving: { title: '환승연애 5', genre: '연애 리얼리티', desc: '전 연인과의 재회, 새로운 사랑의 시작', badges: [], ep: '매주 목요일' },
    wavve: { title: '다크 시티: 리부트', genre: 'SF · 스릴러 · 8부작', desc: '2035년 대도시를 배경으로 한 근미래 SF', badges: [], ep: '7-8화 공개' },
    disney: { title: '내셔널 지오그래픽: 한국의 야생', genre: '다큐멘터리', desc: '아직 알려지지 않은 한국 자연의 경이로운 순간들', badges: [], ep: '전체 공개' },
    coupang: { title: 'SNL 코리아 시즌 8', genre: '버라이어티 · 코미디', desc: '매주 토요일 밤, 대한민국이 웃는다', badges: [], ep: '매주 토요일' },
  },
  {
    rank: 3,
    change: '▲ 2',
    changeType: 'up',
    netflix: { title: '흑백요리사 3', genre: '요리 예능', desc: '백수저 vs 흑수저, 요리 대결의 귀환', badges: ['NEW'], ep: '1화 공개' },
    tving: { title: '눈물의 여왕 2', genre: '멜로 · 드라마 · 16부작', desc: '다시 찾아온 사랑, 이번엔 끝까지 지킨다', badges: [], ep: '1-2화 공개' },
    wavve: { title: '우리들의 이야기', genre: '가족 · 드라마 · 10부작', desc: '세 자매의 성장과 화해를 담은 따뜻한 이야기', badges: [], ep: '3-4화 공개' },
    disney: { title: '스타워즈: 여명', genre: 'SF · 액션 · 8부작', desc: '은하계 새로운 위협, 새벽의 전사들이 나선다', badges: [], ep: '전체 공개' },
    coupang: { title: '무빙 시즌 2', genre: '액션 · 슈퍼히어로 · 12부작', desc: '능력자들의 귀환, 더 커진 위협이 다가온다', badges: ['HOT'], ep: '5-6화 공개' },
  },
  {
    rank: 4,
    change: '▲ 1',
    changeType: 'up',
    netflix: { title: '사랑의 불시착 리마스터', genre: '로맨스 · 드라마 · 16부작', desc: '4K 리마스터링으로 다시 만나는 명작', badges: [], ep: '전체 공개' },
    tving: { title: '피지컬: 100 시즌 4', genre: '서바이벌 · 예능', desc: '대한민국 최강의 몸을 가진 100인의 대결', badges: [], ep: '매주 화요일' },
    wavve: { title: '비밀의 숲 3', genre: '법정 · 스릴러 · 12부작', desc: '황시목과 한여진, 더 깊은 음모를 파헤친다', badges: ['NEW'], ep: '1-2화 공개' },
    disney: { title: '그레이 아나토미 시즌 21', genre: '의학 드라마', desc: '메레디스 그레이의 이야기는 계속된다', badges: [], ep: '매주 목요일' },
    coupang: { title: '손흥민: 더 라스트 댄스', genre: '스포츠 다큐', desc: '손흥민의 마지막 시즌 밀착 다큐멘터리', badges: ['HOT'], ep: '전체 공개' },
  },
  {
    rank: 5,
    change: '▼ 2',
    changeType: 'down',
    netflix: { title: '지금 우리 학교는 3', genre: '호러 · 좀비 · 12부작', desc: '바이러스가 다시 퍼진다, 생존을 위한 사투', badges: ['NEW'], ep: '1-4화 공개' },
    tving: { title: '술꾼도시여자들 3', genre: '코미디 · 드라마 · 10부작', desc: '세 친구의 웃음과 눈물이 담긴 공감 드라마', badges: [], ep: '3-4화 공개' },
    wavve: { title: '펜트하우스 리부트', genre: '막장 · 드라마 · 20부작', desc: '욕망과 복수의 끝없는 소용돌이가 다시 시작', badges: ['NEW'], ep: '1-2화 공개' },
    disney: { title: '인디아나 존스 5', genre: '어드벤처 · 영화', desc: '전설의 고고학자가 돌아왔다', badges: [], ep: '스트리밍 시작' },
    coupang: { title: '이상한 나라의 수학자 2', genre: '드라마 · 교육 · 12부작', desc: '천재 수학자와 학생들의 감동적인 2막', badges: [], ep: '5-6화 공개' },
  },
  {
    rank: 6,
    change: '▲ 3',
    changeType: 'up',
    netflix: { title: '킹덤: 아신전 2', genre: '역사 · 좀비 · 8부작', desc: '아신의 복수는 끝나지 않았다', badges: [], ep: '3-4화 공개' },
    tving: { title: '나는 SOLO 시즌 25', genre: '연애 리얼리티', desc: '진짜 인연을 찾아 떠나는 솔로들의 여정', badges: [], ep: '매주 수요일' },
    wavve: { title: '모범택시 3', genre: '액션 · 복수 · 16부작', desc: '무지개 운수 택시가 다시 달린다', badges: [], ep: '전체 공개' },
    disney: { title: '픽사: 엘리멘탈 2', genre: '애니메이션 · 가족', desc: '엠버와 웨이드의 사랑이 새로운 모험으로', badges: ['NEW'], ep: '스트리밍 시작' },
    coupang: { title: '류현진: 마운드의 전설', genre: '스포츠 다큐', desc: '류현진의 빅리그 도전 10년의 기록', badges: [], ep: '전체 공개' },
  },
  {
    rank: 7,
    change: '▼ 1',
    changeType: 'down',
    netflix: { title: '더 글로리 시즌 3', genre: '복수 · 드라마 · 8부작', desc: '문동은의 복수는 완전히 끝났는가', badges: [], ep: '전체 공개' },
    tving: { title: '미스터 션샤인 리마스터', genre: '역사 · 로맨스 · 24부작', desc: '4K로 다시 만나는 역사 대작', badges: [], ep: '전체 공개' },
    wavve: { title: '경이로운 소문 3', genre: '판타지 · 액션 · 12부작', desc: '카운터들의 새로운 악령 사냥이 시작된다', badges: ['NEW'], ep: '1-2화 공개' },
    disney: { title: '만달로리안 시즌 4', genre: 'SF · 액션', desc: '만달로리안과 그로구의 새로운 모험', badges: [], ep: '매주 수요일' },
    coupang: { title: '안나라수마나라 2', genre: '판타지 · 드라마 · 8부작', desc: '마법사와 소녀의 환상적인 이야기가 계속된다', badges: [], ep: '1-2화 공개' },
  },
  {
    rank: 8,
    change: '▲ 1',
    changeType: 'up',
    netflix: { title: '나르코스: 코리아', genre: '범죄 · 드라마 · 10부작', desc: '한국 마약 조직의 실체를 파헤치다', badges: ['NEW'], ep: '1-3화 공개' },
    tving: { title: '복수해라 시즌 2', genre: '법정 · 스릴러 · 10부작', desc: '정의를 위한 복수가 다시 시작된다', badges: [], ep: '5-6화 공개' },
    wavve: { title: '연인 리마스터', genre: '역사 · 로맨스 · 20부작', desc: '병자호란을 배경으로 한 애절한 사랑 이야기', badges: [], ep: '전체 공개' },
    disney: { title: '아가사 올: 마녀재판', genre: '미스터리 · 코미디', desc: '완다비전의 그 마녀, 아가사가 돌아왔다', badges: [], ep: '전체 공개' },
    coupang: { title: '치얼업 시즌 2', genre: '청춘 · 로맨스 · 12부작', desc: '응원단의 열정과 사랑이 다시 펼쳐진다', badges: [], ep: '3-4화 공개' },
  },
  {
    rank: 9,
    change: '▼ 3',
    changeType: 'down',
    netflix: { title: '종이의 집: 공동경제구역 2', genre: '범죄 · 액션 · 12부작', desc: '교수의 새로운 작전이 다시 시작된다', badges: [], ep: '전체 공개' },
    tving: { title: '작은 아씨들 2', genre: '스릴러 · 드라마 · 12부작', desc: '세 자매의 두 번째 이야기, 더 큰 음모가 기다린다', badges: [], ep: '1-2화 공개' },
    wavve: { title: '허쉬 시즌 2', genre: '법정 · 미스터리 · 10부작', desc: '진실을 말해야 하는 기자의 딜레마', badges: [], ep: '7-8화 공개' },
    disney: { title: '원더우먼 3', genre: '액션 · 슈퍼히어로', desc: '다이애나 프린스가 새로운 적과 맞선다', badges: ['NEW'], ep: '스트리밍 시작' },
    coupang: { title: '사내맞선 시즌 2', genre: '로맨스 · 코미디 · 12부작', desc: '회사 내 맞선, 이번엔 진짜 사랑으로', badges: [], ep: '전체 공개' },
  },
  {
    rank: 10,
    change: '▲ 2',
    changeType: 'up',
    netflix: { title: '수리남 시즌 2', genre: '범죄 · 액션 · 8부작', desc: '강인구의 두 번째 잠입 작전이 시작된다', badges: [], ep: '3-4화 공개' },
    tving: { title: '이상한 변호사 우영우 2', genre: '법정 · 드라마 · 16부작', desc: '우영우 변호사의 특별한 사건들이 계속된다', badges: ['HOT'], ep: '1-2화 공개' },
    wavve: { title: '고려거란전쟁 2', genre: '역사 · 전쟁 · 20부작', desc: '고려의 운명을 건 두 번째 전쟁이 시작된다', badges: [], ep: '전체 공개' },
    disney: { title: '로키 시즌 3', genre: 'SF · 판타지', desc: '시간의 신 로키의 새로운 모험', badges: [], ep: '매주 화요일' },
    coupang: { title: '약한영웅 Class 3', genre: '액션 · 청춘 · 8부작', desc: '두뇌로 싸우는 영웅의 세 번째 이야기', badges: ['NEW'], ep: '1-2화 공개' },
  },
];

const upcoming: {
  month: string;
  netflix: UpcomingCell;
  tving: UpcomingCell;
  wavve: UpcomingCell;
  disney: UpcomingCell;
  coupang: UpcomingCell;
}[] = [
  {
    month: '5월\n공개',
    netflix: { title: '이토록 친밀한 배신자', date: '5월 9일 공개', desc: '가장 가까운 사람이 가장 위험한 적이 된다. 김하늘 주연의 심리 스릴러' },
    tving: { title: '러브캐처 인 서울', date: '5월 15일 공개', desc: '사랑꾼과 현금꾼 사이, 진짜 마음을 찾아라' },
    wavve: { title: '악마판사 시즌 2', date: '5월 20일 공개', desc: '강요한 판사의 두 번째 법정이 열린다' },
    disney: { title: '어벤져스: 시크릿 워즈', date: '5월 극장 개봉 후 공개', desc: '마블 시네마틱 유니버스 최대 규모의 결전' },
    coupang: { title: '경성크리처 시즌 3', date: '5월 30일 공개', desc: '일제강점기 경성을 배경으로 한 공포 드라마' },
  },
  {
    month: '6월\n공개',
    netflix: { title: 'D.P. 시즌 3', date: '6월 공개 예정', desc: '군무이탈 체포조의 이야기, 세 번째 임무가 시작된다' },
    tving: { title: '피의 게임 4', date: '6월 공개 예정', desc: '최고의 두뇌들이 모인 역대 최강 서바이벌' },
    wavve: { title: '빅마우스 시즌 2', date: '6월 공개 예정', desc: '빅마우스로 알려진 변호사의 두 번째 이야기' },
    disney: { title: '월드컵 특집 다큐', date: '6월 11일 월드컵 개막 맞춰 공개', desc: '2026 FIFA 월드컵 태극전사 밀착 다큐멘터리' },
    coupang: { title: '한 번 다녀왔습니다 시즌 2', date: '6월 공개 예정', desc: '평범한 일상 속 특별한 사랑 이야기의 귀환' },
  },
];

export default function OttScheduleClient() {
  const [active, setActive] = useState<PlatformId>('netflix');

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
            <span
              className={s.platformDot}
              style={{ background: p.color }}
            />
            {p.label}
          </button>
        ))}
      </div>

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
                <div className={s.rankDesc}>{show.desc}</div>
                <div className={s.rankBottom}>
                  {show.badges.includes('NEW') && <span className={s.badgeNew}>NEW</span>}
                  {show.badges.includes('HOT') && <span className={s.badgeHot}>HOT</span>}
                  <span className={s.progEp}>{show.ep}</span>
                </div>
              </div>
              <div
                className={`${s.rankChangeTag} ${
                  row.changeType === 'up' ? s.up : row.changeType === 'down' ? s.down : s.newRank
                }`}
              >
                {row.change}
              </div>
            </div>
          );
        })}
      </div>

      {/* 공개 예정 */}
      <div className={s.upcomingSection}>
        <div className={s.upcomingSectionTitle}>— 공 개 예 정 —</div>
        {upcoming.map((row) => {
          const show = row[active];
          return (
            <div key={row.month} className={s.upcomingListItem}>
              <div className={s.upcomingMonthBadge}>{row.month}</div>
              <div className={s.upcomingListContent}>
                <div className={s.upcomingListTitle}>{show.title}</div>
                <div className={s.upcomingListDate}>{show.date}</div>
                <div className={s.upcomingListDesc}>{show.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={s.platformIndicator} style={{ borderColor: activePlatform.color }}>
        <span style={{ color: activePlatform.color }}>{activePlatform.label}</span> TOP 10
      </div>
    </div>
  );
}
