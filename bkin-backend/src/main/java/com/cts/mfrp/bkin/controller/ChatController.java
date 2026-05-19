package com.cts.mfrp.bkin.controller;

import com.cts.mfrp.bkin.dto.ChatMessageDto;
import com.cts.mfrp.bkin.dto.ConversationDto;
import com.cts.mfrp.bkin.dto.MessageResponseDto;
import com.cts.mfrp.bkin.entity.Book;
import com.cts.mfrp.bkin.entity.Message;
import com.cts.mfrp.bkin.entity.User;
import com.cts.mfrp.bkin.repository.BookRepository;
import com.cts.mfrp.bkin.repository.ChatDeletionRepository;
import com.cts.mfrp.bkin.repository.MessageRepository;
import com.cts.mfrp.bkin.repository.UserBlockRepository;
import com.cts.mfrp.bkin.repository.UserRepository;
import com.cts.mfrp.bkin.entity.ChatDeletion;
import com.cts.mfrp.bkin.service.AiChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

@Controller
public class ChatController {

    private final SimpMessagingTemplate    messagingTemplate;
    private final MessageRepository        messageRepository;
    private final UserRepository           userRepository;
    private final BookRepository           bookRepository;
    private final AiChatService            aiChatService;
    private final ChatDeletionRepository   chatDeletionRepository;
    private final UserBlockRepository      userBlockRepository;

    public ChatController(SimpMessagingTemplate messagingTemplate,
                          MessageRepository messageRepository,
                          UserRepository userRepository,
                          BookRepository bookRepository,
                          AiChatService aiChatService,
                          ChatDeletionRepository chatDeletionRepository,
                          UserBlockRepository userBlockRepository) {
        this.messagingTemplate      = messagingTemplate;
        this.messageRepository      = messageRepository;
        this.userRepository         = userRepository;
        this.bookRepository         = bookRepository;
        this.aiChatService          = aiChatService;
        this.chatDeletionRepository = chatDeletionRepository;
        this.userBlockRepository    = userBlockRepository;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SEND MESSAGE
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    @MessageMapping("/chat/{roomId}")
    public void handleMessage(@DestinationVariable String roomId,
                              @Payload ChatMessageDto incoming,
                              Principal principal) {
        if (principal == null) return;

        User sender = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        // Block check for DM rooms: silently drop if either party has blocked the other
        if (roomId.startsWith("dm_")) {
            String rest = roomId.substring(3);
            String[] parts = rest.split("_", 2);
            if (parts.length == 2) {
                String otherUsername = parts[0].equals(sender.getUsername()) ? parts[1] : parts[0];
                boolean blockedBySender = userBlockRepository
                    .existsByBlockerUsernameAndBlockedUsername(sender.getUsername(), otherUsername);
                boolean blockedByOther  = userBlockRepository
                    .existsByBlockerUsernameAndBlockedUsername(otherUsername, sender.getUsername());
                if (blockedBySender || blockedByOther) return;
            }
        }

        Message persisted = new Message();
        persisted.setRoomId(roomId);
        persisted.setSender(sender);
        persisted.setContent(incoming.getContent());
        persisted.setMessageType(Message.MessageType.valueOf(incoming.getType()));
        messageRepository.save(persisted);

        // Broadcast to room — include DB id so clients can target it for deletion
        incoming.setId(persisted.getId());
        incoming.setSenderUsername(sender.getUsername());
        incoming.setSenderDisplayName(
                sender.getDisplayName() != null ? sender.getDisplayName() : sender.getUsername());
        incoming.setSenderProfilePictureUrl(sender.getProfilePictureUrl() != null
                ? "/api/users/" + sender.getUsername() + "/avatar"
                : null);
        incoming.setSentAt(persisted.getSentAt().toString() + "Z");

        messagingTemplate.convertAndSend("/topic/chat/" + roomId, incoming);

        // ── AI Bot Integration ────────────────────────────────────────────────
        if (roomId.startsWith("ai_")) {
            List<Book> libraryBooks = bookRepository.findAll();
            String botResponse = aiChatService.getBotResponse(
                    incoming.getContent(), libraryBooks, sender.getUsername());

            userRepository.findByUsername("BookBot").ifPresent(botUser -> {
                Message botMessage = new Message();
                botMessage.setRoomId(roomId);
                botMessage.setSender(botUser);
                botMessage.setContent(botResponse);
                botMessage.setMessageType(Message.MessageType.TEXT);
                messageRepository.save(botMessage);
            });

            ChatMessageDto botMsg = new ChatMessageDto();
            botMsg.setContent(botResponse);
            botMsg.setSenderUsername("BookBot");
            botMsg.setSenderDisplayName("The Library Ghost");
            botMsg.setType("TEXT");
            botMsg.setSentAt(java.time.Instant.now().toString() + "Z");
            messagingTemplate.convertAndSend("/topic/chat/" + roomId, botMsg);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE A SINGLE MESSAGE
    // ─────────────────────────────────────────────────────────────────────────

    @DeleteMapping("/api/chat/messages/{messageId}")
    @ResponseBody
    @Transactional
    public ResponseEntity<Void> deleteMessage(@PathVariable Long messageId, Principal principal) {
        Message msg = messageRepository.findById(messageId).orElse(null);
        if (msg == null) return ResponseEntity.notFound().build();

        // Only the original sender may delete their own message
        if (!msg.getSender().getUsername().equals(principal.getName())) {
            return ResponseEntity.status(403).build();
        }

        String roomId = msg.getRoomId();
        messageRepository.delete(msg);

        // Broadcast deletion event so all open clients remove it instantly
        messagingTemplate.convertAndSend(
            "/topic/chat/" + roomId,
            Map.of("eventType", "MESSAGE_DELETED", "messageId", messageId)
        );

        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE A CONVERSATION (per-user, DM only)
    // ─────────────────────────────────────────────────────────────────────────

    @DeleteMapping("/api/chat/rooms/{roomId}")
    @ResponseBody
    @Transactional
    public ResponseEntity<Void> deleteConversation(
            @PathVariable String roomId, Principal principal) {

        if (!roomId.startsWith("dm_")) {
            return ResponseEntity.badRequest().build(); // only DMs can be deleted per-user
        }

        // Upsert: ignore if already deleted by this user
        if (chatDeletionRepository.findByUsernameAndRoomId(principal.getName(), roomId).isEmpty()) {
            chatDeletionRepository.save(new ChatDeletion(principal.getName(), roomId));
        }
        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHAT HISTORY
    // ─────────────────────────────────────────────────────────────────────────

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

    // ─────────────────────────────────────────────────────────────────────────
    // AVAILABLE ROOMS
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/api/chat/rooms")
    @ResponseBody
    public ResponseEntity<List<String>> getAvailableRooms() {
        return ResponseEntity.ok(
            List.of("general", "fiction", "mystery", "sci-fi", "fantasy", "thriller"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PERSONAL CONVERSATIONS  (filters deleted + blocked)
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/api/chat/personal/conversations")
    @ResponseBody
    @Transactional
    public ResponseEntity<List<ConversationDto>> getPersonalConversations(Principal principal) {
        String username = principal.getName();

        // Rooms this user has explicitly deleted
        List<String> deletedRooms = chatDeletionRepository.findRoomIdsByUsername(username);

        // Users involved in a block relationship with this user (either direction)
        List<String> blockedUsers = Stream.concat(
            userBlockRepository.findBlockedByUser(username).stream(),
            userBlockRepository.findWhoBlockedUser(username).stream()
        ).distinct().toList();

        List<String> allDmRooms = messageRepository.findAllDmRoomIds();

        List<ConversationDto> conversations = allDmRooms.stream()
                .filter(roomId -> {
                    String rest = roomId.substring(3);
                    String[] parts = rest.split("_", 2);
                    return parts.length == 2
                            && (parts[0].equals(username) || parts[1].equals(username));
                })
                .filter(roomId -> !deletedRooms.contains(roomId))
                .filter(roomId -> {
                    String rest = roomId.substring(3);
                    String[] parts = rest.split("_", 2);
                    String other = parts[0].equals(username) ? parts[1] : parts[0];
                    return !blockedUsers.contains(other);
                })
                .map(roomId -> {
                    String rest = roomId.substring(3);
                    String[] parts = rest.split("_", 2);
                    String otherUsername = parts[0].equals(username) ? parts[1] : parts[0];

                    User otherUser = userRepository.findByUsername(otherUsername).orElse(null);
                    Message lastMsg = messageRepository
                            .findTopByRoomIdOrderBySentAtDesc(roomId).orElse(null);

                    ConversationDto dto = new ConversationDto();
                    dto.setRoomId(roomId);
                    dto.setOtherUsername(otherUsername);
                    dto.setOtherDisplayName(otherUser != null && otherUser.getDisplayName() != null
                            ? otherUser.getDisplayName() : otherUsername);
                    dto.setOtherProfilePictureUrl(otherUser != null
                            && otherUser.getProfilePictureUrl() != null
                            ? "/api/users/" + otherUsername + "/avatar"
                            : null);
                    dto.setLastMessage(lastMsg != null ? lastMsg.getContent() : "");
                    dto.setLastMessageAt(lastMsg != null ? lastMsg.getSentAt().toString() : "");
                    dto.setUnreadCount((int) messageRepository.countUnreadInRoom(roomId, username));
                    return dto;
                })
                .sorted((a, b) -> b.getLastMessageAt().compareTo(a.getLastMessageAt()))
                .toList();

        return ResponseEntity.ok(conversations);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK ROOM AS READ
    // ─────────────────────────────────────────────────────────────────────────

    @PutMapping("/api/chat/{roomId}/read")
    @ResponseBody
    @Transactional
    public ResponseEntity<Void> markRoomAsRead(@PathVariable String roomId, Principal principal) {
        messageRepository.markRoomMessagesAsRead(roomId, principal.getName());
        return ResponseEntity.noContent().build();
    }
}
