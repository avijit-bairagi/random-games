package com.example.gameplatform.game.chess;

import com.example.gameplatform.game.core.GameAction;

public class ChessAction implements GameAction {
    public static final String MOVE = "MOVE";

    private String actionType;
    private String from;
    private String to;
    private String promotion;

    public ChessAction() {}

    public ChessAction(String actionType, String from, String to, String promotion) {
        this.actionType = actionType != null ? actionType : MOVE;
        this.from = from;
        this.to = to;
        this.promotion = promotion;
    }

    public static Builder builder() {
        return new Builder();
    }

    @Override
    public String getActionType() {
        return actionType != null ? actionType : MOVE;
    }

    public void setActionType(String actionType) { this.actionType = actionType; }
    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }
    public String getTo() { return to; }
    public void setTo(String to) { this.to = to; }
    public String getPromotion() { return promotion; }
    public void setPromotion(String promotion) { this.promotion = promotion; }

    public static class Builder {
        private String actionType;
        private String from;
        private String to;
        private String promotion;

        public Builder actionType(String actionType) { this.actionType = actionType; return this; }
        public Builder from(String from) { this.from = from; return this; }
        public Builder to(String to) { this.to = to; return this; }
        public Builder promotion(String promotion) { this.promotion = promotion; return this; }

        public ChessAction build() {
            return new ChessAction(actionType, from, to, promotion);
        }
    }
}
