import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  updateProfile(payload: UpdateProfilePayload): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.base}/users/me`, payload);
  }

  getMyShelf(): Observable<ShelfItem[]> {
    return this.http.get<ShelfItem[]>(`${this.base}/shelf`);
  }
}
