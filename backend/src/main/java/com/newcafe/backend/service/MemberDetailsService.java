package com.newcafe.backend.service;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.newcafe.backend.entity.Member;
import com.newcafe.backend.repository.MemberRepository;

import lombok.RequiredArgsConstructor;

// Spring Security 로그인 시 회원아이디로 회원을 조회한다 (AuthService.login → AuthenticationManager → 여기).
@Service
@RequiredArgsConstructor
public class MemberDetailsService implements UserDetailsService {

    private final MemberRepository memberRepository;

    // username에는 회원 관리번호(no)를 넣는다. 로그인 후 authentication.getName()으로 no를 얻는다.
    @Override
    public UserDetails loadUserByUsername(String loginId) {
        Member member = memberRepository.findByLoginIdAndDeletedFalse(loginId)
                .orElseThrow(() -> new UsernameNotFoundException("회원을 찾을 수 없습니다: " + loginId));

        return User.withUsername(String.valueOf(member.getNo()))
                .password(member.getPassword())
                .roles(member.getRole().name())
                .build();
    }
}
