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

export async function incrementViewCount(pollId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("increment_poll_view_count", { poll_id_param: pollId });
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
  stance: string | null,
  nickname: string
): Promise<{ success: boolean; error?: string; opinion?: Record<string, unknown> | null }> {
  const trimmed = content?.trim() ?? "";
  if (!trimmed || trimmed.length > 100) {
    return { success: false, error: "invalid" };
  }

  const fingerprint = await getOrCreateFingerprint();
  const supabase = await createClient();

  const nickTrimmed = nickname.trim() || "익명";
  let { error } = await supabase.from("poll_opinions").insert({
    poll_id: pollId,
    content: trimmed,
    stance: stance || null,
    voter_fingerprint: fingerprint,
    nickname: nickTrimmed,
  });

  if (error) {
    const fallback = await supabase.from("poll_opinions").insert({
      poll_id: pollId,
      content: trimmed,
      stance: stance || null,
      voter_fingerprint: fingerprint,
    });
    error = fallback.error;
  }

  if (error) {
    console.error("Opinion error:", error);
    return { success: false, error: "server_error" };
  }

  // 방금 삽입된 의견을 반환해서 클라이언트가 router.refresh() 없이 상태 갱신 가능하게 함
  const { data: created } = await supabase
    .from("poll_opinions")
    .select("id, content, stance, voter_fingerprint, created_at, likes_count, dislikes_count, nickname")
    .eq("poll_id", pollId)
    .eq("voter_fingerprint", fingerprint)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  revalidatePath(`/votes/${pollId}`);
  return { success: true, opinion: created };
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

  // RPC 시도 (toggle_opinion_reaction 함수가 있으면 원자적으로 처리)
  const { data: rpcData, error: rpcError } = await supabase.rpc("toggle_opinion_reaction", {
    p_opinion_id: opinionId,
    p_fingerprint: fingerprint,
    p_reaction: reaction,
  });

  if (!rpcError) {
    return {
      success: true,
      newReaction: (rpcData as { reaction: string | null }).reaction as "like" | "dislike" | null,
    };
  }

  // RPC 없을 경우 직접 테이블 연산으로 폴백
  try {
    const { data: existing } = await supabase
      .from("opinion_reactions")
      .select("id, reaction")
      .eq("opinion_id", opinionId)
      .eq("voter_fingerprint", fingerprint)
      .maybeSingle();

    const prevReaction = (existing?.reaction ?? null) as "like" | "dislike" | null;
    let newReaction: "like" | "dislike" | null;
    let likeDelta = 0;
    let dislikeDelta = 0;

    if (prevReaction === reaction) {
      if (existing) await supabase.from("opinion_reactions").delete().eq("id", existing.id);
      if (reaction === "like") likeDelta = -1; else dislikeDelta = -1;
      newReaction = null;
    } else if (prevReaction !== null) {
      if (existing) await supabase.from("opinion_reactions").update({ reaction }).eq("id", existing.id);
      if (reaction === "like") { likeDelta = 1; dislikeDelta = -1; } else { likeDelta = -1; dislikeDelta = 1; }
      newReaction = reaction;
    } else {
      await supabase.from("opinion_reactions").insert({
        opinion_id: opinionId,
        voter_fingerprint: fingerprint,
        reaction,
      });
      if (reaction === "like") likeDelta = 1; else dislikeDelta = 1;
      newReaction = reaction;
    }

    // likes_count / dislikes_count 직접 업데이트
    if (likeDelta !== 0 || dislikeDelta !== 0) {
      const { data: op } = await supabase
        .from("poll_opinions")
        .select("likes_count, dislikes_count")
        .eq("id", opinionId)
        .single();

      await supabase
        .from("poll_opinions")
        .update({
          likes_count: Math.max(0, (op?.likes_count ?? 0) + likeDelta),
          dislikes_count: Math.max(0, (op?.dislikes_count ?? 0) + dislikeDelta),
        })
        .eq("id", opinionId);
    }

    return { success: true, newReaction };
  } catch (err) {
    console.error("React to opinion fallback error:", err);
    return { success: false, newReaction: null, error: "server_error" };
  }
}
