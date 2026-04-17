package com.onlinetest.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onlinetest.dto.StartSessionRequest;
import com.onlinetest.dto.ViolationRequest;
import com.onlinetest.model.*;
import com.onlinetest.repository.CandidateSessionRepository;
import com.onlinetest.repository.ViolationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SessionService {

    private final CandidateSessionRepository sessionRepository;
    private final ViolationRepository violationRepository;
    private final ObjectMapper objectMapper;

    /**
     * Returns existing completed session if candidate already took this test.
     * Returns empty Optional if candidate hasn't taken it yet.
     */
    public Optional<CandidateSession> findExistingSession(UUID candidateId, UUID testId) {
        return sessionRepository.findByCandidateIdAndTestId(candidateId, testId);
    }

    @Transactional
    public CandidateSession startSession(Test test, StartSessionRequest req, Candidate candidate) {
        List<Long> questionIds = test.getQuestions().stream()
                .map(Question::getId)
                .collect(Collectors.toList());

        if (test.isShuffleQuestions()) {
            Collections.shuffle(questionIds);
        }

        String shuffledOrder;
        try {
            shuffledOrder = objectMapper.writeValueAsString(questionIds);
        } catch (JsonProcessingException e) {
            shuffledOrder = "[]";
        }

        CandidateSession session = CandidateSession.builder()
                .test(test)
                .candidate(candidate)
                .candidateName(candidate != null ? candidate.getName() : req.getCandidateName())
                .candidateEmail(candidate != null ? candidate.getEmail() : req.getCandidateEmail())
                .shuffledQuestionOrder(shuffledOrder)
                .completed(false)
                .build();

        return sessionRepository.save(session);
    }

    @Transactional
    public CandidateSession save(CandidateSession session) {
        return sessionRepository.save(session);
    }

    @Transactional
    public void logViolation(ViolationRequest req) {
        UUID sessionId = UUID.fromString(req.getSessionId());
        CandidateSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        Violation.ViolationType type = Violation.ViolationType.valueOf(req.getType());
        violationRepository.save(Violation.builder().session(session).type(type).build());

        session.setViolationCount(session.getViolationCount() + 1);
        if (type == Violation.ViolationType.TAB_SWITCH) session.setTabSwitchCount(session.getTabSwitchCount() + 1);
        else if (type == Violation.ViolationType.FULLSCREEN_EXIT) session.setFullscreenExitCount(session.getFullscreenExitCount() + 1);
        sessionRepository.save(session);
    }

    public Optional<CandidateSession> getSession(UUID sessionId) {
        return sessionRepository.findById(sessionId);
    }

    public List<CandidateSession> getSessionsForTest(UUID testId) {
        return sessionRepository.findByTestId(testId);
    }

    public List<CandidateSession> getSessionsForCandidate(UUID candidateId) {
        return sessionRepository.findByCandidateId(candidateId);
    }

    public List<Violation> getViolationsForSession(UUID sessionId) {
        return violationRepository.findBySessionId(sessionId);
    }

    @Transactional
    public void markCompleted(UUID sessionId, boolean forceSubmit) {
        CandidateSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        session.setCompleted(true);
        session.setForceSubmitted(forceSubmit);
        session.setSubmittedAt(LocalDateTime.now());
        sessionRepository.save(session);
    }
}
