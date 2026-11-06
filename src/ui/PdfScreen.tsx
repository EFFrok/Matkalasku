import { useEffect } from "react";
import { clientKey, entryCents, entryKmTenths, orderedMinutes, sessionBalance, sessionCountLabel, sessionCountOf, workedMinutes } from "../domain/entries";
import { formatEuros, formatKmLabel, formatRate, legCents } from "../domain/money";
import { formatDuration, formatFinnishDate, formatMinutes, formatRange, monthLabel } from "../domain/time";
import type { Entry, Settings, TemplateId } from "../domain/types";
import { templateInfo } from "../domain/types";

export type PdfScope =
  | { kind: "month" }
  | { kind: "entry"; entryId: string }
  | { kind: "client"; clientName: string };

export function PdfScreen({
  month,
  template,
  scope,
  entries,
  allEntries,
  settings,
  onBack,
}: {
  month: string;
  template: TemplateId;
  scope: PdfScope;
  entries: Entry[];
  allEntries: Entry[];
  settings: Settings;
  onBack: () => void;
}) {
  const info = templateInfo(template);
  const totalKm = entries.reduce((sum, entry) => sum + entryKmTenths(entry), 0);
  const totalCents = entries.reduce((sum, entry) => sum + entryCents(entry, settings.kmRateCents), 0);
  const totalOrdered = sumMinutes(entries, orderedMinutes);
  const totalWork = sumMinutes(entries, workedMinutes);
  const heading = pdfHeading(scope);
  const subject = pdfSubject(scope, entries);

  useEffect(() => {
    const previous = document.title;
    document.title = ["Matkalasku", info.label, subject, monthLabel(month)].filter(Boolean).join(" ");
    return () => {
      document.title = previous;
    };
  }, [info.label, month, subject]);

  return (
    <div>
      <header className="page-head no-print">
        <div>
          <p className={`kicker ${template}`}>{info.label}</p>
          <h1>{heading}</h1>
        </div>
        <div className="row-actions">
          <button className="ghost" type="button" onClick={onBack}>Takaisin</button>
          <button className="primary" type="button" onClick={() => window.print()}>Tallenna PDF</button>
        </div>
      </header>
      <p className="muted no-print">{pdfHelp(scope)}</p>

      <article className={`sheet ${template}`}>
        <header className="sheet-head">
          <div>
            <p>Matkalasku</p>
            <h1>{info.label}</h1>
            <p>{[subject, monthLabel(month)].filter(Boolean).join(" · ")}</p>
          </div>
          <dl>
            <div>
              <dt>Nimi</dt>
              <dd>{settings.workerName || "–"}</dd>
            </div>
            <div>
              <dt>Kilometrikorvaus</dt>
              <dd>{formatRate(settings.kmRateCents)} €/km</dd>
            </div>
            <div>
              <dt>Merkintöjä</dt>
              <dd>{entries.length}</dd>
            </div>
          </dl>
        </header>

        {entries.length === 0 && <p className="pdf-empty">Ei merkintöjä tällä pohjalla tässä kuussa.</p>}
        {entries.map((entry) => {
          const meta = clientMeta(entry);
          const note = noteText(entry);
          return (
            <section key={entry.id} className={`pdf-entry${entry.cancellation ? " cancelled" : ""}`}>
              <div className="pdf-entry-head">
                <p>
                  <span className="pdf-date">{formatFinnishDate(entry.date)}</span>
                  {entry.cancellation && <span className="cancel-mark">Peruutettu {entry.cancellation} %</span>}
                  <strong>{entry.clientName}</strong>
                  {meta && <span className="pdf-meta">{meta}</span>}
                </p>
                <strong className="pdf-euro">{formatEuros(entryCents(entry, settings.kmRateCents))}</strong>
              </div>
              {entry.remote ? (
                <p><span className="pdf-label">Ajo</span>Etänä, ei ajoa</p>
              ) : (
                <>
                  <p><span className="pdf-label">Meno</span>{legSummary(entry.outboundStart, entry.outboundEnd, entry.outboundFrom, entry.outboundTo, entry.outboundKmTenths, settings.kmRateCents)}</p>
                  <p><span className="pdf-label">Paluu</span>{legSummary(entry.returnStart, entry.returnEnd, entry.returnFrom, entry.returnTo, entry.returnKmTenths, settings.kmRateCents)}</p>
                </>
              )}
              {entry.template === "opetus" ? (
                <p><span className="pdf-label">Kerrat</span>{sessionText(entry, allEntries)}</p>
              ) : (
                <p><span className="pdf-label">Työ</span>{workText(entry)}</p>
              )}
              {note && <p><span className="pdf-label">Huom</span>{note}</p>}
            </section>
          );
        })}
        <footer className="pdf-total">
          <span>Yhteensä</span>
          {template === "opetus" ? (
            <SessionTotals entries={entries} allEntries={allEntries} />
          ) : (
            <>
              <span>Tilattu {formatTotal(totalOrdered)}</span>
              <span>Toteutettu {formatTotal(totalWork)}</span>
            </>
          )}
          <span>{formatKmLabel(totalKm)}</span>
          <strong>{formatEuros(totalCents)}</strong>
        </footer>
      </article>
    </div>
  );
}

function pdfHeading(scope: PdfScope): string {
  if (scope.kind === "entry") return "Merkinnän PDF";
  if (scope.kind === "client") return "Asiakkaan PDF";
  return "Kuukauden PDF";
}

function pdfSubject(scope: PdfScope, entries: Entry[]): string {
  if (scope.kind === "client") return scope.clientName;
  if (scope.kind === "entry" && entries[0]) return `${entries[0].clientName} ${formatFinnishDate(entries[0].date)}`;
  return "";
}

function pdfHelp(scope: PdfScope): string {
  if (scope.kind === "entry") return "Selain avaa tulostuksen. Valitse tallennus PDF-tiedostoksi. Sivulla on tämä yksi käynti.";
  if (scope.kind === "client") return "Selain avaa tulostuksen. Valitse tallennus PDF-tiedostoksi. Sivulla ovat tämän asiakkaan käynnit tässä kuussa.";
  return "Selain avaa tulostuksen. Valitse tallennus PDF-tiedostoksi. Sivut ovat A4, ja samalle sivulle mahtuu useita merkintöjä.";
}

function SessionTotals({ entries, allEntries }: { entries: Entry[]; allEntries: Entry[] }) {
  const names = new Set(entries.map((entry) => clientKey(entry.clientName)));
  const last = entries[entries.length - 1];
  const balance = names.size === 1 && last ? sessionBalance(allEntries, last) : null;
  if (!balance) return <span>Käytetyt kerrat {entries.reduce((sum, entry) => sum + sessionCountOf(entry), 0)}</span>;
  return (
    <>
      <span>Oppituntikerrat {balance.granted}</span>
      <span>Käytetyt kerrat {balance.used}</span>
      <span>Jäljellä olevat kerrat {balance.remaining}</span>
    </>
  );
}

function sumMinutes(entries: Entry[], minutesOf: (entry: Entry) => number | null): number | null {
  let total = 0;
  let any = false;
  for (const entry of entries) {
    const minutes = minutesOf(entry);
    if (minutes == null) continue;
    any = true;
    total += minutes;
  }
  return any ? total : null;
}

function formatTotal(minutes: number | null): string {
  return minutes == null ? "–" : formatMinutes(minutes);
}

function legSummary(
  start: number | null,
  end: number | null,
  from: string,
  to: string,
  kmTenths: number | null,
  rateCents: number,
): string {
  const route = from && to ? `${from} → ${to}` : from || to;
  const bits = [
    formatRange(start, end),
    kmTenths == null ? "" : formatKmLabel(kmTenths),
    kmTenths == null ? "" : formatEuros(legCents(kmTenths, rateCents)),
    formatDuration(start, end),
    route,
  ].filter(Boolean);
  return bits.join(" · ") || "–";
}

function sessionText(entry: Entry, allEntries: Entry[]): string {
  const balance = sessionBalance(allEntries, entry);
  const here = `Tällä käynnillä ${sessionCountLabel(sessionCountOf(entry))}.`;
  if (!balance) return here;
  return `${here} Oppituntikerrat ${balance.granted}. Käytetyt kerrat ${balance.used}. Jäljellä olevat kerrat ${balance.remaining}.`;
}

function workText(entry: Entry): string {
  const ordered = `${formatRange(entry.orderedStart, entry.orderedEnd)}${formatDuration(entry.orderedStart, entry.orderedEnd) ? ` (${formatDuration(entry.orderedStart, entry.orderedEnd)})` : ""}`;
  if (entry.workMatchesOrder) return `Tilattu ${ordered}, toteutunut sama.`;
  const workedMinutesValue = workedMinutes(entry);
  const worked = workedMinutesValue == null
    ? formatRange(entry.workStart, entry.workEnd)
    : `${formatRange(entry.workStart, entry.workEnd)} (${formatMinutes(workedMinutesValue)})`;
  return `Tilattu ${ordered}, toteutunut ${worked}.`;
}

function noteText(entry: Entry): string {
  return entry.note;
}

function clientMeta(entry: Entry): string {
  const parts = [];
  if (entry.template === "ktt" && entry.orderer) parts.push(`Tilaaja ${entry.orderer}`);
  if (entry.municipality) parts.push(entry.municipality);
  if (entry.template === "opetus") {
    if (entry.validUntil) parts.push(`voimassa ${formatFinnishDate(entry.validUntil)}`);
    if (entry.folderGivenOn) parts.push(`kansio ${formatFinnishDate(entry.folderGivenOn)}`);
  }
  return parts.join(" · ");
}
