package com.cts.mfrp.bkin.dto;

import com.cts.mfrp.bkin.entity.Message;

public class MessageResponseDto {

    private Long id;
    private String roomId;
    private String senderUsername;
    private String senderDisplayName;
    private String senderProfilePictureUrl;
    private String content;
    private String type;
    private String sentAt;   // ISO-8601 string — never an array
    private boolean isRead;

    public static MessageResponseDto from(Message msg) {
        MessageResponseDto dto = new MessageResponseDto();
        dto.id = msg.getId();
        dto.roomId = msg.getRoomId();
        dto.senderUsername = msg.getSender().getUsername();
        dto.senderDisplayName = msg.getSender().getDisplayName() != null
            ? msg.getSender().getDisplayName()
            : msg.getSender().getUsername();
        dto.senderProfilePictureUrl = msg.getSender().getProfilePictureUrl() != null
            ? "/api/users/" + msg.getSender().getUsername() + "/avatar"
            : null;
        dto.content = msg.getContent();
        dto.type = msg.getMessageType().name();
        dto.sentAt = msg.getSentAt().toString() + "Z";
        dto.isRead = Boolean.TRUE.equals(msg.getIsRead());
        return dto;
    }

    public Long getId() { return id; }
    public String getRoomId() { return roomId; }
    public String getSenderUsername() { return senderUsername; }
    public String getSenderDisplayName() { return senderDisplayName; }
    public String getSenderProfilePictureUrl() { return senderProfilePictureUrl; }
    public String getContent() { return content; }
    public String getType() { return type; }
    public String getSentAt() { return sentAt; }
    public boolean isRead() { return isRead; }
}
