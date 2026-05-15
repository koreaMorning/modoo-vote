export type Category =
  | "정치"
  | "경제"
  | "사회"
  | "문화"
  | "스포츠"
  | "국제"
  | "기술"
  | "환경";

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  is_active: boolean;
  is_breaking: boolean;
  ends_at: string | null;
  created_at: string;
  options?: Option[];
  total_votes?: number;
}

export interface Option {
  id: string;
  poll_id: string;
  text: string;
  votes_count: number;
  display_order: number;
}

export interface Opinion {
  id: string;
  poll_id: string;
  content: string;
  stance: "pro" | "con" | "neutral" | null;
  voter_fingerprint: string;
  created_at: string;
}

export interface Vote {
  id: string;
  poll_id: string;
  option_id: string;
  voter_fingerprint: string;
  created_at: string;
}
