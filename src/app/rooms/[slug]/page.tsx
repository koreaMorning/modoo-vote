import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getRoomBySlug } from '@/lib/rooms';
import RoomClient from './RoomClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function RoomPage({ params }: Props) {
  const { slug } = await params;
  const room = getRoomBySlug(slug);
  if (!room) notFound();

  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <RoomClient room={room} />
      </main>
      <Footer />
    </div>
  );
}
