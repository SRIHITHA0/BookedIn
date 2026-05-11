import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Book, Genre, UserBookStatus } from '../../models/book.model';

export interface ReviewResponse {
  username: string;
  displayName: string;
  profilePictureUrl: string | null;
  rating: number;
  review: string;
  addedAt: string;
}

export interface ShelfBook {
  book: {
    id: number;
    title: string;
    author: string;
    coverImageUrl: string;
    genre: { name: string } | null;
    averageRating: number;
  };
  status: string;
  rating: number | null;
  review: string | null;
  addedAt: string;
}

export interface CommunityReview {
  username: string;
  displayName: string;
  profilePictureUrl: string | null;
  rating: number;
  review: string | null;
  addedAt: string;
  bookId: number;
  bookTitle: string;
  bookCoverImageUrl: string;
}

@Injectable({ providedIn: 'root' })
export class BookService {

  private readonly apiUrl = `${environment.apiUrl}/api/books`;

  private resolveAvatar(url: string | null): string | null {
    if (!url) return null;
    return url.startsWith('/api/') ? `${environment.apiUrl}${url}` : url;
  }

  constructor(private http: HttpClient) {}

  getAllBooks(): Observable<Book[]> {
    return this.http.get<Book[]>(this.apiUrl);
  }

  getRecommendedBooks(): Observable<Book[]> {
    return this.http.get<Book[]>(this.apiUrl);
  }

  getForYouBooks(): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.apiUrl}/for-you`);
  }

  getBookById(id: number): Observable<Book> {
    return this.http.get<Book>(`${this.apiUrl}/${id}`);
  }

  getTrendingBooks(): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.apiUrl}/trending`);
  }

  searchBooks(query: string): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.apiUrl}/search`, { params: { q: query } });
  }

  getBooksByGenre(genreName: string): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.apiUrl}/genre/${genreName}`);
  }

  getAllGenres(): Observable<Genre[]> {
    return this.http.get<Genre[]>(`${this.apiUrl}/genres`);
  }

  // Returns null silently when book not in shelf (suppresses 404 console errors)
  getUserBookStatus(bookId: number): Observable<UserBookStatus | null> {
    return this.http.get<UserBookStatus>(`${environment.apiUrl}/api/shelf/${bookId}`).pipe(
      catchError(err => {
        if (err.status === 404) return of(null);
        throw err;
      })
    );
  }

  addToShelf(bookId: number, status: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/shelf`, { bookId, status });
  }

  submitReview(bookId: number, rating: number, review: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/api/reviews`, { bookId, rating, review });
  }

  getBookReviews(bookId: number): Observable<ReviewResponse[]> {
    return this.http.get<ReviewResponse[]>(`${environment.apiUrl}/api/reviews/book/${bookId}`).pipe(
      map(reviews => reviews.map(r => ({ ...r, profilePictureUrl: this.resolveAvatar(r.profilePictureUrl) })))
    );
  }

  deleteReview(bookId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/reviews/${bookId}`);
  }

  getMyShelf(): Observable<ShelfBook[]> {
    return this.http.get<ShelfBook[]>(`${environment.apiUrl}/api/shelf`);
  }

  getRecentCommunityReviews(): Observable<CommunityReview[]> {
    return this.http.get<CommunityReview[]>(`${environment.apiUrl}/api/reviews/recent`).pipe(
      map(reviews => reviews.map(r => ({ ...r, profilePictureUrl: this.resolveAvatar(r.profilePictureUrl) })))
    );
  }
}
