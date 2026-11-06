export type TemplateId = "monetra" | "opetus" | "ktt";

export type Cancellation = "100" | "50" | "0";

export type Entry = {
  id: string;
  template: TemplateId;
  date: string;
  clientName: string;
  municipality: string;
  orderer: string;
  grantedHours: string;
  validUntil: string;
  folderGivenOn: string;
  orderedStart: number | null;
  orderedEnd: number | null;
  workStart: number | null;
  workEnd: number | null;
  workMatchesOrder: boolean;
  outboundStart: number | null;
  outboundEnd: number | null;
  outboundFrom: string;
  outboundTo: string;
  outboundKmTenths: number | null;
  returnStart: number | null;
  returnEnd: number | null;
  returnFrom: string;
  returnTo: string;
  returnKmTenths: number | null;
  remote: boolean;
  cancellation: Cancellation | null;
  sessionCount: number;
  note: string;
};

export type Settings = {
  workerName: string;
  kmRateCents: number;
};

export type StoredData = {
  entries: Entry[];
  settings: Settings;
};

export const TEMPLATES: Array<{
  id: TemplateId;
  label: string;
  noteLabel: string;
  notePlaceholder: string;
}> = [
  {
    id: "monetra",
    label: "Monetra",
    noteLabel: "Lisätiedot",
    notePlaceholder: "Lisätieto käynnistä",
  },
  {
    id: "opetus",
    label: "Opetus",
    noteLabel: "Lisätiedot",
    notePlaceholder: "Lisätieto käynnistä",
  },
  {
    id: "ktt",
    label: "KTT",
    noteLabel: "Lisätiedot",
    notePlaceholder: "Lisätieto käynnistä",
  },
];

export function templateInfo(id: TemplateId) {
  const found = TEMPLATES.find((item) => item.id === id);
  if (!found) throw new Error(`Tuntematon pohja: ${id}`);
  return found;
}

export function defaultSettings(): Settings {
  return {
    workerName: "",
    kmRateCents: 55,
  };
}

export function emptyEntry(template: TemplateId, date = ""): Entry {
  return {
    id: crypto.randomUUID(),
    template,
    date,
    clientName: "",
    municipality: "",
    orderer: "",
    grantedHours: "",
    validUntil: "",
    folderGivenOn: "",
    orderedStart: null,
    orderedEnd: null,
    workStart: null,
    workEnd: null,
    workMatchesOrder: false,
    outboundStart: null,
    outboundEnd: null,
    outboundFrom: "",
    outboundTo: "",
    outboundKmTenths: null,
    returnStart: null,
    returnEnd: null,
    returnFrom: "",
    returnTo: "",
    returnKmTenths: null,
    remote: false,
    cancellation: null,
    sessionCount: 1,
    note: "",
  };
}
