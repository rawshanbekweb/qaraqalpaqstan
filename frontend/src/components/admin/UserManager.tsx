"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, KeyRound, Loader2, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
  type AdminUser,
  type UserRole,
} from "@/lib/users";
import { getSession } from "@/lib/session";
import { cn, formatDate } from "@/lib/utils";
import { Button, Field, Input, Select } from "@/components/ui/primitives";

/**
 * Admin paydalanıwshılarını basqarıw.
 *
 * Aldın hisap qosıw tek serverge kirip `python -m app.seed` skriptin
 * ózgertiw arqalı múmkin edi. Bul panel qosıw/rol ózgertiw/parol
 * almastırıw/óshiriwdi admin panelden isleydi.
 */
export function UserManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const me = getSession();

  const reload = useCallback(() => {
    listUsers()
      .then((rows) => {
        setUsers(rows);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function changeRole(u: AdminUser, role: UserRole) {
    try {
      const updated = await updateUser(u.id, { role });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rol ózgermedi");
    }
  }

  async function remove(u: AdminUser) {
    try {
      await deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Óshirilmedi");
    }
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          onClick={() => setCreating((v) => !v)}
          variant={creating ? "outline" : "solid"}
        >
          {creating ? <X size={15} /> : <UserPlus size={15} />}
          {creating ? "Biykarlaw" : "Jańa paydalanıwshı"}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-crimson/12 px-3 py-2.5 ring-1 ring-crimson/30">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-crimson" />
          <span className="text-[13px] text-coral">{error}</span>
        </div>
      )}

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <NewUserForm
              onCreated={(u) => {
                setUsers((prev) => [...prev, u].sort((a, b) => a.username.localeCompare(b.username)));
                setCreating(false);
                setError(null);
              }}
              onError={setError}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-[13.5px] text-ink-3">
          <Loader2 size={15} className="animate-spin" />
          Júklenbekte…
        </div>
      ) : (
        <div className="thin-scroll overflow-x-auto rounded-2xl ring-1 ring-edge/50">
          <table className="w-full min-w-[560px] border-collapse text-[13px]">
            <thead className="bg-abyss/70">
              <tr>
                {["Login", "Atı-jóni", "Rol", "Jaratılǵan", ""].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-[11.5px] font-semibold tracking-wider text-ink-3 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  isSelf={u.username === me?.username}
                  onRoleChange={(role) => changeRole(u, role)}
                  onRemove={() => remove(u)}
                  onError={setError}
                  onPasswordChanged={() => setError(null)}
                />
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-ink-3">
                    Hesh paydalanıwshı joq
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  onRoleChange,
  onRemove,
  onError,
  onPasswordChanged,
}: {
  user: AdminUser;
  isSelf: boolean;
  onRoleChange: (role: UserRole) => void;
  onRemove: () => void;
  onError: (msg: string) => void;
  onPasswordChanged: () => void;
}) {
  const [changingPassword, setChangingPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function savePassword() {
    if (password.trim().length < 6) {
      onError("Parol keminde 6 belgi bolıwı kerek");
      return;
    }
    setBusy(true);
    try {
      await updateUser(user.id, { password: password.trim() });
      onPasswordChanged();
      setChangingPassword(false);
      setPassword("");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Parol ózgermedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-hairline/50 transition hover:bg-raised/35">
      <td className="px-3 py-2 font-medium text-ink">
        {user.username}
        {isSelf && <span className="ml-1.5 text-[11px] text-ink-3">(siz)</span>}
      </td>
      <td className="px-3 py-2 text-ink-2">{user.full_name || "—"}</td>
      <td className="px-3 py-2">
        <Select
          value={user.role}
          onChange={(e) => onRoleChange(e.target.value as UserRole)}
          disabled={isSelf}
          className="w-auto min-w-[130px]"
        >
          <option value="admin">administrator</option>
          <option value="viewer">kóruwshi</option>
        </Select>
      </td>
      <td className="tnum px-3 py-2 text-ink-3">{formatDate(user.created_at.slice(0, 10))}</td>
      <td className="px-3 py-2">
        {changingPassword ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="jańa parol"
              className="w-32 py-1.5 text-[12.5px]"
              autoFocus
            />
            <button
              onClick={savePassword}
              disabled={busy}
              className="grid size-7 shrink-0 place-items-center rounded-md text-mint hover:bg-mint/10 disabled:opacity-50"
              title="Saqlaw"
              aria-label="Saqlaw"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
            </button>
            <button
              onClick={() => {
                setChangingPassword(false);
                setPassword("");
              }}
              className="grid size-7 shrink-0 place-items-center rounded-md text-ink-3 hover:text-coral"
              title="Biykarlaw"
              aria-label="Biykarlaw"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setChangingPassword(true)}
              title="Paroldı almastırıw"
              aria-label="Paroldı almastırıw"
              className="grid size-7 shrink-0 place-items-center rounded-md text-ink-3 transition hover:text-cyan"
            >
              <KeyRound size={13} />
            </button>
            <button
              onClick={onRemove}
              disabled={isSelf}
              title={isSelf ? "Óz hesabıńızdı óshire almaysız" : "Óshiriw"}
              aria-label={isSelf ? "Óz hesabıńızdı óshire almaysız" : "Óshiriw"}
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-md transition",
                isSelf ? "text-ink-3/40" : "text-ink-3 hover:text-coral",
              )}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function NewUserForm({
  onCreated,
  onError,
}: {
  onCreated: (u: AdminUser) => void;
  onError: (msg: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || password.trim().length < 6 || busy) return;
    setBusy(true);
    try {
      const user = await createUser({
        username: username.trim(),
        full_name: fullName.trim(),
        password: password.trim(),
        role,
      });
      onCreated(user);
      setUsername("");
      setFullName("");
      setPassword("");
      setRole("viewer");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Paydalanıwshı jaratılmadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass space-y-3.5 rounded-2xl p-4">
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Login">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="mısalı: b.reymov"
            required
          />
        </Field>
        <Field label="Atı-jóni">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="A.Á.T." />
        </Field>
        <Field label="Parol" hint="keminde 6 belgi">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </Field>
        <Field label="Rol">
          <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="viewer">kóruwshi</option>
            <option value="admin">administrator</option>
          </Select>
        </Field>
      </div>

      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
        Paydalanıwshı jaratıw
      </Button>
    </form>
  );
}
