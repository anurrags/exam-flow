package com.onlinetest.dto;

import lombok.Data;

@Data
public class ViolationRequest {
    private String sessionId;
    private String type; // TAB_SWITCH, FULLSCREEN_EXIT, RIGHT_CLICK, COPY_ATTEMPT, DEVTOOLS_OPEN, BACK_NAVIGATION
}
