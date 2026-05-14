export interface Room {
  slug: string;
  title: string;
  description: string;
  icon: string;
}

export const ROOMS: Room[] = [
  {
    slug: 'stocks',
    title: '주식',
    description: '국내외 주식시장 & 종목 투자 전략 토론',
    icon: '📈',
  },
  {
    slug: 'realestate',
    title: '부동산',
    description: '아파트·토지·상가 부동산 시장 전망 토론',
    icon: '🏠',
  },
  {
    slug: 'crypto',
    title: '코인',
    description: '비트코인·이더리움·알트코인 암호화폐 토론',
    icon: '💰',
  },
  {
    slug: 'iran-war',
    title: '이란전쟁',
    description: '이란 핵협상·중동 정세·국제 분쟁 토론',
    icon: '🌍',
  },
];

export function getRoomBySlug(slug: string): Room | undefined {
  return ROOMS.find((r) => r.slug === slug);
}
