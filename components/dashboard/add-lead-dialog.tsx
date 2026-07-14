"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddLeadDialog({
  slug,
  services,
  onAdded,
}: {
  slug: string;
  services: Service[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    try {
      if (serviceId) {
        await api.createLead({
          slug,
          name,
          email,
          service_id: serviceId,
          notes: notes || undefined,
        });
      } else {
        await api.importLeads({
          slug,
          leads: [{ name, email, notes: notes || undefined }],
        });
      }
      toast.success("Lead added");
      setOpen(false);
      setName("");
      setEmail("");
      setServiceId("");
      setNotes("");
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add lead");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            Add Lead
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Service (optional)</Label>
            <Select value={serviceId} onValueChange={(v) => setServiceId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Assign later" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Lead"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
