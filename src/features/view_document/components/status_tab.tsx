import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Shield, Send, X, Mail } from "lucide-react";
import type { Decision } from "../../../types/invoice";
import { getInvoiceDecision } from "../services/documentService";
import api from "../../../lib/axios";
import type { AxiosError } from "axios";

interface ApiErrorResponse {
message?: string;
}

// ── Mail Modal ────────────────────────────────────────────────────────────────
function MailModal({
  mailTo, mailSubject, mailBody,
  onClose,
}: {
  mailTo: string; mailSubject: string; mailBody: string;
  onClose: () => void;
}) {
  const [to, setTo]           = useState(mailTo);
  const [subject, setSubject] = useState(mailSubject);
  const [body, setBody]       = useState(mailBody);
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const handleSend = async () => {
  setSending(true);
  setError("");
  try {
    await api.post("process/invoice/send-mail", { to, subject, body }, { withCredentials: true });
    setSent(true);
    setTimeout(() => { setSent(false); onClose(); }, 1800);
  } catch (err: unknown) {
    const axiosErr = err as AxiosError<ApiErrorResponse>;
    setError(axiosErr?.response?.data?.message ?? axiosErr?.message ?? "Failed to send email.");
  } finally {
    setSending(false);
  }
};

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Send Vendor Notification</p>
              <p className="text-[11px] text-gray-400 mt-0.5">All fields are editable before sending</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3.5">
          {/* To */}
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">To</label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="vendor@example.com"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Email body…"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || sent || !to.trim()}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all disabled:cursor-not-allowed
              ${sent
                ? "bg-emerald-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300"}`}
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? "Sending…" : sent ? "Sent!" : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function InvoiceStatusTab({ invoiceId }: { invoiceId: string }) {
  const [decision, setDecision]       = useState<Decision | null>(null);
  const [loading, setLoading]         = useState(true);
  const [mailModalOpen, setMailModalOpen] = useState(false);

  useEffect(() => {
    async function fetchDecision() {
      try {
        const res = await getInvoiceDecision(invoiceId);
        setDecision(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDecision();
  }, [invoiceId]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3 animate-pulse">
          <Shield className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">Loading status…</p>
      </div>
    );
  }

  // ── No decision ──
  if (!decision) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
          <Shield className="w-6 h-6 text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-600">No decision yet</p>
        <p className="text-xs text-gray-400 mt-1">Run the LangGraph flow to see results</p>
      </div>
    );
  }

  // ── Status config ──
  const statusConfig = {
    approve: {
      icon:    <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      label:   "Approved",
      sub:     "Payment can be processed",
      bg:      "bg-emerald-50",
      border:  "border-emerald-200",
      text:    "text-emerald-700",
      barBg:   "bg-emerald-500",
      confText:"text-emerald-600",
    },
    review: {
      icon:    <AlertTriangle className="w-5 h-5 text-amber-500" />,
      label:   "Needs Review",
      sub:     "Minor discrepancies found",
      bg:      "bg-amber-50",
      border:  "border-amber-200",
      text:    "text-amber-700",
      barBg:   "bg-amber-500",
      confText:"text-amber-600",
    },
    reject: {
      icon:    <XCircle className="w-5 h-5 text-red-500" />,
      label:   "Rejected",
      sub:     "Major discrepancies detected",
      bg:      "bg-red-50",
      border:  "border-red-200",
      text:    "text-red-700",
      barBg:   "bg-red-500",
      confText:"text-red-600",
    },
  };

  const cfg = statusConfig[decision.status];
  const confidencePct = Math.round((decision.confidence_score ?? 0) * 100);

  // Only show the single button matching the decision status
  const allActionButtons = [
    { key: "approve" as const, label: "Approve", icon: <CheckCircle2 className="w-3.5 h-3.5" />, activeClass: "bg-emerald-600 border-emerald-600 text-white" },
    { key: "review"  as const, label: "Review",  icon: <AlertTriangle className="w-3.5 h-3.5" />, activeClass: "bg-amber-500 border-amber-500 text-white"   },
    { key: "reject"  as const, label: "Reject",  icon: <XCircle className="w-3.5 h-3.5" />,       activeClass: "bg-red-500 border-red-500 text-white"        },
  ];
  const actionButtons = allActionButtons.filter((btn) => btn.key === decision.status);

  return (
    <>
      <div className="space-y-4">

        {/* ── Decision status card ── */}
        <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {cfg.icon}
              <div>
                <p className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</p>
                <p className={`text-xs ${cfg.text} opacity-70`}>{cfg.sub}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-400 mb-0.5">Confidence</p>
              <p className={`text-sm font-bold ${cfg.confText}`}>{confidencePct}%</p>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="mt-3 h-1.5 bg-white/70 rounded-full overflow-hidden border border-white">
            <div
              className={`h-full ${cfg.barBg} rounded-full transition-all duration-700`}
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>

        {/* ── Decision button (only the matching one, read-only style) ── */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Decision</p>
          <div className="flex items-center gap-2">
            {actionButtons.map((btn) => (
              <span
                key={btn.key}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border ${btn.activeClass}`}
              >
                {btn.icon}
                {btn.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Command (AI reasoning) ── */}
        {decision.command && (
          <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Command</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-600 leading-relaxed font-mono whitespace-pre-wrap">{decision.command}</p>
            </div>
          </div>
        )}

        {/* ── Send Mail button ── */}
        {(decision.mail_to || decision.mail_subject || decision.mail_body) && (
          <button
            onClick={() => setMailModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-sm font-medium text-gray-600 hover:text-blue-600 rounded-lg transition-all w-full justify-center"
          >
            <Mail className="w-4 h-4" />
            Send Mail to Vendor
          </button>
        )}

      </div>

      {/* ── Mail Modal ── */}
      {mailModalOpen && (
        <MailModal
          mailTo={decision.mail_to ?? ""}
          mailSubject={decision.mail_subject ?? ""}
          mailBody={decision.mail_body ?? ""}
          onClose={() => setMailModalOpen(false)}
        />
      )}
    </>
  );
}
