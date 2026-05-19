package com.cts.mfrp.bkin.repository;

import com.cts.mfrp.bkin.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByDisplayName(String displayName);
    Optional<User> findByDisplayName(String displayName);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.interests WHERE u.username = :username")
    Optional<User> findByUsernameWithInterests(@Param("username") String username);
}
