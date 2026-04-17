package com.onlinetest.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class SubmitAnswersRequest {
    private String sessionId;
    // Map of questionId -> list of answer strings  
    private Map<Long, List<String>> answers;
    private long timeTakenSeconds;
}
