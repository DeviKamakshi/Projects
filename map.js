/**
 * HydroShield AI - Perfect Map Renderer
 * Guarantees 100% beautiful visual rendering for river, radar sweep, flood zone, and evacuation paths.
 */

export class MapRenderer {
  constructor(containerId, telemetryEngine) {
    this.container = document.getElementById(containerId);
    this.telemetry = telemetryEngine;
    this.radarAngle = 0;

    // Ensure we have a valid canvas inside container
    this.canvas = this.container.querySelector('canvas');
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'flood-map-canvas';
      this.container.appendChild(this.canvas);
    }
    this.ctx = this.canvas.getContext('2d');

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.telemetry.onChange(() => this.draw());

    this.startAnimationLoop();
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.container || this.canvas.parentElement;
    this.width = this.canvas.width = parent.clientWidth || 800;
    this.height = this.canvas.height = parent.clientHeight || 450;
  }

  startAnimationLoop() {
    const render = () => {
      this.draw();
      this.radarAngle += 0.02;
      requestAnimationFrame(render);
    };
    render();
  }

  draw() {
    if (!this.ctx) return;
    const { ctx, width, height } = this;
    const { riskTier, riverLevel, locationName, blockedRoad, safeRoute, shelter } = this.telemetry.state;

    // 1. Dark Background
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, 0, width, height);

    // 2. Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // 3. Draw River
    const isFlooding = riskTier >= 2;
    const riverWidth = 16 + (riverLevel * 7);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(width * 0.1, height * 0.1);
    ctx.bezierCurveTo(width * 0.35, height * 0.4, width * 0.55, height * 0.2, width * 0.9, height * 0.9);
    
    ctx.strokeStyle = isFlooding ? 'rgba(239, 68, 68, 0.75)' : 'rgba(59, 130, 246, 0.75)';
    ctx.lineWidth = riverWidth;
    ctx.stroke();

    ctx.strokeStyle = isFlooding ? '#fca5a5' : '#93c5fd';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 4. Flood Hazard Polygon (Red Shape)
    if (riverLevel > 2.0 || riskTier > 0) {
      const expansion = Math.min(1.0, (riverLevel - 1.5) / 5.0);
      const cx = width * 0.5;
      const cy = height * 0.45;
      const rx = (width * 0.26) * (0.5 + expansion * 0.7);
      const ry = (height * 0.2) * (0.5 + expansion * 0.7);

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, -0.3, 0, Math.PI * 2);

      let fillColor = 'rgba(56, 189, 248, 0.15)';
      let strokeColor = 'rgba(56, 189, 248, 0.4)';

      if (riskTier === 1) {
        fillColor = 'rgba(245, 158, 11, 0.2)';
        strokeColor = '#f59e0b';
      } else if (riskTier >= 2) {
        fillColor = 'rgba(239, 68, 68, 0.35)';
        strokeColor = '#ef4444';
      }

      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.stroke();
      ctx.restore();

      if (isFlooding) {
        this.drawLabelBox(cx, cy - 20, '🚨 FLOOD DANGER ZONE', '#ef4444', '#0f172a');
      }
    }

    // 5. Radar Sweep Line
    const cx = width * 0.5;
    const cy = height * 0.45;
    const radius = Math.min(width, height) * 0.42;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, this.radarAngle, this.radarAngle + 0.3);
    ctx.closePath();

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // 6. Evacuation Vector Route (Green Dashed Path)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(width * 0.2, height * 0.75);
    ctx.lineTo(width * 0.25, height * 0.4);
    ctx.lineTo(width * 0.4, height * 0.25);
    ctx.lineTo(width * 0.75, height * 0.2);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 6]);
    ctx.lineDashOffset = -this.radarAngle * 25;
    ctx.stroke();
    ctx.restore();

    // 7. On-Canvas Pin Markers

    // Safe Shelter Pin
    const sX = width * 0.75;
    const sY = height * 0.2;
    this.drawPin(sX, sY, `🏥 ${shelter || 'SAFE SHELTER'}`, '#10b981');

    // Road Crossing Pin
    const rX = width * 0.42;
    const rY = height * 0.48;
    if (isFlooding) {
      this.drawPin(rX, rY, `❌ FLOODED: ${blockedRoad || 'Main Bridge'}`, '#ef4444');
    } else {
      this.drawPin(rX, rY, `🚗 ${blockedRoad || 'Low Road'}`, '#f59e0b');
    }

    // River Label
    this.drawLabelBox(width * 0.2, height * 0.15, `🌊 ${locationName} River`, '#3b82f6', '#0f172a');
  }

  drawPin(x, y, text, color) {
    const { ctx } = this;
    ctx.save();

    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    this.drawLabelBox(x, y - 24, text, color, '#0f172a');
    ctx.restore();
  }

  drawLabelBox(x, y, text, borderColor, bgColor) {
    const { ctx } = this;
    ctx.save();
    ctx.font = 'bold 11px Inter, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const paddingX = 8;
    const paddingY = 4;
    const boxW = textWidth + paddingX * 2;
    const boxH = 20;

    const boxX = x - boxW / 2;
    const boxY = y - boxH / 2;

    ctx.fillStyle = bgColor;
    ctx.fillRect(boxX, boxY, boxW, boxH);

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }
}
