import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VoteCard from "@/components/VoteCard";
import Link from "next/link";
import { Poll } from "@/types";
import { MessageSquare } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("themes").select("title").eq("id", id).maybeSingle();
  return { title: data ? `${data.title} 특집 - 모두의 투표` : "특집 테마" };
}

/* is_active가 종료 여부의 기준. end_date는 D-day 표시용만 */
function ddayFull(
  endDate: string | null,
  isActive: boolean
): { label: string; sub: string; urgent: boolean } {
  if (!isActive) return { label: "종료", sub: "종료된 특집입니다", urgent: false };
  if (!endDate) return { label: "상시 진행", sub: "", urgent: false };
  const diff = Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return { label: "진행 중", sub: "", urgent: false };
  if (diff === 0) return { label: "D-DAY", sub: "오늘 마감", urgent: true };
  return {
    label: `D-${diff}`,
    sub: `${new Date(endDate).toLocaleDateString("ko-KR")} 마감`,
    urgent: diff <= 3,
  };
}

export default async function ThemeDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: theme } = await supabase
    .from("themes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!theme) notFound();

  const isEnded = !theme.is_active;

  const [{ data: tPolls }, { data: tRooms }] = await Promise.all([
    supabase.from("theme_polls").select("poll_id").eq("theme_id", id),
    supabase.from("theme_rooms").select("room_slug").eq("theme_id", id),
  ]);

  const pollIds = (tPolls ?? []).map((r: { poll_id: string }) => r.poll_id);
  const roomSlugs = (tRooms ?? []).map((r: { room_slug: string }) => r.room_slug);

  const now = new Date().toISOString();
  const [pollsResult, roomsResult] = await Promise.all([
    pollIds.length > 0
      ? supabase
          .from("polls")
          .select("*, options(votes_count)")
          .in("id", pollIds)
          .eq("is_active", true)
          .or(`is_breaking.eq.true,publish_at.is.null,publish_at.lte.${now}`)
      : Promise.resolve({ data: [] }),
    roomSlugs.length > 0
      ? supabase
          .from("rooms")
          .select("id, title, slug, icon, description, stance_a, stance_b")
          .in("slug", roomSlugs)
      : Promise.resolve({ data: [] }),
  ]);

  const polls: Poll[] = (pollsResult.data ?? []).map((p) => ({
    ...p,
    options: undefined,
    total_votes: (p.options ?? []).reduce(
      (sum: number, o: { votes_count: number }) => sum + o.votes_count,
      0
    ),
  }));

  const rooms = roomsResult.data ?? [];

  const cookieStore = await cookies();
  const fingerprint = cookieStore.get("voter_id")?.value ?? null;
  const votedPollIds = new Set<string>();
  if (fingerprint && polls.length > 0) {
    const { data: voteRecords } = await supabase
      .from("votes")
      .select("poll_id")
      .eq("voter_fingerprint", fingerprint)
      .in("poll_id", polls.map((p) => p.id));
    (voteRecords ?? []).forEach((r: { poll_id: string }) => votedPollIds.add(r.poll_id));
  }

  const { label, sub, urgent } = ddayFull(theme.end_date, theme.is_active);

  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">

        {/* 종료된 특집 알림 바 */}
        {isEnded && (
          <div className="bg-[#f0ede8] border border-[#c8bfa8] border-b-0 px-5 py-2 flex items-center gap-3">
            <span className="text-[10px] font-black tracking-[0.3em] uppercase bg-[#c8bfa8] text-[#6b6356] px-2 py-0.5">
              아카이브
            </span>
            <span className="text-xs text-[#8c8070]">
              이 특집은 종료되었습니다. 결과 데이터는 그대로 보존됩니다.
            </span>
          </div>
        )}

        {/* 특집 배너 */}
        <div className="mb-10">
          <div
            className={`text-[#f0e5c0] px-5 py-2 flex items-center justify-between ${
              isEnded ? "bg-[#6b6356]" : "bg-[#1c1712]"
            }`}
          >
            <span className="text-[10px] font-black tracking-[0.5em] uppercase">
              {isEnded ? "Archived Feature · 아카이브" : "Special Feature · 특집"}
            </span>
            <Link
              href="/themes"
              className="text-[10px] text-[#c8bfa8] hover:text-white transition-colors"
            >
              ← 전체 특집
            </Link>
          </div>

          <div
            className={`border-l-[6px] pl-5 py-4 border-b-2 ${
              isEnded
                ? "border-l-[#c8bfa8] border-b-[#c8bfa8] bg-[#f7f5f2]"
                : "border-l-[#1c1712] border-b-[#1c1712]"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                {isEnded && (
                  <span className="inline-block text-[10px] font-black tracking-widest uppercase bg-[#c8bfa8] text-[#6b6356] px-2 py-0.5 mb-2">
                    종료된 특집
                  </span>
                )}
                <h1
                  className={`text-4xl sm:text-5xl font-black font-serif leading-tight mb-2 ${
                    isEnded ? "text-[#6b6356]" : "text-[#1c1712]"
                  }`}
                >
                  {theme.title}
                </h1>
                {theme.description && (
                  <p
                    className={`text-[13px] font-serif leading-relaxed max-w-2xl ${
                      isEnded ? "text-[#9c9088]" : "text-[#3d3326]"
                    }`}
                  >
                    {theme.description}
                  </p>
                )}
              </div>

              {/* D-day / 종료 카운터 */}
              <div
                className={`shrink-0 text-center border-2 px-5 py-3 min-w-[90px] ${
                  isEnded ? "border-[#c8bfa8] bg-[#f0ede8]" : "border-[#1c1712]"
                }`}
              >
                <div
                  className={`text-3xl font-black font-serif leading-none mb-0.5 ${
                    isEnded
                      ? "text-[#6b6356]"
                      : urgent
                      ? "text-[#c0100a]"
                      : "text-[#1c1712]"
                  }`}
                >
                  {label}
                </div>
                {sub && (
                  <div className="text-[9px] text-[#8c8070] tracking-wide">{sub}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 관련 투표 게시글 */}
        {polls.length > 0 && (
          <section className="mb-10">
            <div className="border-t-[3px] border-[#1c1712] flex items-center mb-0">
              <span className="text-[11px] font-black tracking-[0.3em] uppercase bg-[#1c1712] text-white px-2.5 py-1 leading-none">
                관련 투표
              </span>
              <div className="flex-1 border-b border-[#c8bfa8] self-end" />
              <span className="text-[10px] text-[#8c8070] ml-2">{polls.length}개</span>
            </div>

            <div className="border border-t-0 border-[#c8bfa8]">
              <div className={polls.length > 1 ? "border-b border-[#c8bfa8]" : ""}>
                <VoteCard
                  poll={polls[0]}
                  size="headline"
                  voted={votedPollIds.has(polls[0].id)}
                />
              </div>

              {polls.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-l border-t border-[#c8bfa8]">
                  {polls.slice(1).map((poll) => (
                    <div key={poll.id} className="border-r border-b border-[#c8bfa8]">
                      <VoteCard
                        poll={poll}
                        size="medium"
                        voted={votedPollIds.has(poll.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 관련 토론방 */}
        {rooms.length > 0 && (
          <section>
            <div className="border-t-[3px] border-[#1c1712] flex items-center mb-0">
              <span className="text-[11px] font-black tracking-[0.3em] uppercase bg-[#1c1712] text-white px-2.5 py-1 leading-none">
                관련 토론방
              </span>
              <div className="flex-1 border-b border-[#c8bfa8] self-end" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border border-t-0 border-[#c8bfa8]">
              {(rooms as {
                id: string; title: string; slug: string;
                icon: string | null; description: string | null;
                stance_a: string | null; stance_b: string | null;
              }[]).map((room, i) => (
                <Link
                  key={room.slug}
                  href={`/rooms/${room.slug}`}
                  className={[
                    "group block p-5 hover:bg-[#fdf8f0] transition-colors",
                    i % 3 > 0 ? "border-l border-[#c8bfa8]" : "",
                    i >= 3 ? "border-t border-[#c8bfa8]" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{room.icon ?? "💬"}</span>
                    <MessageSquare size={12} className="text-[#c8bfa8]" />
                  </div>
                  <h3 className="text-sm font-black font-serif group-hover:underline leading-snug mb-1">
                    {room.title}
                  </h3>
                  {room.description && (
                    <p className="text-[11px] text-[#6b6356] leading-snug line-clamp-2 mb-2">
                      {room.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-[#8c8070]">
                    <span className="text-[#1a5c75] font-bold">▲ {room.stance_a ?? "찬성"}</span>
                    <span className="text-[#c4788a] font-bold">▼ {room.stance_b ?? "반대"}</span>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-[#1c1712] uppercase tracking-wide">
                    입장하기 →
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {polls.length === 0 && rooms.length === 0 && (
          <div className="text-center py-16 text-[#a09080] border-2 border-dashed border-[#c8bfa8]">
            <p className="text-lg font-serif">연결된 콘텐츠가 없습니다</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
