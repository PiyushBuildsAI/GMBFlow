"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, Upload, Download, X } from "lucide-react";
import { api } from "@/lib/api";
import { downloadSampleLeadsCsv, parseLeadsCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Service } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ImportLeadsDialog({
  slug,
  services,
  onImported,
}: {
  slug: string;
  services: Service[];
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [defaultServiceId, setDefaultServiceId] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setDefaultServiceId("");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  function acceptFile(next: File | null) {
    if (!next) return;
    if (!next.name.endsWith(".csv") && next.type !== "text/csv") {
      toast.error("Please upload a .csv file");
      return;
    }
    setFile(next);
  }

  async function handleImport() {
    if (!file) {
      toast.error("Select a CSV file to import");
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const leads = parseLeadsCsv(text);
      if (leads.length === 0) {
        toast.error("No valid rows. Required columns: name and email");
        return;
      }

      const result = await api.importLeads({
        slug,
        leads,
        default_service_id: defaultServiceId || undefined,
      });
      if (result.imported === 0 && (result.skipped_duplicates ?? 0) > 0) {
        toast.warning(
          `No new leads imported — ${result.skipped_duplicates} duplicate email(s) already exist`
        );
      } else if (result.skipped_duplicates > 0) {
        const withoutService = result.leads.filter((l) => !l.service_name).length;
        toast.success(
          withoutService > 0
            ? `Imported ${result.imported} leads (${result.skipped_duplicates} duplicates skipped, ${withoutService} need service)`
            : `Imported ${result.imported} leads (${result.skipped_duplicates} duplicates skipped)`
        );
      } else {
        const withoutService = result.leads.filter((l) => !l.service_name).length;
        toast.success(
          withoutService > 0
            ? `Imported ${result.imported} leads (${withoutService} without service — assign in dashboard)`
            : `Imported ${result.imported} leads from ${file.name}`
        );
      }
      setOpen(false);
      reset();
      onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline">
            <Upload className="size-4" />
            Import CSV
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import leads from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with <strong>name</strong> and <strong>email</strong> (required).
            Optional <strong>service</strong> column matches your service names, or pick a
            default below for rows without one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              Need a template? Download a sample CSV with the correct columns.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                downloadSampleLeadsCsv(services.map((s) => s.name))
              }
            >
              <Download className="size-4" />
              Sample CSV
            </Button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
          />

          {!file ? (
            <Card
              className={cn(
                "cursor-pointer border-dashed transition-colors",
                dragOver && "border-foreground bg-muted/50"
              )}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                acceptFile(e.dataTransfer.files[0] ?? null);
              }}
            >
              <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <FileSpreadsheet className="size-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Drop your CSV here</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    or click to browse files
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={reset}
                  aria-label="Remove file"
                >
                  <X className="size-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {services.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="default-service">Default service (optional)</Label>
              <Select
                value={defaultServiceId || "none"}
                onValueChange={(v) =>
                  setDefaultServiceId(v === "none" ? "" : (v ?? ""))
                }
              >
                <SelectTrigger id="default-service" className="w-full">
                  <SelectValue placeholder="No default — assign later" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No default — assign later</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Applied to rows that don&apos;t have a service column or name match.
              </p>
            </div>
          )}

          <Alert>
            <AlertDescription className="text-xs">
              Supported headers:{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                Business Name, Email
              </code>{" "}
              or{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                name, email, service, notes
              </code>
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleImport}
            className="w-full"
            disabled={loading || !file}
          >
            {loading ? "Importing..." : "Import leads"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
