import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Bell,
  Filter,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Smile,
  Users,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { mapTemplateConfiguration, staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { TemplateConfiguration } from "../../types";

type Msg = {
  id: string;
  thread_id: string;
  body: string;
  direction: string;
  channel: string;
  sent_at: string;
  patient_id: string | null;
  patient_name: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_phone: string;
  delivery_status: string;
  failure_reason: string | null;
  attachment_name: string | null;
  thread_unread: boolean;
  thread_archived: boolean;
};

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
};

type Conversation = {
  key: string;
  threadId: string | null;
  isFamily: boolean;
  title: string;
  members: Member[];
  phone: string;
  messages: Msg[];
  preview: string;
  latestAt: number;
  unread: boolean;
  archived: boolean;
};

type PatientHit = {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
};

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "🤩", "😘", "😗", "😜",
  "🤔", "😐", "😴", "😢", "😭", "😡", "👍", "👎", "👏", "🙏",
  "🎉", "❤️", "💙", "💚", "✅", "❌", "⭐", "🔥", "💯", "📌",
];

function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function buildConversations(messages: Msg[], familyEnabled: boolean): Conversation[] {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
  );

  const groups = new Map<string, Msg[]>();
  for (const m of sorted) {
    const phone = normalizePhone(m.patient_phone);
    const key =
      familyEnabled && phone
        ? `phone:${phone}`
        : m.patient_id
          ? `patient:${m.patient_id}`
          : `msg:${m.id}`;
    const list = groups.get(key) || [];
    list.push(m);
    groups.set(key, list);
  }

  const conversations: Conversation[] = [];
  for (const [key, msgs] of groups) {
    const memberMap = new Map<string, Member>();
    for (const m of msgs) {
      if (!m.patient_id) continue;
      if (!memberMap.has(m.patient_id)) {
        memberMap.set(m.patient_id, {
          id: m.patient_id,
          firstName: m.patient_first_name || "",
          lastName: m.patient_last_name || "",
          fullName: m.patient_name || "Patient",
        });
      }
    }
    const members = [...memberMap.values()];
    const lastNames = [...new Set(members.map((x) => x.lastName).filter(Boolean))];
    const phone = msgs.find((m) => m.patient_phone)?.patient_phone || "";
    const isFamily = familyEnabled && members.length > 1 && !!normalizePhone(phone);
    const title = isFamily
      ? `${lastNames[0] || members[0]?.lastName || "Family"} Family`
      : members[0]?.fullName || msgs[0]?.patient_name || "Conversation";
    const latest = msgs[msgs.length - 1];
    conversations.push({
      key,
      threadId: latest?.thread_id || null,
      isFamily,
      title,
      members,
      phone,
      messages: msgs,
      preview: latest?.body || "",
      latestAt: latest ? new Date(latest.sent_at).getTime() : 0,
      unread: msgs.some((m) => m.thread_unread),
      archived: msgs.some((m) => m.thread_archived),
    });
  }

  return conversations.sort((a, b) => b.latestAt - a.latestAt);
}

function FamilyAvatar({ family }: { family: boolean }) {
  return (
    <span
      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
        family ? "bg-gray-700 text-white" : "bg-teal-50 text-teal-700"
      }`}
    >
      {family ? <Users size={16} /> : <MessageSquare size={15} />}
    </span>
  );
}

export function MessagesView() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [config, setConfig] = useState<TemplateConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [patientHits, setPatientHits] = useState<PatientHit[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState("");
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [draftPatient, setDraftPatient] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function refresh() {
    return Promise.all([
      staffApi.messages.list(undefined, showArchived),
      staffApi.templateConfig.get().then(mapTemplateConfiguration).catch(() => null),
    ]).then(([msgs, cfg]) => {
      setMessages(msgs as Msg[]);
      setConfig(cfg);
    });
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [showArchived]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setPatientHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      staffApi.patients
        .list(q)
        .then((rows) =>
          setPatientHits(
            rows.slice(0, 8).map((p) => ({
              id: p.id,
              first_name: p.first_name,
              last_name: p.last_name,
              phone: p.phone,
            }))
          )
        )
        .catch(() => setPatientHits([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!menuKey) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuKey(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuKey]);

  const familyEnabled = !!config?.familyMessagingEnabled;
  const conversations = useMemo(() => {
    const base = buildConversations(messages, familyEnabled);
    if (!draftPatient) return base;
    const exists = base.some((c) => c.members.some((m) => m.id === draftPatient.id));
    if (exists) return base;
    return [
      {
        key: `patient:${draftPatient.id}`,
        threadId: null,
        isFamily: false,
        title: draftPatient.name,
        members: [
          {
            id: draftPatient.id,
            firstName: draftPatient.name.split(" ")[0] || "",
            lastName: draftPatient.name.split(" ").slice(1).join(" ") || "",
            fullName: draftPatient.name,
          },
        ],
        phone: draftPatient.phone,
        messages: [],
        preview: "Start a conversation",
        latestAt: Date.now(),
        unread: false,
        archived: false,
      },
      ...base,
    ];
  }, [messages, familyEnabled, draftPatient]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = conversations;
    if (!showArchived) list = list.filter((c) => !c.archived);
    if (!q) return list;
    return list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q) ||
        c.members.some((m) => m.fullName.toLowerCase().includes(q)) ||
        c.phone.includes(q)
    );
  }, [conversations, search, showArchived]);

  useEffect(() => {
    if (!selectedKey && filtered.length > 0) {
      setSelectedKey(filtered[0].key);
    } else if (selectedKey && !filtered.some((c) => c.key === selectedKey)) {
      setSelectedKey(filtered[0]?.key ?? null);
    }
  }, [filtered, selectedKey]);

  const selected = filtered.find((c) => c.key === selectedKey) || null;

  useEffect(() => {
    if (!selected) {
      setActiveMemberId(null);
      return;
    }
    if (!activeMemberId || !selected.members.some((m) => m.id === activeMemberId)) {
      setActiveMemberId(selected.members[0]?.id ?? null);
    }
  }, [selected, activeMemberId]);

  useEffect(() => {
    if (!selected?.threadId || !selected.unread) return;
    void staffApi.messages
      .updateThread(selected.threadId, { unread: false })
      .then(() => refresh())
      .catch(() => undefined);
  }, [selected?.key]);

  async function send() {
    const text = draft.trim();
    const patientId = activeMemberId || selected?.members[0]?.id;
    if ((!text && !attachmentName) || !patientId) return;
    setSending(true);
    try {
      const sent = (await staffApi.messages.send(
        patientId,
        text,
        "sms",
        attachmentName
      )) as Msg;
      setDraft("");
      setAttachmentName(null);
      setEmojiOpen(false);
      if (sent.delivery_status === "failed") {
        toastError(sent.failure_reason || "Message failed to send");
      } else {
        toastSuccess("Message sent");
      }
      setDraftPatient(null);
      await refresh();
      setSelectedKey(
        familyEnabled && normalizePhone(sent.patient_phone)
          ? `phone:${normalizePhone(sent.patient_phone)}`
          : `patient:${patientId}`
      );
    } catch {
      toastError("Could not send message.");
    } finally {
      setSending(false);
    }
  }

  async function markUnread(c: Conversation) {
    if (!c.threadId) return;
    setMenuKey(null);
    try {
      await staffApi.messages.updateThread(c.threadId, { unread: true });
      toastSuccess("Marked as unread");
      await refresh();
    } catch {
      toastError("Could not update thread.");
    }
  }

  async function archiveThread(c: Conversation) {
    if (!c.threadId) return;
    setMenuKey(null);
    try {
      await staffApi.messages.updateThread(c.threadId, { archived: !c.archived });
      toastSuccess(c.archived ? "Thread restored" : "Thread archived");
      await refresh();
    } catch {
      toastError("Could not update thread.");
    }
  }

  function startWithPatient(p: PatientHit) {
    const name = `${p.first_name} ${p.last_name}`.trim();
    setDraftPatient({ id: p.id, name, phone: p.phone || "" });
    setSelectedKey(`patient:${p.id}`);
    setActiveMemberId(p.id);
    setSearch("");
    setPatientHits([]);
  }

  const sharedBy =
    selected?.isFamily && selected.members.length
      ? `Shared by ${selected.members
          .map((m) => m.fullName)
          .join(", ")
          .replace(/, ([^,]*)$/, ", & $1")}`
      : null;

  const emojiFiltered = emojiQuery
    ? EMOJIS // no name map — show all when searching keeps UX simple
    : EMOJIS;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-white">
      <div className="px-4 sm:px-5 py-4 border-b border-border flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Messages</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Real-time, one-off texts with patients. Use{" "}
              <span className="font-medium text-teal-700">Reminders</span> for appointment
              outreach.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              className="text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              {helpOpen ? "Hide tips" : "Tips"}
            </button>
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-2.5 py-1.5 border ${
                showArchived
                  ? "border-teal-300 bg-teal-50 text-teal-800"
                  : "border-border text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Filter size={14} />
              {showArchived ? "Showing archived" : "Filter"}
            </button>
          </div>
        </div>

        {helpOpen && (
          <div className="space-y-2 text-sm">
            <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-teal-950">
              Looking to send appointment reminders? Use Reminders (not Messages). Manual Messages
              are best for real-time conversations. Smart commands cannot be inserted into Messages.
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 space-y-1">
              <p className="font-medium">Primary phone number</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                <li>Messages go to the primary number on the patient profile (one number at a time).</li>
                <li>
                  With Family Messaging, a child with their own primary number may still be grouped
                  into a family thread to the parent/guardian. Contact{" "}
                  <a href="mailto:support@nexhealth.com" className="underline">
                    support@nexhealth.com
                  </a>{" "}
                  to disable that.
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-rose-950 text-xs space-y-1">
              <p className="font-medium text-sm">Why a message might fail</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Phone number missing or incorrect</li>
                <li>Patient unsubscribed (shown in the thread and patient profile)</li>
                <li>Patient blocked the number / SMS registration incomplete</li>
                <li>
                  Automated messages outside sending hours — manual Messages always send when you
                  click Send
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 px-5 py-8">Loading…</p>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(240px,320px)_1fr]">
          <aside className="border-r border-border flex flex-col min-h-0">
            <div className="p-3 border-b border-border relative">
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg">
                <Search size={15} className="text-gray-400 flex-shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a patient"
                  className="flex-1 outline-none text-sm placeholder:text-gray-400 bg-transparent"
                />
              </div>
              {patientHits.length > 0 && (
                <div className="absolute left-3 right-3 top-full mt-1 z-20 bg-white border border-border rounded-lg shadow-lg overflow-hidden">
                  {patientHits.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => startWithPatient(p)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      {p.first_name} {p.last_name}
                      {p.phone ? (
                        <span className="text-xs text-gray-400 ml-2">{p.phone}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-gray-400">
                  Search for a patient to start a thread.
                </div>
              ) : (
                filtered.map((c) => {
                  const active = c.key === selectedKey;
                  return (
                    <div
                      key={c.key}
                      className={`relative border-b border-gray-50 ${
                        active ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedKey(c.key)}
                        className="w-full text-left px-3 py-3 flex gap-3"
                      >
                        <FamilyAvatar family={c.isFamily} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span
                              className={`text-sm truncate ${
                                c.unread
                                  ? "font-bold text-gray-900"
                                  : "font-semibold text-gray-900"
                              }`}
                            >
                              {c.title}
                            </span>
                            <span className="text-[11px] text-gray-400 flex-shrink-0">
                              {c.messages.length
                                ? formatTime(c.messages[c.messages.length - 1].sent_at)
                                : ""}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {c.unread && (
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 mr-1.5 align-middle" />
                            )}
                            {c.preview}
                          </p>
                        </div>
                      </button>
                      {c.threadId && (
                        <button
                          type="button"
                          className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-700 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuKey(menuKey === c.key ? null : c.key);
                          }}
                          aria-label="Thread actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      )}
                      {menuKey === c.key && (
                        <div
                          ref={menuRef}
                          className="absolute right-2 top-8 z-30 w-44 bg-white border border-border rounded-lg shadow-lg py-1"
                        >
                          <button
                            type="button"
                            onClick={() => void markUnread(c)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Bell size={14} /> Mark as unread
                          </button>
                          <button
                            type="button"
                            onClick={() => void archiveThread(c)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Archive size={14} />
                            {c.archived ? "Unarchive" : "Archive"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex flex-col min-h-0 min-w-0">
            {selected ? (
              <>
                <header className="px-4 py-3 border-b border-border flex items-start gap-3 flex-shrink-0">
                  <FamilyAvatar family={selected.isFamily} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-gray-900">{selected.title}</h2>
                    {sharedBy && <p className="text-xs text-gray-500 mt-0.5">{sharedBy}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Sends to primary number{selected.phone ? `: ${selected.phone}` : ""}
                    </p>
                    {selected.isFamily && selected.members.length > 1 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selected.members.map((m) => {
                          const on = m.id === activeMemberId;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setActiveMemberId(m.id)}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                on
                                  ? "bg-teal-500 text-white border-teal-500"
                                  : "bg-white text-gray-700 border-gray-200 hover:border-teal-300"
                              }`}
                            >
                              {m.fullName}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/40">
                  {selected.messages.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">
                      Type a message below and click Send.
                    </p>
                  ) : (
                    selected.messages.map((m) => {
                      const outbound = m.direction === "outbound";
                      const failed = m.delivery_status === "failed";
                      return (
                        <div
                          key={m.id}
                          className={`flex gap-2 ${outbound ? "justify-end" : "justify-start"}`}
                        >
                          {!outbound && <FamilyAvatar family={selected.isFamily} />}
                          <div
                            className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                              outbound
                                ? "bg-teal-500 text-white rounded-br-md"
                                : "bg-gray-200/80 text-gray-900 rounded-bl-md"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.body}</p>
                            {m.attachment_name && (
                              <p
                                className={`text-xs mt-1 flex items-center gap-1 ${
                                  outbound ? "text-teal-100" : "text-gray-500"
                                }`}
                              >
                                <Paperclip size={12} /> {m.attachment_name}
                              </p>
                            )}
                            <p
                              className={`text-[10px] mt-1 flex items-center gap-1.5 flex-wrap ${
                                outbound ? "text-teal-100" : "text-gray-500"
                              }`}
                            >
                              <span>
                                {outbound ? "You" : m.patient_name} · {formatTime(m.sent_at)}
                              </span>
                              {failed && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-medium">
                                  <XCircle size={10} /> failed
                                </span>
                              )}
                            </p>
                            {failed && m.failure_reason && (
                              <p className="text-[10px] mt-1 text-rose-100/90">{m.failure_reason}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <footer className="p-3 border-t border-border flex-shrink-0 bg-white space-y-2 relative">
                  {attachmentName && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 px-1">
                      <Paperclip size={12} />
                      <span className="truncate">{attachmentName}</span>
                      <button
                        type="button"
                        className="text-teal-700 font-medium"
                        onClick={() => setAttachmentName(null)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {emojiOpen && (
                    <div className="absolute bottom-full left-3 mb-2 w-72 bg-white border border-border rounded-xl shadow-xl p-2 z-20">
                      <input
                        value={emojiQuery}
                        onChange={(e) => setEmojiQuery(e.target.value)}
                        placeholder="Search"
                        className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-200 rounded-md outline-none"
                      />
                      <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                        {emojiFiltered.map((e) => (
                          <button
                            key={e}
                            type="button"
                            className="text-xl hover:bg-gray-100 rounded p-1"
                            onClick={() => {
                              setDraft((d) => d + e);
                              setEmojiOpen(false);
                              setEmojiQuery("");
                            }}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setAttachmentName(f.name);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      className="p-2 text-gray-400 hover:text-gray-600"
                      aria-label="Attach"
                      onClick={() => fileRef.current?.click()}
                      title="PDFs, JPGs, and PNGs"
                    >
                      <Paperclip size={18} />
                    </button>
                    <button
                      type="button"
                      className="p-2 text-gray-400 hover:text-gray-600"
                      aria-label="Emoji"
                      onClick={() => setEmojiOpen((v) => !v)}
                    >
                      <Smile size={18} />
                    </button>
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void send();
                        }
                      }}
                      placeholder="Type a message…"
                      className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-full outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                    />
                    <button
                      type="button"
                      disabled={sending || (!draft.trim() && !attachmentName)}
                      onClick={() => void send()}
                      className="p-2.5 rounded-full bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-40"
                      aria-label="Send"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </footer>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400 px-6 text-center">
                Find a patient to start a message thread, or open Messages from a patient profile.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
