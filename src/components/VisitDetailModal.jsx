import React from 'react';
import { 
  X, MapPin, Calendar, User, Sprout, AlertTriangle, 
  PackageCheck, FileText, Phone, ExternalLink, Image,
  Building, Users, UserCheck
} from 'lucide-react';
import { parseCrops } from '../staffUtils';

export default function VisitDetailModal({ visit, onClose }) {
  if (!visit) return null;

  const crops = parseCrops(visit.crops, visit.crop_type, visit.farm_size_ha);
  const totalHa = crops.reduce((s, c) => s + (parseFloat(c.farm_size_ha) || 0), 0) || visit.farm_size_ha || 0;
  const totalPlants = crops.reduce((s, c) => s + (parseInt(c.plant_count, 10) || 0), 0);

  // Parse team members
  let teamMembers = [];
  if (Array.isArray(visit.team_members)) {
    teamMembers = visit.team_members;
  } else if (typeof visit.team_members === 'string') {
    try {
      const parsed = JSON.parse(visit.team_members);
      if (Array.isArray(parsed)) teamMembers = parsed;
      else teamMembers = visit.team_members.split(',').map(s => s.trim()).filter(Boolean);
    } catch {
      teamMembers = visit.team_members.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg my-8 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <FileText size={16} className="text-emerald-400" />
              <span>ព័ត៌មានលម្អិតនៃការចុះចំការ</span>
            </h3>
            <p className="text-[11px] text-slate-300 font-mono mt-0.5">
              កាលបរិច្ឆេទ៖ {new Date(visit.visit_date).toLocaleDateString('km-KH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4 text-xs">
          
          {/* Staff & Customer info */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 text-[10px] font-bold block uppercase">បុគ្គលិកចុះផ្ទាល់</span>
              <span className="font-bold text-slate-800 flex items-center gap-1 text-sm mt-0.5">
                <User size={14} className="text-emerald-600" /> {visit.staff_name}
              </span>
              {visit.branch && (
                <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-1 font-medium">
                  <Building size={11} className="text-slate-400 shrink-0" />
                  <span>សាខា៖ <b>{visit.branch}</b></span>
                </div>
              )}
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-bold block uppercase">ម្ចាស់ចំការ</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block truncate">
                {visit.customers?.name || 'មិនស្គាល់'}
              </span>
              {visit.customers?.phone && (
                <a href={`tel:${visit.customers.phone}`} className="text-emerald-700 text-[11px] font-mono hover:underline flex items-center gap-1 mt-0.5">
                  <Phone size={10} />
                  <span>{visit.customers.phone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Team Members if any */}
          {teamMembers.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-slate-500 font-bold flex items-center gap-1 text-[11px]">
                <Users size={13} className="text-emerald-600" />
                <span>ក្រុមការងារចុះជាមួយ ({teamMembers.length} នាក់)៖</span>
              </span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {teamMembers.map((m, idx) => (
                  <span 
                    key={idx} 
                    className="bg-white border border-slate-200 text-slate-800 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                  >
                    <UserCheck size={11} className="text-emerald-600" />
                    <span>{m}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Location & GPS */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <MapPin size={14} className="text-rose-500" /> ទីតាំងចំការ
              </span>
              {visit.latitude && visit.longitude && (
                <a 
                  href={`https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                >
                  <span>បើក Google Maps</span>
                  <ExternalLink size={9} />
                </a>
              )}
            </div>
            <p className="text-slate-600">{visit.location_address || visit.customers?.village || 'មិនបានបញ្ជាក់'}</p>
            {visit.latitude && visit.longitude && (
              <p className="text-slate-400 font-mono text-[10px]">
                កូអរដោនេ: {visit.latitude.toFixed(6)}, {visit.longitude.toFixed(6)}
              </p>
            )}
          </div>

          {/* Crop Info: Multi-crop breakdown */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
              <span className="font-bold text-slate-800 flex items-center gap-1 text-xs">
                <Sprout size={14} className="text-emerald-600" />
                <span>ព័ត៌មានដំណាំក្នុងចំការ ({crops.length} មុខ)</span>
              </span>

              <div className="flex items-center gap-2">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  visit.crop_status === 'ល្អ' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : visit.crop_status === 'មធ្យម'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  ស្ថានភាព៖ {visit.crop_status || '—'}
                </span>
              </div>
            </div>

            {crops.length > 0 ? (
              <div className="space-y-2">
                {crops.map((c, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1 text-xs">
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[9px] flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span>{c.crop_type}</span>
                        {c.variety && (
                          <span className="text-[11px] text-slate-500 font-normal">
                            (ពូជ: <b>{c.variety}</b>)
                          </span>
                        )}
                      </span>

                      {c.farm_size_ha && (
                        <span className="font-mono text-emerald-700 font-bold text-xs">
                          {c.farm_size_ha} ហិកតា
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 pt-0.5">
                      {c.plant_count && (
                        <span>ចំនួនដើម៖ <b className="text-slate-700">{parseInt(c.plant_count, 10).toLocaleString()} ដើម</b></span>
                      )}
                      {c.crop_age && (
                        <span>• អាយុដំណាំ៖ <b className="text-slate-700">{c.crop_age}</b></span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-slate-600 font-bold border-t border-slate-200">
                  <span>ផ្ទៃដីសរុប៖ {totalHa ? `${Number(totalHa).toFixed(1)} ហិកតា` : '—'}</span>
                  {totalPlants > 0 && <span>ចំនួនដើមសរុប៖ {totalPlants.toLocaleString()} ដើម</span>}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-2">មិនមានព័ត៌មានដំណាំលម្អិត</p>
            )}
          </div>

          {/* Issues & Recommendations */}
          {(visit.issues_identified || visit.products_recommended) && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              {visit.issues_identified && (
                <div>
                  <span className="text-slate-500 font-bold flex items-center gap-1 text-[11px]">
                    <AlertTriangle size={12} className="text-amber-500" /> បញ្ហាដែលបានជួបប្រទះ៖
                  </span>
                  <p className="text-slate-800 mt-0.5 pl-4">{visit.issues_identified}</p>
                </div>
              )}
              {visit.products_recommended && (
                <div>
                  <span className="text-slate-500 font-bold flex items-center gap-1 text-[11px]">
                    <PackageCheck size={12} className="text-emerald-600" /> ផលិតផលដែលបានណែនាំ/លក់៖
                  </span>
                  <p className="text-slate-800 mt-0.5 pl-4">{visit.products_recommended}</p>
                </div>
              )}
            </div>
          )}

          {/* Follow-up date & notes */}
          {visit.follow_up_date && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
              <Calendar size={14} />
              <span>កាលបរិច្ឆេទត្រូវចុះតាមដានម្តងទៀត៖ <strong>{new Date(visit.follow_up_date).toLocaleDateString('km-KH')}</strong></span>
            </div>
          )}

          {visit.notes && (
            <div>
              <span className="font-bold text-slate-600 flex items-center gap-1 mb-1">
                <FileText size={12} /> ចំណាំបន្ថែម៖
              </span>
              <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-wrap">{visit.notes}</p>
            </div>
          )}

          {/* Photos Gallery */}
          {visit.photos && visit.photos.length > 0 && (
            <div>
              <span className="font-bold text-slate-700 flex items-center gap-1 mb-2">
                <Image size={14} className="text-slate-500" />
                <span>រូបភាពជាក់ស្តែង ({visit.photos.length} សន្លឹក)</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                {visit.photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-slate-200 aspect-video group">
                    <img src={url} alt={`Visit photo ${i+1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
