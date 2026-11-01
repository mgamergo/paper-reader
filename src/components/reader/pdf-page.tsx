"use client";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import "pdfjs-dist/web/pdf_viewer.css";

export function PdfPage({
  pdf,
  page,
}: {
  pdf: PDFDocumentProxy;
  page: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [status, setStatus] = useState("Rendering PDF…");
  useEffect(() => {
    const target = container.current;
    if (!target) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const target = container.current;
    if (!target || !width) return;
    let cancelled = false;
    let cancelRender: (() => void) | undefined;
    let cancelText: (() => void) | undefined;
    const host = document.createElement("div");
    host.className = "pdf-page-canvas";
    target.replaceChildren(host);
    async function render() {
      try {
        const { TextLayer } = await import("pdfjs-dist");
        const pdfPage = await pdf.getPage(page);
        if (cancelled) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({ scale: width / base.width });
        const canvas = document.createElement("canvas");
        canvas.setAttribute("aria-hidden", "true");
        const context = canvas.getContext("2d");
        if (!context)
          throw new Error("Your browser cannot render the PDF canvas.");
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        host.style.width = `${viewport.width}px`;
        host.style.height = `${viewport.height}px`;
        host.style.setProperty("--scale-factor", String(viewport.scale));
        host.style.setProperty("--total-scale-factor", String(viewport.scale));
        host.style.setProperty("--user-unit", "1");
        host.append(canvas);
        const task = pdfPage.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: [ratio, 0, 0, ratio, 0, 0],
        });
        cancelRender = () => task.cancel();
        await task.promise;
        if (cancelled) return;
        const layer = document.createElement("div");
        layer.className = "textLayer";
        layer.setAttribute(
          "aria-label",
          `Selectable text for PDF page ${page}`,
        );
        host.append(layer);
        const textLayer = new TextLayer({
          textContentSource: await pdfPage.getTextContent(),
          container: layer,
          viewport,
        });
        cancelText = () => textLayer.cancel();
        await textLayer.render();
        if (!cancelled) setStatus("");
      } catch (error) {
        if (!cancelled)
          setStatus(
            error instanceof Error
              ? error.message
              : "Could not render this PDF page. Use text view.",
          );
      }
    }
    void render();
    return () => {
      cancelled = true;
      cancelRender?.();
      cancelText?.();
      host.remove();
    };
  }, [pdf, page, width]);
  return (
    <div className="pdf-page-wrap">
      <p className="muted" role="status">
        {status}
      </p>
      <div ref={container} data-testid="pdf-page" className="pdf-page" />
    </div>
  );
}
