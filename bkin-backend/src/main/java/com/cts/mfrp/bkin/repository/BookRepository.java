package com.cts.mfrp.bkin.repository;

import com.cts.mfrp.bkin.entity.Book;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BookRepository extends JpaRepository<Book, Long> {
    List<Book> findByGenre_Name(String genreName);
    List<Book> findByGenre_NameIn(List<String> genreNames);
    List<Book> findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase(String title, String author);
    List<Book> findTop10ByOrderByAverageRatingDesc();
}
