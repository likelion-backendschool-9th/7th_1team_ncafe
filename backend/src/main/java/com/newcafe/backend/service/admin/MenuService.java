package com.newcafe.backend.service.admin;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.menu.admin.MenuRequest;
import com.newcafe.backend.dto.menu.admin.MenuResponse;
import com.newcafe.backend.dto.menu.admin.MenuSizeRequest;
import com.newcafe.backend.entity.Category;
import com.newcafe.backend.entity.Menu;
import com.newcafe.backend.entity.MenuSize;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;

import lombok.RequiredArgsConstructor;

// 관리자용 메뉴 관리. 사용자용 service.MenuService와 빈 이름이 겹치지 않도록 이름을 지정한다.
@Service("adminMenuService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MenuService {

    private static final int SIZE_MAX_LENGTH = 2;

    private final MenuRepository menuRepository;
    private final CategoryRepository categoryRepository;

    // 메뉴 목록 조회 (삭제된 메뉴 제외)
    public List<MenuResponse> findAll() {
        return menuRepository.findAllByDeletedFalseOrderByIdAsc().stream()
                .map(MenuResponse::from)
                .toList();
    }

    // 메뉴 상세 조회
    public MenuResponse findById(Long id) {
        return MenuResponse.from(getActiveMenu(id));
    }

    // 메뉴 등록
    @Transactional
    public MenuResponse create(MenuRequest request) {
        validate(request);

        Menu menu = new Menu();
        applyBasicInfo(menu, request);
        syncSizes(menu, request.sizes());

        return MenuResponse.from(menuRepository.save(menu));
    }

    // 메뉴 수정 (전체 교체: 요청에 없는 사이즈는 삭제된다)
    @Transactional
    public MenuResponse update(Long id, MenuRequest request) {
        validate(request);

        Menu menu = getActiveMenu(id);
        applyBasicInfo(menu, request);
        syncSizes(menu, request.sizes());

        return MenuResponse.from(menuRepository.save(menu));
    }

    // 메뉴 삭제 (논리 삭제)
    @Transactional
    public void delete(Long id) {
        if (menuRepository.deleteLogicallyById(id) == 0) {
            throw notFound(id);
        }
    }

    private Menu getActiveMenu(Long id) {
        return menuRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> notFound(id));
    }

    private NotFoundException notFound(Long id) {
        return new NotFoundException("MENU_NOT_FOUND", "메뉴를 찾을 수 없습니다. id=" + id);
    }

    private Category getCategory(Integer categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new NotFoundException("CATEGORY_NOT_FOUND", "카테고리를 찾을 수 없습니다. id=" + categoryId));
    }

    private void applyBasicInfo(Menu menu, MenuRequest request) {
        menu.setCategory(getCategory(request.categoryId()));
        menu.setNameKor(request.nameKor().trim());
        menu.setNameEng(request.nameEng().trim());
        menu.setDescription(request.description());
        menu.setImage(request.image());
        menu.setLabel(request.label());
    }

    // 요청의 사이즈 목록에 맞춰 추가 / 가격 변경 / 삭제
    private void syncSizes(Menu menu, List<MenuSizeRequest> requested) {
        Map<String, Integer> priceBySize = requested.stream()
                .collect(Collectors.toMap(s -> s.size().trim(), MenuSizeRequest::price));

        // CHAR(2) 컬럼은 읽을 때 공백이 채워져 오므로 trim해서 비교한다.
        menu.getSizes().removeIf(s -> !priceBySize.containsKey(s.getSize().trim()));

        Map<String, MenuSize> existing = menu.getSizes().stream()
                .collect(Collectors.toMap(s -> s.getSize().trim(), Function.identity()));
        priceBySize.forEach((size, price) -> {
            MenuSize menuSize = existing.get(size);
            if (menuSize == null) {
                menuSize = new MenuSize();
                menuSize.setMenu(menu);
                menuSize.setSize(size);
                menu.getSizes().add(menuSize);
            }
            menuSize.setPrice(price);
        });
    }

    private void validate(MenuRequest request) {
        if (request == null || isBlank(request.nameKor()) || isBlank(request.nameEng())) {
            throw new BadRequestException("MENU_NAME_REQUIRED", "메뉴 한글명과 영문명은 필수입니다.");
        }
        if (request.categoryId() == null) {
            throw new BadRequestException("MENU_CATEGORY_REQUIRED", "카테고리를 선택해야 합니다.");
        }
        if (request.sizes() == null || request.sizes().isEmpty()) {
            throw new BadRequestException("MENU_SIZE_REQUIRED", "사이즈와 가격을 1개 이상 입력해야 합니다.");
        }

        Set<String> seen = new HashSet<>();
        for (MenuSizeRequest size : request.sizes()) {
            if (size == null || isBlank(size.size()) || size.size().trim().length() > SIZE_MAX_LENGTH) {
                throw new BadRequestException("MENU_SIZE_INVALID",
                        "사이즈는 " + SIZE_MAX_LENGTH + "자 이내로 입력해야 합니다.");
            }
            if (size.price() == null || size.price() < 0) {
                throw new BadRequestException("MENU_PRICE_INVALID", "가격은 0 이상이어야 합니다.");
            }
            if (!seen.add(size.size().trim())) {
                throw new BadRequestException("MENU_SIZE_DUPLICATED", "중복된 사이즈가 있습니다: " + size.size().trim());
            }
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
