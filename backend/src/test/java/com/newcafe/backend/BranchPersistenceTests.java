package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.*;

import com.newcafe.backend.entity.Branch;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class BranchPersistenceTests {

    @Autowired
    private EntityManager entityManager;

    @Test
    void savesBranchWithFloorPlanAndCreationDate() {
        Branch branch = new Branch();
        branch.setId("gangnam");
        branch.setName("강남점");
        branch.setAddress("서울특별시 강남구");
        branch.setSections("[{\"code\":\"A\"}]");
        branch.setFixtures("[]");
        branch.setOpen(true);

        entityManager.persist(branch);
        entityManager.flush();
        entityManager.clear();

        Branch saved = entityManager.find(Branch.class, "gangnam");
        assertNotNull(saved);
        assertEquals("강남점", saved.getName());
        assertEquals("서울특별시 강남구", saved.getAddress());
        assertEquals("[{\"code\":\"A\"}]", saved.getSections());
        assertEquals("[]", saved.getFixtures());
        assertTrue(saved.isOpen());
        assertNotNull(saved.getCreatedDate());
    }
}
