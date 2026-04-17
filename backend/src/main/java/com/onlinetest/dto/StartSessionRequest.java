package com.onlinetest.dto;

import lombok.Data;

@Data
public class StartSessionRequest {
    private String candidateName;
    private String candidateEmail;
}
