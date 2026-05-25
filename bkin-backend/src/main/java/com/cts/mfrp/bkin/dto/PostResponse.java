package com.cts.mfrp.bkin.dto;

import com.cts.mfrp.bkin.entity.Post;
import com.cts.mfrp.bkin.repository.PostCommentRepository;
import com.cts.mfrp.bkin.repository.PostLikeRepository;

import java.util.List;
import java.util.stream.Collectors;

public class PostResponse {

    private Long id;
    private String authorUsername;
    private String authorDisplayName;
    private String authorProfilePicUrl;
    private String content;
    private String imageUrl;
    private String mediaType;   // "image" | "video" | null
    private long likeCount;
    private long commentCount;
    private boolean likedByMe;
    private String createdAt;
    private String updatedAt;
    private boolean isEdited;
    private List<CommentResponse> comments;

    public static PostResponse from(Post post, String currentUsername,
                                     PostLikeRepository likeRepo,
                                     PostCommentRepository commentRepo) {
        PostResponse r = new PostResponse();
        r.id = post.getId();
        r.authorUsername = post.getAuthor().getUsername();
        r.authorDisplayName = post.getAuthor().getDisplayName() != null
            ? post.getAuthor().getDisplayName() : post.getAuthor().getUsername();
        r.authorProfilePicUrl = post.getAuthor().getProfilePictureUrl() != null
            ? "/api/users/" + post.getAuthor().getUsername() + "/avatar" : null;
        r.content = post.getContent();
        if (post.getImageUrl() != null) {
            String raw = post.getImageUrl();
            if (raw.startsWith("data:")) {
                boolean isVideo = raw.startsWith("data:video/");
                r.imageUrl   = "/api/posts/" + post.getId() + "/image";
                r.mediaType  = isVideo ? "video" : "image";
            } else {
                r.imageUrl  = raw;
                String lower = raw.toLowerCase();
                r.mediaType = (lower.contains(".mp4") || lower.contains(".webm")
                             || lower.contains(".ogg") || lower.contains(".mov")
                             || lower.contains(".avi")) ? "video" : "image";
            }
        }
        r.likeCount  = likeRepo.countByPostId(post.getId());
        r.commentCount = commentRepo.countByPostId(post.getId());
        r.likedByMe  = currentUsername != null
            && likeRepo.existsByPostIdAndUserUsername(post.getId(), currentUsername);
        r.createdAt  = post.getCreatedAt().toString() + "Z";
        r.updatedAt  = post.getUpdatedAt().toString() + "Z";
        r.isEdited   = post.isEdited();
        r.comments   = commentRepo.findByPostIdOrderByCreatedAtAsc(post.getId())
            .stream().map(CommentResponse::from).collect(Collectors.toList());
        return r;
    }

    public Long getId() { return id; }
    public String getAuthorUsername() { return authorUsername; }
    public String getAuthorDisplayName() { return authorDisplayName; }
    public String getAuthorProfilePicUrl() { return authorProfilePicUrl; }
    public String getContent() { return content; }
    public String getImageUrl() { return imageUrl; }
    public String getMediaType() { return mediaType; }
    public long getLikeCount() { return likeCount; }
    public long getCommentCount() { return commentCount; }
    public boolean isLikedByMe() { return likedByMe; }
    public String getCreatedAt() { return createdAt; }
    public String getUpdatedAt() { return updatedAt; }
    public boolean isEdited() { return isEdited; }
    public List<CommentResponse> getComments() { return comments; }
}
