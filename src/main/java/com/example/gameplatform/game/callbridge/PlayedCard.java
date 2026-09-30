package com.example.gameplatform.game.callbridge;

import java.util.Objects;

public class PlayedCard {
    private String playerId;
    private Card card;

    public PlayedCard() {}

    public PlayedCard(String playerId, Card card) {
        this.playerId = playerId;
        this.card = card;
    }

    public String getPlayerId() {
        return playerId;
    }

    public void setPlayerId(String playerId) {
        this.playerId = playerId;
    }

    public Card getCard() {
        return card;
    }

    public void setCard(Card card) {
        this.card = card;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PlayedCard that = (PlayedCard) o;
        return Objects.equals(playerId, that.playerId) && Objects.equals(card, that.card);
    }

    @Override
    public int hashCode() {
        return Objects.hash(playerId, card);
    }
}
