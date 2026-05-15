import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import { getRoomBySlug } from '@/lib/rooms';
import { createClient } from '@/lib/supabase/server';
import RoomClient from './RoomClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function RoomPage({ params }: Props) {
  const { slug } = await params;
  const room = getRoomBySlug(slug);
  if (!room) notFound();

  const supabase = await createClient();
  const { data: post } = await supabase
    .from('room_posts')
    .select('id, room_slug, title, content, updated_at')
    .eq('room_slug', slug)
    .maybeSingle();

  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pt-2 pb-4">
        <RoomClient room={room} post={post ?? null} />
      </main>
    </div>
  );
}
