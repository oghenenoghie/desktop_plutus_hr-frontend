"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { employeesApi, leaveApi, publicHolidaysApi, tasksApi } from "@/lib/api/endpoints";
import { titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { LeaveRequest, PublicHoliday, Task } from "@/lib/types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PRIORITY_DOT: Record<Task["priority"], string> = {
  low: "bg-ink-soft",
  medium: "bg-primary",
  high: "bg-bad",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

// Ranges are stored as plain ISO date strings (no time component), so every
// step here stays in UTC to avoid a local-timezone off-by-one on the first
// or last day of the range.
function eachDateInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor.getTime() <= last.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return dates;
}

const MONTH_LABEL = new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric" });

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const holidays = useApiResource(() => publicHolidaysApi.list());
  const tasks = useApiResource(() => tasksApi.list("all"));
  const leaveRequests = useApiResource(() => leaveApi.list());
  const employees = useApiResource(() => employeesApi.list());

  const loading = holidays.loading || tasks.loading || leaveRequests.loading || employees.loading;
  const error = holidays.error ?? tasks.error ?? leaveRequests.error ?? employees.error;

  const employeeNameById = useMemo(
    () => new Map((employees.data ?? []).map((employee) => [employee.id, employee.full_name])),
    [employees.data],
  );

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, PublicHoliday>();
    for (const holiday of holidays.data ?? []) map.set(holiday.holiday_date, holiday);
    return map;
  }, [holidays.data]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks.data ?? []) {
      if (!task.due_date || task.status === "cancelled") continue;
      const list = map.get(task.due_date) ?? [];
      list.push(task);
      map.set(task.due_date, list);
    }
    return map;
  }, [tasks.data]);

  const leaveByDate = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();
    for (const request of leaveRequests.data ?? []) {
      if (request.status !== "approved") continue;
      for (const date of eachDateInRange(request.start_date, request.end_date)) {
        const list = map.get(date) ?? [];
        list.push(request);
        map.set(date, list);
      }
    }
    return map;
  }, [leaveRequests.data]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: { key: string; day: number }[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push({ key: `blank-${i}`, day: 0 });
  for (let day = 1; day <= daysInMonth; day++) cells.push({ key: dateKey(year, month, day), day });
  while (cells.length % 7 !== 0) cells.push({ key: `trailing-${cells.length}`, day: 0 });

  function goToMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Public holidays, task due dates, and approved leave in one view"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => goToMonth(-1)}>
              ‹ Prev
            </Button>
            <Button variant="secondary" onClick={goToday}>
              Today
            </Button>
            <Button variant="secondary" onClick={() => goToMonth(1)}>
              Next ›
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <h2 className="text-[15px] font-extrabold text-ink">{MONTH_LABEL.format(new Date(year, month, 1))}</h2>
        <div className="flex items-center gap-4 text-[11.5px] font-bold text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-bad-tint ring-1 ring-inset ring-bad" /> Public holiday
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Task due
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-good-tint ring-1 ring-inset ring-good" /> Approved leave
          </span>
        </div>
      </div>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <Card padding="compact" className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-7 gap-px bg-border">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="bg-surface px-2 py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">
                {label}
              </div>
            ))}
            {cells.map((cell) => {
              if (cell.day === 0) return <div key={cell.key} className="min-h-[110px] bg-bg" />;

              const holiday = holidaysByDate.get(cell.key);
              const dayTasks = tasksByDate.get(cell.key) ?? [];
              const dayLeave = leaveByDate.get(cell.key) ?? [];
              const isToday = cell.key === todayKey;

              return (
                <div
                  key={cell.key}
                  className={`flex min-h-[110px] flex-col gap-1 bg-surface p-1.5 ${holiday ? "bg-bad-tint/40" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[12px] font-bold ${
                        isToday
                          ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white"
                          : "text-ink"
                      }`}
                    >
                      {cell.day}
                    </span>
                  </div>

                  {holiday ? (
                    <div className="truncate rounded-[3px] bg-bad-tint px-1 py-0.5 text-[10.5px] font-bold text-bad" title={holiday.name}>
                      {holiday.name}
                    </div>
                  ) : null}

                  {dayTasks.slice(0, 2).map((task) => (
                    <div key={task.id} className="flex items-center gap-1 truncate text-[10.5px] text-ink" title={task.title}>
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  {dayTasks.length > 2 ? (
                    <div className="text-[10px] text-ink-soft">+{dayTasks.length - 2} more task{dayTasks.length - 2 === 1 ? "" : "s"}</div>
                  ) : null}

                  {dayLeave.slice(0, 2).map((request) => (
                    <div
                      key={request.id}
                      className="truncate rounded-[3px] bg-good-tint px-1 py-0.5 text-[10.5px] font-bold text-good"
                      title={`${employeeNameById.get(request.employee_id) ?? "Employee"} — ${titleCase(request.leave_type)} leave`}
                    >
                      {employeeNameById.get(request.employee_id) ?? "Employee"}
                    </div>
                  ))}
                  {dayLeave.length > 2 ? (
                    <div className="text-[10px] text-ink-soft">+{dayLeave.length - 2} more on leave</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
