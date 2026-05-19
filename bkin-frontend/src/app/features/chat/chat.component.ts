import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatService, Conversation } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { ChatMessage } from '../../models/chat-message.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './chat.component.html'
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('messageList') messageList!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage = '';
  roomId = '';
  currentUsername = '';
  currentDisplayName = '';
  currentProfilePicUrl = '';
  personalConversations: Conversation[] = [];
  isLoadingHistory = false;

  private msgSub!: Subscription;
  private deletionSub!: Subscription;
  private paramSub!: Subscription;
  private shouldScroll = false;

  sidebarOpen = false;
  personalSearchQuery = '';

  // ── Block state (only relevant in DM rooms) ──────────────────────────────
  isDmPartnerBlocked = false;
  dmPartnerUsername  = '';

  readonly groupRooms = ['general', 'fiction', 'mystery', 'sci-fi', 'fantasy', 'thriller'];

  get aiRoom(): string { return `ai_${this.currentUsername}`; }

  get filteredPersonalConversations(): Conversation[] {
    const q = this.personalSearchQuery.trim().toLowerCase();
    if (!q) return this.personalConversations;
    return this.personalConversations.filter(c =>
      c.otherDisplayName.toLowerCase().includes(q) ||
      c.otherUsername.toLowerCase().includes(q)
    );
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public chatService: ChatService,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.currentUsername    = this.authService.getUsername();
    this.currentDisplayName = this.authService.getDisplayName();
    this.userService.getMyProfile().subscribe({
      next: (p) => this.currentProfilePicUrl = p.profilePictureUrl ?? ''
    });
    this.loadPersonalConversations();

    this.paramSub = this.route.paramMap.subscribe(params => {
      const newRoomId = params.get('roomId') ?? 'general';
      this.switchRoom(newRoomId);
    });
  }

  private switchRoom(newRoomId: string): void {
    if (newRoomId === this.roomId && this.msgSub) return;

    this.msgSub?.unsubscribe();
    this.deletionSub?.unsubscribe();

    this.roomId  = newRoomId;
    this.messages = [];
    this.newMessage = '';
    this.isLoadingHistory = true;
    this.isDmPartnerBlocked = false;
    this.dmPartnerUsername  = '';

    this.chatService.getHistory(this.roomId).subscribe({
      next: (history) => {
        this.messages = history as ChatMessage[];
        this.isLoadingHistory = false;
        this.shouldScroll = true;
      },
      error: () => { this.isLoadingHistory = false; }
    });

    // Mark this room's messages as read so the badge clears
    this.chatService.markRoomAsRead(newRoomId).subscribe({ error: () => {} });

    // Subscribe to new messages
    this.msgSub = this.chatService.connect(this.roomId).subscribe(msg => {
      this.messages.push(msg);
      this.shouldScroll = true;
      if (this.isDmRoom) this.loadPersonalConversations();
    });

    // Subscribe to deletion events — remove the message from the list
    this.deletionSub = this.chatService.deletions$.subscribe(deletedId => {
      this.messages = this.messages.filter(m => m.id !== deletedId);
    });

    // Load block status when entering a DM room
    if (newRoomId.startsWith('dm_')) {
      this.dmPartnerUsername = this.resolveDmPartner(newRoomId);
      this.userService.isBlocked(this.dmPartnerUsername).subscribe({
        next: (blocked) => { this.isDmPartnerBlocked = blocked; },
        error: () => {}
      });
    }
  }

  loadPersonalConversations(): void {
    this.chatService.getPersonalConversations().subscribe({
      next: (convs) => this.personalConversations = convs,
      error: () => {}
    });
  }

  get isDmRoom(): boolean  { return this.roomId.startsWith('dm_'); }
  get isAiRoom(): boolean  { return this.roomId.startsWith('ai_'); }

  get roomDisplayName(): string {
    if (this.isDmRoom) {
      const conv = this.personalConversations.find(c => c.roomId === this.roomId);
      if (conv) return conv.otherDisplayName;
      const rest = this.roomId.substring(3);
      const parts = rest.split('_', 2);
      return parts.find(p => p !== this.currentUsername) ?? rest;
    }
    if (this.isAiRoom) return 'The Library Ghost';
    return this.roomId.charAt(0).toUpperCase() + this.roomId.slice(1);
  }

  get dmPartnerProfilePic(): string | null {
    if (!this.isDmRoom) return null;
    return this.personalConversations.find(c => c.roomId === this.roomId)
      ?.otherProfilePictureUrl ?? null;
  }

  private resolveDmPartner(roomId: string): string {
    const rest  = roomId.substring(3);
    const parts = rest.split('_', 2);
    return parts[0] === this.currentUsername ? parts[1] : parts[0];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────────────────────────────

  navigateToRoom(roomId: string): void {
    this.sidebarOpen = false;
    if (roomId !== this.roomId) {
      this.router.navigate(['/chat', roomId]);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Send message
  // ─────────────────────────────────────────────────────────────────────────

  sendMessage(): void {
    if (!this.newMessage.trim()) return;
    const sent = this.chatService.sendMessage(this.roomId, this.newMessage.trim());
    if (sent) this.newMessage = '';
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Feature 1 — Delete a message
  // ─────────────────────────────────────────────────────────────────────────

  deleteMessage(msg: ChatMessage): void {
    if (!msg.id) return;
    // Optimistically remove from local list for instant UX
    this.messages = this.messages.filter(m => m.id !== msg.id);
    // The backend will also broadcast MESSAGE_DELETED so other open clients update too
    this.chatService.deleteMessage(msg.id).subscribe({ error: () => {} });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Feature 2 — Delete a conversation
  // ─────────────────────────────────────────────────────────────────────────

  deleteConversation(roomId: string, event: Event): void {
    event.stopPropagation(); // don't navigate into the room when clicking delete
    if (!confirm('Delete this conversation? It will only be removed for you.')) return;
    this.chatService.deleteConversation(roomId).subscribe({
      next: () => {
        this.personalConversations = this.personalConversations
          .filter(c => c.roomId !== roomId);
        if (this.roomId === roomId) this.router.navigate(['/chat/general']);
      },
      error: () => {}
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Feature 3 — Block / Unblock
  // ─────────────────────────────────────────────────────────────────────────

  toggleBlock(): void {
    if (this.isDmPartnerBlocked) {
      // Unblock
      this.userService.unblockUser(this.dmPartnerUsername).subscribe({
        next: () => { this.isDmPartnerBlocked = false; },
        error: () => {}
      });
    } else {
      // Block
      if (!confirm(`Block ${this.roomDisplayName}? They won't be able to send you messages.`)) return;
      this.userService.blockUser(this.dmPartnerUsername).subscribe({
        next: () => {
          this.isDmPartnerBlocked = true;
          // Remove from sidebar and navigate away
          this.personalConversations = this.personalConversations
            .filter(c => c.roomId !== this.roomId);
          this.router.navigate(['/chat/general']);
        },
        error: () => {}
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  avatarLetter(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.messageList) {
      this.messageList.nativeElement.scrollTop = this.messageList.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.msgSub?.unsubscribe();
    this.deletionSub?.unsubscribe();
    this.paramSub?.unsubscribe();
    this.chatService.disconnect();
  }
}
