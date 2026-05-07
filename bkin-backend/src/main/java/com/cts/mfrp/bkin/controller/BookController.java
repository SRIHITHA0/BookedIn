package com.cts.mfrp.bkin.controller;

import com.cts.mfrp.bkin.entity.Book;
import com.cts.mfrp.bkin.entity.Genre;
import com.cts.mfrp.bkin.repository.GenreRepository;
import com.cts.mfrp.bkin.service.BookService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService bookService;
    private final GenreRepository genreRepository;

    public BookController(BookService bookService, GenreRepository genreRepository) {
        this.bookService = bookService;
        this.genreRepository = genreRepository;
    }

    @GetMapping
    public ResponseEntity<List<Book>> getAllBooks() {
        return ResponseEntity.ok(bookService.getAllBooks());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Book> getBook(@PathVariable Long id) {
        return ResponseEntity.ok(bookService.getBookById(id));
    }

    @GetMapping("/trending")
    public ResponseEntity<List<Book>> getTrending() {
        return ResponseEntity.ok(bookService.getTrending());
    }

    @GetMapping("/search")
    public ResponseEntity<List<Book>> search(@RequestParam String q) {
        return ResponseEntity.ok(bookService.searchBooks(q));
    }

    @GetMapping("/genre/{genreName}")
    public ResponseEntity<List<Book>> byGenre(@PathVariable String genreName) {
        return ResponseEntity.ok(bookService.getBooksByGenre(genreName));
    }

    @GetMapping("/for-you")
    public ResponseEntity<List<Book>> getForYou(Principal principal) {
        return ResponseEntity.ok(bookService.getBooksByUserInterests(principal.getName()));
    }

    @GetMapping("/genres")
    public ResponseEntity<List<Genre>> getAllGenres() {
        return ResponseEntity.ok(genreRepository.findAll());
    }
}
