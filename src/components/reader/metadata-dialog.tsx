"use client";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { metadataSchema, type PaperMetadata } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export function MetadataDialog({
  metadata,
  onSave,
}: {
  metadata: PaperMetadata;
  onSave: (value: PaperMetadata) => void;
}) {
  const [title, setTitle] = useState(metadata.title);
  const [abstract, setAbstract] = useState(metadata.abstract);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value) {
          setTitle(metadata.title);
          setAbstract(metadata.abstract);
          setError("");
        }
        setOpen(value);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil />
          Edit metadata
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="dialog-title">Paper context</DialogTitle>
        <DialogDescription className="muted">
          Extracted from the PDF. Correct the title and abstract to improve
          explanations.
        </DialogDescription>
        <form
          className="metadata-form"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = metadataSchema.safeParse({ title, abstract });
            if (parsed.success) {
              onSave(parsed.data);
              setOpen(false);
            } else
              setError(
                parsed.error.issues[0]?.message ?? "Check the paper details.",
              );
          }}
        >
          <label htmlFor="paper-title">Title</label>
          <input
            id="paper-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={500}
            required
          />
          <label htmlFor="paper-abstract">Abstract</label>
          <textarea
            id="paper-abstract"
            rows={8}
            value={abstract}
            onChange={(event) => setAbstract(event.target.value)}
            maxLength={6000}
          />
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          <Button type="submit">Save paper context</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
