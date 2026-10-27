package com.newcafe.backend.controller.admin;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.race.HorseResponse;
import com.newcafe.backend.dto.race.RaceResponse;
import com.newcafe.backend.dto.race.admin.HorseRequest;
import com.newcafe.backend.dto.race.admin.RaceRequest;
import com.newcafe.backend.service.admin.RaceService;

import lombok.RequiredArgsConstructor;

// 관리자용 경주 관리 API (출전마·경주). 사용자용 controller.RaceController와 빈 이름이 겹치지 않도록 이름을 지정한다.
@RestController("adminRaceController")
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class RaceController {

    private final RaceService raceService;

    // GET /api/v1/admin/horses
    @GetMapping("/horses")
    public List<HorseResponse> findHorses() {
        return raceService.findHorses();
    }

    // PUT /api/v1/admin/horses/{id}
    @PutMapping("/horses/{id}")
    public HorseResponse updateHorse(@PathVariable Long id, @RequestBody HorseRequest request) {
        return raceService.updateHorse(id, request);
    }

    // GET /api/v1/admin/races
    @GetMapping("/races")
    public List<RaceResponse> findRaces() {
        return raceService.findRaces();
    }

    // POST /api/v1/admin/races (경주 추가 — 출발 시각만 받는다)
    @PostMapping("/races")
    @ResponseStatus(HttpStatus.CREATED)
    public RaceResponse createRace(@RequestBody RaceRequest request) {
        return raceService.createRace(request);
    }

    // DELETE /api/v1/admin/races/{raceNo} (출발 1분 전까지, 쿠폰이 걸리지 않은 경주만)
    @DeleteMapping("/races/{raceNo}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRace(@PathVariable Integer raceNo) {
        raceService.deleteRace(raceNo);
    }
}
