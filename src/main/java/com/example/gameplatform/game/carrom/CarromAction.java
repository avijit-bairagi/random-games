package com.example.gameplatform.game.carrom;

import com.example.gameplatform.game.core.GameAction;

public class CarromAction implements GameAction {
    public static final String STRIKE = "STRIKE";

    private String actionType;
    // Striker position along the baseline (0.0 to 1.0, normalized)
    private double strikerX;
    // Angle in degrees (0 = right, 90 = up, etc.)
    private double angle;
    // Power (0.0 to 1.0)
    private double power;

    public CarromAction() {}

    public CarromAction(String actionType, double strikerX, double angle, double power) {
        this.actionType = actionType != null ? actionType : STRIKE;
        this.strikerX = strikerX;
        this.angle = angle;
        this.power = Math.max(0.0, Math.min(1.0, power));
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String actionType = STRIKE;
        private double strikerX;
        private double angle;
        private double power;

        public Builder actionType(String actionType) { this.actionType = actionType; return this; }
        public Builder strikerX(double strikerX) { this.strikerX = strikerX; return this; }
        public Builder angle(double angle) { this.angle = angle; return this; }
        public Builder power(double power) { this.power = power; return this; }
        public CarromAction build() {
            return new CarromAction(actionType, strikerX, angle, power);
        }
    }

    @Override
    public String getActionType() {
        return actionType != null ? actionType : STRIKE;
    }

    public void setActionType(String actionType) { this.actionType = actionType; }
    public double getStrikerX() { return strikerX; }
    public void setStrikerX(double strikerX) { this.strikerX = strikerX; }
    public double getAngle() { return angle; }
    public void setAngle(double angle) { this.angle = angle; }
    public double getPower() { return power; }
    public void setPower(double power) { this.power = power; }
}
