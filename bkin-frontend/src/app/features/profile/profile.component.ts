import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';

function noFutureDate(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const entered = new Date(control.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return entered > today ? { futureDate: true } : null;
}
import { RouterModule, Router } from '@angular/router';
import { UserService, UserProfile, ShelfItem } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { PostService } from '../../core/services/post.service';
import { Post, BkinComment } from '../../models/post.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, DatePipe],
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {

  profile:       UserProfile | null = null;
  profileForm:   FormGroup;
  isEditing      = false;
  isLoading      = true;
  isSaving       = false;
  saveSuccess    = false;
  errorMessage   = '';

  // ── My Posts ──────────────────────────────────────────────────────────
  myPosts: Post[] = [];

  booksRead        = 0;
  currentlyReading = 0;
  wantToRead       = 0;

  readonly availableGenres = [
    'Fiction', 'Mystery', 'Science Fiction', 'Fantasy',
    'Thriller', 'Romance', 'Non-Fiction', 'Biography', 'History', 'Self-Help'
  ];
  selectedInterests: string[] = [];

  readonly genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

  readonly countries = [
    'Afghanistan','Argentina','Australia','Austria','Bangladesh','Belgium','Brazil','Canada',
    'Chile','China','Colombia','Czech Republic','Denmark','Egypt','Ethiopia','Finland',
    'France','Germany','Ghana','Greece','Hungary','India','Indonesia','Iran','Iraq',
    'Ireland','Israel','Italy','Japan','Kenya','Malaysia','Mexico','Morocco','Netherlands',
    'New Zealand','Nigeria','Norway','Pakistan','Philippines','Poland','Portugal','Romania',
    'Russia','Saudi Arabia','Singapore','South Africa','South Korea','Spain','Sweden',
    'Switzerland','Tanzania','Thailand','Turkey','Uganda','Ukraine',
    'United Arab Emirates','United Kingdom','United States','Vietnam'
  ];

  readonly maxDob = new Date().toISOString().split('T')[0];

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private postService: PostService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      displayName:       ['', [Validators.required, Validators.maxLength(100)]],
      bio:               [''],
      profilePictureUrl: [''],
      dateOfBirth:       ['', noFutureDate],
      gender:            [''],
      country:           ['']
    });
  }

  ngOnInit(): void {
    this.userService.getMyProfile().subscribe({
      next: (p) => {
        this.profile = p;
        this.selectedInterests = [...p.interests];
        this.patchForm(p);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
    this.userService.getMyShelf().subscribe({
      next: (items: ShelfItem[]) => {
        this.booksRead        = items.filter(i => i.status === 'COMPLETED').length;
        this.currentlyReading = items.filter(i => i.status === 'READING').length;
        this.wantToRead       = items.filter(i => i.status === 'WANT_TO_READ').length;
      }
    });
    this.loadMyPosts();
  }

  loadMyPosts(): void {
    const username = this.authService.getUsername();
    this.postService.getUserPosts(username).subscribe({
      next: (posts) => this.myPosts = posts,
      error: () => {}
    });
  }

  patchForm(p: UserProfile): void {
    this.profileForm.patchValue({
      displayName:       p.displayName ?? '',
      bio:               p.bio ?? '',
      profilePictureUrl: p.profilePictureUrl ?? '',
      dateOfBirth:       p.dateOfBirth ?? '',
      gender:            p.gender ?? '',
      country:           p.country ?? ''
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.errorMessage = '';
    if (!this.isEditing && this.profile) this.patchForm(this.profile);
  }

  toggleInterest(genre: string): void {
    const idx = this.selectedInterests.indexOf(genre);
    idx === -1 ? this.selectedInterests.push(genre) : this.selectedInterests.splice(idx, 1);
  }

  isSelected(genre: string): boolean {
    return this.selectedInterests.includes(genre);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.isSaving = true;
    this.userService.updateProfile({
      ...this.profileForm.value,
      interests: this.selectedInterests
    }).subscribe({
      next: (p) => {
        this.profile = p;
        this.selectedInterests = [...p.interests];
        this.isSaving    = false;
        this.isEditing   = false;
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = err.error?.message || 'Failed to save profile.';
      }
    });
  }

  get readingProgressPct(): number {
    const total = this.booksRead + this.currentlyReading + this.wantToRead;
    if (total === 0) return 0;
    return Math.round((this.booksRead / total) * 100);
  }

  get avatarLetter(): string {
    return this.profile?.displayName ? this.profile.displayName.charAt(0).toUpperCase() : '?';
  }

  // ── Post actions ──────────────────────────────────────────────────────

  startEditPost(post: Post): void {
    post.isEditing   = true;
    post.editContent = post.content;
    post.editImageUrl = post.imageUrl ?? '';
  }

  cancelEditPost(post: Post): void { post.isEditing = false; }

  saveEditPost(post: Post): void {
    const content = (post.editContent ?? '').trim();
    if (!content) return;
    this.postService.editPost(post.id, content, post.editImageUrl || null).subscribe({
      next: (updated) => {
        const idx = this.myPosts.findIndex(p => p.id === post.id);
        if (idx !== -1) this.myPosts[idx] = { ...updated, isEditing: false, showComments: post.showComments };
      }
    });
  }

  deletePost(post: Post): void {
    if (!confirm('Delete this post?')) return;
    this.postService.deletePost(post.id).subscribe({
      next: () => { this.myPosts = this.myPosts.filter(p => p.id !== post.id); }
    });
  }

  toggleLike(post: Post): void {
    this.postService.toggleLike(post.id).subscribe({
      next: (res) => { post.likedByMe = res.liked; post.likeCount = res.likeCount; }
    });
  }

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
      next: () => { post.comments = post.comments.filter(c => c.id !== comment.id); post.commentCount--; }
    });
  }

  goToUserProfile(username: string): void {
    const me = this.authService.getUsername();
    if (username === me) return;
    this.router.navigate(['/users', username]);
  }

  postAvatarLetter(name: string): string { return name ? name.charAt(0).toUpperCase() : '?'; }

  timeAgo(dateStr: string): string {
    const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (sec < 60) return 'just now';
    const m = Math.floor(sec / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);   if (h < 24)  return `${h}h ago`;
    const d = Math.floor(h / 24);   if (d < 7)   return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  signOut(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goBack(): void { this.router.navigate(['/home']); }
}
