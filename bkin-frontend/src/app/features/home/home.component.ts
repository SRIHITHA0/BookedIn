import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { ChatService, Conversation } from '../../core/services/chat.service';
import { PostService } from '../../core/services/post.service';
import { Post, BkinComment } from '../../models/post.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {

  // ── User state ─────────────────────────────────────────────────────────
  displayName        = '';
  currentUsername    = '';
  myProfilePicUrl    = '';
  showMobileMenu     = false;

  // ── Unread badge ───────────────────────────────────────────────────────
  personalConversations: Conversation[] = [];
  groupRoomUnreadCounts: { [room: string]: number } = {};

  // ── Posts feed ─────────────────────────────────────────────────────────
  posts: Post[] = [];
  isLoadingPosts = false;

  // ── Create / Edit post modal ───────────────────────────────────────────
  showCreateModal  = false;
  newPostContent   = '';
  newPostImageUrl  = '';
  newPostImageData = '';   // base64 data URI from file upload
  showEmojiPicker  = false;
  showImageInput   = false;
  imageInputMode: 'url' | 'upload' = 'url';
  isCreatingPost   = false;

  @ViewChild('postTextarea') postTextarea!: ElementRef<HTMLTextAreaElement>;

  readonly emojis = [
    '😀','😂','😍','🥰','😎','🤔','😢','😡','🤩','🥳',
    '👍','👎','❤️','🔥','✨','🎉','📚','📖','✍️','💡',
    '🌟','💯','🙌','👏','🤝','😊','💬','📝','🎭','🫂'
  ];

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private chatService: ChatService,
    private postService: PostService,
    private router: Router
  ) {}

  get myAvatarLetter(): string {
    return this.displayName ? this.displayName.charAt(0).toUpperCase() : '?';
  }

  get totalUnreadMessages(): number {
    const dm    = this.personalConversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0);
    const group = Object.values(this.groupRoomUnreadCounts).reduce((s, n) => s + n, 0);
    return dm + group;
  }

  ngOnInit(): void {
    this.displayName     = this.authService.getDisplayName();
    this.currentUsername = this.authService.getUsername();
    this.userService.getMyProfile().subscribe({
      next: (p) => this.myProfilePicUrl = p.profilePictureUrl ?? ''
    });
    this.loadFeed();
    this.loadPersonalChats();
    this.loadGroupUnreadCounts();
  }

  // ── Feed ───────────────────────────────────────────────────────────────

  loadFeed(): void {
    this.isLoadingPosts = true;
    this.postService.getFeed().subscribe({
      next: (posts) => { this.posts = posts; this.isLoadingPosts = false; },
      error: () => { this.isLoadingPosts = false; }
    });
  }

  // ── Create post ────────────────────────────────────────────────────────

  openCreateModal(): void {
    this.showCreateModal  = true;
    this.newPostContent   = '';
    this.newPostImageUrl  = '';
    this.newPostImageData = '';
    this.showEmojiPicker  = false;
    this.showImageInput   = false;
    this.imageInputMode   = 'url';
  }

  closeCreateModal(): void { this.showCreateModal = false; }

  insertEmoji(emoji: string): void {
    this.newPostContent += emoji;
    this.showEmojiPicker = false;
  }

  onImageFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => { this.newPostImageData = reader.result as string; };
    reader.readAsDataURL(file);
  }

  get resolvedNewPostImage(): string {
    return this.imageInputMode === 'upload' ? this.newPostImageData : this.newPostImageUrl;
  }

  submitPost(): void {
    if (!this.newPostContent.trim() || this.isCreatingPost) return;
    this.isCreatingPost = true;
    const imageUrl = this.resolvedNewPostImage || undefined;
    this.postService.createPost(this.newPostContent.trim(), imageUrl).subscribe({
      next: (post) => {
        this.posts = [post, ...this.posts];
        this.isCreatingPost   = false;
        this.showCreateModal  = false;
      },
      error: () => { this.isCreatingPost = false; }
    });
  }

  // ── Edit post ──────────────────────────────────────────────────────────

  startEdit(post: Post): void {
    post.isEditing   = true;
    post.editContent = post.content;
    post.editImageUrl = post.imageUrl ?? '';
  }

  cancelEdit(post: Post): void { post.isEditing = false; }

  saveEdit(post: Post): void {
    const content = (post.editContent ?? '').trim();
    if (!content) return;
    this.postService.editPost(post.id, content, post.editImageUrl || null).subscribe({
      next: (updated) => {
        const idx = this.posts.findIndex(p => p.id === post.id);
        if (idx !== -1) {
          this.posts[idx] = { ...updated, isEditing: false, showComments: post.showComments };
        }
      }
    });
  }

  // ── Delete post ────────────────────────────────────────────────────────

  deletePost(post: Post): void {
    if (!confirm('Delete this post?')) return;
    this.postService.deletePost(post.id).subscribe({
      next: () => { this.posts = this.posts.filter(p => p.id !== post.id); }
    });
  }

  // ── Like ───────────────────────────────────────────────────────────────

  toggleLike(post: Post): void {
    this.postService.toggleLike(post.id).subscribe({
      next: (res) => { post.likedByMe = res.liked; post.likeCount = res.likeCount; }
    });
  }

  // ── Comments ───────────────────────────────────────────────────────────

  toggleComments(post: Post): void {
    post.showComments = !post.showComments;
    if (post.showComments && post.newCommentText === undefined) post.newCommentText = '';
  }

  submitComment(post: Post): void {
    const text = (post.newCommentText ?? '').trim();
    if (!text || post.isSubmittingComment) return;
    post.isSubmittingComment = true;
    this.postService.addComment(post.id, text).subscribe({
      next: (comment) => {
        post.comments = [...post.comments, comment];
        post.commentCount++;
        post.newCommentText = '';
        post.isSubmittingComment = false;
      },
      error: () => { post.isSubmittingComment = false; }
    });
  }

  deleteComment(post: Post, comment: BkinComment): void {
    this.postService.deleteComment(post.id, comment.id).subscribe({
      next: () => {
        post.comments = post.comments.filter(c => c.id !== comment.id);
        post.commentCount--;
      }
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  goToUserProfile(username: string): void {
    if (username === this.currentUsername) { this.router.navigate(['/profile']); return; }
    this.router.navigate(['/users', username]);
  }

  goToChat(): void {
    this.showMobileMenu = false;
    this.router.navigate(['/chat', 'general']);
  }

  // ── Unread badge helpers ───────────────────────────────────────────────

  loadPersonalChats(): void {
    this.chatService.getPersonalConversations().subscribe({
      next: (convs) => this.personalConversations = convs,
      error: () => {}
    });
  }

  loadGroupUnreadCounts(): void {
    this.chatService.getGroupUnreadCounts().subscribe({
      next: (counts) => this.groupRoomUnreadCounts = counts,
      error: () => {}
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  avatarLetter(name: string): string { return name ? name.charAt(0).toUpperCase() : '?'; }

  timeAgo(dateStr: string): string {
    const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (sec < 60) return 'just now';
    const m = Math.floor(sec / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);   if (h < 24)  return `${h}h ago`;
    const d = Math.floor(h / 24);   if (d < 7)   return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
