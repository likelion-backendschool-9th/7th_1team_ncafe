package com.newcafe.backend.service;

import java.util.List;
import java.time.OffsetDateTime;
import com.newcafe.backend.entity.BranchOperationLog;
import com.newcafe.backend.repository.BranchOperationLogRepository;
import com.newcafe.backend.repository.MemberRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BranchOperationLogService {
    private final BranchOperationLogRepository logs;
    private final MemberRepository members;
    private final BranchAdminService access;

    // State changes and their audit records must commit or roll back together.
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(String branchId, Long actor, String action, String target, Object before, Object after) {
        if (java.util.Objects.equals(before, after)) return;
        var member = members.findById(actor).orElseThrow();
        logs.save(new BranchOperationLog(branchId, actor, member.getLoginId(), action, target,
                String.valueOf(before), String.valueOf(after)));
    }

    @Transactional(readOnly = true)
    public List<Response> findRecent(Long actor, String branchId) {
        access.requireAccess(actor, branchId);
        return logs.findByBranchIdOrderByOccurredAtDescIdDesc(branchId, PageRequest.of(0, 100)).stream()
                .map(l -> new Response(l.getId(), l.getActorLoginId(), l.getAction(), l.getTarget(),
                        l.getBeforeValue(), l.getAfterValue(), l.getOccurredAt())).toList();
    }

    public record Response(Long id, String actorLoginId, String action, String target,
            String beforeValue, String afterValue, OffsetDateTime occurredAt) {}
}
