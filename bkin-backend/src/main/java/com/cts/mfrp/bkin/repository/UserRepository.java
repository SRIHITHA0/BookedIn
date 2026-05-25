package com.cts.mfrp.bkin.repository;

import com.cts.mfrp.bkin.entity.Genre;
import com.cts.mfrp.bkin.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByDisplayName(String displayName);
    Optional<User> findByDisplayName(String displayName);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.interests WHERE u.username = :username")
    Optional<User> findByUsernameWithInterests(@Param("username") String username);

    @Query("SELECT u FROM User u WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(u.displayName) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<User> searchByUsernameOrDisplayName(@Param("q") String q);

    @Query("SELECT DISTINCT u FROM User u JOIN u.interests g WHERE g IN :genres AND u.username != :username")
    List<User> findSuggestedUsers(@Param("genres") Set<Genre> genres, @Param("username") String username);
}
