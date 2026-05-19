package com.cts.mfrp.bkin.repository;

import com.cts.mfrp.bkin.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    boolean existsByPostIdAndUserUsername(Long postId, String username);

    long countByPostId(Long postId);

    Optional<PostLike> findByPostIdAndUserUsername(Long postId, String username);

    @Modifying
    @Query("DELETE FROM PostLike l WHERE l.post.id = :postId")
    void deleteByPostId(@Param("postId") Long postId);
}
