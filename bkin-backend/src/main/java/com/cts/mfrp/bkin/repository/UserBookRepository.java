package com.cts.mfrp.bkin.repository;

import com.cts.mfrp.bkin.entity.UserBook;
import com.cts.mfrp.bkin.entity.UserBookId;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UserBookRepository extends JpaRepository<UserBook, UserBookId> {
    List<UserBook> findByUser_Username(String username);
    Optional<UserBook> findByUser_UsernameAndBook_Id(String username, Long bookId);

    @Query("SELECT ub FROM UserBook ub WHERE ub.book.id = :bookId AND (ub.rating IS NOT NULL OR ub.review IS NOT NULL)")
    List<UserBook> findReviewsByBookId(@Param("bookId") Long bookId);

    @Query("SELECT ub FROM UserBook ub WHERE ub.rating IS NOT NULL ORDER BY ub.addedAt DESC")
    List<UserBook> findRecentReviews(Pageable pageable);
}
