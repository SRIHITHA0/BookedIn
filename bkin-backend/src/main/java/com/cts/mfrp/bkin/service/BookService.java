package com.cts.mfrp.bkin.service;

import com.cts.mfrp.bkin.entity.Book;
import com.cts.mfrp.bkin.entity.User;
import com.cts.mfrp.bkin.repository.BookRepository;
import com.cts.mfrp.bkin.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BookService {

    private final BookRepository bookRepository;
    private final UserRepository userRepository;

    public BookService(BookRepository bookRepository, UserRepository userRepository) {
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
    }

    public List<Book> getAllBooks() {
        return bookRepository.findAll();
    }

    public Book getBookById(Long id) {
        return bookRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Book not found: " + id));
    }

    public List<Book> getTrending() {
        return bookRepository.findTop10ByOrderByAverageRatingDesc();
    }

    public List<Book> searchBooks(String query) {
        return bookRepository.findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase(query, query);
    }

    public List<Book> getBooksByGenre(String genreName) {
        return bookRepository.findByGenre_Name(genreName);
    }

    public List<Book> getBooksByUserInterests(String username) {
        return userRepository.findByUsernameWithInterests(username)
            .map(user -> {
                List<String> genreNames = user.getInterests().stream()
                    .map(g -> g.getName())
                    .collect(Collectors.toList());
                if (genreNames.isEmpty()) return Collections.<Book>emptyList();
                return bookRepository.findByGenre_NameIn(genreNames);
            })
            .orElse(Collections.emptyList());
    }
}
