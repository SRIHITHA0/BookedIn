import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthResponse {
  token: string;
  username: string;
  displayName: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly baseUrl = `${environment.apiUrl}/api/auth`;

  constructor(private http: HttpClient) {}

  signup(payload: {
    username: string;
    email: string;
    password: string;
    displayName: string;
    interests: string[];
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/signup`, payload).pipe(
      tap(res => this.storeSession(res))
    );
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, { username, password }).pipe(
      tap(res => this.storeSession(res))
    );
  }

  logout(): void {
    localStorage.removeItem('bkin_jwt_token');
    localStorage.removeItem('bkin_username');
    localStorage.removeItem('bkin_display_name');
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('bkin_jwt_token');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 <= Date.now()) {
        this.logout();
        return false;
      }
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  getDisplayName(): string {
    return localStorage.getItem('bkin_display_name') ?? '';
  }

  getUsername(): string {
    return localStorage.getItem('bkin_username') ?? '';
  }

  private storeSession(res: AuthResponse): void {
    localStorage.setItem('bkin_jwt_token', res.token);
    localStorage.setItem('bkin_username', res.username);
    localStorage.setItem('bkin_display_name', res.displayName);
  }
}
