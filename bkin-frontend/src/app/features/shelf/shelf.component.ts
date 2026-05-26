import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { UserService, ShelfItem } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shelf',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shelf.component.html'
})
export class ShelfComponent implements OnInit {

  allItems:     ShelfItem[] = [];
  activeTab: string = 'READING';
  isLoading = false;
  myProfilePicUrl = '';

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  get myAvatarLetter(): string {
    const name = this.authService.getDisplayName();
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  ngOnInit(): void {
    this.isLoading = true;
    this.userService.getMyShelf().subscribe({
      next: (items) => { this.allItems = items; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
    this.userService.getMyProfile().subscribe({
      next: (p) => this.myProfilePicUrl = p.profilePictureUrl ?? ''
    });
  }

  get filteredItems(): ShelfItem[] {
    return this.allItems.filter(i => i.status === this.activeTab);
  }

  setTab(tab: string): void { this.activeTab = tab; }

  get tabCounts(): Record<string, number> {
    return {
      WANT_TO_READ: this.allItems.filter(i => i.status === 'WANT_TO_READ').length,
      READING:      this.allItems.filter(i => i.status === 'READING').length,
      COMPLETED:    this.allItems.filter(i => i.status === 'COMPLETED').length
    };
  }

  goToBook(id: number): void { this.router.navigate(['/books', id]); }
  goBack(): void { this.router.navigate(['/home']); }

  getStars(rating: number | null): number[] {
    return [1, 2, 3, 4, 5];
  }

  getTabLabel(tab: string): string {
    return { WANT_TO_READ: 'Want to Read', READING: 'Reading', COMPLETED: 'Completed' }[tab] ?? tab;
  }
}
