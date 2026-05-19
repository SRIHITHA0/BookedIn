package com.cts.mfrp.bkin.controller;

import com.cts.mfrp.bkin.dto.CommentResponse;
import com.cts.mfrp.bkin.dto.PostResponse;
import com.cts.mfrp.bkin.entity.Post;
import com.cts.mfrp.bkin.entity.PostComment;
import com.cts.mfrp.bkin.entity.PostLike;
import com.cts.mfrp.bkin.entity.User;
import com.cts.mfrp.bkin.repository.PostCommentRepository;
import com.cts.mfrp.bkin.repository.PostLikeRepository;
import com.cts.mfrp.bkin.repository.PostRepository;
import com.cts.mfrp.bkin.repository.UserRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostRepository        postRepository;
    private final PostCommentRepository commentRepository;
    private final PostLikeRepository    likeRepository;
    private final UserRepository        userRepository;

    public PostController(PostRepository postRepository,
                          PostCommentRepository commentRepository,
                          PostLikeRepository likeRepository,
                          UserRepository userRepository) {
        this.postRepository    = postRepository;
        this.commentRepository = commentRepository;
        this.likeRepository    = likeRepository;
        this.userRepository    = userRepository;
    }

    // ─── Feed ────────────────────────────────────────────────────────────────

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<PostResponse>> getFeed(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        List<PostResponse> feed = postRepository.findAllWithAuthorOrderByCreatedAtDesc()
            .stream()
            .map(p -> PostResponse.from(p, username, likeRepository, commentRepository))
            .toList();
        return ResponseEntity.ok(feed);
    }

    // ─── Posts by user ───────────────────────────────────────────────────────

    @GetMapping("/user/{username}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PostResponse>> getUserPosts(@PathVariable String username,
                                                            Principal principal) {
        String cu = principal != null ? principal.getName() : null;
        List<PostResponse> posts = postRepository.findByAuthorUsernameOrderByCreatedAtDesc(username)
            .stream()
            .map(p -> PostResponse.from(p, cu, likeRepository, commentRepository))
            .toList();
        return ResponseEntity.ok(posts);
    }

    // ─── Create ──────────────────────────────────────────────────────────────

    @PostMapping
    @Transactional
    public ResponseEntity<PostResponse> createPost(@RequestBody Map<String, String> body,
                                                    Principal principal) {
        User author = userRepository.findByUsername(principal.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        String content = body.get("content");
        if (content == null || content.isBlank()) return ResponseEntity.badRequest().build();
        Post post = new Post();
        post.setAuthor(author);
        post.setContent(content.trim());
        String img = body.get("imageUrl");
        if (img != null && !img.isBlank()) post.setImageUrl(img);
        postRepository.save(post);
        return ResponseEntity.ok(
            PostResponse.from(post, principal.getName(), likeRepository, commentRepository));
    }

    // ─── Edit ────────────────────────────────────────────────────────────────

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<PostResponse> editPost(@PathVariable Long id,
                                                  @RequestBody Map<String, String> body,
                                                  Principal principal) {
        Post post = postRepository.findById(id).orElse(null);
        if (post == null) return ResponseEntity.notFound().build();
        if (!post.getAuthor().getUsername().equals(principal.getName()))
            return ResponseEntity.status(403).build();

        String content = body.get("content");
        if (content != null && !content.isBlank()) post.setContent(content.trim());
        if (body.containsKey("imageUrl")) {
            String img = body.get("imageUrl");
            post.setImageUrl(img == null || img.isBlank() ? null : img);
        }
        post.setEdited(true);
        postRepository.save(post);
        return ResponseEntity.ok(
            PostResponse.from(post, principal.getName(), likeRepository, commentRepository));
    }

    // ─── Delete ──────────────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deletePost(@PathVariable Long id, Principal principal) {
        Post post = postRepository.findById(id).orElse(null);
        if (post == null) return ResponseEntity.notFound().build();
        if (!post.getAuthor().getUsername().equals(principal.getName()))
            return ResponseEntity.status(403).build();
        commentRepository.deleteByPostId(id);
        likeRepository.deleteByPostId(id);
        postRepository.delete(post);
        return ResponseEntity.noContent().build();
    }

    // ─── Serve post image (base64 stored in DB) ───────────────────────────────

    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> getPostImage(@PathVariable Long id) {
        Post post = postRepository.findById(id).orElse(null);
        if (post == null || post.getImageUrl() == null) return ResponseEntity.notFound().build();
        String raw = post.getImageUrl();
        if (!raw.startsWith("data:")) return ResponseEntity.notFound().build();
        try {
            int comma = raw.indexOf(',');
            String mimeType = raw.substring(5, comma).split(";")[0];
            byte[] bytes = Base64.getDecoder().decode(raw.substring(comma + 1));
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(mimeType));
            headers.setCacheControl("public, max-age=3600");
            return ResponseEntity.ok().headers(headers).body(bytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // ─── Toggle like ─────────────────────────────────────────────────────────

    @PostMapping("/{id}/like")
    @Transactional
    public ResponseEntity<Map<String, Object>> toggleLike(@PathVariable Long id,
                                                           Principal principal) {
        Post post = postRepository.findById(id).orElse(null);
        if (post == null) return ResponseEntity.notFound().build();
        String username = principal.getName();
        var existing = likeRepository.findByPostIdAndUserUsername(id, username);
        boolean nowLiked;
        if (existing.isPresent()) {
            likeRepository.delete(existing.get());
            nowLiked = false;
        } else {
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
            PostLike like = new PostLike();
            like.setPost(post);
            like.setUser(user);
            likeRepository.save(like);
            nowLiked = true;
        }
        long count = likeRepository.countByPostId(id);
        return ResponseEntity.ok(Map.of("liked", nowLiked, "likeCount", count));
    }

    // ─── Add comment ─────────────────────────────────────────────────────────

    @PostMapping("/{id}/comments")
    @Transactional
    public ResponseEntity<CommentResponse> addComment(@PathVariable Long id,
                                                       @RequestBody Map<String, String> body,
                                                       Principal principal) {
        Post post = postRepository.findById(id).orElse(null);
        if (post == null) return ResponseEntity.notFound().build();
        String content = body.get("content");
        if (content == null || content.isBlank()) return ResponseEntity.badRequest().build();
        User author = userRepository.findByUsername(principal.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        PostComment comment = new PostComment();
        comment.setPost(post);
        comment.setAuthor(author);
        comment.setContent(content.trim());
        commentRepository.save(comment);
        return ResponseEntity.ok(CommentResponse.from(comment));
    }

    // ─── Delete comment ──────────────────────────────────────────────────────

    @DeleteMapping("/{postId}/comments/{commentId}")
    @Transactional
    public ResponseEntity<Void> deleteComment(@PathVariable Long postId,
                                               @PathVariable Long commentId,
                                               Principal principal) {
        PostComment comment = commentRepository.findById(commentId).orElse(null);
        if (comment == null) return ResponseEntity.notFound().build();
        if (!comment.getAuthor().getUsername().equals(principal.getName()))
            return ResponseEntity.status(403).build();
        commentRepository.delete(comment);
        return ResponseEntity.noContent().build();
    }
}
