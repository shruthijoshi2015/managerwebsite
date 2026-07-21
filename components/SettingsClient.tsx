"use client";
import { useState, useRef } from "react";
import { updateConfig } from "@/lib/actions";
import { Save, Plus, Trash2, Settings, FileText, CheckCircle2, LayoutGrid, GripVertical, Target, Database } from "lucide-react";
import { TeamCard } from "./TeamCard";
import { TeamListRow } from "./TeamListRow";
import { useCardConfig, GoalModalConfig } from "@/lib/CardConfigContext";
import { getStorageConfig, saveStorageConfig, StorageMode } from "@/lib/storageProvider";
import { useIndexedDB } from "@/components/IndexedDBProvider";
import { SyncStatusIndicator } from "./OneDriveSyncModal";
import { ONBOARDING_TEMPLATES } from "./OnboardingModal";

export function SettingsClient({ initialConfig }: { initialConfig: any }) {
  const [config, setConfig] = useState(initialConfig);
  const { cardConfig, setCardConfig, goalModalConfig, setGoalModalConfig, activeSettingsTab, setActiveSettingsTab } = useCardConfig();
  const { persistAfterMutation } = useIndexedDB();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewTab, setPreviewTab] = useState<'card' | 'list'>('card');
  const [dragFieldIdx, setDragFieldIdx] = useState(-1);
  const dragFromFieldIdx = useRef(-1);
  const [showAddFreq, setShowAddFreq] = useState(false);
  const [newFreqId, setNewFreqId] = useState("");
  const [newFreqLabel, setNewFreqLabel] = useState("");
  const [storageCfg, setStorageCfg] = useState(() => typeof window !== 'undefined' ? getStorageConfig() : { mode: 'server' as StorageMode, isConfigured: true });
  const [sidebarExpanded, setSidebarExpanded] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('manager_sidebar_expanded') !== 'false' : true);
  const [selectedTplFreqId, setSelectedTplFreqId] = useState("weekly");
  const [selectedOnboardRole, setSelectedOnboardRole] = useState<'frontend' | 'backend' | 'general'>('frontend');
  const [templateSectionTab, setTemplateSectionTab] = useState<'checkin' | 'onboarding'>('checkin');

  // activeTab is now persisted in context as activeSettingsTab
  const activeTab = activeSettingsTab;
  const setActiveTab = setActiveSettingsTab;

  const handleSave = async (overrideCardConfig?: any, overrideGoalModalConfig?: any) => {
    setIsSaving(true);
    await updateConfig({
      ...config,
      cardConfig: overrideCardConfig || cardConfig,
      goalModalConfig: overrideGoalModalConfig || goalModalConfig,
      templates: config.templates?.map((t: any) => {
        const copy = {...t};
        delete copy._deleted;
        return copy;
      })
    });
    await persistAfterMutation();
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const addFreq = () => {
    if (newFreqId && newFreqLabel) {
      const newTpl = {
        id: "t_" + newFreqId,
        type: "frequency",
        freqId: newFreqId,
        name: newFreqLabel,
        content: `### Highlights & Wins\n- \n\n### Current Focus & Priorities\n- \n\n### Action Items\n- [ ] \n`
      };
      setConfig({
        ...config,
        checkInFrequencies: [...(config.checkInFrequencies || []), { id: newFreqId, label: newFreqLabel }],
        templates: [...(config.templates || []), newTpl]
      });
      setNewFreqId("");
      setNewFreqLabel("");
      setShowAddFreq(false);
    }
  };

  const removeFreq = (id: string) => {
    setConfig({
      ...config,
      checkInFrequencies: config.checkInFrequencies.filter((f: any) => f.id !== id)
    });
  };

  const addTemplate = () => {
    const newTpl = {
      id: "tpl_" + Date.now(),
      type: 'frequency',
      freqId: 'weekly',
      name: 'New Template',
      content: '### Section 1\n\nContent goes here...\n'
    };
    setConfig({
      ...config,
      templates: [...(config.templates || []), newTpl]
    });
  };

  const updateTemplate = (id: string, field: string, value: string) => {
    setConfig({
      ...config,
      templates: config.templates.map((t: any) => t.id === id ? { ...t, [field]: value } : t)
    });
  };

  const removeTemplate = (id: string) => {
    setConfig({
      ...config,
      templates: config.templates.map((t: any) => t.id === id ? { ...t, _deleted: true } : t).filter((t: any) => !t._deleted)
    });
  };

  const toggleCardConfig = (field: string) => {
    const currentValue = cardConfig[field as keyof typeof cardConfig] !== false;
    const newCardConfig = {
      ...cardConfig,
      [field]: !currentValue
    };
    setConfig({ ...config, cardConfig: newCardConfig });
    setCardConfig(newCardConfig);
    handleSave(newCardConfig);
  };

  const toggleGoalModalConfig = (field: keyof GoalModalConfig) => {
    const newGoalModalConfig = {
      ...goalModalConfig,
      [field]: !goalModalConfig[field]
    };
    setConfig({ ...config, goalModalConfig: newGoalModalConfig });
    setGoalModalConfig(newGoalModalConfig);
    handleSave(undefined, newGoalModalConfig);
  };

  const mockMember = {
    id: 999,
    name: "Abhinay Kumar",
    role: "Software Engineer",
    department: "Engineering",
    activeTasksCount: 14,
    activeGoalsCount: 3,
    goalsProgressAvg: 35,
    overdueTasksCount: 3,
    checkInCount: 12
  };

  const fieldsMeta: Record<string, { label: string }> = {
    showGoalProgress: { label: "Goal progress bar" },
    showDepartment: { label: "Department badge" },
    showProgressTrend: { label: "Progress trend" },
    showWorkload: { label: "Workload & tasks" },
    showQuickStats: { label: "Quick stats row" },
    showMeetingDates: { label: "Meeting Dates" }
  };

  let order = cardConfig?.fieldOrder || [];
  order = order.filter((k: string) => !!fieldsMeta[k]);
  if (order.length === 0) {
    order = [
      'showGoalProgress',
      'showDepartment',
      'showProgressTrend',
      'showWorkload',
      'showQuickStats',
      'showMeetingDates'
    ];
  }

  const reorderField = (from: number, to: number) => {
    if (from === to) return;
    const newOrder = [...order];
    const [el] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, el);
    const newCardConfig = {
      ...cardConfig,
      fieldOrder: newOrder
    };
    setConfig({ ...config, cardConfig: newCardConfig });
    setCardConfig(newCardConfig);
    handleSave();
  };

  return (
    <div className="flex-1 h-full flex flex-col relative">
      {/* Header Bar */}
      <div className="px-6 lg:px-8 pt-3 pb-0 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between gap-4 overflow-x-auto scrollbar-none whitespace-nowrap">
        <div className="flex gap-6 sm:gap-8 shrink-0">
          <button 
            onClick={() => setActiveTab('cardDisplay')} 
            className={`pb-4 text-[13px] sm:text-[14px] font-semibold transition-colors relative ${activeTab === 'cardDisplay' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Team Card Display
            {activeTab === 'cardDisplay' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-900" />}
          </button>
          <button 
            onClick={() => setActiveTab('checkinOnboarding')} 
            className={`pb-4 text-[13px] sm:text-[14px] font-semibold transition-colors relative ${activeTab === 'checkinOnboarding' || activeTab === 'frequencies' || activeTab === 'templates' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Check-in & Onboarding Templates
            {(activeTab === 'checkinOnboarding' || activeTab === 'frequencies' || activeTab === 'templates') && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-900" />}
          </button>
          <button 
            onClick={() => setActiveTab('goals')} 
            className={`pb-4 text-[13px] sm:text-[14px] font-semibold transition-colors relative ${activeTab === 'goals' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Goal Modal
            {activeTab === 'goals' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-900" />}
          </button>
          <button 
            onClick={() => setActiveTab('navigation' as any)} 
            className={`pb-4 text-[13px] sm:text-[14px] font-semibold transition-colors relative ${activeTab === ('navigation' as any) ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Navigation Bar
            {activeTab === ('navigation' as any) && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-900" />}
          </button>
          <button 
            onClick={() => setActiveTab('storage' as any)} 
            className={`pb-4 text-[13px] sm:text-[14px] font-semibold transition-colors relative ${activeTab === ('storage' as any) ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Data Storage & Hosting
            {activeTab === ('storage' as any) && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-900" />}
          </button>
        </div>
        <div className="flex items-center gap-3 mb-3 shrink-0 text-xs font-semibold">
          {isSaving ? (
            <span className="text-indigo-600 animate-pulse flex items-center gap-1.5">⚡ Saving...</span>
          ) : (
            <span className="text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Auto-saved</span>
          )}
        </div>
      </div>

      <div className="px-8 pt-6 pb-24 max-w-7xl mx-auto w-full">
        <div className="animate-in fade-in duration-300">
        
        {activeTab === 'cardDisplay' && (
          <section className="max-w-5xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="text-slate-600"><LayoutGrid className="w-4 h-4" /></div>
              <h3 className="text-[15px] font-semibold text-slate-800">Team Card Live Builder</h3>
            </div>
            
            <div className="flex flex-col md:flex-row gap-8">
              {/* Controls */}
              <div className="w-full md:w-80 space-y-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div>
                    <h4 className="text-[15px] font-semibold text-slate-900 mb-1">Visible fields</h4>
                    <p className="text-[13px] text-slate-500">Drag to reorder. Toggle to show or hide.</p>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    {order.map((fieldKey, idx) => {
                      const isDragOver = dragFieldIdx === idx;
                      const isChecked = cardConfig[fieldKey as keyof typeof cardConfig] !== false;
                      const isDisabled = cardConfig.cardSize !== 'large';
                      return (
                        <div
                          key={fieldKey}
                          title={isDisabled ? "Visible fields toggling is only available in Large (Spacious) card size." : undefined}
                          draggable={!isDisabled}
                          onDragStart={(e) => { if (isDisabled) return; e.dataTransfer.effectAllowed = 'move'; dragFromFieldIdx.current = idx; }}
                          onDragOver={(e) => { if (isDisabled) return; e.preventDefault(); setDragFieldIdx(idx); }}
                          onDrop={(e) => { if (isDisabled) return; e.preventDefault(); if(dragFromFieldIdx.current !== -1) { reorderField(dragFromFieldIdx.current, idx); } dragFromFieldIdx.current = -1; setDragFieldIdx(-1); }}
                          onDragEnd={() => { if (isDisabled) return; dragFromFieldIdx.current = -1; setDragFieldIdx(-1); }}
                          className={`flex items-center gap-3 p-3 border rounded-lg bg-white transition-all ${isDragOver ? "border-indigo-400 bg-indigo-50/50" : "border-slate-100"} ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:border-slate-200 cursor-grab active:cursor-grabbing"}`}
                        >
                          <GripVertical className={`w-4 h-4 shrink-0 ${isDisabled ? 'text-slate-300' : 'text-slate-400'}`} />
                          <span className="text-[14px] font-medium text-slate-800 flex-1">{fieldsMeta[fieldKey].label}</span>
                          <button 
                            type="button"
                            disabled={isDisabled}
                            onClick={() => toggleCardConfig(fieldKey)}
                            className={`w-10 h-6 rounded-full p-1 transition-colors ${isChecked ? "bg-emerald-500" : "bg-slate-200"} ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isChecked ? "translate-x-4 shadow-sm" : "translate-x-0"}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div>
                    <h4 className="text-[15px] font-semibold text-slate-900 mb-1">Card & List Size</h4>
                  </div>
                  <select
                    value={cardConfig.cardSize || 'compact'}
                    onChange={(e) => {
                      const newCardConfig = { ...cardConfig, cardSize: e.target.value as any };
                      setConfig({ ...config, cardConfig: newCardConfig });
                      setCardConfig(newCardConfig);
                      handleSave(newCardConfig);
                    }}
                    className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white"
                  >
                    <option value="mini">Mini (Minimal Info)</option>
                    <option value="compact">Compact (Default)</option>
                    <option value="large">Large (Spacious)</option>
                  </select>
                </div>
              </div>
              
              {/* Preview Panel: Card/List tab toggle */}
              <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 min-h-[400px] flex flex-col overflow-hidden">
                {/* Preview type tabs */}
                <div className="flex border-b border-slate-200 bg-white rounded-t-xl">
                  <button
                    onClick={() => setPreviewTab('card')}
                    className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors rounded-tl-xl ${previewTab === 'card' ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Card View
                  </button>
                  <button
                    onClick={() => setPreviewTab('list')}
                    className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors rounded-tr-xl ${previewTab === 'list' ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    List View
                  </button>
                </div>

                <div className="flex-1 p-6 flex flex-col items-center justify-start overflow-hidden">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest text-center mb-4">Live Preview</div>

                  {previewTab === 'card' && (
                    <div className="w-full max-w-[280px] mx-auto animate-in fade-in duration-200">
                      <TeamCard member={mockMember} config={cardConfig} />
                    </div>
                  )}

                  {previewTab === 'list' && (
                    <div className="w-full animate-in fade-in duration-200">
                      {/* Scale the list rows so the fixed 3-col grid fits within the preview panel */}
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm" style={{ contain: 'layout' }}>
                        <div style={{ transform: 'scale(0.72)', transformOrigin: 'top left', width: `${100/0.72}%` }}>
                          <TeamListRow member={mockMember} config={cardConfig} />
                          <TeamListRow
                            member={{ ...mockMember, id: 998, name: 'Sarah Miller', role: 'Frontend Engineer', goalsProgressAvg: 100, activeTasksCount: 3, overdueTasksCount: 0, checkInCount: 8 }}
                            config={cardConfig}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === ('navigation' as any) && (
          <section className="max-w-2xl animate-in fade-in duration-200">
            <div className="flex items-center gap-2 mb-6">
              <div className="text-slate-600"><LayoutGrid className="w-4 h-4" /></div>
              <h3 className="text-[15px] font-semibold text-slate-800">Navigation Bar Settings</h3>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h4 className="text-[15px] font-semibold text-slate-900">Left Sidebar Expansion</h4>
                <p className="text-[13px] text-slate-500 mt-1">
                  Configure whether your left-hand navigation sidebar remains expanded or collapsed by default across the manager portal.
                </p>
              </div>
              <div className="pt-2">
                <label className="flex items-center gap-3 text-[14px] text-slate-800 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sidebarExpanded}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setSidebarExpanded(val);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('manager_sidebar_expanded', String(val));
                        window.dispatchEvent(new Event('sidebar-toggle'));
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  Keep left navigation bar expanded by default
                </label>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'goals' && (
          <section className="max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="text-slate-600"><LayoutGrid className="w-4 h-4" /></div>
              <h3 className="text-[15px] font-semibold text-slate-800">Goal Modal Options</h3>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 mb-6">
              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50">
                <div>
                  <h4 className="text-[14px] font-semibold text-slate-900">Modal Size</h4>
                  <p className="text-[12px] text-slate-500 mt-1">
                    Choose <strong>Mini</strong> for ultra-fast creation (Title + Assignee only). Choose <strong>Large</strong> for all advanced options (Dates, Priorities, Subgoals).
                  </p>
                </div>
                <div className="flex bg-slate-200/50 p-1 rounded-lg">
                  <button 
                    onClick={() => {
                      const newGoalModalConfig: GoalModalConfig = { ...goalModalConfig, size: 'mini' };
                      setConfig({ ...config, goalModalConfig: newGoalModalConfig });
                      setGoalModalConfig(newGoalModalConfig);
                      handleSave();
                    }}
                    className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${goalModalConfig.size === 'mini' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Mini
                  </button>
                  <button 
                    onClick={() => {
                      const newGoalModalConfig: GoalModalConfig = { ...goalModalConfig, size: 'large' };
                      setConfig({ ...config, goalModalConfig: newGoalModalConfig });
                      setGoalModalConfig(newGoalModalConfig);
                      handleSave();
                    }}
                    className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${goalModalConfig.size !== 'mini' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Large
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <p className="text-[13px] text-slate-500 mb-2">Select the fields you want to display when creating or editing a goal.</p>
              
              <label className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <span className="text-[14px] font-medium text-slate-800">Description</span>
                <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={goalModalConfig?.showDescription !== false} onChange={() => toggleGoalModalConfig('showDescription')} />
              </label>
              
              <label className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <span className="text-[14px] font-medium text-slate-800">Parent Goal Link</span>
                <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={goalModalConfig?.showParentGoal !== false} onChange={() => toggleGoalModalConfig('showParentGoal')} />
              </label>

              <label className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <span className="text-[14px] font-medium text-slate-800">Tags</span>
                <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={goalModalConfig?.showTags !== false} onChange={() => toggleGoalModalConfig('showTags')} />
              </label>
              
              <label className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <span className="text-[14px] font-medium text-slate-800">Due Date</span>
                <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={goalModalConfig?.showDueDate !== false} onChange={() => toggleGoalModalConfig('showDueDate')} />
              </label>
              
              <label className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <span className="text-[14px] font-medium text-slate-800">Priority</span>
                <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={goalModalConfig?.showPriority !== false} onChange={() => toggleGoalModalConfig('showPriority')} />
              </label>
              
              <label className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <span className="text-[14px] font-medium text-slate-800">Confidence Score</span>
                <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={goalModalConfig?.showConfidence !== false} onChange={() => toggleGoalModalConfig('showConfidence')} />
              </label>

              <label className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <span className="text-[14px] font-medium text-slate-800">Subgoals</span>
                <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={goalModalConfig?.showSubgoals !== false} onChange={() => toggleGoalModalConfig('showSubgoals')} />
              </label>
            </div>
          </section>
        )}

        {(activeTab === 'checkinOnboarding' || activeTab === 'frequencies' || activeTab === 'templates') && (() => {
          const freqs = config.checkInFrequencies || [
            { id: "weekly", label: "Weekly Check-in" },
            { id: "monthly", label: "Monthly Check-in" },
            { id: "quarterly", label: "Quarterly Check-in" },
            { id: "performance", label: "Performance Review" }
          ];
          const activeFreq = freqs.find((f: any) => f.id === selectedTplFreqId) || freqs[0] || { id: 'weekly', label: 'Weekly Check-in' };
          const activeTpl = config.templates?.find((t: any) => t.freqId === activeFreq.id || t.name === activeFreq.label);

          const getFallbackContent = (fid: string = "", label: string = "") => {
            const id = fid.toLowerCase();
            const lbl = label.toLowerCase();
            if (id.includes('week') || lbl.includes('week')) {
              return "### Highlights & Wins\n- \n\n### Current Focus & Priorities\n- \n\n### Roadblocks & Support Needed\n- \n\n### Action Items\n- [ ] \n";
            }
            if (id.includes('month') || lbl.includes('month')) {
              return "### Monthly Highlights & Accomplishments\n- \n\n### Goal Progress Review\n- \n\n### Growth & Development Discussion\n- \n\n### Next Month Objectives\n- [ ] \n";
            }
            if (id.includes('quart') || lbl.includes('quart')) {
              return "### Quarterly Review & Key Achievements\n- \n\n### OKRs & Strategic Alignment\n- \n\n### Career Aspirations & Feedback\n- \n\n### Objectives for Next Quarter\n- [ ] \n";
            }
            if (id.includes('perf') || lbl.includes('perf') || id.includes('review')) {
              return "### Performance Evaluation & Strengths\n- \n\n### Core Competencies Review\n- \n\n### Areas for Growth & Coaching\n- \n\n### Action Plan & Next Steps\n- [ ] \n";
            }
            return `### Key Discussion Points (${label || fid})\n- \n\n### Action Items\n- [ ] \n`;
          };

          const currentContent = activeTpl ? activeTpl.content : getFallbackContent(activeFreq.id, activeFreq.label);

          const handleUpdateContent = (newContent: string) => {
            if (activeTpl) {
              updateTemplate(activeTpl.id, 'content', newContent);
            } else {
              const newTplObj = {
                id: 't_' + activeFreq.id,
                type: 'frequency',
                freqId: activeFreq.id,
                name: activeFreq.label,
                content: newContent
              };
              setConfig({
                ...config,
                templates: [...(config.templates || []), newTplObj]
              });
            }
          };

          const currentOnboard = config.onboardingTemplates || ONBOARDING_TEMPLATES;
          const roleData = currentOnboard[selectedOnboardRole] || ONBOARDING_TEMPLATES[selectedOnboardRole] || ONBOARDING_TEMPLATES.general;

          const updateOnboardingRoleData = (updater: (prevRole: any) => any) => {
            const updatedRole = updater({ ...roleData });
            const newOnboard = {
              ...currentOnboard,
              [selectedOnboardRole]: updatedRole
            };
            setConfig({ ...config, onboardingTemplates: newOnboard });
          };

          return (
            <div className="max-w-4xl space-y-8 animate-in fade-in duration-200 pb-12">
              {/* ─── SECTION 1: Check-in Frequencies & Notes ─────────────────────── */}
              <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-slate-900">Check-in Frequencies & Notes</h3>
                    <p className="text-xs text-slate-500">Configure check-in cadences and standard default note templates for 1:1 discussions</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                  {/* Left Column: Frequencies List */}
                  <div className="md:col-span-5 space-y-4 border-r border-slate-100 pr-0 md:pr-5">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Available Frequencies</h4>
                      <button 
                        onClick={() => setShowAddFreq(true)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors rounded text-[11px] font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Frequency
                      </button>
                    </div>

                    {showAddFreq && (
                      <div className="p-3.5 border border-indigo-200 bg-indigo-50/60 rounded-xl space-y-3">
                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase">Unique ID</label>
                            <input type="text" value={newFreqId} onChange={e => setNewFreqId(e.target.value)} placeholder="e.g. biweekly" className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 mt-0.5" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase">Display Label</label>
                            <input type="text" value={newFreqLabel} onChange={e => setNewFreqLabel(e.target.value)} placeholder="e.g. Bi-Weekly Sync" className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 mt-0.5" />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                          <button onClick={() => setShowAddFreq(false)} className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200/60 rounded">Cancel</button>
                          <button onClick={addFreq} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded shadow-sm">Add</button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 max-h-[360px] overflow-y-auto">
                      {freqs.map((freq: any) => {
                        const isSelected = freq.id === activeFreq.id;
                        return (
                          <div
                            key={freq.id}
                            onClick={() => setSelectedTplFreqId(freq.id)}
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                              isSelected
                                ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 shadow-sm font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <div className="text-xs">{freq.label}</div>
                              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-tight mt-0.5">{freq.id}</div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFreq(freq.id);
                              }}
                              className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors"
                              title="Delete frequency"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Template Editor */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Default Note Template</h4>
                        <p className="text-[11px] text-slate-500">Editing structure for: <span className="font-bold text-indigo-600">{activeFreq.label}</span></p>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full">
                        Reflects at Every Employee
                      </span>
                    </div>

                    <textarea
                      value={currentContent}
                      onChange={(e) => handleUpdateContent(e.target.value)}
                      className="w-full h-[320px] p-4 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-mono leading-relaxed outline-none focus:border-indigo-500 transition shadow-sm resize-none"
                      placeholder="Enter default markdown checklist items for check-in notes..."
                    />

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleSave()}
                        disabled={isSaving}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isSaving ? "Saving..." : "Save & Apply Templates"}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* ─── SECTION 2: 30/60/90 Onboarding Plans (Separate Section Below) ─── */}
              <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-slate-900">30 / 60 / 90 Day Onboarding Plans</h3>
                    <p className="text-xs text-slate-500">Configure role-based onboarding milestones, goals, and weekly action items for new team members</p>
                  </div>
                </div>

                <div className="space-y-6 pt-2">
                  <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
                    <div className="p-1.5 bg-indigo-600 text-white rounded-lg mt-0.5">
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-slate-700 space-y-1">
                      <p className="font-bold text-slate-900">Configure Role-Based 30 / 60 / 90 Day Onboarding Templates</p>
                      <p className="leading-relaxed">
                        Whenever you launch a 30/60/90 onboarding plan inside any team member&apos;s profile (`Reportee Details → Start Onboarding Plan`), these exact templates will be used to automatically generate milestones, goals, and weekly action items for that employee.
                      </p>
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedOnboardRole('frontend')}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                        selectedOnboardRole === 'frontend'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Senior Frontend Engineer
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedOnboardRole('backend')}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                        selectedOnboardRole === 'backend'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Backend & Systems Engineer
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedOnboardRole('general')}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                        selectedOnboardRole === 'general'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      General Engineering Onboarding
                    </button>
                  </div>

                  {/* Phase Editors: 30, 60, 90 */}
                  <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
                    {(['phase30', 'phase60', 'phase90'] as const).map((phaseKey, idx) => {
                      const phase = roleData[phaseKey] || { goalTitle: "", description: "", tasks: [] };
                      const phaseNum = (idx + 1) * 30;
                      const phaseBg = idx === 0 ? 'border-indigo-200 bg-indigo-50/20' : idx === 1 ? 'border-amber-200 bg-amber-50/20' : 'border-emerald-200 bg-emerald-50/20';
                      const badgeBg = idx === 0 ? 'bg-indigo-600 text-white' : idx === 1 ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white';

                      return (
                        <div key={phaseKey} className={`p-5 rounded-2xl border ${phaseBg} space-y-4`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg uppercase ${badgeBg}`}>
                                Days 1-{phaseNum}
                              </span>
                              <h5 className="text-sm font-bold text-slate-900">Phase {idx + 1} Goal & Milestones</h5>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Goal Title (created inside tracker)
                              </label>
                              <input
                                type="text"
                                value={phase.goalTitle}
                                onChange={(e) => {
                                  updateOnboardingRoleData((prev) => ({
                                    ...prev,
                                    [phaseKey]: { ...prev[phaseKey], goalTitle: e.target.value }
                                  }));
                                }}
                                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 shadow-sm"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Phase Description & Objectives
                              </label>
                              <textarea
                                value={phase.description}
                                onChange={(e) => {
                                  updateOnboardingRoleData((prev) => ({
                                    ...prev,
                                    [phaseKey]: { ...prev[phaseKey], description: e.target.value }
                                  }));
                                }}
                                rows={2}
                                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 shadow-sm resize-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Recommended Milestone Action Items / Tasks
                              </label>
                              {phase.tasks && phase.tasks.map((task: string, taskIndex: number) => (
                                <div key={taskIndex} className="flex items-center gap-2 mb-2">
                                  <span className="text-slate-400 text-xs font-mono w-5 shrink-0">{taskIndex + 1}.</span>
                                  <input
                                    type="text"
                                    value={task}
                                    onChange={(e) => {
                                      updateOnboardingRoleData((prev) => {
                                        const currentTasks = [...(prev[phaseKey]?.tasks || [])];
                                        currentTasks[taskIndex] = e.target.value;
                                        return {
                                          ...prev,
                                          [phaseKey]: { ...prev[phaseKey], tasks: currentTasks }
                                        };
                                      });
                                    }}
                                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 shadow-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateOnboardingRoleData((prev) => {
                                        const currentTasks = [...(prev[phaseKey]?.tasks || [])];
                                        currentTasks.splice(taskIndex, 1);
                                        return {
                                          ...prev,
                                          [phaseKey]: { ...prev[phaseKey], tasks: currentTasks }
                                        };
                                      });
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  updateOnboardingRoleData((prev) => {
                                    const currentTasks = [...(prev[phaseKey]?.tasks || []), "New milestone item"];
                                    return {
                                      ...prev,
                                      [phaseKey]: { ...prev[phaseKey], tasks: currentTasks }
                                    };
                                  });
                                }}
                                className="mt-1 px-3 py-1.5 bg-white border border-dashed border-slate-300 hover:border-indigo-400 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Task
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      Changes will apply to all future onboarding plans launched for your reportees.
                    </span>
                    <button
                      onClick={() => handleSave()}
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? "Saving..." : "Save & Apply All Templates"}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          );
        })()}
        {activeTab === ('storage' as any) && (
          <section className="bg-white p-6 rounded-md border border-slate-200 shadow-sm max-w-4xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <h3 className="text-[16px] font-bold text-slate-800">Backend Data Storage Mode</h3>
              </div>
              <div className="flex items-center gap-3">
                <SyncStatusIndicator />
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full uppercase tracking-wider border border-indigo-200">
                  Active Mode: {storageCfg.mode.toUpperCase()}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Your application is configured for deployment on <strong>Vercel</strong>. Choose how your data is persisted across devices or browser sessions.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div 
                onClick={() => {
                  const updated = { ...storageCfg, mode: 'indexedDB' as StorageMode, isConfigured: true };
                  setStorageCfg(updated);
                  saveStorageConfig(updated);
                }}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${storageCfg.mode === 'indexedDB' || storageCfg.mode === 'fileSystem' ? 'border-indigo-600 bg-indigo-50/40 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="font-bold text-sm text-slate-900">1.1 Browser Storage & OneDrive Sync</div>
                <div className="text-[11px] text-slate-500 mt-1">100% private inside your browser IndexedDB with optional live sync to a local OneDrive JSON file.</div>
              </div>

              <div 
                onClick={() => {
                  const updated = { ...storageCfg, mode: 'cloud' as StorageMode, isConfigured: true };
                  setStorageCfg(updated);
                  saveStorageConfig(updated);
                }}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${storageCfg.mode === 'cloud' ? 'border-indigo-600 bg-indigo-50/40 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="font-bold text-sm text-slate-900">1.2 Cloud Database Hosting</div>
                <div className="text-[11px] text-slate-500 mt-1">Connect to Supabase (PostgreSQL) or Google Firebase for multi-user collaboration.</div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => {
                  localStorage.removeItem('manager_storage_config');
                  window.location.reload();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Re-run Onboarding Setup Wizard
              </button>
            </div>
          </section>
        )}
      </div>
      </div>
    </div>
  );
}
