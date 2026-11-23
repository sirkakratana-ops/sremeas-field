import React from 'react';
import { Sprout, Plus, Trash2 } from 'lucide-react';
import { CROP_SUGGESTIONS, VARIETY_SUGGESTIONS } from '../staffUtils';

export default function CropsEditor({ crops = [], onChange, title = "ដំណាំក្នុងចំការ" }) {
  
  const handleAddCrop = () => {
    const newCrop = {
      id: 'crop-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      crop_type: 'ស្វាយចន្ទី',
      variety: '',
      farm_size_ha: '',
      plant_count: '',
      crop_age: ''
    };
    onChange([...crops, newCrop]);
  };

  const handleUpdateCrop = (index, field, value) => {
    const updated = crops.map((c, i) => {
      if (i !== index) return c;
      const updatedCrop = { ...c, [field]: value };
      // If crop type changes and no variety set, could suggest varieties
      return updatedCrop;
    });
    onChange(updated);
  };

  const handleRemoveCrop = (index) => {
    const updated = crops.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Summaries
  const totalHa = crops.reduce((sum, c) => sum + (parseFloat(c.farm_size_ha) || 0), 0);
  const totalPlants = crops.reduce((sum, c) => sum + (parseInt(c.plant_count, 10) || 0), 0);

  return (
    <div className="p-3.5 sm:p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm sm:text-xs">
          <Sprout size={16} className="text-emerald-600 sm:w-3.5 sm:h-3.5" />
          <span>{title}</span>
          <span className="text-xs sm:text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
            {crops.length} មុខ
          </span>
          {totalHa > 0 && (
            <span className="text-xs sm:text-[10px] text-slate-500 font-normal">
              (សរុប៖ <b>{totalHa.toFixed(1)} ហ.ត</b> {totalPlants > 0 ? `| ${totalPlants.toLocaleString()} ដើម` : ''})
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddCrop}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 sm:px-2.5 sm:py-1 rounded-xl text-xs sm:text-[11px] flex items-center gap-1.5 transition-colors shadow-2xs min-h-[38px] sm:min-h-[30px]"
        >
          <Plus size={14} />
          <span>+ ថែមដំណាំ</span>
        </button>
      </div>

      {/* Crops List */}
      {crops.length === 0 ? (
        <div className="text-center py-5 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm sm:text-xs space-y-1">
          <p>មិនទាន់មានដំណាំត្រូវបានបញ្ចូលនៅឡើយ</p>
          <button
            type="button"
            onClick={handleAddCrop}
            className="text-emerald-700 hover:underline font-bold text-sm sm:text-xs mt-1 inline-flex items-center gap-1 py-1"
          >
            <Plus size={14} />
            <span>ចុចត្រង់នេះដើម្បីបញ្ចូលដំណាំដំបូង</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {crops.map((crop, idx) => {
            const varieties = VARIETY_SUGGESTIONS[crop.crop_type] || [];

            return (
              <div 
                key={crop.id || idx} 
                className="bg-white p-3.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 relative group"
              >
                {/* Row Header: Number and Delete */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-xs sm:text-[11px] text-slate-700 flex items-center gap-1.5">
                    <span className="w-6 h-6 sm:w-5 sm:h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs sm:text-[10px] font-mono font-bold">
                      {idx + 1}
                    </span>
                    <span>ដំណាំទី {idx + 1}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRemoveCrop(idx)}
                    title="លុបដំណាំនេះចេញ"
                    className="p-1.5 sm:p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Crop Type & Variety */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs sm:text-[10px] text-slate-600 font-bold block mb-1">
                      ប្រភេទដំណាំ *
                    </label>
                    <input
                      type="text"
                      list={`crops-list-${idx}`}
                      value={crop.crop_type || ''}
                      onChange={e => handleUpdateCrop(idx, 'crop_type', e.target.value)}
                      placeholder="ជ្រើសរើស ឬវាយ..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold min-h-[42px] sm:min-h-[36px]"
                    />
                    <datalist id={`crops-list-${idx}`}>
                      {CROP_SUGGESTIONS.map((c, i) => (
                        <option key={i} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-xs sm:text-[10px] text-slate-600 font-bold block mb-1">
                      ពូជ (Variety)
                    </label>
                    <input
                      type="text"
                      list={`variety-list-${idx}`}
                      value={crop.variety || ''}
                      onChange={e => handleUpdateCrop(idx, 'variety', e.target.value)}
                      placeholder="ឧ. M23, ម៉ាឡេ..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px] sm:min-h-[36px]"
                    />
                    {varieties.length > 0 && (
                      <datalist id={`variety-list-${idx}`}>
                        {varieties.map((v, i) => (
                          <option key={i} value={v} />
                        ))}
                      </datalist>
                    )}
                  </div>
                </div>

                {/* Area, Tree Count, Age */}
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  <div>
                    <label className="text-xs sm:text-[10px] text-slate-600 font-bold block mb-1">
                      ផ្ទៃដី (ហ.ត)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={crop.farm_size_ha ?? ''}
                      onChange={e => handleUpdateCrop(idx, 'farm_size_ha', e.target.value)}
                      placeholder="ឧ. 3.5"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 sm:px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px] sm:min-h-[36px]"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-[10px] text-slate-600 font-bold block mb-1">
                      ចំនួនដើម
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={crop.plant_count ?? ''}
                      onChange={e => handleUpdateCrop(idx, 'plant_count', e.target.value)}
                      placeholder="ឧ. 500"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 sm:px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px] sm:min-h-[36px]"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-[10px] text-slate-600 font-bold block mb-1">
                      អាយុដំណាំ
                    </label>
                    <input
                      type="text"
                      value={crop.crop_age || ''}
                      onChange={e => handleUpdateCrop(idx, 'crop_age', e.target.value)}
                      placeholder="ឧ. 3 ឆ្នាំ"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 sm:px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px] sm:min-h-[36px]"
                    />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
