export interface ChatMessage {
  id?: number;
  content: string;
  type: string;
  senderUsername: string;
  senderDisplayName: string;
  senderProfilePictureUrl?: string | null;
  sentAt: string;
  isRead?: boolean;
}
