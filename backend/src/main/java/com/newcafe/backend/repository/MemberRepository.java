package com.newcafe.backend.repository;

import com.newcafe.backend.entity.Member;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// 기본 CRUD는 JpaRepository가 제공한다.
//   가입: save(member)  (no가 없는 새 엔티티)
//   수정: 영속 상태의 member를 수정한 뒤 save(member)
public interface MemberRepository extends JpaRepository<Member, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from Member m where m.no = :no")
    Optional<Member> findForBranchAssignment(@Param("no") Long no);
    // 회원 목록 조회 (탈퇴하지 않은 회원)
    List<Member> findAllByDeletedFalseOrderByNoAsc();

    // 회원 상세 조회 (탈퇴하지 않은 회원)
    Optional<Member> findByNoAndDeletedFalse(Long no);

    // 로그인용 회원 조회 (탈퇴 회원은 로그인할 수 없다)
    Optional<Member> findByLoginIdAndDeletedFalse(String loginId);

    // 회원아이디 중복 확인 (탈퇴 회원은 아이디가 마스킹되어 있어 재가입을 막지 않는다)
    boolean existsByLoginId(String loginId);

    // 연패 위로 쿠폰 후보 — loseStreak연패 이상 · 쿠폰 couponCount장 (탈퇴하지 않은 회원)
    List<Member> findAllByLoseStreakGreaterThanEqualAndCouponCountAndDeletedFalse(int loseStreak, int couponCount);

    // 쿠폰 차감 (CouponService.spend). 보유 쿠폰이 amount장 이상인 회원만 줄이고 변경된 행 수를 반환한다 — 0이면 쿠폰 부족이거나 없는 회원.
    // 조건부 UPDATE라 같은 회원이 동시에 두 번 요청해도 쿠폰이 음수가 되지 않는다.
    // DB를 직접 고치므로 영속성 컨텍스트를 비워(clear) 같은 트랜잭션에서 다시 조회하면 바뀐 쿠폰 수가 보이게 한다.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Member m set m.couponCount = m.couponCount - :amount where m.no = :no and m.deleted = false and m.couponCount >= :amount")
    int decreaseCoupons(@Param("no") Long no, @Param("amount") int amount);

    // 쿠폰 적립 (CouponService.earn). 변경된 행 수를 반환하며 0이면 없거나 탈퇴한 회원.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Member m set m.couponCount = m.couponCount + :amount where m.no = :no and m.deleted = false")
    int increaseCoupons(@Param("no") Long no, @Param("amount") int amount);

    // 회원 탈퇴 (논리 삭제). 변경된 행 수를 반환하며 0이면 대상 회원이 없거나 이미 탈퇴한 상태.
    // no는 남겨 주문·베팅 FK를 유지하고, 아이디는 재가입이 가능하도록 'deleted#{no}'로 바꾸고 비밀번호·개인정보는 비운다.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Member m
               set m.deleted = true,
                   m.loginId = concat('deleted#', cast(m.no as String)),
                   m.password = '',
                   m.nickname = '탈퇴회원',
                   m.birth = null,
                   m.gender = null,
                   m.phoneNumber = null,
                   m.email = null,
                   m.postcode = null,
                   m.address1 = null,
                   m.address2 = null
             where m.no = :no and m.deleted = false
            """)
    int withdrawById(@Param("no") Long no);
}
