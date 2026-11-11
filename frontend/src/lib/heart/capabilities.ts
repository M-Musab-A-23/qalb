/** True when the browser can create a WebGL context. Client only. */
export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    if (!gl) return false;
    // Release the probe context straight away so it does not count against
    // the browser's limit on live contexts.
    (gl as WebGLRenderingContext)
      .getExtension("WEBGL_lose_context")
      ?.loseContext();
    return true;
  } catch {
    return false;
  }
}

type NetworkInformation = { saveData?: boolean };

/** True when the visitor asked the browser to use less data. Client only. */
export function prefersReducedData(): boolean {
  try {
    const connection = (navigator as Navigator & {
      connection?: NetworkInformation;
    }).connection;
    if (connection?.saveData === true) return true;
    return window.matchMedia("(prefers-reduced-data: reduce)").matches;
  } catch {
    return false;
  }
}
