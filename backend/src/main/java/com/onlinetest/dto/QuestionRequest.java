package com.onlinetest.dto;

import com.onlinetest.model.Question;
import lombok.Data;
import java.util.List;

@Data
public class QuestionRequest {
    private String questionText;
    private Question.QuestionType type;
    private int marks;
    private List<String> options;         // For MCQ/MAQ/TRUE_FALSE
    private List<String> correctAnswers;  // Exact match strings
}
