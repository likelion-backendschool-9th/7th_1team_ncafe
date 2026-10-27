package com.newcafe.backend.service;

import java.net.http.HttpClient;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.ConflictException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.race.BetRequest;
import com.newcafe.backend.dto.race.BetResponse;
import com.newcafe.backend.dto.race.HorseResponse;
import com.newcafe.backend.dto.race.RaceResponse;
import com.newcafe.backend.entity.Bet;
import com.newcafe.backend.entity.Member;
import com.newcafe.backend.entity.Race;
import com.newcafe.backend.entity.RaceHorse;
import com.newcafe.backend.repository.BetRepository;
import com.newcafe.backend.repository.HorseRepository;
import com.newcafe.backend.repository.MemberRepository;
import com.newcafe.backend.repository.RaceRepository;

import lombok.RequiredArgsConstructor;

// 사용자용 경주: 출전표·일정·결과·기록 조회, 걸기, 정산 (출전마 수정 · 경주 추가/삭제는 service.admin.RaceService)
// 규칙은 프론트 목업(/race)과 같다. 정산은 결과 확정 시각이 지난 경주의 순위를 Next 순위 계산 Route Handler
// (frontend/app/api/race-ranking — 경기 화면과 같은 시뮬레이션)에 물어 저장하고, 순위만큼 쿠폰을 돌려준 뒤 다음 경주 게이트 번호를 채운다.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RaceService {

    private static final Logger log = LoggerFactory.getLogger(RaceService.class);

    // 출발 이 시간 전부터는 걸 수 없고(마감) 시드를 공개한다 (프론트 lib/time.ts의 RACE_GATE_CLOSE_MS)
    public static final Duration GATE_CLOSE = Duration.ofSeconds(10);
    // 출발 뒤 이 시간이면 어느 화면에서든 경주가 끝나 결과가 확정된다 (프론트 simulation.ts의 RACE_SETTLE_MS)
    public static final Duration RACE_SETTLE = Duration.ofMillis(19_500);
    // 한 경주에 거는 쿠폰 수 (프론트 payout.ts의 RACE_ENTRY_COUPONS)
    private static final int ENTRY_COUPONS = 1;
    // 순위별로 돌려받는 쿠폰 수(원금 포함), 표에 없는 순위(4위 이하)는 0 (프론트 payout.ts의 RACE_PAYOUT)
    private static final Map<Integer, Integer> PAYOUT = Map.of(1, 4, 2, 3, 3, 2);
    // 순위 계산 Route Handler의 공유 키 헤더 (frontend/app/api/race-ranking/route.ts)
    private static final String RANKING_KEY_HEADER = "X-Race-Ranking-Key";
    // 경주 일정의 "오늘"은 카페가 있는 서울 기준
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    // 첫 경주의 게이트 순서 — 시드처럼 맞힐 수 없게 SecureRandom을 쓴다
    private static final SecureRandom RANDOM = new SecureRandom();

    private final RaceRepository raceRepository;
    private final BetRepository betRepository;
    private final HorseRepository horseRepository;
    private final MemberRepository memberRepository;
    private final CouponService couponService;
    // 순위 계산 요청용. Next(Node) 서버는 HTTP/2 업그레이드 요청을 받으면 연결을 끊으므로 HTTP/1.1로 고정한다
    // (JDK HttpClient 기본값은 업그레이드 시도). 정산 트랜잭션 안에서 부르므로 오래 기다리지 않게 시간 제한을 둔다
    private final RestClient restClient = RestClient.builder()
            .requestFactory(rankingRequestFactory())
            .build();

    @Value("${race.ranking.url}")
    private String rankingUrl;
    @Value("${race.ranking.key}")
    private String rankingKey;

    // 마감(출발 10초 전)이 지나 시드를 공개해도 되는지 — 관리자 경주 목록도 같은 규칙을 쓴다
    public static boolean isSeedOpen(Race race, OffsetDateTime now) {
        return !now.isBefore(race.getStartTime().minus(GATE_CLOSE));
    }

    // 다음 경주 (출전표) — 아직 출발하지 않은 가장 이른 경주. 예정된 경주가 없으면 404
    public RaceResponse findNext() {
        OffsetDateTime now = OffsetDateTime.now();
        return raceRepository.findFirstByStartTimeAfterOrderByStartTimeAsc(now)
                .map(race -> RaceResponse.from(race, isSeedOpen(race, now)))
                .orElseThrow(() -> new NotFoundException("RACE_NOT_SCHEDULED", "예정된 경주가 없습니다."));
    }

    // 경주 일정 — 오늘(KST 0시)부터의 경주, 이른 순. 손님 화면의 "오늘 12:30 · 18:00" · "다음 경주 10/29(목) 18:00" 문구용
    public List<RaceResponse> findSchedule() {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime today = now.atZoneSameInstant(KST).toLocalDate().atStartOfDay(KST).toOffsetDateTime();
        return raceRepository.findAllByStartTimeGreaterThanEqualOrderByStartTimeAsc(today).stream()
                .map(race -> RaceResponse.from(race, isSeedOpen(race, now)))
                .toList();
    }

    // 출전마 7마리 (말 관리번호 순)
    public List<HorseResponse> findHorses() {
        return horseRepository.findAllByOrderByIdAsc().stream()
                .map(HorseResponse::from)
                .toList();
    }

    // 경주 상세 (정산됐으면 순위 포함) — 경기 화면은 마감 뒤 이 응답의 시드 · 성향으로 경주를 그린다
    public RaceResponse findByNo(Integer no) {
        Race race = getRace(no);
        return RaceResponse.from(race, isSeedOpen(race, OffsetDateTime.now()));
    }

    // 지난 경주 기록 (정산된 경주, 최신순)
    public List<RaceResponse> findHistory() {
        return raceRepository.findAllByStatusOrderByStartTimeDesc(Race.Status.SETTLED).stream()
                .map(race -> RaceResponse.from(race, true))
                .toList();
    }

    // 걸기: 걸 수 있는 경주인지(다음 경주 · 마감 전 · 앞 경주가 끝남) · 중복 · 말 확인 → 쿠폰 1장 차감(내역 포함) → bets 저장.
    // 쿠폰 차감 · 내역 · 걸기 기록은 한 트랜잭션이라 하나라도 실패하면 모두 되돌린다(WBS 11.5)
    @Transactional
    public BetResponse placeBet(Long memberNo, Integer raceNo, BetRequest request) {
        if (request == null || request.horseId() == null) {
            throw new BadRequestException("BET_HORSE_REQUIRED", "응원할 말을 골라야 합니다.");
        }
        OffsetDateTime now = OffsetDateTime.now();
        Race race = getRace(raceNo);

        // 걸 수 있는 경주는 아직 출발하지 않은 가장 가까운 경주 하나뿐이다
        boolean isNext = raceRepository.findFirstByStartTimeAfterOrderByStartTimeAsc(now)
                .map(next -> next.getId().equals(race.getId()))
                .orElse(false);
        if (!isNext) {
            throw new ConflictException("RACE_NOT_OPEN", "지금 걸 수 있는 경주가 아닙니다. 다음 경주에 걸어야 합니다.");
        }
        if (isSeedOpen(race, now)) {
            throw new ConflictException("RACE_CLOSED", "출발 10초 전부터는 걸 수 없습니다.");
        }
        // 앞 경주가 달리는 동안(출발 ~ 결과 확정)은 다음 경주에 걸 수 없다 — 목업에서 결과가 나온 뒤 다음 출전표가 열리는 것과 같다
        if (raceRepository.existsByStartTimeBetween(now.minus(RACE_SETTLE), now)) {
            throw new ConflictException("RACE_RUNNING", "앞 경주가 끝난 뒤에 걸 수 있습니다.");
        }
        if (betRepository.existsByMemberNoAndRaceId(memberNo, race.getId())) {
            throw new ConflictException("RACE_ALREADY_BET", "이 경주에는 이미 쿠폰을 걸었습니다.");
        }
        RaceHorse raceHorse = race.getHorses().stream()
                .filter(rh -> rh.getHorse().getId().equals(request.horseId()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("BET_HORSE_INVALID",
                        "이 경주에 출전하지 않는 말입니다. horseId=" + request.horseId()));

        // 내역 문구는 목업과 같은 모양 — "Race #13 · 3번 MOCHA 참가"(게이트 번호가 아직 없으면 번호 없이)
        Integer gate = raceHorse.getGateNo();
        couponService.spend(memberNo, ENTRY_COUPONS, "Race #" + race.getNo() + " · "
                + (gate == null ? "" : gate + "번 ") + raceHorse.getHorse().getNameEng().toUpperCase() + " 참가");

        Bet bet = new Bet();
        bet.setMember(memberRepository.getReferenceById(memberNo));
        bet.setRace(race);
        bet.setRaceHorse(raceHorse);
        bet.setCouponsIn(ENTRY_COUPONS);
        return BetResponse.from(betRepository.save(bet));
    }

    // 내 걸기 기록 (최신순)
    public List<BetResponse> findMyBets(Long memberNo) {
        return betRepository.findAllByMemberNoOrderByBettedTimeDesc(memberNo).stream()
                .map(BetResponse::from)
                .toList();
    }

    // 정산 스케줄러 — 2초마다 결과 확정 시각(출발 + 19.5초)이 지난 경주를 출발 순서대로 하나씩 정산한다.
    // 순위 계산 서버(Next)가 응답하지 않으면 그 경주는 정산 전으로 남겨 두고 다음 주기에 다시 시도한다. 뒤 경주도 기다린다
    // (게이트 번호가 앞 경주 순위로 정해지므로). HTTP 호출이 트랜잭션 안에 있지만 경주가 끝날 때 한 번이라 감수한다.
    @Scheduled(fixedDelay = 2000)
    @Transactional
    public void settleDueRaces() {
        Optional<Race> due;
        while ((due = raceRepository.findFirstByStatusAndStartTimeBeforeOrderByStartTimeAsc(
                Race.Status.SCHEDULED, OffsetDateTime.now().minus(RACE_SETTLE))).isPresent()) {
            Race race = due.get();
            List<Long> ranking;
            try {
                ranking = requestRanking(race);
            } catch (RestClientException | IllegalStateException e) {
                log.warn("Race #{} 순위 계산 요청 실패 — 다음 주기에 다시 시도합니다: {}", race.getNo(), e.getMessage());
                return;
            }
            settle(race, ranking);
        }
    }

    // 게이트 번호 — 앞 경주에 들어온 순서대로 1번부터(프론트 records.gatesFor). 앞 경주가 없으면 무작위 순서,
    // 앞 경주가 아직 정산 전이면 순서를 모르므로 비워 두었다가 정산할 때 채운다. 정산과 경주 추가 · 삭제(service.admin.RaceService)가 함께 쓴다
    public void assignGates(Race race) {
        Optional<Race> prev = raceRepository.findFirstByStartTimeBeforeOrderByStartTimeDesc(race.getStartTime());
        List<Long> order = new ArrayList<>();
        if (prev.isEmpty()) {
            race.getHorses().forEach(rh -> order.add(rh.getHorse().getId()));
            Collections.shuffle(order, RANDOM);
        } else if (prev.get().getStatus() == Race.Status.SETTLED) {
            prev.get().getHorses().stream()
                    .filter(rh -> rh.getRanking() != null)
                    .sorted(Comparator.comparing(RaceHorse::getRanking))
                    .forEach(rh -> order.add(rh.getHorse().getId()));
        } else {
            race.getHorses().forEach(rh -> rh.setGateNo(null));
            return;
        }
        // 앞 경주에 없던 말은 그 뒤에 말 관리번호 순으로
        race.getHorses().stream()
                .map(rh -> rh.getHorse().getId())
                .sorted()
                .filter(id -> !order.contains(id))
                .forEach(order::add);
        race.getHorses().forEach(rh -> rh.setGateNo(order.indexOf(rh.getHorse().getId()) + 1));
    }

    // 경주 하나 정산 — 순위 저장 · SETTLED → 걸기마다 돌려받은 쿠폰 수 · 연패 수(members.lose_streak) 기록 → 쿠폰 지급 → 다음 경주 게이트 번호.
    // 연패 수는 3위 안이면 0, 4위 이하면 +1 — 연패 위로 쿠폰(CouponService.grantLosingStreakCoupons)이 읽는다.
    // 쿠폰 지급(CouponService.earn)은 DB를 직접 고친 뒤 영속성 컨텍스트를 비우므로, 엔티티 변경을 모두 끝낸 다음에 한다.
    private void settle(Race race, List<Long> ranking) {
        for (RaceHorse raceHorse : race.getHorses()) {
            raceHorse.setRanking(ranking.indexOf(raceHorse.getHorse().getId()) + 1);
        }
        race.setStatus(Race.Status.SETTLED);

        record Payout(Long memberNo, int coupons, String note) {
        }
        List<Payout> payouts = new ArrayList<>();
        OffsetDateTime now = OffsetDateTime.now();
        for (Bet bet : betRepository.findAllByRaceAndSettledTimeIsNull(race)) {
            int rank = bet.getRaceHorse().getRanking();
            int coupons = PAYOUT.getOrDefault(rank, 0);
            bet.setCouponsOut(coupons);
            bet.setSettledTime(now);
            Member member = bet.getMember();
            member.setLoseStreak(coupons > 0 ? 0 : member.getLoseStreak() + 1);
            if (coupons > 0) {
                // "Race #13 · 1위 (원금 1 + 추가 3)" — 목업 정산 내역과 같은 문구
                payouts.add(new Payout(bet.getMember().getNo(), coupons, "Race #" + race.getNo() + " · " + rank
                        + "위 (원금 " + ENTRY_COUPONS + " + 추가 " + (coupons - ENTRY_COUPONS) + ")"));
            }
        }
        raceRepository.flush();

        payouts.forEach(p -> couponService.earn(p.memberNo(), p.coupons(), p.note()));
        raceRepository.findFirstByStartTimeAfterOrderByStartTimeAsc(race.getStartTime()).ifPresent(this::assignGates);
        log.info("Race #{} 정산 완료 — 순위 {}, 쿠폰 지급 {}건", race.getNo(), ranking, payouts.size());
    }

    // 순위 계산 Route Handler 호출 — 시드와 그 경주에서 쓴 성향 사본(race_horses.trait)을 말 id 순으로 보내고, 말 id 1위~7위를 받는다
    private List<Long> requestRanking(Race race) {
        List<RankingHorse> horses = race.getHorses().stream()
                .sorted(Comparator.comparing((RaceHorse rh) -> rh.getHorse().getId()))
                .map(rh -> new RankingHorse(rh.getHorse().getId(), rh.getTrait().name()))
                .toList();
        RankingResponse response = restClient.post()
                .uri(rankingUrl)
                .header(RANKING_KEY_HEADER, rankingKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(new RankingRequest(race.getNo(), race.getStartTime().toString(), race.getSeed(), horses))
                .retrieve()
                .body(RankingResponse.class);
        List<Long> ranking = response == null ? null : response.ranking();
        Set<Long> expected = new HashSet<>(horses.stream().map(RankingHorse::id).toList());
        if (ranking == null || ranking.size() != expected.size() || !expected.equals(new HashSet<>(ranking))) {
            throw new IllegalStateException("순위 응답이 출전마와 맞지 않습니다: " + ranking);
        }
        return ranking;
    }

    private Race getRace(Integer no) {
        return raceRepository.findByNo(no)
                .orElseThrow(() -> new NotFoundException("RACE_NOT_FOUND", "경주를 찾을 수 없습니다. no=" + no));
    }

    private static JdkClientHttpRequestFactory rankingRequestFactory() {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(3))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(5));
        return factory;
    }

    // 순위 계산 Route Handler 요청 · 응답 — 서버끼리 주고받는 값이라 dto 패키지에 두지 않는다
    record RankingRequest(Integer raceNo, String startTime, Long seed, List<RankingHorse> horses) {
    }

    record RankingHorse(Long id, String trait) {
    }

    record RankingResponse(Integer raceNo, List<Long> ranking, Long doneAt) {
    }
}
