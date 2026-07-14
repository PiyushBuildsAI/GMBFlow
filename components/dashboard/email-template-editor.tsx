"use client";

import { useMemo } from "react";
import { Eye, FileCode2 } from "lucide-react";
import {
  EMAIL_PREVIEW_VARS,
  EMAIL_TEMPLATE_VARS,
  renderEmailPreviewHtml,
  replaceTemplateVars,
  type EmailTemplateVars,
} from "@/lib/email-template";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function EmailTemplateEditor({
  value,
  onChange,
  subject,
  serviceName,
  required,
  compact,
}: {
  value: string;
  onChange: (value: string) => void;
  subject?: string;
  serviceName?: string;
  required?: boolean;
  compact?: boolean;
}) {
  const previewVars = useMemo<EmailTemplateVars>(
    () => ({
      ...EMAIL_PREVIEW_VARS,
      service: serviceName?.trim() || EMAIL_PREVIEW_VARS.service,
    }),
    [serviceName]
  );

  const previewHtml = useMemo(
    () => renderEmailPreviewHtml(value, previewVars),
    [value, previewVars]
  );

  return (
    <div className="space-y-2">
      <Label>Email body</Label>
      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="preview" className="flex-1 gap-1.5">
            <Eye className="size-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex-1 gap-1.5">
            <FileCode2 className="size-4" />
            Markdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-3">
          <div className="overflow-hidden rounded-xl border bg-muted/20">
            <div className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
              Sample email preview
            </div>
            <div
              className={cn(
                "space-y-4 p-4",
                compact && "max-h-[180px] overflow-y-auto"
              )}
            >
              {subject?.trim() && (
                <p className="text-sm">
                  <span className="font-medium text-muted-foreground">Subject:</span>{" "}
                  {replaceTemplateVars(subject, previewVars)}
                </p>
              )}
              <div
                className="space-y-3 text-sm leading-relaxed text-foreground [&_a]:font-medium [&_a]:underline [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:text-sm [&_strong]:font-semibold [&_ul]:list-disc"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
              {!value.trim() && (
                <p className="text-sm text-muted-foreground">
                  Write markdown in the Editor tab to see a preview here.
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="editor" className="mt-3 space-y-2">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={compact ? 8 : 12}
            required={required}
            placeholder={`Hi {{name}},\n\nThank you for choosing us for **{{service}}**.\n\nPlease leave a review:\n\n[Leave a review]({{review_link}})\n\nBest regards`}
            className={cn(
              "font-mono text-sm",
              compact ? "min-h-[160px] max-h-[200px] resize-y" : "min-h-[240px]"
            )}
          />
          <p className="text-xs text-muted-foreground">
            Markdown supported: **bold**, *italic*, [links](url), lists, headings.
            Variables: {EMAIL_TEMPLATE_VARS.join(", ")}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
