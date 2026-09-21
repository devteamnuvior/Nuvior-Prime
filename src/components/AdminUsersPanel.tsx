"use client";

import { useState, useTransition } from "react";
import { adminUpdateUserAction, adminCreateUserAction } from "@/app/actions";
import type { AppRoleName } from "@/domain/auth/permissions";

type UserRow = {
  id: string;
  email: string;
  displayName: string;
  role: AppRoleName;
  status: "ACTIVE" | "DISABLED";
  provinces: string[];
};

export function AdminUsersPanel({ users }: { users: UserRow[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div className="overflow-x-auto border border-rule bg-panel p-4">
        <table className="w-full text-left text-sm">
          <thead className="font-mono text-[0.65rem] uppercase text-muted">
            <tr>
              <th className="py-2">Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Provinces</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-rule-soft">
                <td className="py-2 font-mono text-xs">{u.email}</td>
                <td>{u.displayName}</td>
                <td>{u.role}</td>
                <td>{u.status}</td>
                <td className="font-mono text-xs">{u.provinces.join(",")}</td>
                <td className="space-x-2 py-2">
                  <button
                    type="button"
                    disabled={pending}
                    className="border border-rule px-2 py-0.5 text-xs"
                    onClick={() =>
                      start(async () => {
                        const next = u.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
                        const r = await adminUpdateUserAction({
                          userId: u.id,
                          status: next,
                        });
                        setMsg(r.message);
                      })
                    }
                  >
                    {u.status === "ACTIVE" ? "Disable" : "Enable"}
                  </button>
                  {u.role !== "ADMIN" && (
                    <button
                      type="button"
                      disabled={pending}
                      className="border border-rule px-2 py-0.5 text-xs"
                      onClick={() =>
                        start(async () => {
                          const r = await adminUpdateUserAction({
                            userId: u.id,
                            role: u.role === "REP" ? "MANAGER" : "REP",
                          });
                          setMsg(r.message);
                        })
                      }
                    >
                      Toggle REP/MANAGER
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        className="grid max-w-lg gap-2 border border-rule bg-panel p-4 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const r = await adminCreateUserAction({
              email: String(fd.get("email")),
              displayName: String(fd.get("displayName")),
              role: String(fd.get("role")) as AppRoleName,
              provinces: String(fd.get("provinces"))
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              password: String(fd.get("password")),
            });
            setMsg(r.message);
            if (r.ok) e.currentTarget.reset();
          });
        }}
      >
        <h2 className="font-semibold">Create local user</h2>
        <input name="email" placeholder="email" required className="border border-rule px-2 py-1" />
        <input
          name="displayName"
          placeholder="display name"
          required
          className="border border-rule px-2 py-1"
        />
        <select name="role" className="border border-rule px-2 py-1">
          <option value="REP">REP</option>
          <option value="MANAGER">MANAGER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <input
          name="provinces"
          placeholder="provinces e.g. ON,AB or *"
          defaultValue="ON"
          className="border border-rule px-2 py-1"
        />
        <input
          name="password"
          type="password"
          placeholder="password"
          required
          className="border border-rule px-2 py-1"
        />
        <button type="submit" className="border border-accent px-3 py-2 text-accent">
          Create
        </button>
      </form>
      {msg && <p className="font-mono text-xs text-accent">{msg}</p>}
    </div>
  );
}
