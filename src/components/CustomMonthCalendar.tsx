"use client";

import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/lib/LanguageContext";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  patientName: string;
  patientId: string;
  doctor: string;
  visitType: string;
  status: string;
}

interface CustomMonthCalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onSelectSlot: (date: Date) => void;
  onSelectEvent: (event: any) => void;
  selectable: boolean;
}

const VISIT_COLOR_CLASSES: Record<string, string> = {
  "جلسة علاج": "bg-[#119094]",
  "كشف أول": "bg-violet-600",
  "متابعة": "bg-cyan-600",
  "تقييم": "bg-amber-600",
};

const STATUS_STYLES: Record<string, string> = {
  "مؤكد": "bg-emerald-500",
  "انتظار": "bg-amber-500",
  "منتهي": "bg-slate-400",
  "ملغي": "bg-red-400",
};

const DAY_NAMES_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CustomMonthCalendar({
  events,
  currentDate,
  onDateChange,
  onSelectSlot,
  onSelectEvent,
  selectable,
}: CustomMonthCalendarProps) {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    const w: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      w.push(days.slice(i, i + 7));
    }
    return w;
  }, [currentDate]);

  const monthLabel = format(currentDate, "yyyy MMMM", { locale: ar });
  const dayNames = isRtl ? DAY_NAMES_AR : DAY_NAMES_EN;

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      const key = format(ev.start, "yyyy-MM-dd");
      const existing = map.get(key) || [];
      existing.push(ev);
      map.set(key, existing);
    });
    return map;
  }, [events]);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200/60">
      {/* header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
        <button
          onClick={() => onDateChange(subMonths(currentDate, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <svg width="1.2em" height="1.2em" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d={isRtl
              ? "M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM7.646 11.354a.5.5 0 0 1 0-.708L10.293 8 7.646 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0zM4.5 8a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5z"
              : "M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM8.354 11.354a.5.5 0 0 0 0-.708L5.707 8l2.647-2.646a.5.5 0 1 0-.708-.708l-3 3a.5.5 0 0 0 0 .708l3 3a.5.5 0 0 0 .708 0zM11.5 8a.5.5 0 0 0-.5-.5H6a.5.5 0 0 0 0 1h5a.5.5 0 0 0 .5-.5z"
            } />
          </svg>
        </button>
        <span className="text-lg font-bold text-gray-800">{monthLabel}</span>
        <button
          onClick={() => onDateChange(addMonths(currentDate, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <svg width="1.2em" height="1.2em" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d={isRtl
              ? "M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM8.354 11.354a.5.5 0 0 0 0-.708L5.707 8l2.647-2.646a.5.5 0 1 0-.708-.708l-3 3a.5.5 0 0 0 0 .708l3 3a.5.5 0 0 0 .708 0zM11.5 8a.5.5 0 0 0-.5-.5H6a.5.5 0 0 0 0 1h5a.5.5 0 0 0 .5-.5z"
              : "M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM7.646 11.354a.5.5 0 0 1 0-.708L10.293 8 7.646 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0zM4.5 8a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5z"
            } />
          </svg>
        </button>
      </div>

      {/* day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {dayNames.map((name) => (
          <div
            key={name}
            className="p-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-l last:border-l-0 border-gray-200 bg-gray-50/50"
          >
            <span className="sm:block">{name}</span>
          </div>
        ))}
      </div>

      {/* weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
          {week.map((day, di) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(key) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const isPrevMonth = day < startOfMonth(currentDate);
            const isNextMonth = day > endOfMonth(currentDate);
            const isNextMonthDay = !isCurrentMonth;

            return (
              <div
                key={di}
                onClick={() => {
                  if (selectable) onSelectSlot(day);
                }}
                className={`min-h-[100px] border-l last:border-l-0 border-gray-200 p-1 transition-colors cursor-pointer
                  ${isToday ? "bg-blue-50/50" : isNextMonthDay ? "bg-gray-50/50" : "bg-white"}
                  hover:bg-gray-100`}
              >
                <div className={`text-xs font-semibold mb-0.5 px-1 py-0.5 rounded inline-block
                  ${isToday ? "bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full" : ""}
                  ${!isCurrentMonth ? "text-gray-400" : "text-gray-700"}`}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const eventColorClass = ev.status === "ملغي" ? "bg-slate-400 opacity-60" : (VISIT_COLOR_CLASSES[ev.visitType] || "bg-[#119094]");
                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); onSelectEvent(ev); }}
                        className={`text-xs text-white rounded px-1.5 py-0.5 truncate leading-tight shadow-sm hover:shadow-md transition-shadow font-medium ${eventColorClass}`}
                      >
                        {ev.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 font-semibold px-1">
                      +{dayEvents.length - 3} {isRtl ? "المزيد" : "more"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
