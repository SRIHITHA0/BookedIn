package com.cts.mfrp.bkin.config;

import com.cts.mfrp.bkin.entity.Book;
import com.cts.mfrp.bkin.entity.Genre;
import com.cts.mfrp.bkin.repository.BookRepository;
import com.cts.mfrp.bkin.repository.GenreRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;



import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Configuration
public class DataSeeder {

    private static final Map<String, String> COVER_URLS = Map.of(
        "The Name of the Wind",                   "https://tse2.mm.bing.net/th/id/OIP.l7OmNx1kwCVmcD3DtCjZcQHaMP?rs=1&pid=ImgDetMain&o=7&rm=3",
        "Project Hail Mary",                       "https://images.squarespace-cdn.com/content/v1/60332279321c6f6cc87cf8fe/c459467d-c710-4c8b-a34e-d9d98f275738/Project+Hail+Mary.jpg",
        "Gone Girl",                               "https://www.commonsensemedia.org/sites/default/files/styles/ratio_2_3_xlarge/public/product-images/csm-movie/gone-girl.jpg",
        "The Great Gatsby",                        "https://tse3.mm.bing.net/th/id/OIP._OuBE7YbstiymN2Hwb0K1AHaLS?w=1000&h=1524&rs=1&pid=ImgDetMain&o=7&rm=3",
        "Educated",                                "https://cdn2.penguin.com.au/covers/original/9780099511021.jpg",
        "The Hitchhiker's Guide to the Galaxy",    "https://tse1.mm.bing.net/th/id/OIP.4fBHiA9pN46_bpQ4SKwikQHaLH?rs=1&pid=ImgDetMain&o=7&rm=3",
        "In the Woods",                            "https://m.media-amazon.com/images/I/91jMHH2+qHL._SL1500_.jpg",
        "Atomic Habits",                           "https://tse4.mm.bing.net/th/id/OIP.brD-4-_kgf7hupfcL9bmhAAAAA?w=300&h=450&rs=1&pid=ImgDetMain&o=7&rm=3",
        "The Midnight Library",                    "https://m.media-amazon.com/images/I/71ls-I6A5KL.jpg",
        "Sapiens",                                 "https://d30a6s96kk7rhm.cloudfront.net/original/readings/978/009/959/9780099590088.jpg"
    );

    @Bean
    CommandLineRunner seedDatabase(GenreRepository genreRepository, BookRepository bookRepository) {
        return args -> {

            if (genreRepository.count() == 0) {
                List<Genre> savedGenres = genreRepository.saveAll(List.of(
                    new Genre("Fiction",         "Stories created from imagination"),
                    new Genre("Mystery",         "Suspenseful crime and detective stories"),
                    new Genre("Science Fiction", "Speculative futures and technology"),
                    new Genre("Fantasy",         "Magical worlds and mythical beings"),
                    new Genre("Thriller",        "High-stakes tension and action"),
                    new Genre("Romance",         "Love stories and emotional journeys"),
                    new Genre("Non-Fiction",     "Real events and factual content"),
                    new Genre("Biography",       "Life stories of real people"),
                    new Genre("History",         "Exploration of past events"),
                    new Genre("Self-Help",       "Personal growth and development")
                ));

                Map<String, Genre> g = savedGenres.stream()
                    .collect(Collectors.toMap(Genre::getName, Function.identity()));

                bookRepository.saveAll(List.of(
                    new Book("The Name of the Wind", "Patrick Rothfuss", "9780756404741",
                        "A legendary figure tells his own story in this epic fantasy.",
                        COVER_URLS.get("The Name of the Wind"),
                        LocalDate.of(2007, 3, 27), g.get("Fantasy")),

                    new Book("Project Hail Mary", "Andy Weir", "9780593135204",
                        "A lone astronaut must save Earth from an extinction-level threat.",
                        COVER_URLS.get("Project Hail Mary"),
                        LocalDate.of(2021, 5, 4), g.get("Science Fiction")),

                    new Book("Gone Girl", "Gillian Flynn", "9780307588371",
                        "A marriage with secrets unravels through twisting perspectives.",
                        COVER_URLS.get("Gone Girl"),
                        LocalDate.of(2012, 6, 5), g.get("Thriller")),

                    new Book("The Great Gatsby", "F. Scott Fitzgerald", "9780743273565",
                        "A tale of wealth, love, and the American Dream in the Jazz Age.",
                        COVER_URLS.get("The Great Gatsby"),
                        LocalDate.of(1925, 4, 10), g.get("Fiction")),

                    new Book("Educated", "Tara Westover", "9780399590504",
                        "A memoir of a woman who leaves her survivalist family to discover education.",
                        COVER_URLS.get("Educated"),
                        LocalDate.of(2018, 2, 20), g.get("Biography")),

                    new Book("The Hitchhiker's Guide to the Galaxy", "Douglas Adams", "9780345391803",
                        "A comedic sci-fi odyssey through space with a bewildered human.",
                        COVER_URLS.get("The Hitchhiker's Guide to the Galaxy"),
                        LocalDate.of(1979, 10, 12), g.get("Science Fiction")),

                    new Book("In the Woods", "Tana French", "9780143113492",
                        "A detective investigates a murder near the site of a childhood trauma.",
                        COVER_URLS.get("In the Woods"),
                        LocalDate.of(2007, 5, 22), g.get("Mystery")),

                    new Book("Atomic Habits", "James Clear", "9780735211292",
                        "A framework for building good habits and breaking bad ones.",
                        COVER_URLS.get("Atomic Habits"),
                        LocalDate.of(2018, 10, 16), g.get("Self-Help")),

                    new Book("The Midnight Library", "Matt Haig", "9780525559474",
                        "A woman discovers a library between life and death with infinite possibilities.",
                        COVER_URLS.get("The Midnight Library"),
                        LocalDate.of(2020, 9, 29), g.get("Fiction")),

                    new Book("Sapiens", "Yuval Noah Harari", "9780062316097",
                        "A brief history of humankind from ancient ancestors to modern civilization.",
                        COVER_URLS.get("Sapiens"),
                        LocalDate.of(2011, 1, 1), g.get("History"))
                ));

                System.out.println("[BookedIn] Database seeded: 10 genres, 10 books.");
            }

            // Always run: update cover URLs for existing books
            bookRepository.findAll().forEach(book -> {
                String correctUrl = COVER_URLS.get(book.getTitle());
                if (correctUrl != null && !correctUrl.equals(book.getCoverImageUrl())) {
                    book.setCoverImageUrl(correctUrl);
                    bookRepository.save(book);
                    System.out.println("[BookedIn] Updated cover for: " + book.getTitle());
                }
            });

            // Always run: seed additional 20 books if not already present
            java.util.Set<String> existingTitles = bookRepository.findAll().stream()
                .map(Book::getTitle)
                .collect(java.util.stream.Collectors.toSet());

            Map<String, Genre> allGenres = genreRepository.findAll().stream()
                .collect(Collectors.toMap(Genre::getName, Function.identity()));

            java.util.List<Book> extraBooks = new java.util.ArrayList<>();

            java.util.Map<String, String> extra = new java.util.LinkedHashMap<>();
            extra.put("The Alchemist",                        "https://covers.openlibrary.org/b/id/7414780-L.jpg");
            extra.put("To Kill a Mockingbird",                "https://cdn2.penguin.com.au/covers/original/9781784870799.jpg");
            extra.put("1984",                                  "https://m.media-amazon.com/images/I/81qZ5kGMQ1L.jpg");
            extra.put("Harry Potter and the Sorcerer's Stone", "https://images.squarespace-cdn.com/content/v1/58c180edff7c50dd0e51a2ad/1570651802069-75DYDA5NS7K8AQS79MCO/Harry-Potter-and-the-Sorcerers-Stone-Book-Cover-1024x1473.jpg");
            extra.put("The Da Vinci Code",                    "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1720313229i/968.jpg");
            extra.put("Dune",                                  "https://m.media-amazon.com/images/I/81nq+ewtkcL.jpg");
            extra.put("The Hunger Games",                     "https://m.media-amazon.com/images/I/71jagxetc9L._SL1500_.jpg");
            extra.put("The Girl with the Dragon Tattoo",      "https://www.bookgeeks.in/wp-content/uploads/2017/04/the-girl-with-the-dragon-tattoo.jpg");
            extra.put("The Kite Runner",                      "https://covers.openlibrary.org/b/id/14846827-L.jpg");
            extra.put("Norwegian Wood",                       "https://tse3.mm.bing.net/th/id/OIP.Ofc3MomsBv95cnNKO5AShAHaLS?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3");
            extra.put("Brave New World",                      "https://i.pinimg.com/originals/93/8b/a3/938ba3ce350426d147599c207d8fbb8b.png");
            extra.put("The Road",                             "https://tse2.mm.bing.net/th/id/OIP.XJbME-F2Hue45-N34msmsgAAAA?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3");
            extra.put("Life of Pi",                           "https://images.thenile.io/r1000/9781786894243.jpg");
            extra.put("The Fault in Our Stars",               "https://tse4.mm.bing.net/th/id/OIP.TF1ylGg05itN8KD5u17i5gHaMW?rs=1&pid=ImgDetMain&o=7&rm=3");
            extra.put("Becoming",                             "https://cdn2.penguin.com.au/covers/original/9780241334140.jpg");
            extra.put("Think and Grow Rich",                  "https://tse4.mm.bing.net/th/id/OIP.XRRG_S7h6PW-cT3fdtHgEwHaLQ?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3");
            extra.put("The Power of Now",                     "https://m.media-amazon.com/images/I/71-zqlETKcL._SL1500_.jpg");
            extra.put("Rich Dad Poor Dad",                    "https://cdn.penguin.co.in/wp-content/uploads/2023/12/9781612681139-1-scaled.jpg");
            extra.put("The Body Keeps the Score",             "https://m.media-amazon.com/images/I/71Ha3OShqSL._SL1500_.jpg");
            extra.put("The Seven Husbands of Evelyn Hugo",    "https://d28hgpri8am2if.cloudfront.net/book_images/onix/cvr9781761102943/the-seven-husbands-of-evelyn-hugo-9781761102943_hr.jpg");

            if (!existingTitles.contains("The Alchemist"))
                extraBooks.add(new Book("The Alchemist", "Paulo Coelho", "9780062315007",
                    "A shepherd boy travels from Spain to Egypt in search of a worldly treasure.",
                    extra.get("The Alchemist"), LocalDate.of(1988, 1, 1), allGenres.get("Fiction")));

            if (!existingTitles.contains("To Kill a Mockingbird")) {
                System.out.println("books");
                extraBooks.add(new Book("To Kill a Mockingbird", "Harper Lee", "9780061935466",
                        "A young girl witnesses racial injustice in the American South through her father's eyes.",
                        extra.get("To Kill a Mockingbird"), LocalDate.of(1960, 7, 11), allGenres.get("Fiction")));
            }
            if (!existingTitles.contains("1984"))
                extraBooks.add(new Book("1984", "George Orwell", "9780451524935",
                    "A totalitarian society surveils and controls every aspect of life in a dystopian future.",
                    extra.get("1984"), LocalDate.of(1949, 6, 8), allGenres.get("Science Fiction")));

            if (!existingTitles.contains("Harry Potter and the Sorcerer's Stone"))
                extraBooks.add(new Book("Harry Potter and the Sorcerer's Stone", "J.K. Rowling", "9780590353427",
                    "A young boy discovers he is a wizard and begins his education at Hogwarts School.",
                    extra.get("Harry Potter and the Sorcerer's Stone"), LocalDate.of(1997, 6, 26), allGenres.get("Fantasy")));

            if (!existingTitles.contains("The Da Vinci Code"))
                extraBooks.add(new Book("The Da Vinci Code", "Dan Brown", "9780307474278",
                    "A symbologist unravels a centuries-old mystery hidden within famous works of art.",
                    extra.get("The Da Vinci Code"), LocalDate.of(2003, 3, 18), allGenres.get("Thriller")));

            if (!existingTitles.contains("Dune"))
                extraBooks.add(new Book("Dune", "Frank Herbert", "9780441013593",
                    "A young nobleman navigates politics, religion, and ecology on a desert planet.",
                    extra.get("Dune"), LocalDate.of(1965, 8, 1), allGenres.get("Science Fiction")));

            if (!existingTitles.contains("The Hunger Games"))
                extraBooks.add(new Book("The Hunger Games", "Suzanne Collins", "9780439023481",
                    "In a dystopian future, a teenager fights for survival in a televised death tournament.",
                    extra.get("The Hunger Games"), LocalDate.of(2008, 9, 14), allGenres.get("Science Fiction")));

            if (!existingTitles.contains("The Girl with the Dragon Tattoo"))
                extraBooks.add(new Book("The Girl with the Dragon Tattoo", "Stieg Larsson", "9780307949486",
                    "A journalist and a hacker investigate a decades-old disappearance in a wealthy family.",
                    extra.get("The Girl with the Dragon Tattoo"), LocalDate.of(2005, 8, 1), allGenres.get("Mystery")));

            if (!existingTitles.contains("The Kite Runner"))
                extraBooks.add(new Book("The Kite Runner", "Khaled Hosseini", "9781594631931",
                    "A man confronts his past and seeks redemption against the backdrop of Afghanistan's history.",
                    extra.get("The Kite Runner"), LocalDate.of(2003, 5, 29), allGenres.get("Fiction")));

            if (!existingTitles.contains("Norwegian Wood"))
                extraBooks.add(new Book("Norwegian Wood", "Haruki Murakami", "9780375704024",
                    "A nostalgic story of loss, sexuality, and coming of age in 1960s Tokyo.",
                    extra.get("Norwegian Wood"), LocalDate.of(1987, 9, 4), allGenres.get("Fiction")));

            if (!existingTitles.contains("Brave New World"))
                extraBooks.add(new Book("Brave New World", "Aldous Huxley", "9780060850524",
                    "A utopian society engineered for happiness confronts the cost of its own perfection.",
                    extra.get("Brave New World"), LocalDate.of(1932, 1, 1), allGenres.get("Science Fiction")));

            if (!existingTitles.contains("The Road"))
                extraBooks.add(new Book("The Road", "Cormac McCarthy", "9780307387899",
                    "A father and son traverse a bleak post-apocalyptic landscape, clinging to survival.",
                    extra.get("The Road"), LocalDate.of(2006, 9, 26), allGenres.get("Fiction")));

            if (!existingTitles.contains("Life of Pi"))
                extraBooks.add(new Book("Life of Pi", "Yann Martel", "9780156027328",
                    "A boy survives a shipwreck and spends 227 days on a lifeboat with a Bengal tiger.",
                    extra.get("Life of Pi"), LocalDate.of(2001, 9, 11), allGenres.get("Fiction")));

            if (!existingTitles.contains("The Fault in Our Stars"))
                extraBooks.add(new Book("The Fault in Our Stars", "John Green", "9780525478812",
                    "Two teenagers with cancer fall in love and face the beauty and tragedy of life together.",
                    extra.get("The Fault in Our Stars"), LocalDate.of(2012, 1, 10), allGenres.get("Romance")));

            if (!existingTitles.contains("Becoming"))
                extraBooks.add(new Book("Becoming", "Michelle Obama", "9781524763138",
                    "The former First Lady of the United States reflects on her roots, journey, and identity.",
                    extra.get("Becoming"), LocalDate.of(2018, 11, 13), allGenres.get("Biography")));

            if (!existingTitles.contains("Think and Grow Rich"))
                extraBooks.add(new Book("Think and Grow Rich", "Napoleon Hill", "9781585424337",
                    "A timeless guide to achieving success through mindset, persistence, and clear goals.",
                    extra.get("Think and Grow Rich"), LocalDate.of(1937, 3, 1), allGenres.get("Self-Help")));

            if (!existingTitles.contains("The Power of Now"))
                extraBooks.add(new Book("The Power of Now", "Eckhart Tolle", "9781577314806",
                    "A spiritual guide to achieving enlightenment by living fully in the present moment.",
                    extra.get("The Power of Now"), LocalDate.of(1997, 1, 1), allGenres.get("Self-Help")));

            if (!existingTitles.contains("Rich Dad Poor Dad"))
                extraBooks.add(new Book("Rich Dad Poor Dad", "Robert Kiyosaki", "9781612680194",
                    "Contrasting financial philosophies reveal the mindset needed to build lasting wealth.",
                    extra.get("Rich Dad Poor Dad"), LocalDate.of(1997, 4, 1), allGenres.get("Self-Help")));

            if (!existingTitles.contains("The Body Keeps the Score"))
                extraBooks.add(new Book("The Body Keeps the Score", "Bessel van der Kolk", "9780143127741",
                    "An exploration of how trauma reshapes the brain and body, and pathways to recovery.",
                    extra.get("The Body Keeps the Score"), LocalDate.of(2014, 9, 25), allGenres.get("Non-Fiction")));

            if (!existingTitles.contains("The Seven Husbands of Evelyn Hugo"))
                extraBooks.add(new Book("The Seven Husbands of Evelyn Hugo", "Taylor Jenkins Reid", "9781501161933",
                    "A reclusive Hollywood icon finally reveals the secrets of her scandalous life.",
                    extra.get("The Seven Husbands of Evelyn Hugo"), LocalDate.of(2017, 6, 13), allGenres.get("Fiction")));

            if (!extraBooks.isEmpty()) {
                bookRepository.saveAll(extraBooks);
                System.out.println("[BookedIn] Added " + extraBooks.size() + " new books.");
            }

        };
    }
}
