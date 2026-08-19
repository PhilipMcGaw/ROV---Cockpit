import { createApp, h, onBeforeUnmount, onMounted } from "vue";
/**
 * Vue migration seam for the existing HUD.
 *
 * The custom element remains the compatibility boundary until the full HUD
 * renderer is ported. This lets Vue own lifecycle and composition without
 * changing the FastAPI/WebSocket/NATS contract.
 */
const RovHudAdapter = {
    name: "RovHudAdapter",
    setup() {
        let element;
        onMounted(() => { element = document.querySelector("rov-hud") ?? undefined; });
        onBeforeUnmount(() => { element = undefined; });
        return () => h("rov-hud", { "aria-label": "ROV navigation HUD" });
    },
};
export const mountRovHudVueAdapter = (target) => {
    const app = createApp(RovHudAdapter);
    app.mount(target);
    return () => app.unmount();
};
//# sourceMappingURL=rov-hud-adapter.js.map