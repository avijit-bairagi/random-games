package com.example.gameplatform.game.core;

import java.util.List;
import java.util.Map;

public interface GameState<S> {
    String getGameId();
    String getGameType();
    GameStatus getStatus();
    List<String> getPlayers();
    String getWinner();
    int getSequence();
    long getUpdatedAt();
    S getDetails();
    Map<String, Object> toSummary();
}
