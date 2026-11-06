import { clientKey, entryCents, entryKmTenths, sessionBalance, sessionCountLabel, sessionCountOf } from "../domain/entries";
import { formatEuros, formatKmLabel } from "../domain/money";
import { formatDuration, formatFinnishDate, formatRange, monthLabel, shiftMonth } from "../domain/time";
import type { Entry, TemplateId } from "../domain/types";
import { TEMPLATES, templateInfo } from "../domain/types";

export function MonthScreen({
  month,
  template,
  entries,
  allEntries,
  rateCents,
  onMonth,
  onTemplate,
  onCreate,
  onEdit,
  onCopy,
  onDelete,
  onExamples,
  onPdf,
  onEntryPdf,
  onClientPdf,
}: {
  month: string;
  template: TemplateId;
  entries: Entry[];
  allEntries: Entry[];
  rateCents: number;
  onMonth: (month: string) => void;
  onTemplate: (template: TemplateId) => void;
  onCreate: () => void;
  onEdit: (entry: Entry) => void;
  onCopy: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onExamples: () => void;
  onPdf: () => void;
  onEntryPdf: (entry: Entry) => void;
  onClientPdf: (clientName: string) => void;
}) {
  const info = templateInfo(template);
  const totalKm = entries.reduce((sum, entry) => sum + entryKmTenths(entry), 0);
  const totalCents = entries.reduce((sum, entry) => sum + entryCents(entry, rateCents), 0);
  const clients = uniqueClients(entries);

  return (
    <div>
      <header className="page-head">
        <div>
          <p className={`kicker ${template}`}>{info.label}</p>
          <h1>{monthLabel(month)}</h1>
        </div>
        <div className="row-actions">
          <button className="ghost" type="button" onClick={onPdf}>Kuukauden PDF</button>
          <button className="primary" type="button" onClick={onCreate}>Uusi merkintä</button>
        </div>
      </header>

      <div className="toolbar">
        <div className="month-switch">
          <button type="button" aria-label="Edellinen kuukausi" onClick={() => onMonth(shiftMonth(month, -1))}>←</button>
          <strong>{monthLabel(month)}</strong>
          <button type="button" aria-label="Seuraava kuukausi" onClick={() => onMonth(shiftMonth(month, 1))}>→</button>
        </div>
        <div className="template-switch" role="group" aria-label="Pohja">
          {TEMPLATES.map((item) => (
            <button
              key={item.id}
              type="button"
              data-template={item.id}
              aria-pressed={item.id === template}
              onClick={() => onTemplate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button className="ghost" type="button" onClick={onExamples}>Lisää esimerkit</button>
      </div>

      {template === "opetus" && clients.length > 0 && (
        <div className="client-pdfs">
          <span>Asiakkaan PDF</span>
          {clients.map((name) => (
            <button key={name} className="ghost tiny" type="button" onClick={() => onClientPdf(name)}>{name}</button>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <section className="empty card">
          <h2>Ei merkintöjä tässä kuussa</h2>
          <p>{emptyText(template)}</p>
          <div className="row-actions">
            <button className="primary" type="button" onClick={onCreate}>Uusi merkintä</button>
            <button className="ghost" type="button" onClick={onExamples}>Lisää esimerkit</button>
          </div>
        </section>
      ) : (
        <>
          <p className="totals-line">{entries.length} merkintää · {formatKmLabel(totalKm)} · {formatEuros(totalCents)}</p>
          <div className="entry-list">
            {entries.map((entry) => (
              <article key={entry.id} className={`entry-card ${entry.template}${entry.cancellation ? " cancelled" : ""}`}>
                <div>
                  <p className="entry-date">
                    {formatFinnishDate(entry.date)}
                    {entry.cancellation && <span className="cancel-mark">Peruutettu {entry.cancellation} %</span>}
                  </p>
                  <h2>{entry.clientName}</h2>
                  <p className="muted">{clientLine(entry, allEntries)}</p>
                </div>
                <div className="legs-read">
                  {entry.remote ? (
                    <p>Etänä, ei ajoa</p>
                  ) : (
                    <>
                      <p><span>Meno</span> {formatRange(entry.outboundStart, entry.outboundEnd)} · {formatKmLabel(entry.outboundKmTenths)}{durationSuffix(entry.outboundStart, entry.outboundEnd)}</p>
                      <p><span>Paluu</span> {formatRange(entry.returnStart, entry.returnEnd)} · {formatKmLabel(entry.returnKmTenths)}{durationSuffix(entry.returnStart, entry.returnEnd)}</p>
                    </>
                  )}
                  {workLine(entry) && <p>{workLine(entry)}</p>}
                </div>
                <div className="entry-side">
                  <strong>{formatEuros(entryCents(entry, rateCents))}</strong>
                  <div className="row-actions column">
                    {template === "ktt" && (
                      <button className="ghost" type="button" onClick={() => onEntryPdf(entry)}>PDF</button>
                    )}
                    <button className="ghost" type="button" onClick={() => onEdit(entry)}>Muokkaa</button>
                    <button className="ghost" type="button" onClick={() => onCopy(entry)}>Kopioi asiakas</button>
                    <button className="ghost danger" type="button" onClick={() => onDelete(entry)}>Poista</button>
                  </div>
                </div>
                {entry.note && <p className="entry-note"><span>{info.noteLabel}</span> {entry.note}</p>}
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function durationSuffix(start: number | null, end: number | null): string {
  const text = formatDuration(start, end);
  return text ? ` · ${text}` : "";
}

function emptyText(template: TemplateId): string {
  if (template === "opetus") return "Lisää käynti tai täytä pohja esimerkeillä. Asiakkaat näkyvät aikajärjestyksessä, mutta jokaiselle saa oman kuukauden PDF:n.";
  if (template === "ktt") return "Lisää käynti tai täytä pohja esimerkeillä. Kuukauden PDF kokoaa kaikki käynnit, ja jokaisesta käynnistä saa myös oman PDF:n.";
  return "Lisää käynti tai täytä pohja esimerkeillä. PDF näyttää vain tämän pohjan ja tämän kuukauden kaikki asiakkaat.";
}

function uniqueClients(entries: Entry[]): string[] {
  const names = new Map<string, string>();
  for (const entry of entries) {
    const key = clientKey(entry.clientName);
    if (key && !names.has(key)) names.set(key, entry.clientName);
  }
  return [...names.values()];
}

function workLine(entry: Entry): string {
  if (entry.template === "opetus") return "";
  if (entry.orderedStart == null && entry.orderedEnd == null) {
    if (entry.workStart == null && entry.workEnd == null) return "";
    return `Toteutunut ${formatRange(entry.workStart, entry.workEnd)}`;
  }
  const ordered = formatRange(entry.orderedStart, entry.orderedEnd);
  if (entry.workMatchesOrder) return `Tilattu ${ordered} · toteutunut sama`;
  return `Tilattu ${ordered} · toteutunut ${formatRange(entry.workStart, entry.workEnd)}`;
}

function clientLine(entry: Entry, allEntries: Entry[]): string {
  const parts = [];
  if (entry.template === "ktt" && entry.orderer) parts.push(entry.orderer);
  if (entry.municipality) parts.push(entry.municipality);
  if (entry.template === "opetus") {
    parts.push(sessionCountLabel(sessionCountOf(entry)));
    if (entry.validUntil) parts.push(`voimassa ${formatFinnishDate(entry.validUntil)}`);
    if (entry.folderGivenOn) parts.push(`kansio ${formatFinnishDate(entry.folderGivenOn)}`);
    const balance = sessionBalance(allEntries, entry);
    if (balance) parts.push(`oppitunteja ${balance.granted}`, `käytetty ${balance.used}`, `jäljellä ${balance.remaining}`);
  }
  return parts.filter(Boolean).join(" · ");
}
