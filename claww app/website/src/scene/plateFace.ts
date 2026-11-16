import * as THREE from 'three';

/**
 * The face of a plate as a canvas texture: the weight stamped at the top and
 * CLAWW at the bottom, both following the curve, the way real plates are
 * cast. Drawn with the page's Archivo, so call it after the font has loaded.
 */
export function plateFaceTexture(kg: number, inner: number, outer: number): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const cx = size / 2;
  const scale = size / 2 / outer;
  const rMid = ((inner + outer) / 2) * scale;
  const band = (outer - inner) * scale;

  // A raised ring line near the rim and one near the hub, like a cast plate.
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.lineWidth = band * 0.035;
  g.beginPath();
  g.arc(cx, cx, outer * scale - band * 0.12, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(cx, cx, inner * scale + band * 0.1, 0, Math.PI * 2);
  g.stroke();

  const label = `${kg % 1 === 0 ? kg : kg.toFixed(2).replace(/0$/, '')} KG`;
  arcText(g, label, cx, rMid, -Math.PI / 2, band * 0.36, true);
  arcText(g, 'CLAWW', cx, rMid, Math.PI / 2, band * 0.22, false);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Text along a circle, centred on `angle`. Top text reads clockwise, bottom text reads counter-clockwise so both stay upright. */
function arcText(g: CanvasRenderingContext2D, text: string, cx: number, r: number, angle: number, px: number, top: boolean) {
  g.save();
  g.fillStyle = 'rgba(255,255,255,0.86)';
  g.font = `900 ${px}px Archivo`;
  (g as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = 'condensed';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const spacing = px * 0.12;
  const widths = [...text].map((ch) => g.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  let a = angle + (top ? -1 : 1) * (total / 2 / r);
  for (let i = 0; i < text.length; i++) {
    const w = widths[i];
    const mid = a + (top ? 1 : -1) * ((w - spacing) / 2 / r);
    g.save();
    g.translate(cx + Math.cos(mid) * r, cx + Math.sin(mid) * r);
    g.rotate(mid + (top ? Math.PI / 2 : -Math.PI / 2));
    g.fillText(text[i], 0, 0);
    g.restore();
    a += (top ? 1 : -1) * (w / r);
  }
  g.restore();
}
