import { createApp, h, onBeforeUnmount, onMounted, type Component } from "vue";

/**
 * Vue migration seam for the existing HUD.
 *
 * The custom element remains the compatibility boundary until the full HUD
 * renderer is ported. This lets Vue own lifecycle and composition without
 * changing the FastAPI/WebSocket/NATS contract.
 */
const RovHudAdapter: Component = {
  name: "RovHudAdapter",
  setup() {
    let element: HTMLElement | undefined;
    onMounted(() => { element = document.querySelector<HTMLElement>("rov-hud") ?? undefined; });
    onBeforeUnmount(() => { element = undefined; });
    return () => h("rov-hud", { "aria-label": "ROV navigation HUD" });
  },
};

export const mountRovHudVueAdapter = (target: Element): (() => void) => {
  const app = createApp(RovHudAdapter);
  app.mount(target);
  return () => app.unmount();
};
