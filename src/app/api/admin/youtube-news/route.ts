import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CHANNELS = [
  { id: "UCcQTRi69dsVYHN3exePtZ1A", name: "KBS 뉴스" },
  { id: "UCF3MJt3g9_dkGCFiH5yMSqg", name: "MBC 뉴스" },
  { id: "UCkinYTS9IHqOEwR1Sze09Hw", name: "SBS 뉴스" },
  { id: "UCsJ6RuBimsG-RmebucBCTqA", name: "JTBC 뉴스" },
  { id: "UChlgI3UHCOnwUGzWzbJ3H5w", name: "YTN" },
];

interface SearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: { medium?: { url: string }; default?: { url: string } };
  };
}

interface VideoItem {
  id: string;
  statistics: { viewCount?: string };
}

interface YTError { error: { message: string } }

async function ytFetch<T extends object>(url: URL, apiKey: string): Promise<T> {
  url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json() as T | YTError;
  if ("error" in data) throw new Error((data as YTError).error.message);
  return data as T;
}

async function fetchChannelVideos(
  channelId: string,
  channelName: string,
  apiKey: string,
  publishedAfter: string,
) {
  // 1. Search: up to 20 latest videos
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("channelId", channelId);
  searchUrl.searchParams.set("maxResults", "20");
  searchUrl.searchParams.set("order", "date");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("publishedAfter", publishedAfter);

  const searchData = await ytFetch<{ items?: SearchItem[] }>(searchUrl, apiKey);
  const searchItems = searchData.items ?? [];
  if (searchItems.length === 0) return [];

  // 2. Videos: fetch statistics for sorting by viewCount
  const videoIds = searchItems.map((i) => i.id.videoId).join(",");
  const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  statsUrl.searchParams.set("part", "statistics");
  statsUrl.searchParams.set("id", videoIds);

  const statsData = await ytFetch<{ items?: VideoItem[] }>(statsUrl, apiKey);
  const statsMap = new Map(
    (statsData.items ?? []).map((v) => [v.id, Number(v.statistics.viewCount ?? 0)])
  );

  // 3. Merge, sort by viewCount desc, take top 5
  return searchItems
    .map((item) => ({
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
      view_count: statsMap.get(item.id.videoId) ?? 0,
    }))
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, 5);
}

type VideoRow = Awaited<ReturnType<typeof fetchChannelVideos>>[number];

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY가 설정되지 않았습니다" }, { status: 503 });
  }

  const publishedAfter = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const results = await Promise.allSettled(
    CHANNELS.map((ch) => fetchChannelVideos(ch.id, ch.name, apiKey, publishedAfter))
  );

  const videos: VideoRow[] = [];
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
