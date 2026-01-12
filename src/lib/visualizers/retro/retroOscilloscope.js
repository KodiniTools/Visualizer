/**
 * Retro Oscilloscope visualizer - Classic green CRT display
 * @module visualizers/retro/retroOscilloscope
 */

export const retroOscilloscope = {
  name_de: 'Retro-Oszilloskop (Grün)',
  name_en: 'Retro Oscilloscope (Green)',
  needsTimeData: true,
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = 'rgba(0, 10, 0, 0.15)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0, 80, 0, 0.3)';
    ctx.lineWidth = 1;

    const gridSpacing = w / 10;
    for (let x = 0; x <= w; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    for (let y = 0; y <= h; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 120, 0, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    const sliceWidth = w / bufferLength;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(0, 255, 0, ${0.1 * intensity})`;
    ctx.lineWidth = 8;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ff00';

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * h) / 2;
      const x = i * sliceWidth;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = `rgba(0, 255, 0, ${0.3 * intensity})`;
    ctx.lineWidth = 4;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * h) / 2;
      const x = i * sliceWidth;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = `rgba(150, 255, 150, ${0.9 * intensity})`;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * h) / 2;
      const x = i * sliceWidth;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
};
