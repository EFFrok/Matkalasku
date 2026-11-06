import { useRef, useState } from "react";
import { clearDriving, clientNames, entryCents, entryKmTenths, matchingClient, sessionBalance, usesOrderedHours } from "../domain/entries";
import { formatEuros, formatKmLabel, formatRate, legCents } from "../domain/money";
import { formatDuration } from "../domain/time";
import type { Entry, Settings } from "../domain/types";
import { templateInfo } from "../domain/types";
import { drivingDistanceKmTenths } from "../routing/ors";
import { KmField, TextField, TimeField } from "./fields";

export function EntryScreen({
  entry,
  entries,
  settings,
  mode,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  entry: Entry;
  entries: Entry[];
  settings: Settings;
  mode: "new" | "edit" | "copy";
  onChange: (next: Entry | ((current: Entry) => Entry)) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (() => void) | null;
}) {
  const info = templateInfo(entry.template);
  const knownClient = matchingClient(entries, entry.template, entry.clientName, entry.id);
  const [error, setError] = useState("");
  const [looking, setLooking] = useState<"out" | "return" | null>(null);
  const request = useRef(0);
  const cents = entryCents(entry, settings.kmRateCents);
  const km = entryKmTenths(entry);

  function patch(partial: Partial<Entry>) {
    onChange({ ...entry, ...partial });
  }

  function setRemote(remote: boolean) {
    request.current += 1;
    setLooking(null);
    onChange(remote ? { ...clearDriving(entry), remote: true } : { ...entry, remote: false });
  }

  async function lookup(leg: "out" | "return") {
    const from = leg === "out" ? entry.outboundFrom : entry.returnFrom;
    const to = leg === "out" ? entry.outboundTo : entry.returnTo;
    const id = ++request.current;
    setError("");
    setLooking(leg);
    try {
      const tenths = await drivingDistanceKmTenths(from, to);
      if (id !== request.current) return;
      onChange((current) => (
        current.remote
          ? current
          : { ...current, ...(leg === "out" ? { outboundKmTenths: tenths } : { returnKmTenths: tenths }) }
      ));
    } catch (caught) {
      if (id !== request.current) return;
      setError(caught instanceof Error ? caught.message : "Kilometrejä ei voitu hakea.");
    } finally {
      if (id === request.current) setLooking(null);
    }
  }

  function save() {
    if (!entry.date) {
      setError("Lisää päivämäärä.");
      return;
    }
    if (!entry.clientName.trim()) {
      setError("Lisää asiakkaan nimi.");
      return;
    }
    setError("");
    onSave();
  }

  return (
    <form
      className="entry"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <header className="page-head">
        <div>
          <p className={`kicker ${entry.template}`}>{info.label}</p>
          <h1>{mode === "edit" ? "Muokkaa merkintää" : "Uusi merkintä"}</h1>
        </div>
        <div className="row-actions">
          <button className="ghost" type="button" onClick={onCancel}>Peruuta</button>
          <button className="primary" type="submit">Tallenna</button>
        </div>
      </header>

      {mode === "copy" && (
        <p className="notice">{copyNotice(entry.template)}</p>
      )}
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Asiakas</h2>
        <div className="fields">
          <TextField
            label="Asiakas"
            value={entry.clientName}
            placeholder="Antti Asiakas"
            suggestions={clientNames(entries, entry.template)}
            onChange={(clientName) => patch(withKnownClient(entries, entry, clientName))}
          />
          {entry.template === "ktt" && (
            <TextField label="Tilaaja" value={entry.orderer} placeholder="Helsingin kaupunki" onChange={(orderer) => patch({ orderer })} />
          )}
          <TextField label="Kunta" value={entry.municipality} placeholder="Helsinki" onChange={(municipality) => patch({ municipality })} />
          {entry.template === "opetus" && (
            <>
              <TextField
                label="Oppituntikerrat"
                value={entry.grantedHours}
                placeholder="10"
                onChange={(grantedHours) => patch({ grantedHours })}
              />
              <label>
                Maksusitoumus voimassa asti
                <input type="date" value={entry.validUntil} onChange={(event) => patch({ validUntil: event.target.value })} />
              </label>
              <label className="wide">
                Tukiviittomia iloisesti oppien -kansio annettu
                <input type="date" value={entry.folderGivenOn} onChange={(event) => patch({ folderGivenOn: event.target.value })} />
              </label>
            </>
          )}
        </div>
        {entry.template === "opetus" && knownClient && <p className="notice">Käynti liitetään aiempaan asiakkaaseen {knownClient.clientName}.</p>}
        {entry.template === "opetus" && <CommitmentLine entry={entry} entries={entries} />}
      </section>

      <section className="card">
        <h2>Käynti</h2>
        <div className="fields">
          <label>
            Päivä
            <input type="date" value={entry.date} onChange={(event) => patch({ date: event.target.value })} />
          </label>
          {entry.template === "opetus" && (
            <label>
              Kerrat tällä käynnillä
              <select
                value={entry.sessionCount}
                onChange={(event) => patch({ sessionCount: Number(event.target.value) })}
              >
                {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>{count === 1 ? "1 kerta" : `${count} kertaa`}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            Peruutettu
            <select
              value={entry.cancellation ?? ""}
              onChange={(event) => patch({ cancellation: event.target.value === "" ? null : (event.target.value as Entry["cancellation"]) })}
            >
              <option value="">Ei</option>
              <option value="100">Peruutettu 100 %</option>
              <option value="50">Peruutettu 50 %</option>
              <option value="0">Peruutettu 0 %</option>
            </select>
          </label>
          <label className="check wide">
            <input type="checkbox" checked={entry.remote} onChange={(event) => setRemote(event.target.checked)} />
            Etänä
          </label>
        </div>
        {entry.remote && <p className="notice">Etäkäynnissä ajoajat, reitti ja kilometrit tyhjennetään. Korvausta ei lasketa.</p>}
      </section>

      {!entry.remote && (
        <div className="legs">
          <section className="card">
            <h2>Meno</h2>
            <div className="fields">
              <TimeField label="Lähtö" minutes={entry.outboundStart} placeholder="07.30" onChange={(outboundStart) => patch({ outboundStart })} />
              <TimeField label="Saapuminen" minutes={entry.outboundEnd} placeholder="08.10" onChange={(outboundEnd) => patch({ outboundEnd })} />
              <TextField wide label="Lähtöosoite" value={entry.outboundFrom} placeholder="Kotikatu 1, Helsinki" onChange={(outboundFrom) => patch({ outboundFrom })} />
              <TextField wide label="Kohde" value={entry.outboundTo} placeholder="Opetuskatu 1, Helsinki" onChange={(outboundTo) => patch({ outboundTo })} />
              <KmField label="Kilometrit" tenths={entry.outboundKmTenths} onChange={(outboundKmTenths) => patch({ outboundKmTenths })} />
              <div className="field-action">
                <button className="ghost" type="button" disabled={looking != null} onClick={() => void lookup("out")}>
                  {looking === "out" ? "Haetaan…" : "Hae kilometrit"}
                </button>
              </div>
            </div>
            <p className="muted">{formatDuration(entry.outboundStart, entry.outboundEnd) || "Matka-aika näkyy, kun molemmat kellonajat on täytetty."}</p>
            {entry.outboundFrom && entry.outboundTo && entry.outboundKmTenths == null && (
              <p className="warning">Osoitteet on täytetty, mutta menon kilometrit puuttuvat.</p>
            )}
          </section>

          <section className="card">
            <div className="section-title">
              <h2>Paluu</h2>
              <button
                className="ghost tiny"
                type="button"
                onClick={() => patch({
                  returnFrom: entry.outboundTo,
                  returnTo: entry.outboundFrom,
                  returnKmTenths: entry.outboundKmTenths,
                })}
              >
                Täytä menosta
              </button>
            </div>
            <div className="fields">
              <TimeField label="Lähtö" minutes={entry.returnStart} placeholder="15.00" onChange={(returnStart) => patch({ returnStart })} />
              <TimeField label="Saapuminen" minutes={entry.returnEnd} placeholder="15.40" onChange={(returnEnd) => patch({ returnEnd })} />
              <TextField wide label="Lähtöosoite" value={entry.returnFrom} placeholder="Opetuskatu 1, Helsinki" onChange={(returnFrom) => patch({ returnFrom })} />
              <TextField wide label="Määränpää" value={entry.returnTo} placeholder="Kotikatu 1, Helsinki" onChange={(returnTo) => patch({ returnTo })} />
              <KmField label="Kilometrit" tenths={entry.returnKmTenths} onChange={(returnKmTenths) => patch({ returnKmTenths })} />
              <div className="field-action">
                <button className="ghost" type="button" disabled={looking != null} onClick={() => void lookup("return")}>
                  {looking === "return" ? "Haetaan…" : "Hae kilometrit"}
                </button>
              </div>
            </div>
            <p className="muted">{formatDuration(entry.returnStart, entry.returnEnd) || "Matka-aika näkyy, kun molemmat kellonajat on täytetty."}</p>
            {entry.returnFrom && entry.returnTo && entry.returnKmTenths == null && (
              <p className="warning">Osoitteet on täytetty, mutta paluun kilometrit puuttuvat.</p>
            )}
          </section>
        </div>
      )}

      <WorkSection entry={entry} onPatch={patch} />

      <section className="card">
        <h2>{info.noteLabel}</h2>
        <label className="wide">
          {info.noteLabel}
          <textarea rows={3} value={entry.note} placeholder={info.notePlaceholder} onChange={(event) => patch({ note: event.target.value })} />
        </label>
      </section>

      <section className="summary">
        <span>Kilometrikorvaus {formatRate(settings.kmRateCents)} €/km</span>
        <span>Meno {formatEuros(entry.remote ? 0 : legCents(entry.outboundKmTenths, settings.kmRateCents))}</span>
        <span>Paluu {formatEuros(entry.remote ? 0 : legCents(entry.returnKmTenths, settings.kmRateCents))}</span>
        <strong>{formatKmLabel(entry.remote ? 0 : km)} · {formatEuros(cents)}</strong>
      </section>

      <div className="form-footer">
        {onDelete && (
          <button className="ghost danger" type="button" onClick={onDelete}>Poista merkintä</button>
        )}
        <div className="row-actions">
          <button className="ghost" type="button" onClick={onCancel}>Peruuta</button>
          <button className="primary" type="submit">Tallenna</button>
        </div>
      </div>
    </form>
  );
}

function withKnownClient(entries: Entry[], entry: Entry, clientName: string): Partial<Entry> {
  const match = matchingClient(entries, entry.template, clientName, entry.id);
  if (!match) return { clientName };
  return {
    clientName,
    municipality: entry.municipality.trim() ? entry.municipality : match.municipality,
    orderer: entry.orderer.trim() ? entry.orderer : match.orderer,
    grantedHours: entry.grantedHours.trim() ? entry.grantedHours : match.grantedHours,
    validUntil: entry.validUntil || match.validUntil,
    folderGivenOn: entry.folderGivenOn || match.folderGivenOn,
  };
}

function copyNotice(template: Entry["template"]): string {
  if (template === "opetus") return "Asiakas, oppituntikerrat ja reitti kopioitiin. Päivä ja kellonajat ovat tyhjät.";
  if (template === "ktt") return "Asiakas, tilaaja ja reitti kopioitiin. Päivä ja kellonajat ovat tyhjät.";
  return "Asiakas ja reitti kopioitiin. Päivä ja kellonajat ovat tyhjät.";
}

function CommitmentLine({ entry, entries }: { entry: Entry; entries: Entry[] }) {
  const balance = sessionBalance(entries, entry);
  if (!balance) return <p className="muted">Käynti käyttää valitun määrän oppitunteja. Aiemmat kuukaudet lasketaan mukaan.</p>;
  const over = balance.remaining < 0;
  return (
    <p className={over ? "warning" : "notice"}>
      Oppituntikerrat {balance.granted} · käytetyt kerrat {balance.used} · jäljellä olevat kerrat {balance.remaining}
    </p>
  );
}

function WorkSection({
  entry,
  onPatch,
}: {
  entry: Entry;
  onPatch: (partial: Partial<Entry>) => void;
}) {
  if (entry.template === "opetus" || !usesOrderedHours(entry.template)) return null;
  return (
    <section className="card">
      <h2>Tunnit</h2>
      <p className="leg-label">Tilatut tunnit</p>
      <div className="fields">
        <TimeField label="Alkoi" minutes={entry.orderedStart} placeholder="09.00" onChange={(orderedStart) => onPatch({ orderedStart })} />
        <TimeField label="Päättyi" minutes={entry.orderedEnd} placeholder="11.00" onChange={(orderedEnd) => onPatch({ orderedEnd })} />
      </div>
      <p className="muted">{formatDuration(entry.orderedStart, entry.orderedEnd) || "Kesto näkyy, kun molemmat kellonajat on täytetty."}</p>
      <label className="check wide">
        <input
          type="checkbox"
          checked={entry.workMatchesOrder}
          onChange={(event) => onPatch({
            workMatchesOrder: event.target.checked,
            ...(event.target.checked ? { workStart: null, workEnd: null } : {}),
          })}
        />
        Toteutuneet tunnit ovat samat
      </label>
      {!entry.workMatchesOrder && (
        <>
          <p className="leg-label">Toteutuneet tunnit</p>
          <div className="fields">
            <TimeField label="Alkoi" minutes={entry.workStart} placeholder="09.00" onChange={(workStart) => onPatch({ workStart })} />
            <TimeField label="Päättyi" minutes={entry.workEnd} placeholder="10.30" onChange={(workEnd) => onPatch({ workEnd })} />
          </div>
          <p className="muted">{formatDuration(entry.workStart, entry.workEnd) || "Kesto näkyy, kun molemmat kellonajat on täytetty."}</p>
        </>
      )}
    </section>
  );
}
