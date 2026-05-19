import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CHANNELS = [
  { id: "UCcQTRi69dsVYHN3exePtZ1A", name: "KBS 뉴스" },
  { id: "UCF3MJt3g9_dkGCFiH5yMSqg", name: "MBC 뉴스" },
  { id: "UCkinYTS9IHqOEwR1Sze09Hw", name: "SBS 뉴스" },
  { id: "UCsJ6RuBimsG-RmebucBCTqA", name: "JTBC 뉴스" },
  { id: "UChlgI3UHCOnwUGzWzbJ3H5w", name: "YTN" },
];

interface YTSnippet {
  title: string;
  description: string;
  publishedAt: string;
  thumbnails: { medium?: { url: string }; default?: { url: string } };
  channelId: string;
}

interface YTItem {
  id: { videoId: string };
  snippet: YTSnippet;
}

interface YTResponse {
  items?: YTItem[];
  error?: { message: string };
}

async function fetchChannelVideos(
  channelId: string,
  channelName: string,
  apiKey: string,
  publishedAfter: string
) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("order", "date");
  url.searchParams.set("type", "video");
  url.searchParams.set("publishedAfter", publishedAfter);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data: YTResponse = await res.json();

  if (data.error) throw new Error(`[${channelName}] ${data.error.message}`);

  return (data.items ?? []).map((item) => ({
    video_id: item.id.videoId,
    channel_id: channelId,
    channel_name: channelName,
    title: item.snippet.title,
    description: item.snippet.description?.slice(0, 500) ?? null,
    published_at: item.snippet.publishedAt,
    thumbnail_url:
      item.snippet.thumbnails.medium?.url ??
      item.snippet.thumbnails.default?.url ??
      null,
  }));
}

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY가 설정되지 않았습니다" }, { status: 503 });
  }

  const publishedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const results = await Promise.allSettled(
    CHANNELS.map((ch) => fetchChannelVideos(ch.id, ch.name, apiKey, publishedAfter))
  );

  const videos: ReturnType<typeof fetchChannelVideos> extends Promise<infer T> ? T : never = [];
  const errors: string[] = [];

  for (const [i, result] of results.entries()) {
    if (result.status === "fulfilled") {
      videos.push(...result.value);
    } else {
      errors.push(`${CHANNELS[i].name}: ${result.reason}`);
    }
  }

  if (videos.length > 0) {
    const supabase = createAdminClient();
    const { error: dbErr } = await supabase
      .from("youtube_news")
      .upsert(videos, { onConflict: "video_id", ignoreDuplicates: true });

    if (dbErr) {
      return NextResponse.json(
        { error: "DB 저장 실패: " + dbErr.message, videos, errors },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    count: videos.length,
    videos,
    ...(errors.length > 0 && { errors }),
  });
}
