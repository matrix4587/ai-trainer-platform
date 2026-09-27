"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

type Resume = {
  id: string;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ResumeForm({ initialResume }: { initialResume: Resume | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [resume, setResume] = useState<Resume | null>(initialResume);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function pickFile(f: File | null) {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!ACCEPTED.includes(f.type)) {
      setError("Only PDF and DOCX files are allowed.");
      return;
    }
    if (f.size > MAX_SIZE) {
      setError("File is too large. Max size is 5 MB.");
      return;
    }
    setFile(f);
  }

  async function handleUpload() {
    if (!file) {
      setError("Please choose a file first.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/profile/resume", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Upload failed. Please try again.");
        setSubmitting(false);
        return;
      }

      const data = await res.json();
      setResume(data.resume);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setSubmitting(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!resume) return;
    setError(null);
    setDeleting(true);

    try {
      const res = await fetch("/api/profile/resume", { method: "DELETE" });
      if (!res.ok) {
        setError("Failed to remove resume.");
        setDeleting(false);
        return;
      }
      setResume(null);
      setDeleting(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setDeleting(false);
    }
  }

  function handleContinue() {
    router.push("/onboarding/review");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Existing resume */}
      {resume && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/10 p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{resume.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatSize(resume.fileSize)} · {resume.mimeType}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-destructive hover:opacity-70 disabled:opacity-40"
            aria-label="Remove resume"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {/* Upload area */}
      {!resume && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) pickFile(f);
          }}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-input"
          }`}
        >
          <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drag & drop your resume here
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF or DOCX, up to 5 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => inputRef.current?.click()}
          >
            Browse files
          </Button>

          {file && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-medium">{file.name}</span>
              <span className="text-muted-foreground">
                ({formatSize(file.size)})
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {!resume && file && (
          <Button type="button" onClick={handleUpload} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        )}

        {resume && (
          <Button type="button" onClick={handleContinue}>
            Continue
          </Button>
        )}

        {!resume && !file && (
          <Button
            type="button"
            variant="outline"
            onClick={handleContinue}
          >
            Skip for now
          </Button>
        )}
      </div>
    </div>
  );
}