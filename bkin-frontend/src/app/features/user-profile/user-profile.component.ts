import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { UserService, UserProfile } from '../../core/services/user.service';
import { PostService } from '../../core/services/post.service';
import { AuthService } from '../../core/services/auth.service';
import { Post, BkinComment } from '../../models/post.model';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-profile.component.html'
})
export class UserProfileComponent implements OnInit {

  profile: UserProfile | null = null;
  posts: Post[] = [];
  isLoading  = true;
  notFound   = false;
  currentUsername = '';
  currentDisplayName = '';
  myProfilePicUrl = '';

  get myAvatarLetter(): string {
    return this.currentDisplayName ? this.currentDisplayName.charAt(0).toUpperCase() : '?';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private postService: PostService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUsername    = this.authService.getUsername();
    this.currentDisplayName = this.authService.getDisplayName();
    this.userService.getMyProfile().subscribe({
      next: (p) => this.myProfilePicUrl = p.profilePictureUrl ?? ''
    });

    this.route.paramMap.subscribe(params => {
      const username = params.get('username') ?? '';
      this.isLoading = true;
      this.notFound  = false;
      this.profile   = null;
      this.posts     = [];

      // If viewing own profile, redirect to /profile
      if (username === this.currentUsername) {
        this.router.navigate(['/profile']);
        return;
      }

      this.userService.getProfile(username).subscribe({
        next: (p) => {
          this.profile = p;
          this.isLoading = false;
          this.loadPosts(username);
        },
        error: () => { this.isLoading = false; this.notFound = true; }
      });
    });
  }

  loadPosts(username: string): void {
    this.postService.getUserPosts(username).subscribe({
      next: (posts) => this.posts = posts,
      error: () => {}
    });
  }

  connectWithUser(): void {
    if (!this.profile) return;
    const roomId = 'dm_' + [this.currentUsername, this.profile.username].sort().join('_');
    this.router.navigate(['/chat', roomId]);
  }

  toggleLike(post: Post): void {
    this.postService.toggleLike(post.id).subscribe({
      next: (res) => {
        post.likedByMe = res.liked;
        post.likeCount = res.likeCount;
      }
    });
  }

  toggleComments(post: Post): void {
    post.showComments = !post.showComments;
    if (post.showComments && !post.newCommentText) post.newCommentText = '';
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

  goToUserProfile(username: string): void {
    if (username === this.currentUsername) { this.router.navigate(['/profile']); return; }
    this.router.navigate(['/users', username]);
  }

  avatarLetter(name: string): string { return name ? name.charAt(0).toUpperCase() : '?'; }

  timeAgo(dateStr: string): string {
    const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (sec < 60) return 'just now';
    const m = Math.floor(sec / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);   if (h < 24)  return `${h}h ago`;
    const d = Math.floor(h / 24);   if (d < 7)   return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  goBack(): void { window.history.back(); }
}
