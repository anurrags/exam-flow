package com.onlinetest.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "test_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TestResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private CandidateSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Test test;

    private int totalMarks;
    private int marksObtained;
    private int totalQuestions;
    private int correctAnswers;
    private int incorrectAnswers;
    private int skippedAnswers;

    @Column(columnDefinition = "TEXT")
    private String answerBreakdown; // JSON: [{questionId, given, correct, isCorrect}]

    private long timeTakenSeconds;

    private LocalDateTime calculatedAt;

    @PrePersist
    public void onCreate() {
        calculatedAt = LocalDateTime.now();
    }
}
