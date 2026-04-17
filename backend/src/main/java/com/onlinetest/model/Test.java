package com.onlinetest.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "tests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Test {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(nullable = false)
    private int durationMinutes;

    @Builder.Default
    private boolean shuffleQuestions = true;

    @Builder.Default
    private boolean shuffleOptions = true;

    @Builder.Default
    private boolean isPublished = false;

    @Builder.Default
    private boolean isActive = true;

    @Builder.Default
    private boolean isPrivate = false;

    // Comma-separated allowed emails for private tests
    @Column(columnDefinition = "TEXT")
    private String allowedEmails;

    // When to reveal answers to candidates
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ShowAnswers showAnswers = ShowAnswers.IMMEDIATELY;

    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;

    @OneToMany(mappedBy = "test", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Question> questions = new ArrayList<>();

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum ShowAnswers {
        IMMEDIATELY,   // Right after submission
        AFTER_EXPIRY,  // After expiresAt passes
        NEVER          // Never show answers
    }

    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(LocalDateTime.now());
    }
}
