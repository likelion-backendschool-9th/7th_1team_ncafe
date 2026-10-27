package com.newcafe.backend.service;

import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.branch.BranchResponse;
import com.newcafe.backend.repository.BranchRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BranchService {

    private final BranchRepository branchRepository;

    // 영업 여부를 포함한 전체 지점을 ID 순으로 반환한다.
    public List<BranchResponse> findAll() {
        return branchRepository.findAll(Sort.by("id")).stream()
                .map(BranchResponse::from).toList();
    }

    public BranchResponse findById(String id) {
        return branchRepository.findById(id).map(BranchResponse::from)
                .orElseThrow(() -> new NotFoundException("BRANCH_NOT_FOUND", "지점을 찾을 수 없습니다. id=" + id));
    }
}
