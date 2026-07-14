"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { api } from "@/lib/api";
import type { Lead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EditLeadDialog({
  slug,
  lead,
  onUpdated,
}: {
  slug: string;
  lead: Lead;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(lead.name);
  const [email, setEmail] = useState(lead.email);

  useEffect(() => {
    if (open) {
      setName(lead.name);
      setEmail(lead.email);
    }
  }, [open, lead]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateLead({
        slug,
        lead_id: lead.id,
        name: name.trim(),
        email: email.trim(),
      });
      toast.success("Lead updated");
      setOpen(false);
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update lead");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${lead.name}`}>
            <Pencil className="size-4" />
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`edit-name-${lead.id}`}>Name</Label>
            <Input
              id={`edit-name-${lead.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-email-${lead.id}`}>Email</Label>
            <Input
              id={`edit-email-${lead.id}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
