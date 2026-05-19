import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

const CHANNELS = [
  { id: "UCcQTRi69dsVYHN3exePtZ1A", name: "KBS 뉴스" },
  { id: "UCF4Wxdo3inmxP-Y59wXDsFw", name: "MBC 뉴스" },
  { id: "UCkinYTS9IHqOEwR1Sze2JTw", name: "SBS 뉴스" },
  { id: "UCsU-I-vHLiaMfV_ceaYz5rQ", name: "JTBC 뉴스" },
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

  const LIVE_KEYWORDS = ["라이브", "LIVE", "Live", "live", "중계", "생방송", "실시간", "#shorts", "#Shorts"];

  // 3. Merge, filter live/realtime, sort by viewCount desc, take top 5
  return searchItems
    .filter((item) => !LIVE_KEYWORDS.some((kw) => item.snippet.title.includes(kw)))
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
type ScoredVideoRow = VideoRow & { ai_score: number };

async function scoreVideos(videos: VideoRow[]): Promise<Map<string, number>> {
  if (videos.length === 0) return new Map();

  const client = new Anthropic();
  const prompt = `다음 뉴스 영상 목록을 투표 주제로 적합한지 0~10점으로 평가하세요.
높은 점수 기준: 찬반 논점이 명확함, 사회적 논란, 정책/제도 이슈, 여론이 갈리는 사안.
낮은 점수 기준: 단순 사건사고 보도, 날씨, 스포츠 경기 결과, 연예인 가십, 선거 개표 결과.

반드시 JSON 배열만 응답하세요 (설명 없이):
[{"video_id":"...","score":숫자},...]

영상 목록:
${JSON.stringify(videos.map((v) => ({ video_id: v.video_id, title: v.title, description: v.description })))}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return new Map();

    const scores = JSON.parse(match[0]) as { video_id: string; score: number }[];
    return new Map(scores.map((s) => [s.video_id, s.score]));
  } catch {
    // AI 스코어링 실패 시 모든 영상 통과 (score 5 기본값)
    return new Map(videos.map((v) => [v.video_id, 5]));
  }
}

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

  // AI 스코어링 및 필터링
  const scoreMap = await scoreVideos(videos);
  const scoredVideos: ScoredVideoRow[] = videos
    .map((v) => ({ ...v, ai_score: scoreMap.get(v.video_id) ?? 0 }))
    .filter((v) => v.ai_score >= 6);

  if (scoredVideos.length > 0) {
    const supabase = createAdminClient();
    const { error: dbErr } = await supabase
      .from("youtube_news")
      .upsert(scoredVideos, { onConflict: "video_id", ignoreDuplicates: true });

    if (dbErr) {
      return NextResponse.json(
        { error: "DB 저장 실패: " + dbErr.message, videos: scoredVideos, errors },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    count: scoredVideos.length,
    filtered_count: videos.length - scoredVideos.length,
    videos: scoredVideos,
    ...(errors.length > 0 && { errors }),
  });
}
