package com.onlinetest.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onlinetest.dto.QuestionRequest;
import com.onlinetest.dto.TestRequest;
import com.onlinetest.model.Option;
import com.onlinetest.model.Question;
import com.onlinetest.model.Test;
import com.onlinetest.repository.TestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class TestService {

    private final TestRepository testRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public Test createTest(TestRequest req) {
        Test test = buildFromRequest(req, null);
        return testRepository.save(test);
    }

    @Transactional
    public Test updateTest(UUID id, TestRequest req) {
        Test test = testRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Test not found: " + id));
        applyRequestToTest(req, test);
        test.getQuestions().clear();
        if (req.getQuestions() != null) {
            for (int i = 0; i < req.getQuestions().size(); i++) {
                test.getQuestions().add(buildQuestion(req.getQuestions().get(i), test, i));
            }
        }
        return testRepository.save(test);
    }

    @Transactional
    public Test copyTest(UUID id) {
        Test src = testRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Test not found: " + id));
        Test copy = Test.builder()
                .title("Copy of " + src.getTitle())
                .instructions(src.getInstructions())
                .durationMinutes(src.getDurationMinutes())
                .shuffleQuestions(src.isShuffleQuestions())
                .shuffleOptions(src.isShuffleOptions())
                .isPublished(false)
                .isActive(true)
                .isPrivate(src.isPrivate())
                .allowedEmails(src.getAllowedEmails())
                .showAnswers(src.getShowAnswers())
                .build();
        for (int i = 0; i < src.getQuestions().size(); i++) {
            copy.getQuestions().add(buildQuestion(toRequest(src.getQuestions().get(i)), copy, i));
        }
        return testRepository.save(copy);
    }

    @Transactional
    public Test publishTest(UUID id) {
        Test test = testRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Test not found: " + id));
        test.setPublished(true);
        return testRepository.save(test);
    }

    @Transactional
    public Test unpublishTest(UUID id) {
        Test test = testRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Test not found: " + id));
        test.setPublished(false);
        return testRepository.save(test);
    }

    @Transactional
    public void deleteTest(UUID id) {
        testRepository.deleteById(id);
    }

    public List<Test> getAllTests() {
        return testRepository.findAll();
    }

    public Optional<Test> getTestById(UUID id) {
        return testRepository.findById(id);
    }

    // ---- Helpers ----

    private Test buildFromRequest(TestRequest req, UUID existingId) {
        Test.TestBuilder builder = Test.builder()
                .title(req.getTitle())
                .instructions(req.getInstructions())
                .durationMinutes(req.getDurationMinutes())
                .shuffleQuestions(req.isShuffleQuestions())
                .shuffleOptions(req.isShuffleOptions())
                .expiresAt(req.getExpiresAt())
                .isPrivate(req.isPrivate())
                .allowedEmails(req.getAllowedEmails() != null ? String.join(",", req.getAllowedEmails()) : null)
                .showAnswers(req.getShowAnswers() != null ? req.getShowAnswers() : Test.ShowAnswers.IMMEDIATELY)
                .isPublished(false)
                .isActive(true);

        Test test = builder.build();
        if (req.getQuestions() != null) {
            for (int i = 0; i < req.getQuestions().size(); i++) {
                test.getQuestions().add(buildQuestion(req.getQuestions().get(i), test, i));
            }
        }
        return test;
    }

    private void applyRequestToTest(TestRequest req, Test test) {
        test.setTitle(req.getTitle());
        test.setInstructions(req.getInstructions());
        test.setDurationMinutes(req.getDurationMinutes());
        test.setShuffleQuestions(req.isShuffleQuestions());
        test.setShuffleOptions(req.isShuffleOptions());
        test.setExpiresAt(req.getExpiresAt());
        test.setPrivate(req.isPrivate());
        test.setAllowedEmails(req.getAllowedEmails() != null ? String.join(",", req.getAllowedEmails()) : null);
        test.setShowAnswers(req.getShowAnswers() != null ? req.getShowAnswers() : Test.ShowAnswers.IMMEDIATELY);
    }

    private Question buildQuestion(QuestionRequest req, Test test, int index) {
        String correctAnswersJson;
        try {
            correctAnswersJson = objectMapper.writeValueAsString(req.getCorrectAnswers());
        } catch (JsonProcessingException e) {
            correctAnswersJson = "[]";
        }
        Question q = Question.builder()
                .test(test).questionText(req.getQuestionText()).type(req.getType())
                .marks(req.getMarks() > 0 ? req.getMarks() : 1)
                .correctAnswers(correctAnswersJson).orderIndex(index).build();
        if (req.getOptions() != null) {
            for (int i = 0; i < req.getOptions().size(); i++) {
                q.getOptions().add(Option.builder().question(q).optionText(req.getOptions().get(i)).orderIndex(i).build());
            }
        }
        return q;
    }

    private QuestionRequest toRequest(Question q) {
        QuestionRequest req = new QuestionRequest();
        req.setQuestionText(q.getQuestionText());
        req.setType(q.getType());
        req.setMarks(q.getMarks());
        req.setOptions(q.getOptions().stream().map(Option::getOptionText).toList());
        try {
            req.setCorrectAnswers(objectMapper.readValue(q.getCorrectAnswers(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)));
        } catch (Exception e) {
            req.setCorrectAnswers(List.of());
        }
        return req;
    }
}
