package com.onlinetest.repository;

import com.onlinetest.model.Violation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ViolationRepository extends JpaRepository<Violation, Long> {
    List<Violation> findBySessionId(UUID sessionId);
}
