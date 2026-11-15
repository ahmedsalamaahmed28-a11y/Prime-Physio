"use client";

import { useMemo, useState } from "react";
import {
  addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay,
  isSameMonth, startOfMonth, startOfWeek, subDays, subMonths
} from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, Filter, Search,
  Users, User, Check, Calendar, Building, Sparkles
} from "lucide-react";
import CustomMonthCalendar from "@/components/CustomMonthCalendar";
import { useLanguage } from "@/lib/LanguageContext";

type ViewMode = "day" | "week" | "month" | "resource";

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
  roomId?: string;
  roomName?: string;
  isGroupSession?: boolean;
  groupParticipantNames?: string[];
}

interface Props {
  events: CalendarEvent[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onSelectSlot: (date: Date) => void;
  onSelectEvent: (event: any) => void;
  selectable: boolean;
  doctorsList: { name: string }[];
  roomsList: { id: string; name: string; branch_id?: string | null }[];
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
const DAYS_AR = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const DAYS_EN = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];

const typeColors: Record<string, string> = {
  "جلسة علاج": "border-r-[#4F46BA] bg-indigo-50 text-indigo-950",
  "كشف أول": "border-r-violet-500 bg-violet-50 text-violet-950",
  "متابعة": "border-r-cyan-500 bg-cyan-50 text-cyan-950",
  "تقييم": "border-r-amber-500 bg-amber-50 text-amber-950",
  "جلسة جماعية": "border-r-fuchsia-500 bg-fuchsia-50 text-fuchsia-950",
};

const statusLabels: Record<string, { ar: string; en: string; dot: string }> = {
  "مؤكد": { ar: "مؤكد", en: "Confirmed", dot: "bg-emerald-500" },
  "انتظار": { ar: "انتظار", en: "Waiting", dot: "bg-amber-500" },
  "منتهي": { ar: "مكتمل", en: "Completed", dot: "bg-slate-400" },
  "ملغي": { ar: "ملغي", en: "Cancelled", dot: "bg-rose-500" },
};

function EventCard({ event, isRtl, onClick }: { event: CalendarEvent; isRtl: boolean; onClick: () => void }) {
  const colors = typeColors[event.visitType] || typeColors["جلسة علاج"];
  const status = statusLabels[event.status] || statusLabels["مؤكد"];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-lg border border-r-[3px] px-2 py-1.5 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 ${colors} ${isRtl ? "text-right" : "text-left"}`}
      title={event.title}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="min-w-0 truncate text-[11px] font-bold">{event.patientName || event.title}</span>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} />
      </div>
      <div className="mt-1 flex items-center gap-1 text-[10px] opacity-75">
        <Clock className="h-3 w-3 shrink-0" />
        <span>{format(event.start, "h:mm a")}</span>
        <span className="truncate">· {event.doctor || (isRtl ? "غير محدد" : "Unassigned")}</span>
      </div>
      {event.roomName && <div className="mt-0.5 truncate text-[10px] opacity-70">{event.roomName}</div>}
    </button>
  );
}

export default function AppointmentsCalendarView({
  events, currentDate, onDateChange, onSelectSlot, onSelectEvent, selectable, doctorsList, roomsList
}: Props) {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [view, setView] = useState<ViewMode>("week");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [search, setSearch] = useState("");
  const locale = isRtl ? ar : enUS;

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 6 });
  const weekEnd = addDays(weekStart, 5);
  const weekDays = Array.from({ length: 6 }, (_, index) => addDays(weekStart, index));
  const filteredEvents = useMemo(() => events.filter((event) => {
    const matchesDoctor = doctorFilter === "all" || event.doctor === doctorFilter;
    const matchesType = typeFilter === "all" || event.visitType === typeFilter;
    const matchesRoom = roomFilter === "all" || event.roomId === roomFilter;
    const needle = search.trim().toLocaleLowerCase();
    const matchesSearch = !needle || [event.patientName, event.title, event.doctor, event.roomName, event.patientId]
      .some((value) => String(value || "").toLocaleLowerCase().includes(needle));
    return matchesDoctor && matchesType && matchesRoom && matchesSearch;
  }), [events, doctorFilter, typeFilter, roomFilter, search]);

  const todayEvents = events.filter((event) => isSameDay(event.start, new Date()));
  const pendingEvents = events.filter((event) => event.status === "انتظار");
  const upcomingEvents = events.filter((event) => event.start >= new Date() && event.status !== "ملغي")
    .sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, 4);
  const monthGridStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 6 });
  const monthGridEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 6 });
  const miniDays: Date[] = [];
  for (let cursor = monthGridStart; cursor <= monthGridEnd; cursor = addDays(cursor, 1)) miniDays.push(cursor);

  const title = view === "day"
    ? format(currentDate, "EEEE, d MMMM yyyy", { locale })
    : view === "month"
      ? format(currentDate, "MMMM yyyy", { locale })
      : `${format(weekStart, "d MMM", { locale })} – ${format(weekEnd, "d MMM yyyy", { locale })}`;

  const moveDate = (direction: number) => {
    if (view === "month") onDateChange(direction > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else onDateChange(direction > 0 ? addDays(currentDate, view === "day" ? 1 : 7) : subDays(currentDate, view === "day" ? 1 : 7));
  };

  const dayList = view === "day" ? [currentDate] : weekDays;
  const visibleEvents = filteredEvents.filter((event) => {
    if (view === "day") return isSameDay(event.start, currentDate);
    return event.start >= weekStart && event.start <= weekEnd;
  });

  const weekDayLabel = (day: Date, index: number) => (
    <div className={`min-w-0 border-b border-slate-100 px-2 py-3 text-center ${isSameDay(day, new Date()) ? "bg-indigo-50/70" : "bg-white"}`}>
      <div className="text-[11px] font-semibold text-slate-500">{isRtl ? DAYS_AR[index] : DAYS_EN[index]}</div>
      <div className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${isSameDay(day, new Date()) ? "bg-[#4F46BA] text-white" : "text-slate-800"}`}>{format(day, "d")}</div>
      <div className="mt-1 text-[10px] text-slate-400">{visibleEvents.filter((event) => isSameDay(event.start, day)).length} {isRtl ? "موعد" : "events"}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: isRtl ? "مواعيد اليوم" : "Today's appointments", value: todayEvents.length, icon: Calendar, tone: "bg-indigo-50 text-indigo-700" },
          { label: isRtl ? "المواعيد القادمة" : "Upcoming", value: events.filter((event) => event.start >= new Date() && event.status !== "ملغي").length, icon: Calendar, tone: "bg-cyan-50 text-cyan-700" },
          { label: isRtl ? "قائمة الانتظار" : "Waiting list", value: pendingEvents.length, icon: Clock, tone: "bg-amber-50 text-amber-700" },
          { label: isRtl ? "المكتملة" : "Completed", value: events.filter((event) => event.status === "منتهي").length, icon: Check, tone: "bg-emerald-50 text-emerald-700" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{stat.value}</p>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.tone}`}><Icon className="h-5 w-5" /></span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-4 border-b border-slate-100 p-4 sm:p-5">
            <div className={`flex flex-wrap items-center justify-between gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
                  <CalendarDays className="h-4 w-4" /> {isRtl ? "جدول المواعيد" : "Appointment schedule"}
                </div>
                <h2 className="mt-1 text-lg font-bold text-slate-900">{title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onDateChange(new Date())} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">{isRtl ? "اليوم" : "Today"}</button>
                <button type="button" onClick={() => moveDate(-1)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label={isRtl ? "السابق" : "Previous"}><ChevronRight className="h-4 w-4" /></button>
                <button type="button" onClick={() => moveDate(1)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label={isRtl ? "التالي" : "Next"}><ChevronLeft className="h-4 w-4" /></button>
              </div>
            </div>

            <div className={`flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${isRtl ? "" : "md:flex-row-reverse"}`}>
              <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1">
                {([
                  ["day", isRtl ? "يومي" : "Day"],
                  ["week", isRtl ? "أسبوعي" : "Week"],
                  ["month", isRtl ? "شهري" : "Month"],
                  ["resource", isRtl ? "الغرف" : "Rooms"],
                ] as [ViewMode, string][]).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setView(key)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${view === key ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>
                ))}
              </div>
              <div className="relative min-w-0 flex-1 md:max-w-xs">
                <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${isRtl ? "right-3" : "left-3"}`} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isRtl ? "ابحث باسم المريض أو المعالج..." : "Search patient or therapist..."} className={`h-10 w-full rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 ${isRtl ? "pr-9 pl-3" : "pl-9 pr-3"}`} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="relative">
                <User className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${isRtl ? "right-3" : "left-3"}`} />
                <select value={doctorFilter} onChange={(event) => setDoctorFilter(event.target.value)} className={`h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-indigo-300 ${isRtl ? "pr-9 pl-3" : "pl-9 pr-3"}`}>
                  <option value="all">{isRtl ? "كل المعالجين" : "All therapists"}</option>
                  {doctorsList.map((doctor) => <option key={doctor.name} value={doctor.name}>{doctor.name}</option>)}
                </select>
              </div>
              <div className="relative">
                <Filter className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${isRtl ? "right-3" : "left-3"}`} />
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={`h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-indigo-300 ${isRtl ? "pr-9 pl-3" : "pl-9 pr-3"}`}>
                  <option value="all">{isRtl ? "كل أنواع الجلسات" : "All session types"}</option>
                  {Object.keys(typeColors).map((type) => <option key={type} value={type}>{isRtl ? type : ({ "جلسة علاج": "Therapy session", "كشف أول": "Initial exam", "متابعة": "Follow-up", "تقييم": "Assessment", "جلسة جماعية": "Group session" } as Record<string, string>)[type]}</option>)}
                </select>
              </div>
              <div className="relative">
                <Building className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${isRtl ? "right-3" : "left-3"}`} />
                <select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)} className={`h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-indigo-300 ${isRtl ? "pr-9 pl-3" : "pl-9 pr-3"}`}>
                  <option value="all">{isRtl ? "كل الغرف" : "All rooms"}</option>
                  {roomsList.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {view === "month" ? (
            <div className="p-3 sm:p-4">
              <CustomMonthCalendar events={filteredEvents} currentDate={currentDate} onDateChange={onDateChange} onSelectSlot={onSelectSlot} onSelectEvent={onSelectEvent} selectable={selectable} />
            </div>
          ) : view === "resource" ? (
            <div className="space-y-3 p-4">
              {roomsList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">{isRtl ? "لا توجد غرف مضافة حتى الآن." : "No rooms have been added yet."}</div>
              ) : roomsList.map((room) => {
                const roomEvents = visibleEvents.filter((event) => event.roomId === room.id);
                return (
                  <div key={room.id} className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-3"><span className="flex items-center gap-2 text-sm font-bold text-slate-800"><Building className="h-4 w-4 text-indigo-600" />{room.name}</span><span className="text-xs text-slate-500">{roomEvents.length} {isRtl ? "مواعيد" : "appointments"}</span></div>
                    <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
                      {roomEvents.length ? roomEvents.map((event) => <EventCard key={event.id} event={event} isRtl={isRtl} onClick={() => onSelectEvent(event)} />) : <p className="col-span-full py-3 text-center text-xs text-slate-400">{isRtl ? "لا توجد حجوزات لهذه الغرفة خلال الفترة." : "No bookings for this room in this period."}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className={`min-w-[850px] ${view === "day" ? "min-w-[520px]" : ""}`}>
                <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `68px repeat(${dayList.length}, minmax(0, 1fr))` }}>
                  <div className="border-l border-slate-100 bg-slate-50" />
                  {dayList.map((day, index) => <div key={day.toISOString()}>{weekDayLabel(day, view === "day" ? (day.getDay() + 1) % 7 : index)}</div>)}
                </div>
                <div className="grid" style={{ gridTemplateColumns: `68px repeat(${dayList.length}, minmax(0, 1fr))` }}>
                  <div className="bg-slate-50">
                    {HOURS.map((hour) => <div key={hour} className="h-[76px] border-b border-l border-slate-100 px-2 pt-1 text-[10px] font-medium text-slate-400">{format(new Date(2020, 0, 1, hour), "h a")}</div>)}
                  </div>
                  {dayList.map((day) => (
                    <div key={day.toISOString()} className="relative border-l border-slate-100">
                      {HOURS.map((hour) => {
                        const slotDate = new Date(day);
                        slotDate.setHours(hour, 0, 0, 0);
                        return <button key={hour} type="button" disabled={!selectable} onClick={() => onSelectSlot(slotDate)} className="block h-[76px] w-full border-b border-slate-100 transition hover:bg-indigo-50/60 disabled:cursor-default disabled:hover:bg-transparent" aria-label={`${format(day, "yyyy-MM-dd")} ${hour}:00`} />;
                      })}
                      {visibleEvents.filter((event) => isSameDay(event.start, day)).map((event) => {
                        const startMinutes = event.start.getHours() * 60 + event.start.getMinutes();
                        const top = Math.max(0, ((startMinutes - 8 * 60) / 60) * 76);
                        const duration = Math.max(30, (event.end.getTime() - event.start.getTime()) / 60000);
                        const height = Math.max(46, (duration / 60) * 76 - 4);
                        if (event.start.getHours() < 8 || event.start.getHours() >= 21) return null;
                        return (
                          <div key={event.id} className="absolute z-[1] w-[calc(100%-8px)] px-0.5" style={{ top: top + 2, height, insetInlineStart: 2 }}>
                            <EventCard event={event} isRtl={isRtl} onClick={() => onSelectEvent(event)} />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              {Object.entries(statusLabels).map(([key, status]) => <span key={key} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${status.dot}`} />{isRtl ? status.ar : status.en}</span>)}
            </div>
            <span className="text-[11px] text-slate-400">{visibleEvents.length} {isRtl ? "موعد في العرض الحالي" : "appointments in current view"}</span>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">{isRtl ? "تقويم سريع" : "Quick calendar"}</h3><CalendarDays className="h-4 w-4 text-indigo-600" /></div>
            <div className="mb-3 flex items-center justify-between"><button type="button" onClick={() => onDateChange(subMonths(currentDate, 1))} className="rounded-md p-1 text-slate-500 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button><span className="text-xs font-bold text-slate-700">{format(currentDate, "MMMM yyyy", { locale })}</span><button type="button" onClick={() => onDateChange(addMonths(currentDate, 1))} className="rounded-md p-1 text-slate-500 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button></div>
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {(isRtl ? ["س", "ح", "ن", "ث", "ر", "خ", "ج"] : ["S", "S", "M", "T", "W", "T", "F"]).map((day, index) => <span key={index} className="py-1 text-[10px] font-semibold text-slate-400">{day}</span>)}
              {miniDays.map((day) => {
                const hasEvents = events.some((event) => isSameDay(event.start, day));
                return <button key={day.toISOString()} type="button" onClick={() => onDateChange(day)} className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[10px] transition ${isSameDay(day, currentDate) ? "bg-[#4F46BA] font-bold text-white" : isSameDay(day, new Date()) ? "border border-indigo-400 font-bold text-indigo-700" : !isSameMonth(day, currentDate) ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>{format(day, "d")}{hasEvents && !isSameDay(day, currentDate) && <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cyan-500" />}</button>;
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">{isRtl ? "المواعيد القادمة" : "Upcoming appointments"}</h3><Clock className="h-4 w-4 text-indigo-600" /></div>
            <div className="space-y-3">
              {upcomingEvents.length ? upcomingEvents.map((event) => <button type="button" key={event.id} onClick={() => onSelectEvent(event)} className="flex w-full items-start gap-2 text-start"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-700">{event.patientName || event.title}</span><span className="mt-0.5 block text-[10px] text-slate-400">{format(event.start, "EEE d MMM · h:mm a", { locale })}</span></span></button>) : <p className="py-3 text-center text-xs text-slate-400">{isRtl ? "لا توجد مواعيد قادمة." : "No upcoming appointments."}</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">{isRtl ? "قائمة الانتظار" : "Waiting list"}</h3><Users className="h-4 w-4 text-amber-600" /></div>
            {pendingEvents.length ? <div className="space-y-2">{pendingEvents.slice(0, 4).map((event) => <button type="button" key={event.id} onClick={() => onSelectEvent(event)} className="flex w-full items-center justify-between gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-start"><span className="truncate text-xs font-semibold text-amber-900">{event.patientName || event.title}</span><span className="shrink-0 text-[10px] text-amber-700">{format(event.start, "d/M")}</span></button>)}</div> : <p className="py-3 text-center text-xs text-slate-400">{isRtl ? "قائمة الانتظار فارغة حاليًا." : "The waiting list is currently empty."}</p>}
          </section>

          <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-indigo-700"><Sparkles className="h-4 w-4" /><h3 className="text-sm font-bold">{isRtl ? "مساعد الجدولة" : "Scheduling assistant"}</h3></div>
            <p className="text-xs leading-6 text-slate-600">{pendingEvents.length ? (isRtl ? `لديك ${pendingEvents.length} مواعيد في قائمة الانتظار. راجعها لتأكيد الأوقات المناسبة.` : `You have ${pendingEvents.length} appointments waiting for confirmation. Review them to confirm suitable times.`) : (isRtl ? "لا توجد مواعيد معلقة حاليًا. استمر في متابعة الجدول لتوزيع الجلسات بسلاسة." : "There are no pending appointments right now. Keep monitoring the schedule to balance sessions smoothly.")}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
