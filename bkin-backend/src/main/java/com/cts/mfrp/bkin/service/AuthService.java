package com.cts.mfrp.bkin.service;

import com.cts.mfrp.bkin.dto.*;
import com.cts.mfrp.bkin.entity.Genre;
import com.cts.mfrp.bkin.entity.User;
import com.cts.mfrp.bkin.repository.GenreRepository;
import com.cts.mfrp.bkin.repository.UserRepository;
import com.cts.mfrp.bkin.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Set;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final GenreRepository genreRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository, GenreRepository genreRepository,
                       PasswordEncoder passwordEncoder, JwtTokenProvider tokenProvider,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.genreRepository = genreRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.authenticationManager = authenticationManager;
    }

    public AuthResponse signup(SignupRequest request) {
        // Step 1: save the user in its own transaction — commits immediately on return
        saveNewUser(request);

        // Step 2: now the row is committed, authenticate safely
        Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        User user = userRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> new RuntimeException("User not found after signup"));
        return new AuthResponse(tokenProvider.generateToken(auth), user.getUsername(), user.getDisplayName());
    }

    /** Derives a unique, URL-safe username from the display name. */
    private String generateUsername(String displayName) {
        // Strip anything that isn't a letter or digit, collapse runs, trim underscores
        String base = displayName.toLowerCase()
                .replaceAll("[^a-z0-9]+", "")
                .replaceAll("^_+|_+$", "");
        if (base.isEmpty()) base = "reader";
        if (base.length() > 28) base = base.substring(0, 28);

        // Ensure uniqueness by appending an incrementing suffix when needed
        String candidate = base;
        int suffix = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = base + suffix++;
        }
        return candidate;
    }

    @Transactional
    public void saveNewUser(SignupRequest request) {
        // displayName is now the user-facing unique name — derive an internal username from it
        String generatedUsername = generateUsername(request.getDisplayName());
        request.setUsername(generatedUsername);

        if (userRepository.existsByEmail(request.getEmail()))
            throw new IllegalArgumentException("Email already registered");
        // Also guard against displayName collisions so it stays unique
        if (userRepository.existsByDisplayName(request.getDisplayName()))
            throw new IllegalArgumentException("That display name is already taken. Please choose another.");

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setDisplayName(request.getDisplayName());

        if (request.getInterests() != null && !request.getInterests().isEmpty()) {
            Set<Genre> genres = genreRepository.findByNameIn(request.getInterests());
            user.setInterests(genres);
        }
        if (request.getDateOfBirth() != null && !request.getDateOfBirth().isBlank())
            user.setDateOfBirth(LocalDate.parse(request.getDateOfBirth()));
        if (request.getGender() != null) user.setGender(request.getGender());
        if (request.getCountry() != null) user.setCountry(request.getCountry());

        userRepository.save(user);
        // @Transactional commits here — user is now visible to all transactions
    }

    public AuthResponse login(AuthRequest request) {
        // Users now log in with their display name — resolve it to the internal username first
        String internalUsername = userRepository.findByDisplayName(request.getUsername())
                .map(User::getUsername)
                .orElse(request.getUsername()); // fall back to raw value (supports existing accounts)

        Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(internalUsername, request.getPassword())
        );
        User user = userRepository.findByUsername(internalUsername)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return new AuthResponse(tokenProvider.generateToken(auth), user.getUsername(), user.getDisplayName());
    }
}
