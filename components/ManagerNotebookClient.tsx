"use client";
import React, { useState, useEffect, useRef } from "react";
import { Folder, FileText, Plus, ChevronRight, ChevronDown, Trash2, Search, Bold, Italic, List, CheckSquare, Code, Sparkles, Save, Check, Heading, AlertCircle, Minus, Calendar, ListOrdered, CheckCircle2 } from "lucide-react";
import { VoiceInputButton } from "./VoiceInputButton";
import { renderFormattedNote, formatToHtml } from "./NotesEditor";

interface PageItem {
  id: string;
  title: string;
  folder: string;
  content: string;
  updatedAt: string;
}

const DEFAULT_PAGES: PageItem[] = [
  {
    id: "p1",
    title: "Company Q3 Objectives & Key Results",
    folder: "Company Strategy",
    content: "## Q3 Strategic Priorities\n\n1. **Expand Enterprise Footprint**: Target 15 new enterprise deals by end of quarter.\n2. **Platform Reliability**: Achieve 99.99% uptime across all core microservices.\n3. **Team Growth**: Hire 3 senior full-stack engineers and 1 product designer.\n\n### Notes on Execution\n- Need to coordinate closely with DevOps on automated canary deployments.\n- Weekly syncs scheduled every Tuesday at 10 AM.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "p2",
    title: "Leadership Meeting Prep - July",
    folder: "Meeting Prep",
    content: "### Talking Points for VP Engineering Sync\n\n[ ] Highlight Q2 delivery speed improvements (+24% velocity)\n[ ] Discuss budget allocation for AI developer tooling (Copilot/Antigravity)\n[ ] Review proposal for quarterly team hackathon\n\n**Action Items Needed**:\n- Prepare slide deck metrics by Friday\n- Gather feedback from tech leads on current CI/CD bottlenecks",
    updatedAt: new Date().toISOString()
  },
  {
    id: "p3",
    title: "Random Product Ideas & Scratchpad",
    folder: "Personal Ideas",
    content: "Ideas for improving daily workflow:\n- Add AI voice-to-text directly inside action item creation modals (DONE! ✨)\n- Integrate dark mode toggle in sidebar\n- Automated weekly summary digest emailed to managers every Monday morning.",
    updatedAt: new Date().toISOString()
  }
];

export function ManagerNotebookClient() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [activePageId, setActivePageId] = useState<string>("p1");
  const [folders, setFolders] = useState<string[]>(["Company Strategy", "Meeting Prep", "Personal Ideas"]);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    "Company Strategy": true,
    "Meeting Prep": true,
    "Personal Ideas": true
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("manager_generic_notebook_pages");
    const savedFolders = localStorage.getItem("manager_generic_notebook_folders");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setPages(parsed);
          setActivePageId(parsed[0].id);
        } else {
          setPages(DEFAULT_PAGES);
        }
      } catch (e) {
        setPages(DEFAULT_PAGES);
      }
    } else {
      setPages(DEFAULT_PAGES);
    }

    if (savedFolders) {
      try {
        setFolders(JSON.parse(savedFolders));
      } catch (e) {}
    }
  }, []);

  // Save to localStorage
  const saveToStorage = (newPages: PageItem[], newFolders?: string[]) => {
    localStorage.setItem("manager_generic_notebook_pages", JSON.stringify(newPages));
    if (newFolders) {
      localStorage.setItem("manager_generic_notebook_folders", JSON.stringify(newFolders));
    }
    setIsSaved(true);
  };

  const activePage = pages.find(p => p.id === activePageId) || pages[0];

  const handleUpdateContent = (text: string) => {
    setIsSaved(false);
    const updated = pages.map(p => p.id === activePageId ? { ...p, content: text, updatedAt: new Date().toISOString() } : p);
    setPages(updated);
    saveToStorage(updated);
  };

  const handleUpdateTitle = (title: string) => {
    setIsSaved(false);
    const updated = pages.map(p => p.id === activePageId ? { ...p, title, updatedAt: new Date().toISOString() } : p);
    setPages(updated);
    saveToStorage(updated);
  };

  const handleAddPage = (folderName: string) => {
    const newPage: PageItem = {
      id: "page_" + Date.now(),
      title: "Untitled Page",
      folder: folderName,
      content: "# Untitled Page\n\nStart typing here...",
      updatedAt: new Date().toISOString()
    };
    const updated = [newPage, ...pages];
    setPages(updated);
    setActivePageId(newPage.id);
    setOpenFolders(prev => ({ ...prev, [folderName]: true }));
    saveToStorage(updated);
  };

  const handleDeletePage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this page?")) return;
    const updated = pages.filter(p => p.id !== id);
    setPages(updated);
    saveToStorage(updated);
    if (activePageId === id && updated.length > 0) {
      setActivePageId(updated[0].id);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || folders.includes(newFolderName.trim())) return;
    const f = newFolderName.trim();
    const updatedF = [...folders, f];
    setFolders(updatedF);
    setOpenFolders(prev => ({ ...prev, [f]: true }));
    setNewFolderName("");
    setShowAddFolder(false);
    handleAddPage(f);
    localStorage.setItem("manager_generic_notebook_folders", JSON.stringify(updatedF));
  };

  const filteredPages = pages.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && activePage) {
      const formatted = formatToHtml(activePage.content);
      if (editorRef.current.innerHTML !== formatted) {
        editorRef.current.innerHTML = formatted;
      }
    }
  }, [activePageId]);

  const handleExecCommand = (command: string, val: string = '') => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (command === 'heading') {
      document.execCommand('formatBlock', false, '<h3>');
    } else if (command === 'checkbox') {
      document.execCommand('insertHTML', false, '<div style="display: flex; align-items: center; gap: 8px; margin: 6px 0;"><input type="checkbox" style="cursor: pointer; width: 15px; height: 15px;" /> <span>&nbsp;</span></div>');
    } else if (command === 'completedCheckbox') {
      document.execCommand('insertHTML', false, '<div style="display: flex; align-items: center; gap: 8px; margin: 6px 0;"><input type="checkbox" checked style="cursor: pointer; width: 15px; height: 15px;" /> <span style="text-decoration: line-through; color: #94a3b8;">&nbsp;</span></div>');
    } else if (command === 'callout') {
      document.execCommand('insertHTML', false, '<div style="padding: 12px; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 6px; margin: 8px 0; color: #15803d; font-weight: 500;">Note: &nbsp;</div>');
    } else if (command === 'divider') {
      document.execCommand('insertHorizontalRule', false);
    } else if (command === 'date') {
      document.execCommand('insertHTML', false, `<span style="font-weight: 600; color: #b45309;">[Date: ${new Date().toISOString().split('T')[0]}]</span> `);
    } else {
      document.execCommand(command, false, val);
    }
    handleUpdateContent(editorRef.current.innerHTML);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-[#f8fafc] overflow-hidden">
      {/* Left Inner Sidebar Tree (260px) */}
      <div className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full select-none">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><FileText className="w-4 h-4" /></span>
            <h2 className="font-bold text-slate-800 text-[14px]">Manager Notebook</h2>
          </div>
          <button 
            onClick={() => setShowAddFolder(!showAddFolder)} 
            title="New Folder"
            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search pages..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] outline-none focus:border-indigo-400 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Add Folder Popover */}
        {showAddFolder && (
          <div className="p-3 bg-indigo-50/50 border-b border-indigo-100 animate-in fade-in duration-150">
            <input 
              autoFocus
              type="text" 
              placeholder="Folder name..." 
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              className="w-full px-2.5 py-1 text-[12px] bg-white border border-indigo-200 rounded mb-2 outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-1.5">
              <button onClick={() => setShowAddFolder(false)} className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-800">Cancel</button>
              <button onClick={handleCreateFolder} className="px-2.5 py-0.5 bg-indigo-600 text-white rounded text-[11px] font-semibold hover:bg-indigo-700">Create</button>
            </div>
          </div>
        )}

        {/* Tree List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {folders.map(folder => {
            const folderPages = filteredPages.filter(p => p.folder === folder);
            const isOpen = openFolders[folder] ?? true;

            return (
              <div key={folder} className="space-y-0.5">
                <div 
                  onClick={() => setOpenFolders(prev => ({ ...prev, [folder]: !isOpen }))}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold text-[12px] cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0 fill-amber-500/20" />
                    <span className="truncate">{folder}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAddPage(folder); }}
                    title="Add page to folder"
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-opacity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {isOpen && (
                  <div className="pl-5 space-y-0.5 border-l border-slate-100 ml-3.5 my-1">
                    {folderPages.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic px-2 py-1">No pages</div>
                    ) : (
                      folderPages.map(page => (
                        <div 
                          key={page.id}
                          onClick={() => setActivePageId(page.id)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] cursor-pointer group transition-colors ${
                            activePageId === page.id 
                              ? "bg-indigo-50 font-medium text-indigo-900 border border-indigo-100/60 shadow-2xs" 
                              : "text-slate-600 hover:bg-slate-100/80"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className={`w-3.5 h-3.5 shrink-0 ${activePageId === page.id ? "text-indigo-600" : "text-slate-400"}`} />
                            <span className="truncate">{page.title || "Untitled"}</span>
                          </div>
                          <button 
                            onClick={(e) => handleDeletePage(page.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Rich Editor Panel */}
      <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
        {activePage ? (
          <>
            {/* Top Toolbar */}
            <div className="min-h-[56px] border-b border-slate-100 px-6 py-2 flex flex-wrap items-center justify-between shrink-0 bg-white/80 backdrop-blur-sm gap-3">
              <div className="flex items-center gap-2 text-slate-500 text-[13px]">
                <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-md transition cursor-pointer" onClick={() => setOpenFolders(prev => ({ ...prev, [activePage.folder]: true }))}>
                  <Folder className="w-3.5 h-3.5 text-indigo-600" />
                  <select
                    value={activePage.folder}
                    onChange={(e) => {
                      const newFolder = e.target.value;
                      const updated = pages.map(p => p.id === activePageId ? { ...p, folder: newFolder, updatedAt: new Date().toISOString() } : p);
                      setPages(updated);
                      saveToStorage(updated);
                      setOpenFolders(prev => ({ ...prev, [newFolder]: true }));
                    }}
                    className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer border-0 p-0 text-[13px]"
                    title="Click to change folder or navigate"
                  >
                    {folders.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <span className="text-slate-300">/</span>
                <span className="text-slate-800 font-bold text-[13px] truncate max-w-[200px]">{activePage.title || "Untitled Page"}</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-lg flex-wrap">
                  <button onClick={() => handleExecCommand("bold")} title="Bold" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Bold className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleExecCommand("italic")} title="Italic" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Italic className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleExecCommand("heading")} title="Heading" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Heading className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleExecCommand("insertUnorderedList")} title="Bullet List" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><List className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleExecCommand("insertOrderedList")} title="Numbered List" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><ListOrdered className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleExecCommand("checkbox")} title="Task Checkbox" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><CheckSquare className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleExecCommand("completedCheckbox")} title="Completed Task" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></button>
                  <button onClick={() => handleExecCommand("callout")} title="Callout Box" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><AlertCircle className="w-3.5 h-3.5 text-indigo-600" /></button>
                  <button onClick={() => handleExecCommand("divider")} title="Divider" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Minus className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleExecCommand("date")} title="Insert Date Stamp" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Calendar className="w-3.5 h-3.5 text-amber-600" /></button>
                </div>

                {/* Voice Dictation Button inside Editor */}
                <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg">
                  <span className="text-[11px] font-semibold text-indigo-700">Voice Dictate:</span>
                  <VoiceInputButton onResult={(speech) => handleUpdateContent(activePage.content + (activePage.content ? "<br/><br/>" : "") + speech)} />
                </div>

                <div className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-600 ml-1">
                  <Check className="w-3.5 h-3.5" /> Saved
                </div>
              </div>
            </div>

            {/* Document Editor Area (Seamless Editable Page) */}
            <div className="flex-1 flex flex-col overflow-y-auto p-6 lg:p-8 w-full">
              {/* Page Title Input */}
              <input 
                type="text" 
                value={activePage.title}
                onChange={e => handleUpdateTitle(e.target.value)}
                placeholder="Untitled Page"
                className="w-full text-2xl font-extrabold text-slate-900 outline-none placeholder:text-slate-300 bg-transparent border-0 px-0 mb-4 shrink-0"
              />

              <div className="flex-1 flex flex-col relative min-h-[450px]">
                <div 
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleUpdateContent(e.currentTarget.innerHTML)}
                  className="w-full flex-1 min-h-[450px] outline-none text-slate-800 font-sans text-[15px] leading-relaxed overflow-y-auto"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-slate-400 gap-3">
            <FileText className="w-12 h-12 stroke-1" />
            <p className="text-[14px]">Select or create a page from the sidebar to begin writing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
