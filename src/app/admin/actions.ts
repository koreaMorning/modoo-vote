"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function getSessionToken() {
  const pw = process.env.ADMIN_PASSWORD ?? "";
  return Buffer.from(pw).toString("base64");
}

export async function loginAdmin(password: string): Promise<{ success: boolean; error?: string }> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { success: false, error: "서버 설정 오류" };
  if (password !== expected) return { success: false, error: "비밀번호가 틀렸습니다" };

  const cookieStore = await cookies();
  cookieStore.set("admin_token", getSessionToken(), {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return { success: true };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
  redirect("/admin");
}

export async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token === getSessionToken();
}

export interface PollInput {
  title: string;
  description: string;
  category: string;
  options: string[];
  ends_at?: string;
}

export async function createPoll(data: PollInput): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = await createClient();

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      title: data.title.trim(),
      description: data.description.trim() || null,
      category: data.category,
      is_active: true,
      ends_at: data.ends_at || null,
    })
    .select("id")
    .single();

  if (pollError || !poll) {
    console.error("Poll create error:", pollError);
    return { success: false, error: "게시글 생성 실패: " + (pollError?.message ?? "unknown") };
  }

  const optionRows = data.options
    .map((text, i) => ({ poll_id: poll.id, text: text.trim(), votes_count: 0, display_order: i }))
    .filter((o) => o.text.length > 0);

  const { error: optError } = await supabase.from("options").insert(optionRows);
  if (optError) {
    console.error("Options create error:", optError);
    await supabase.from("polls").delete().eq("id", poll.id);
    return { success: false, error: "선택지 생성 실패: " + optError.message };
  }

  revalidatePath("/");
  return { success: true, id: poll.id };
}

export async function updatePoll(
  id: string,
  data: Partial<PollInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("polls")
    .update({
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.description !== undefined && { description: data.description.trim() || null }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.ends_at !== undefined && { ends_at: data.ends_at || null }),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  revalidatePath(`/votes/${id}`);
  return { success: true };
}

export async function togglePollActive(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("polls").update({ is_active: isActive }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  revalidatePath(`/votes/${id}`);
  return { success: true };
}

export async function getPolls() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("polls")
    .select("id, title, category, is_active, created_at, ends_at, options(votes_count)")
    .order("created_at", { ascending: false });

  if (error) return [];

  return (data ?? []).map((p) => ({
    ...p,
    total_votes: ((p.options ?? []) as { votes_count: number }[]).reduce(
      (sum, o) => sum + o.votes_count,
      0
    ),
    options: undefined,
  }));
}
