import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { BookService, ShelfBook, CommunityReview } from '../../core/services/book.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { ChatService, Conversation } from '../../core/services/chat.service';
import { Book } from '../../models/book.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {

  trendingBooks:         Book[]           = [];
  forYouBooks:           Book[]           = [];
  currentlyReadingBooks: ShelfBook[]      = [];
  communityReviews:      CommunityReview[] = [];
  searchResults:         Book[]           = [];
  searchQuery           = '';
  isSearchActive        = false;
  isSearchLoading       = false;
  displayName           = '';
  myProfilePicUrl       = '';
  showMobileSearch      = false;
  showMobileMenu        = false;
  personalConversations: Conversation[] = [];
  groupRoomUnreadCounts: { [room: string]: number } = {};

  constructor(
    private bookService: BookService,
    private authService: AuthService,
    private userService: UserService,
    private chatService: ChatService,
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
    this.displayName = this.authService.getDisplayName();
    this.loadTrendingBooks();
    this.loadForYouBooks();
    this.loadCurrentlyReading();
    this.loadCommunityReviews();
    this.userService.getMyProfile().subscribe({
      next: (p) => this.myProfilePicUrl = p.profilePictureUrl ?? ''
    });
    // Load DM + group unread counts so the badge is populated immediately
    this.loadPersonalChats();
    this.loadGroupUnreadCounts();
  }

  loadTrendingBooks(): void {
    this.bookService.getTrendingBooks().subscribe({
      next: (books) => this.trendingBooks = books
    });
  }

  loadForYouBooks(): void {
    this.bookService.getForYouBooks().subscribe({
      next: (books) => this.forYouBooks = books,
      error: () => this.forYouBooks = []
    });
  }

  loadCurrentlyReading(): void {
    this.bookService.getMyShelf().subscribe({
      next: (items) => this.currentlyReadingBooks = items.filter(i => i.status === 'READING').slice(0, 3),
      error: () => {}
    });
  }

  loadCommunityReviews(): void {
    this.bookService.getRecentCommunityReviews().subscribe({
      next: (reviews) => this.communityReviews = reviews,
      error: () => {}
    });
  }

  onSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) return;
    this.showMobileSearch = false;
    this.isSearchActive = true;
    this.isSearchLoading = true;
    this.searchResults = [];
    this.bookService.searchBooks(q).subscribe({
      next: (books) => { this.searchResults = books; this.isSearchLoading = false; },
      error: () => { this.searchResults = []; this.isSearchLoading = false; }
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.isSearchActive = false;
    this.isSearchLoading = false;
  }

  goToBook(id: number): void { this.router.navigate(['/books', id]); }

  goToChat(): void {
    this.showMobileMenu = false;
    this.router.navigate(['/chat', 'general']);
  }

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

  avatarLetter(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
