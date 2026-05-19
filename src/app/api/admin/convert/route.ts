import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다" }, { status: 503 });
  }

  const { title, description, link } = await req.json();
  if (!title) return NextResponse.json({ error: "기사 제목이 필요합니다" }, { status: 400 });

  const sourceNote = link ? `\n출처: ${link}` : "";

  const prompt = `다음 뉴스 기사를 여론 투표 게시글 형식으로 변환해주세요.

기사 제목: ${title}
기사 내용: ${description ?? ""}${sourceNote}

아래 JSON 형식으로만 응답해주세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "title": "투표 제목 (질문 형식, 30자 이내)",
  "description": "배경 설명",
  "options": ["선택지1", "선택지2"]
}

요구사항:
- 제목은 독자의 호기심을 자극하는 찬반 질문 형식, 30자 이내
- 설명은 10~15문장으로 작성하되 반드시 ①배경 ②핵심쟁점 ③찬성측 근거 ④반대측 근거 ⑤사회적 영향 순서로 서술, 중립적 논조 유지${link ? `, 마지막 문장에 "출처: ${link}" 포함` : ""}
- 선택지는 반드시 2개 고정, 단순 단어 금지, 기사의 핵심 쟁점을 반영한 구체적인 한 문장으로 작성 (예: "경제 성장을 위해 적극 추진해야 한다" vs "사회 불평등 심화 우려로 재검토해야 한다")
- 한국어로 작성`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
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
