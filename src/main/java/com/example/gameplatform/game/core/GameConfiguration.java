package com.example.gameplatform.game.core;

import com.fasterxml.jackson.annotation.JsonTypeInfo;

import java.util.Map;

@JsonTypeInfo(use = JsonTypeInfo.Id.NONE)
public interface GameConfiguration {
    Map<String, Object> getCustomOptions();
}
