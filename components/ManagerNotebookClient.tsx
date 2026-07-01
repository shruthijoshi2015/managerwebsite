"use client";
import React, { useState, useEffect, useRef } from "react";
import { Folder, FileText, Plus, ChevronRight, ChevronDown, Trash2, Search, Bold, Italic, List, CheckSquare, Code, Sparkles, Save, Check, Heading, AlertCircle, Minus, Calendar, ListOrdered, CheckCircle2, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, Link as LinkIcon, MoreHorizontal, Image as ImageIcon, Table as TableIcon, Palette, Keyboard, X, Upload, GripVertical, Download } from "lucide-react";
import { VoiceInputButton } from "./VoiceInputButton";
import { renderFormattedNote, formatToHtml } from "./NotesEditor";

interface PageItem {
  id: string;
  title: string;
  folder: string;
  content: string;
  updatedAt: string;
}

const COLOR_SWATCHES = [
  { color: '#ffffff', label: 'White' },
  { color: '#fef9c3', label: 'Light Yellow' },
  { color: '#d1fae5', label: 'Light Mint' },
  { color: '#e0f2fe', label: 'Light Sky' },
  { color: '#f3e8ff', label: 'Light Lavender' },
  { color: '#fce7f3', label: 'Light Pink' },
  { color: '#f1f5f9', label: 'Light Gray' },
  { color: '#fde047', label: 'Yellow' },
  { color: '#6ee7b7', label: 'Mint' },
  { color: '#7dd3fc', label: 'Sky Blue' },
  { color: '#c084fc', label: 'Lavender' },
  { color: '#f472b6', label: 'Pink' },
  { color: '#94a3b8', label: 'Gray' },
  { color: '#f97316', label: 'Orange' },
  { color: '#4d7c0f', label: 'Green' },
  { color: '#0284c7', label: 'Blue' },
  { color: '#7e22ce', label: 'Purple' },
  { color: '#dc2626', label: 'Red' },
  { color: '#475569', label: 'Dark Slate' },
  { color: '#0f172a', label: 'Black' }
];

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

  // New state for resizable sidebar and toolbars
  const [sidebarWidth, setSidebarWidth] = useState<number>(256);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showColorMenu, setShowColorMenu] = useState<boolean>(false);
  const [activeColorTab, setActiveColorTab] = useState<'text' | 'background'>('text');
  const [showAlignMenu, setShowAlignMenu] = useState<boolean>(false);
  const [showListMenu, setShowListMenu] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  // Image insertion modal state
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [imageModalTab, setImageModalTab] = useState<'upload' | 'embed'>('upload');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');

  // Table interactive controls state
  const draggedTableRef = useRef<HTMLTableElement | null>(null);
  const [activeTableInfo, setActiveTableInfo] = useState<{ td: HTMLTableCellElement; table: HTMLTableElement } | null>(null);
  const [tableOverlayPos, setTableOverlayPos] = useState<{
    top: number;
    left: number;
    cellTop: number;
    cellLeft: number;
    cellRight: number;
    bottom: number;
    width: number;
  } | null>(null);
  const [showTableCellColorMenu, setShowTableCellColorMenu] = useState<boolean>(false);
  const [showTableOptionsMenu, setShowTableOptionsMenu] = useState<boolean>(false);

  // Image interactive controls state
  const resizingImageRef = useRef<{ img: HTMLImageElement; startX: number; startY: number; startWidth: number; startHeight: number; dir: string } | null>(null);
  const [activeImageInfo, setActiveImageInfo] = useState<HTMLImageElement | null>(null);
  const [imageOverlayPos, setImageOverlayPos] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [showImageAlignMenu, setShowImageAlignMenu] = useState<boolean>(false);

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
  const savedRangeRef = useRef<Range | null>(null);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  useEffect(() => {
    if (editorRef.current && activePage) {
      const formatted = formatToHtml(activePage.content);
      if (editorRef.current.innerHTML !== formatted) {
        editorRef.current.innerHTML = formatted;
      }
    }
  }, [activePageId]);

  const checkActiveTableSelection = () => {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) {
      setActiveTableInfo(null);
      setTableOverlayPos(null);
      return;
    }
    const el = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode as HTMLElement;
    if (!el) {
      setActiveTableInfo(null);
      setTableOverlayPos(null);
      return;
    }
    const td = el.closest('td, th') as HTMLTableCellElement | null;
    if (td) {
      const table = td.closest('table') as HTMLTableElement | null;
      if (table) {
        setActiveTableInfo({ td, table });
        return;
      }
    }
    setActiveTableInfo(null);
    setTableOverlayPos(null);
  };

  const checkImageSelection = (eTarget?: EventTarget | null) => {
    let el = eTarget as HTMLElement | null;
    if (!el) {
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        el = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode as HTMLElement;
      }
    }
    if (el) {
      const img = (el.tagName === 'IMG' ? el : el.querySelector('img')) as HTMLImageElement | null;
      if (img) {
        setActiveImageInfo(img);
        return;
      }
    }
    setActiveImageInfo(null);
    setImageOverlayPos(null);
    setShowImageAlignMenu(false);
  };

  const updateTableOverlayPos = () => {
    if (!activeTableInfo?.table || !activeTableInfo?.td || !editorRef.current) {
      setTableOverlayPos(null);
      return;
    }
    const containerRect = editorRef.current.parentElement?.getBoundingClientRect();
    if (!containerRect) return;
    const tableRect = activeTableInfo.table.getBoundingClientRect();
    const cellRect = activeTableInfo.td.getBoundingClientRect();

    setTableOverlayPos({
      top: tableRect.top - containerRect.top + (editorRef.current.parentElement?.scrollTop || 0),
      left: tableRect.left - containerRect.left + (editorRef.current.parentElement?.scrollLeft || 0),
      cellTop: cellRect.top - containerRect.top + (editorRef.current.parentElement?.scrollTop || 0),
      cellLeft: cellRect.left - containerRect.left + (editorRef.current.parentElement?.scrollLeft || 0),
      cellRight: cellRect.right - containerRect.left + (editorRef.current.parentElement?.scrollLeft || 0),
      bottom: tableRect.bottom - containerRect.top + (editorRef.current.parentElement?.scrollTop || 0),
      width: tableRect.width
    });
  };

  const updateImageOverlayPos = (targetImg?: HTMLImageElement | null) => {
    const img = targetImg !== undefined ? targetImg : activeImageInfo;
    if (!img || !editorRef.current) {
      setImageOverlayPos(null);
      return;
    }
    const containerRect = editorRef.current.parentElement?.getBoundingClientRect();
    if (!containerRect) return;
    const imgRect = img.getBoundingClientRect();
    setImageOverlayPos({
      top: imgRect.top - containerRect.top + (editorRef.current.parentElement?.scrollTop || 0),
      left: imgRect.left - containerRect.left + (editorRef.current.parentElement?.scrollLeft || 0),
      width: imgRect.width,
      height: imgRect.height
    });
  };

  useEffect(() => {
    updateTableOverlayPos();
    updateImageOverlayPos();
    const handleResize = () => {
      updateTableOverlayPos();
      updateImageOverlayPos();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTableInfo, activeImageInfo]);

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!resizingImageRef.current) return;
      const { img, startX, startY, startWidth, startHeight, dir } = resizingImageRef.current;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      let newW = startWidth;
      let newH = startHeight;

      if (dir.includes('e')) newW = Math.max(40, startWidth + deltaX);
      if (dir.includes('w')) newW = Math.max(40, startWidth - deltaX);
      if (dir.includes('s')) newH = Math.max(40, startHeight + deltaY);
      if (dir.includes('n')) newH = Math.max(40, startHeight - deltaY);

      img.style.width = `${newW}px`;
      if (dir.includes('n') || dir.includes('s')) {
        img.style.height = `${newH}px`;
      } else {
        img.style.height = 'auto';
      }
      updateImageOverlayPos(img);
    };

    const handleWindowMouseUp = () => {
      if (resizingImageRef.current) {
        resizingImageRef.current = null;
        if (editorRef.current) {
          handleUpdateContent(editorRef.current.innerHTML);
        }
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [activeImageInfo]);

  const handleTableAction = (action: string) => {
    if (!activeTableInfo?.td || !activeTableInfo?.table) return;
    const { td, table } = activeTableInfo;
    const tr = td.closest('tr');
    if (!tr) return;
    const rows = Array.from(table.querySelectorAll('tr'));
    const cellIndex = Array.from(tr.children).indexOf(td);

    if (action === 'addRowAbove' || action === 'addRowBelow') {
      const newTr = document.createElement('tr');
      const colCount = tr.children.length;
      for (let i = 0; i < colCount; i++) {
        const newTd = document.createElement('td');
        newTd.style.border = '1px solid #cbd5e1';
        newTd.style.padding = '8px 12px';
        newTd.innerHTML = '&nbsp;';
        newTr.appendChild(newTd);
      }
      if (action === 'addRowAbove') {
        tr.parentNode?.insertBefore(newTr, tr);
      } else {
        tr.parentNode?.insertBefore(newTr, tr.nextSibling);
      }
    } else if (action === 'addColLeft' || action === 'addColRight') {
      rows.forEach(row => {
        const cell = row.children[cellIndex];
        if (cell) {
          const isHeader = cell.tagName === 'TH';
          const newCell = document.createElement(isHeader ? 'th' : 'td');
          newCell.style.border = '1px solid #cbd5e1';
          newCell.style.padding = '8px 12px';
          if (isHeader) {
            newCell.style.textAlign = 'left';
            newCell.style.fontWeight = '600';
          }
          newCell.innerHTML = '&nbsp;';
          if (action === 'addColLeft') {
            row.insertBefore(newCell, cell);
          } else {
            row.insertBefore(newCell, cell.nextSibling);
          }
        }
      });
    } else if (action === 'deleteRow') {
      if (rows.length <= 1) {
        table.remove();
        setActiveTableInfo(null);
      } else {
        tr.remove();
      }
    } else if (action === 'deleteCol') {
      rows.forEach(row => {
        const cell = row.children[cellIndex];
        if (cell) cell.remove();
      });
      if (table.querySelectorAll('td, th').length === 0) {
        table.remove();
        setActiveTableInfo(null);
      }
    } else if (action === 'deleteTable') {
      table.remove();
      setActiveTableInfo(null);
    }

    if (editorRef.current) {
      handleUpdateContent(editorRef.current.innerHTML);
      setTimeout(() => {
        updateTableOverlayPos();
      }, 50);
    }
  };

  const handleExecCommand = (command: string, val: string = '') => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    if (sel) {
      if (savedRangeRef.current && editorRef.current.contains(savedRangeRef.current.commonAncestorContainer)) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      } else if (sel.rangeCount === 0 || !editorRef.current.contains(sel.anchorNode)) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    if (command === 'heading') {
      document.execCommand('formatBlock', false, '<h3>');
    } else if (command === 'createLink') {
      const sel = window.getSelection();
      let currentRange: Range | null = null;
      let selectedText = '';
      if (sel && sel.rangeCount > 0) {
        currentRange = sel.getRangeAt(0).cloneRange();
        selectedText = currentRange.toString();
      } else if (savedRangeRef.current) {
        currentRange = savedRangeRef.current.cloneRange();
        selectedText = currentRange.toString();
      }
      const url = prompt('Enter link URL:', 'https://');
      if (url) {
        editorRef.current.focus();
        const selAfter = window.getSelection();
        if (selAfter && currentRange && editorRef.current.contains(currentRange.commonAncestorContainer)) {
          selAfter.removeAllRanges();
          selAfter.addRange(currentRange);
        }
        const textToDisplay = selectedText || url;
        const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: underline; font-weight: 500;">${textToDisplay}</a>`;
        document.execCommand('insertHTML', false, linkHtml);
      }
    } else if (command === 'insertImage') {
      setShowImageModal(true);
      setImageUrlInput('');
    } else if (command === 'insertTable') {
      const tableHtml = `<table border="1" style="width: 100%; border-collapse: collapse; margin: 14px 0; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-weight: 600;">Header 1</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-weight: 600;">Header 2</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-weight: 600;">Header 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Cell 1</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Cell 2</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Cell 3</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Cell 4</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Cell 5</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Cell 6</td>
          </tr>
        </tbody>
      </table><p>&nbsp;</p>`;
      document.execCommand('insertHTML', false, tableHtml);
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
    } else if (command === 'foreColor' || command === 'formatBlock' || command.startsWith('justify')) {
      document.execCommand(command, false, val);
    } else {
      document.execCommand(command, false, val);
    }
    if (editorRef.current) {
      handleUpdateContent(editorRef.current.innerHTML);
      setTimeout(checkActiveTableSelection, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleExecCommand('bold');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleExecCommand('italic');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        handleExecCommand('underline');
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handleExecCommand('createLink');
      }
    } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'x' || e.key === 'X')) {
      e.preventDefault();
      handleExecCommand('strikeThrough');
    } else if ((e.metaKey || e.ctrlKey) && e.altKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      setShowShortcutsModal(true);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-[#f8fafc] overflow-hidden relative">
      {/* Left Inner Sidebar Tree */}
      <div 
        style={{ width: `${sidebarWidth}px` }}
        className="shrink-0 bg-white border-r border-slate-200 flex flex-col h-full select-none"
      >
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

      {/* Resizable separator bar */}
      <div
        title="Drag to resize sidebar"
        className="w-1.5 h-full bg-slate-100 hover:bg-indigo-400 active:bg-indigo-600 cursor-col-resize shrink-0 transition-colors select-none z-10 border-r border-slate-200 flex items-center justify-center"
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = sidebarWidth;
          const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = Math.max(180, Math.min(500, startWidth + (moveEvent.clientX - startX)));
            setSidebarWidth(newWidth);
          };
          const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
          };
          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        }}
      />

      {/* Main Rich Editor Panel */}
      <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
        {activePage ? (
          <>
            {/* Top Toolbar */}
            <div className="min-h-[56px] border-b border-slate-100 px-6 py-2 flex flex-wrap items-center justify-between shrink-0 bg-white/80 backdrop-blur-sm gap-3 relative z-30">
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

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* 3.1 Header / Normal text dropdown */}
                <select
                  onChange={(e) => {
                    if (e.target.value) handleExecCommand("formatBlock", e.target.value);
                    e.target.value = "";
                  }}
                  defaultValue=""
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-[12px] font-medium rounded-md px-2 py-1 outline-none hover:bg-slate-100 cursor-pointer"
                >
                  <option value="" disabled>Text Style</option>
                  <option value="<p>">Normal text</option>
                  <option value="<h1>">Heading 1</option>
                  <option value="<h2>">Heading 2</option>
                  <option value="<h3>">Heading 3</option>
                  <option value="<h4>">Heading 4</option>
                </select>

                <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 p-1 rounded-lg flex-wrap">
                  <button onClick={() => handleExecCommand("bold")} title="Bold (Cmd+B)" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Bold className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleExecCommand("italic")} title="Italic (Cmd+I)" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Italic className="w-3.5 h-3.5" /></button>
                  {/* 3.2 Underline option */}
                  <button onClick={() => handleExecCommand("underline")} title="Underline (Cmd+U)" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Underline className="w-3.5 h-3.5" /></button>
                  {/* 3.3 Strike option */}
                  <button onClick={() => handleExecCommand("strikeThrough")} title="Strikethrough (Cmd+Shift+X)" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Strikethrough className="w-3.5 h-3.5" /></button>
                </div>

                {/* 3.4 Text Color Dropdown (Notebook Only) */}
                <div className="relative">
                  <button 
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { setShowColorMenu(!showColorMenu); setShowAlignMenu(false); setShowListMenu(false); setShowMoreMenu(false); }}
                    title="Text & Background Color" 
                    className="flex items-center gap-1 p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 text-[12px] font-medium"
                  >
                    <Palette className="w-3.5 h-3.5 text-indigo-600" />
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showColorMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-3 flex flex-col items-center gap-2.5 z-50 w-[210px]">
                      <button
                        onMouseDown={e => e.preventDefault()}
                        onClick={e => {
                          e.preventDefault();
                          handleExecCommand('foreColor', '#0f172a');
                          handleExecCommand('hiliteColor', 'transparent');
                          setShowColorMenu(false);
                        }}
                        className="w-full py-1 border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 font-semibold text-[13px] flex items-center justify-center gap-1.5 shadow-2xs transition"
                      >
                        <span className="font-serif">T</span> Default
                      </button>

                      <div className="flex w-full border-b border-slate-200 text-[13px] font-medium">
                        <button
                          onMouseDown={e => e.preventDefault()}
                          onClick={e => { e.preventDefault(); setActiveColorTab('text'); }}
                          className={`flex-1 pb-1 text-center transition-colors ${activeColorTab === 'text' ? 'text-green-700 font-semibold border-b-2 border-green-700 -mb-px' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Text
                        </button>
                        <button
                          onMouseDown={e => e.preventDefault()}
                          onClick={e => { e.preventDefault(); setActiveColorTab('background'); }}
                          className={`flex-1 pb-1 text-center transition-colors ${activeColorTab === 'background' ? 'text-green-700 font-semibold border-b-2 border-green-700 -mb-px' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Background
                        </button>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5 w-full pt-1">
                        {COLOR_SWATCHES.map(c => (
                          <button
                            key={c.color}
                            onMouseDown={e => e.preventDefault()}
                            onClick={e => {
                              e.preventDefault();
                              if (activeColorTab === 'text') {
                                handleExecCommand('foreColor', c.color);
                              } else {
                                handleExecCommand('hiliteColor', c.color);
                                handleExecCommand('backColor', c.color);
                              }
                              setShowColorMenu(false);
                            }}
                            className="w-7 h-7 rounded border border-slate-300 hover:scale-110 transition-transform flex items-center justify-center shadow-2xs"
                            style={{ backgroundColor: c.color }}
                            title={c.label}
                          >
                            {(activeColorTab === 'text' && c.color === '#0f172a') || (activeColorTab === 'background' && c.color === '#fef9c3') ? (
                              <Check className={`w-3.5 h-3.5 ${c.color === '#fef9c3' ? 'text-slate-800' : 'text-white'}`} />
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3.5 Text Position (Alignment) Dropdown (Notebook Only) */}
                <div className="relative">
                  <button 
                    onClick={() => { setShowAlignMenu(!showAlignMenu); setShowColorMenu(false); setShowListMenu(false); setShowMoreMenu(false); }}
                    title="Text Alignment" 
                    className="flex items-center gap-1 p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 text-[12px] font-medium"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showAlignMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 flex flex-col z-50 min-w-[120px]">
                      <button onClick={() => { handleExecCommand('justifyLeft'); setShowAlignMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-[12px] text-slate-700"><AlignLeft className="w-3.5 h-3.5" /> Left</button>
                      <button onClick={() => { handleExecCommand('justifyCenter'); setShowAlignMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-[12px] text-slate-700"><AlignCenter className="w-3.5 h-3.5" /> Center</button>
                      <button onClick={() => { handleExecCommand('justifyRight'); setShowAlignMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-[12px] text-slate-700"><AlignRight className="w-3.5 h-3.5" /> Right</button>
                      <button onClick={() => { handleExecCommand('justifyFull'); setShowAlignMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-[12px] text-slate-700"><AlignJustify className="w-3.5 h-3.5" /> Justify</button>
                    </div>
                  )}
                </div>

                {/* 3.6 Group Bullet Points Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => { setShowListMenu(!showListMenu); setShowColorMenu(false); setShowAlignMenu(false); setShowMoreMenu(false); }}
                    title="Lists & Tasks" 
                    className="flex items-center gap-1 p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 text-[12px] font-medium"
                  >
                    <List className="w-3.5 h-3.5" />
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showListMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 flex flex-col z-50 min-w-[140px]">
                      <button onMouseDown={e => e.preventDefault()} onClick={() => { handleExecCommand('insertUnorderedList'); setShowListMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-[12px] text-slate-700"><List className="w-3.5 h-3.5" /> Bullet List</button>
                      <button onMouseDown={e => e.preventDefault()} onClick={() => { handleExecCommand('insertOrderedList'); setShowListMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-[12px] text-slate-700"><ListOrdered className="w-3.5 h-3.5" /> Numbered List</button>
                      <button onMouseDown={e => e.preventDefault()} onClick={() => { handleExecCommand('checkbox'); setShowListMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-[12px] text-slate-700"><CheckSquare className="w-3.5 h-3.5" /> Checkbox Task</button>
                    </div>
                  )}
                </div>

                {/* 3.7 Add Link Option */}
                <button onMouseDown={e => e.preventDefault()} onClick={() => handleExecCommand("createLink")} title="Add Link (Cmd+K)" className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600"><LinkIcon className="w-3.5 h-3.5" /></button>

                <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 p-1 rounded-lg flex-wrap">
                  <button onMouseDown={e => e.preventDefault()} onClick={() => handleExecCommand("callout")} title="Callout Box" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><AlertCircle className="w-3.5 h-3.5 text-indigo-600" /></button>
                  <button onMouseDown={e => e.preventDefault()} onClick={() => handleExecCommand("divider")} title="Divider" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Minus className="w-3.5 h-3.5" /></button>
                  <button onMouseDown={e => e.preventDefault()} onClick={() => handleExecCommand("date")} title="Insert Date Stamp" className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Calendar className="w-3.5 h-3.5 text-amber-600" /></button>
                </div>

                {/* 3.8 Add Ellipsis & Capability to add Images & Table (Notebook Only) */}
                <div className="relative">
                  <button 
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { setShowMoreMenu(!showMoreMenu); setShowColorMenu(false); setShowAlignMenu(false); setShowListMenu(false); }}
                    title="Insert Image / Table" 
                    className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                  {showMoreMenu && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 flex flex-col z-50 min-w-[140px]">
                      <button onMouseDown={e => e.preventDefault()} onClick={() => { handleExecCommand('insertImage'); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-[12px] text-slate-700"><ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Insert Image</button>
                      <button onMouseDown={e => e.preventDefault()} onClick={() => { handleExecCommand('insertTable'); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-[12px] text-slate-700"><TableIcon className="w-3.5 h-3.5 text-emerald-600" /> Insert Table</button>
                    </div>
                  )}
                </div>

                {/* 3.9 Keyboard Shortcuts Button */}
                <button 
                  onClick={() => setShowShortcutsModal(true)} 
                  title="Keyboard Shortcuts (Alt+K)" 
                  className="p-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg text-indigo-600 font-medium text-[11px] flex items-center gap-1"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                </button>

                {/* Voice Dictation Button inside Editor */}
                <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg ml-1">
                  <span className="text-[11px] font-semibold text-indigo-700">Voice Dictate:</span>
                  <VoiceInputButton onResult={(speech) => handleUpdateContent(activePage.content + (activePage.content ? "<br/><br/>" : "") + speech)} />
                </div>

                <div className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-600 ml-1">
                  <Check className="w-3.5 h-3.5" /> Saved
                </div>
              </div>
            </div>

            {/* Document Editor Area (Seamless Editable Page) */}
            <div 
              className="flex-1 flex flex-col overflow-y-auto p-6 lg:p-8 w-full relative"
              onScroll={updateTableOverlayPos}
              onClick={() => { checkActiveTableSelection(); saveSelection(); }}
              onKeyUp={() => { checkActiveTableSelection(); saveSelection(); }}
              onMouseUp={() => { checkActiveTableSelection(); saveSelection(); }}
            >
              {/* Page Title Input */}
              <input 
                type="text" 
                value={activePage.title}
                onChange={e => handleUpdateTitle(e.target.value)}
                placeholder="Untitled Page"
                className="w-full text-2xl font-extrabold text-slate-900 outline-none placeholder:text-slate-300 bg-transparent border-0 px-0 mb-4 shrink-0"
              />

              <div className="flex-1 flex flex-col relative min-h-[450px]">
                {/* Table Interactive Overlays */}
                {tableOverlayPos && activeTableInfo && (
                  <>
                    {/* 3.1 Position selection picker at top-left of table */}
                    <div
                      style={{ top: Math.max(0, tableOverlayPos.top - 16), left: Math.max(0, tableOverlayPos.left - 24) }}
                      className="absolute z-30 p-1 bg-white border border-slate-300 rounded shadow-xs cursor-move hover:bg-slate-100 flex items-center justify-center transition"
                      title="Select / Drag Table"
                      draggable={true}
                      onDragStart={e => {
                        if (activeTableInfo?.table) {
                          draggedTableRef.current = activeTableInfo.table;
                          e.dataTransfer.setData('text/html', activeTableInfo.table.outerHTML);
                          e.dataTransfer.effectAllowed = 'move';
                        }
                      }}
                      onMouseDown={e => {
                        const sel = window.getSelection();
                        if (sel && activeTableInfo?.table) {
                          const range = document.createRange();
                          range.selectNode(activeTableInfo.table);
                          sel.removeAllRanges();
                          sel.addRange(range);
                          saveSelection();
                        }
                      }}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    </div>

                    {/* 3.3 & 3.4 Floating cell controls (Cell Color and Ellipsis options) */}
                    <div
                      style={{ top: Math.max(0, tableOverlayPos.cellTop - 34), left: Math.max(0, Math.min(tableOverlayPos.width - 160, tableOverlayPos.cellLeft)) }}
                      className="absolute z-40 flex items-center gap-1 bg-white border border-slate-200 rounded-lg shadow-md px-1.5 py-0.5"
                    >
                      <div className="relative">
                        <button
                          onMouseDown={e => { e.preventDefault(); setShowTableCellColorMenu(!showTableCellColorMenu); setShowTableOptionsMenu(false); }}
                          className="flex items-center gap-1.5 px-2 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-100 rounded transition"
                        >
                          <span className="w-3.5 h-3.5 rounded border border-slate-300 inline-block shrink-0" style={{ backgroundColor: activeTableInfo.td.style.backgroundColor || '#ffffff' }} />
                          Cell color
                        </button>
                        {showTableCellColorMenu && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 grid grid-cols-5 gap-1.5 z-50 w-[160px]">
                            {COLOR_SWATCHES.map(s => (
                              <button
                                key={s.color}
                                onMouseDown={e => {
                                  e.preventDefault();
                                  if (activeTableInfo?.td) {
                                    activeTableInfo.td.style.backgroundColor = s.color;
                                    if (editorRef.current) handleUpdateContent(editorRef.current.innerHTML);
                                  }
                                  setShowTableCellColorMenu(false);
                                }}
                                onClick={e => {
                                  e.preventDefault();
                                  if (activeTableInfo?.td) {
                                    activeTableInfo.td.style.backgroundColor = s.color;
                                    if (editorRef.current) handleUpdateContent(editorRef.current.innerHTML);
                                  }
                                  setShowTableCellColorMenu(false);
                                }}
                                className="w-6 h-6 rounded border border-slate-300 hover:scale-110 transition-transform flex items-center justify-center shadow-2xs"
                                style={{ backgroundColor: s.color }}
                                title={s.label}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="h-4 w-px bg-slate-200 mx-0.5" />

                      <div className="relative">
                        <button
                          onMouseDown={e => { e.preventDefault(); setShowTableOptionsMenu(!showTableOptionsMenu); setShowTableCellColorMenu(false); }}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded transition"
                          title="Table Options"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {showTableOptionsMenu && (
                          <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1 flex flex-col z-50 min-w-[160px]">
                            <button onMouseDown={e => { e.preventDefault(); handleTableAction('addRowAbove'); setShowTableOptionsMenu(false); }} onClick={() => { handleTableAction('addRowAbove'); setShowTableOptionsMenu(false); }} className="px-3 py-1.5 text-left text-[12px] hover:bg-slate-50 text-slate-700 font-medium">Add row above</button>
                            <button onMouseDown={e => { e.preventDefault(); handleTableAction('addRowBelow'); setShowTableOptionsMenu(false); }} onClick={() => { handleTableAction('addRowBelow'); setShowTableOptionsMenu(false); }} className="px-3 py-1.5 text-left text-[12px] hover:bg-slate-50 text-slate-700 font-medium">Add row below</button>
                            <button onMouseDown={e => { e.preventDefault(); handleTableAction('addColLeft'); setShowTableOptionsMenu(false); }} onClick={() => { handleTableAction('addColLeft'); setShowTableOptionsMenu(false); }} className="px-3 py-1.5 text-left text-[12px] hover:bg-slate-50 text-slate-700 font-medium">Add column left</button>
                            <button onMouseDown={e => { e.preventDefault(); handleTableAction('addColRight'); setShowTableOptionsMenu(false); }} onClick={() => { handleTableAction('addColRight'); setShowTableOptionsMenu(false); }} className="px-3 py-1.5 text-left text-[12px] hover:bg-slate-50 text-slate-700 font-medium">Add column right</button>
                            <div className="border-t border-slate-100 my-1" />
                            <button onMouseDown={e => { e.preventDefault(); handleTableAction('deleteRow'); setShowTableOptionsMenu(false); }} onClick={() => { handleTableAction('deleteRow'); setShowTableOptionsMenu(false); }} className="px-3 py-1.5 text-left text-[12px] hover:bg-red-50 text-red-600 font-medium">Delete row</button>
                            <button onMouseDown={e => { e.preventDefault(); handleTableAction('deleteCol'); setShowTableOptionsMenu(false); }} onClick={() => { handleTableAction('deleteCol'); setShowTableOptionsMenu(false); }} className="px-3 py-1.5 text-left text-[12px] hover:bg-red-50 text-red-600 font-medium">Delete column</button>
                            <button onMouseDown={e => { e.preventDefault(); handleTableAction('deleteTable'); setShowTableOptionsMenu(false); }} onClick={() => { handleTableAction('deleteTable'); setShowTableOptionsMenu(false); }} className="px-3 py-1.5 text-left text-[12px] hover:bg-red-50 text-red-600 font-bold">Delete table</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3.2 Add row button (+) below table */}
                    <div
                      style={{ top: tableOverlayPos.bottom + 4, left: tableOverlayPos.left, width: tableOverlayPos.width }}
                      className="absolute z-30"
                    >
                      <button
                        onMouseDown={e => {
                          e.preventDefault();
                          handleTableAction('addRowBelow');
                        }}
                        onClick={e => {
                          e.preventDefault();
                          handleTableAction('addRowBelow');
                        }}
                        className="w-full py-1 bg-slate-50/90 border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 transition group shadow-2xs"
                        title="Add row below"
                      >
                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  </>
                )}

                {/* Image Interactive Overlays (Resize & Alignment Toolbar) */}
                {imageOverlayPos && activeImageInfo && (
                  <>
                    <div
                      style={{
                        top: imageOverlayPos.top,
                        left: imageOverlayPos.left,
                        width: imageOverlayPos.width,
                        height: imageOverlayPos.height
                      }}
                      className="absolute border-2 border-emerald-600 pointer-events-none z-30"
                    />
                    {/* 8 Resize Handles around image */}
                    {['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'].map((dir) => {
                      let topPos = 0;
                      let leftPos = 0;
                      let cursor = 'nwse-resize';
                      if (dir === 'nw') { topPos = -5; leftPos = -5; cursor = 'nwse-resize'; }
                      else if (dir === 'ne') { topPos = -5; leftPos = imageOverlayPos.width - 5; cursor = 'nesw-resize'; }
                      else if (dir === 'sw') { topPos = imageOverlayPos.height - 5; leftPos = -5; cursor = 'nesw-resize'; }
                      else if (dir === 'se') { topPos = imageOverlayPos.height - 5; leftPos = imageOverlayPos.width - 5; cursor = 'nwse-resize'; }
                      else if (dir === 'n') { topPos = -5; leftPos = imageOverlayPos.width / 2 - 5; cursor = 'ns-resize'; }
                      else if (dir === 's') { topPos = imageOverlayPos.height - 5; leftPos = imageOverlayPos.width / 2 - 5; cursor = 'ns-resize'; }
                      else if (dir === 'w') { topPos = imageOverlayPos.height / 2 - 5; leftPos = -5; cursor = 'ew-resize'; }
                      else if (dir === 'e') { topPos = imageOverlayPos.height / 2 - 5; leftPos = imageOverlayPos.width - 5; cursor = 'ew-resize'; }

                      return (
                        <div
                          key={dir}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            resizingImageRef.current = {
                              img: activeImageInfo,
                              startX: e.clientX,
                              startY: e.clientY,
                              startWidth: imageOverlayPos.width,
                              startHeight: imageOverlayPos.height,
                              dir
                            };
                          }}
                          className={`absolute w-2.5 h-2.5 bg-white border-2 border-emerald-600 rounded-xs z-40 pointer-events-auto`}
                          style={{
                            top: imageOverlayPos.top + topPos,
                            left: imageOverlayPos.left + leftPos,
                            cursor
                          }}
                        />
                      );
                    })}

                    {/* Floating Image Toolbar (Screenshots 2 & 3) */}
                    <div
                      style={{
                        top: imageOverlayPos.top + imageOverlayPos.height + 8,
                        left: imageOverlayPos.left + Math.max(0, imageOverlayPos.width / 2 - 46)
                      }}
                      className="absolute z-40 bg-white border border-slate-200 rounded-xl shadow-lg p-1 flex items-center gap-1.5 pointer-events-auto"
                    >
                      <div className="relative">
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setShowImageAlignMenu(!showImageAlignMenu);
                          }}
                          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-1 transition"
                          title="Align image"
                        >
                          <AlignLeft className="w-4 h-4" />
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>
                        {showImageAlignMenu && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 flex flex-col gap-1 z-50 min-w-[120px]">
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                activeImageInfo.style.display = 'block';
                                activeImageInfo.style.margin = '12px auto 12px 0';
                                if (editorRef.current) handleUpdateContent(editorRef.current.innerHTML);
                                updateImageOverlayPos();
                                setShowImageAlignMenu(false);
                              }}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-slate-700 hover:bg-slate-50 text-left"
                            >
                              <AlignLeft className="w-3.5 h-3.5" /> Left
                            </button>
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                activeImageInfo.style.display = 'block';
                                activeImageInfo.style.margin = '12px auto';
                                if (editorRef.current) handleUpdateContent(editorRef.current.innerHTML);
                                updateImageOverlayPos();
                                setShowImageAlignMenu(false);
                              }}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-slate-700 hover:bg-slate-50 text-left"
                            >
                              <AlignCenter className="w-3.5 h-3.5" /> Middle
                            </button>
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                activeImageInfo.style.display = 'block';
                                activeImageInfo.style.margin = '12px 0 12px auto';
                                if (editorRef.current) handleUpdateContent(editorRef.current.innerHTML);
                                updateImageOverlayPos();
                                setShowImageAlignMenu(false);
                              }}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-slate-700 hover:bg-slate-50 text-left"
                            >
                              <AlignRight className="w-3.5 h-3.5" /> Right
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const a = document.createElement('a');
                          a.href = activeImageInfo.src;
                          a.download = 'notebook-image.png';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition"
                        title="Download image"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                <div 
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => { handleUpdateContent(e.currentTarget.innerHTML); saveSelection(); updateTableOverlayPos(); updateImageOverlayPos(); }}
                  onKeyDown={handleKeyDown}
                  onKeyUp={(e) => { checkActiveTableSelection(); saveSelection(); updateTableOverlayPos(); updateImageOverlayPos(); }}
                  onMouseUp={(e) => { checkActiveTableSelection(); saveSelection(); checkImageSelection(e.target); }}
                  onClick={(e) => { checkActiveTableSelection(); saveSelection(); checkImageSelection(e.target); }}
                  onDragOver={(e) => {
                    if (draggedTableRef.current) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }
                  }}
                  onDrop={(e) => {
                    if (draggedTableRef.current && editorRef.current) {
                      e.preventDefault();
                      let range: Range | null = null;
                      if (document.caretRangeFromPoint) {
                        range = document.caretRangeFromPoint(e.clientX, e.clientY);
                      } else if ((document as any).caretPositionFromPoint) {
                        const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
                        if (pos) {
                          range = document.createRange();
                          range.setStart(pos.offsetNode, pos.offset);
                          range.collapse(true);
                        }
                      }
                      if (range && editorRef.current.contains(range.startContainer) && !draggedTableRef.current.contains(range.startContainer)) {
                        let targetBlock: Node | null = range.startContainer;
                        while (targetBlock && targetBlock.parentNode !== editorRef.current) {
                          targetBlock = targetBlock.parentNode;
                        }
                        if (targetBlock && targetBlock !== draggedTableRef.current) {
                          const rect = (targetBlock as HTMLElement).getBoundingClientRect ? (targetBlock as HTMLElement).getBoundingClientRect() : null;
                          if (rect && e.clientY < rect.top + rect.height / 2) {
                            editorRef.current.insertBefore(draggedTableRef.current, targetBlock);
                          } else {
                            editorRef.current.insertBefore(draggedTableRef.current, targetBlock.nextSibling);
                          }
                        } else {
                          range.insertNode(draggedTableRef.current);
                        }
                        handleUpdateContent(editorRef.current.innerHTML);
                        updateTableOverlayPos();
                      }
                      draggedTableRef.current = null;
                    }
                  }}
                  className="w-full flex-1 min-h-[450px] outline-none text-slate-800 font-sans text-[15px] leading-relaxed"
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

      {/* Insert Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 pt-3 bg-slate-50">
              <div className="flex gap-6 text-[14px] font-semibold">
                <button
                  onClick={() => setImageModalTab('upload')}
                  className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${imageModalTab === 'upload' ? 'border-green-700 text-green-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  <Upload className="w-4 h-4" /> Upload
                </button>
                <button
                  onClick={() => setImageModalTab('embed')}
                  className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${imageModalTab === 'embed' ? 'border-green-700 text-green-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  <LinkIcon className="w-4 h-4" /> Embed link
                </button>
              </div>
              <button onClick={() => setShowImageModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg mb-2">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-8 flex flex-col items-center justify-center text-center">
              {imageModalTab === 'upload' ? (
                <>
                  <label className="cursor-pointer bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition text-[14px] inline-block mb-3">
                    Choose image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 4 * 1024 * 1024) {
                            alert("Image exceeds 4 MB maximum size.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (reader.result && editorRef.current) {
                              editorRef.current.focus();
                              const sel = window.getSelection();
                              if (sel) {
                                if (savedRangeRef.current && editorRef.current.contains(savedRangeRef.current.commonAncestorContainer)) {
                                  sel.removeAllRanges();
                                  sel.addRange(savedRangeRef.current);
                                } else if (sel.rangeCount === 0 || !editorRef.current.contains(sel.anchorNode)) {
                                  const range = document.createRange();
                                  range.selectNodeContents(editorRef.current);
                                  range.collapse(false);
                                  sel.removeAllRanges();
                                  sel.addRange(range);
                                }
                              }
                              document.execCommand('insertHTML', false, `<img src="${reader.result}" alt="uploaded image" style="max-width: 100%; border-radius: 8px; margin: 12px 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />`);
                              handleUpdateContent(editorRef.current.innerHTML);
                              setShowImageModal(false);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  <p className="text-[13px] text-slate-500">Maximum image size is 4 MB.</p>
                </>
              ) : (
                <div className="w-full space-y-4">
                  <input
                    type="text"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Paste the link to your image..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-[14px] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    onClick={() => {
                      if (imageUrlInput.trim() && editorRef.current) {
                        editorRef.current.focus();
                        const sel = window.getSelection();
                        if (sel) {
                          if (savedRangeRef.current && editorRef.current.contains(savedRangeRef.current.commonAncestorContainer)) {
                            sel.removeAllRanges();
                            sel.addRange(savedRangeRef.current);
                          } else if (sel.rangeCount === 0 || !editorRef.current.contains(sel.anchorNode)) {
                            const range = document.createRange();
                            range.selectNodeContents(editorRef.current);
                            range.collapse(false);
                            sel.removeAllRanges();
                            sel.addRange(range);
                          }
                        }
                        document.execCommand('insertHTML', false, `<img src="${imageUrlInput.trim()}" alt="embedded link image" style="max-width: 100%; border-radius: 8px; margin: 12px 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />`);
                        handleUpdateContent(editorRef.current.innerHTML);
                        setShowImageModal(false);
                      }
                    }}
                    className="bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold px-6 py-2 rounded-lg shadow-sm transition text-[14px]"
                  >
                    Insert image
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-[15px]">Keyboard Shortcuts</h3>
              </div>
              <button onClick={() => setShowShortcutsModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 divide-y divide-slate-100 text-[13px]">
              {[
                { key: 'Cmd/Ctrl + B', label: 'Toggle Bold' },
                { key: 'Cmd/Ctrl + I', label: 'Toggle Italic' },
                { key: 'Cmd/Ctrl + U', label: 'Toggle Underline' },
                { key: 'Cmd/Ctrl + Shift + X', label: 'Toggle Strikethrough' },
                { key: 'Cmd/Ctrl + K', label: 'Insert Link' },
                { key: 'Alt + K', label: 'Show Keyboard Shortcuts' }
              ].map((s, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                  <span className="text-slate-600 font-medium">{s.label}</span>
                  <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono text-[11px] font-semibold">{s.key}</kbd>
                </div>
              ))}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
              <button onClick={() => setShowShortcutsModal(false)} className="px-4 py-1.5 bg-indigo-600 text-white font-medium rounded-lg text-[13px] hover:bg-indigo-700 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
