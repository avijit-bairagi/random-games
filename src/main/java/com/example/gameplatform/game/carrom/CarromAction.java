package com.example.gameplatform.game.carrom;

import com.example.gameplatform.game.core.GameAction;

/**
 * Represents a player action in Carrom.
 *
 * <p>Action types:
 * <ul>
 *   <li>{@code STRIKE} – flick the striker at a given angle (degrees) with a given power (0.0–1.0)
 *       and optional horizontal offset (-1.0 to 1.0 relative to baseline centre).</li>
 * </ul>
 */
public class CarromAction implements GameAction {

    public static final String STRIKE = "STRIKE";

    private String actionType;

    /**
     * Horizontal position of the striker along the player's baseline,
     * expressed as a value in [-1.0, 1.0] where 0.0 is the centre of the board.
     * Clamped server-side to the legal sliding range.
     */
    private double strikerX;

    /**
     * Launch angle in degrees, measured anti-clockwise from the direction
     * pointing toward the opposite baseline (i.e. 0° = straight ahead).
     * Range: [-45, 45] for each player's perspective, mapped to absolute board angle.
     */
    private double angle;

    /**
     * Strike power, normalised to [0.0, 1.0].
     */
    private double power;

    public CarromAction() {}

    public CarromAction(String actionType, double strikerX, double angle, double power) {
        this.actionType = actionType != null ? actionType : STRIKE;
        this.strikerX   = strikerX;
        this.angle      = angle;
        this.power      = power;
    }

    public static Builder builder() { return new Builder(); }

    @Override
    public String getActionType() { return actionType != null ? actionType : STRIKE; }
    public void setActionType(String actionType) { this.actionType = actionType; }

    public double getStrikerX() { return strikerX; }
    public void setStrikerX(double strikerX) { this.strikerX = strikerX; }

    public double getAngle() { return angle; }
    public void setAngle(double angle) { this.angle = angle; }

    public double getPower() { return power; }
    public void setPower(double power) { this.power = power; }

    // ---- Builder ----

    public static class Builder {
        private String actionType;
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
}
