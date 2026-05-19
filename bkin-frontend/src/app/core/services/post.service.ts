import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Post, BkinComment } from '../../models/post.model';

@Injectable({ providedIn: 'root' })
export class PostService {

  constructor(private http: HttpClient) {}

  private resolveUrl(url: string | null): string | null {
    if (!url) return null;
    return url.startsWith('/api/') ? `${environment.apiUrl}${url}` : url;
  }

  private resolvePost(p: Post): Post {
    return {
      ...p,
      authorProfilePicUrl: this.resolveUrl(p.authorProfilePicUrl),
      imageUrl: this.resolveUrl(p.imageUrl),
      comments: (p.comments || []).map(c => this.resolveComment(c)),
      showComments: false,
      newCommentText: '',
    };
  }

  private resolveComment(c: BkinComment): BkinComment {
    return { ...c, authorProfilePicUrl: this.resolveUrl(c.authorProfilePicUrl) };
  }

  getFeed(): Observable<Post[]> {
    return this.http.get<Post[]>(`${environment.apiUrl}/api/posts`).pipe(
      map(posts => posts.map(p => this.resolvePost(p)))
    );
  }

  getUserPosts(username: string): Observable<Post[]> {
    return this.http.get<Post[]>(`${environment.apiUrl}/api/posts/user/${username}`).pipe(
      map(posts => posts.map(p => this.resolvePost(p)))
    );
  }

  createPost(content: string, imageUrl?: string): Observable<Post> {
    return this.http.post<Post>(`${environment.apiUrl}/api/posts`, { content, imageUrl }).pipe(
      map(p => this.resolvePost(p))
    );
  }

  editPost(postId: number, content: string, imageUrl?: string | null): Observable<Post> {
    return this.http.put<Post>(`${environment.apiUrl}/api/posts/${postId}`, { content, imageUrl }).pipe(
      map(p => this.resolvePost(p))
    );
  }

  deletePost(postId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/posts/${postId}`);
  }

  toggleLike(postId: number): Observable<{ liked: boolean; likeCount: number }> {
    return this.http.post<{ liked: boolean; likeCount: number }>(
      `${environment.apiUrl}/api/posts/${postId}/like`, {}
    );
  }

  addComment(postId: number, content: string): Observable<BkinComment> {
    return this.http.post<BkinComment>(
      `${environment.apiUrl}/api/posts/${postId}/comments`, { content }
    ).pipe(map(c => this.resolveComment(c)));
  }

  deleteComment(postId: number, commentId: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/api/posts/${postId}/comments/${commentId}`
    );
  }
}
