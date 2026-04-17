package com.onlinetest.service;

import com.onlinetest.dto.CandidateAuthRequest;
import com.onlinetest.model.Candidate;
import com.onlinetest.repository.CandidateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CandidateService {

    private final CandidateRepository candidateRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Transactional
    public Candidate register(CandidateAuthRequest req) {
        if (candidateRepository.existsByEmail(req.getEmail())) {
            throw new RuntimeException("Email already registered");
        }
        Candidate c = Candidate.builder()
                .name(req.getName())
                .email(req.getEmail().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .build();
        return candidateRepository.save(c);
    }

    public Candidate login(String email, String password) {
        Candidate c = candidateRepository.findByEmail(email.toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("No account found with this email"));
        if (!passwordEncoder.matches(password, c.getPasswordHash())) {
            throw new RuntimeException("Incorrect password");
        }
        return c;
    }

    public Optional<Candidate> findById(UUID id) {
        return candidateRepository.findById(id);
    }

    @Transactional
    public Candidate save(Candidate candidate) {
        return candidateRepository.save(candidate);
    }

    public Optional<Candidate> findByEmail(String email) {
        return candidateRepository.findByEmail(email.toLowerCase().trim());
    }
}
