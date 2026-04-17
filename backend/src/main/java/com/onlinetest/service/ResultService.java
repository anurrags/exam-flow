package com.onlinetest.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onlinetest.dto.SubmitAnswersRequest;
import com.onlinetest.model.*;
import com.onlinetest.repository.TestResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class ResultService {

    private final TestResultRepository testResultRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public TestResult calculateAndSave(CandidateSession session, Test test, SubmitAnswersRequest req) {
        List<Question> questions = test.getQuestions();
        Map<Long, List<String>> submitted = req.getAnswers() != null ? req.getAnswers() : new HashMap<>();

        int totalMarks = 0;
        int marksObtained = 0;
        int correct = 0;
        int incorrect = 0;
        int skipped = 0;

        List<Map<String, Object>> breakdown = new ArrayList<>();

        for (Question q : questions) {
            totalMarks += q.getMarks();
            List<String> givenAnswers = submitted.getOrDefault(q.getId(), List.of());

            List<String> correctAnswers;
            try {
                correctAnswers = objectMapper.readValue(q.getCorrectAnswers(), new TypeReference<List<String>>() {});
            } catch (Exception e) {
                correctAnswers = List.of();
            }

            boolean isSkipped = givenAnswers.isEmpty();
            boolean isCorrect = false;

            if (!isSkipped) {
                isCorrect = switch (q.getType()) {
                    case MCQ, TRUE_FALSE -> correctAnswers.size() == 1 &&
                            givenAnswers.size() == 1 &&
                            correctAnswers.get(0).equalsIgnoreCase(givenAnswers.get(0).trim());
                    case MAQ -> {
                        Set<String> correctSet = new HashSet<>(correctAnswers.stream().map(String::toLowerCase).toList());
                        Set<String> givenSet = new HashSet<>(givenAnswers.stream().map(s -> s.toLowerCase().trim()).toList());
                        yield correctSet.equals(givenSet);
                    }
                    case SINGLE_VALUE -> correctAnswers.size() == 1 &&
                            givenAnswers.size() == 1 &&
                            correctAnswers.get(0).trim().equalsIgnoreCase(givenAnswers.get(0).trim());
                };
            }

            if (isSkipped) {
                skipped++;
            } else if (isCorrect) {
                correct++;
                marksObtained += q.getMarks();
            } else {
                incorrect++;
            }

            Map<String, Object> entry = new HashMap<>();
            entry.put("questionId", q.getId());
            entry.put("questionText", q.getQuestionText());
            entry.put("type", q.getType().name());
            entry.put("givenAnswers", givenAnswers);
            entry.put("correctAnswers", correctAnswers);
            entry.put("isCorrect", isCorrect);
            entry.put("isSkipped", isSkipped);
            entry.put("marks", isCorrect ? q.getMarks() : 0);
            breakdown.add(entry);
        }

        String breakdownJson;
        try {
            breakdownJson = objectMapper.writeValueAsString(breakdown);
        } catch (JsonProcessingException e) {
            breakdownJson = "[]";
        }

        TestResult result = TestResult.builder()
                .session(session)
                .test(test)
                .totalMarks(totalMarks)
                .marksObtained(marksObtained)
                .totalQuestions(questions.size())
                .correctAnswers(correct)
                .incorrectAnswers(incorrect)
                .skippedAnswers(skipped)
                .answerBreakdown(breakdownJson)
                .timeTakenSeconds(req.getTimeTakenSeconds())
                .build();

        return testResultRepository.save(result);
    }

    public Optional<TestResult> getResultBySessionId(UUID sessionId) {
        return testResultRepository.findBySessionId(sessionId);
    }

    public List<TestResult> getResultsByTestId(UUID testId) {
        return testResultRepository.findByTestId(testId);
    }

    @Transactional
    public TestResult gradePartialSession(CandidateSession session, Test test) {
        Map<Long, List<String>> savedAnswers = new HashMap<>();
        if (session.getSavedAnswers() != null) {
            try {
                savedAnswers = objectMapper.readValue(session.getSavedAnswers(), new TypeReference<Map<Long, List<String>>>() {});
            } catch (Exception e) {}
        }
        SubmitAnswersRequest req = new SubmitAnswersRequest();
        req.setSessionId(session.getId().toString());
        req.setAnswers(savedAnswers);
        req.setTimeTakenSeconds(test.getDurationMinutes() * 60);

        return calculateAndSave(session, test, req);
    }
}
