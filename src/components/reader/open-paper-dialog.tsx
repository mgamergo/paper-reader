"use client";
import { useState } from "react";
import { FileUp, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ReaderSession } from "./use-reader";
export function OpenPaperDialog({ reader }: { reader: ReaderSession }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp />
          Open paper
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="dialog-title">
          Bring a paper to your desk
        </DialogTitle>
        <DialogDescription className="muted">
          Upload a PDF or import one from arXiv. Your reading session stays in
          this browser.
        </DialogDescription>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setOpen(false);
            void reader.importArxiv(url);
          }}
          className="import-form"
        >
          <label htmlFor="arxiv-input">arXiv link or ID</label>
          <div className="input-row">
            <input
              id="arxiv-input"
              placeholder="1706.03762 or https://arxiv.org/abs/…"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
              maxLength={300}
            />
            <Button type="submit">
              <Link2 />
              Import
            </Button>
          </div>
          <p className="fine-print">
            arxiv.org links only. Up to 20 MB and 500 pages.
          </p>
        </form>
        <div className="upload-zone">
          <FileUp size={24} />
          <label htmlFor="pdf-upload">Choose a local PDF</label>
          <input
            id="pdf-upload"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                setOpen(false);
                void reader.upload(file);
              }
            }}
          />
          <p className="fine-print">
            Files stay in memory. Only selected text is sent for live AI help.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
