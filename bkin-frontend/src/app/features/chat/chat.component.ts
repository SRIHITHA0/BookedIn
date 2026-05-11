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
  private paramSub!: Subscription;
  private shouldScroll = false;

  sidebarOpen = false;
  personalSearchQuery = '';

  readonly groupRooms = ['general', 'fiction', 'mystery', 'sci-fi', 'fantasy', 'thriller'];

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
    private chatService: ChatService,
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

    // Subscribe to param changes so switching rooms in the sidebar works
    // without Angular destroying and recreating the component
    this.paramSub = this.route.paramMap.subscribe(params => {
      const newRoomId = params.get('roomId') ?? 'general';
      this.switchRoom(newRoomId);
    });
  }

  private switchRoom(newRoomId: string): void {
    if (newRoomId === this.roomId && this.msgSub) return;

    this.msgSub?.unsubscribe();
    this.roomId = newRoomId;
    this.messages = [];
    this.newMessage = '';
    this.isLoadingHistory = true;

    this.chatService.getHistory(this.roomId).subscribe({
      next: (history) => {
        this.messages = history as ChatMessage[];
        this.isLoadingHistory = false;
        this.shouldScroll = true;
      },
      error: () => { this.isLoadingHistory = false; }
    });

    this.msgSub = this.chatService.connect(this.roomId).subscribe(msg => {
      if (msg.senderUsername !== this.currentUsername) {
        this.messages.push(msg);
        this.shouldScroll = true;
      }
    });
  }

  loadPersonalConversations(): void {
    this.chatService.getPersonalConversations().subscribe({
      next: (convs) => this.personalConversations = convs,
      error: () => {}
    });
  }

  get isDmRoom(): boolean {
    return this.roomId.startsWith('dm_');
  }

  get roomDisplayName(): string {
    if (this.isDmRoom) {
      const conv = this.personalConversations.find(c => c.roomId === this.roomId);
      if (conv) return conv.otherDisplayName;
      const rest = this.roomId.substring(3);
      const parts = rest.split('_', 2);
      return parts.find(p => p !== this.currentUsername) ?? rest;
    }
    return this.roomId.charAt(0).toUpperCase() + this.roomId.slice(1);
  }

  get dmPartnerProfilePic(): string | null {
    if (!this.isDmRoom) return null;
    return this.personalConversations.find(c => c.roomId === this.roomId)?.otherProfilePictureUrl ?? null;
  }

  navigateToRoom(roomId: string): void {
    this.sidebarOpen = false;
    if (roomId !== this.roomId) {
      this.router.navigate(['/chat', roomId]);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.messageList) {
      this.messageList.nativeElement.scrollTop = this.messageList.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) return;
    const content = this.newMessage.trim();
    this.newMessage = '';

    this.messages.push({
      content,
      type: 'TEXT',
      senderUsername:    this.currentUsername,
      senderDisplayName: this.currentDisplayName,
      sentAt: new Date().toISOString()
    });
    this.shouldScroll = true;

    this.chatService.sendMessage(this.roomId, content);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  avatarLetter(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  ngOnDestroy(): void {
    this.msgSub?.unsubscribe();
    this.paramSub?.unsubscribe();
    this.chatService.disconnect();
  }
}
