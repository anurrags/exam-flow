package com.onlinetest.dto;

import lombok.Data;

@Data
public class CandidateAuthRequest {
    private String name;     // only for register
    private String email;
    private String password;
}
