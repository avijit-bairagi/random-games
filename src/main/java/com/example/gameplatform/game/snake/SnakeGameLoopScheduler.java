package com.example.gameplatform.game.snake;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Retained for backward compatibility. Snake and Ladder is turn-based via dice rolls.
 */
@Component
public class SnakeGameLoopScheduler {
    private static final Logger log = LoggerFactory.getLogger(SnakeGameLoopScheduler.class);

    public SnakeGameLoopScheduler() {
        log.info("Snake and Ladder initialized (turn-based engine)");
    }
}
