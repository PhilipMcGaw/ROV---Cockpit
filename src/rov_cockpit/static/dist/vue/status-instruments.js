import { createApp, defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";
import { TOPICS } from "../telemetry/topics.js";
const statusInstrument = (icon, label, topic, format) => defineComponent({
    name: `${label.replace(/\s/g, "")}Instrument`,
    setup() {
        const value = ref(null);
        let unsubscribe;
        onMounted(() => { const store = window.rovCockpitTelemetry; if (store)
            unsubscribe = store.subscribe(update => { value.value = update.state.values.get(topic) ?? null; }); });
        onBeforeUnmount(() => unsubscribe?.());
        return () => h("div", { class: ["rov-instrument", value.value === null ? "rov-instrument--unavailable" : "rov-instrument--available"], role: "status", "aria-live": "polite" }, [h("i", { class: `fa-solid ${icon}`, "aria-hidden": "true" }), label ? h("span", { class: "rov-instrument__label" }, label) : null, h("output", { class: "rov-instrument__value" }, format(value.value))]);
    },
});
export const RovBatteryVue = defineComponent({
    name: "BatteryInstrument",
    setup() {
        const value = ref(null);
        let unsubscribe;
        onMounted(() => { const store = window.rovCockpitTelemetry; if (store)
            unsubscribe = store.subscribe(update => { value.value = update.state.values.get(TOPICS.batteryPercentage) ?? null; }); });
        onBeforeUnmount(() => unsubscribe?.());
        return () => {
            if (value.value === null || !Number.isFinite(Number(value.value)))
                return h("div", { class: ["rov-instrument", "rov-instrument--unavailable", "rov-battery"], role: "status", "aria-live": "polite" }, [h("i", { class: "fa-solid fa-battery-empty", "aria-hidden": "true" }), h("span", { class: "rov-instrument__value" }, "-- %")]);
            const raw = Number(value.value);
            // Robot battery telemetry is strictly a percentage in the 0–100 range.
            const clamped = Math.max(0, Math.min(100, Math.round(raw)));
            const icon = clamped >= 90 ? "fa-battery-full" : clamped >= 65 ? "fa-battery-three-quarters" : clamped >= 35 ? "fa-battery-half" : clamped >= 10 ? "fa-battery-quarter" : "fa-battery-empty";
            const level = clamped <= 10 ? "critical" : clamped <= 25 ? "low" : "normal";
            return h("div", { class: ["rov-instrument", "rov-instrument--available", "rov-battery", `rov-battery--${level}`], role: "status", "aria-live": "polite" }, [h("i", { class: ["fa-solid", icon], "aria-hidden": "true" }), h("span", { class: "rov-instrument__value" }, `${clamped} %`)]);
        };
    },
});
export const RovVoltageVue = statusInstrument("fa-bolt", "", TOPICS.voltage, value => value !== null && Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)} V` : "-- V");
export const mountVueStatusInstrument = (target, component) => { const app = createApp(component); app.mount(target); return () => app.unmount(); };
//# sourceMappingURL=status-instruments.js.map