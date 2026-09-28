package com.example.gameplatform.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
public class PlatformMetrics {

    private final Counter gamesCreatedCounter;
    private final Counter gamesCompletedCounter;
    private final Counter invalidActionsCounter;
    private final Counter disconnectCounter;
    private final Counter reconnectCounter;
    private final Timer gameDurationTimer;

    public PlatformMetrics(MeterRegistry registry) {
        this.gamesCreatedCounter = Counter.builder("game.created.total")
                .description("Total number of games created")
                .register(registry);

        this.gamesCompletedCounter = Counter.builder("game.completed.total")
                .description("Total number of games finished")
                .register(registry);

        this.invalidActionsCounter = Counter.builder("game.actions.invalid.total")
                .description("Total number of invalid game actions")
                .register(registry);

        this.disconnectCounter = Counter.builder("game.players.disconnect.total")
                .description("Total number of player disconnects")
                .register(registry);

        this.reconnectCounter = Counter.builder("game.players.reconnect.total")
                .description("Total number of player reconnects")
                .register(registry);

        this.gameDurationTimer = Timer.builder("game.duration")
                .description("Duration of completed games")
                .register(registry);
    }

    public void incrementGamesCreated() {
        gamesCreatedCounter.increment();
    }

    public void incrementGamesCompleted() {
        gamesCompletedCounter.increment();
    }

    public void incrementInvalidActions() {
        invalidActionsCounter.increment();
    }

    public void incrementDisconnects() {
        disconnectCounter.increment();
    }

    public void incrementReconnects() {
        reconnectCounter.increment();
    }

    public void recordGameDuration(long durationMillis) {
        gameDurationTimer.record(durationMillis, TimeUnit.MILLISECONDS);
    }
}
