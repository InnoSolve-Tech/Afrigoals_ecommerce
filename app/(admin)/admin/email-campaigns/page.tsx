"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
type Campaign = {
  id: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string | null;
};
type Delivery = {
  id: string;
  email: string;
  status: string;
  error?: string;
  sentAt?: string;
};
export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const [cr, ar] = await Promise.all([
      fetch("/api/admin/email-campaigns", { cache: "no-store" }),
      fetch("/api/admin/email-automation", { cache: "no-store" }),
    ]);
    const [c, a] = await Promise.all([cr.json(), ar.json()]);
    if (!cr.ok || !ar.ok) throw Error(c.error || a.error);
    setCampaigns(c);
    setEnabled(a.enabled);
    setConfigured(a.providerConfigured);
  }
  useEffect(() => {
    load().catch((e) => setMessage(e.message));
  }, []);
  async function save(status: string) {
    setBusy(true);
    try {
      if (status === "scheduled" && !scheduled)
        throw Error("Choose a future send time");
      const r = await fetch("/api/admin/email-campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          status,
          scheduledAt: scheduled ? new Date(scheduled).toISOString() : null,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setMessage(
        status === "draft"
          ? "Draft saved. No email has been sent."
          : "Campaign scheduled. It will run only while automation is enabled.",
      );
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  async function toggle() {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/email-automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      await load();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not change automation",
      );
    } finally {
      setBusy(false);
    }
  }
  async function draftAI() {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question:
            "Draft a concise marketing email about products actually in stock. Use current sales evidence, no invented discounts, and plain text without a subject line. Do not send it.",
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setBody(data.answer);
      setMessage("AI draft generated. Review it before saving or scheduling.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not draft");
    } finally {
      setBusy(false);
    }
  }
  async function inspect(id: string) {
    try {
      const r = await fetch(`/api/admin/email-campaigns/${id}/deliveries`, {
        cache: "no-store",
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setDeliveries(data);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not load delivery status",
      );
    }
  }
  return (
    <main className="max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Email campaigns and automation</h1>
      <section className="space-y-3 rounded-xl border p-5">
        <p>
          Automation: <strong>{enabled ? "On" : "Off"}</strong> · Email
          provider: {configured ? "Configured" : "Not configured"}
        </p>
        <p className="text-sm text-zinc-500">
          Scheduled campaigns go to verified client/vendor accounts that have
          not unsubscribed. Order and security emails continue independently.
          Failed or uncertain deliveries are recorded for review rather than
          automatically duplicated.
        </p>
        <Button
          disabled={busy || (!enabled && !configured)}
          variant="outline"
          onClick={() => void toggle()}
        >
          {enabled ? "Pause automation" : "Enable scheduled sending"}
        </Button>
      </section>
      {message && (
        <p role="status" className="rounded border p-4">
          {message}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save("draft");
        }}
        className="space-y-4 rounded-xl border p-5"
      >
        <h2 className="font-semibold">Create campaign</h2>
        <label htmlFor="campaign-subject" className="block">
          Subject
          <input
            id="campaign-subject"
            required
            maxLength={200}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 block w-full rounded border p-2"
          />
        </label>
        <label htmlFor="campaign-body" className="block">
          Message
          <textarea
            id="campaign-body"
            required
            maxLength={20000}
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1 block w-full rounded border p-3"
          />
        </label>
        <label htmlFor="campaign-time" className="block">
          Send time (your local time)
          <input
            id="campaign-time"
            type="datetime-local"
            value={scheduled}
            onChange={(e) => setScheduled(e.target.value)}
            className="mt-1 block rounded border p-2"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <Button disabled={busy}>Save draft</Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void draftAI()}
          >
            Draft with AI
          </Button>
          <Button
            type="button"
            disabled={busy || !subject.trim() || !body.trim()}
            onClick={() => void save("scheduled")}
          >
            Schedule campaign
          </Button>
        </div>
      </form>
      <section className="space-y-3">
        <h2 className="font-semibold">Campaign history</h2>
        {campaigns.map((c) => (
          <article
            key={c.id}
            className="flex flex-wrap justify-between gap-3 rounded border p-4"
          >
            <div>
              <h3>{c.subject}</h3>
              <p>
                {c.status} ·{" "}
                {c.scheduledAt
                  ? new Date(c.scheduledAt).toLocaleString()
                  : "Not scheduled"}
              </p>
            </div>
            <Button variant="outline" onClick={() => void inspect(c.id)}>
              View client delivery steps
            </Button>
          </article>
        ))}
      </section>
      {deliveries.length > 0 && (
        <section className="overflow-x-auto rounded border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-3">Client</th>
                <th>Step</th>
                <th>Sent at / review</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3">{d.email}</td>
                  <td>{d.status}</td>
                  <td>
                    {d.sentAt
                      ? new Date(d.sentAt).toLocaleString()
                      : d.error || "Pending"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
