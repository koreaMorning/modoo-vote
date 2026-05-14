"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

async function getOrCreateFingerprint(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get("voter_id")?.value;
  if (existing) return existing;
  const newId = uuidv4();
  cookieStore.set("voter_id", newId, {
    maxAge: 60 * 60 * 24 * 365 * 5,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return newId;
}

export async function castVote(
  pollId: string,
  optionId: string
): Promise<{ success: boolean; error?: string }> {
  const fingerprint = await getOrCreateFingerprint();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("increment_vote", {
    p_poll_id: pollId,
    p_option_id: optionId,
    p_fingerprint: fingerprint,
  });

  if (error) {
    console.error("Vote error:", error);
    return { success: false, error: "server_error" };
  }

  const result = data as { success: boolean; error?: string };

  if (result.success) {
    // 투표자 쿠키 설정 (응답에서 쿠키 세팅은 Server Action 직접 지원 안됨 — 클라이언트에서 처리)
    revalidatePath(`/votes/${pollId}`);
    revalidatePath("/");
  }

  return result;
}

export async function submitOpinion(
  pollId: string,
  content: string,
  stance: string | null
): Promise<{ success: boolean; error?: string }> {
  const trimmed = content?.trim() ?? "";
  if (!trimmed || trimmed.length > 100) {
    return { success: false, error: "invalid" };
  }

  const fingerprint = await getOrCreateFingerprint();
  const supabase = await createClient();

  const { error } = await supabase.from("poll_opinions").insert({
    poll_id: pollId,
    content: trimmed,
    stance: stance || null,
    voter_fingerprint: fingerprint,
  });

  if (error) {
    console.error("Opinion error:", error);
    return { success: false, error: "server_error" };
  }

  revalidatePath(`/votes/${pollId}`);
  return { success: true };
}

export async function updateOpinion(
  id: string,
  content: string,
  pollId: string
): Promise<{ success: boolean; error?: string }> {
  const trimmed = content?.trim() ?? "";
  if (!trimmed || trimmed.length > 100) return { success: false, error: "invalid" };

  const fingerprint = await getOrCreateFingerprint();
  const supabase = await createClient();

  const { error } = await supabase
    .from("poll_opinions")
    .update({ content: trimmed })
    .eq("id", id)
    .eq("voter_fingerprint", fingerprint);

  if (error) {
    console.error("Update opinion error:", error);
    return { success: false, error: "server_error" };
  }

  revalidatePath(`/votes/${pollId}`);
  return { success: true };
}

export async function deleteOpinion(
  id: string,
  pollId: string
): Promise<{ success: boolean; error?: string }> {
  const fingerprint = await getOrCreateFingerprint();
  const supabase = await createClient();

  const { error } = await supabase
    .from("poll_opinions")
    .delete()
    .eq("id", id)
    .eq("voter_fingerprint", fingerprint);

  if (error) {
    console.error("Delete opinion error:", error);
    return { success: false, error: "server_error" };
  }

  revalidatePath(`/votes/${pollId}`);
  return { success: true };
}

export async function reactToOpinion(
  opinionId: string,
  reaction: "like" | "dislike",
  pollId: string
): Promise<{ success: boolean; newReaction: "like" | "dislike" | null; error?: string }> {
  const fingerprint = await getOrCreateFingerprint();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("toggle_opinion_reaction", {
    p_opinion_id: opinionId,
    p_fingerprint: fingerprint,
    p_reaction: reaction,
  });

  if (error) {
    console.error("React to opinion error:", error);
    return { success: false, newReaction: null, error: "server_error" };
  }

  revalidatePath(`/votes/${pollId}`);
  return { success: true, newReaction: (data as { reaction: string | null }).reaction as "like" | "dislike" | null };
}
