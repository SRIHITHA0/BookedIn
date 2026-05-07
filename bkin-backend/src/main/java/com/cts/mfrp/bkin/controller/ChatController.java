package com.cts.mfrp.bkin.controller;

import com.cts.mfrp.bkin.dto.ChatMessageDto;
import com.cts.mfrp.bkin.dto.ConversationDto;
import com.cts.mfrp.bkin.dto.MessageResponseDto;
import com.cts.mfrp.bkin.entity.Message;
import com.cts.mfrp.bkin.entity.User;
import com.cts.mfrp.bkin.repository.MessageRepository;
import com.cts.mfrp.bkin.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public ChatController(SimpMessagingTemplate messagingTemplate,
                          MessageRepository messageRepository,
                          UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    @MessageMapping("/chat/{roomId}")
    public void handleMessage(@DestinationVariable String roomId,
                              @Payload ChatMessageDto incoming,
                              Principal principal) {
        if (principal == null) return;

        User sender = userRepository.findByUsername(principal.getName())
            .orElseThrow(() -> new RuntimeException("Sender not found"));

        Message persisted = new Message();
        persisted.setRoomId(roomId);
        persisted.setSender(sender);
        persisted.setContent(incoming.getContent());
        persisted.setMessageType(Message.MessageType.valueOf(incoming.getType()));
        messageRepository.save(persisted);

        incoming.setSenderUsername(sender.getUsername());
        incoming.setSenderDisplayName(
            sender.getDisplayName() != null ? sender.getDisplayName() : sender.getUsername()
        );
        incoming.setSenderProfilePictureUrl(sender.getProfilePictureUrl());
        incoming.setSentAt(persisted.getSentAt().toString());

        messagingTemplate.convertAndSend("/topic/chat/" + roomId, incoming);
    }

    @GetMapping("/api/chat/{roomId}/history")
    @ResponseBody
    @Transactional
    public ResponseEntity<List<MessageResponseDto>> getChatHistory(@PathVariable String roomId) {
        List<MessageResponseDto> history = messageRepository
            .findByRoomIdOrderBySentAtAsc(roomId)
            .stream()
            .map(MessageResponseDto::from)
            .toList();
        return ResponseEntity.ok(history);
    }

    @GetMapping("/api/chat/rooms")
    @ResponseBody
    public ResponseEntity<List<String>> getAvailableRooms() {
        return ResponseEntity.ok(List.of("general", "fiction", "mystery", "sci-fi", "fantasy", "thriller"));
    }

    @GetMapping("/api/chat/personal/conversations")
    @ResponseBody
    @Transactional
    public ResponseEntity<List<ConversationDto>> getPersonalConversations(Principal principal) {
        String username = principal.getName();
        List<String> allDmRooms = messageRepository.findAllDmRoomIds();

        List<ConversationDto> conversations = allDmRooms.stream()
            .filter(roomId -> {
                String rest = roomId.substring(3);
                String[] parts = rest.split("_", 2);
                return parts.length == 2
                    && (parts[0].equals(username) || parts[1].equals(username));
            })
            .map(roomId -> {
                String rest = roomId.substring(3);
                String[] parts = rest.split("_", 2);
                String otherUsername = parts[0].equals(username) ? parts[1] : parts[0];

                User otherUser = userRepository.findByUsername(otherUsername).orElse(null);
                Message lastMsg = messageRepository.findTopByRoomIdOrderBySentAtDesc(roomId).orElse(null);

                ConversationDto dto = new ConversationDto();
                dto.setRoomId(roomId);
                dto.setOtherUsername(otherUsername);
                dto.setOtherDisplayName(otherUser != null && otherUser.getDisplayName() != null
                    ? otherUser.getDisplayName() : otherUsername);
                dto.setLastMessage(lastMsg != null ? lastMsg.getContent() : "");
                dto.setLastMessageAt(lastMsg != null ? lastMsg.getSentAt().toString() : "");
                return dto;
            })
            .sorted((a, b) -> b.getLastMessageAt().compareTo(a.getLastMessageAt()))
            .toList();

        return ResponseEntity.ok(conversations);
    }
}
