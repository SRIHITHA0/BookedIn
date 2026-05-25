package com.cts.mfrp.bkin.controller;

import com.cts.mfrp.bkin.dto.UpdateProfileRequest;
import com.cts.mfrp.bkin.dto.UserProfileDto;
import com.cts.mfrp.bkin.entity.Genre;
import com.cts.mfrp.bkin.entity.User;
import com.cts.mfrp.bkin.repository.GenreRepository;
import com.cts.mfrp.bkin.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final GenreRepository genreRepository;

    public UserController(UserRepository userRepository, GenreRepository genreRepository) {
        this.userRepository = userRepository;
        this.genreRepository = genreRepository;
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public ResponseEntity<UserProfileDto> getMyProfile(Principal principal) {
        User user = userRepository.findByUsernameWithInterests(principal.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(UserProfileDto.from(user));
    }

    @GetMapping("/{username}")
    @Transactional(readOnly = true)
    public ResponseEntity<UserProfileDto> getProfile(@PathVariable String username) {
        User user = userRepository.findByUsernameWithInterests(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(UserProfileDto.from(user));
    }

    /** Look up a public profile by displayName (unique since the username-removal change). */
    @GetMapping("/by-display/{displayName}")
    @Transactional(readOnly = true)
    public ResponseEntity<UserProfileDto> getProfileByDisplayName(
            @PathVariable String displayName) {
        return userRepository.findByDisplayName(displayName)
            .map(u -> ResponseEntity.ok(UserProfileDto.from(u)))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{username}/avatar")
    public ResponseEntity<byte[]> getAvatar(@PathVariable String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null || user.getProfilePictureUrl() == null) {
            return ResponseEntity.notFound().build();
        }
        String raw = user.getProfilePictureUrl();
        if (!raw.startsWith("data:")) {
            return ResponseEntity.notFound().build();
        }
        try {
            int comma = raw.indexOf(',');
            String meta = raw.substring(5, comma);          // e.g. "image/png;base64"
            String mimeType = meta.split(";")[0];            // e.g. "image/png"
            byte[] bytes = Base64.getDecoder().decode(raw.substring(comma + 1));
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(mimeType));
            headers.setCacheControl("public, max-age=86400");
            return ResponseEntity.ok().headers(headers).body(bytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/search")
    @Transactional(readOnly = true)
    public ResponseEntity<List<UserProfileDto>> searchUsers(@RequestParam(value = "q", defaultValue = "") String q) {
        if (q.isBlank()) return ResponseEntity.ok(List.of());
        List<User> users = userRepository.searchByUsernameOrDisplayName(q.trim());
        return ResponseEntity.ok(users.stream().map(UserProfileDto::from).collect(Collectors.toList()));
    }

    @GetMapping("/suggested")
    @Transactional(readOnly = true)
    public ResponseEntity<List<UserProfileDto>> getSuggestedUsers(Principal principal) {
        User me = userRepository.findByUsernameWithInterests(principal.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (me.getInterests() == null || me.getInterests().isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        List<User> suggested = userRepository.findSuggestedUsers(me.getInterests(), principal.getName());
        return ResponseEntity.ok(suggested.stream().limit(10).map(UserProfileDto::from).collect(Collectors.toList()));
    }

    @PutMapping("/me")
    @Transactional
    public ResponseEntity<UserProfileDto> updateProfile(@Valid @RequestBody UpdateProfileRequest request,
                                                         Principal principal) {
        User user = userRepository.findByUsernameWithInterests(principal.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getDisplayName() != null) user.setDisplayName(request.getDisplayName());
        if (request.getBio() != null) user.setBio(request.getBio());
        if (request.getProfilePictureUrl() != null) user.setProfilePictureUrl(request.getProfilePictureUrl());
        if (request.getDateOfBirth() != null && !request.getDateOfBirth().isBlank())
            user.setDateOfBirth(LocalDate.parse(request.getDateOfBirth()));
        if (request.getGender() != null) user.setGender(request.getGender());
        if (request.getCountry() != null) user.setCountry(request.getCountry());

        if (request.getInterests() != null && !request.getInterests().isEmpty()) {
            Set<Genre> genres = genreRepository.findByNameIn(request.getInterests());
            user.setInterests(genres);
        }

        userRepository.save(user);
        return ResponseEntity.ok(UserProfileDto.from(user));
    }
}
