import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SCALE_OPTIONS = ["매우 긍정적", "긍정적", "보통", "부정적", "매우 부정적"];

interface ArticleInput {
  title: string;
  description: string;
  link: string;
  outlet: string;
  youtube_url: string | null;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다" }, { status: 503 });
  }

  const { items, category, quota_needed } = await req.json();
  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "기사 목록이 필요합니다" }, { status: 400 });
  }

  const articles = (items as ArticleInput[]).slice(0, 20);
  const needed = Math.max(1, Math.min(quota_needed ?? 5, 10));

  const articleList = articles
    .map(
      (a, i) =>
        `${i + 1}. [${a.outlet}] ${a.title}\n   링크: ${a.link}\n   내용: ${(a.description || "").slice(0, 200)}`
    )
    .join("\n\n");

  const prompt = `다음 뉴스 기사들 중에서 대중 투표에 가장 적합한 ${needed}개를 선별하고, 각각을 투표 게시글로 만들어주세요.

카테고리: ${category}

뉴스 기사 목록:
${articleList}

다음 JSON 배열 형식으로만 응답해주세요. 다른 텍스트는 절대 포함하지 마세요:
[
  {
    "article_index": 1,
    "title": "투표 제목 (질문 형식, 30자 이내)",
    "description": "배경 설명 (5~7문장, 중립적 논조)",
    "question_type": "binary",
    "options": ["찬성", "반대"]
  }
]

질문 유형 선택 기준:
- binary (찬반형): 정책·사건에 대한 찬반 → options 2개: 상황에 맞는 찬반 표현
- multiple (객관식): 여러 선택지 중 선택 → options 3~5개, 각 15자 이내
- scale (정도형): 정도·강도를 묻는 경우 → options 반드시 정확히 5개: ["매우 긍정적", "긍정적", "보통", "부정적", "매우 부정적"]

선별 기준: 논쟁적이고 독자들이 의견을 나눌 만한 사회적 이슈를 우선 선택`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("JSON 파싱 실패");

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
      const article = articles[item.article_index - 1];
      if (!article || !item.title) continue;

      const options =
        item.question_type === "scale" ? SCALE_OPTIONS : item.options?.filter(Boolean) ?? [];

      rows.push({
        title: item.title,
        description: item.description ?? null,
        category,
        question_type: item.question_type,
        options,
        source_url: article.link ?? null,
        source_outlet: article.outlet ?? null,
        youtube_url: article.youtube_url ?? null,
        status: "pending",
      });
    }

    if (rows.length > 0) {
      const { error } = await supabase.from("poll_drafts").insert(rows);
      if (error) throw error;
    }

    return NextResponse.json({ count: rows.length });
  } catch (e) {
    console.error("AI drafts error:", e);
    return NextResponse.json({ error: "AI 생성 실패: " + String(e) }, { status: 500 });
  }
}
