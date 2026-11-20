# 🌾 ស្រែមាន - ចុះចំការ (Sremeas Field Marketing & Farm Visit Tracker)

កម្មវិធីកត់ត្រាការចុះទីផ្សារ និងពិនិត្យចំការរបស់ភ្ញៀវ ស្រែមាន លើទូរស័ព្ទដៃ និងកុំព្យូទ័រ (Mobile-First Web App)។

---

## 📱 មុខងារសំខាន់ៗ (Features)
1. **📍 ចាប់យកទីតាំង GPS ស្វ័យប្រវត្ត៖** ចុចតែមួយប៊ូតុង ចាប់យក Lat/Long នៃចំការជាក់ស្តែង និងមាន Link បើកមើលលើ Google Maps ដោយផ្ទាល់។
2. **📸 ថតរូប និង Upload ចូល Supabase Storage៖** អាចថតរូបភាពដំណាំ ឬថតជាមួយម្ចាស់ចំការ ហើយ Upload ផ្ទុកក្នុង Cloud ស្វ័យប្រវត្ត។
3. **🌱 កត់ត្រាព័ត៌មានលម្អិតនៃចំការ៖**
   * ប្រភេទដំណាំ (ស្វាយចន្ទី, ស្រូវ, ទុរេន, ដំឡូងមី...)
   * ទំហំផ្ទៃដី (ហិកតា)
   * ស្ថានភាពដំណាំ (ល្អ 🌿, មធ្យម ⚠️, មានបញ្ហា/ជំងឺ 🚨)
   * បញ្ហាប្រឈមដែលបានជួបប្រទះ (សត្វល្អិត, ផ្សិត...)
   * ផលិតផលដែលបានណែនាំ ឬលក់ជូន
   * កាលបរិច្ឆេទណាត់ជួបលើកក្រោយ
4. **🗺️ ផែនទីចំការ (Interactive Map View)៖** បង្ហាញ Pin ទីតាំងចំការទាំងអស់លើផែនទី Leaflet / OpenStreetMap។
5. **👥 បញ្ជីអតិថិជន/ម្ចាស់ចំការ៖** ស្វែងរកតាមឈ្មោះ ឬលេខទូរស័ព្ទ និងអាចចុចខលចេញបានភ្លាមៗ។
6. **📱 Mobile-First & Home Screen Shortcut៖** បុគ្គលិកអាចចុច "Add to Home Screen" លើទូរស័ព្ទ ដើម្បីប្រើប្រាស់ដូច App ទូទៅ។

---

## 🚀 របៀបដំណើរការ (How to Run)

បើក Terminal ក្នុងថត `d:\React\sremeas-field`៖

```bash
# ១. ដំណើរការ Local Dev Server
npm run dev
```

បន្ទាប់មកបើក Browser ចូលទៅកាន់ `http://localhost:5173/`។

---

## 📦 ការ Build សម្រាប់ Production
```bash
npm run build
```

---

## ⚙️ ការកំណត់ Supabase
ឯកសារភ្ជាប់ Supabase ស្ថិតនៅត្រង់ `src/supabase.js`៖
* **Project URL:** `https://ousdmycglvhneougezet.supabase.co`
* **Storage Bucket:** `visit-photos`

---

© 2026 Sremeas Field. All rights reserved.
