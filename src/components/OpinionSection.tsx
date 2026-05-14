import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import OpinionClient from "./OpinionClient";

interface Props {
  pollId: string;
  optionCount: number;
}

export default async function OpinionSection({ pollId, optionCount }: Props) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("poll_opinions")
    .select("id, content, stance, created_at, voter_fingerprint")
    .eq("poll_id", pollId)
    .order("created_at", { ascending: false })
    .limit(30);

  const opinions = (data ?? []) as {
    id: string;
    content: string;
    stance: "pro" | "con" | "neutral" | null;
    voter_fingerprint: string;
    created_at: string;
  }[];

  const cookieStore = await cookies();
  const currentFingerprint = cookieStore.get("voter_id")?.value ?? null;
  const isProscon = optionCount <= 2;

  return (
    <OpinionClient
      initialOpinions={opinions}
      currentFingerprint={currentFingerprint}
      pollId={pollId}
      isProscon={isProscon}
    />
  );
}
