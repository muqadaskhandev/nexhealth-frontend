import { useCallback, useEffect, useState, type ReactNode, type FormEvent } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  MapPin,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import {
  ApiLocation,
  authApi,
  practiceApi,
  UserCreatePayload,
  UserDetail,
  usersApi,
} from "../lib/api";
import { PracticeSettingsPanel } from "./PracticeSettingsPanel";

type SettingsTab = "account" | "practice" | "users" | "locations";

const inputCls =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white";

function SettingsNav({
  tab,
  setTab,
  isAdmin,
}: {
  tab: SettingsTab;
  setTab: (t: SettingsTab) => void;
  isAdmin: boolean;
}) {
  const items: { id: SettingsTab; label: string; icon: ReactNode; admin?: boolean }[] = [
    { id: "account", label: "Account", icon: <User size={16} /> },
    { id: "practice", label: "Practice", icon: <MapPin size={16} />, admin: true },
    { id: "users", label: "Users", icon: <Users size={16} />, admin: true },
    { id: "locations", label: "Locations", icon: <MapPin size={16} /> },
  ];

  return (
    <nav className="w-52 flex-shrink-0 border-r border-border bg-white py-4 px-2 space-y-0.5">
      {items
        .filter((item) => !item.admin || isAdmin)
        .map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
              tab === item.id
                ? "bg-gray-900 text-white font-medium"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span className={tab === item.id ? "text-white" : "text-gray-400"}>{item.icon}</span>
            {item.label}
          </button>
        ))}
    </nav>
  );
}

function AccountSettings({ onPasswordChanged }: { onPasswordChanged: () => void }) {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.changePassword(current, next);
      setNotice("Password updated. Please sign in again.");
      setCurrent("");
      setNext("");
      setConfirm("");
      onPasswordChanged();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not change password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Account</h2>
        <p className="text-sm text-gray-500 mt-1">Your profile and sign-in security.</p>
      </div>

      <div className="bg-white rounded-xl border border-border p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-800">{user.full_name}</p>
        <p className="text-sm text-gray-600">{user.email}</p>
        <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
          {user.role}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Change password</h3>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700">
            {notice}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
          <input
            type="password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              required
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className={`${inputCls} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
          <input
            type={show ? "text" : "password"}
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors"
        >
          {submitting ? "Saving…" : "Update password"}
        </button>
      </form>

      <TotpSettings />
    </div>
  );
}

function TotpSettings() {
  const { user } = useAuth();
  const [uri, setUri] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user || user.account_type !== "practice") return null;

  async function startSetup() {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.totpSetup();
      setUri(res.provisioning_uri);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not start 2FA setup.");
    } finally {
      setLoading(false);
    }
  }

  async function enableTotp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApi.totpEnable(code);
      setNotice("Two-factor authentication is now enabled.");
      setUri(null);
      setCode("");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Invalid code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Two-factor authentication (2FA)</h3>
      {user.totp_enabled ? (
        <p className="text-sm text-green-700">2FA is enabled on your account.</p>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Required for Practice Admins. Use Google Authenticator or Authy.
          </p>
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
          )}
          {notice && (
            <div className="px-3 py-2 rounded-lg bg-green-50 text-sm text-green-700">{notice}</div>
          )}
          {!uri ? (
            <button
              type="button"
              onClick={startSetup}
              disabled={loading}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
            >
              Set up 2FA
            </button>
          ) : (
            <form onSubmit={enableTotp} className="space-y-3">
              <p className="text-xs text-gray-500 break-all">
                Add this to your authenticator app: <code className="text-gray-700">{uri}</code>
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={inputCls}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg"
              >
                Enable 2FA
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function LocationCheckbox({
  location,
  checked,
  onChange,
}: {
  location: ApiLocation;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2.5 py-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
      />
      <span className="min-w-0">
        <span className="text-sm font-medium text-gray-900 block">{location.name}</span>
        <span className="text-xs text-gray-500">{location.address}</span>
      </span>
    </label>
  );
}

function UserFormModal({
  title,
  allLocations,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  allLocations: ApiLocation[];
  initial?: UserDetail;
  onClose: () => void;
  onSave: (payload: UserCreatePayload | { id: string; updates: Parameters<typeof usersApi.update>[1] }) => Promise<void>;
}) {
  const isEdit = !!initial;
  const [email, setEmail] = useState(initial?.email ?? "");
  const [firstName, setFirstName] = useState(initial?.first_name ?? "");
  const [lastName, setLastName] = useState(initial?.last_name ?? "");
  const [role, setRole] = useState<"admin" | "member">(initial?.role ?? "member");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [locationIds, setLocationIds] = useState<Set<string>>(
    () => new Set(initial?.locations.map((l) => l.id) ?? [])
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleLocation(id: string, on: boolean) {
    setLocationIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit && initial) {
        await onSave({
          id: initial.id,
          updates: {
            first_name: firstName,
            last_name: lastName,
            role,
            is_active: isActive,
            location_ids: [...locationIds],
          },
        });
      } else {
        await onSave({
          email,
          first_name: firstName,
          last_name: lastName,
          role,
          password: password || undefined,
          location_ids: [...locationIds],
        });
      }
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not save user.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
              {error}
            </div>
          )}
          {!isEdit && (
            <input
              className={inputCls}
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
          <input
            className={inputCls}
            required
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            className={inputCls}
            required
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <select
            className={inputCls}
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "member")}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          {!isEdit && (
            <input
              className={inputCls}
              type="password"
              placeholder="Password (optional — invite via reset)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300 text-teal-600"
              />
              Active account
            </label>
          )}
          <div className="pt-2">
            <p className="text-sm font-semibold text-gray-800 mb-2">Locations</p>
            <div className="border border-gray-200 rounded-lg px-3 max-h-40 overflow-y-auto">
              {allLocations.map((loc) => (
                <LocationCheckbox
                  key={loc.id}
                  location={loc}
                  checked={locationIds.has(loc.id)}
                  onChange={(on) => toggleLocation(loc.id, on)}
                />
              ))}
            </div>
          </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InviteStaffModal({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: () => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await practiceApi.inviteStaff({
        email,
        first_name: firstName,
        last_name: lastName,
      });
      onSent();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not send invite.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-md space-y-4"
      >
        <h3 className="font-semibold text-gray-900">Invite staff member</h3>
        <p className="text-sm text-gray-500">An email invite will be sent via AWS SES.</p>
        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
        )}
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputCls}
          />
          <input
            required
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold bg-teal-500 text-white rounded-lg disabled:opacity-60"
          >
            Send invite
          </button>
        </div>
      </form>
    </div>
  );
}

function UsersSettings({ allLocations }: { allLocations: ApiLocation[] }) {
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState<UserDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await usersApi.list());
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(payload: UserCreatePayload) {
    await usersApi.create(payload);
    setNotice("User created.");
    await load();
  }

  async function handleUpdate(
    data: { id: string; updates: Parameters<typeof usersApi.update>[1] }
  ) {
    await usersApi.update(data.id, data.updates);
    setNotice("User updated.");
    await load();
  }

  async function handleSendReset(u: UserDetail) {
    try {
      await usersApi.sendReset(u.id);
      setNotice(`Password reset sent to ${u.email}.`);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not send reset.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500 mt-1">Manage practice staff and access.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInvite(true)}
            className="px-4 py-2 text-sm font-semibold bg-teal-500 text-white rounded-lg hover:bg-teal-600"
          >
            Invite by email
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-800"
          >
            Add user
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700">
          {notice}
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-gray-400">Loading users…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/80">
                <th className="text-left px-5 py-3 font-semibold text-gray-800">Name</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-800">Email</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-800">Role</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-800">Status</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-800">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{u.full_name}</td>
                  <td className="px-5 py-3.5 text-gray-600">{u.email}</td>
                  <td className="px-5 py-3.5 capitalize text-gray-600">{u.role}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <button
                      onClick={() => setEditing(u)}
                      className="text-sm font-medium text-teal-600 hover:text-teal-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleSendReset(u)}
                      className="text-sm font-medium text-gray-500 hover:text-gray-700"
                    >
                      Reset password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showInvite && (
        <InviteStaffModal
          onClose={() => setShowInvite(false)}
          onSent={() => {
            setShowInvite(false);
            setNotice("Invitation email sent via SES.");
          }}
        />
      )}
      {showCreate && (
        <UserFormModal
          title="Add user"
          allLocations={allLocations}
          onClose={() => setShowCreate(false)}
          onSave={async (p) => {
            if ("email" in p) await handleCreate(p);
          }}
        />
      )}
      {editing && (
        <UserFormModal
          title={`Edit ${editing.full_name}`}
          allLocations={allLocations}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (p) => {
            if ("id" in p) await handleUpdate(p);
          }}
        />
      )}
    </div>
  );
}

function LocationsSettings() {
  const { locations, activeLocation } = useAuth();

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Locations</h2>
        <p className="text-sm text-gray-500 mt-1">
          Practice locations you can access. Contact an admin to change addresses or branding.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {locations.map((loc) => (
          <div
            key={loc.id}
            className={`bg-white rounded-xl border p-4 ${
              loc.id === activeLocation?.id ? "border-teal-400 ring-1 ring-teal-100" : "border-border"
            }`}
          >
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{loc.name}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{loc.address}</p>
                {loc.id === activeLocation?.id && (
                  <span className="inline-block mt-2 text-[10px] font-semibold uppercase tracking-wide text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsSection({ onBack }: { onBack: () => void }) {
  const { user, logout, locations } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState<SettingsTab>("account");

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-6 py-4 border-b border-border bg-white flex items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>
      <div className="flex flex-1 min-h-0">
        <SettingsNav tab={tab} setTab={setTab} isAdmin={!!isAdmin} />
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {tab === "account" && <AccountSettings onPasswordChanged={() => logout()} />}
          {tab === "practice" && isAdmin && <PracticeSettingsPanel />}
          {tab === "users" && isAdmin && <UsersSettings allLocations={locations} />}
          {tab === "locations" && <LocationsSettings />}
        </div>
      </div>
    </div>
  );
}
