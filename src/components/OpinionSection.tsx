import { createClient } from "@/lib/supabase/server";
import OpinionForm from "./OpinionForm";
import { ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react";
import { Opinion } from "@/types";

interface Props {
  pollId: string;
}

export default async function OpinionSection({ pollId }: Props) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("poll_opinions")
    .select("id, content, stance, created_at")
    .eq("poll_id", pollId)
    .order("created_at", { ascending: false })
    .limit(30);

  const opinions = (data ?? []) as Pick<Opinion, "id" | "content" | "stance" | "created_at">[];
  const proCount = opinions.filter((o) => o.stance === "pro").length;
  const conCount = opinions.filter((o) => o.stance === "con").length;

  return (
    <section className="mt-8">
      <div className="border-t-2 border-black pt-5 mb-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest">
            독자 의견
            <span className="ml-2 font-normal text-[#8c8070]">
              {opinions.length > 0 ? `${opinions.length}건` : ""}
            </span>
          </h2>
          {opinions.length > 0 && (
            <div className="flex gap-4 text-xs text-[#6b6356]">
              <span className="flex items-center gap-1">
                <ThumbsUp size={11} className="text-[#2a6828]" />
                찬성 {proCount}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsDown size={11} className="text-[#882020]" />
                반대 {conCount}
              </span>
            </div>
          )}
        </div>
      </div>

      <OpinionForm pollId={pollId} />

      {opinions.length > 0 ? (
        <ul className="mt-5 space-y-1.5">
          {opinions.map((opinion) => (
            <li
              key={opinion.id}
              className={`flex items-start gap-2.5 px-3 py-2.5 text-sm border-l-[3px] ${
                opinion.stance === "pro"
                  ? "border-[#3a8a30] bg-[#f0f8ee]"
                  : opinion.stance === "con"
                  ? "border-[#882020] bg-[#fdf0ee]"
                  : "border-[#b0a070] bg-[#faf5e8]"
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {opinion.stance === "pro" ? (
                  <ThumbsUp size={12} className="text-[#3a8a30]" />
                ) : opinion.stance === "con" ? (
                  <ThumbsDown size={12} className="text-[#882020]" />
                ) : (
                  <MessageCircle size={12} className="text-[#8c8070]" />
                )}
              </span>
              <span className="text-[#2d2520] leading-snug flex-1">{opinion.content}</span>
              <span className="text-[10px] text-[#a09070] shrink-0 tabular-nums">
                {new Date(opinion.created_at).toLocaleDateString("ko-KR", {
                  month: "numeric",
                  day: "numeric",
                })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-[#a09070] text-center py-6 border border-dashed border-[#c8bfa0] font-serif">
          첫 번째 의견을 남겨 주세요
        </p>
      )}
    </section>
  );
}
