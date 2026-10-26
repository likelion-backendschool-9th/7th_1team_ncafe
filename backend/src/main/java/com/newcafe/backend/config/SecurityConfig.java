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

// Spring Security 설정 (세션 로그인)
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // CSRF 토큰은 프론트 연동 단계에서 다시 켠다. 그동안 세션 쿠키는 SameSite=Lax (application.properties)
                .csrf(AbstractHttpConfigurer::disable)
                // 로그인·로그아웃은 AuthController에서 JSON으로 처리한다.
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/signup", "/api/v1/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/menus/**").permitAll()
                        // 경주 조회(출전표 · 일정 · 결과 · 기록)는 로그인 없이. 내 걸기 기록은 아래 규칙(로그인 필요)으로
                        .requestMatchers(HttpMethod.GET, "/api/v1/races/bets/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/races/**").permitAll()
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
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
