package com.onlinetest.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "candidate_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Test test;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Candidate candidate;

    @Column(nullable = false)
    private String candidateName;

    @Column(nullable = false)
    private String candidateEmail;

    @Builder.Default
    private boolean completed = false;

    @Builder.Default
    private boolean forceSubmitted = false;

    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;

    @Column(columnDefinition = "TEXT")
    private String savedAnswers; // JSON representation of partial answers


    @Column(columnDefinition = "TEXT")
    private String shuffledQuestionOrder; // JSON array of question IDs

    @Builder.Default
    private int tabSwitchCount = 0;

    @Builder.Default
    private int fullscreenExitCount = 0;

    @Builder.Default
    private int violationCount = 0;

    @PrePersist
    public void onCreate() {
        startedAt = LocalDateTime.now();
    }
}
