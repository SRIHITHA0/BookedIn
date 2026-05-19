import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { BookService, ShelfBook } from '../../core/services/book.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { ChatService, Conversation } from '../../core/services/chat.service';
import { Book, Genre } from '../../models/book.model';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DecimalPipe],
  templateUrl: './library.component.html'
})
export class LibraryComponent implements OnInit {

  // ── All books / search ──────────────────────────────────────────────────
  books:              Book[]  = [];
  genres:             Genre[] = [];
  searchQuery         = '';
  selectedGenreFilter = 'all';
  isLoading           = false;
  booksError          = false;

  // ── Discovery sections ──────────────────────────────────────────────────
  continueReading:    ShelfBook[] = [];
  forYouBooks:        Book[]      = [];
  trendingBooks:      Book[]      = [];
  isLoadingDiscovery  = false;

  // ── User state ──────────────────────────────────────────────────────────
  displayName     = '';
  myProfilePicUrl = '';

  // ── Unread badge ────────────────────────────────────────────────────────
  personalConversations: Conversation[] = [];
  groupRoomUnreadCounts: { [room: string]: number } = {};

  constructor(
    private bookService: BookService,
    private authService: AuthService,
    private userService: UserService,
    private chatService: ChatService,
    private router: Router,
    private route: ActivatedRoute
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
    this.displayName = this.authService.getDisplayName();
    this.userService.getMyProfile().subscribe({
      next: (p) => this.myProfilePicUrl = p.profilePictureUrl ?? ''
    });
    this.loadDiscoverySections();
    this.loadGenres();
    this.loadPersonalChats();
    this.loadGroupUnreadCounts();
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.searchQuery = params['q'];
        this.onSearch();
      } else {
        this.loadAllBooks();
      }
    });
  }

  // ── Discovery ───────────────────────────────────────────────────────────

  loadDiscoverySections(): void {
    this.isLoadingDiscovery = true;
    this.bookService.getMyShelf().subscribe({
      next: (items) => {
        this.continueReading = items.filter(i => i.status === 'READING').slice(0, 6);
        this.isLoadingDiscovery = false;
      },
      error: () => { this.isLoadingDiscovery = false; }
    });
    this.bookService.getForYouBooks().subscribe({
      next: (books) => this.forYouBooks = books.slice(0, 6),
      error: () => {}
    });
    this.bookService.getTrendingBooks().subscribe({
      next: (books) => this.trendingBooks = books.slice(0, 6),
      error: () => {}
    });
  }

  // ── Books grid ──────────────────────────────────────────────────────────

  loadAllBooks(): void {
    this.isLoading = true;
    this.booksError = false;
    this.bookService.getAllBooks().subscribe({
      next: (books) => { this.books = books; this.isLoading = false; },
      error: () => { this.isLoading = false; this.booksError = true; }
    });
  }

  loadGenres(): void {
    this.bookService.getAllGenres().subscribe({
      next: (genres) => this.genres = genres
    });
  }

  onSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) { this.selectedGenreFilter = 'all'; this.loadAllBooks(); return; }
    this.selectedGenreFilter = 'all';
    this.isLoading = true;
    this.booksError = false;
    this.bookService.searchBooks(q).subscribe({
      next: (books) => { this.books = books; this.isLoading = false; },
      error: () => { this.books = []; this.isLoading = false; this.booksError = true; }
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.selectedGenreFilter = 'all';
    this.loadAllBooks();
  }

  filterByGenre(genreName: string): void {
    this.selectedGenreFilter = genreName;
    this.searchQuery = '';
    if (genreName === 'all') { this.loadAllBooks(); return; }
    this.isLoading = true;
    this.booksError = false;
    this.bookService.getBooksByGenre(genreName).subscribe({
      next: (books) => { this.books = books; this.isLoading = false; },
      error: () => { this.books = []; this.isLoading = false; this.booksError = true; }
    });
  }

  goToBook(id: number): void { this.router.navigate(['/books', id]); }

  // ── Navigation ──────────────────────────────────────────────────────────

  goToChat(): void { this.router.navigate(['/chat', 'general']); }

  // ── Unread badge ────────────────────────────────────────────────────────

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

  // ── Helpers ─────────────────────────────────────────────────────────────

  avatarLetter(name: string): string { return name ? name.charAt(0).toUpperCase() : '?'; }

  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
