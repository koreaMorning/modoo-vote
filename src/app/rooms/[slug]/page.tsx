import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import RoomClient from "./RoomClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function RoomPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!room) notFound();

  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pt-2">
        <RoomClient room={room} />
      </main>
    </div>
  );
}
