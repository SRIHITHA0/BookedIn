import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { BookService } from '../../core/services/book.service';
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

  books:               Book[]  = [];
  genres:              Genre[] = [];
  searchQuery          = '';
  selectedGenreFilter  = 'all';
  isLoading            = false;
  booksError           = false;
  displayName          = '';
  myProfilePicUrl      = '';
  showChatSelector     = false;
  chatSection          = 'group';
  personalConversations: Conversation[] = [];

  readonly chatRooms = ['general', 'fiction', 'mystery', 'sci-fi', 'fantasy', 'thriller'];

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

  ngOnInit(): void {
    this.displayName = this.authService.getDisplayName();
    this.userService.getMyProfile().subscribe({
      next: (p) => this.myProfilePicUrl = p.profilePictureUrl ?? ''
    });
    this.loadGenres();
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.searchQuery = params['q'];
        this.onSearch();
      } else {
        this.loadAllBooks();
      }
    });
  }

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

  openChat(): void {
    this.showChatSelector = true;
    this.chatSection = 'group';
    this.loadPersonalChats();
  }

  closeChatSelector(): void { this.showChatSelector = false; }

  loadPersonalChats(): void {
    this.chatService.getPersonalConversations().subscribe({
      next: (convs) => this.personalConversations = convs,
      error: () => {}
    });
  }

  avatarLetter(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  goToChat(roomId: string): void {
    this.showChatSelector = false;
    this.router.navigate(['/chat', roomId]);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
