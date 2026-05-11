import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { BookService, ReviewResponse } from '../../core/services/book.service';
import { AuthService } from '../../core/services/auth.service';
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
  isInShelf      = false;
  reviewSuccess  = false;
  hoverRating    = 0;
  stars          = [1, 2, 3, 4, 5];
  reviews:       ReviewResponse[] = [];
  currentUsername = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookService: BookService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const bookId = this.route.snapshot.paramMap.get('id');
    if (!bookId) { this.router.navigate(['/home']); return; }
    this.currentUsername = this.authService.getUsername();
    this.loadBook(+bookId);
    this.checkShelf(+bookId);
    this.loadReviews(+bookId);
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
    if (!this.book || this.userRating === 0) return;
    this.bookService.submitReview(this.book.id, this.userRating, this.userReview).subscribe({
      next: () => {
        this.userReview = '';
        this.reviewSuccess = true;
        setTimeout(() => this.reviewSuccess = false, 3000);
        this.loadReviews(this.book!.id);
      }
    });
  }

  scrollToReviewForm(): void {
    this.reviewFormSection?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  deleteReview(): void {
    if (!this.book) return;
    this.bookService.deleteReview(this.book.id).subscribe({
      next: () => {
        this.userRating = 0;
        this.userReview = '';
        this.loadReviews(this.book!.id);
      }
    });
  }

  connectWithUser(username: string): void {
    const me = this.currentUsername;
    const roomId = 'dm_' + [me, username].sort().join('_');
    this.router.navigate(['/chat', roomId]);
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
