package com.onlinetest.dto;

import com.onlinetest.model.Test;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class TestRequest {
    private String title;
    private String instructions;
    private int durationMinutes;
    private boolean shuffleQuestions;
    private boolean shuffleOptions;
    private LocalDateTime expiresAt;
    private List<QuestionRequest> questions;
    @com.fasterxml.jackson.annotation.JsonProperty("isPrivate")
    private boolean isPrivate;
    private List<String> allowedEmails;
    private Test.ShowAnswers showAnswers;
}
