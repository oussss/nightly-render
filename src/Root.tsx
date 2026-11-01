import React from "react";
import { Composition } from "remotion";
import { SalonStory, STORY_FPS, calcSalonStory } from "./SalonStory";

export const RemotionRoot: React.FC = () => (
  <Composition id="SalonStory" component={SalonStory} durationInFrames={600} fps={STORY_FPS} width={1080} height={1920} calculateMetadata={calcSalonStory} defaultProps={{ dir: "story/example", events: [] }} />
);
