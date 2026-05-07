export interface ChatMessage {
  content: string;
  type: string;
  senderUsername: string;
  senderDisplayName: string;
  senderProfilePictureUrl?: string | null;
  sentAt: string;
}
