package com.cts.mfrp.bkin.dto;

import com.cts.mfrp.bkin.entity.UserBook;

public class ReviewResponseDto {
    private String username;
    private String displayName;
    private String profilePictureUrl;
    private Integer rating;
    private String review;
    private String addedAt;
    private Long bookId;
    private String bookTitle;
    private String bookCoverImageUrl;

    public static ReviewResponseDto from(UserBook ub) {
        ReviewResponseDto dto = new ReviewResponseDto();
        dto.username = ub.getUser().getUsername();
        dto.displayName = ub.getUser().getDisplayName();
        dto.profilePictureUrl = ub.getUser().getProfilePictureUrl();
        dto.rating = ub.getRating();
        dto.review = ub.getReview();
        dto.addedAt = ub.getAddedAt().toString();
        dto.bookId = ub.getBook().getId();
        dto.bookTitle = ub.getBook().getTitle();
        dto.bookCoverImageUrl = ub.getBook().getCoverImageUrl();
        return dto;
    }

    public String getUsername() { return username; }
    public String getDisplayName() { return displayName; }
    public String getProfilePictureUrl() { return profilePictureUrl; }
    public Integer getRating() { return rating; }
    public String getReview() { return review; }
    public String getAddedAt() { return addedAt; }
    public Long getBookId() { return bookId; }
    public String getBookTitle() { return bookTitle; }
    public String getBookCoverImageUrl() { return bookCoverImageUrl; }
}
