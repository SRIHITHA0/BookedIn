package com.cts.mfrp.bkin.service;

import com.cts.mfrp.bkin.entity.Book;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.InetSocketAddress;
import java.net.Proxy;
import java.util.List;

@Service
public class AiChatService {

    @Value("${google.gemini.api.key}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // gemini-2.0-flash is stable and widely available
    private final String API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    /**
     * Creates a RestTemplate specifically configured to bypass the
     * corporate Zscaler firewall using the CTS Proxy.
     */
    private RestTemplate createProxiedRestTemplate() {
        // This bypasses the search for "proxy.cts.com" and connects directly
        return new RestTemplate();
    }

    public String getBotResponse(String userMessage, List<Book> booksFound) {
        try {
            RestTemplate restTemplate = createProxiedRestTemplate();

            // 1. Build the "Library Context" from the database
            StringBuilder libraryContext = new StringBuilder("\nAvailable Books:\n");
            for (Book b : booksFound) {
                libraryContext.append("- ").append(b.getTitle()).append(" by ").append(b.getAuthor()).append("\n");
            }

            // 2. Prepare the Request Body (Professional JSON Structure)
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
            e.printStackTrace();
            return "*The Library Ghost flickers and whispers...* I seem to have lost my connection to the spirit realm. Please try again in a moment! (" + e.getClass().getSimpleName() + ")";
        }
    }
}