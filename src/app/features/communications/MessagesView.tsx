import { useEffect, useMemo, useState } from "react";
import { Filter, MessageSquare, Paperclip, Send, Smile, Users } from "lucide-react";
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
};

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
};

type Conversation = {
  key: string;
  isFamily: boolean;
  title: string;
  members: Member[];
  phone: string;
  messages: Msg[];
  preview: string;
  latestAt: number;
};

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
      isFamily,
      title,
      members,
      phone,
      messages: msgs,
      preview: latest?.body || "",
      latestAt: latest ? new Date(latest.sent_at).getTime() : 0,
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
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  function refresh() {
    return Promise.all([
      staffApi.messages.list(),
      staffApi.templateConfig.get().then(mapTemplateConfiguration).catch(() => null),
    ]).then(([msgs, cfg]) => {
      setMessages(msgs as Msg[]);
      setConfig(cfg);
    });
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const familyEnabled = !!config?.familyMessagingEnabled;
  const conversations = useMemo(
    () => buildConversations(messages, familyEnabled),
    [messages, familyEnabled]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q) ||
        c.members.some((m) => m.fullName.toLowerCase().includes(q)) ||
        c.phone.includes(q)
    );
  }, [conversations, search]);

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
    if (
      !activeMemberId ||
      !selected.members.some((m) => m.id === activeMemberId)
    ) {
      setActiveMemberId(selected.members[0]?.id ?? null);
    }
  }, [selected, activeMemberId]);

  async function send() {
    const text = draft.trim();
    const patientId = activeMemberId || selected?.members[0]?.id;
    if (!text || !patientId) return;
    setSending(true);
    try {
      await staffApi.messages.send(patientId, text, "sms");
      setDraft("");
      toastSuccess("Message sent");
      await refresh();
    } catch {
      toastError("Could not send message.");
    } finally {
      setSending(false);
    }
  }

  const sharedBy =
    selected?.isFamily && selected.members.length
      ? `Shared by ${selected.members
          .map((m) => m.fullName)
          .join(", ")
          .replace(/, ([^,]*)$/, ", & $1")}`
      : null;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-white">
      <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Messages</h1>
          {familyEnabled && (
            <p className="text-xs text-gray-500 mt-0.5">
              Patients who share a phone number appear as a unified Family thread.
            </p>
          )}
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          <Filter size={14} />
          Filter
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 px-5 py-8">Loading…</p>
      ) : conversations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <MessageSquare className="mx-auto text-gray-300 mb-3" size={28} />
            <p className="text-sm font-medium text-gray-700">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Patient SMS and email will appear here once sent.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(240px,320px)_1fr]">
          <aside className="border-r border-border flex flex-col min-h-0">
            <div className="p-3 border-b border-border">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter patients"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map((c) => {
                const active = c.key === selectedKey;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setSelectedKey(c.key)}
                    className={`w-full text-left px-3 py-3 flex gap-3 border-b border-gray-50 transition-colors ${
                      active ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <FamilyAvatar family={c.isFamily} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-sm text-gray-900 truncate">
                          {c.title}
                        </span>
                        <span className="text-[11px] text-gray-400 flex-shrink-0">
                          {c.messages.length
                            ? formatTime(c.messages[c.messages.length - 1].sent_at)
                            : ""}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{c.preview}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex flex-col min-h-0 min-w-0">
            {selected ? (
              <>
                <header className="px-4 py-3 border-b border-border flex items-start gap-3 flex-shrink-0">
                  <FamilyAvatar family={selected.isFamily} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-gray-900">{selected.title}</h2>
                    {sharedBy && (
                      <p className="text-xs text-gray-500 mt-0.5">{sharedBy}</p>
                    )}
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

                {familyEnabled && selected.isFamily && (
                  <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-900 flex-shrink-0">
                    Messages are visible across all linked profiles. Manual and automated messages
                    stay on this Family thread while keeping individual patient associations.
                  </div>
                )}

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/40">
                  {selected.messages.map((m) => {
                    const outbound = m.direction === "outbound";
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
                          <p
                            className={`text-[10px] mt-1 ${
                              outbound ? "text-teal-100" : "text-gray-500"
                            }`}
                          >
                            {outbound ? "NexHealth" : m.patient_name} · {formatTime(m.sent_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <footer className="p-3 border-t border-border flex items-center gap-2 flex-shrink-0 bg-white">
                  <button
                    type="button"
                    className="p-2 text-gray-400 hover:text-gray-600"
                    aria-label="Attach"
                  >
                    <Paperclip size={18} />
                  </button>
                  <button
                    type="button"
                    className="p-2 text-gray-400 hover:text-gray-600"
                    aria-label="Emoji"
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
                    disabled={sending || !draft.trim()}
                    onClick={() => void send()}
                    className="p-2.5 rounded-full bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-40"
                    aria-label="Send"
                  >
                    <Send size={16} />
                  </button>
                </footer>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                Select a conversation
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
