package com.onlinetest.repository;

import com.onlinetest.model.CandidateSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CandidateSessionRepository extends JpaRepository<CandidateSession, UUID> {
    List<CandidateSession> findByTestId(UUID testId);
    List<CandidateSession> findByCandidateId(UUID candidateId);
    Optional<CandidateSession> findByCandidateIdAndTestId(UUID candidateId, UUID testId);
    Optional<CandidateSession> findByCandidateEmailAndTestId(String email, UUID testId);
}
