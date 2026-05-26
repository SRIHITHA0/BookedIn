export interface BkinComment {
  id: number;
  authorUsername: string;
  authorDisplayName: string;
  authorProfilePicUrl: string | null;
  content: string;
  createdAt: string;
}

export interface Post {
  id: number;
  authorUsername: string;
  authorDisplayName: string;
  authorProfilePicUrl: string | null;
  content: string;
  imageUrl: string | null;
  mediaType?: 'image' | 'video' | null;   // from backend
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  comments: BkinComment[];
  // UI state (not from server)
  showComments?: boolean;
  newCommentText?: string;
  isSubmittingComment?: boolean;
  isEditing?: boolean;
  editContent?: string;
  editImageUrl?: string;      // new URL entered by user (empty = no change / keep existing)
  editHasMedia?: boolean;     // whether post had media when edit started
  editRemoveMedia?: boolean;  // user clicked "Remove media"
}
