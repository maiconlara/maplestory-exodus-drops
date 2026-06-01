import { gunzipSync } from "fflate";
import { PACKED } from "./packed.js";

// The dataset ships gzip+base64-encoded (packed.js) and is decoded here at
// runtime. It is intentionally NOT placed on window. This only obscures casual
// access — a determined user can still read it via the console/breakpoints,
// since the browser must reconstruct it in memory to render the page.
const bytes = Uint8Array.from(atob(PACKED), (c) => c.charCodeAt(0));
export const D = JSON.parse(new TextDecoder().decode(gunzipSync(bytes)));
