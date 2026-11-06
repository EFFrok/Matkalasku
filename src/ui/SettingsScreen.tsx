import { useState } from "react";
import { formatRate, parseEuroToCents } from "../domain/money";
import type { Settings } from "../domain/types";

export function SettingsScreen({
  settings,
  onSave,
  onBack,
}: {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onBack: () => void;
}) {
  const [workerName, setWorkerName] = useState(settings.workerName);
  const [rateText, setRateText] = useState(formatRate(settings.kmRateCents));
  const [error, setError] = useState("");

  function save() {
    const kmRateCents = parseEuroToCents(rateText);
    if (kmRateCents == null) {
      setError("Kirjoita korvaus euroina, esimerkiksi 0,55.");
      return;
    }
    setError("");
    onSave({
      workerName: workerName.trim(),
      kmRateCents,
    });
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
          <p className="kicker">Asetukset</p>
          <h1>Tiedot</h1>
        </div>
        <div className="row-actions">
          <button className="ghost" type="button" onClick={onBack}>Takaisin</button>
          <button className="primary" type="submit">Tallenna</button>
        </div>
      </header>
      {error && <p className="error">{error}</p>}
      <section className="card">
        <div className="fields">
          <label className="wide">
            Oma nimi
            <input value={workerName} placeholder="Pekka Pouta" onChange={(event) => setWorkerName(event.target.value)} />
          </label>
          <label>
            Kilometrikorvaus €/km
            <input inputMode="decimal" value={rateText} placeholder="0,55" onChange={(event) => setRateText(event.target.value)} />
          </label>
        </div>
      </section>
    </form>
  );
}
