export type Mood = "calm" | "happy" | "anxious" | "scared" | "confused" | "sad";

export interface UserResponse {
  id: number;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
  is_anonymous: boolean;
  is_vip: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface WechatLoginRequest {
  code: string;
}

export interface PhoneLoginRequest {
  phone: string;
  code: string;
}

export interface SendSmsRequest {
  phone: string;
}

export interface SendSmsResponse {
  message: string;
  debug_code?: string;
}

export interface UserUpdateRequest {
  nickname?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_anonymous?: boolean | null;
}

export interface DreamCreateRequest {
  content: string;
  dream_date: string;
  mood?: Mood | null;
  clarity?: number | null;
  is_lucid: boolean;
  is_public: boolean;
  is_anonymous: boolean;
}

export interface DreamUpdateRequest {
  content?: string | null;
  mood?: Mood | null;
  clarity?: number | null;
  is_public?: boolean | null;
  is_anonymous?: boolean | null;
}

export interface GenerateImageRequest {
  style: string;
}

export interface DreamTagResponse {
  tag: string;
}

export interface InterpretationResponse {
  psychology: string;
  symbolism: string;
  cultural: string;
  summary: string;
  advice: string | null;
  keywords: string[];
}

export interface DreamResponse {
  id: number;
  content: string;
  title: string | null;
  dream_date: string;
  mood: Mood | null;
  clarity: number | null;
  is_lucid: boolean;
  is_public: boolean;
  is_anonymous: boolean;
  image_url: string | null;
  image_style: string | null;
  share_card_url: string | null;
  like_count: number;
  comment_count: number;
  view_count: number;
  interpretation: InterpretationResponse | null;
  tags: DreamTagResponse[];
  created_at: string;
}

export interface DreamListResponse {
  items: DreamResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface DreamMatchResponse {
  dream: DreamResponse;
  similarity: number;
  match_reason: string | null;
}

export interface CommentCreateRequest {
  content: string;
  parent_id?: number | null;
}

export interface CommentResponse {
  id: number;
  content: string;
  user_nickname: string;
  user_avatar: string | null;
  parent_id: number | null;
  created_at: string;
}

export interface FeedItemResponse {
  id: number;
  title: string | null;
  content_preview: string;
  dream_date: string;
  mood: Mood | null;
  image_url: string | null;
  user_nickname: string;
  user_avatar: string | null;
  like_count: number;
  comment_count: number;
  tags: string[];
  is_liked: boolean;
  created_at: string;
}

export interface FeedResponse {
  items: FeedItemResponse[];
  total: number;
  page: number;
  page_size: number;
}
