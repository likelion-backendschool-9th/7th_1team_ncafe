package com.newcafe.backend.service.admin;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.ConflictException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.category.admin.CategoryOrderRequest;
import com.newcafe.backend.dto.category.admin.CategoryRequest;
import com.newcafe.backend.dto.category.admin.CategoryResponse;
import com.newcafe.backend.entity.Category;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;

import lombok.RequiredArgsConstructor;

// 관리자용 카테고리 관리. 사용자용 service.CategoryService와 빈 이름이 겹치지 않도록 이름을 지정한다.
// 검증 규칙은 프론트 admin/categories/_lib/validateCategory.ts와 같게 맞춘다.
@Service("adminCategoryService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryService {

    private static final int NAME_KOR_MAX_LENGTH = 20;
    private static final int NAME_ENG_MAX_LENGTH = 30;
    private static final Pattern NAME_ENG_PATTERN = Pattern.compile("^[A-Za-z0-9 &'-]+$");

    private final CategoryRepository categoryRepository;
    private final MenuRepository menuRepository;

    // 카테고리 목록 조회 (숨김 포함, 노출 순서대로)
    public List<CategoryResponse> findAll() {
        return categoryRepository.findAllByOrderBySortOrderAsc().stream()
                .map(CategoryResponse::from)
                .toList();
    }

    // 카테고리 상세 조회
    public CategoryResponse findById(Integer id) {
        return CategoryResponse.from(getCategory(id));
    }

    // 카테고리 추가 (노출 순서는 맨 뒤)
    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        validate(request, null);

        Category category = new Category();
        applyRequest(category, request);
        category.setSortOrder(categoryRepository.findTopByOrderBySortOrderDesc()
                .map(last -> last.getSortOrder() + 1)
                .orElse(1));

        return CategoryResponse.from(categoryRepository.save(category));
    }

    // 카테고리 수정 (이름·노출 여부. 노출 순서는 그대로)
    @Transactional
    public CategoryResponse update(Integer id, CategoryRequest request) {
        Category category = getCategory(id);
        validate(request, id);
        applyRequest(category, request);

        return CategoryResponse.from(categoryRepository.save(category));
    }

    // 카테고리 삭제 (메뉴가 남아 있으면 거절)
    @Transactional
    public void delete(Integer id) {
        Category category = getCategory(id);
        if (menuRepository.existsByCategoryIdAndDeletedFalse(id)) {
            throw new ConflictException("CATEGORY_HAS_MENUS", "메뉴가 남아 있는 카테고리는 삭제할 수 없습니다. id=" + id);
        }
        categoryRepository.delete(category);
    }

    // 카테고리 순서 변경: ids 순서대로 노출 순서를 1, 2, 3 … 으로 다시 매긴다.
    @Transactional
    public List<CategoryResponse> reorder(CategoryOrderRequest request) {
        List<Category> categories = categoryRepository.findAll();
        List<Integer> ids = request == null ? null : request.ids();
        if (ids == null || ids.size() != categories.size() || new HashSet<>(ids).size() != ids.size()) {
            throw new BadRequestException("CATEGORY_ORDER_INVALID", "모든 카테고리 id를 한 번씩 담아야 합니다.");
        }

        Map<Integer, Category> byId = categories.stream()
                .collect(Collectors.toMap(Category::getId, Function.identity()));
        for (int i = 0; i < ids.size(); i++) {
            Category category = byId.get(ids.get(i));
            if (category == null) {
                throw new BadRequestException("CATEGORY_ORDER_INVALID", "없는 카테고리 id가 있습니다: " + ids.get(i));
            }
            category.setSortOrder(i + 1);
        }

        return findAll();
    }

    private Category getCategory(Integer id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("CATEGORY_NOT_FOUND", "카테고리를 찾을 수 없습니다. id=" + id));
    }

    private void applyRequest(Category category, CategoryRequest request) {
        category.setNameKor(request.nameKor().trim());
        category.setNameEng(request.nameEng().trim());
        category.setVisible(request.visible() == null || request.visible());
    }

    private void validate(CategoryRequest request, Integer editingId) {
        if (request == null || isBlank(request.nameKor()) || isBlank(request.nameEng())) {
            throw new BadRequestException("CATEGORY_NAME_REQUIRED", "카테고리 이름과 영문명은 필수입니다.");
        }
        String nameKor = request.nameKor().trim();
        String nameEng = request.nameEng().trim();
        if (nameKor.length() > NAME_KOR_MAX_LENGTH) {
            throw new BadRequestException("CATEGORY_NAME_TOO_LONG", "이름은 " + NAME_KOR_MAX_LENGTH + "자 이내로 입력해야 합니다.");
        }
        if (nameEng.length() > NAME_ENG_MAX_LENGTH) {
            throw new BadRequestException("CATEGORY_NAME_TOO_LONG", "영문명은 " + NAME_ENG_MAX_LENGTH + "자 이내로 입력해야 합니다.");
        }
        if (!NAME_ENG_PATTERN.matcher(nameEng).matches()) {
            throw new BadRequestException("CATEGORY_NAME_ENG_INVALID", "영문명은 영문·숫자·공백만 사용할 수 있습니다.");
        }

        // 같은 이름 검사 (대소문자·연속 공백 무시)
        for (Category other : categoryRepository.findAll()) {
            if (other.getId().equals(editingId)) {
                continue;
            }
            if (normalize(other.getNameKor()).equals(normalize(nameKor))) {
                throw new ConflictException("CATEGORY_NAME_DUPLICATED", "같은 이름의 카테고리가 이미 있습니다.");
            }
            if (normalize(other.getNameEng()).equals(normalize(nameEng))) {
                throw new ConflictException("CATEGORY_NAME_DUPLICATED", "같은 영문명의 카테고리가 이미 있습니다.");
            }
        }
    }

    private String normalize(String value) {
        return value.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
