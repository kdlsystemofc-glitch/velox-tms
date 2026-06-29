import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";

/**
 * SignaturePad — captura de assinatura em canvas (toque/mouse), para o POD.
 * onSave(blob) recebe um PNG; onClear limpa. Pensado para o app do motorista.
 */
export default function SignaturePad({ onSave, saving = false, label = "Assinatura do recebedor" }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Resolução real proporcional ao tamanho exibido (nitidez no mobile)
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  const pos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };
  const end = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const save = () => {
    if (!hasInk) return;
    canvasRef.current.toBlob((blob) => { if (blob) onSave(blob); }, "image/png");
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/50">{label}</p>
      <div className="rounded-lg bg-card overflow-hidden border border-white/20">
        <canvas
          ref={canvasRef}
          className="w-full h-36 touch-none block"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1 h-11 border-white/20 text-white hover:bg-card/10 gap-2" onClick={clear} disabled={saving}>
          <Eraser className="w-4 h-4" /> Limpar
        </Button>
        <Button type="button" className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white font-bold gap-2" onClick={save} disabled={!hasInk || saving}>
          <Check className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar assinatura"}
        </Button>
      </div>
    </div>
  );
}
