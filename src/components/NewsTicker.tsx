const TICKER_ITEMS = [
  "속보: 국회 본회의 오늘 오후 2시 예산안 표결 예정",
  "여론조사: 차기 대선 지지율 오차범위 내 접전",
  "경제: 원·달러 환율 1,340원대 안착 흐름",
  "사회: 수도권 미세먼지 '나쁨' 단계 — 외출 자제 권고",
  "국제: G7 정상회의 AI 규제 공동선언 채택",
  "문화: 한국 영화 칸 영화제 경쟁 부문 진출",
  "스포츠: 프로야구 한화-LG 오늘 오후 6시 30분 개막전",
  "기술: 국내 반도체 수출 전월 대비 18% 증가",
  "환경: 한강 수질 조사 결과 '양호' 판정 — 수도권 수돗물 안전",
  "모두의 투표: 지금 가장 뜨거운 이슈에 당신의 목소리를 더하세요",
];

export default function NewsTicker() {
  const text = TICKER_ITEMS.join("   ◆   ");

  return (
    <div className="bg-[#0a0a0a] text-white overflow-hidden flex items-stretch text-xs">
      <div className="bg-red-700 px-3 py-1.5 font-black tracking-widest text-[10px] shrink-0 flex items-center uppercase">
        속보
      </div>
      <div className="flex-1 overflow-hidden relative py-1.5">
        <p
          className="whitespace-nowrap inline-block font-medium tracking-wide text-[#e8e0cc]"
          style={{ animation: "ticker-scroll 55s linear infinite" }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
