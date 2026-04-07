import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, FileText, Paperclip, Clock, Receipt,
  CheckCircle2, AlertTriangle, XCircle, Sparkles, Mail, Shield,
  ChevronDown, Send, ShoppingCart, LinkIcon, 
  Tag, Users, Layers,
} from "lucide-react";
import type { AxiosError } from "axios";
import type { InvoiceData, InvoiceDetail, PODetail, Decision } from "../../../types/invoice";
import { groupInvoiceId, groupTotalAmount, groupCurrencyCode, groupVendorName, groupInvoiceDate } from "../../../types/invoice";
import InvoiceStatusBadge from "./status_badge";
import { formatCurrency } from "../../../lib/formatCurrency";
import InvoiceFileTab from "./file_tab";
import InvoiceHistoryTab from "./history_tab";
import { getInvoiceDecision, approveInvoice, reviewInvoice, rejectInvoice } from "../services/documentService";
import logger from "../../../utils/logger";

type Tab = "group" | "file" | "history" | "result";

type MatchingStatus = "pending" | "approved" | "reviewed" | "rejected";
function toMatchingStatus(value: string | undefined | null): MatchingStatus {
  const allowed: MatchingStatus[] = ["pending", "approved", "reviewed", "rejected"];
  return allowed.includes(value as MatchingStatus) ? (value as MatchingStatus) : "pending";
}

interface ApiErrorResponse { message?: string; }
function extractErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<ApiErrorResponse>;
  return axiosErr?.response?.data?.message ?? axiosErr?.message ?? fallback;
}

/** Convert 0-1 range confidence to 0-100 percentage */
function toPercent(raw: number | null | undefined): number {
  if (raw == null) return 0;
  // backend sends 0-1 (e.g. 0.87) → multiply; if already >1 keep as-is
  return raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
}

function matchingToDecision(invoice: InvoiceData): Decision | null {
  if (!invoice.decision) return null;
  return {
    status:           invoice.decision,
    confidence_score: toPercent(invoice.confidence_score),
    command:          invoice.command ?? "",
    mail_to:          invoice.mail_to ?? "",
    mail_subject:     invoice.mail_subject ?? "",
    mail_body:        invoice.mail_body ?? "",
  };
}

// ── Shared Review/Reject Modal ────────────────────────────────────────────────
export function DecisionDetailModal({ invoiceId, type, onClose, onStatusChange, invoiceRow }: {
  invoiceId: string;
  type: "review" | "reject";
  onClose: () => void;
  onStatusChange?: (invoiceId: string, newStatus: "reviewed" | "rejected") => void;
  invoiceRow?: InvoiceData;
}) {
  const [decision, setDecision]   = useState<Decision | null>(null);
  const [loading, setLoading]     = useState(true);
  const [to, setTo]               = useState("");
  const [subject, setSubject]     = useState("");
  const [body, setBody]           = useState("");
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [sendError, setSendError] = useState("");
  const [showMail, setShowMail]   = useState(false);
  const [origTo, setOrigTo]           = useState("");
  const [origSubject, setOrigSubject] = useState("");
  const [origBody, setOrigBody]       = useState("");

  useEffect(() => {
    if (invoiceRow) {
      const d = matchingToDecision(invoiceRow);
      setDecision(d);
      const t = d?.mail_to ?? ""; const s = d?.mail_subject ?? ""; const b = d?.mail_body ?? "";
      setTo(t); setSubject(s); setBody(b);
      setOrigTo(t); setOrigSubject(s); setOrigBody(b);
      setLoading(false);
      return;
    }
    getInvoiceDecision(invoiceId).then((res) => {
      setDecision(res);
      const t = res?.mail_to ?? ""; const s = res?.mail_subject ?? ""; const b = res?.mail_body ?? "";
      setTo(t); setSubject(s); setBody(b);
      setOrigTo(t); setOrigSubject(s); setOrigBody(b);
    }).catch(logger.error).finally(() => setLoading(false));
  }, [invoiceId, invoiceRow]);

  const handleSend = async () => {
    setSending(true); setSendError("");
    try {
      const overrides: Record<string, string> = {};
      if (to !== origTo)           overrides.mail_to      = to;
      if (subject !== origSubject) overrides.mail_subject = subject;
      if (body !== origBody)       overrides.mail_body    = body;
      if (type === "review") await reviewInvoice(invoiceId, overrides);
      else                   await rejectInvoice(invoiceId, overrides);
      setSent(true);
      onStatusChange?.(invoiceId, type === "review" ? "reviewed" : "rejected");
      setTimeout(() => { setSent(false); setShowMail(false); onClose(); }, 1800);
    } catch (err: unknown) {
      setSendError(extractErrorMessage(err, "Failed."));
    } finally { setSending(false); }
  };

  const cfg = type === "review"
    ? { icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, label: "Needs Review", bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  iconBg: "bg-amber-50" }
    : { icon: <XCircle className="w-5 h-5 text-red-500" />,         label: "Rejected",     bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    iconBg: "bg-red-50"   };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.iconBg}`}>{cfg.icon}</div>
            <div><p className="text-sm font-bold text-gray-800">{cfg.label}</p><p className="text-[11px] text-gray-400 font-mono">{invoiceId}</p></div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <div className={`rounded-lg border ${cfg.border} ${cfg.bg} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">{cfg.icon}<p className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</p></div>
                {decision && (
                  <div className="text-right">
                    <p className="text-[11px] text-gray-400">Confidence</p>
                    <p className={`text-sm font-bold ${cfg.text}`}>{decision.confidence_score}%</p>
                  </div>
                )}
              </div>
              {decision?.command && (
                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-100 bg-gray-50"><p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Command</p></div>
                  <div className="px-4 py-3"><p className="text-xs text-gray-600 font-mono leading-relaxed whitespace-pre-wrap">{decision.command}</p></div>
                </div>
              )}
              {!showMail && (decision?.mail_to || decision?.mail_subject) && (
                <div className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-3 space-y-1.5">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Mail Preview</p>
                  {decision?.mail_to      && <div className="flex gap-2 text-xs"><span className="text-gray-400 w-14 shrink-0">To:</span><span className="text-gray-700 font-medium">{decision.mail_to}</span></div>}
                  {decision?.mail_subject && <div className="flex gap-2 text-xs"><span className="text-gray-400 w-14 shrink-0">Subject:</span><span className="text-gray-700">{decision.mail_subject}</span></div>}
                </div>
              )}
              {showMail && (
                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Compose Mail</p>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    {[{ label: "To", value: to, setter: setTo }, { label: "Subject", value: subject, setter: setSubject }].map(({ label, value, setter }) => (
                      <div key={label}>
                        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">{label}</label>
                        <input value={value} onChange={(e) => setter(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-all" />
                      </div>
                    ))}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Message</label>
                      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-all resize-none" />
                    </div>
                    {sendError && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{sendError}</p>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-2.5 shrink-0">
          <button onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Close</button>
          {!showMail ? (
            <button onClick={() => setShowMail(true)} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              <Mail className="w-3.5 h-3.5" /> Send Mail
            </button>
          ) : (
            <button onClick={handleSend} disabled={sending || sent || !to.trim()}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all disabled:cursor-not-allowed
                ${sent ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300"}`}>
              <Send className="w-3.5 h-3.5" />
              {sending ? "Sending…" : sent ? "Sent!" : "Send Email"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Confirm Approve Modal ─────────────────────────────────────────────────────
function ConfirmApproveModal({ invoiceId, onConfirm, onCancel }: {
  invoiceId: string; onConfirm: () => void; onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const handleConfirm = async () => {
    setLoading(true); setError("");
    try { await approveInvoice(invoiceId); onConfirm(); }
    catch (err: unknown) { setError(extractErrorMessage(err, "Approval failed.")); setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-5 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-gray-800 mb-1">Approve Group?</p>
          <p className="text-xs text-gray-500">Approving will allow payment processing for all invoices in this group.</p>
          {error && <p className="mt-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 w-full">{error}</p>}
        </div>
        <div className="px-5 pb-5 flex gap-2.5">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
            {loading ? "Approving…" : "Yes, Approve"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Group Tab — all invoices + all POs details ─────────────────────────────────
function GroupTab({ group }: { group: InvoiceData }) {
  const invoices    = group.invoices   ?? [];
  const pos         = group.pos        ?? [];
  const invoiceIds  = group.invoice_ids ?? (group.invoice_id ? [group.invoice_id] : []);
  const poIds       = group.po_ids      ?? (group.po_id ? [group.po_id] : []);

  const isPoWaiting = group.is_po_matched === null;
  const isNoPo      = !poIds.length;

  return (
    <div className="space-y-5">

      {/* Group header info */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <div className="flex items-center gap-1.5 mb-1.5"><Users className="w-3.5 h-3.5 text-gray-400" /><span className="text-[11px] font-medium text-gray-400">Invoices</span></div>
          <p className="text-sm font-bold text-gray-800">{invoiceIds.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <div className="flex items-center gap-1.5 mb-1.5"><ShoppingCart className="w-3.5 h-3.5 text-gray-400" /><span className="text-[11px] font-medium text-gray-400">POs</span></div>
          <p className="text-sm font-bold text-gray-800">{isNoPo ? "—" : poIds.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3 col-span-2">
          <div className="flex items-center gap-1.5 mb-1.5"><Tag className="w-3.5 h-3.5 text-gray-400" /><span className="text-[11px] font-medium text-gray-400">Matching Status</span></div>
          <InvoiceStatusBadge status={toMatchingStatus(group.matching_status)} />
        </div>
      </div>

      {/* PO status banner */}
      {isPoWaiting && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-orange-700">Waiting for POs</p>
            <p className="text-[11px] text-orange-600 mt-0.5">One or more purchase orders in this group have not been uploaded yet.</p>
          </div>
        </div>
      )}
      {isNoPo && (
        <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-600">Service Invoice</p>
            <p className="text-[11px] text-gray-500 mt-0.5">No purchase order required for this invoice group.</p>
          </div>
        </div>
      )}

      {/* ── All Invoices ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="w-3.5 h-3.5 text-blue-500" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoices ({invoiceIds.length})</p>
        </div>
        <div className="space-y-3">
          {invoices.length > 0 ? (
            invoices.map((inv: InvoiceDetail) => (
              <div key={inv.invoice_id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-700">{inv.invoice_id}</span>
                  <span className="text-xs font-bold text-gray-800">{formatCurrency(inv.total_amount, inv.currency_code)}</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {inv.invoice_date && <div><p className="text-gray-400 mb-0.5">Invoice Date</p><p className="font-medium text-gray-700">{inv.invoice_date}</p></div>}
                  {inv.due_date     && <div><p className="text-gray-400 mb-0.5">Due Date</p><p className="font-medium text-gray-700">{inv.due_date}</p></div>}
                  {inv.subtotal    != null && <div><p className="text-gray-400 mb-0.5">Subtotal</p><p className="font-medium text-gray-700">{formatCurrency(inv.subtotal, inv.currency_code)}</p></div>}
                  {inv.tax_amount  != null && <div><p className="text-gray-400 mb-0.5">Tax</p><p className="font-medium text-gray-700">{formatCurrency(inv.tax_amount, inv.currency_code)}</p></div>}
                  {inv.vendor && (
                    <div className="col-span-2 pt-1 border-t border-gray-50">
                      <p className="text-gray-400 mb-0.5">Vendor</p>
                      <p className="font-semibold text-gray-800">{inv.vendor.name}</p>
                      {inv.vendor.email && <p className="text-gray-500 text-[11px]">{inv.vendor.email}</p>}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            // Fallback: just show IDs as pills when enriched data not available
            <div className="flex flex-wrap gap-1.5">
              {invoiceIds.map((id) => (
                <span key={id} className="font-mono text-[11px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-lg font-semibold">{id}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── All POs ─────────────────────────────────────────────────────── */}
      {poIds.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-3.5 h-3.5 text-violet-500" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchase Orders ({poIds.length})</p>
          </div>
          <div className="space-y-3">
            {pos.length > 0 ? (
              pos.map((po: PODetail) => (
                <div key={po.po_id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-2.5 bg-violet-50 border-b border-violet-100 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-violet-700">{po.po_id}</span>
                    <span className="text-xs font-bold text-gray-800">{formatCurrency(po.total_amount, po.currency_code)}</span>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {po.ordered_date && <div><p className="text-gray-400 mb-0.5">Ordered Date</p><p className="font-medium text-gray-700">{po.ordered_date}</p></div>}
                    <div>
                      <p className="text-gray-400 mb-0.5">Status</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold
                        ${po.status === "completed" ? "bg-emerald-50 text-emerald-700"
                          : po.status === "cancelled" ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${po.status === "completed" ? "bg-emerald-500" : po.status === "cancelled" ? "bg-red-500" : "bg-amber-400"}`} />
                        {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {poIds.map((id) => (
                  <span key={id} className="font-mono text-[11px] bg-violet-50 text-violet-700 border border-violet-100 px-2 py-1 rounded-lg font-semibold">{id}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Result Tab ────────────────────────────────────────────────────────────────
function ResultTab({ decision: initialDecision, matchingStatus, invoiceId, onStatusChange }: {
  decision: Decision;
  matchingStatus: string;
  invoiceId: string;
  onStatusChange?: (invoiceId: string, poId: string | null, newStatus: "approved" | "reviewed" | "rejected") => void;
}) {
  const [decision, setDecision]       = useState<Decision>(initialDecision);
  const [mailTo, setMailTo]           = useState(initialDecision.mail_to ?? "");
  const [mailSubject, setMailSubject] = useState(initialDecision.mail_subject ?? "");
  const [mailBody, setMailBody]       = useState(initialDecision.mail_body ?? "");
  const [showChangeStatus, setShowChangeStatus] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted]     = useState(false);

  const orig = { to: initialDecision.mail_to ?? "", subject: initialDecision.mail_subject ?? "", body: initialDecision.mail_body ?? "" };
  // confidence_score already converted to 0-100 by matchingToDecision
  const confidencePct = decision.confidence_score;

  const statusCfg: Record<string, { icon: React.ReactNode; label: string; bg: string; border: string; text: string; bar: string }> = {
    approve: { icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, label: "Approved",    bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", bar: "bg-emerald-500" },
    review:  { icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, label: "Needs Review", bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   bar: "bg-amber-500"   },
    reject:  { icon: <XCircle className="w-5 h-5 text-red-500" />,         label: "Rejected",     bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700",     bar: "bg-red-500"     },
  };
  const cfg = statusCfg[decision.status] ?? { icon: <Shield className="w-5 h-5 text-gray-400" />, label: "No Decision", bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", bar: "bg-gray-400" };

  const handleApplyStatus = async () => {
    setSubmitting(true); setSubmitError("");
    try {
      const overrides: Record<string, string> = {};
      if (mailTo      !== orig.to)      overrides.mail_to      = mailTo;
      if (mailSubject !== orig.subject) overrides.mail_subject = mailSubject;
      if (mailBody    !== orig.body)    overrides.mail_body    = mailBody;
      if (decision.status === "approve") { await approveInvoice(invoiceId); onStatusChange?.(invoiceId, null, "approved"); }
      else if (decision.status === "review") { await reviewInvoice(invoiceId, overrides); onStatusChange?.(invoiceId, null, "reviewed"); }
      else if (decision.status === "reject") { await rejectInvoice(invoiceId, overrides); onStatusChange?.(invoiceId, null, "rejected"); }
      setSubmitted(true); setShowChangeStatus(false);
      setTimeout(() => setSubmitted(false), 2000);
    } catch (err: unknown) {
      setSubmitError(extractErrorMessage(err, "Action failed."));
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      {/* Decision card with confidence bar */}
      <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {cfg.icon}
            <div>
              <p className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</p>
              <p className={`text-[11px] ${cfg.text} opacity-70 mt-0.5`}>AI Decision Result</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400 mb-0.5">Confidence</p>
            <p className={`text-lg font-bold ${cfg.text}`}>{confidencePct}%</p>
          </div>
        </div>
        <div className="h-1.5 bg-white/70 rounded-full overflow-hidden border border-white">
          <div className={`h-full ${cfg.bar} rounded-full transition-all duration-700`} style={{ width: `${confidencePct}%` }} />
        </div>
      </div>

      {/* Change Status — only for pending groups */}
      {matchingStatus === "pending" && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <button onClick={() => setShowChangeStatus(!showChangeStatus)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                <ChevronDown className={`w-3.5 h-3.5 text-blue-600 transition-transform ${showChangeStatus ? "rotate-180" : ""}`} />
              </div>
              <p className="text-xs font-semibold text-gray-700">Change Status</p>
            </div>
            <span className="text-[11px] text-gray-400">{showChangeStatus ? "collapse" : "expand"}</span>
          </button>
          {showChangeStatus && (
            <div className="border-t border-gray-100 px-4 py-3 space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Action</p>
                <div className="flex items-center gap-2">
                  {(["approve","review","reject"] as const).map((s) => {
                    const icons = { approve: <CheckCircle2 className="w-3.5 h-3.5" />, review: <AlertTriangle className="w-3.5 h-3.5" />, reject: <XCircle className="w-3.5 h-3.5" /> };
                    const activeClass = { approve: "bg-emerald-600 text-white border-emerald-600", review: "bg-amber-500 text-white border-amber-500", reject: "bg-red-500 text-white border-red-500" }[s];
                    const label = { approve: "Approve", review: "Review", reject: "Reject" }[s];
                    return (
                      <button key={s} onClick={() => setDecision({ ...decision, status: s })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                          ${decision.status === s ? activeClass : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                        {icons[s]}{label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {["Mail To","Mail Subject"].map((lbl, i) => {
                const val    = i === 0 ? mailTo    : mailSubject;
                const setter = i === 0 ? setMailTo : setMailSubject;
                return (
                  <div key={lbl}>
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">{lbl}</label>
                    <input value={val} onChange={(e) => setter(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-all" />
                  </div>
                );
              })}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Mail Body</label>
                <textarea value={mailBody} onChange={(e) => setMailBody(e.target.value)} rows={5}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-all resize-none" />
              </div>
              {submitError && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{submitError}</p>}
              <button onClick={handleApplyStatus} disabled={submitting || submitted}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:cursor-not-allowed
                  ${submitted ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300"}`}>
                {submitting ? "Applying…" : submitted ? "Done!" : "Apply Status"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Command */}
      {initialDecision.command && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <Sparkles className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">AI Command</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-700 font-mono leading-relaxed whitespace-pre-wrap">{initialDecision.command}</p>
          </div>
        </div>
      )}

      {/* Mail details */}
      {(initialDecision.mail_to || initialDecision.mail_subject || initialDecision.mail_body) && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Vendor Notification</p>
          </div>
          <div className="px-4 py-3 space-y-3">
            {initialDecision.mail_to      && <div><p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">To</p><p className="text-xs font-medium text-gray-800">{initialDecision.mail_to}</p></div>}
            {initialDecision.mail_subject && <div><p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Subject</p><p className="text-xs text-gray-700">{initialDecision.mail_subject}</p></div>}
            {initialDecision.mail_body    && <div><p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Message</p><p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">{initialDecision.mail_body}</p></div>}
          </div>
        </div>
      )}

      {/* Matching status */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Matching Status</p>
        <InvoiceStatusBadge status={toMatchingStatus(matchingStatus)} />
        {matchingStatus !== "pending" && (
          <p className="text-[11px] text-gray-400 mt-2">Action has been taken on this group.</p>
        )}
      </div>
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────
export default function InvoiceDetailPanel({
  invoice, onClose, onStatusChange,
}: {
  invoice: InvoiceData;
  onClose: () => void;
  onStatusChange?: (invoiceId: string, poId: string | null, newStatus: "approved" | "reviewed" | "rejected") => void;
}) {
  const [activeTab, setActiveTab]           = useState<Tab>("group");
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [decisionModal, setDecisionModal]   = useState<"review" | "reject" | null>(null);

  const decision       = matchingToDecision(invoice);
  const showResultTab  = decision !== null;
  const representativeId = groupInvoiceId(invoice);
  const totalAmt       = groupTotalAmount(invoice);
  const currency       = groupCurrencyCode(invoice);
  const vendorName     = groupVendorName(invoice);
  const invoiceDate    = groupInvoiceDate(invoice);
  const invoiceIds     = invoice.invoice_ids ?? (invoice.invoice_id ? [invoice.invoice_id] : []);
  const poIds          = invoice.po_ids ?? (invoice.po_id ? [invoice.po_id] : []);

  const baseTabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "group",   label: "Group",   icon: <Layers    className="w-3.5 h-3.5" /> },
    { key: "file",    label: "File",    icon: <Paperclip className="w-3.5 h-3.5" /> },
    { key: "history", label: "History", icon: <Clock     className="w-3.5 h-3.5" /> },
  ];
  const tabs = showResultTab
    ? [...baseTabs, { key: "result" as Tab, label: "Result", icon: <Sparkles className="w-3.5 h-3.5" /> }]
    : baseTabs;

  const handleActionDone = (newStatus: "approved" | "reviewed" | "rejected") => {
    setConfirmApprove(false);
    setDecisionModal(null);
    onStatusChange?.(representativeId, invoice.po_id ?? null, newStatus);
    setActiveTab("result");
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
        className="flex flex-col h-full bg-white">

        {/* Header */}
        <div className="bg-blue-600 px-5 py-4 shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Matching Group</h2>
                {invoice.group_id && <p className="text-[11px] text-blue-200 font-mono">#{invoice.group_id}</p>}
                {vendorName && <p className="text-xs text-blue-200 mt-0.5 truncate max-w-48">{vendorName}</p>}
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors shrink-0">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          {/* Summary row */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xl font-bold text-white tabular-nums">{formatCurrency(totalAmt, currency)}</p>
              <p className="text-xs text-blue-200 mt-0.5">{invoiceDate}</p>
            </div>
            <InvoiceStatusBadge status={toMatchingStatus(invoice.matching_status)} />
          </div>

          {/* ID pills */}
          <div className="flex flex-wrap gap-1 mb-2">
            {invoiceIds.map((id) => (
              <span key={id} className="text-[10px] font-mono bg-white/20 text-white px-1.5 py-0.5 rounded flex items-center gap-1">
                <Receipt className="w-2.5 h-2.5" />{id}
              </span>
            ))}
            {poIds.map((id) => (
              <span key={id} className="text-[10px] font-mono bg-white/15 text-blue-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                <LinkIcon className="w-2.5 h-2.5" />{id}
              </span>
            ))}
          </div>

          {/* Quick action buttons */}
          {decision && invoice.matching_status === "pending" && (
            <div className="flex items-center gap-2">
              {decision.status === "approve" && (
                <button onClick={() => setConfirmApprove(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-semibold transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
              )}
              {decision.status === "review" && (
                <button onClick={() => setDecisionModal("review")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-amber-700 hover:bg-amber-50 text-xs font-semibold transition-colors">
                  <AlertTriangle className="w-3.5 h-3.5" /> Review
                </button>
              )}
              {decision.status === "reject" && (
                <button onClick={() => setDecisionModal("reject")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors">
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-2 overflow-x-auto shrink-0 bg-white">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap mx-0.5
                ${activeTab === tab.key
                  ? "border-blue-500 text-blue-600 bg-blue-50/50 rounded-t-lg"
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}>
              {tab.icon}{tab.label}
              {tab.key === "result" && activeTab !== "result" && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-0.5" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/40">
          <div className="p-5">
            {activeTab === "group"   && <GroupTab group={invoice} />}
            {activeTab === "file"    && <InvoiceFileTab fileUrl={invoice.file_url} />}
            {activeTab === "history" && <InvoiceHistoryTab invoiceId={representativeId} />}
            {activeTab === "result"  && decision && (
              <ResultTab
                decision={decision}
                matchingStatus={invoice.matching_status ?? "pending"}
                invoiceId={representativeId}
                onStatusChange={onStatusChange}
              />
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {confirmApprove && (
          <ConfirmApproveModal
            invoiceId={representativeId}
            onConfirm={() => handleActionDone("approved")}
            onCancel={() => setConfirmApprove(false)}
          />
        )}
        {decisionModal && (
          <DecisionDetailModal
            invoiceId={representativeId}
            type={decisionModal}
            invoiceRow={invoice}
            onClose={() => setDecisionModal(null)}
            onStatusChange={(_, newStatus) => handleActionDone(newStatus as "reviewed" | "rejected")}
          />
        )}
      </AnimatePresence>
    </>
  );
}
