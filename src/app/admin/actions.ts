"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { getNextPublishTime, formatPublishLabel } from "@/lib/publishing";

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
  youtube_url?: string;
  source_count?: number;
  is_main_article?: boolean;
  publish_at?: string;
  publish_status?: string;
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
      youtube_url: data.youtube_url?.trim() || null,
      source_count: data.source_count ?? 1,
      is_main_article: data.is_main_article ?? false,
      publish_status: data.publish_status ?? "published",
      publish_at: data.publish_at ?? new Date().toISOString(),
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
      ...(data.youtube_url !== undefined && { youtube_url: data.youtube_url?.trim() || null }),
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

export async function toggleBreaking(id: string, isBreaking: boolean): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("polls").update({ is_breaking: isBreaking }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function togglePinned(id: string, isPinned: boolean): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("polls").update({ is_pinned: isPinned }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function publishPollNow(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("polls")
    .update({ publish_at: new Date().toISOString(), publish_status: "published" })
    .eq("id", id)
    .select("id, publish_status, publish_at");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) return { success: false, error: "DB 업데이트 실패: 권한 오류 또는 존재하지 않는 게시글" };
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}

export async function updatePublishAt(id: string, publishAt: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const isPast = new Date(publishAt) <= new Date();
  const { error } = await supabase
    .from("polls")
    .update({ publish_at: publishAt, publish_status: isPast ? "published" : "scheduled" })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true };
}

/* ─────────────────── 토론방 게시글 ─────────────────── */

export interface RoomPost {
  id: string;
  room_slug: string;
  title: string;
  content: string;
  updated_at: string;
}

export interface RoomPostInput {
  room_slug: string;
  title: string;
  content: string;
}

export async function upsertRoomPost(data: RoomPostInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("room_posts")
    .upsert(
      { room_slug: data.room_slug, title: data.title.trim(), content: data.content.trim(), updated_at: new Date().toISOString() },
      { onConflict: "room_slug" }
    );
  if (error) return { success: false, error: error.message };
  revalidatePath(`/rooms/${data.room_slug}`);
  return { success: true };
}

export async function deleteRoomPost(roomSlug: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("room_posts").delete().eq("room_slug", roomSlug);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/rooms/${roomSlug}`);
  return { success: true };
}

export async function getRoomPosts(): Promise<RoomPost[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("room_posts").select("*").order("updated_at", { ascending: false });
  return (data ?? []) as RoomPost[];
}

/* ─────────────────── 토론방 카테고리 & 방 관리 ─────────────────── */

export interface CategoryInput { name: string; sort_order: number; }

export interface CategoryRow { id: string; name: string; sort_order: number; }

export interface RoomRow {
  id: string; category_id: string; title: string; description: string | null;
  slug: string; icon: string | null; post_title: string | null;
  post_content: string | null; post_updated_at: string | null;
  youtube_url: string | null; sort_order: number; created_at: string;
  stance_a: string | null; stance_b: string | null;
}

export interface RoomInput {
  category_id: string; title: string; description?: string;
  slug: string; icon?: string; sort_order?: number;
  post_title?: string; post_content?: string; youtube_url?: string;
  stance_a?: string; stance_b?: string;
}

export async function getCategoriesWithRooms(): Promise<(CategoryRow & { rooms: RoomRow[] })[]> {
  const supabase = await createClient();
  const [{ data: cats }, { data: rms }] = await Promise.all([
    supabase.from("room_categories").select("*").order("sort_order", { ascending: true }),
    supabase.from("rooms").select("*").order("created_at", { ascending: false }),
  ]);
  return (cats ?? []).map((cat) => ({
    ...cat,
    rooms: (rms ?? []).filter((r) => r.category_id === cat.id) as RoomRow[],
  }));
}

export async function createCategory(data: CategoryInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("room_categories").insert({ name: data.name.trim(), sort_order: data.sort_order });
  if (error) return { success: false, error: error.message };
  revalidatePath("/rooms");
  return { success: true };
}

export async function updateCategory(id: string, data: CategoryInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("room_categories").update({ name: data.name.trim(), sort_order: data.sort_order }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/rooms");
  return { success: true };
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("room_categories").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/rooms");
  return { success: true };
}

export async function createRoom(data: RoomInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const hasPost = !!(data.post_title?.trim() || data.post_content?.trim());
  const { error } = await supabase.from("rooms").insert({
    category_id: data.category_id,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    slug: data.slug.trim(),
    icon: data.icon?.trim() || "💬",
    sort_order: data.sort_order ?? 0,
    post_title: data.post_title?.trim() || null,
    post_content: data.post_content?.trim() || null,
    post_updated_at: hasPost ? new Date().toISOString() : null,
    youtube_url: data.youtube_url?.trim() || null,
    stance_a: data.stance_a?.trim() || "찬성",
    stance_b: data.stance_b?.trim() || "반대",
  });
  if (error) return { success: false, error: error.message };
  revalidatePath("/rooms");
  return { success: true };
}

export async function updateRoom(id: string, data: RoomInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const hasPost = !!(data.post_title?.trim() || data.post_content?.trim());
  const { error } = await supabase.from("rooms").update({
    category_id: data.category_id,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    slug: data.slug.trim(),
    icon: data.icon?.trim() || "💬",
    sort_order: data.sort_order ?? 0,
    post_title: data.post_title?.trim() || null,
    post_content: data.post_content?.trim() || null,
    post_updated_at: hasPost ? new Date().toISOString() : null,
    youtube_url: data.youtube_url?.trim() || null,
    stance_a: data.stance_a?.trim() || "찬성",
    stance_b: data.stance_b?.trim() || "반대",
  }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/rooms");
  revalidatePath(`/rooms/${data.slug}`);
  return { success: true };
}

export async function deleteRoom(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("rooms").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/rooms");
  return { success: true };
}

export async function getPolls() {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("polls")
    .select("id, title, category, is_active, is_breaking, is_pinned, is_main_article, source_count, publish_status, publish_at, created_at, ends_at, view_count, options(votes_count)")
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

export async function getCategoryQuotas(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("category_quotas").select("*");
  const result: Record<string, number> = {};
  (data ?? []).forEach((row: { category: string; target_count: number }) => {
    result[row.category] = row.target_count;
  });
  return result;
}

export async function upsertCategoryQuota(
  category: string,
  targetCount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("category_quotas")
    .upsert({ category, target_count: targetCount }, { onConflict: "category" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ─────────────────── AI 후보 초안 ─────────────────── */

export interface DraftRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  question_type: "binary" | "multiple" | "scale";
  options: string[];
  source_url: string | null;
  source_outlet: string | null;
  youtube_url: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
}

export async function getDrafts(status?: string): Promise<DraftRow[]> {
  const supabase = await createClient();
  const base = supabase.from("poll_drafts").select("*").order("created_at", { ascending: false });
  const { data } = await (status ? base.eq("status", status) : base);
  return (data ?? []).map((r) => ({ ...r, options: r.options ?? [] })) as DraftRow[];
}

export async function approveDraft(
  id: string
): Promise<{ success: boolean; error?: string; pollId?: string; publishAt?: string; publishLabel?: string }> {
  const supabase = await createClient();

  const { data: draft } = await supabase.from("poll_drafts").select("*").eq("id", id).single();
  if (!draft) return { success: false, error: "초안을 찾을 수 없습니다" };

  const sourceCount = draft.source_count ?? 1;
  const publishAt = getNextPublishTime().toISOString();
  const publishLabel = formatPublishLabel(publishAt);

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      title: draft.title,
      description: draft.description,
      category: draft.category,
      is_active: true,
      youtube_url: draft.youtube_url,
      source_count: sourceCount,
      is_main_article: sourceCount >= 2,
      publish_status: "scheduled",
      publish_at: publishAt,
    })
    .select("id")
    .single();

  if (pollError || !poll) return { success: false, error: pollError?.message ?? "투표 생성 실패" };

  const optionRows = (draft.options as string[]).map((text: string, i: number) => ({
    poll_id: poll.id,
    text,
    votes_count: 0,
    display_order: i,
  }));

  const { error: optError } = await supabase.from("options").insert(optionRows);
  if (optError) {
    await supabase.from("polls").delete().eq("id", poll.id);
    return { success: false, error: optError.message };
  }

  await supabase
    .from("poll_drafts")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/");
  return { success: true, pollId: poll.id, publishAt, publishLabel };
}

export async function rejectDraft(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("poll_drafts")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateDraft(
  id: string,
  data: Partial<Pick<DraftRow, "title" | "description" | "category" | "options">>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("poll_drafts").update(data).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteDraft(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("poll_drafts").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ─────────────────── 테마 ─────────────────── */

export interface ThemeRow {
  id: string;
  title: string;
  description: string | null;
  end_date: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ThemeInput {
  title: string;
  description?: string;
  end_date?: string;
  is_active?: boolean;
  sort_order?: number;
}

export async function getThemes(onlyActive = false): Promise<(ThemeRow & { poll_count: number })[]> {
  const supabase = await createClient();
  const q = supabase
    .from("themes")
    .select("*, theme_polls(count)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  const { data } = await (onlyActive ? q.eq("is_active", true) : q);
  return (data ?? []).map((t: ThemeRow & { theme_polls: { count: number }[] }) => ({
    ...t,
    poll_count: t.theme_polls?.[0]?.count ?? 0,
    theme_polls: undefined,
  }));
}

export async function createTheme(
  data: ThemeInput
): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("themes")
    .insert({
      title: data.title.trim(),
      description: data.description?.trim() || null,
      end_date: data.end_date || null,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order ?? 0,
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath("/themes");
  return { success: true, id: row.id };
}

export async function updateTheme(
  id: string,
  data: ThemeInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("themes")
    .update({
      title: data.title.trim(),
      description: data.description?.trim() || null,
      end_date: data.end_date || null,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order ?? 0,
    })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/themes");
  revalidatePath(`/themes/${id}`);
  return { success: true };
}

export async function deleteTheme(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("themes").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/themes");
  return { success: true };
}

export async function getThemeLinkedItems(
  id: string
): Promise<{ pollIds: string[]; roomSlugs: string[] }> {
  const supabase = await createClient();
  const [{ data: tPolls }, { data: tRooms }] = await Promise.all([
    supabase.from("theme_polls").select("poll_id").eq("theme_id", id),
    supabase.from("theme_rooms").select("room_slug").eq("theme_id", id),
  ]);
  return {
    pollIds: (tPolls ?? []).map((r: { poll_id: string }) => r.poll_id),
    roomSlugs: (tRooms ?? []).map((r: { room_slug: string }) => r.room_slug),
  };
}

export async function addThemePoll(
  themeId: string,
  pollId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("theme_polls")
    .upsert({ theme_id: themeId, poll_id: pollId });
  if (error) return { success: false, error: error.message };
  revalidatePath(`/themes/${themeId}`);
  return { success: true };
}

export async function removeThemePoll(
  themeId: string,
  pollId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("theme_polls")
    .delete()
    .eq("theme_id", themeId)
    .eq("poll_id", pollId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/themes/${themeId}`);
  return { success: true };
}

export async function addThemeRoom(
  themeId: string,
  roomSlug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("theme_rooms")
    .upsert({ theme_id: themeId, room_slug: roomSlug });
  if (error) return { success: false, error: error.message };
  revalidatePath(`/themes/${themeId}`);
  return { success: true };
}

export async function removeThemeRoom(
  themeId: string,
  roomSlug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("theme_rooms")
    .delete()
    .eq("theme_id", themeId)
    .eq("room_slug", roomSlug);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/themes/${themeId}`);
  return { success: true };
}
