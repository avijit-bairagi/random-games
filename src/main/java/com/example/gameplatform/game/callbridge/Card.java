package com.example.gameplatform.game.callbridge;

import java.util.Objects;

public class Card implements Comparable<Card> {
    public static final String SPADES = "SPADES";
    public static final String HEARTS = "HEARTS";
    public static final String DIAMONDS = "DIAMONDS";
    public static final String CLUBS = "CLUBS";

    private String suit;
    private String rank;
    private int value;

    public Card() {}

    public Card(String suit, String rank, int value) {
        this.suit = suit;
        this.rank = rank;
        this.value = value;
    }

    public static Card of(String suit, String rank, int value) {
        return new Card(suit, rank, value);
    }

    public String getSuit() {
        return suit;
    }

    public void setSuit(String suit) {
        this.suit = suit;
    }

    public String getRank() {
        return rank;
    }

    public void setRank(String rank) {
        this.rank = rank;
    }

    public int getValue() {
        return value;
    }

    public void setValue(int value) {
        this.value = value;
    }

    public String getSuitSymbol() {
        if (suit == null) return "";
        return switch (suit.toUpperCase()) {
            case SPADES -> "♠";
            case HEARTS -> "♥";
            case DIAMONDS -> "♦";
            case CLUBS -> "♣";
            default -> "";
        };
    }

    public boolean isRed() {
        return HEARTS.equalsIgnoreCase(suit) || DIAMONDS.equalsIgnoreCase(suit);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Card card = (Card) o;
        return value == card.value &&
                Objects.equals(suit, card.suit) &&
                Objects.equals(rank, card.rank);
    }

    @Override
    public int hashCode() {
        return Objects.hash(suit, rank, value);
    }

    @Override
    public String toString() {
        return rank + getSuitSymbol();
    }

    @Override
    public int compareTo(Card o) {
        if (o == null) return 1;
        int suitOrder1 = suitOrder(this.suit);
        int suitOrder2 = suitOrder(o.suit);
        if (suitOrder1 != suitOrder2) {
            return Integer.compare(suitOrder1, suitOrder2);
        }
        return Integer.compare(this.value, o.value);
    }

    private static int suitOrder(String s) {
        if (s == null) return 0;
        return switch (s.toUpperCase()) {
            case SPADES -> 4;
            case HEARTS -> 3;
            case DIAMONDS -> 2;
            case CLUBS -> 1;
            default -> 0;
        };
    }
}
