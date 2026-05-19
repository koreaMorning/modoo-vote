import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const G = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ko&gl=KR&ceid=KR:ko`;

const PLATFORMS = [
  { id: "netflix",  label: "넷플릭스",    rankQ: G("넷플릭스 TOP10 순위"),       upcomingQ: G("넷플릭스 신작 공개 예정") },
  { id: "tving",   label: "티빙",         rankQ: G("티빙 순위 인기"),             upcomingQ: G("티빙 신작 공개 예정") },
  { id: "wavve",   label: "웨이브",       rankQ: G("웨이브 순위 인기"),           upcomingQ: G("웨이브 신작 공개 예정") },
  { id: "coupang", label: "쿠팡플레이",   rankQ: G("쿠팡플레이 순위 인기"),      upcomingQ: G("쿠팡플레이 신작 예정") },
  { id: "disney",  label: "디즈니플러스", rankQ: G("디즈니플러스 순위 인기"),    upcomingQ: G("디즈니플러스 신작 예정") },
] as const;

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
};

function extractText(xml: string, tag: string): string {
  const cdata = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i").exec(xml);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i").exec(xml);
  return plain ? plain[1].trim() : "";
}

function parseRss(xml: string): Array<{ title: string; description: string }> {
  const items: Array<{ title: string; description: string }> = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    items.push({ title: extractText(m[1], "title"), description: extractText(m[1], "description") });
  }
  return items.slice(0, 10);
}

async function fetchRss(url: string) {
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, cache: "no-store" });
    if (!res.ok) return [];
    return parseRss(await res.text());
  } catch {
    return [];
  }
}

interface RankRow {
  platform: string;
  type: "rank";
  rank: number;
  title: string;
  genre: string | null;
  description: string | null;
  badges: string[];
  ep: string | null;
  upcoming_date: null;
}

interface UpcomingRow {
  platform: string;
  type: "upcoming";
  rank: null;
  title: string;
  genre: null;
  description: string | null;
  badges: null;
  ep: null;
  upcoming_date: string | null;
}

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다" }, { status: 503 });
  }

  const rssData = await Promise.all(
    PLATFORMS.map(async (p) => {
      const [rankArticles, upcomingArticles] = await Promise.all([
        fetchRss(p.rankQ),
        fetchRss(p.upcomingQ),
      ]);
      return { id: p.id, label: p.label, rankArticles, upcomingArticles };
    })
  );

  const sections = rssData.map(({ id, label, rankArticles, upcomingArticles }) => {
    const rankText = rankArticles.length
      ? rankArticles.map((a, i) => `${i + 1}. ${a.title}\n   ${a.description.slice(0, 150)}`).join("\n")
      : "뉴스 없음";
    const upText = upcomingArticles.length
      ? upcomingArticles.map((a, i) => `${i + 1}. ${a.title}\n   ${a.description.slice(0, 150)}`).join("\n")
      : "뉴스 없음";
    return `[${label} / id: ${id}]\n순위 뉴스:\n${rankText}\n\n공개 예정 뉴스:\n${upText}`;
  }).join("\n\n---\n\n");

  const prompt = `다음 한국 OTT 플랫폼 최신 뉴스를 분석해서 각 플랫폼의 인기 프로그램 순위와 공개 예정 프로그램을 정리해주세요. 뉴스에 명시적 정보가 없으면 해당 플랫폼의 실제 알려진 콘텐츠로 채워주세요.

${sections}

다음 JSON 형식으로만 응답하세요 (다른 텍스트 금지):
{
  "ranks": [
    {
      "platform": "netflix",
      "rank": 1,
      "title": "프로그램 제목",
      "genre": "장르 · 형태 · 편수",
      "desc": "한 줄 설명 (30자 이내)",
      "badges": [],
      "ep": "방영 정보"
    }
  ],
  "upcoming": [
    {
      "platform": "netflix",
      "title": "프로그램 제목",
      "date": "공개 예정 날짜",
      "desc": "한 줄 설명 (30자 이내)"
    }
  ]
}

규칙:
- ranks: 각 플랫폼(netflix·tving·wavve·coupang·disney)별 10개 = 총 50개
- upcoming: 각 플랫폼별 2개 = 총 10개
- badges: 신규면 ["NEW"], 화제작이면 ["HOT"], 해당 없으면 []
- ep 예시: "1-2화 공개", "매주 금요일", "전체 공개", "스트리밍 시작"`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 6000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON 파싱 실패");

    const parsed = JSON.parse(jsonMatch[0]) as {
      ranks: Array<{ platform: string; rank: number; title: string; genre?: string; desc?: string; badges?: string[]; ep?: string }>;
      upcoming: Array<{ platform: string; title: string; date?: string; desc?: string }>;
    };

    const rankRows: RankRow[] = parsed.ranks.map((r) => ({
      platform: r.platform,
      type: "rank",
      rank: r.rank,
      title: r.title,
      genre: r.genre ?? null,
      description: r.description ?? null,
      badges: r.badges ?? [],
      ep: r.ep ?? null,
      upcoming_date: null,
    }));

    const upcomingRows: UpcomingRow[] = parsed.upcoming.map((u) => ({
      platform: u.platform,
      type: "upcoming",
      rank: null,
      title: u.title,
      genre: null,
      description: u.description ?? null,
      badges: null,
      ep: null,
      upcoming_date: u.date ?? null,
    }));

    const supabase = createAdminClient();

    const { error: delErr } = await supabase.from("ott_schedule").delete().not("platform", "is", null);
    if (delErr) throw delErr;

    const { error: insErr } = await supabase.from("ott_schedule").insert([...rankRows, ...upcomingRows]);
    if (insErr) throw insErr;

    return NextResponse.json({ rank_count: rankRows.length, upcoming_count: upcomingRows.length });
  } catch (e) {
    console.error("OTT update error:", e);
    return NextResponse.json({ error: "OTT 업데이트 실패: " + String(e) }, { status: 500 });
  }
}
