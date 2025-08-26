import ical from "node-ical";
import { DateTime } from "luxon";

const TZ = "America/Sao_Paulo";

function asText(v) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function eventToJson(ev) {
  const isDateOnly =
    (ev.start && ev.start.isDate === true) ||
    (ev.end && ev.end.isDate === true);

  const startISO = ev.start
    ? DateTime.fromJSDate(ev.start, { zone: "utc" }).setZone(TZ).toISO()
    : null;

  const endISO = ev.end
    ? DateTime.fromJSDate(ev.end, { zone: "utc" }).setZone(TZ).toISO()
    : startISO;

  const id =
    asText(ev.uid) ||
    `${asText(ev.summary)}:${startISO || ""}:${endISO || ""}`;

  return {
    id,
    title: asText(ev.summary) || "(sem título)",
    location: asText(ev.location),
    description: asText(ev.description),
    start: startISO,
    end: endISO,
    allDay: Boolean(isDateOnly),
    source: "ics"
  };
}
export async function fetchIcsFrom(url) {
  try {
    if (!url || !/^https?:\/\//i.test(url)) return [];
    const data = await ical.async.fromURL(url, { timeout: 15000 });
    const out = [];
    for (const key in data) {
      const item = data[key];
      if (item?.type === "VEVENT") {
        out.push(eventToJson(item));
      }
    }
    return out;
  } catch (err) {
    const code = err?.code || err?.name || "ICS_ERROR";
    console.warn(`[ICS] Falha ao buscar ${url} :: ${code} :: ${err?.message}`);
    return [];
  }
}
export async function unifiedIcs({ googleUrl, outlookUrl }) {
  const [g, o] = await Promise.all([fetchIcsFrom(googleUrl), fetchIcsFrom(outlookUrl)]);
  const map = new Map();
  for (const ev of [...g, ...o]) {
    if (!ev?.id) continue;
    if (!map.has(ev.id)) map.set(ev.id, ev);
  }
  return Array.from(map.values());
}
