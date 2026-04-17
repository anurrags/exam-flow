package com.onlinetest.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onlinetest.dto.CandidateAuthRequest;
import com.onlinetest.dto.StartSessionRequest;
import com.onlinetest.dto.SubmitAnswersRequest;
import com.onlinetest.dto.ViolationRequest;
import com.onlinetest.model.*;
import com.onlinetest.service.CandidateService;
import com.onlinetest.service.ResultService;
import com.onlinetest.service.SessionService;
import com.onlinetest.service.TestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.util.*;

@RestController
@RequestMapping("/api/candidate")
@RequiredArgsConstructor
public class CandidateController {

    private final TestService testService;
    private final SessionService sessionService;
    private final ResultService resultService;
    private final CandidateService candidateService;
    private final ObjectMapper objectMapper;

    // ── Auth ──────────────────────────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody CandidateAuthRequest req) {
        try {
            Candidate c = candidateService.register(req);
            return ResponseEntity.status(HttpStatus.CREATED).body(toCandidateMap(c));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody CandidateAuthRequest req) {
        try {
            Candidate c = candidateService.login(req.getEmail(), req.getPassword());
            return ResponseEntity.ok(toCandidateMap(c));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    /**
     * GET /api/candidate/{candidateId}/dashboard
     * Returns all published tests visible to this candidate, with attempt status.
     */
    @GetMapping("/{candidateId}/dashboard")
    public ResponseEntity<?> getDashboard(@PathVariable UUID candidateId) {
        Candidate candidate = candidateService.findById(candidateId).orElse(null);
        if (candidate == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Candidate not found"));

        List<Test> allTests = testService.getAllTests();
        List<CandidateSession> mySessions = sessionService.getSessionsForCandidate(candidateId);
        Map<UUID, CandidateSession> sessionByTest = new HashMap<>();
        mySessions.forEach(s -> sessionByTest.put(s.getTest().getId(), s));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Test t : allTests) {
            if (!t.isPublished() || !t.isActive()) continue;

            // Private test: only show if candidate email is in allowedEmails
            if (t.isPrivate()) {
                String allowed = t.getAllowedEmails();
                if (allowed == null || !Arrays.asList(allowed.split(",")).contains(candidate.getEmail())) continue;
            } else {
                // Public test: only show if they have explicitly viewed it or started it
                CandidateSession session = sessionByTest.get(t.getId());
                if (session == null && !candidate.getViewedTests().contains(t)) {
                    continue; // Skip public tests they haven't explicitly opened
                }
            }

            CandidateSession session = sessionByTest.get(t.getId());

            if (session != null && !session.isCompleted() && t.isExpired()) {
                resultService.gradePartialSession(session, t);
                sessionService.markCompleted(session.getId(), true);
                session.setCompleted(true);
                session.setForceSubmitted(true);
            }

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("testId", t.getId());
            entry.put("title", t.getTitle());
            entry.put("durationMinutes", t.getDurationMinutes());
            entry.put("isExpired", t.isExpired());
            entry.put("expiresAt", t.getExpiresAt());
            entry.put("isPrivate", t.isPrivate());
            entry.put("totalMarks", t.getQuestions().stream().mapToInt(Question::getMarks).sum());
            entry.put("questionCount", t.getQuestions().size());

            if (session != null) {
                entry.put("status", session.isCompleted() ? "COMPLETED" : "IN_PROGRESS");
                entry.put("sessionId", session.getId());

                if (session.isCompleted()) {
                    resultService.getResultBySessionId(session.getId()).ifPresent(r -> {
                        boolean showNow = canShowAnswers(t, r);
                        entry.put("marksObtained", r.getMarksObtained());
                        entry.put("totalMarks", r.getTotalMarks());
                        entry.put("percentage", r.getTotalMarks() > 0 ? Math.round(r.getMarksObtained() * 100.0 / r.getTotalMarks()) : 0);
                        entry.put("answersVisible", showNow);
                    });
                }
            } else {
                entry.put("status", t.isExpired() ? "EXPIRED" : "AVAILABLE");
            }

            result.add(entry);
        }
        return ResponseEntity.ok(result);
    }

    // ── Test Info (public) ────────────────────────────────────────────────────

    @GetMapping("/test/{testId}/info")
    public ResponseEntity<?> getTestInfo(@PathVariable UUID testId, @RequestParam(required = false) UUID candidateId) {
        return testService.getTestById(testId).map(test -> {
            if (!test.isPublished() || !test.isActive())
                return ResponseEntity.status(HttpStatus.GONE).body((Object) Map.of("error", "Test not available"));

            Candidate candidate = null;
            if (candidateId != null) {
                candidate = candidateService.findById(candidateId).orElse(null);
                if (candidate != null) {
                    candidate.getViewedTests().add(test);
                    candidateService.save(candidate);
                }
            }

            if (test.isPrivate()) {
                if (candidate == null) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body((Object) Map.of("error", "Private test. Please log in first."));
                }
                String allowed = test.getAllowedEmails();
                if (allowed == null || !Arrays.asList(allowed.split(",")).contains(candidate.getEmail())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body((Object) Map.of("error", "You are not authorized for this private test"));
                }
            }

            Map<String, Object> info = new LinkedHashMap<>();
            info.put("id", test.getId());
            info.put("title", test.getTitle());
            info.put("instructions", test.getInstructions());
            info.put("durationMinutes", test.getDurationMinutes());
            info.put("questionCount", test.getQuestions().size());
            info.put("totalMarks", test.getQuestions().stream().mapToInt(Question::getMarks).sum());
            info.put("isExpired", test.isExpired());
            info.put("expiresAt", test.getExpiresAt());
            return ResponseEntity.ok((Object) info);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Start Session ─────────────────────────────────────────────────────────

    @PostMapping("/test/{testId}/start")
    public ResponseEntity<?> startTest(@PathVariable UUID testId, @RequestBody StartSessionRequest req) {
        return testService.getTestById(testId).map(test -> {
            if (!test.isPublished() || !test.isActive())
                return ResponseEntity.status(HttpStatus.GONE).body((Object) Map.of("error", "Test not available"));
            if (test.isExpired())
                return ResponseEntity.status(HttpStatus.GONE).body((Object) Map.of("error", "This test has expired"));

            // Find candidate
            Candidate candidate = candidateService.findByEmail(req.getCandidateEmail()).orElse(null);
            if (candidate == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body((Object) Map.of("error", "Please register or log in before taking the test"));
            }

            // Check re-attempt
            Optional<CandidateSession> existing = sessionService.findExistingSession(candidate.getId(), testId);
            if (existing.isPresent()) {
                CandidateSession es = existing.get();
                Map<String, Object> resp = new LinkedHashMap<>();
                resp.put("alreadyAttempted", true);
                resp.put("sessionId", es.getId());
                resp.put("completed", es.isCompleted());
                resp.put("submittedAt", es.getSubmittedAt());
                return ResponseEntity.status(HttpStatus.CONFLICT).body((Object) resp);
            }

            // Check private test access
            if (test.isPrivate()) {
                String allowed = test.getAllowedEmails();
                if (allowed == null || !Arrays.asList(allowed.split(",")).contains(candidate.getEmail())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body((Object) Map.of("error", "You are not authorized for this private test"));
                }
            }

            CandidateSession session = sessionService.startSession(test, req, candidate);

            List<Long> questionOrder;
            try {
                questionOrder = objectMapper.readValue(session.getShuffledQuestionOrder(), new TypeReference<List<Long>>() {});
            } catch (Exception e) {
                questionOrder = test.getQuestions().stream().map(Question::getId).toList();
            }

            Map<Long, Question> qMap = new HashMap<>();
            test.getQuestions().forEach(q -> qMap.put(q.getId(), q));

            List<Map<String, Object>> questions = questionOrder.stream()
                    .filter(qMap::containsKey)
                    .map(qId -> buildCandidateQuestion(qMap.get(qId), test.isShuffleOptions()))
                    .toList();

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("sessionId", session.getId());
            response.put("testTitle", test.getTitle());
            response.put("durationMinutes", test.getDurationMinutes());
            response.put("startedAt", session.getStartedAt());
            response.put("questions", questions);
            return ResponseEntity.ok((Object) response);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Submit & Autosave ─────────────────────────────────────────────────────

    @PostMapping("/test/autosave")
    public ResponseEntity<?> autoSave(@RequestBody SubmitAnswersRequest req) {
        try {
            UUID sessionId = UUID.fromString(req.getSessionId());
            return sessionService.getSession(sessionId).map(session -> {
                if (session.isCompleted() || session.isForceSubmitted()) {
                    return ResponseEntity.badRequest().build();
                }
                try {
                    String answersJson = objectMapper.writeValueAsString(req.getAnswers());
                    session.setSavedAnswers(answersJson);
                    sessionService.save(session);
                } catch (Exception e) {
                    // ignore
                }
                return ResponseEntity.ok().build();
            }).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/test/submit")
    public ResponseEntity<?> submitTest(@RequestBody SubmitAnswersRequest req) {
        UUID sessionId = UUID.fromString(req.getSessionId());
        return sessionService.getSession(sessionId).map(session -> {
            if (session.isCompleted()) {
                return resultService.getResultBySessionId(sessionId)
                        .map(r -> {
                            Test test = session.getTest();
                            return testService.getTestById(test.getId())
                                    .map(ft -> ResponseEntity.ok((Object) buildResultResponse(r, session, ft)))
                                    .orElse(ResponseEntity.ok((Object) buildResultResponse(r, session, null)));
                        })
                        .orElse(ResponseEntity.badRequest().build());
            }
            return testService.getTestById(session.getTest().getId()).map(fullTest -> {
                TestResult result = resultService.calculateAndSave(session, fullTest, req);
                sessionService.markCompleted(sessionId, false);
                return ResponseEntity.ok((Object) buildResultResponse(result, session, fullTest));
            }).orElse(ResponseEntity.badRequest().build());
        }).orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Session not found")));
    }

    // ── Violation ─────────────────────────────────────────────────────────────

    @PostMapping("/test/violation")
    public ResponseEntity<?> logViolation(@RequestBody ViolationRequest req) {
        sessionService.logViolation(req);
        return ResponseEntity.ok(Map.of("logged", true));
    }

    // ── Result ────────────────────────────────────────────────────────────────

    @GetMapping("/test/result/{sessionId}")
    public ResponseEntity<?> getResult(@PathVariable UUID sessionId) {
        return sessionService.getSession(sessionId).map(session ->
                resultService.getResultBySessionId(sessionId)
                        .map(r -> testService.getTestById(session.getTest().getId())
                                .map(ft -> ResponseEntity.ok((Object) buildResultResponse(r, session, ft)))
                                .orElse(ResponseEntity.ok((Object) buildResultResponse(r, session, null))))
                        .orElse(ResponseEntity.notFound().build())
        ).orElse(ResponseEntity.notFound().build());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private boolean canShowAnswers(Test test, TestResult r) {
        if (test.getShowAnswers() == null) return true;
        return switch (test.getShowAnswers()) {
            case IMMEDIATELY -> true;
            case AFTER_EXPIRY -> test.isExpired();
            case NEVER -> false;
        };
    }

    private Map<String, Object> buildResultResponse(TestResult r, CandidateSession session, Test test) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("sessionId", session.getId());
        res.put("candidateName", session.getCandidateName());
        res.put("candidateEmail", session.getCandidateEmail());
        res.put("marksObtained", r.getMarksObtained());
        res.put("totalMarks", r.getTotalMarks());
        res.put("percentage", r.getTotalMarks() > 0 ? Math.round(r.getMarksObtained() * 100.0 / r.getTotalMarks()) : 0);
        res.put("totalQuestions", r.getTotalQuestions());
        res.put("correctAnswers", r.getCorrectAnswers());
        res.put("incorrectAnswers", r.getIncorrectAnswers());
        res.put("skippedAnswers", r.getSkippedAnswers());
        res.put("timeTakenSeconds", r.getTimeTakenSeconds());
        res.put("violationCount", session.getViolationCount());
        res.put("forceSubmitted", session.isForceSubmitted());

        // Apply show-answers policy
        boolean showAnswers = test == null || canShowAnswers(test, r);
        res.put("answersVisible", showAnswers);
        if (showAnswers) {
            try {
                res.put("breakdown", objectMapper.readValue(r.getAnswerBreakdown(), new TypeReference<List<?>>() {}));
            } catch (Exception e) { res.put("breakdown", List.of()); }
        } else {
            res.put("breakdown", null);
            if (test != null && test.getShowAnswers() == Test.ShowAnswers.AFTER_EXPIRY && test.getExpiresAt() != null) {
                res.put("answersVisibleAfter", test.getExpiresAt());
            }
        }
        return res;
    }

    private Map<String, Object> buildCandidateQuestion(Question q, boolean shuffleOptions) {
        Map<String, Object> qMap = new LinkedHashMap<>();
        qMap.put("id", q.getId());
        qMap.put("questionText", q.getQuestionText());
        qMap.put("type", q.getType().name());
        qMap.put("marks", q.getMarks());
        List<Map<String, Object>> options = new ArrayList<>(q.getOptions().stream()
                .sorted(Comparator.comparingInt(Option::getOrderIndex))
                .map(o -> {
                    Map<String, Object> om = new LinkedHashMap<>();
                    om.put("id", o.getId());
                    om.put("optionText", o.getOptionText());
                    return om;
                }).toList());
        if (shuffleOptions && !options.isEmpty()) Collections.shuffle(options);
        qMap.put("options", options);
        return qMap;
    }

    private Map<String, Object> toCandidateMap(Candidate c) {
        return Map.of("id", c.getId(), "name", c.getName(), "email", c.getEmail());
    }
}
