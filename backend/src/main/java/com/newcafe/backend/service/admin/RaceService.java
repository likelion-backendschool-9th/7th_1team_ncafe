package com.newcafe.backend.service.admin;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.ConflictException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.race.HorseResponse;
import com.newcafe.backend.dto.race.RaceResponse;
import com.newcafe.backend.dto.race.admin.HorseRequest;
import com.newcafe.backend.dto.race.admin.RaceRequest;
import com.newcafe.backend.entity.Horse;
import com.newcafe.backend.entity.Race;
import com.newcafe.backend.entity.RaceHorse;
import com.newcafe.backend.repository.BetRepository;
import com.newcafe.backend.repository.HorseRepository;
import com.newcafe.backend.repository.RaceRepository;

import lombok.RequiredArgsConstructor;

// 관리자용 경주 관리 — 출전마 수정 · 경주 목록 · 경주 추가/삭제. 규칙은 프론트 목업(/admin/race 달력)과 같다(사용자 결정 2026-10-27).
// 사용자용 service.RaceService와 빈 이름이 겹치지 않도록 이름을 지정한다.
@Service("adminRaceService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RaceService {

    // 클래스 이름이 같아 import 대신 전체 이름으로 쓴다. 출발 이 시간 전부터 마감(걸기 · 성향 반영이 끝난다)
    private static final Duration GATE_CLOSE = com.newcafe.backend.service.RaceService.GATE_CLOSE;
    // 지금부터 이 시간 안(또는 이미 지난 시각)의 경주는 추가·삭제할 수 없다
    private static final Duration LEAD = Duration.ofMinutes(1);
    // 경주 사이 최소 간격 — 손님 화면이 출발 뒤 10분 동안 그 경주를 보여 주므로 여유를 두어 20분
    private static final Duration MIN_GAP = Duration.ofMinutes(20);
    // 경주 시드. 지난 시드로 다음 시드를 맞힐 수 없도록 SecureRandom을 쓴다(java.util.Random 금지)
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter LABEL_FORMAT = DateTimeFormatter.ofPattern("M/d HH:mm");

    // 출전마 수정 폼 제한 (프론트 validateHorse.ts의 HORSE_LIMITS)
    private static final int NAME_ENG_MAX = 12;
    private static final int NAME_KOR_MAX = 8;
    private static final int COLOR_NAME_MAX = 6;
    private static final int PERSONALITY_MAX = 20;
    private static final int DESCRIPTION_MAX = 60;
    private static final Pattern NAME_ENG_PATTERN = Pattern.compile("^[A-Za-z][A-Za-z ]*$");
    private static final Pattern COLOR_PATTERN = Pattern.compile("^#[0-9a-fA-F]{6}$");
    // 고를 수 있는 이미지 — 출전마 7장(경기 화면도 같은 이미지를 쓴다)
    private static final List<String> HORSE_IMAGES = List.of(
            "/images/horses/thunder.png", "/images/horses/latte.png", "/images/horses/mocha.png",
            "/images/horses/espresso.png", "/images/horses/caramel.png", "/images/horses/vanilla.png",
            "/images/horses/cookie.png");

    // 오늘의 컨디션이 나올 확률 (프론트 condition.ts의 WEIGHTS와 같은 순서 · 값)
    private static final RaceHorse.Condition[] CONDITIONS = {
            RaceHorse.Condition.BEST, RaceHorse.Condition.GOOD, RaceHorse.Condition.NORMAL, RaceHorse.Condition.LOW };
    private static final double[] CONDITION_WEIGHTS = { 0.15, 0.35, 0.35, 0.15 };

    private final HorseRepository horseRepository;
    private final RaceRepository raceRepository;
    private final BetRepository betRepository;
    // 게이트 번호 배정은 정산과 같은 규칙이라 사용자용 RaceService.assignGates를 쓴다(클래스 이름이 같아 전체 이름으로)
    private final com.newcafe.backend.service.RaceService raceService;

    // 출전마 목록
    public List<HorseResponse> findHorses() {
        return horseRepository.findAllByOrderByIdAsc().stream()
                .map(HorseResponse::from)
                .toList();
    }

    // 출전마 수정 (7마리 고정, 추가·삭제 없음). 성향은 아직 마감 전인 경주의 사본(race_horses.trait)에도 반영한다 —
    // 마감한 경주는 그때 성향 그대로라 같은 시드로 다시 계산해도 같은 순위가 나온다.
    @Transactional
    public HorseResponse updateHorse(Long id, HorseRequest request) {
        Horse horse = horseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("HORSE_NOT_FOUND", "출전마를 찾을 수 없습니다. id=" + id));
        Horse.Trait trait = validate(id, request);

        horse.setNameKor(request.nameKor().trim());
        horse.setNameEng(request.nameEng().trim());
        horse.setColor(request.color());
        horse.setColorName(request.colorName().trim());
        horse.setImage(request.image());
        horse.setPersonality(request.personality().trim());
        horse.setTrait(trait);
        horse.setDescription(request.description().trim());

        OffsetDateTime open = OffsetDateTime.now().plus(GATE_CLOSE);
        for (Race race : raceRepository.findAllByStartTimeAfterOrderByStartTimeAsc(open)) {
            race.getHorses().stream()
                    .filter(rh -> rh.getHorse().getId().equals(id))
                    .forEach(rh -> rh.setTrait(trait));
        }
        return HorseResponse.from(horse);
    }

    // 경주 목록 (최신순) — 관리자 달력. 시드는 손님 화면과 같은 규칙으로 마감 뒤에만 보인다
    public List<RaceResponse> findRaces() {
        OffsetDateTime now = OffsetDateTime.now();
        return raceRepository.findAllByOrderByStartTimeDesc().stream()
                .map(race -> RaceResponse.from(race, com.newcafe.backend.service.RaceService.isSeedOpen(race, now)))
                .toList();
    }

    // 경주 추가 — 지금부터 1분 이내·지난 시각 금지, 경주 사이 20분 이상, 쿠폰이 걸린 경주 앞 금지.
    // 번호는 출발 순서대로(뒤 경주는 하나씩 밀린다), 시드는 SecureRandom, 출전마 7마리는 지금 성향 · 그날 컨디션으로 복사한다.
    @Transactional
    public RaceResponse createRace(RaceRequest request) {
        if (request == null || request.startTime() == null) {
            throw new BadRequestException("RACE_TIME_REQUIRED", "출발 시각을 입력해야 합니다.");
        }
        OffsetDateTime at = request.startTime();
        if (!at.isAfter(OffsetDateTime.now().plus(LEAD))) {
            throw new BadRequestException("RACE_TIME_TOO_SOON", "지금부터 1분 이내이거나 이미 지난 시각에는 경주를 추가할 수 없습니다.");
        }
        List<Race> near = raceRepository.findAllStartingBetween(at.minus(MIN_GAP), at.plus(MIN_GAP));
        if (!near.isEmpty()) {
            throw new ConflictException("RACE_TOO_CLOSE",
                    label(near.get(0)) + " 경주와 너무 가깝습니다. 경주 사이는 " + MIN_GAP.toMinutes() + "분 이상 띄워야 합니다.");
        }
        if (betRepository.existsByRaceStartTimeAfter(at)) {
            throw new ConflictException("RACE_BEFORE_BET", "쿠폰이 걸린 경주보다 앞에는 추가할 수 없습니다. 그 경주의 번호가 바뀝니다.");
        }

        raceRepository.shiftNoAfter(at, 1);

        Race race = new Race();
        race.setNo((int) raceRepository.countByStartTimeBefore(at) + 1);
        race.setStartTime(at);
        race.setSeed(RANDOM.nextInt() & 0xFFFFFFFFL); // 0 ~ 2^32-1
        LocalDate date = at.atZoneSameInstant(KST).toLocalDate();
        List<Horse> horses = horseRepository.findAllByOrderByIdAsc();
        if (horses.isEmpty()) {
            throw new ConflictException("HORSE_NOT_READY", "출전마가 없습니다.");
        }
        for (Horse horse : horses) {
            RaceHorse raceHorse = new RaceHorse();
            raceHorse.setRace(race);
            raceHorse.setHorse(horse);
            raceHorse.setTrait(horse.getTrait());
            raceHorse.setCondition(conditionOf(horse.getId(), date));
            race.getHorses().add(raceHorse);
        }
        raceService.assignGates(race);
        raceRepository.save(race);

        // 바로 뒤 경주는 앞 경주가 이 경주로 바뀌었으니 게이트 번호를 다시 정한다
        raceRepository.findFirstByStartTimeAfterOrderByStartTimeAsc(at).ifPresent(raceService::assignGates);
        return RaceResponse.from(race, false);
    }

    // 경주 삭제 — 출발 1분 전까지, 쿠폰이 걸리지 않은 경주만. 뒤 경주는 번호가 하나씩 당겨지고 바로 뒤 경주의 게이트 번호를 다시 정한다
    @Transactional
    public void deleteRace(Integer no) {
        Race race = raceRepository.findByNo(no)
                .orElseThrow(() -> new NotFoundException("RACE_NOT_FOUND", "경주를 찾을 수 없습니다. no=" + no));
        OffsetDateTime at = race.getStartTime();
        if (!at.isAfter(OffsetDateTime.now().plus(LEAD))) {
            throw new ConflictException("RACE_DELETE_TOO_LATE", "출발 1분 전부터는(이미 출발한 경주 포함) 삭제할 수 없습니다.");
        }
        if (betRepository.existsByRaceId(race.getId())) {
            throw new ConflictException("RACE_HAS_BETS", "쿠폰이 걸린 경주는 삭제할 수 없습니다.");
        }

        raceRepository.delete(race);
        raceRepository.shiftNoAfter(at, -1);
        raceRepository.findFirstByStartTimeAfterOrderByStartTimeAsc(at).ifPresent(raceService::assignGates);
    }

    // "Race #13(10/29 18:00)"
    private String label(Race race) {
        return "Race #" + race.getNo() + "(" + race.getStartTime().atZoneSameInstant(KST).format(LABEL_FORMAT) + ")";
    }

    // 오늘의 컨디션 — 말 · 날짜(KST)로 정해지는 표시용 값(프론트 condition.ts와 같은 계산이라 같은 날짜면 같은 값). 순위 계산에는 쓰지 않는다
    private static RaceHorse.Condition conditionOf(Long horseId, LocalDate date) {
        double r = unit(date + "|condition|" + horseId);
        for (int i = 0; i < CONDITIONS.length; i++) {
            if (r < CONDITION_WEIGHTS[i]) {
                return CONDITIONS[i];
            }
            r -= CONDITION_WEIGHTS[i];
        }
        return RaceHorse.Condition.NORMAL;
    }

    // FNV-1a 32bit → murmur3 마무리 섞기 → 0 이상 1 미만 (프론트 condition.ts의 unit과 같은 비트 연산)
    private static double unit(String str) {
        int h = 0x811c9dc5;
        for (int i = 0; i < str.length(); i++) {
            h ^= str.charAt(i);
            h *= 0x01000193;
        }
        h ^= h >>> 16;
        h *= 0x85ebca6b;
        h ^= h >>> 13;
        h *= 0xc2b2ae35;
        h ^= h >>> 16;
        return Integer.toUnsignedLong(h) / 4294967296.0;
    }

    // 출전마 수정 검증 (프론트 validateHorse.ts와 같은 규칙) — 통과하면 주행 성향을 돌려준다
    private Horse.Trait validate(Long id, HorseRequest request) {
        if (request == null) {
            throw new BadRequestException("HORSE_REQUEST_REQUIRED", "출전마 정보가 없습니다.");
        }
        String nameEng = trim(request.nameEng());
        if (nameEng.isEmpty()) {
            throw new BadRequestException("HORSE_NAME_ENG_REQUIRED", "영문 이름은 필수입니다.");
        }
        if (nameEng.length() > NAME_ENG_MAX || !NAME_ENG_PATTERN.matcher(nameEng).matches()) {
            throw new BadRequestException("HORSE_NAME_ENG_INVALID", "영문 이름은 영문자와 공백으로 " + NAME_ENG_MAX + "자 이내여야 합니다.");
        }
        if (horseRepository.existsByNameEngIgnoreCaseAndIdNot(nameEng, id)) {
            throw new ConflictException("HORSE_NAME_DUPLICATED", "다른 말이 이미 쓰는 영문 이름입니다: " + nameEng);
        }
        String nameKor = trim(request.nameKor());
        if (nameKor.isEmpty()) {
            throw new BadRequestException("HORSE_NAME_KOR_REQUIRED", "한글 이름은 필수입니다.");
        }
        if (nameKor.length() > NAME_KOR_MAX) {
            throw new BadRequestException("HORSE_NAME_KOR_INVALID", "한글 이름은 " + NAME_KOR_MAX + "자 이내여야 합니다.");
        }
        if (horseRepository.existsByNameKorAndIdNot(nameKor, id)) {
            throw new ConflictException("HORSE_NAME_DUPLICATED", "다른 말이 이미 쓰는 한글 이름입니다: " + nameKor);
        }
        if (request.color() == null || !COLOR_PATTERN.matcher(request.color()).matches()) {
            throw new BadRequestException("HORSE_COLOR_INVALID", "조끼 색은 #RRGGBB 형식이어야 합니다.");
        }
        String colorName = trim(request.colorName());
        if (colorName.isEmpty() || colorName.length() > COLOR_NAME_MAX) {
            throw new BadRequestException("HORSE_COLOR_NAME_INVALID", "색 이름은 1~" + COLOR_NAME_MAX + "자로 입력해야 합니다.");
        }
        if (!HORSE_IMAGES.contains(request.image())) {
            throw new BadRequestException("HORSE_IMAGE_INVALID", "출전마 이미지 7장 중에서 골라야 합니다.");
        }
        Horse.Trait trait;
        try {
            trait = Horse.Trait.valueOf(trim(request.trait()));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("HORSE_TRAIT_INVALID",
                    "주행 성향은 FAST_START · STEADY · LATE_SPURT · WILDCARD · BALANCED 중 하나여야 합니다.");
        }
        String personality = trim(request.personality());
        if (personality.isEmpty() || personality.length() > PERSONALITY_MAX) {
            throw new BadRequestException("HORSE_PERSONALITY_INVALID", "성격은 1~" + PERSONALITY_MAX + "자로 입력해야 합니다.");
        }
        String description = trim(request.description());
        if (description.isEmpty() || description.length() > DESCRIPTION_MAX) {
            throw new BadRequestException("HORSE_DESCRIPTION_INVALID", "설명은 1~" + DESCRIPTION_MAX + "자로 입력해야 합니다.");
        }
        return trait;
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
