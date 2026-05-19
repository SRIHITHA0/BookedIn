import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ChatMessage } from '../../models/chat-message.model';

export interface Conversation {
  roomId: string;
  otherUsername: string;
  otherDisplayName: string;
  otherProfilePictureUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class ChatService {

  private stompClient: Client | null = null;
  private messageSubject  = new Subject<ChatMessage>();
  private deletionSubject = new Subject<number>();   // emits messageId on deletion
  private _connected = false;

  get connected(): boolean { return this._connected; }

  /** Emits the id of every message that has been deleted by any participant */
  get deletions$(): Observable<number> { return this.deletionSubject.asObservable(); }

  constructor(private http: HttpClient) {}

  private resolveAvatar(url: string | null | undefined): string | null {
    if (!url) return null;
    return url.startsWith('/api/') ? `${environment.apiUrl}${url}` : url;
  }

  connect(roomId: string): Observable<ChatMessage> {
    if (this.stompClient?.active) {
      this.stompClient.deactivate();
    }
    this.messageSubject  = new Subject<ChatMessage>();
    this.deletionSubject = new Subject<number>();

    const token = localStorage.getItem('bkin_jwt_token');

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws`) as any,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        this._connected = true;
        this.stompClient!.subscribe(`/topic/chat/${roomId}`, (msg: IMessage) => {
          try {
            const raw = JSON.parse(msg.body);

            // ── Deletion event ────────────────────────────────────────────
            if (raw.eventType === 'MESSAGE_DELETED') {
              this.deletionSubject.next(raw.messageId as number);
              return;
            }

            // ── Regular chat message ──────────────────────────────────────
            const chatMsg: ChatMessage = {
              id:                       raw.id ?? undefined,
              content:                  raw.content,
              type:                     raw.type ?? 'TEXT',
              senderUsername:           raw.senderUsername,
              senderDisplayName:        raw.senderDisplayName,
              senderProfilePictureUrl:  this.resolveAvatar(raw.senderProfilePictureUrl),
              sentAt:                   raw.sentAt,
              isRead:                   false   // newly received messages are unread for the recipient
            };
            this.messageSubject.next(chatMsg);
          } catch { /* ignore malformed frames */ }
        });
      },
      onDisconnect: () => { this._connected = false; },
      onStompError: (frame) => {
        this._connected = false;
        console.error('[STOMP] Error:', frame.headers['message']);
      }
    });

    this.stompClient.activate();
    return this.messageSubject.asObservable();
  }

  sendMessage(roomId: string, content: string, type: string = 'TEXT'): boolean {
    if (!this._connected || !this.stompClient?.active) return false;
    this.stompClient.publish({
      destination: `/app/chat/${roomId}`,
      body: JSON.stringify({ content, type })
    });
    return true;
  }

  getHistory(roomId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${environment.apiUrl}/api/chat/${roomId}/history`).pipe(
      map(msgs => msgs.map(m => ({
        ...m,
        senderProfilePictureUrl: this.resolveAvatar(m.senderProfilePictureUrl)
      })))
    );
  }

  getRooms(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/api/chat/rooms`);
  }

  getPersonalConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${environment.apiUrl}/api/chat/personal/conversations`).pipe(
      map(convs => convs.map(c => ({
        ...c,
        otherProfilePictureUrl: this.resolveAvatar(c.otherProfilePictureUrl)
      })))
    );
  }

  /** Delete a single message. The backend broadcasts MESSAGE_DELETED to the room. */
  deleteMessage(messageId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/chat/messages/${messageId}`);
  }

  /** Delete (hide) a DM conversation for the current user only. */
  deleteConversation(roomId: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/api/chat/rooms/${encodeURIComponent(roomId)}`
    );
  }

  /** Mark all messages in a room as read for the current user. */
  markRoomAsRead(roomId: string): Observable<void> {
    return this.http.put<void>(`${environment.apiUrl}/api/chat/${roomId}/read`, {});
  }

  /** Unread message counts for each group room. */
  getGroupUnreadCounts(): Observable<{ [room: string]: number }> {
    return this.http.get<{ [room: string]: number }>(
      `${environment.apiUrl}/api/chat/group/unread`
    );
  }

  disconnect(): void {
    this._connected = false;
    this.stompClient?.deactivate();
    this.stompClient = null;
  }
}
