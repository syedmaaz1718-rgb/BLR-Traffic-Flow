import "./style.css";
import model from "../models/model.json";
import { forestPredict } from "./ml.mjs";
import { $, escape, shell, metric, download, lineChart } from "./ui.mjs";
shell({
  name: "BLR Flow",
  logo: "↗",
  tag: "URBAN SYSTEMS / FORECASTING LAB",
  title: "A city in motion.<br><em>A model to inspect.</em>",
  subtitle:
    "Explore how a regression model responds to junction, hour and conditions. A Bengaluru-inspired traffic simulator with transparent assumptions.",
  number: "03",
  theme: "traffic-theme",
});
$("#content").innerHTML =
  `<div class="notice"><strong>SYNTHETIC DATA / NOT LIVE TRAFFIC.</strong> All training and test observations are generated. Junction names give the simulation context; this is not a measured Bengaluru traffic forecast and must not guide travel decisions.</div><div class="traffic-layout"><section class="panel panel-pad"><div class="panel-head"><h2>Set the scenario</h2></div><div class="field-grid"><div class="field field-range"><label for="junction">Junction</label><select id="junction">${model.junctions.map((j, i) => `<option value="${i}">${escape(j)}</option>`).join("")}</select></div><div class="field field-range"><label for="day">Day pattern</label><select id="day"><option value="0">Weekday</option><option value="1">Weekend</option></select></div><div class="field field-range"><label for="hour">Time slot <span id="hour-label">18:00</span></label><input id="hour" type="range" min="0" max="23" value="18" step="1"><div class="scale-labels"><span>00:00</span><span>23:00</span></div></div></div><label class="checkbox"><input id="rain" type="checkbox">Rain scenario</label><label class="checkbox"><input id="event" type="checkbox">Nearby event scenario</label><button id="predict" style="width:100%;margin-top:23px">Simulate traffic ↗</button><div class="model-card"><strong>24-tree random forest</strong><p>17,280 synthetic hourly rows. Time-ordered holdout. Model weights are committed, no server required.</p></div></section><section class="panel traffic-result" id="result" aria-live="polite"></section></div><section class="method"><h3>MODEL CARD / 01</h3><p>Generator combines two rush-hour curves, illustrative junction offsets, weekend reduction, rain/event effects and Gaussian noise. Train: Jan-Mar; test: April. Synthetic holdout MAE ${model.metrics.mae.toFixed(2)} index points, R² ${model.metrics.r2.toFixed(3)}. These metrics validate learning the generator, not real congestion. Index bands are project-defined: under 35 light, 35-64 moderate, 65+ heavy.</p></section>`;
$("#hour").oninput = () =>
  ($("#hour-label").textContent =
    String($("#hour").value).padStart(2, "0") + ":00");
function predict() {
  const junction = Number($("#junction").value),
    weekend = Number($("#day").value),
    hour = Number($("#hour").value),
    rain = +$("#rain").checked,
    event = +$("#event").checked;
  const features = (h) => [
    junction,
    Math.sin((h * 2 * Math.PI) / 24),
    Math.cos((h * 2 * Math.PI) / 24),
    weekend,
    rain,
    event,
  ];
  const values = Array.from({ length: 24 }, (_, h) =>
    forestPredict(features(h), model),
  );
  const score = values[hour],
    band = score >= 65 ? "Heavy" : score >= 35 ? "Moderate" : "Light";
  const best = values.indexOf(Math.min(...values)),
    worst = values.indexOf(Math.max(...values));
  const spread = model.metrics.residual90;
  $("#result").innerHTML =
    `<div class="panel-pad"><div class="panel-head"><div><span class="eyebrow">SIMULATED SCENARIO</span><h2 style="margin-top:9px">${escape(model.junctions[junction])} · ${String(hour).padStart(2, "0")}:00</h2></div><span class="mono">${weekend ? "WEEKEND" : "WEEKDAY"}</span></div><div class="band"><div><span class="eyebrow">CONGESTION BAND</span><strong>${band} movement pressure</strong></div><div class="score">${Math.round(score)}<small style="color:var(--muted)">index / 100</small></div></div><div class="traffic-metrics">${metric("Heuristic range", `${Math.max(0, score - spread).toFixed(0)}–${Math.min(100, score + spread).toFixed(0)}`, "± synthetic test 90th residual")}${metric("Lowest scenario", `${String(best).padStart(2, "0")}:00`, "Minimum simulated index")}${metric("Peak scenario", `${String(worst).padStart(2, "0")}:00`, "Maximum simulated index")}</div><div style="margin-top:25px"><h3>A full day, under the same conditions</h3><span class="small">Congestion index · fixed junction, weather and event settings</span>${lineChart(values, { highlight: hour, label: "Synthetic hourly congestion index" })}</div><div class="heatmap" aria-label="Hourly intensity heatmap">${values.map((v, i) => `<i style="opacity:${0.12 + (v / 100) * 0.88}" title="${i}:00 / ${Math.round(v)}"></i>`).join("")}</div><div class="scale-labels"><span>00:00</span><span>12:00</span><span>23:00</span></div><div class="result-foot"><span class="small">${rain ? "Rain on" : "Rain off"} / ${event ? "Event on" : "Event off"} · synthetic conditions</span><button id="export" class="secondary">Export scenario ↓</button></div><p class="small">The range is a heuristic based on synthetic test errors, not a calibrated forecast interval. No travel time or live road data is available.</p></div>`;
  $("#export").onclick = () =>
    download("blr-flow-scenario.json", {
      junction: model.junctions[junction],
      weekend,
      hour,
      rain,
      event,
      congestionIndex: score,
      hourly: values,
      synthetic: true,
      metrics: model.metrics,
    });
}
$("#predict").onclick = predict;
predict();

document.body.classList.add("city-dashboard");

// Independent live observations. Never use the synthetic forest to label live/future conditions.
const live = document.createElement("section");
live.className = "panel panel-pad live-panel";
live.innerHTML = `<div class="panel-head"><div><span class="eyebrow">REAL ROAD DATA / OPTIONAL API</span><h2 style="margin-top:10px">Live traffic, not a forecast.</h2></div><span class="mono">TOMTOM FLOW</span></div><p class="small">Current estimated speed on the nearest provider road segment. Separate from the synthetic simulator above. Snapshot only; no automatic polling or measured future prediction.</p><div class="live-controls"><div class="field"><label for="live-junction">Location anchor</label><select id="live-junction">${model.junctions.map((j, i) => `<option value="${i}">${escape(j)}</option>`).join("")}</select></div><div class="field"><label for="live-access">Access password <span class="small">(only if operator enabled)</span></label><input id="live-access" type="password" autocomplete="off" maxlength="128" placeholder="Leave blank for public deployments"></div><button id="live-fetch">Fetch live snapshot ↗</button></div><div id="live-result" aria-live="polite"><p class="small">Live mode needs a server deployment and a server-side TOMTOM_API_KEY. Static dist uploads run the synthetic simulator only. Your provider key must never be pasted here.</p></div><p class="small">Traffic data © TomTom. Speeds in km/h; travel times refer only to this road fragment, not your whole route. Segment coverage/direction may vary. Retrieval time is not the provider's observation timestamp. Provider confidence measures its data quality, not ML accuracy.</p>`;
$("#content").append(live);
$("#live-junction").onchange = () => {
  $("#live-result").innerHTML =
    '<p class="small">Location changed. Fetch a new snapshot.</p>';
};
$("#live-fetch").onclick = async () => {
  const btn = $("#live-fetch"),
    index = Number($("#live-junction").value),
    password = $("#live-access").value;
  btn.disabled = true;
  btn.textContent = "Fetching…";
  $("#live-result").innerHTML =
    '<p class="small">Contacting the server for one road-segment observation…</p>';
  try {
    const res = await fetch("/api/traffic", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(password ? { Authorization: `Bearer ${password}` } : {}),
      },
      body: JSON.stringify({ junction: index }),
      signal: AbortSignal.timeout(12000),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(
        "Live endpoint unavailable. Deploy the full source with Netlify Functions; dist-only uploads are synthetic-only.",
      );
    }
    if (!res.ok) throw new Error(data.error || "Live provider unavailable.");
    $("#live-result").innerHTML =
      `<div class="results-head"><div><span class="eyebrow">REAL PROVIDER SNAPSHOT</span><h2>${escape(model.junctions[index])}</h2><p class="small">Retrieved ${escape(new Date(data.retrievedAt).toLocaleString())}. Re-fetch for a newer snapshot.</p></div><div class="score">${data.currentSpeed}<small>km/h now</small></div></div><div class="metric-grid">${metric("Free-flow speed", data.freeFlowSpeed + " km/h", "Provider reference speed")}${metric("Segment travel time", data.currentTravelTime + " s", "Free-flow: " + data.freeFlowTravelTime + " s")}${metric("Provider confidence", (data.confidence * 100).toFixed(0) + "%", "Road closed: " + (data.roadClosure ? "yes" : "no"))}</div><p class="small">Nearest segment to ${data.point.map((x) => x.toFixed(5)).join(", ")}. No predicted future values, route recommendation or synthetic substitution. Data © TomTom. This snapshot can become stale immediately.</p>`;
  } catch (e) {
    $("#live-result").innerHTML =
      `<p class="error" role="alert">${escape(e.message)}</p><p class="small">The simulator above remains available and explicitly synthetic.</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Fetch live snapshot ↗";
  }
};
