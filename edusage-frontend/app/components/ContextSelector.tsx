'use client';

import { useState, useEffect } from 'react';
import { CloudUpload, FileText, List as ListIcon, CheckCircle } from 'lucide-react';

interface ContextSelectorProps {
  onSelectionChange: (value: string, type: 'file' | 'text') => void;  
  currentSelection: string;
}

export default function ContextSelector({ onSelectionChange, currentSelection }: ContextSelectorProps) {
  const [activeTab, setActiveTab] = useState<'select' | 'upload' | 'paste'>('select');
  const [files, setFiles] = useState<string[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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
        body: formData, // No headers needed, browser sets multipart/form-data automatically
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        // Refresh list and select the new file
        setFiles(prev => [...prev, data.filename]);
        onSelectionChange(data.filename, 'file');
        setActiveTab('select'); // Switch back to list view
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
      // DIRECT PASS: No backend call. Just pass the text up.
      onSelectionChange(textInput, 'text');
      alert("Text ready for use!");
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">Select Context Source</label>
      
      {/* Tabs */}
      <div className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-4">
        {[
          { id: 'select', label: 'Existing File', icon: ListIcon },
          { id: 'upload', label: 'Upload PDF', icon: CloudUpload },
          { id: 'paste', label: 'Paste Text', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
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

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 min-h-[150px]">
        
        {/* TAB 1: Select Existing */}
        {activeTab === 'select' && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {files.length === 0 ? (
              <p className="text-center text-gray-500 py-4 text-sm">No files uploaded yet.</p>
            ) : (
              files.map(file => (
                <div 
                  key={file} 
                  onClick={() => onSelectionChange(file, 'file')}
                  className={`flex items-center p-3 rounded-md cursor-pointer border transition-colors ${
                    currentSelection === file 
                      ? 'border-purple-500 bg-purple-50 text-purple-700' 
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <FileText size={18} className="mr-3 flex-shrink-0" />
                  <span className="truncate text-sm flex-1">{file}</span>
                  {currentSelection === file && <CheckCircle size={18} />}
                </div>
              ))
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
            {isUploading && <p className="text-purple-600 text-sm font-bold animate-pulse">Uploading...</p>}
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
      
      {/* Selection Indicator */}
      {currentSelection && (
        <p className="mt-2 text-xs text-gray-500 text-right truncate">
          Selected: <span className="font-semibold text-purple-600">{currentSelection.length > 50 ? "Raw Text Content": currentSelection}</span>
        </p>
      )}
    </div>
  );
}