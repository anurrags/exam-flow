package com.onlinetest.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Test test;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionType type;

    private int marks;

    @Column(columnDefinition = "TEXT")
    private String correctAnswers; // JSON array of correct answer strings

    @Column(nullable = false)
    @Builder.Default
    private int orderIndex = 0;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<Option> options = new ArrayList<>();

    public enum QuestionType {
        MCQ,        // Single choice from multiple options
        MAQ,        // Multiple answers from multiple options
        SINGLE_VALUE, // Text/number input
        TRUE_FALSE  // True or False
    }
}
