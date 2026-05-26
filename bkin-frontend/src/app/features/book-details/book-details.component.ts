import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { BookService, ReviewResponse } from '../../core/services/book.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { Book } from '../../models/book.model';

@Component({
  selector: 'app-book-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DecimalPipe, DatePipe],
  templateUrl: './book-details.component.html'
})
export class BookDetailsComponent implements OnInit {

  @ViewChild('reviewFormSection') reviewFormSection!: ElementRef;

  book:          Book | null = null;
  isLoading      = false;
  userRating     = 0;
  userReview     = '';
  readingStatus  = '';
  isInShelf          = false;
  reviewSuccess      = false;
  isSubmittingReview = false;
  isDeletingReview   = false;
  hoverRating        = 0;
  stars          = [1, 2, 3, 4, 5];
  reviews:       ReviewResponse[] = [];
  currentUsername = '';
  myProfilePicUrl = '';

  get myAvatarLetter(): string {
    const name = this.authService.getDisplayName();
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookService: BookService,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const bookId = this.route.snapshot.paramMap.get('id');
    if (!bookId) { this.router.navigate(['/home']); return; }
    this.currentUsername = this.authService.getUsername();
    this.loadBook(+bookId);
    this.checkShelf(+bookId);
    this.loadReviews(+bookId);
    this.userService.getMyProfile().subscribe({
      next: (p) => this.myProfilePicUrl = p.profilePictureUrl ?? ''
    });
  }

  loadBook(id: number): void {
    this.isLoading = true;
    this.bookService.getBookById(id).subscribe({
      next: (book) => { this.book = book; this.isLoading = false; },
      error: () => this.router.navigate(['/home'])
    });
  }

  checkShelf(id: number): void {
    this.bookService.getUserBookStatus(id).subscribe({
      next: (status) => {
        if (status) {
          this.isInShelf    = true;
          this.readingStatus = status.status;
          this.userRating   = status.rating ?? 0;
          this.userReview   = status.review ?? '';
        } else {
          this.isInShelf = false;
        }
      }
      // No error handler needed — 404 is caught by catchError in book.service.ts
    });
  }

  loadReviews(id: number): void {
    this.bookService.getBookReviews(id).subscribe({
      next: (reviews) => this.reviews = reviews,
      error: () => {}
    });
  }

  addToShelf(status: string): void {
    if (!this.book) return;
    this.bookService.addToShelf(this.book.id, status).subscribe({
      next: () => { this.isInShelf = true; this.readingStatus = status; }
    });
  }

  setRating(rating: number): void  { this.userRating = rating; }
  setHover(rating: number): void   { this.hoverRating = rating; }
  clearHover(): void               { this.hoverRating = 0; }

  submitReview(): void {
    if (!this.book || this.userRating === 0 || this.isSubmittingReview) return;
    this.isSubmittingReview = true;
    this.reviewSuccess = false;
    this.bookService.submitReview(this.book.id, this.userRating, this.userReview).subscribe({
      next: () => {
        this.isSubmittingReview = false;
        this.userReview = '';
        this.reviewSuccess = true;
        setTimeout(() => this.reviewSuccess = false, 5000);
        this.loadReviews(this.book!.id);
      },
      error: () => { this.isSubmittingReview = false; }
    });
  }

  scrollToReviewForm(): void {
    this.reviewFormSection?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  deleteReview(): void {
    if (!this.book || this.isDeletingReview) return;
    this.isDeletingReview = true;
    this.bookService.deleteReview(this.book.id).subscribe({
      next: () => {
        this.userRating = 0;
        this.userReview = '';
        this.isDeletingReview = false;
        this.loadReviews(this.book!.id);
      },
      error: () => { this.isDeletingReview = false; }
    });
  }

  connectWithUser(username: string): void {
    const me = this.currentUsername;
    const roomId = 'dm_' + [me, username].sort().join('_');
    this.router.navigate(['/chat', roomId]);
  }

  goToUserProfile(username: string): void {
    if (username === this.currentUsername) { this.router.navigate(['/profile']); return; }
    this.router.navigate(['/users', username]);
  }

  avatarLetter(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  goBack(): void { this.router.navigate(['/home']); }

  getShelfLabel(status: string): string {
    const labels: Record<string, string> = {
      WANT_TO_READ: 'Want to Read',
      READING: 'Reading',
      COMPLETED: 'Completed'
    };
    return labels[status] ?? status;
  }
}
