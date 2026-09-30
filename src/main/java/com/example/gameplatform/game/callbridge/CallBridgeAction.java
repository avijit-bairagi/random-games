package com.example.gameplatform.game.callbridge;

import com.example.gameplatform.game.core.GameAction;

public class CallBridgeAction implements GameAction {
    public static final String BID = "BID";
    public static final String PLAY_CARD = "PLAY_CARD";

    private String actionType;
    private Integer bid;
    private Card card;

    public CallBridgeAction() {}

    public CallBridgeAction(String actionType, Integer bid, Card card) {
        this.actionType = actionType;
        this.bid = bid;
        this.card = card;
    }

    public static CallBridgeAction bid(int bid) {
        return new CallBridgeAction(BID, bid, null);
    }

    public static CallBridgeAction playCard(Card card) {
        return new CallBridgeAction(PLAY_CARD, null, card);
    }

    @Override
    public String getActionType() {
        return actionType != null ? actionType : PLAY_CARD;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }

    public Integer getBid() {
        return bid;
    }

    public void setBid(Integer bid) {
        this.bid = bid;
    }

    public Card getCard() {
        return card;
    }

    public void setCard(Card card) {
        this.card = card;
    }
}
