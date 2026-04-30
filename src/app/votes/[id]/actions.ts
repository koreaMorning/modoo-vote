"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

async function getOrCreateFingerprint(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get("voter_id")?.value;
  if (existing) return existing;
  return uuidv4();
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
