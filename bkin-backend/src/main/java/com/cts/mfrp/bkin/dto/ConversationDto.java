package com.cts.mfrp.bkin.dto;

public class ConversationDto {
    private String roomId;
    private String otherUsername;
    private String otherDisplayName;
    private String otherProfilePictureUrl;
    private String lastMessage;
    private String lastMessageAt;
    private int unreadCount;

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getOtherUsername() { return otherUsername; }
    public void setOtherUsername(String otherUsername) { this.otherUsername = otherUsername; }
    public String getOtherDisplayName() { return otherDisplayName; }
    public void setOtherDisplayName(String otherDisplayName) { this.otherDisplayName = otherDisplayName; }
    public String getOtherProfilePictureUrl() { return otherProfilePictureUrl; }
    public void setOtherProfilePictureUrl(String otherProfilePictureUrl) { this.otherProfilePictureUrl = otherProfilePictureUrl; }
    public String getLastMessage() { return lastMessage; }
    public void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }
    public String getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(String lastMessageAt) { this.lastMessageAt = lastMessageAt; }
    public int getUnreadCount() { return unreadCount; }
    public void setUnreadCount(int unreadCount) { this.unreadCount = unreadCount; }
}
