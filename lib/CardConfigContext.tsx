"use client";
import React, { createContext, useContext, useState } from "react";

export type CardConfig = {
  showProgressTrend: boolean;
  showWorkload: boolean;
  showQuickStats: boolean;
  showMeetingDates: boolean;
  showGoalProgress: boolean;
  showDepartment: boolean;
  fieldOrder: string[];
  cardSize?: 'mini' | 'compact' | 'large';
};

const defaultConfig: CardConfig = {
  showProgressTrend: false,
  showWorkload: true,
  showQuickStats: true,
  showMeetingDates: true,
  showGoalProgress: false,
  showDepartment: true,
  fieldOrder: [
    'showGoalProgress',
    'showDepartment',
    'showProgressTrend',
    'showWorkload',
    'showQuickStats',
    'showMeetingDates'
  ],
  cardSize: 'compact',
};

export type GoalModalConfig = {
  size?: 'mini' | 'large';
  showDescription: boolean;
  showParentGoal: boolean;
  showTags: boolean;
  showDueDate: boolean;
  showPriority: boolean;
  showConfidence: boolean;
  showSubgoals: boolean;
};

const defaultGoalModalConfig: GoalModalConfig = {
  size: 'large',
  showDescription: true,
  showParentGoal: true,
  showTags: true,
  showDueDate: true,
  showPriority: true,
  showConfidence: true,
  showSubgoals: true,
};

type CardConfigContextType = {
  cardConfig: CardConfig;
  setCardConfig: (config: CardConfig) => void;
  goalModalConfig: GoalModalConfig;
  setGoalModalConfig: (config: GoalModalConfig) => void;
  activeSettingsTab: 'cardDisplay' | 'frequencies' | 'templates' | 'goals';
  setActiveSettingsTab: (tab: 'cardDisplay' | 'frequencies' | 'templates' | 'goals') => void;
};

const CardConfigContext = createContext<CardConfigContextType>({
  cardConfig: defaultConfig,
  setCardConfig: () => {},
  goalModalConfig: defaultGoalModalConfig,
  setGoalModalConfig: () => {},
  activeSettingsTab: 'cardDisplay',
  setActiveSettingsTab: () => {},
});

export function CardConfigProvider({
  children,
  initialConfig,
  initialGoalModalConfig,
}: {
  children: React.ReactNode;
  initialConfig?: CardConfig;
  initialGoalModalConfig?: GoalModalConfig;
}) {
  const [cardConfig, setCardConfig] = useState<CardConfig>(initialConfig ?? defaultConfig);
  const [goalModalConfig, setGoalModalConfig] = useState<GoalModalConfig>(initialGoalModalConfig ?? defaultGoalModalConfig);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'cardDisplay' | 'frequencies' | 'templates' | 'goals'>('cardDisplay');

  return (
    <CardConfigContext.Provider value={{ cardConfig, setCardConfig, goalModalConfig, setGoalModalConfig, activeSettingsTab, setActiveSettingsTab }}>
      {children}
    </CardConfigContext.Provider>
  );
}

export function useCardConfig() {
  return useContext(CardConfigContext);
}
