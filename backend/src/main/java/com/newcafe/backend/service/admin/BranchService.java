package com.newcafe.backend.service.admin;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.ConflictException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.branch.BranchResponse;
import com.newcafe.backend.dto.branch.admin.BranchCreateRequest;
import com.newcafe.backend.dto.branch.admin.BranchUpdateRequest;
import com.newcafe.backend.entity.Branch;
import com.newcafe.backend.repository.BranchRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

@Service("adminBranchService")
@RequiredArgsConstructor
@Transactional
public class BranchService {
    private final BranchRepository repository;
    private final EntityManager entityManager;
    private final JsonMapper jsonMapper;

    public BranchResponse create(BranchCreateRequest request) {
        if (request == null) throw badRequest("요청 내용은 필수입니다.");
        String id = required(request.id(), 255, "지점 ID");
        if (!id.matches("[a-zA-Z0-9가-힣_-]+")) {
            throw badRequest("지점 ID는 영문, 숫자, 한글, 밑줄, 하이픈만 사용할 수 있습니다.");
        }
        if (repository.existsById(id)) throw duplicate();
        Branch branch = new Branch();
        branch.setId(id);
        apply(branch, new BranchUpdateRequest(request.name(), request.address(),
                request.sections(), request.fixtures(), request.open()));
        // 직접 지정한 ID로 merge하면 기존 행을 덮어쓸 수 있으므로 신규 INSERT만 수행한다.
        entityManager.persist(branch);
        entityManager.flush();
        return BranchResponse.from(branch);
    }

    public BranchResponse update(String id, BranchUpdateRequest request) {
        if (request == null) throw badRequest("요청 내용은 필수입니다.");
        Branch branch = repository.findById(id).orElseThrow(() ->
                new NotFoundException("BRANCH_NOT_FOUND", "지점을 찾을 수 없습니다. id=" + id));
        apply(branch, request);
        return BranchResponse.from(branch);
    }

    private void apply(Branch branch, BranchUpdateRequest request) {
        String name = required(request.name(), 100, "지점명");
        String address = required(request.address(), 255, "주소");
        String sections = floorPlan(request.sections());
        String fixtures = floorPlan(request.fixtures());
        if (request.open() == null) throw badRequest("영업 여부는 필수입니다.");
        branch.setName(name);
        branch.setAddress(address);
        branch.setSections(sections);
        branch.setFixtures(fixtures);
        branch.setOpen(request.open());
    }

    private String required(String value, int max, String label) {
        if (value == null || value.isBlank() || value.trim().length() > max) {
            throw badRequest(label + "은(는) 1~" + max + "자로 입력해야 합니다.");
        }
        return value.trim();
    }

    // 미입력 평면도는 빈 배열로 저장한다. 개별 좌표 구조는 담당자와 협의 후 검증한다.
    private String floorPlan(String value) {
        if (value == null || value.isBlank()) return "[]";
        try {
            var node = jsonMapper.readTree(value);
            if (node == null || !node.isArray()) throw badRequest("평면도는 JSON 배열이어야 합니다.");
            return node.toString();
        } catch (JacksonException e) {
            throw badRequest("평면도 JSON 형식이 올바르지 않습니다.");
        }
    }

    private BadRequestException badRequest(String message) {
        return new BadRequestException("BRANCH_INPUT_INVALID", message);
    }

    private ConflictException duplicate() {
        return new ConflictException("BRANCH_ID_DUPLICATED", "이미 사용 중인 지점 ID입니다.");
    }
}
