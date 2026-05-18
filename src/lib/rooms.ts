export interface Room {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  slug: string;
  icon: string | null;
  post_title: string | null;
  post_content: string | null;
  post_updated_at: string | null;
  youtube_url: string | null;
  sort_order: number;
  created_at: string;
  stance_a: string | null;
  stance_b: string | null;
}

export interface RoomCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface RoomCategoryWithRooms extends RoomCategory {
  rooms: Room[];
}
