package com.example.gameplatform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GamePlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(GamePlatformApplication.class, args);
    }
}
