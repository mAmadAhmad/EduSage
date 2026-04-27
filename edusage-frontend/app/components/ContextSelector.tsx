'use client';

import { useState, useEffect } from 'react';
import { CloudUpload, FileText, List as ListIcon, CheckCircle, ChevronLeft, BookOpen } from 'lucide-react';

interface ContextSelectorProps {
  onSelectionChange: (value: string, type: 'file' | 'text', chapter?: string) => void;  
  currentSelection: string;
}

export default function ContextSelector({ onSelectionChange, currentSelection }: ContextSelectorProps) {
  const [activeTab, setActiveTab] = useState<'select' | 'upload' | 'paste'>('select');
  const [files, setFiles] = useState<string[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // NEW: State for the Table of Contents UI
  const [chapters, setChapters] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | undefined>(undefined);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);

  // Fetch available files on mount
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const res = await fetch(`${backendUrl}/docs/list`, { credentials: 'include' });
        if (res.ok) setFiles(await res.json());
      } catch (e) {
        console.error("Failed to fetch file list", e);
      }
    };
    fetchFiles();
  }, []);

  // NEW: Fetch chapters when a file is selected
  const handleFileSelect = async (filename: string) => {
    onSelectionChange(filename, 'file', undefined); // Reset chapter when new file selected
    setSelectedChapter(undefined);
    setIsLoadingChapters(true);
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/docs/${filename}/chapters`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setChapters(data);
      }
    } catch (e) {
      console.error("Failed to fetch chapters", e);
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const handleChapterSelect = (chapter: string) => {
    // Toggle off if clicked again
    const newChapter = selectedChapter === chapter ? undefined : chapter;
    setSelectedChapter(newChapter);
    onSelectionChange(currentSelection, 'file', newChapter);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/docs/ingest/`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setFiles(prev => [...prev, data.filename]);
        handleFileSelect(data.filename); // Automatically select and load TOC
        setActiveTab('select'); 
      } else {
        alert("Upload failed");
      }
    } catch (error) {
      alert("Error uploading file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextConfirm = () => {
      if (!textInput.trim()) return;
      onSelectionChange(textInput, 'text');
      alert("Text ready for use!");
  };

  // Helper to reset view back to file list
  const clearSelection = () => {
    onSelectionChange('', 'file', undefined);
    setSelectedChapter(undefined);
    setChapters([]);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">Select Context Source</label>
      
      {/* Hide Tabs if a file is actively selected and we are in "select" mode */}
      {!(activeTab === 'select' && currentSelection && !currentSelection.startsWith("Raw Text")) && (
        <div className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-4">
          {[
            { id: 'select', label: 'Existing File', icon: ListIcon },
            { id: 'upload', label: 'Upload PDF', icon: CloudUpload },
            { id: 'paste', label: 'Paste Text', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id !== 'select') clearSelection();
              }}
              className={`w-full flex items-center justify-center py-2.5 text-sm font-medium leading-5 rounded-lg transition-all duration-200
                ${activeTab === tab.id 
                  ? 'bg-white text-purple-700 shadow' 
                  : 'text-gray-600 hover:bg-white/[0.12] hover:text-purple-600'}`}
            >
              <tab.icon size={16} className="mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 min-h-[150px]">
        
        {/* TAB 1: Select Existing & TOC View */}
        {activeTab === 'select' && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* If a file IS selected, show the TOC view */}
            {currentSelection ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-4 pb-2 border-b">
                  <div className="flex items-center text-purple-700 font-medium">
                    <FileText size={18} className="mr-2" />
                    <span className="truncate">{currentSelection}</span>
                  </div>
                  <button
                  type="button" 
                    onClick={clearSelection}
                    className="text-xs flex items-center text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <ChevronLeft size={14} className="mr-1" /> Change File
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                    <BookOpen size={16} className="mr-2 text-gray-400" />
                    Table of Contents
                  </h4>
                  
                  {isLoadingChapters ? (
                    <p className="text-sm text-gray-500 animate-pulse">Scanning document structure...</p>
                  ) : chapters.length === 0 ? (
                    <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-md">
                      No chapter structure detected in this PDF. The entire document will be used.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {chapters.map(chapter => (
                        <button
                        type="button"
                          key={chapter}
                          onClick={() => handleChapterSelect(chapter)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                            selectedChapter === chapter 
                              ? 'bg-purple-600 text-white border-purple-600 shadow-sm' 
                              : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                          }`}
                        >
                          {chapter}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* If NO file is selected, show the list */
              <>
                {files.length === 0 ? (
                  <p className="text-center text-gray-500 py-4 text-sm">No files uploaded yet.</p>
                ) : (
                  files.map(file => (
                    <div 
                      key={file} 
                      onClick={() => handleFileSelect(file)}
                      className="flex items-center p-3 rounded-md cursor-pointer border border-gray-200 hover:bg-purple-50 hover:border-purple-300 text-gray-700 transition-colors"
                    >
                      <FileText size={18} className="mr-3 flex-shrink-0 text-gray-400" />
                      <span className="truncate text-sm flex-1">{file}</span>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: Upload New */}
        {activeTab === 'upload' && (
          <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:bg-gray-50 transition-colors relative">
            <CloudUpload size={40} className="text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop PDF</p>
            <input 
              type="file" 
              accept=".pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            {isUploading && <p className="text-purple-600 text-sm font-bold animate-pulse">Uploading & Mapping Document...</p>}
          </div>
        )}

        {/* TAB 3: Paste Text */}
        {activeTab === 'paste' && (
          <div className="space-y-3">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste your lecture notes, article text, or summary here..."
              className="w-full h-32 p-3 border rounded-md text-sm text-gray-900 focus:ring-purple-500 focus:border-purple-500 resize-none"
            />
            <button
              type="button"
              onClick={handleTextConfirm}
              disabled={!textInput.trim()}
              className="w-full py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:bg-gray-400"
            >
              {'Use This Text'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}