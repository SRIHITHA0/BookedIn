package com.cts.mfrp.bkin.controller;

import com.cts.mfrp.bkin.dto.ReviewRequest;
import com.cts.mfrp.bkin.dto.ReviewResponseDto;
import com.cts.mfrp.bkin.entity.*;
import com.cts.mfrp.bkin.repository.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.PageRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final UserBookRepository userBookRepository;
    private final UserRepository userRepository;
    private final BookRepository bookRepository;

    public ReviewController(UserBookRepository userBookRepository,
                            UserRepository userRepository,
                            BookRepository bookRepository) {
        this.userBookRepository = userBookRepository;
        this.userRepository = userRepository;
        this.bookRepository = bookRepository;
    }

    @GetMapping("/recent")
    public ResponseEntity<List<ReviewResponseDto>> getRecentReviews() {
        List<ReviewResponseDto> reviews = userBookRepository
            .findRecentReviews(PageRequest.of(0, 8))
            .stream()
            .map(ReviewResponseDto::from)
            .toList();
        return ResponseEntity.ok(reviews);
    }

    @GetMapping("/book/{bookId}")
    public ResponseEntity<List<ReviewResponseDto>> getReviews(@PathVariable Long bookId) {
        List<ReviewResponseDto> reviews = userBookRepository.findReviewsByBookId(bookId)
            .stream()
            .map(ReviewResponseDto::from)
            .toList();
        return ResponseEntity.ok(reviews);
    }

    @PostMapping
    public ResponseEntity<?> submitReview(@Valid @RequestBody ReviewRequest request,
                                          Principal principal) {
        User user = userRepository.findByUsername(principal.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        Book book = bookRepository.findById(request.getBookId())
            .orElseThrow(() -> new RuntimeException("Book not found"));

        Optional<UserBook> existing = userBookRepository
            .findByUser_UsernameAndBook_Id(user.getUsername(), book.getId());

        UserBook userBook = existing.orElse(new UserBook(user, book, UserBook.ReadingStatus.COMPLETED));
        userBook.setRating(request.getRating());
        userBook.setReview(request.getReview());
        userBookRepository.save(userBook);

        recalculateBookRating(book);

        return ResponseEntity.ok(Map.of("message", "Review submitted"));
    }

    @DeleteMapping("/{bookId}")
    public ResponseEntity<?> deleteReview(@PathVariable Long bookId, Principal principal) {
        UserBook userBook = userBookRepository
            .findByUser_UsernameAndBook_Id(principal.getName(), bookId)
            .orElseThrow(() -> new RuntimeException("Review not found"));

        userBook.setRating(null);
        userBook.setReview(null);
        userBookRepository.save(userBook);

        Book book = bookRepository.findById(bookId)
            .orElseThrow(() -> new RuntimeException("Book not found"));
        recalculateBookRating(book);

        return ResponseEntity.ok(Map.of("message", "Review deleted"));
    }

    private void recalculateBookRating(Book book) {
        List<UserBook> withRating = userBookRepository.findAll().stream()
            .filter(ub -> ub.getBook().getId().equals(book.getId()) && ub.getRating() != null)
            .toList();

        double avg = withRating.stream().mapToInt(UserBook::getRating).average().orElse(0.0);
        book.setAverageRating(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
        book.setTotalReviews(withRating.size());
        bookRepository.save(book);
    }
}
