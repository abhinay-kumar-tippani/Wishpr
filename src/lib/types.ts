export type RoomStatus = 'waiting' | 'active' | 'closed' | 'expired';

export interface Room {
  id: string;
  room_code: string;
  status: RoomStatus;
  created_at: string;
  closed_at: string | null;
  expires_at: string | null;
  created_by: string | null;
}

export interface Participant {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  is_creator: boolean;
  joined_at: string;
  last_seen_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface CreateRoomResult {
  room_id: string;
  room_code: string;
  status: RoomStatus;
}

export interface JoinRoomResult {
  room_id: string;
  room_code: string;
  status: RoomStatus;
  already_member: boolean;
}

export interface EndChatResult {
  success: boolean;
  status: RoomStatus;
  closed_at: string;
  expires_at: string;
}
