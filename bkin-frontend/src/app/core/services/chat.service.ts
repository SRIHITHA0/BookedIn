import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatMessage } from '../../models/chat-message.model';

export interface Conversation {
  roomId: string;
  otherUsername: string;
  otherDisplayName: string;
  lastMessage: string;
  lastMessageAt: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {

  private stompClient: Client | null = null;
  private messageSubject = new Subject<ChatMessage>();

  constructor(private http: HttpClient) {}

  connect(roomId: string): Observable<ChatMessage> {
    // Clean up any existing connection
    if (this.stompClient?.active) {
      this.stompClient.deactivate();
    }
    // Fresh subject per connection so old messages from previous rooms don't bleed through
    this.messageSubject = new Subject<ChatMessage>();

    const token = localStorage.getItem('bkin_jwt_token');

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws`) as any,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        this.stompClient!.subscribe(`/topic/chat/${roomId}`, (msg: IMessage) => {
          try {
            const raw = JSON.parse(msg.body);
            const chatMsg: ChatMessage = {
              content:                  raw.content,
              type:                     raw.type ?? 'TEXT',
              senderUsername:           raw.senderUsername,
              senderDisplayName:        raw.senderDisplayName,
              senderProfilePictureUrl:  raw.senderProfilePictureUrl ?? null,
              sentAt:                   raw.sentAt
            };
            this.messageSubject.next(chatMsg);
          } catch { /* ignore malformed frames */ }
        });
      },
      onStompError: (frame) => {
        console.error('[STOMP] Error:', frame.headers['message']);
      }
    });

    this.stompClient.activate();
    return this.messageSubject.asObservable();
  }

  sendMessage(roomId: string, content: string, type: string = 'TEXT'): void {
    if (!this.stompClient?.active) return;
    this.stompClient.publish({
      destination: `/app/chat/${roomId}`,
      body: JSON.stringify({ content, type })
    });
  }

  getHistory(roomId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${environment.apiUrl}/api/chat/${roomId}/history`);
  }

  getRooms(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/api/chat/rooms`);
  }

  getPersonalConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${environment.apiUrl}/api/chat/personal/conversations`);
  }

  disconnect(): void {
    this.stompClient?.deactivate();
    this.stompClient = null;
  }
}
