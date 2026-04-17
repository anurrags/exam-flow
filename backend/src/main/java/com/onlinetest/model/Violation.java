package com.onlinetest.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;


@Entity
@Table(name = "violations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Violation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private CandidateSession session;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ViolationType type;

    private LocalDateTime timestamp;

    @PrePersist
    public void onCreate() {
        timestamp = LocalDateTime.now();
    }

    public enum ViolationType {
        TAB_SWITCH,
        FULLSCREEN_EXIT,
        RIGHT_CLICK,
        COPY_ATTEMPT,
        DEVTOOLS_OPEN,
        BACK_NAVIGATION
    }
}
