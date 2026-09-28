package com.example.gameplatform.game.core;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameEngineRegistry {
    private final Map<String, GameEngine<?, ?, ?>> engines = new ConcurrentHashMap<>();

    public GameEngineRegistry(List<GameEngine<?, ?, ?>> engineList) {
        if (engineList != null) {
            for (GameEngine<?, ?, ?> engine : engineList) {
                register(engine);
            }
        }
    }

    public void register(GameEngine<?, ?, ?> engine) {
        engines.put(engine.gameType().toUpperCase(), engine);
    }

    @SuppressWarnings("unchecked")
    public <S, A extends GameAction, C extends GameConfiguration> Optional<GameEngine<S, A, C>> get(String gameType) {
        if (gameType == null) {
            return Optional.empty();
        }
        GameEngine<?, ?, ?> engine = engines.get(gameType.toUpperCase());
        return Optional.ofNullable((GameEngine<S, A, C>) engine);
    }

    public Collection<GameEngine<?, ?, ?>> getAllEngines() {
        return Collections.unmodifiableCollection(engines.values());
    }

    public boolean supports(String gameType) {
        return gameType != null && engines.containsKey(gameType.toUpperCase());
    }
}
