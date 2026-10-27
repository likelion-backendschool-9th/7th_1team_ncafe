package com.newcafe.backend.service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.ConflictException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.coupon.CouponLogResponse;
import com.newcafe.backend.dto.coupon.CouponResponse;
import com.newcafe.backend.dto.coupon.MyLosingStreakResponse;
import com.newcafe.backend.entity.Bet;
import com.newcafe.backend.entity.CouponLog;
import com.newcafe.backend.entity.CouponLosingStreak;
import com.newcafe.backend.entity.Grade;
import com.newcafe.backend.entity.Member;
import com.newcafe.backend.repository.BetRepository;
import com.newcafe.backend.repository.CouponLogRepository;
import com.newcafe.backend.repository.CouponLosingStreakRepository;
import com.newcafe.backend.repository.GradeRepository;
import com.newcafe.backend.repository.MemberRepository;

import lombok.RequiredArgsConstructor;

// 쿠폰 — 보유 수(members.coupon_count)와 증감 내역(coupons_log)을 함께 다룬다. 쿠폰 수는 이 클래스의 spend · earn으로만 바꾸고,
// 바꿀 때마다 같은 트랜잭션에서 내역을 한 줄 남겨 delta 합계와 보유 수가 어긋나지 않게 한다(WBS 10.5).
// 레이스 걸기(RaceService)가 spend를, 레이스 정산 · 가입 축하 · 연패 위로 쿠폰 · 주문 결제 적립(PaymentService)이 earn을 쓴다.
//
// 연패 위로 쿠폰(사용자 결정 2026-10-27) — 정책은 coupons_losing_streak 한 줄(관리자 쿠폰 관리에서 바꾼다).
// 정책 연패 수 이상 연속으로 4위 이하(members.lose_streak — 정산할 때 RaceService가 갱신)이고 지금 쿠폰이 0장인 회원에게
// 마지막 경주 정산 뒤 지연 시간이 지나면 정책 장수만큼 준다. 연패 한 번에 한 번(3위 안에 들면 다시 대상).
// 예약을 따로 저장하지 않고 걸기 · 연패 수 · 쿠폰 내역으로 그때그때 계산하며, 지급 기록은 coupons_log에 남긴다(note가 LOSING_STREAK_NOTE로 시작).
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CouponService {

    private static final int NOTE_MAX_LENGTH = 100; // coupons_log.note VARCHAR(100)
    // 연패 위로 쿠폰 내역을 구분하는 note 앞부분 — 이번 연패에 받았는지 · 관리자 지급 내역 · 사용자 모달이 이 문구로 찾는다(바꾸지 말 것)
    public static final String LOSING_STREAK_NOTE = "연패 위로 쿠폰";
    // 정책 행 id — 행은 하나뿐이다(coupons_losing_streak_data.sql)
    public static final Long LOSING_STREAK_POLICY_ID = 1L;

    private final MemberRepository memberRepository;
    private final CouponLogRepository couponLogRepository;
    private final CouponLosingStreakRepository losingStreakRepository;
    private final BetRepository betRepository;
    private final GradeRepository gradeRepository;

    // 연패 위로 쿠폰 대상 한 명 — dueTime(마지막 경주 정산 시각 + 지연 시간)이 지나면 지급한다
    public record LosingStreakTarget(Long memberNo, String loginId, String nickname, int loseStreak, Integer raceNo,
            OffsetDateTime dueTime) {
    }

    // 내 쿠폰 — 보유 수 + 증감 내역(최신순)
    public CouponResponse findMine(Long memberNo) {
        Member member = getActiveMember(memberNo);
        return CouponResponse.from(member, couponLogRepository.findAllByMemberNoOrderByCreatedDateDescIdDesc(memberNo));
    }

    // 내 연패 위로 쿠폰 상태 — 지금 연패 수 · 지급 예정 시각 · 가장 최근에 받은 위로 쿠폰
    public MyLosingStreakResponse findMyLosingStreak(Long memberNo) {
        Member member = getActiveMember(memberNo);
        CouponLosingStreak policy = getLosingStreakPolicy();
        OffsetDateTime dueTime = policy.isEnabled()
                ? losingStreakTargetOf(member, policy).map(LosingStreakTarget::dueTime).orElse(null)
                : null;
        CouponLogResponse latest = couponLogRepository
                .findFirstByMemberNoAndNoteStartingWithOrderByCreatedDateDescIdDesc(memberNo, LOSING_STREAK_NOTE)
                .map(CouponLogResponse::from)
                .orElse(null);
        return new MyLosingStreakResponse(member.getLoseStreak(), dueTime, policy.getCoupons(), latest);
    }

    // 연패 위로 쿠폰 정책 — 행이 없으면(초기 데이터 전) 기본값(3연패 · 1장 · 10분 · 사용)
    public CouponLosingStreak getLosingStreakPolicy() {
        return losingStreakRepository.findById(LOSING_STREAK_POLICY_ID).orElseGet(() -> {
            CouponLosingStreak policy = new CouponLosingStreak();
            policy.setId(LOSING_STREAK_POLICY_ID);
            policy.setLoseStreak(3);
            policy.setCoupons(1);
            policy.setDelayMinutes(10);
            policy.setEnabled(true);
            return policy;
        });
    }

    // 지금 위로 쿠폰 조건을 채운 회원(지급 예정 시각이 아직 안 된 회원 포함), 지급 예정 순
    public List<LosingStreakTarget> findLosingStreakTargets(CouponLosingStreak policy) {
        List<LosingStreakTarget> targets = new ArrayList<>();
        for (Member member : memberRepository.findAllByLoseStreakGreaterThanEqualAndCouponCountAndDeletedFalse(policy.getLoseStreak(), 0)) {
            losingStreakTargetOf(member, policy).ifPresent(targets::add);
        }
        targets.sort((a, b) -> a.dueTime().compareTo(b.dueTime()));
        return targets;
    }

    // 연패 위로 쿠폰 지급 — 10초마다 지급 예정 시각이 지난 회원에게 정책 장수만큼 준다. 정책이 꺼져 있으면 주지 않는다
    @Scheduled(fixedDelay = 10_000)
    @Transactional
    public void grantLosingStreakCoupons() {
        CouponLosingStreak policy = getLosingStreakPolicy();
        if (!policy.isEnabled()) {
            return;
        }
        int coupons = policy.getCoupons();
        OffsetDateTime now = OffsetDateTime.now();
        // earn이 영속성 컨텍스트를 비우므로 대상을 먼저 다 구한 뒤 지급한다
        List<LosingStreakTarget> due = findLosingStreakTargets(policy).stream()
                .filter(target -> !target.dueTime().isAfter(now))
                .toList();
        for (LosingStreakTarget target : due) {
            // "연패 위로 쿠폰 · 3연패 (Race #13)"
            earn(target.memberNo(), coupons, LOSING_STREAK_NOTE + " · " + target.loseStreak() + "연패 (Race #" + target.raceNo() + ")");
        }
    }

    // 이 회원이 위로 쿠폰 대상인가 — 정책 연패 수 이상 · 쿠폰 0장 · 마지막 걸기가 정산된 4위 이하(그 뒤 새로 건 경주 없음) ·
    // 이번 연패(마지막으로 3위 안에 든 뒤)에 아직 받지 않음. 쿠폰 0장 확인은 지급 시점에 한다(사용자 결정)
    private Optional<LosingStreakTarget> losingStreakTargetOf(Member member, CouponLosingStreak policy) {
        if (member.getLoseStreak() < policy.getLoseStreak() || member.getCouponCount() > 0) {
            return Optional.empty();
        }
        Bet last = betRepository.findFirstByMemberNoOrderByBettedTimeDesc(member.getNo()).orElse(null);
        if (last == null || last.getSettledTime() == null || last.getCouponsOut() > 0) {
            return Optional.empty();
        }
        OffsetDateTime lastWin = betRepository.findFirstByMemberNoAndCouponsOutGreaterThanOrderBySettledTimeDesc(member.getNo(), 0)
                .map(Bet::getSettledTime)
                .orElse(null);
        boolean received = lastWin == null
                ? couponLogRepository.existsByMemberNoAndNoteStartingWith(member.getNo(), LOSING_STREAK_NOTE)
                : couponLogRepository.existsByMemberNoAndNoteStartingWithAndCreatedDateAfter(member.getNo(), LOSING_STREAK_NOTE, lastWin);
        if (received) {
            return Optional.empty();
        }
        return Optional.of(new LosingStreakTarget(member.getNo(), member.getLoginId(), member.getNickname(), member.getLoseStreak(),
                last.getRace().getNo(), last.getSettledTime().plusMinutes(policy.getDelayMinutes())));
    }

    // 쿠폰 사용 (레이스 걸기 · 추후 결제). 쿠폰이 부족하면 409 — 조건부 UPDATE라 동시에 요청해도 음수가 되지 않는다
    @Transactional
    public void spend(Long memberNo, int amount, String note) {
        checkAmount(amount);
        if (memberRepository.decreaseCoupons(memberNo, amount) == 0) {
            getActiveMember(memberNo); // 없는 회원이면 404
            throw new ConflictException("COUPON_NOT_ENOUGH", "쿠폰이 부족합니다.");
        }
        addLog(memberNo, -amount, note);
    }

    // 쿠폰 적립 (가입 축하 · 이벤트 · 레이스 정산 · 연패 위로 · 주문 적립). 누적 쿠폰도 같이 늘고, 등급을 다시 매긴다.
    @Transactional
    public void earn(Long memberNo, int amount, String note) {
        checkAmount(amount);
        if (memberRepository.increaseCoupons(memberNo, amount) == 0) {
            throw notFound(memberNo);
        }
        addLog(memberNo, amount, note);
        upgradeGrade(memberNo);
    }

    // 누적 쿠폰으로 닿는 가장 높은 등급으로 올린다. 등급은 올라가기만 한다(쿠폰을 써도 내려가지 않는다).
    // 등급 데이터(grades_data.sql)가 없으면 아무것도 하지 않는다.
    private void upgradeGrade(Long memberNo) {
        Member member = getActiveMember(memberNo);
        gradeRepository.findTopByMinTotalCouponsLessThanEqualOrderByMinTotalCouponsDesc(member.getTotalEarnedCoupons())
                .filter(reached -> isHigher(reached, member.getGrade()))
                .ifPresent(member::setGrade);
    }

    private boolean isHigher(Grade reached, Grade current) {
        return current == null || reached.getMinTotalCoupons() > current.getMinTotalCoupons();
    }

    private void addLog(Long memberNo, int delta, String note) {
        CouponLog log = new CouponLog();
        log.setMember(memberRepository.getReferenceById(memberNo));
        log.setDelta(delta);
        log.setNote(note.length() > NOTE_MAX_LENGTH ? note.substring(0, NOTE_MAX_LENGTH) : note);
        couponLogRepository.save(log);
    }

    private void checkAmount(int amount) {
        if (amount <= 0) {
            throw new BadRequestException("COUPON_AMOUNT_INVALID", "쿠폰 수량은 1장 이상이어야 합니다.");
        }
    }

    private Member getActiveMember(Long no) {
        return memberRepository.findByNoAndDeletedFalse(no).orElseThrow(() -> notFound(no));
    }

    private NotFoundException notFound(Long no) {
        return new NotFoundException("MEMBER_NOT_FOUND", "회원을 찾을 수 없습니다. no=" + no);
    }
}
