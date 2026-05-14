import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다" }, { status: 503 });
  }

  const { title, description } = await req.json();
  if (!title) return NextResponse.json({ error: "기사 제목이 필요합니다" }, { status: 400 });

  const prompt = `다음 뉴스 기사를 여론 투표 게시글 형식으로 변환해주세요.

기사 제목: ${title}
기사 설명: ${description ?? ""}

아래 JSON 형식으로만 응답해주세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "title": "투표 제목 (질문 형식, 30자 이내)",
  "description": "배경 설명 (3~4문장, 중립적으로 상황 설명)",
  "options": ["선택지1", "선택지2", "선택지3"]
}

요구사항:
- 제목은 찬반 또는 선택을 유도하는 질문 형식
- 설명은 뉴스 맥락을 중립적으로 설명
- 선택지는 2~4개, 15자 이내
- 한국어로 작성`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON 파싱 실패");

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (e) {
    console.error("AI convert error:", e);
    return NextResponse.json({ error: "AI 변환 실패: " + String(e) }, { status: 500 });
  }
}
