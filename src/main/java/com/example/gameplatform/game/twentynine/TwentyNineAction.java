package com.example.gameplatform.game.twentynine;

import com.example.gameplatform.game.core.GameAction;

public class TwentyNineAction implements GameAction {
    // Action types
    public static final String BID = "BID";
    public static final String PASS = "PASS";
    public static final String SELECT_TRUMP = "SELECT_TRUMP";
    public static final String PLAY_CARD = "PLAY_CARD";
    public static final String DOUBLE = "DOUBLE";
    public static final String REDOUBLE = "REDOUBLE";
    public static final String REQUEST_TRUMP = "REQUEST_TRUMP";
    public static final String CONTINUE = "CONTINUE";

    private String actionType;
    /** Bid value (15-28), used for BID action */
    private Integer bid;
    /** Trump suit chosen by highest bidder, used for SELECT_TRUMP action */
    private String trumpSuit;
    /** Card to play, used for PLAY_CARD action */
    private TwentyNineCard card;

    public TwentyNineAction() {}

    public TwentyNineAction(String actionType, Integer bid, String trumpSuit, TwentyNineCard card) {
        this.actionType = actionType;
        this.bid = bid;
        this.trumpSuit = trumpSuit;
        this.card = card;
    }

    // Factory methods
    public static TwentyNineAction bid(int bid) {
        return new TwentyNineAction(BID, bid, null, null);
    }

    public static TwentyNineAction pass() {
        return new TwentyNineAction(PASS, null, null, null);
    }

    public static TwentyNineAction selectTrump(String suit) {
        return new TwentyNineAction(SELECT_TRUMP, null, suit, null);
    }

    @Override
    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }
    public Integer getBid() { return bid; }
    public void setBid(Integer bid) { this.bid = bid; }
    public String getTrumpSuit() { return trumpSuit; }
    public void setTrumpSuit(String trumpSuit) { this.trumpSuit = trumpSuit; }
    public TwentyNineCard getCard() { return card; }
    public void setCard(TwentyNineCard card) { this.card = card; }
}
