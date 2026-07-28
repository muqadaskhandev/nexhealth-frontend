import { useEffect, useMemo, useState } from "react";
import { Mail, MessageSquare, Search } from "lucide-react";
import { staffApi } from "../../lib/staff-api";

type Msg = {
  id: string;
  patient_name: string;
  body: string;
  channel: string;
  direction: string;
  sent_at: string;
};

export function MessagesView() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<"all" | "sms" | "email">("all");

  useEffect(() => {
    staffApi.messages
      .list()
      .then(setMessages)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return messages.filter((m) => {
      if (channel !== "all" && m.channel !== channel) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        m.patient_name.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q)
      );
    });
  }, [messages, search, channel]);

  const tabCls = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
      active ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
    }`;

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">
          SMS and email conversations with patients.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button type="button" className={tabCls(channel === "all")} onClick={() => setChannel("all")}>
            All
          </button>
          <button type="button" className={tabCls(channel === "sms")} onClick={() => setChannel("sms")}>
            SMS
          </button>
          <button
            type="button"
            className={tabCls(channel === "email")}
            onClick={() => setChannel("email")}
          >
            Email
          </button>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 bg-white border border-border rounded-xl max-w-md flex-1 shadow-sm">
          <Search size={15} className="text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients or messages…"
            className="flex-1 outline-none text-sm placeholder:text-gray-400 bg-transparent"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <MessageSquare className="mx-auto text-gray-300 mb-3" size={28} />
          <p className="text-sm font-medium text-gray-700">No messages yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Patient SMS and email will appear here once sent.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden divide-y divide-border">
          {filtered.map((m) => (
            <div key={m.id} className="px-5 py-4 flex gap-3 hover:bg-gray-50/80 transition-colors">
              <span
                className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  m.channel === "email"
                    ? "bg-indigo-50 text-indigo-600"
                    : "bg-teal-50 text-teal-600"
                }`}
              >
                {m.channel === "email" ? <Mail size={14} /> : <MessageSquare size={14} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">{m.patient_name}</span>
                  <span className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
                    {m.channel} · {m.direction}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(m.sent_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{m.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
