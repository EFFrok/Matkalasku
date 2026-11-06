import { useEffect, useState } from "react";
import { adoptClient, clientKey, copyClient, exampleEntries, monthEntries, prepareEntry } from "../domain/entries";
import { currentMonth, defaultDateForMonth } from "../domain/time";
import { emptyEntry, type Entry, type Settings, type TemplateId } from "../domain/types";
import { loadData, saveData } from "../storage/local";
import { EntryScreen } from "./EntryScreen";
import { MonthScreen } from "./MonthScreen";
import { PdfScreen, type PdfScope } from "./PdfScreen";
import { SettingsScreen } from "./SettingsScreen";

type Screen = "month" | "entry" | "settings" | "pdf";

export function App() {
  const [entries, setEntries] = useState<Entry[]>(() => loadData().entries);
  const [settings, setSettings] = useState<Settings>(() => loadData().settings);
  const [template, setTemplate] = useState<TemplateId>("monetra");
  const [month, setMonth] = useState(currentMonth());
  const [screen, setScreen] = useState<Screen>("month");
  const [draft, setDraft] = useState<Entry | null>(null);
  const [mode, setMode] = useState<"new" | "edit" | "copy">("new");
  const [pdfScope, setPdfScope] = useState<PdfScope>({ kind: "month" });

  useEffect(() => {
    saveData({ entries, settings });
  }, [entries, settings]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen, draft?.id]);

  const visible = monthEntries(entries, template, month);
  const printed = pdfEntries(visible, pdfScope);

  function openPdf(scope: PdfScope) {
    setPdfScope(scope);
    setScreen("pdf");
  }

  function openCreate() {
    setDraft(emptyEntry(template, defaultDateForMonth(month)));
    setMode("new");
    setScreen("entry");
  }

  function openEdit(entry: Entry) {
    setDraft({ ...entry });
    setMode("edit");
    setScreen("entry");
  }

  function openCopy(entry: Entry) {
    setDraft(copyClient(entry));
    setMode("copy");
    setScreen("entry");
  }

  function saveDraft() {
    if (!draft) return;
    const next = prepareEntry(adoptClient(entries, draft));
    setEntries((current) => {
      const exists = current.some((entry) => entry.id === next.id);
      return exists ? current.map((entry) => (entry.id === next.id ? next : entry)) : [...current, next];
    });
    if (next.date.startsWith(month) === false && next.date.length >= 7) setMonth(next.date.slice(0, 7));
    setTemplate(next.template);
    setDraft(null);
    setScreen("month");
  }

  function deleteEntry(entry: Entry) {
    if (!window.confirm(`Poistetaanko ${entry.clientName || "merkintä"}?`)) return;
    setEntries((current) => current.filter((item) => item.id !== entry.id));
    setDraft(null);
    setScreen("month");
  }

  function addExamples() {
    setEntries((current) => [...current, ...exampleEntries(template, month)]);
  }

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <strong>Matkalasku</strong>
          <span>DEMO</span>
        </div>
        <nav className="nav">
          <button className={screen === "month" || screen === "entry" ? "active" : ""} type="button" onClick={() => { setDraft(null); setScreen("month"); }}>Merkinnät</button>
          <button className={screen === "pdf" ? "active" : ""} type="button" onClick={() => openPdf({ kind: "month" })}>Kuukauden PDF</button>
          <button className={screen === "settings" ? "active" : ""} type="button" onClick={() => setScreen("settings")}>Asetukset</button>
        </nav>
      </header>
      <main className="main">
        {screen === "month" && (
          <MonthScreen
            month={month}
            template={template}
            entries={visible}
            allEntries={entries}
            rateCents={settings.kmRateCents}
            onMonth={setMonth}
            onTemplate={setTemplate}
            onCreate={openCreate}
            onEdit={openEdit}
            onCopy={openCopy}
            onDelete={deleteEntry}
            onExamples={addExamples}
            onPdf={() => openPdf({ kind: "month" })}
            onEntryPdf={(entry) => openPdf({ kind: "entry", entryId: entry.id })}
            onClientPdf={(clientName) => openPdf({ kind: "client", clientName })}
          />
        )}
        {screen === "entry" && draft && (
          <EntryScreen
            entry={draft}
            entries={entries}
            settings={settings}
            mode={mode}
            onChange={(next) => {
              setDraft((current) => {
                if (!current) return current;
                return typeof next === "function" ? next(current) : next;
              });
            }}
            onSave={saveDraft}
            onCancel={() => { setDraft(null); setScreen("month"); }}
            onDelete={mode === "edit" ? () => deleteEntry(draft) : null}
          />
        )}
        {screen === "settings" && (
          <SettingsScreen
            settings={settings}
            onSave={(next) => {
              setSettings(next);
              setScreen("month");
            }}
            onBack={() => setScreen("month")}
          />
        )}
        {screen === "pdf" && (
          <PdfScreen
            month={month}
            template={template}
            scope={pdfScope}
            entries={printed}
            allEntries={entries}
            settings={settings}
            onBack={() => setScreen("month")}
          />
        )}
      </main>
    </div>
  );
}

function pdfEntries(entries: Entry[], scope: PdfScope): Entry[] {
  if (scope.kind === "entry") return entries.filter((entry) => entry.id === scope.entryId);
  if (scope.kind === "client") {
    const key = clientKey(scope.clientName);
    return entries.filter((entry) => clientKey(entry.clientName) === key);
  }
  return entries;
}
