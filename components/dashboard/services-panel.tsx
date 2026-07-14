"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { SERVICES_PAGE_SIZE, normalizePagination } from "@/lib/pagination";
import type { PaginationMeta, Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { EmailTemplateEditor } from "./email-template-editor";
import { TablePagination } from "./table-pagination";

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: SERVICES_PAGE_SIZE,
  total: 0,
  total_pages: 1,
};

function ServiceDialog({
  slug,
  service,
  onSaved,
}: {
  slug: string;
  service?: Service;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(service?.name || "");
  const [subject, setSubject] = useState(service?.email_subject || "");
  const [body, setBody] = useState(service?.email_body || "");

  useEffect(() => {
    if (open) {
      setName(service?.name || "");
      setSubject(service?.email_subject || "");
      setBody(service?.email_body || "");
    }
  }, [open, service]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (service) {
        await api.updateService({
          slug,
          service_id: service.id,
          name,
          email_subject: subject,
          email_body: body,
        });
        toast.success("Service updated");
      } else {
        await api.createService({
          slug,
          name,
          email_subject: subject,
          email_body: body,
        });
        toast.success("Service created");
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          service ? (
            <Button variant="ghost" size="sm">
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : (
            <Button>
              <Plus className="size-4" />
              Add Service
            </Button>
          )
        }
      />
      <DialogContent className="flex max-h-[min(90vh,720px)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>{service ? "Edit Service" : "Add Service"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-2">
            <div className="space-y-2">
              <Label htmlFor="svc-name">Service Name</Label>
              <Input
                id="svc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Digital Marketing"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-subject">Email Subject</Label>
              <Input
                id="svc-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <EmailTemplateEditor
              value={body}
              onChange={setBody}
              subject={subject}
              serviceName={name}
              required
              compact
            />
          </div>
          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
            <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ServicesPanel({ slug }: { slug: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (pageOverride?: number) => {
    const activePage = pageOverride ?? page;
    setLoading(true);
    try {
      const res = await api.listServices(slug, {
        page: activePage,
        limit: SERVICES_PAGE_SIZE,
      });
      setServices(res.services);
      setPagination(
        normalizePagination(res.pagination, {
          items: res.services,
          limit: SERVICES_PAGE_SIZE,
          page: activePage,
        })
      );
      if (pageOverride != null) setPage(pageOverride);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load services");
    } finally {
      setLoading(false);
    }
  }, [slug, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Each service has its own email template sent via n8n.
        </p>
        <ServiceDialog slug={slug} onSaved={() => load(1)} />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No services yet. Add your first service tag.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {services.map((service) => (
              <Card key={service.id} className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <ServiceDialog slug={slug} service={service} onSaved={load} />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Subject:</span>{" "}
                    {service.email_subject}
                  </p>
                  <p className="line-clamp-3 text-muted-foreground">
                    {service.email_body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <TablePagination pagination={pagination} onPageChange={setPage} />
        </Card>
      )}
    </div>
  );
}
