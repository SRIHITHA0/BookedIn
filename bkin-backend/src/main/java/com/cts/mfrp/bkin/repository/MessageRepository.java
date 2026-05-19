package com.cts.mfrp.bkin.repository;

import com.cts.mfrp.bkin.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m JOIN FETCH m.sender WHERE m.roomId = :roomId ORDER BY m.sentAt ASC")
    List<Message> findByRoomIdOrderBySentAtAsc(@Param("roomId") String roomId);

    Optional<Message> findTopByRoomIdOrderBySentAtDesc(String roomId);

    @Query("SELECT DISTINCT m.roomId FROM Message m WHERE m.roomId LIKE 'dm_%'")
    List<String> findAllDmRoomIds();

    /** Count unread messages in a specific room not sent by the given user */
    @Query("SELECT COUNT(m) FROM Message m WHERE m.roomId = :roomId AND m.sender.username != :username AND m.isRead = false")
    long countUnreadInRoom(@Param("roomId") String roomId, @Param("username") String username);

    /** Mark all messages in a room as read (excludes messages the user sent themselves) */
    @Modifying
    @Query("UPDATE Message m SET m.isRead = true WHERE m.roomId = :roomId AND m.sender.username != :username AND m.isRead = false")
    void markRoomMessagesAsRead(@Param("roomId") String roomId, @Param("username") String username);
}
