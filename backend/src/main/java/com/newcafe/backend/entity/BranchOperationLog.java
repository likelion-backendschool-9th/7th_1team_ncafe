package com.newcafe.backend.entity;

import java.time.OffsetDateTime;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "branch_operation_logs", indexes = @Index(name = "idx_branch_operation_logs_branch_time", columnList = "branch_id,occurred_at,id"))
@Getter
@NoArgsConstructor
public class BranchOperationLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 255)
    private String branchId;
    @Column(nullable = false)
    private Long actorNo;
    @Column(nullable = false, length = 255)
    private String actorLoginId;
    @Column(nullable = false, length = 40)
    private String action;
    @Column(nullable = false, length = 100)
    private String target;
    @Column(nullable = false, length = 100)
    private String beforeValue;
    @Column(nullable = false, length = 100)
    private String afterValue;
    @Column(nullable = false)
    private OffsetDateTime occurredAt;

    public BranchOperationLog(String branchId, Long actorNo, String actorLoginId, String action,
            String target, String beforeValue, String afterValue) {
        this.branchId = branchId;
        this.actorNo = actorNo;
        this.actorLoginId = actorLoginId;
        this.action = action;
        this.target = target;
        this.beforeValue = beforeValue;
        this.afterValue = afterValue;
        this.occurredAt = OffsetDateTime.now();
    }
}
