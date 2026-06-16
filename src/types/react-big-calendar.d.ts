declare module "react-big-calendar" {
  import { Component, ComponentType, ReactNode } from "react";

  export interface Event {
    title?: ReactNode;
    start?: Date;
    end?: Date;
    allDay?: boolean;
    resource?: unknown;
  }

  export interface SlotInfo {
    start: Date;
    end: Date;
    slots: Date[];
    action: "select" | "click" | "doubleClick";
    bounds?: { x: number; y: number; top: number; right: number; left: number; bottom: number };
    box?: { x: number; y: number; clientX: number; clientY: number };
  }

  export type View = "month" | "week" | "work_week" | "day" | "agenda";

  export interface DateLocalizer {
    format(value: Date, format: string, culture?: string): string;
    formats: Record<string, unknown>;
    propType?: unknown;
    startOfWeek(culture?: string): number;
  }

  export interface CalendarProps<TEvent extends object = Event, TResource extends object = object> {
    localizer: DateLocalizer;
    events?: TEvent[];
    view?: View;
    views?: View[] | { [key: string]: boolean | ComponentType<unknown> };
    onView?: (view: View) => void;
    date?: Date;
    onNavigate?: (newDate: Date, view: View, action: string) => void;
    selectable?: boolean;
    onSelectSlot?: (slotInfo: SlotInfo) => void;
    onSelectEvent?: (event: TEvent, e: React.SyntheticEvent) => void;
    eventPropGetter?: (event: TEvent, start: Date, end: Date, isSelected: boolean) => { className?: string; style?: React.CSSProperties };
    style?: React.CSSProperties;
    messages?: Record<string, string | ((args: unknown) => string)>;
    formats?: Record<string, string | ((date: Date, culture?: string, localizer?: DateLocalizer) => string) | ((range: { start: Date; end: Date }, culture?: string, localizer?: DateLocalizer) => string)>;
    popup?: boolean;
    step?: number;
    timeslots?: number;
    min?: Date;
    max?: Date;
    resources?: TResource[];
    resourceIdAccessor?: string | ((resource: TResource) => string);
    resourceTitleAccessor?: string | ((resource: TResource) => string);
    defaultView?: View;
    scrollToTime?: Date;
    culture?: string;
    components?: Record<string, ComponentType<unknown>>;
    className?: string;
  }

  export class Calendar<TEvent extends object = Event, TResource extends object = object> extends Component<CalendarProps<TEvent, TResource>> {}

  export function dateFnsLocalizer(config: {
    format: (date: any, formatStr: string, options?: any) => string;
    parse: (dateStr: string, formatStr: string, baseDate: any, options?: any) => Date;
    startOfWeek: (date: Date) => Date;
    getDay: (date: Date) => number;
    locales: Record<string, unknown>;
  }): DateLocalizer;
}
