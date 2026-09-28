package com.example.gameplatform.game.snake;

import com.example.gameplatform.game.core.GameAction;

public class SnakeAction implements GameAction {
    public static final String ROLL_DICE = "ROLL_DICE";

    private String actionType;
    private Integer diceValue; // Optional, for testing/authoritative test overrides

    public SnakeAction() {}

    public SnakeAction(String actionType) {
        this.actionType = actionType != null ? actionType : ROLL_DICE;
    }

    public SnakeAction(String actionType, Integer diceValue) {
        this.actionType = actionType != null ? actionType : ROLL_DICE;
        this.diceValue = diceValue;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String actionType = ROLL_DICE;
        private Integer diceValue;

        public Builder actionType(String actionType) { this.actionType = actionType; return this; }
        public Builder diceValue(Integer diceValue) { this.diceValue = diceValue; return this; }
        public SnakeAction build() {
            return new SnakeAction(actionType, diceValue);
        }
    }

    @Override
    public String getActionType() {
        return actionType != null ? actionType : ROLL_DICE;
    }

    public void setActionType(String actionType) { this.actionType = actionType; }
    public Integer getDiceValue() { return diceValue; }
    public void setDiceValue(Integer diceValue) { this.diceValue = diceValue; }
}
