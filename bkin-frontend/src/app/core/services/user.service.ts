import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  bio: string;
  profilePictureUrl: string;
  interests: string[];
  createdAt: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  country?: string | null;
}

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  profilePictureUrl?: string;
  interests?: string[];
}

export interface ShelfItem {
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

@Injectable({ providedIn: 'root' })
export class UserService {

  private readonly base = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  getMyProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.base}/users/me`);
  }

  getProfile(username: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.base}/users/${username}`);
  }

  getProfileByDisplayName(displayName: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(
      `${this.base}/users/by-display/${encodeURIComponent(displayName)}`
    );
  }

  updateProfile(payload: UpdateProfilePayload): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.base}/users/me`, payload);
  }

  getMyShelf(): Observable<ShelfItem[]> {
    return this.http.get<ShelfItem[]>(`${this.base}/shelf`);
  }

  blockUser(username: string): Observable<void> {
    return this.http.post<void>(`${this.base}/users/${username}/block`, {});
  }

  unblockUser(username: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/users/${username}/block`);
  }

  isBlocked(username: string): Observable<boolean> {
    return this.http.get<{ blocked: boolean }>(`${this.base}/users/${username}/block`).pipe(
      map(r => r.blocked)
    );
  }
}
