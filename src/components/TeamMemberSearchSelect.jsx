import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, UserCheck, User, X, Plus, Check, ChevronDown, Building, Users } from 'lucide-react';
import { getStaffPhotoUrl } from '../staffUtils';

export default function TeamMemberSearchSelect({
  staffMembers = [],
  currentStaffName = '',
  selectedMembers = [],
  onToggleMember,
  onRemoveMember,
  onAddCustomMember
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter available colleagues (exclude current reporter)
  const availableColleagues = useMemo(() => {
    const normCurrent = (currentStaffName || '').trim().toLowerCase();
    return staffMembers.filter(s => (s.name || '').trim().toLowerCase() !== normCurrent);
  }, [staffMembers, currentStaffName]);

  // Filtered colleagues based on search query (name, branch or role)
  const filteredColleagues = useMemo(() => {
    if (!searchTerm.trim()) {
      return availableColleagues;
    }
    const q = searchTerm.trim().toLowerCase();
    return availableColleagues.filter(s => {
      const name = (s.name || '').toLowerCase();
      const branch = (s.branch || '').toLowerCase();
      const role = (s.role || '').toLowerCase();
      return name.includes(q) || branch.includes(q) || role.includes(q);
    });
  }, [availableColleagues, searchTerm]);

  // Check if search term is an exact match for an existing staff member
  const hasExactMatch = useMemo(() => {
    if (!searchTerm.trim()) return false;
    const q = searchTerm.trim().toLowerCase();
    return availableColleagues.some(s => (s.name || '').trim().toLowerCase() === q);
  }, [availableColleagues, searchTerm]);

  // Handle adding custom / unregistered member
  const handleAddCustom = (nameToAdd = searchTerm) => {
    const cleanName = (nameToAdd || '').trim();
    if (!cleanName) return;
    if (onAddCustomMember) {
      onAddCustomMember(cleanName);
    } else if (onToggleMember && !selectedMembers.includes(cleanName)) {
      onToggleMember(cleanName);
    }
    setSearchTerm('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredColleagues.length === 1 && !hasExactMatch) {
        onToggleMember(filteredColleagues[0].name);
        setSearchTerm('');
      } else if (searchTerm.trim()) {
        const match = availableColleagues.find(s => s.name.toLowerCase() === searchTerm.trim().toLowerCase());
        if (match) {
          onToggleMember(match.name);
          setSearchTerm('');
        } else {
          handleAddCustom(searchTerm);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-2.5" ref={containerRef}>
      {/* Header Label with Count */}
      <div className="flex items-center justify-between text-sm sm:text-xs">
        <label className="font-bold text-slate-700 flex items-center gap-1.5">
          <Users size={14} className="text-emerald-600" />
          <span>ក្រុមការងារចុះជាមួយ (អ្នកដែលបានទៅជាមួយ)</span>
        </label>
        {selectedMembers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
              ជ្រើសរើស {selectedMembers.length} នាក់
            </span>
          </div>
        )}
      </div>

      {/* Selected Members Badges */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedMembers.map((member, idx) => (
            <span 
              key={idx} 
              className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
            >
              <UserCheck size={12} className="text-emerald-600 shrink-0" />
              <span>{member}</span>
              <button 
                type="button" 
                onClick={() => onRemoveMember ? onRemoveMember(member) : onToggleMember(member)}
                className="hover:text-rose-600 hover:bg-emerald-100/60 p-0.5 rounded-full transition-colors ml-0.5 cursor-pointer"
                title="ដកចេញ"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search Input Box with Dropdown Toggle */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="ស្វែងរកឈ្មោះបុគ្គលិក ឬសាខា... (ចុចដើម្បីជ្រើសរើស)"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-16 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium min-h-[44px] sm:min-h-[38px] shadow-2xs"
          />
          <div className="absolute right-2 flex items-center gap-1">
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                title="សម្អាត"
              >
                <X size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              title={isOpen ? "បិទ" : "បើកបញ្ជី"}
            >
              <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
            {/* Quick add custom member if typed text doesn't match existing staff */}
            {searchTerm.trim() && !hasExactMatch && (
              <button
                type="button"
                onClick={() => handleAddCustom()}
                className="w-full px-3.5 py-2.5 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 font-bold flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Plus size={14} className="text-emerald-600 shrink-0" />
                  <span className="truncate">+ បន្ថែម «{searchTerm.trim()}» ជាអ្នករួមដំណើរថ្មី</span>
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono shrink-0">
                  Enter ↵
                </span>
              </button>
            )}

            {filteredColleagues.length > 0 ? (
              <div className="p-1 space-y-0.5">
                {filteredColleagues.map((staff) => {
                  const isSelected = selectedMembers.includes(staff.name);
                  return (
                    <button
                      key={staff.id || staff.name}
                      type="button"
                      onClick={() => onToggleMember(staff.name)}
                      className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/80' 
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getStaffPhotoUrl(staff) ? (
                          <img 
                            src={getStaffPhotoUrl(staff)} 
                            alt={staff.name} 
                            className="w-5 h-5 rounded-md object-cover aspect-square shrink-0 border border-slate-200" 
                          />
                        ) : (
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {isSelected ? <Check size={12} /> : <User size={12} />}
                          </div>
                        )}
                        <span className="truncate">{staff.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {staff.branch && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-normal">
                            <Building size={10} className="text-slate-400" />
                            <span>{staff.branch}</span>
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] text-emerald-700 font-bold">
                            បានជ្រើសរើស
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              !searchTerm.trim() ? (
                <div className="p-4 text-center text-slate-400">
                  មិនមានបុគ្គលិកក្នុងបញ្ជី
                </div>
              ) : (
                <div className="p-3 text-center text-slate-500">
                  រកមិនឃើញបុគ្គលិកឈ្មោះ «<span className="font-bold text-slate-700">{searchTerm}</span>» ទេ
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
