"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2, History, Search, Filter } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  details: unknown;
  created_at: string;
  user_email: string;
  user_name: string;
  clinic_name: string;
}

function formatAuditDetails(details: unknown): string {
  if (typeof details === "string") return details;
  if (details == null) return "";
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

export default function PlatformAuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user?.roleKey === "platform_admin") {
      loadLogs();
    }
  }, [user]);

  const loadLogs = async () => {
    try {
      const res = await fetch("/api/admin/audit-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (!user || user.roleKey !== "platform_admin") return null;

  const filteredLogs = logs.filter(log => 
    log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    formatAuditDetails(log.details).toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <History className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-800">سجل النشاط (Audit Logs)</h1>
          <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">آخر {logs.length} عملية</span>
        </div>
        
        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث في السجلات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-32 text-slate-500">
            <Filter className="w-12 h-12 mb-4 text-slate-300" />
            <p>لا توجد سجلات مطابقة للبحث</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">التاريخ والوقت</th>
                  <th className="px-6 py-4 font-semibold">المستخدم</th>
                  <th className="px-6 py-4 font-semibold">العيادة</th>
                  <th className="px-6 py-4 font-semibold">الحدث (Action)</th>
                  <th className="px-6 py-4 font-semibold">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap" dir="ltr" style={{ textAlign: 'right' }}>
                      {new Date(log.created_at).toLocaleString("ar-EG")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{log.user_name || log.user_email?.split('@')[0]}</div>
                      <div className="text-xs text-slate-500">{log.user_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">
                        {log.clinic_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${
                        log.action.includes('DELETE') ? 'bg-red-50 text-red-600' :
                        log.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-600' :
                        log.action.includes('UPDATE') ? 'bg-blue-50 text-blue-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-md truncate">
                      {formatAuditDetails(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
