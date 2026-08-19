import { createApp, defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";
import { TOPICS } from "../telemetry/topics.js";

const statusInstrument = (icon: string, label: string, topic: string, format: (value: string | null) => string) => defineComponent({
  name: `${label.replace(/\s/g, "")}Instrument`,
  setup() {
    const value = ref<string | null>(null); let unsubscribe: (() => void) | undefined;
    onMounted(() => { const store = window.rovCockpitTelemetry; if (store) unsubscribe = store.subscribe(update => { value.value = update.state.values.get(topic) ?? null; }); });
    onBeforeUnmount(() => unsubscribe?.());
    return () => h("div", { class: ["rov-instrument", value.value === null ? "rov-instrument--unavailable" : "rov-instrument--available"], role: "status", "aria-live": "polite" }, [h("i", { class: `fa-solid ${icon}`, "aria-hidden": "true" }), h("span", { class: "rov-instrument__label" }, label), h("output", { class: "rov-instrument__value" }, format(value.value))]);
  },
});

export const RovBatteryVue = statusInstrument("fa-battery-half", "Battery", TOPICS.batteryPercentage, value => value !== null && Number.isFinite(Number(value)) ? `${Math.max(0, Math.min(100, Math.round(Number(value) * 10)))} %` : "Unavailable");
export const mountVueStatusInstrument = (target: Element, component: ReturnType<typeof defineComponent>): (() => void) => { const app = createApp(component); app.mount(target); return () => app.unmount(); };
