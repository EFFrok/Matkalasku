import { useEffect, useState } from "react";
import { formatKm, parseKmToTenths } from "../domain/money";
import { formatTime, parseTimeToMinutes } from "../domain/time";

export function TimeField({
  label,
  minutes,
  placeholder,
  onChange,
}: {
  label: string;
  minutes: number | null;
  placeholder: string;
  onChange: (minutes: number | null) => void;
}) {
  const [text, setText] = useState(minutes == null ? "" : formatTime(minutes));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(minutes == null ? "" : formatTime(minutes));
  }, [minutes, focused]);
  const shown = focused ? text : minutes == null ? "" : formatTime(minutes);
  return (
    <label>
      {label}
      <input
        inputMode="numeric"
        placeholder={placeholder}
        value={shown}
        onFocus={() => {
          setText(minutes == null ? "" : formatTime(minutes));
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          setText(event.target.value);
          if (!event.target.value.trim()) onChange(null);
          const parsed = parseTimeToMinutes(event.target.value);
          if (parsed != null) onChange(parsed);
        }}
      />
    </label>
  );
}

export function KmField({
  label,
  tenths,
  onChange,
}: {
  label: string;
  tenths: number | null;
  onChange: (tenths: number | null) => void;
}) {
  const [text, setText] = useState(formatKm(tenths));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(formatKm(tenths));
  }, [tenths, focused]);
  return (
    <label>
      {label}
      <input
        inputMode="decimal"
        placeholder="18"
        value={focused ? text : formatKm(tenths)}
        onFocus={() => {
          setText(formatKm(tenths));
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          setText(event.target.value);
          if (!event.target.value.trim()) onChange(null);
          const parsed = parseKmToTenths(event.target.value);
          if (parsed != null) onChange(parsed);
        }}
      />
    </label>
  );
}

export function TextField({
  label,
  value,
  placeholder,
  onChange,
  suggestions = [],
  wide = false,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  wide?: boolean;
}) {
  const listId = suggestions.length > 0 ? `${label}-suggestions` : undefined;
  return (
    <label className={wide ? "wide" : undefined}>
      {label}
      <input list={listId} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {listId && (
        <datalist id={listId}>
          {suggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}
        </datalist>
      )}
    </label>
  );
}
