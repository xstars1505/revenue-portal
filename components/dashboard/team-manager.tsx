"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Check,
  SpinnerGap,
  Trash,
  UserPlus,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Invite = {
  email: string;
  name: string;
  role: string;
  active: boolean;
  joined: boolean;
};
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const splitEmails = (value: string) =>
  value
    .split(/[\s,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export function TeamManager() {
  const [users, setUsers] = useState<Invite[]>([]);
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadUsers = useCallback(async () => {
    const response = await fetch("/api/team");
    if (response.ok) setUsers((await response.json()).users);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function commit(value: string) {
    const next = splitEmails(value);
    if (!next.length) return;
    const invalid = next.find((email) => !emailPattern.test(email));
    if (invalid) {
      setError(`Invalid email: ${invalid}`);
      return;
    }
    const combined = [...new Set([...emails, ...next])];
    if (combined.length > 50) {
      setError("You can invite up to 50 accounts at once");
      return;
    }
    setEmails(combined);
    setDraft("");
    setError("");
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const inviteEmails = [...new Set([...emails, ...splitEmails(draft)])];
    const invalid = inviteEmails.find((email) => !emailPattern.test(email));
    if (!inviteEmails.length || invalid || inviteEmails.length > 50) {
      setError(
        invalid
          ? `Invalid email: ${invalid}`
          : "Add between 1 and 50 email addresses",
      );
      return;
    }
    setSaving(true);
    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ emails: inviteEmails, role }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      if (data.invited) {
        setEmails(data.failed ?? []);
        setDraft("");
        await loadUsers();
      }
      setError(data.error ?? "Could not add invitations");
      return;
    }
    setEmails([]);
    setDraft("");
    setMessage(
      `${data.invited} invitation ${data.invited === 1 ? "email" : "emails"} sent`,
    );
    setOpen(false);
    await loadUsers();
  }

  async function removeUser(user: Invite) {
    const description = user.joined
      ? `${user.email} will immediately lose portal access.`
      : `The pending invitation for ${user.email} will be cancelled.`;
    if (!window.confirm(`Remove ${user.email}?\n\n${description}`)) return;
    setError("");
    setMessage("");
    setRemoving(user.email);
    const response = await fetch(
      `/api/team?email=${encodeURIComponent(user.email)}`,
      { method: "DELETE" },
    );
    const data = await response.json();
    setRemoving("");
    if (!response.ok) {
      setError(data.error ?? "Could not remove invitation");
      return;
    }
    setUsers((current) => current.filter((item) => item.email !== user.email));
    setMessage(user.joined ? "User removed" : "Pending invitation removed");
  }

  return (
    <section className="page-section">
      <div className="section-copy team-heading">
        <div>
          <h2>Approved access</h2>
          <p>Invite Google accounts and assign their portal role.</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (nextOpen) {
              setError("");
              setMessage("");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="lg">
              <UserPlus />
              Invite users
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] p-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>Invite users</DialogTitle>
              <DialogDescription>
                Add up to 50 Google accounts at once.
              </DialogDescription>
            </DialogHeader>
            <form className="invite-dialog-form" onSubmit={invite}>
              <div className="invite-dialog-fields">
                <div className="invite-field">
                  <Label htmlFor="invite-emails">Google account emails</Label>
                  <div
                    className="email-chip-input"
                    onClick={() => inputRef.current?.focus()}
                  >
                    {emails.map((email) => (
                      <Badge variant="secondary" key={email}>
                        {email}
                        <button
                          type="button"
                          aria-label={`Remove ${email}`}
                          onClick={() =>
                            setEmails((current) =>
                              current.filter((item) => item !== email),
                            )
                          }
                        >
                          <X size={12} weight="bold" />
                        </button>
                      </Badge>
                    ))}
                    <Input
                      ref={inputRef}
                      id="invite-emails"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onBlur={() => commit(draft)}
                      onKeyDown={(event) => {
                        if (["Enter", ",", ";", " "].includes(event.key)) {
                          event.preventDefault();
                          commit(draft);
                        } else if (event.key === "Backspace" && !draft)
                          setEmails((current) => current.slice(0, -1));
                      }}
                      onPaste={(event) => {
                        const pasted = event.clipboardData.getData("text");
                        if (splitEmails(pasted).length) {
                          event.preventDefault();
                          commit(pasted);
                        }
                      }}
                      placeholder={
                        emails.length ? "Add another email" : "name@gmail.com"
                      }
                      inputMode="email"
                      autoComplete="off"
                    />
                  </div>
                  <small>
                    Press Enter or paste multiple addresses. Each user must sign
                    in through Google.
                  </small>
                </div>
                <div className="invite-field">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {error && (
                  <div className="form-error" role="alert">
                    <WarningCircle size={17} weight="fill" />
                    {error}
                  </div>
                )}
              </div>
              <DialogFooter className="mx-0 mb-0 px-6">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <SpinnerGap className="spin" />
                      Sending invitations
                    </>
                  ) : (
                    <>
                      <UserPlus />
                      Send invitations
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {message && (
        <div className="invite-success" role="status">
          <Check size={16} weight="bold" />
          {message}
        </div>
      )}
      {error && !open && (
        <div className="form-error" role="alert">
          <WarningCircle size={17} weight="fill" />
          {error}
        </div>
      )}
      <div className="panel team-list">
        {loading ? (
          <div className="team-loading">
            <SpinnerGap className="spin" size={18} />
            Loading access list
          </div>
        ) : (
          users.map((user) => (
            <div key={user.email}>
              <span className="avatar">
                {user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
              <b>{user.role}</b>
              <span className="team-status">
                <span className={user.joined ? "status-badge" : "muted-badge"}>
                  {user.joined ? (
                    <>
                      <Check size={12} /> Active
                    </>
                  ) : (
                    "Invited"
                  )}
                </span>
              </span>
              <span className="team-action">
                {user.role !== "admin" && (
                  <Button
                    className="pending-remove"
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={removing === user.email}
                    onClick={() => removeUser(user)}
                    aria-label={`Remove ${user.email}`}
                    title={`Remove ${user.joined ? "user" : "invitation"}`}
                  >
                    {removing === user.email ? (
                      <SpinnerGap className="spin" />
                    ) : (
                      <Trash weight="regular" />
                    )}
                  </Button>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
