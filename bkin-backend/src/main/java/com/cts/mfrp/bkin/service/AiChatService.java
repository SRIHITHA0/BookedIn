package com.cts.mfrp.bkin.service;

import com.cts.mfrp.bkin.entity.Book;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class AiChatService {

    @Value("${google.gemini.api.key}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // gemini-2.0-flash is stable and widely available
    private final String API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    // Per-user cooldown: track last call time (username -> timestamp ms)
    private final Map<String, Long> lastCallTime = new ConcurrentHashMap<>();
    private static final long COOLDOWN_MS = 4000; // 4 seconds between calls per user

    private RestTemplate createRestTemplate() {
        return new RestTemplate();
    }

    public String getBotResponse(String userMessage, List<Book> allBooks, String username) {
        // --- Per-user rate limiting ---
        long now = System.currentTimeMillis();
        Long last = lastCallTime.get(username);
        if (last != null && (now - last) < COOLDOWN_MS) {
            return "*The Library Ghost holds up a ghostly hand...* Even spirits need a moment to think! Please wait a few seconds before asking again. 👻";
        }
        lastCallTime.put(username, now);

        try {
            RestTemplate restTemplate = createRestTemplate();

            // 1. Build the "Library Context" — limit to 30 most relevant books
            //    Filter by keyword match first, then fall back to first 30
            String query = userMessage.toLowerCase();
            List<Book> relevantBooks = allBooks.stream()
                    .filter(b -> b.getTitle().toLowerCase().contains(query)
                            || b.getAuthor().toLowerCase().contains(query)
                            || (b.getGenre() != null && b.getGenre().toLowerCase().contains(query)))
                    .limit(20)
                    .collect(Collectors.toList());

            // If no keyword match, just send the first 30 books as general context
            if (relevantBooks.isEmpty()) {
                relevantBooks = allBooks.stream().limit(30).collect(Collectors.toList());
            }

            StringBuilder libraryContext = new StringBuilder("\n\nLibrary Books (sample):\n");
            for (Book b : relevantBooks) {
                libraryContext.append("- ").append(b.getTitle()).append(" by ").append(b.getAuthor());
                if (b.getGenre() != null) libraryContext.append(" [").append(b.getGenre()).append("]");
                libraryContext.append("\n");
            }

            // 2. Prepare the Request Body
            ObjectNode requestNode = objectMapper.createObjectNode();

            // System Instruction: Sets the "Library Ghost" personality
            ObjectNode sysInstr = objectMapper.createObjectNode();
            sysInstr.set("parts", objectMapper.createArrayNode()
                    .add(objectMapper.createObjectNode()
                            .put("text", "You are the 'Library Ghost' for BookedIn. Use the provided book list to help users. Be spooky but helpful.")));
            requestNode.set("systemInstruction", sysInstr);

            // Contents: User message + Book context
            ArrayNode contents = objectMapper.createArrayNode();
            ObjectNode userTurn = objectMapper.createObjectNode();
            userTurn.put("role", "user");
            userTurn.set("parts", objectMapper.createArrayNode()
                    .add(objectMapper.createObjectNode()
                            .put("text", userMessage + libraryContext.toString())));
            contents.add(userTurn);
            requestNode.set("contents", contents);

            // 3. Set Headers & Execute
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestNode), headers);
            String fullUrl = API_URL + "?key=" + apiKey.trim();

            ResponseEntity<String> response = restTemplate.postForEntity(fullUrl, entity, String.class);

            // 4. Parse the AI's response
            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();

        } catch (Exception e) {
            String errorType = e.getClass().getSimpleName();
            if (errorType.contains("TooManyRequests") || errorType.contains("429")
                    || (e.getMessage() != null && e.getMessage().contains("429"))) {
                return "*The Library Ghost is overwhelmed with visitors...* The spirit realm is very busy right now. Please wait a moment and try again! 👻";
            }
            if (errorType.contains("Unauthorized") || errorType.contains("403")) {
                return "*The Library Ghost is locked out...* There seems to be an issue with my connection. Please contact the BookedIn team! 👻";
            }
            e.printStackTrace();
            return "*The Library Ghost flickers and whispers...* I seem to have lost my connection to the spirit realm. Please try again in a moment! 👻";
        }
    }
}