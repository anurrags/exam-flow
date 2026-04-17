package com.onlinetest.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onlinetest.dto.TestRequest;
import com.onlinetest.model.*;
import com.onlinetest.service.ResultService;
import com.onlinetest.service.SessionService;
import com.onlinetest.service.TestService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final TestService testService;
    private final SessionService sessionService;
    private final ResultService resultService;
    private final ObjectMapper objectMapper;

    @Value("${admin.token}")
    private String adminToken;

    // ---- Auth ----
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        if (adminToken.equals(body.get("token")))
            return ResponseEntity.ok(Map.of("success", true, "token", adminToken));
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
    }

    // ---- Tests ----
    @GetMapping("/tests")
    public ResponseEntity<?> getAllTests(@RequestHeader("X-Admin-Token") String token) {
        if (!isValid(token)) return unauthorized();
        return ResponseEntity.ok(testService.getAllTests().stream().map(this::toTestSummary).toList());
    }

    @GetMapping("/tests/{id}")
    public ResponseEntity<?> getTest(@RequestHeader("X-Admin-Token") String token, @PathVariable UUID id) {
        if (!isValid(token)) return unauthorized();
        return testService.getTestById(id).map(t -> ResponseEntity.ok(toTestDetail(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/tests")
    public ResponseEntity<?> createTest(@RequestHeader("X-Admin-Token") String token, @RequestBody TestRequest req) {
        if (!isValid(token)) return unauthorized();
        return ResponseEntity.status(HttpStatus.CREATED).body(toTestDetail(testService.createTest(req)));
    }

    @PutMapping("/tests/{id}")
    public ResponseEntity<?> updateTest(@RequestHeader("X-Admin-Token") String token, @PathVariable UUID id, @RequestBody TestRequest req) {
        if (!isValid(token)) return unauthorized();
        return ResponseEntity.ok(toTestDetail(testService.updateTest(id, req)));
    }

    @PostMapping("/tests/{id}/publish")
    public ResponseEntity<?> publishTest(@RequestHeader("X-Admin-Token") String token, @PathVariable UUID id) {
        if (!isValid(token)) return unauthorized();
        Test t = testService.publishTest(id);
        return ResponseEntity.ok(Map.of("published", true, "testId", t.getId()));
    }

    @PostMapping("/tests/{id}/unpublish")
    public ResponseEntity<?> unpublishTest(@RequestHeader("X-Admin-Token") String token, @PathVariable UUID id) {
        if (!isValid(token)) return unauthorized();
        testService.unpublishTest(id);
        return ResponseEntity.ok(Map.of("published", false));
    }

    @PostMapping("/tests/{id}/copy")
    public ResponseEntity<?> copyTest(@RequestHeader("X-Admin-Token") String token, @PathVariable UUID id) {
        if (!isValid(token)) return unauthorized();
        Test copy = testService.copyTest(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(toTestDetail(copy));
    }

    @DeleteMapping("/tests/{id}")
    public ResponseEntity<?> deleteTest(@RequestHeader("X-Admin-Token") String token, @PathVariable UUID id) {
        if (!isValid(token)) return unauthorized();
        testService.deleteTest(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Results ----
    @GetMapping("/tests/{id}/results")
    public ResponseEntity<?> getResults(@RequestHeader("X-Admin-Token") String token, @PathVariable UUID id) {
        if (!isValid(token)) return unauthorized();
        Test test = testService.getTestById(id).orElse(null);
        if (test == null) return ResponseEntity.notFound().build();

        List<CandidateSession> sessions = sessionService.getSessionsForTest(id);
        List<Map<String, Object>> response = sessions.stream().map(session -> {
            // Lazy evaluation for expired tests
            if (!session.isCompleted() && test.isExpired()) {
                resultService.gradePartialSession(session, test);
                sessionService.markCompleted(session.getId(), true);
                session.setCompleted(true);
                session.setForceSubmitted(true);
            }

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("sessionId", session.getId());
            entry.put("candidateName", session.getCandidateName());
            entry.put("candidateEmail", session.getCandidateEmail());
            entry.put("startedAt", session.getStartedAt());
            entry.put("submittedAt", session.getSubmittedAt());
            entry.put("completed", session.isCompleted());
            entry.put("forceSubmitted", session.isForceSubmitted());
            entry.put("violationCount", session.getViolationCount());
            entry.put("tabSwitchCount", session.getTabSwitchCount());
            entry.put("fullscreenExitCount", session.getFullscreenExitCount());
            entry.put("violations", sessionService.getViolationsForSession(session.getId()).stream()
                    .map(v -> Map.of("type", v.getType().name(), "timestamp", v.getTimestamp())).toList());
            resultService.getResultBySessionId(session.getId()).ifPresent(r -> {
                entry.put("score", r.getMarksObtained());
                entry.put("totalMarks", r.getTotalMarks());
                entry.put("percentage", r.getTotalMarks() > 0
                        ? Math.round((r.getMarksObtained() * 100.0) / r.getTotalMarks()) : 0);
                entry.put("correctAnswers", r.getCorrectAnswers());
                entry.put("incorrectAnswers", r.getIncorrectAnswers());
                entry.put("skippedAnswers", r.getSkippedAnswers());
                entry.put("timeTakenSeconds", r.getTimeTakenSeconds());
                try {
                    entry.put("breakdown", objectMapper.readValue(r.getAnswerBreakdown(), new TypeReference<List<?>>() {}));
                } catch (Exception e) { entry.put("breakdown", List.of()); }
            });
            return entry;
        }).toList();
        return ResponseEntity.ok(response);
    }

    // ---- Helpers ----
    private boolean isValid(String token) { return adminToken.equals(token); }
    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
    }

    private Map<String, Object> toTestSummary(Test t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("title", t.getTitle());
        m.put("durationMinutes", t.getDurationMinutes());
        m.put("isPublished", t.isPublished());
        m.put("isActive", t.isActive());
        m.put("isPrivate", t.isPrivate());
        m.put("isExpired", t.isExpired());
        m.put("expiresAt", t.getExpiresAt());
        m.put("showAnswers", t.getShowAnswers() != null ? t.getShowAnswers().name() : "IMMEDIATELY");
        m.put("questionCount", t.getQuestions().size());
        m.put("createdAt", t.getCreatedAt() != null ? t.getCreatedAt().toString() : "");
        return m;
    }

    private Map<String, Object> toTestDetail(Test t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("title", t.getTitle());
        m.put("instructions", t.getInstructions());
        m.put("durationMinutes", t.getDurationMinutes());
        m.put("shuffleQuestions", t.isShuffleQuestions());
        m.put("shuffleOptions", t.isShuffleOptions());
        m.put("isPublished", t.isPublished());
        m.put("isActive", t.isActive());
        m.put("isPrivate", t.isPrivate());
        m.put("allowedEmails", t.getAllowedEmails() != null
                ? Arrays.asList(t.getAllowedEmails().split(",")) : List.of());
        m.put("showAnswers", t.getShowAnswers() != null ? t.getShowAnswers().name() : "IMMEDIATELY");
        m.put("expiresAt", t.getExpiresAt());
        m.put("createdAt", t.getCreatedAt());
        m.put("questions", t.getQuestions().stream()
                .sorted(Comparator.comparingInt(Question::getOrderIndex))
                .map(q -> {
                    Map<String, Object> qm = new LinkedHashMap<>();
                    qm.put("id", q.getId());
                    qm.put("questionText", q.getQuestionText());
                    qm.put("type", q.getType().name());
                    qm.put("marks", q.getMarks());
                    qm.put("orderIndex", q.getOrderIndex());
                    qm.put("options", q.getOptions().stream()
                            .sorted(Comparator.comparingInt(Option::getOrderIndex))
                            .map(o -> Map.of("id", o.getId(), "optionText", o.getOptionText())).toList());
                    try {
                        qm.put("correctAnswers", objectMapper.readValue(q.getCorrectAnswers(), new TypeReference<List<String>>() {}));
                    } catch (Exception e) { qm.put("correctAnswers", List.of()); }
                    return qm;
                }).toList());
        return m;
    }
}
