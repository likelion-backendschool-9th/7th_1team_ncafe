package com.newcafe.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import com.newcafe.backend.repository.MemberRepository;

// Spring Security 설정 (세션 로그인)
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, MemberRepository members) throws Exception {
        http
                // 변경 요청은 /auth/csrf에서 받은 토큰과 세션 쿠키를 함께 보낸다.
                .csrf(csrf -> {})
                .addFilterBefore(new ActiveMemberFilter(members), AuthorizationFilter.class)
                // 로그인·로그아웃은 AuthController에서 JSON으로 처리한다.
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/signup", "/api/v1/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/menus/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/admin/members", "/api/v1/admin/members/**")
                        .hasAnyRole("ADMIN", "HQ_ADMIN", "BRANCH_ADMIN")
                        .requestMatchers("/api/v1/admin/**").hasAnyRole("ADMIN", "HQ_ADMIN")
                        // 그 외 API는 로그인 필요. 로그인 없이 열어야 하는 API는 위에 추가한다.
                        .anyRequest().authenticated())
                // 로그인하지 않은 요청은 401 (권한 없음은 기본값 403)
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // AuthService.login에서 사용 (MemberDetailsService + PasswordEncoder로 아이디·비밀번호 확인)
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
