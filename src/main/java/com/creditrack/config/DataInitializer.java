package com.creditrack.config;

import com.creditrack.model.Role;
import com.creditrack.model.User;
import com.creditrack.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @org.springframework.beans.factory.annotation.Value("${SEED_ADMIN_PASSWORD:#{null}}")
    private String adminPassword;

    @org.springframework.beans.factory.annotation.Value("${SEED_OFFICER_PASSWORD:#{null}}")
    private String officerPassword;

    @org.springframework.beans.factory.annotation.Value("${SEED_CUSTOMER_PASSWORD:#{null}}")
    private String customerPassword;

    @Override
    public void run(String... args) {
        if (adminPassword != null && !adminPassword.isBlank()) {
            seedUser("Admin User", "admin@creditrack.com", adminPassword, Role.ADMIN);
        }
        if (officerPassword != null && !officerPassword.isBlank()) {
            seedUser("Loan Officer Sarah", "officer@creditrack.com", officerPassword, Role.LOAN_OFFICER);
        }
        if (customerPassword != null && !customerPassword.isBlank()) {
            seedUser("John Customer", "customer@creditrack.com", customerPassword, Role.CUSTOMER);
        }
    }

    private void seedUser(String name, String email, String rawPassword, Role role) {
        if (!userRepository.existsByEmail(email)) {
            User user = User.builder()
                    .fullName(name)
                    .email(email)
                    .password(passwordEncoder.encode(rawPassword))
                    .role(role)
                    .build();
            userRepository.save(user);
            log.info("Seeded default {} account: {}", role, email);
        }
    }
}
