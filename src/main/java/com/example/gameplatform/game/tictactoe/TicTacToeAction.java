package com.example.gameplatform.game.tictactoe;

import com.example.gameplatform.game.core.GameAction;

public class TicTacToeAction implements GameAction {
    public static final String PLACE_MARK = "PLACE_MARK";

    private String actionType;
    private int row;
    private int column;

    public TicTacToeAction() {}

    public TicTacToeAction(String actionType, int row, int column) {
        this.actionType = actionType != null ? actionType : PLACE_MARK;
        this.row = row;
        this.column = column;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String actionType = PLACE_MARK;
        private int row;
        private int column;

        public Builder actionType(String actionType) { this.actionType = actionType; return this; }
        public Builder row(int row) { this.row = row; return this; }
        public Builder column(int column) { this.column = column; return this; }
        public TicTacToeAction build() {
            return new TicTacToeAction(actionType, row, column);
        }
    }

    @Override
    public String getActionType() {
        return actionType != null ? actionType : PLACE_MARK;
    }

    public void setActionType(String actionType) { this.actionType = actionType; }
    public int getRow() { return row; }
    public void setRow(int row) { this.row = row; }
    public int getColumn() { return column; }
    public void setColumn(int column) { this.column = column; }
}
