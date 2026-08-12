import { RovAttitude } from "./rov-attitude.js";
export class RovPitch extends RovAttitude {}
customElements.get("rov-pitch") || customElements.define("rov-pitch", RovPitch);
