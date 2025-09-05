'use client';

import { useState, useEffect } from 'react';
import { FileDocument } from '@/types/files';
import { searchUserFiles, getFilesByType } from '@/lib/firebase/firestore';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  Search,
  Filter,
  Calendar,
  HardDrive,
  FileType,
  X,
  ChevronDown,
  Image,
  Video,
  Music,
  FileText,
  Archive,
  File
} from 'lucide-react';

interface FileSearchAndFilterProps {
  onFilesFiltered: (files: FileDocument[]) => void;
  allFiles: FileDocument[];
  isSecretMode: boolean;
}

interface FilterOptions {
  searchTerm: string;
  fileTypes: string[];
  dateRange: {
    start: string;
    end: string;
  };
  sizeRange: {
    min: number;
    max: number;
  };
}

export const FileSearchAndFilter = ({ onFilesFiltered, allFiles, isSecretMode }: FileSearchAndFilterProps) => {
  const { user } = useAuth();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    fileTypes: [],
    dateRange: { start: '', end: '' },
    sizeRange: { min: 0, max: 0 }
  });

  const fileTypeOptions = [
    { value: 'image/', label: 'Images', icon: Image, color: 'text-green-600' },
    { value: 'video/', label: 'Videos', icon: Video, color: 'text-red-600' },
    { value: 'audio/', label: 'Audio', icon: Music, color: 'text-purple-600' },
    { value: 'application/pdf', label: 'PDFs', icon: FileText, color: 'text-blue-600' },
    { value: 'application/zip', label: 'Archives', icon: Archive, color: 'text-yellow-600' },
    { value: 'text/', label: 'Text Files', icon: FileText, color: 'text-gray-600' }
  ];

  const applyFilters = (filesToFilter: FileDocument[] = allFiles) => {
    let filtered = [...filesToFilter];

    // Search by name
    if (filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(searchLower)
      );
    }

    // Filter by file types
    if (filters.fileTypes.length > 0) {
      filtered = filtered.filter(file =>
        filters.fileTypes.some(type => file.type.startsWith(type))
      );
    }

    // Filter by date range
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter(file => {
        const fileDate = file.createdAt?.toDate ? file.createdAt.toDate() : new Date(file.createdAt);
        const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : new Date('1970-01-01');
        const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : new Date();
        
        return fileDate >= startDate && fileDate <= endDate;
      });
    }

    // Filter by size range
    if (filters.sizeRange.min > 0 || filters.sizeRange.max > 0) {
      filtered = filtered.filter(file => {
        const minSize = filters.sizeRange.min * 1024; // Convert KB to bytes
        const maxSize = filters.sizeRange.max > 0 ? filters.sizeRange.max * 1024 : Infinity;
        return file.size >= minSize && file.size <= maxSize;
      });
    }

    onFilesFiltered(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [filters, allFiles]);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, searchTerm: value }));
  };

  const handleFileTypeToggle = (type: string) => {
    setFilters(prev => ({
      ...prev,
      fileTypes: prev.fileTypes.includes(type)
        ? prev.fileTypes.filter(t => t !== type)
        : [...prev.fileTypes, type]
    }));
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: { ...prev.dateRange, [field]: value }
    }));
  };

  const handleSizeChange = (field: 'min' | 'max', value: number) => {
    setFilters(prev => ({
      ...prev,
      sizeRange: { ...prev.sizeRange, [field]: value }
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      searchTerm: '',
      fileTypes: [],
      dateRange: { start: '', end: '' },
      sizeRange: { min: 0, max: 0 }
    });
  };

  const hasActiveFilters = filters.searchTerm.trim() || 
    filters.fileTypes.length > 0 || 
    filters.dateRange.start || 
    filters.dateRange.end ||
    filters.sizeRange.min > 0 ||
    filters.sizeRange.max > 0;

  return (
    <div className="space-y-4 mb-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search files..."
          value={filters.searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-colors ${
            hasActiveFilters || showFilters 
              ? 'text-blue-600 dark:text-blue-400' 
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>Clear all</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <FileType className="w-4 h-4 inline mr-2" />
                File Types
              </label>
              <div className="space-y-2">
                {fileTypeOptions.map((option) => {
                  const IconComponent = option.icon;
                  const isSelected = filters.fileTypes.includes(option.value);
                  
                  return (
                    <label
                      key={option.value}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleFileTypeToggle(option.value)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <IconComponent className={`w-4 h-4 ${option.color}`} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date Range
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  placeholder="Start date"
                />
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleDateChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  placeholder="End date"
                />
              </div>
            </div>

            {/* Size Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <HardDrive className="w-4 h-4 inline mr-2" />
                Size Range (KB)
              </label>
              <div className="space-y-2">
                <input
                  type="number"
                  min="0"
                  value={filters.sizeRange.min || ''}
                  onChange={(e) => handleSizeChange('min', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  placeholder="Min size"
                />
                <input
                  type="number"
                  min="0"
                  value={filters.sizeRange.max || ''}
                  onChange={(e) => handleSizeChange('max', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  placeholder="Max size"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center space-x-2 flex-wrap">
          <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
          
          {filters.searchTerm.trim() && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              Search: "{filters.searchTerm}"
            </span>
          )}
          
          {filters.fileTypes.map(type => {
            const option = fileTypeOptions.find(opt => opt.value === type);
            return option ? (
              <span key={type} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                {option.label}
              </span>
            ) : null;
          })}
          
          {(filters.dateRange.start || filters.dateRange.end) && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
              Date Range
            </span>
          )}
          
          {(filters.sizeRange.min > 0 || filters.sizeRange.max > 0) && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
              Size Range
            </span>
          )}
        </div>
      )}
    </div>
  );
};