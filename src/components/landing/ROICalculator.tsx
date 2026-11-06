"use client";

import { useState } from "react";
import { Users, Clock, DollarSign, Activity } from "lucide-react";

export default function ROICalculator() {
  const [patients, setPatients] = useState<number>(300);
  const [doctors, setDoctors] = useState<number>(3);

  // Example Math:
  // Each patient saves 10 mins of admin work
  const minutesSavedPerPatient = 10;
  const hoursSaved = Math.round((patients * minutesSavedPerPatient) / 60);
  
  // Assume average hour of staff/doctor time is worth 100 EGP/SAR/AED (just a placeholder currency value)
  const hourlyRate = 150; 
  const moneySaved = hoursSaved * hourlyRate;

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 -right-32 w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-50/50 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-black text-slate-900 sm:text-4xl flex items-center justify-center gap-3">
            <Activity className="w-8 h-8 text-indigo-600 mb-2" />
            احسب عائد الاستثمار (ROI)
          </h2>
          <p className="mt-4 text-lg text-slate-600 font-medium">
            اكتشف كم من الوقت والمال يمكنك توفيره شهرياً عند استخدام Prime Physio بدلاً من الطرق التقليدية.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2">
            
            {/* Input Controls */}
            <div className="p-8 lg:p-10 bg-slate-50/50 border-b md:border-b-0 md:border-l border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 mb-8">تفاصيل عيادتك</h3>
              
              <div className="space-y-8">
                {/* Patients Slider */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="font-semibold text-slate-700 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-500" />
                      عدد المرضى شهرياً
                    </label>
                    <span className="text-xl font-black text-indigo-600 bg-indigo-100 px-3 py-1 rounded-lg">
                      {patients} مريض
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="2000"
                    step="50"
                    value={patients}
                    onChange={(e) => setPatients(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                    <span>50</span>
                    <span>2000+</span>
                  </div>
                </div>

                {/* Doctors Slider */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="font-semibold text-slate-700 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-500" />
                      عدد الأطباء
                    </label>
                    <span className="text-xl font-black text-indigo-600 bg-indigo-100 px-3 py-1 rounded-lg">
                      {doctors} أطباء
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={doctors}
                    onChange={(e) => setDoctors(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                    <span>1</span>
                    <span>30+</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Output */}
            <div className="p-8 lg:p-10 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-white">
              <h3 className="text-xl font-bold text-white/90 mb-8">التوفير المقدر شهرياً</h3>
              
              <div className="space-y-6">
                <div key={hoursSaved} data-csp-motion="reveal" className="bg-white/10 rounded-2xl p-6 border border-white/20 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-white/80 font-medium">الوقت الموفر</div>
                  </div>
                  <div className="text-4xl font-black tracking-tight mt-2">
                    {hoursSaved} <span className="text-xl font-medium text-white/70">ساعة عمل</span>
                  </div>
                </div>

                <div key={moneySaved} data-csp-motion="reveal" className="bg-white/10 rounded-2xl p-6 border border-white/20 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-white/80 font-medium">التكلفة الموفرة (تقريبياً)</div>
                  </div>
                  <div className="text-4xl font-black tracking-tight mt-2">
                    {moneySaved.toLocaleString()} <span className="text-xl font-medium text-white/70">ج.م / ريال</span>
                  </div>
                </div>
                
                <p className="text-sm text-white/60 text-center mt-6">
                  * هذا الحساب تقريبي ويعتمد على تقليل الأعمال الإدارية اليدوية وتوفير وقت الطاقم الطبي.
                </p>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </section>
  );
}
