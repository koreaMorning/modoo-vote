import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import OpinionClient from "./OpinionClient";

interface Props {
  pollId: string;
  optionCount: number;
}

export default async function OpinionSection({ pollId, optionCount }: Props) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const currentFingerprint = cookieStore.get("voter_id")?.value ?? null;

  const { data } = await supabase
    .from("poll_opinions")
    .select("id, content, stance, created_at, voter_fingerprint, likes_count, dislikes_count, nickname")
    .eq("poll_id", pollId)
    .order("likes_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);

  const opinions = (data ?? []) as {
    id: string;
    content: string;
    stance: "pro" | "con" | "neutral" | null;
    voter_fingerprint: string;
    created_at: string;
    likes_count: number;
    dislikes_count: number;
    nickname: string;
  }[];

  let myReactions: Record<string, "like" | "dislike"> = {};
  if (currentFingerprint && opinions.length > 0) {
    const { data: reactData } = await supabase
      .from("opinion_reactions")
      .select("opinion_id, reaction")
      .eq("voter_fingerprint", currentFingerprint)
      .in("opinion_id", opinions.map((o) => o.id));

    myReactions = Object.fromEntries(
      (reactData ?? []).map((r) => [r.opinion_id, r.reaction as "like" | "dislike"])
    );
  }

  return (
    <OpinionClient
      initialOpinions={opinions}
      initialMyReactions={myReactions}
      currentFingerprint={currentFingerprint}
      pollId={pollId}
      isProscon={optionCount <= 2}
    />
  );
}
