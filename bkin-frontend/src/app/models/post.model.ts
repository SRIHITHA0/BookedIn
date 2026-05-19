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
  editImageUrl?: string;
}
