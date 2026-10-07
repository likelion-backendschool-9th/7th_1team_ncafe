package com.newcafe.backend.repository;

import com.newcafe.backend.entity.Menu;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuRepository extends JpaRepository<Menu, Long> {
    List<Menu> findAllByKorName(String korName);
}
