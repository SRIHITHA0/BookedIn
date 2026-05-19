package com.cts.mfrp.bkin.dto;

import com.cts.mfrp.bkin.entity.PostComment;

public class CommentResponse {

    private Long id;
    private String authorUsername;
    private String authorDisplayName;
    private String authorProfilePicUrl;
    private String content;
    private String createdAt;

    public static CommentResponse from(PostComment c) {
        CommentResponse r = new CommentResponse();
        r.id = c.getId();
        r.authorUsername = c.getAuthor().getUsername();
        r.authorDisplayName = c.getAuthor().getDisplayName() != null
            ? c.getAuthor().getDisplayName() : c.getAuthor().getUsername();
        r.authorProfilePicUrl = c.getAuthor().getProfilePictureUrl() != null
            ? "/api/users/" + c.getAuthor().getUsername() + "/avatar" : null;
        r.content = c.getContent();
        r.createdAt = c.getCreatedAt().toString() + "Z";
        return r;
    }

    public Long getId() { return id; }
    public String getAuthorUsername() { return authorUsername; }
    public String getAuthorDisplayName() { return authorDisplayName; }
    public String getAuthorProfilePicUrl() { return authorProfilePicUrl; }
    public String getContent() { return content; }
    public String getCreatedAt() { return createdAt; }
}
