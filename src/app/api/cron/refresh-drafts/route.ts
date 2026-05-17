import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { RSS_FEEDS } from "@/lib/rss-feeds";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ALL_CATEGORIES = ["정치", "경제", "사회", "문화", "국제", "기술", "스포츠", "환경", "연예"];
const SCALE_OPTIONS = ["매우 긍정적", "긍정적", "보통", "부정적", "매우 부정적"];

/* ── RSS helpers ── */

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  outlet: string;
  youtube_url: string | null;
}

function extractText(xml: string, tag: string): string {
  const cdata = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i").exec(xml);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i").exec(xml);
  return plain ? plain[1].trim() : "";
}

function parseRss(xml: string, outletName: string): RssItem[] {
  const items: RssItem[] = [];
  let m;
  const re = /<item>([\s\S]*?)<\/item>/gi;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1];
    const link = extractText(b, "link");
    const yt = link.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    items.push({
      title: extractText(b, "title"),
      link,
      description: extractText(b, "description"),
      pubDate: extractText(b, "pubDate"),
      outlet: outletName,
      youtube_url: yt ? `https://www.youtube.com/watch?v=${yt[1]}` : null,
    });
  }
  return items.slice(0, 15);
}

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[\s\-,。、！？!?.·'"]+/).filter((t) => t.length > 1));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let ix = 0;
  for (const t of a) if (b.has(t)) ix++;
  const union = a.size + b.size - ix;
  return union === 0 ? 0 : ix / union;
}

function deduplicate(items: RssItem[]): (RssItem & { source_count: number })[] {
  const result: (RssItem & { source_count: number })[] = [];
  const sets: Set<string>[] = [];
  for (const item of items) {
    if (!item.title) continue;
    const tokens = tokenize(item.title);
    let dupeIdx = -1;
    for (let i = 0; i < sets.length; i++) {
      if (jaccard(tokens, sets[i]) >= 0.4) { dupeIdx = i; break; }
    }
    if (dupeIdx >= 0) {
      result[dupeIdx].source_count++;
    } else {
      result.push({ ...item, source_count: 1 });
      sets.push(tokens);
    }
  }
  return result;
}

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
};

async function fetchCategoryRss(category: string): Promise<(RssItem & { source_count: number })[]> {
  const feeds = RSS_FEEDS[category] ?? [];
  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const res = await fetch(feed.url, { headers: FETCH_HEADERS, next: { revalidate: 300 } });
      if (!res.ok) return [] as RssItem[];
      return parseRss(await res.text(), feed.name);
    })
  );
  const all: RssItem[] = [];
  for (const r of results) if (r.status === "fulfilled") all.push(...r.value);
  all.sort((a, b) => (new Date(b.pubDate).getTime() || 0) - (new Date(a.pubDate).getTime() || 0));
  return deduplicate(all);
}

/* ── AI generation ── */

async function generateDrafts(
  category: string,
  items: (RssItem & { source_count: number })[],
  needed: number
): Promise<number> {
  if (items.length === 0 || needed <= 0) return 0;

  const articleList = items
    .slice(0, 20)
    .map(
      (a, i) =>
        `${i + 1}. [${a.outlet}] ${a.title}\n   링크: ${a.link}\n   내용: ${(a.description || "").slice(0, 200)}`
    )
    .join("\n\n");

  const prompt = `다음 뉴스 기사들 중 대중 투표에 가장 적합한 ${needed}개를 선별하고 투표 게시글로 만들어주세요.

카테고리: ${category}

뉴스 기사 목록:
${articleList}

JSON 배열 형식으로만 응답하세요:
[
  {
    "article_index": 1,
    "title": "투표 제목 (질문 형식, 30자 이내)",
    "description": "배경 설명 (5~7문장, 중립적 논조)",
    "question_type": "binary",
    "options": ["찬성", "반대"]
  }
]

질문 유형:
- binary: 찬반 → options 2개
- multiple: 객관식 → options 3~5개 (각 15자 이내)
- scale: 정도형 → options 정확히 ["매우 긍정적", "긍정적", "보통", "부정적", "매우 부정적"]

논쟁적이고 의견이 갈릴 만한 이슈를 우선 선택하세요.`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return 0;

  const parsed = JSON.parse(jsonMatch[0]) as Array<{
    article_index: number;
    title: string;
    description: string;
    question_type: "binary" | "multiple" | "scale";
    options: string[];
  }>;

  const supabase = await createClient();
  const rows = [];

  for (const item of parsed) {
    const article = items[item.article_index - 1];
    if (!article || !item.title) continue;
    const options = item.question_type === "scale" ? SCALE_OPTIONS : item.options?.filter(Boolean) ?? [];
    rows.push({
      title: item.title,
      description: item.description ?? null,
      category,
      question_type: item.question_type,
      options,
      source_url: article.link ?? null,
      source_outlet: article.outlet ?? null,
      youtube_url: article.youtube_url ?? null,
      source_count: article.source_count ?? 1,
      status: "pending",
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("poll_drafts").insert(rows);
    if (error) throw error;
  }

  return rows.length;
}

/* ── Route handler ── */

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret when set
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY 미설정" }, { status: 503 });
  }

  try {
    const supabase = await createClient();

    // Get current state to determine what's needed
    const [{ data: polls }, { data: pending }, { data: quotas }] = await Promise.all([
      supabase.from("polls").select("category").eq("is_active", true),
      supabase.from("poll_drafts").select("category").eq("status", "pending"),
      supabase.from("category_quotas").select("*"),
    ]);

    const quotaMap: Record<string, number> = {};
    (quotas ?? []).forEach((q: { category: string; target_count: number }) => {
      quotaMap[q.category] = q.target_count;
    });

    const activeCount: Record<string, number> = {};
    const pendingCount: Record<string, number> = {};
    ALL_CATEGORIES.forEach((c) => { activeCount[c] = 0; pendingCount[c] = 0; });
    (polls ?? []).forEach((p: { category: string }) => { activeCount[p.category] = (activeCount[p.category] ?? 0) + 1; });
    (pending ?? []).forEach((p: { category: string }) => { pendingCount[p.category] = (pendingCount[p.category] ?? 0) + 1; });

    // Only process categories that need more candidates
    const toProcess = ALL_CATEGORIES.filter((cat) => {
      const target = quotaMap[cat] ?? 10;
      const have = activeCount[cat] + pendingCount[cat];
      return have < target;
    });

    if (toProcess.length === 0) {
      return NextResponse.json({ message: "모든 카테고리가 목표치를 달성했습니다", created: 0 });
    }

    // Process categories in parallel batches of 3
    let totalCreated = 0;
    const errors: string[] = [];

    for (let i = 0; i < toProcess.length; i += 3) {
      const batch = toProcess.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map(async (cat) => {
          const target = quotaMap[cat] ?? 10;
          const needed = Math.max(1, Math.min(target - activeCount[cat] - pendingCount[cat], 5));
          const items = await fetchCategoryRss(cat);
          return generateDrafts(cat, items, needed);
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") totalCreated += r.value;
        else errors.push(String(r.reason));
      }
    }

    return NextResponse.json({
      processed: toProcess,
      created: totalCreated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    console.error("Cron refresh error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
