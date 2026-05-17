import { NextRequest, NextResponse } from "next/server";
import { RSS_FEEDS } from "@/lib/rss-feeds";

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  outlet: string;
  youtube_url: string | null;
}

function extractText(xml: string, tag: string): string {
  const cdataMatch = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i").exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();
  const plain = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i").exec(xml);
  return plain ? plain[1].trim() : "";
}

function parseRss(xml: string, outletName: string): RssItem[] {
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const items: RssItem[] = [];
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const link = extractText(block, "link");
    const ytMatch = link.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    items.push({
      title: extractText(block, "title"),
      link,
      description: extractText(block, "description"),
      pubDate: extractText(block, "pubDate"),
      outlet: outletName,
      youtube_url: ytMatch ? `https://www.youtube.com/watch?v=${ytMatch[1]}` : null,
    });
  }
  return items.slice(0, 15);
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[\s\-,。、！？!?.·'"]+/)
      .filter((t) => t.length > 1)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function deduplicate(items: RssItem[], threshold = 0.4): RssItem[] {
  const result: RssItem[] = [];
  const tokenSets: Set<string>[] = [];
  for (const item of items) {
    if (!item.title) continue;
    const tokens = tokenize(item.title);
    let isDupe = false;
    for (const existing of tokenSets) {
      if (jaccard(tokens, existing) >= threshold) { isDupe = true; break; }
    }
    if (!isDupe) {
      result.push(item);
      tokenSets.push(tokens);
    }
  }
  return result;
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
};

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") ?? "정치";
  const feeds = RSS_FEEDS[category] ?? [];

  if (feeds.length === 0) {
    return NextResponse.json({ items: [], outlet_count: 0, total_fetched: 0 });
  }

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const res = await fetch(feed.url, { headers: HEADERS, next: { revalidate: 300 } });
      if (!res.ok) return [] as RssItem[];
      const xml = await res.text();
      return parseRss(xml, feed.name);
    })
  );

  const allItems: RssItem[] = [];
  let outlet_count = 0;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.length > 0) {
      allItems.push(...r.value);
      outlet_count++;
    }
  }

  const total_fetched = allItems.length;

  allItems.sort((a, b) => {
    const da = new Date(a.pubDate).getTime() || 0;
    const db = new Date(b.pubDate).getTime() || 0;
    return db - da;
  });

  const items = deduplicate(allItems);

  return NextResponse.json({ items, outlet_count, total_fetched });
}
