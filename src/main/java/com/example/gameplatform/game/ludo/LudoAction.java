package com.example.gameplatform.game.ludo;

import com.example.gameplatform.game.core.GameAction;

public class LudoAction implements GameAction {
    public static final String ROLL_DICE = "ROLL_DICE";
    public static final String MOVE_PIECE = "MOVE_PIECE";
    public static final String PASS_TURN = "PASS_TURN";

    private String actionType;
    private Integer pieceIndex; // 0, 1, 2, or 3

    public LudoAction() {}

    public LudoAction(String actionType, Integer pieceIndex) {
        this.actionType = actionType != null ? actionType : ROLL_DICE;
        this.pieceIndex = pieceIndex;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String actionType = ROLL_DICE;
        private Integer pieceIndex;

        public Builder actionType(String actionType) { this.actionType = actionType; return this; }
        public Builder pieceIndex(Integer pieceIndex) { this.pieceIndex = pieceIndex; return this; }
        public LudoAction build() {
            return new LudoAction(actionType, pieceIndex);
        }
    }

    @Override
    public String getActionType() {
        return actionType != null ? actionType : ROLL_DICE;
    }

    public void setActionType(String actionType) { this.actionType = actionType; }
    public Integer getPieceIndex() { return pieceIndex; }
    public void setPieceIndex(Integer pieceIndex) { this.pieceIndex = pieceIndex; }
}
