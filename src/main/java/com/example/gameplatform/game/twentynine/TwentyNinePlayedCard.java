package com.example.gameplatform.game.twentynine;

import java.util.Objects;

public class TwentyNinePlayedCard {
    private String playerId;
    private TwentyNineCard card;

    public TwentyNinePlayedCard() {}

    public TwentyNinePlayedCard(String playerId, TwentyNineCard card) {
        this.playerId = playerId;
        this.card = card;
    }

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }
    public TwentyNineCard getCard() { return card; }
    public void setCard(TwentyNineCard card) { this.card = card; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TwentyNinePlayedCard that = (TwentyNinePlayedCard) o;
        return Objects.equals(playerId, that.playerId) && Objects.equals(card, that.card);
    }

    @Override
    public int hashCode() {
        return Objects.hash(playerId, card);
    }
}
