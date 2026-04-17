package com.onlinetest.repository;

import com.onlinetest.model.TestResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TestResultRepository extends JpaRepository<TestResult, UUID> {
    Optional<TestResult> findBySessionId(UUID sessionId);
    List<TestResult> findByTestId(UUID testId);
}
