import React, { useMemo } from "react";

// Constantes
const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Constrói o calendário de 42 dias com status de disponibilidade.
 * Lógica autocontida e defensiva.
 */
function buildCalendarDays(settings) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Ler working_days com parsing defensivo
  let workingDays = [1, 2, 3, 4, 5]; // fallback seg-sex
  if (settings && Array.isArray(settings.working_days) && settings.working_days.length > 0) {
    const parsed = settings.working_days
      .map(d => {
        const n = parseInt(String(d), 10);
        return isNaN(n) ? -1 : n;
      })
      .filter(n => n >= 0 && n <= 6);
    if (parsed.length > 0) workingDays = parsed;
  }

  // Ler min_advance_days com parsing defensivo
  let minAdvance = 2; // fallback
  if (settings && settings.min_advance_days !== undefined && settings.min_advance_days !== null) {
    const parsed = parseInt(String(settings.min_advance_days), 10);
    if (!isNaN(parsed) && parsed >= 0) minAdvance = parsed;
  }

  // Calcular a primeira data disponível
  let firstAvailable = null;
  {
    const cursor = new Date(today);
    let utilsCount = 0;

    for (let i = 1; i <= 60; i++) {
      cursor.setDate(today.getDate() + i);
      cursor.setHours(0, 0, 0, 0);

      const dow = cursor.getDay();
      if (!workingDays.includes(dow)) continue; // não é dia útil, pula

      // É dia útil — mas tem antecedência suficiente?
      // Contar dias úteis entre hoje e cursor (exclusive ambos)
      let daysBefore = 0;
      const inner = new Date(today);
      for (let j = 1; j < i; j++) {
        inner.setDate(today.getDate() + j);
        inner.setHours(0, 0, 0, 0);
        if (workingDays.includes(inner.getDay())) daysBefore++;
      }

      if (daysBefore >= minAdvance) {
        firstAvailable = new Date(cursor);
        break;
      }
    }
  }

  // Gerar os próximos 42 dias a partir de amanhã
  const days = [];
  for (let i = 1; i <= 42; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    d.setHours(0, 0, 0, 0);

    const dow = d.getDay();
    const isWorkingDay = workingDays.includes(dow);
    const hasMinAdvance = firstAvailable !== null && d.getTime() >= firstAvailable.getTime();

    let status;
    if (!isWorkingDay) {
      status = "blocked";
    } else if (!hasMinAdvance) {
      status = "blocked";
    } else {
      status = "available";
    }

    days.push({ date: d, status, dow });
  }

  return days;
}

/**
 * Componente do calendário de agendamento.
 */
export default function VeloxDatePicker({ settings, selectedDate, onSelectDate }) {
  // settings === null significa que ainda está carregando do banco
  const settingsLoaded = settings !== null && settings !== undefined;

  const calendarDays = useMemo(() => {
    if (!settingsLoaded) return [];
    return buildCalendarDays(settings);
  }, [settings, settingsLoaded]);

  // Agrupar por semanas
  // Skeleton de loading
  if (!settingsLoaded || calendarDays.length === 0) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, ri) => (
            <div key={ri} className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, ci) => (
                <div key={ci} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">Carregando disponibilidade...</p>
      </div>
    );
  }

  const weeks = [];
  let currentWeek = new Array(7).fill(null);

  if (calendarDays.length > 0) {
    const firstDay = calendarDays[0].date;
    const firstDow = firstDay.getDay(); // 0=dom

    let dayIndex = 0;
    for (let col = 0; col < 7; col++) {
      if (col >= firstDow) {
        currentWeek[col] = calendarDays[dayIndex++];
      }
    }
    weeks.push([...currentWeek]);

    while (dayIndex < calendarDays.length) {
      currentWeek = new Array(7).fill(null);
      for (let col = 0; col < 7; col++) {
        if (dayIndex < calendarDays.length) {
          currentWeek[col] = calendarDays[dayIndex++];
        }
      }
      weeks.push([...currentWeek]);
    }
  }

  const minAdvanceDays = settings?.min_advance_days ? parseInt(String(settings.min_advance_days), 10) : 2;

  return (
    <div className="w-full space-y-3">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 mb-2 gap-1">
        {WEEKDAY_NAMES.map(name => (
          <div key={name} className="text-center text-xs font-semibold text-slate-500 py-1">
            {name}
          </div>
        ))}
      </div>

      {/* Semanas */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {week.map((cell, ci) => {
            if (!cell) {
              return <div key={ci} className="h-14" />;
            }

            const { date, status } = cell;
            const isSelected = selectedDate &&
              date.toDateString() === new Date(selectedDate + "T12:00:00").toDateString();
            const isBlocked = status === "blocked";

            return (
              <button
                key={date.toISOString()}
                type="button"
                disabled={isBlocked}
                onClick={() => {
                  if (isBlocked) return;
                  const year  = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, "0");
                  const day   = String(date.getDate()).padStart(2, "0");
                  onSelectDate(`${year}-${month}-${day}`);
                }}
                className={[
                  "h-14 rounded-xl flex flex-col items-center justify-center text-sm transition-all",
                  isSelected
                    ? "bg-amber-500 text-white font-bold ring-2 ring-amber-300"
                    : isBlocked
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-green-50 text-green-800 border border-green-200 hover:bg-green-100 cursor-pointer"
                ].join(" ")}
              >
                <span className="font-semibold leading-none">{date.getDate()}</span>
                <span className="text-xs opacity-70 leading-none mt-0.5">
                  {date.toLocaleDateString("pt-BR", { month: "short" })}
                </span>
                {!isBlocked && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full mt-0.5 bg-green-500" />
                )}
              </button>
            );
          })}
        </div>
      ))}

      {/* Legenda */}
      <div className="flex items-center gap-4 mt-3 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          <span className="text-slate-600">Disponível</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
          <span className="text-slate-600">Indisponível</span>
        </div>
      </div>

      {/* Nota de antecedência */}
      <p className="text-xs text-slate-500">
        Agendamentos com no mínimo {minAdvanceDays} dia{minAdvanceDays !== 1 ? "s" : ""} útil{minAdvanceDays !== 1 ? "s" : ""} de antecedência.
      </p>
    </div>
  );
}