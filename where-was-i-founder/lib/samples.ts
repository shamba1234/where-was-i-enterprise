/** Sample proof images, drawn as SVG so the demo works without any files on hand. */
const svg = (body: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">${body}</svg>`)}`;

export const SAMPLE_RUN = {
  name: "run_summary.png",
  size: 184_320,
  type: "image/png",
  thumb: svg(
    `<rect width="160" height="160" rx="18" fill="#1d2b25"/><path d="M18 118 C40 70 62 128 86 82 S128 44 142 58" stroke="#4fae83" stroke-width="5" fill="none" stroke-linecap="round"/><text x="18" y="38" font-family="sans-serif" font-size="22" font-weight="700" fill="#e8f5ee">5.02 km</text><text x="18" y="58" font-family="sans-serif" font-size="12" fill="#8fd6b1">26:41  Tue 7:04 AM</text>`,
  ),
};

export const SAMPLE_ROUTINE = {
  name: "evening_routine.jpg",
  size: 96_210,
  type: "image/jpeg",
  thumb: svg(
    `<rect width="160" height="160" rx="18" fill="#24203a"/><circle cx="118" cy="40" r="16" fill="#e8a33d" opacity=".85"/><circle cx="125" cy="34" r="14" fill="#24203a"/>${[0, 1, 2, 3, 4]
      .map((i) => `<rect x="20" y="${30 + i * 22}" width="12" height="12" rx="3" fill="#4fae83"/><rect x="40" y="${33 + i * 22}" width="${60 - i * 6}" height="6" rx="3" fill="#bdb7cf"/>`)
      .join("")}`,
  ),
};

/** Shrink an uploaded image to a small thumbnail so it can be kept in localStorage. */
export function makeThumb(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = 160;
      const c = document.createElement("canvas");
      c.width = s;
      c.height = s;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(null);
      const r = Math.max(s / img.width, s / img.height);
      ctx.drawImage(img, (s - img.width * r) / 2, (s - img.height * r) / 2, img.width * r, img.height * r);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
