import { defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";
import { TOPICS } from "../telemetry/topics.js";

const numberValue = (value: string | null, unit: string, precision = 1): string => {
  const numeric = value === null ? Number.NaN : Number(value);
  return Number.isFinite(numeric) ? `${numeric.toFixed(precision)}${unit}` : `--${unit}`;
};

const signedAngle = (value: string | null): string => {
  const numeric = value === null ? Number.NaN : Number(value);
  if (!Number.isFinite(numeric)) return "--°";
  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(1)}°`;
};

export const RovTelemetryConnectionVue = defineComponent({
  name: "TelemetryConnectionInstrument",
  setup() {
    const connected = ref(false);
    let unsubscribe: (() => void) | undefined;
    onMounted(() => {
      const store = window.rovCockpitTelemetry;
      if (store) unsubscribe = store.subscribe(update => { connected.value = update.state.connected; });
    });
    onBeforeUnmount(() => unsubscribe?.());
    return () => h("span", {
      class: ["rov-link-status", connected.value ? "rov-link-status--connected" : "rov-link-status--offline"],
      role: "status",
      title: connected.value ? "Cockpit telemetry link connected" : "Cockpit telemetry link unavailable",
    }, [h("i", { class: "fa-solid fa-circle", "aria-hidden": "true" }), h("span", "Link")]);
  },
});

export const RovLiveDockVue = defineComponent({
  name: "LiveCommandDock",
  setup() {
    const depth = ref<string | null>(null);
    const heading = ref<string | null>(null);
    const roll = ref<string | null>(null);
    const pitch = ref<string | null>(null);
    const lightPercentage = ref<string | null>(null);
    const cameraPitch = ref<string | null>(null);
    const waterTemperature = ref<string | null>(null);
    let unsubscribe: (() => void) | undefined;

    onMounted(() => {
      const store = window.rovCockpitTelemetry;
      if (store) unsubscribe = store.subscribe(update => {
        depth.value = update.state.values.get(TOPICS.depth) ?? null;
        heading.value = update.state.values.get(TOPICS.heading) ?? null;
        roll.value = update.state.values.get(TOPICS.roll) ?? null;
        pitch.value = update.state.values.get(TOPICS.pitch) ?? null;
        lightPercentage.value = update.state.values.get(TOPICS.lightPercentage) ?? null;
        cameraPitch.value = update.state.values.get(TOPICS.cameraPitch) ?? null;
        waterTemperature.value = update.state.values.get(TOPICS.temperature) ?? null;
      });
    });
    onBeforeUnmount(() => unsubscribe?.());

    const metric = (icon: string, label: string, value: string) => h("div", { class: "rov-command-dock__metric" }, [
      h("i", { class: `fa-solid ${icon}`, "aria-hidden": "true" }),
      h("span", { class: "rov-command-dock__metric-copy" }, [
        h("output", value),
        h("small", label),
      ]),
    ]);

    return () => h("aside", { class: "rov-command-dock", "aria-label": "Live-view status" }, [
      h("div", { class: "rov-command-dock__view" }, [
        h("i", { class: "fa-solid fa-video", "aria-hidden": "true" }),
        h("span", "Live view"),
        h("small", "Front camera"),
      ]),
      h("div", { class: "rov-command-dock__metrics", "aria-label": "Live navigation data" }, [
        metric("fa-water", "Depth", numberValue(depth.value, " m")),
        metric("fa-compass", "Heading", numberValue(heading.value, "°", 0)),
        metric("fa-arrow-rotate-right", "Roll", numberValue(roll.value, "°")),
        metric("fa-arrow-up", "Pitch", numberValue(pitch.value, "°")),
        metric("fa-lightbulb", "Lights", numberValue(lightPercentage.value, " %", 0)),
        metric("fa-camera-rotate", "Camera tilt", signedAngle(cameraPitch.value)),
        metric("fa-temperature-half", "Water temp", numberValue(waterTemperature.value, " °C")),
      ]),
      h("div", { class: "rov-command-dock__control-state", title: "Profile-defined control commands will be added here" }, [
        h("span", { class: "rov-command-dock__safety" }, [h("i", { class: "fa-solid fa-shield-halved", "aria-hidden": "true" }), "Control pending"]),
        h("span", { class: "rov-command-dock__mode" }, "Profile controls"),
      ]),
    ]);
  },
});
