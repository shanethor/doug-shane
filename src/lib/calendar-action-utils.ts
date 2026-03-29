import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/auth-fetch";

export type ParsedCalendarAction = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

const PIPE_REGEX = /\[CALENDAR_ACTION:CREATE\|([^|\]]+)\|(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})\|(\d+)\]/gi;
const COLON_REGEX = /\[CALENDAR_ACTION:create:([^:]+):(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2}):(\d{2}:\d{2}):([^:]*):([^\]]*)\]/g;

function addMinutesToTime(time: string, durationMinutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  const totalMinutes = hour * 60 + minute + durationMinutes;
  const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const endHour = Math.floor(normalized / 60);
  const endMinute = normalized % 60;
  return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
}

export function extractCalendarActions(content: string): ParsedCalendarAction[] {
  const actions: ParsedCalendarAction[] = [];
  const seen = new Set<string>();

  let pipeMatch: RegExpExecArray | null;
  while ((pipeMatch = PIPE_REGEX.exec(content)) !== null) {
    const durationMinutes = Math.max(15, Number(pipeMatch[4]) || 30);
    const action = {
      title: pipeMatch[1].trim(),
      date: pipeMatch[2],
      startTime: pipeMatch[3],
      endTime: addMinutesToTime(pipeMatch[3], durationMinutes),
      durationMinutes,
    };

    const key = JSON.stringify(action);
    if (!seen.has(key)) {
      seen.add(key);
      actions.push(action);
    }
  }

  let colonMatch: RegExpExecArray | null;
  while ((colonMatch = COLON_REGEX.exec(content)) !== null) {
    const [startHour, startMinute] = colonMatch[3].split(":").map(Number);
    const [endHour, endMinute] = colonMatch[4].split(":").map(Number);
    const durationMinutes = Math.max(15, endHour * 60 + endMinute - (startHour * 60 + startMinute));
    const action = {
      title: colonMatch[1].trim(),
      date: colonMatch[2],
      startTime: colonMatch[3],
      endTime: colonMatch[4],
      durationMinutes,
    };

    const key = JSON.stringify(action);
    if (!seen.has(key)) {
      seen.add(key);
      actions.push(action);
    }
  }

  return actions;
}

export async function executeCalendarActions(options: {
  actions: ParsedCalendarAction[];
  userId: string;
}) {
  const { actions, userId } = options;
  let createdCount = 0;
  const externalFailures: string[] = [];

  if (!actions.length) return { createdCount, externalFailures };

  const { data: calendars } = await supabase
    .from("external_calendars")
    .select("provider")
    .eq("user_id", userId)
    .eq("is_active", true);

  const headers = calendars?.length ? await getAuthHeaders() : null;

  for (const action of actions) {
    const start = new Date(`${action.date}T${action.startTime}:00`);
    const end = new Date(`${action.date}T${action.endTime}:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    const { error } = await supabase.from("calendar_events").insert({
      user_id: userId,
      title: action.title,
      event_type: "other" as any,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      provider: "aura",
      status: "scheduled" as any,
    } as any);

    if (error) throw error;
    createdCount += 1;

    if (headers && calendars?.length) {
      await Promise.all(
        calendars.map(async ({ provider }) => {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              action: "create_event",
              provider,
              title: action.title,
              start: start.toISOString(),
              end: end.toISOString(),
            }),
          });

          if (!response.ok) {
            const details = await response.text().catch(() => "External sync failed");
            externalFailures.push(`${provider}: ${details}`);
          }
        })
      );
    }
  }

  if (createdCount > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("aura-calendar-refresh"));
  }

  return { createdCount, externalFailures };
}