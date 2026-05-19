package com.cts.mfrp.bkin.repository;

import com.cts.mfrp.bkin.entity.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostCommentRepository extends JpaRepository<PostComment, Long> {

    @Query("SELECT c FROM PostComment c JOIN FETCH c.author WHERE c.post.id = :postId ORDER BY c.createdAt ASC")
    List<PostComment> findByPostIdOrderByCreatedAtAsc(@Param("postId") Long postId);

    @Modifying
    @Query("DELETE FROM PostComment c WHERE c.post.id = :postId")
    void deleteByPostId(@Param("postId") Long postId);

    long countByPostId(Long postId);
}
