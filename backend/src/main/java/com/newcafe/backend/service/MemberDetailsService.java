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

        return new User(String.valueOf(member.getNo()), member.getPassword(),
                java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority(
                        "ROLE_" + member.getRole().name()))) {
            // 기존 세션의 비밀번호 변경 여부를 확인하기 위해 해시만 유지한다.
            // 인증 토큰의 원문 credentials는 ProviderManager가 제거한다.
            @Override
            public void eraseCredentials() {}
        };
    }
}
