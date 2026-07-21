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
  activeSettingsTab: 'cardDisplay' | 'frequencies' | 'templates' | 'goals' | 'checkinOnboarding' | 'storage' | string;
  setActiveSettingsTab: (tab: 'cardDisplay' | 'frequencies' | 'templates' | 'goals' | 'checkinOnboarding' | 'storage' | string) => void;
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
  const [cardConfig, setCardConfigState] = useState<CardConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manager_pref_card_config');
      if (saved) {
        try { return { ...defaultConfig, ...JSON.parse(saved) }; } catch (e) {}
      }
    }
    return initialConfig ?? defaultConfig;
  });

  const [goalModalConfig, setGoalModalConfigState] = useState<GoalModalConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manager_pref_goal_modal_config');
      if (saved) {
        try { return { ...defaultGoalModalConfig, ...JSON.parse(saved) }; } catch (e) {}
      }
    }
    return initialGoalModalConfig ?? defaultGoalModalConfig;
  });

  const [activeSettingsTab, setActiveSettingsTab] = useState<string>('cardDisplay');

  const setCardConfig = (cfg: CardConfig) => {
    setCardConfigState(cfg);
    if (typeof window !== 'undefined') {
      localStorage.setItem('manager_pref_card_config', JSON.stringify(cfg));
    }
  };

  const setGoalModalConfig = (cfg: GoalModalConfig) => {
    setGoalModalConfigState(cfg);
    if (typeof window !== 'undefined') {
      localStorage.setItem('manager_pref_goal_modal_config', JSON.stringify(cfg));
    }
  };

  return (
    <CardConfigContext.Provider value={{ cardConfig, setCardConfig, goalModalConfig, setGoalModalConfig, activeSettingsTab, setActiveSettingsTab }}>
      {children}
    </CardConfigContext.Provider>
  );
}

export function useCardConfig() {
  return useContext(CardConfigContext);
}
