import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserService, UserProfile } from '../../core/services/user.service';
import { BookService } from '../../core/services/book.service';
import { ChatService, Conversation } from '../../core/services/chat.service';
import { PostService } from '../../core/services/post.service';
import { Post, BkinComment } from '../../models/post.model';
import { Book } from '../../models/book.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, RouterModule],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {

  // ── User state ─────────────────────────────────────────────────────────
  displayName        = '';
  currentUsername    = '';
  myProfilePicUrl    = '';
  showMobileMenu     = false;  // kept for future use; hamburger removed from navbar

  // ── Unread badge ───────────────────────────────────────────────────────
  personalConversations: Conversation[] = [];
  groupRoomUnreadCounts: { [room: string]: number } = {};

  // ── Posts feed ─────────────────────────────────────────────────────────
  posts: Post[] = [];
  isLoadingPosts = false;

  // ── Left sidebar: user search + suggested users ────────────────────────
  userSearchQuery   = '';
  userSearchResults: UserProfile[] = [];
  isSearchingUsers  = false;
  hasSearched       = false;   // true only after the search button/Enter was used
  suggestedUsers:    UserProfile[] = [];

  // ── Right sidebar: trending books ticker ──────────────────────────────
  trendingBooks: Book[] = [];

  // ── Create / Edit post modal ───────────────────────────────────────────
  showCreateModal  = false;
  newPostContent   = '';
  newPostImageUrl  = '';
  showEmojiPicker  = false;
  showImageInput   = false;
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
    private bookService: BookService,
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
    this.loadTrendingBooks();
    this.loadSuggestedUsers();
  }

  // ── Trending books + Suggested users ──────────────────────────────────

  loadTrendingBooks(): void {
    this.bookService.getTrendingBooks().subscribe({
      next: (books) => this.trendingBooks = books,
      error: () => {}
    });
  }

  loadSuggestedUsers(): void {
    this.userService.getSuggestedUsers().subscribe({
      next: (users) => this.suggestedUsers = users.filter(u => u.username !== this.currentUsername),
      error: () => {}
    });
  }

  searchUsers(): void {
    const q = this.userSearchQuery.trim();
    if (!q) { this.userSearchResults = []; this.hasSearched = false; return; }
    this.isSearchingUsers = true;
    this.hasSearched = true;
    this.userService.searchUsers(q).subscribe({
      next: (users) => { this.userSearchResults = users; this.isSearchingUsers = false; },
      error: () => { this.isSearchingUsers = false; }
    });
  }

  onSearchQueryChange(): void {
    // Reset the "has searched" flag so "No users found" doesn't flash while typing
    this.hasSearched = false;
    this.userSearchResults = [];
    if (this.userSearchQuery.trim() === '') this.clearUserSearch();
  }

  clearUserSearch(): void {
    this.userSearchQuery   = '';
    this.userSearchResults = [];
    this.hasSearched       = false;
  }

  get trendingBooksDouble(): Book[] {
    if (this.trendingBooks.length === 0) return [];
    return [...this.trendingBooks, ...this.trendingBooks];
  }

  connectWithUser(username: string): void {
    const roomId = 'dm_' + [this.currentUsername, username].sort().join('_');
    this.router.navigate(['/chat', roomId]);
  }

  goToBook(bookId: number): void {
    this.router.navigate(['/books', bookId]);
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
    this.showEmojiPicker  = false;
    this.showImageInput   = false;
  }

  closeCreateModal(): void { this.showCreateModal = false; }

  insertEmoji(emoji: string): void {
    this.newPostContent += emoji;
    this.showEmojiPicker = false;
  }

  submitPost(): void {
    if (!this.newPostContent.trim() || this.isCreatingPost) return;
    this.isCreatingPost = true;
    const imageUrl = this.newPostImageUrl.trim() || undefined;
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
    post.isEditing       = true;
    post.editContent     = post.content;
    post.editImageUrl    = '';
    post.editHasMedia    = !!post.imageUrl;
    post.editRemoveMedia = false;
  }

  cancelEdit(post: Post): void { post.isEditing = false; }

  saveEdit(post: Post): void {
    const content = (post.editContent ?? '').trim();
    if (!content) return;

    // Determine what to send for imageUrl:
    // • Remove requested        → null  (clear media)
    // • New file uploaded       → compressed base64 data URI
    // • New URL entered         → that URL
    // • Had media, no change    → undefined (omit, backend keeps existing)
    // • No media, nothing new   → null
    let imageUrl: string | null | undefined;
    if (post.editRemoveMedia) {
      imageUrl = null;
    } else if (post.editImageUrl?.trim()) {
      imageUrl = post.editImageUrl.trim();
    } else if (post.editHasMedia) {
      imageUrl = undefined;   // keep existing — backend won't touch it
    } else {
      imageUrl = null;
    }

    post.isSaving = true;
    this.postService.editPost(post.id, content, imageUrl).subscribe({
      next: (updated) => {
        const idx = this.posts.findIndex(p => p.id === post.id);
        if (idx !== -1) {
          this.posts[idx] = { ...updated, isEditing: false, showComments: post.showComments };
        }
      },
      error: () => { post.isSaving = false; }
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
