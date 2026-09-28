package com.example.gameplatform.game.core;

import com.example.gameplatform.player.model.Player;

import java.util.List;
import java.util.Map;

public interface GameEngine<S, A extends GameAction, C extends GameConfiguration> {

    String gameType();

    String displayName();

    int minPlayers();

    int maxPlayers();

    boolean isSpectatorAllowed();

    boolean isLateJoinAllowed();

    C defaultConfiguration();

    GameState<S> createGame(String gameId, List<Player> players, C configuration);

    GameResult processAction(GameState<?> state, Player player, A action);

    boolean isValidAction(GameState<?> state, Player player, A action);

    GameResult onPlayerDisconnect(GameState<?> state, Player player);

    GameResult onPlayerReconnect(GameState<?> state, Player player);

    A parseAction(Map<String, Object> rawAction);

    C parseConfiguration(Map<String, Object> rawConfig);
}
