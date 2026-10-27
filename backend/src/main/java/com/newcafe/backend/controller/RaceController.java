package com.newcafe.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.race.BetRequest;
import com.newcafe.backend.dto.race.BetResponse;
import com.newcafe.backend.dto.race.HorseResponse;
import com.newcafe.backend.dto.race.RaceResponse;
import com.newcafe.backend.service.AuthService;
import com.newcafe.backend.service.RaceService;

import lombok.RequiredArgsConstructor;

// 사용자용 경주 API. 조회는 로그인 없이, 걸기·내 기록은 로그인한 회원 기준
@RestController
@RequestMapping("/api/v1/races")
@RequiredArgsConstructor
public class RaceController {

    private final RaceService raceService;

    // GET /api/v1/races (지난 경주 기록)
    @GetMapping
    public List<RaceResponse> findHistory() {
        return raceService.findHistory();
    }

    // GET /api/v1/races/next (다음 경주 출전표, 예정된 경주가 없으면 404)
    @GetMapping("/next")
    public RaceResponse findNext() {
        return raceService.findNext();
    }

    // GET /api/v1/races/schedule (오늘부터의 경주 일정)
    @GetMapping("/schedule")
    public List<RaceResponse> findSchedule() {
        return raceService.findSchedule();
    }

    // GET /api/v1/races/horses (출전마 7마리 — 예정된 경주가 없어도 출전표 · 메인에 보여 준다)
    @GetMapping("/horses")
    public List<HorseResponse> findHorses() {
        return raceService.findHorses();
    }

    // GET /api/v1/races/{raceNo}
    @GetMapping("/{raceNo}")
    public RaceResponse findByNo(@PathVariable Integer raceNo) {
        return raceService.findByNo(raceNo);
    }

    // POST /api/v1/races/{raceNo}/bets (걸기)
    @PostMapping("/{raceNo}/bets")
    @ResponseStatus(HttpStatus.CREATED)
    public BetResponse placeBet(@PathVariable Integer raceNo,
                                @RequestBody BetRequest request,
                                Authentication authentication) {
        return raceService.placeBet(AuthService.loginMemberNo(authentication), raceNo, request);
    }

    // GET /api/v1/races/bets/me (내 걸기 기록)
    @GetMapping("/bets/me")
    public List<BetResponse> findMyBets(Authentication authentication) {
        return raceService.findMyBets(AuthService.loginMemberNo(authentication));
    }
}
