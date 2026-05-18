import { NextRequest, NextResponse } from "next/server";
import { RSS_FEEDS } from "@/lib/rss-feeds";

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

function extractText(xml: string, tag: string): string {
  const cdataMatch = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i").exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();
  const textMatch = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i").exec(xml);
  return textMatch ? textMatch[1].trim() : "";
}

const GOOGLE_NEWS_RE = /news\.google\.com\/rss\/articles\//;

function resolveGoogleLink(link: string, description: string): string {
  if (!GOOGLE_NEWS_RE.test(link)) return link;
  const unescaped = description
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"');
  const m = unescaped.match(/href="(https?:\/\/[^"]+)"/);
  return m ? m[1] : link;
}

function parseRss(xml: string): RssItem[] {
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const items: RssItem[] = [];
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const description = extractText(block, "description");
    const rawLink = extractText(block, "link");
    items.push({
      title: extractText(block, "title"),
      link: resolveGoogleLink(rawLink, description),
      description,
      pubDate: extractText(block, "pubDate"),
    });
  }
  return items.slice(0, 20);
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") ?? "정치";
  const source = req.nextUrl.searchParams.get("source");

  const feeds = RSS_FEEDS[category] ?? RSS_FEEDS["정치"];
  const feed = (source ? feeds.find((f) => f.name === source) : null) ?? feeds[0];

  try {
    const res = await fetch(feed.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `RSS 요청 실패: ${res.status}` }, { status: 502 });
    }

    const xml = await res.text();
    const items = parseRss(xml);

    return NextResponse.json({ items });
  } catch (e) {
    console.error("RSS fetch error:", e);
    return NextResponse.json({ error: "RSS 가져오기 실패" }, { status: 500 });
  }
}
