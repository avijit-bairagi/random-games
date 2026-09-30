package com.example.gameplatform.game.twentynine;

import java.util.Objects;

public class TwentyNineCard {
    public static final String HEARTS = "HEARTS";
    public static final String DIAMONDS = "DIAMONDS";
    public static final String CLUBS = "CLUBS";
    public static final String SPADES = "SPADES";

    // Ranks in the 29 deck
    public static final String JACK = "J";
    public static final String NINE = "9";
    public static final String ACE = "A";
    public static final String TEN = "10";
    public static final String KING = "K";
    public static final String QUEEN = "Q";
    public static final String EIGHT = "8";
    public static final String SEVEN = "7";

    private String suit;
    private String rank;
    /** Card point value (J=3, 9=2, A=1, 10=1, K=0, Q=0, 8=0, 7=0) */
    private int points;
    /** Trick-taking rank order (higher = stronger): J=8, 9=7, A=6, 10=5, K=4, Q=3, 8=2, 7=1 */
    private int trickRank;

    public TwentyNineCard() {}

    public TwentyNineCard(String suit, String rank, int points, int trickRank) {
        this.suit = suit;
        this.rank = rank;
        this.points = points;
        this.trickRank = trickRank;
    }

    public String getSuit() { return suit; }
    public void setSuit(String suit) { this.suit = suit; }
    public String getRank() { return rank; }
    public void setRank(String rank) { this.rank = rank; }
    public int getPoints() { return points; }
    public void setPoints(int points) { this.points = points; }
    public int getTrickRank() { return trickRank; }
    public void setTrickRank(int trickRank) { this.trickRank = trickRank; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TwentyNineCard that = (TwentyNineCard) o;
        return Objects.equals(suit, that.suit) && Objects.equals(rank, that.rank);
    }

    @Override
    public int hashCode() {
        return Objects.hash(suit, rank);
    }

    @Override
    public String toString() {
        return rank + " of " + suit;
    }
}
