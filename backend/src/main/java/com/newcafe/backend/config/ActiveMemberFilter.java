package com.newcafe.backend.config;

import java.io.IOException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.filter.OncePerRequestFilter;
import com.newcafe.backend.repository.MemberRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/** 탈퇴 및 비밀번호 변경을 다른 브라우저의 기존 세션에도 반영한다. */
@RequiredArgsConstructor
public class ActiveMemberFilter extends OncePerRequestFilter {
    private final MemberRepository members;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetails user) {
            boolean active = members.findByNoAndDeletedFalse(Long.valueOf(user.getUsername()))
                    .filter(member -> member.getPassword().equals(user.getPassword()))
                    .filter(member -> user.getAuthorities().stream()
                            .anyMatch(role -> role.getAuthority().equals("ROLE_" + member.getRole().name())))
                    .isPresent();
            if (!active) {
                SecurityContextHolder.clearContext();
                var session = request.getSession(false);
                if (session != null) session.invalidate();
            }
        }
        chain.doFilter(request, response);
    }
}
