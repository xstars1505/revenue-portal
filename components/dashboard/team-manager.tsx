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
    <section className="py-9">
      <div className="mb-6 flex items-end justify-between gap-[18px] [&>div]:min-w-0">
        <div>
          <h2 className="mb-2 text-2xl tracking-[-0.04em]">Approved access</h2>
          <p className="leading-[1.6] text-[#777b73]">
            Invite Google accounts and assign their portal role.
          </p>
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
            <form className="grid gap-0" onSubmit={invite}>
              <div className="grid gap-[18px] px-6 pt-1 pb-6">
                <div className="grid gap-2">
                  <Label htmlFor="invite-emails">Google account emails</Label>
                  <div
                    className="flex min-h-[78px] cursor-text content-start items-start flex-wrap gap-1.5 rounded-lg border border-input bg-white p-[9px] transition-[border-color,box-shadow] duration-150 focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ring)_25%,transparent)]"
                    onClick={() => inputRef.current?.focus()}
                  >
                    {emails.map((email) => (
                      <Badge
                        className="h-6 max-w-full bg-[#e8f0ea] pl-[9px] text-[#365247]"
                        variant="secondary"
                        key={email}
                      >
                        {email}
                        <button
                          className="mr-[-5px] grid size-[17px] place-items-center rounded-full border-0 bg-transparent text-[#6d8177] hover:bg-[#f6deda] hover:text-[#8e3f3a]"
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
                      className="h-[22px] w-auto min-w-[150px] flex-1 rounded-none border-0 bg-transparent px-[3px] text-xs shadow-none outline-0 focus-visible:ring-0 focus-visible:outline-0"
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
                  <small className="text-[9px] leading-[1.5] text-[#92968f]">
                    Press Enter or paste multiple addresses. Each user must sign
                    in through Google.
                  </small>
                </div>
                <div className="grid gap-2">
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
                  <div
                    className="flex items-center gap-2 rounded-[7px] bg-[#fdeceb] px-3 py-[11px] text-[13px] text-[#8c3935]"
                    role="alert"
                  >
                    <WarningCircle size={17} weight="fill" />
                    {error}
                  </div>
                )}
              </div>
              <DialogFooter className="mx-0 mb-0 px-6">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <SpinnerGap className="animate-spin" />
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
        <div
          className="mb-3 flex w-fit items-center gap-[7px] rounded-[7px] bg-[#eaf3ed] px-3 py-[11px] text-[11px] text-[#356248]"
          role="status"
        >
          <Check size={16} weight="bold" />
          {message}
        </div>
      )}
      {error && !open && (
        <div
          className="flex items-center gap-2 rounded-[7px] bg-[#fdeceb] px-3 py-[11px] text-[13px] text-[#8c3935]"
          role="alert"
        >
          <WarningCircle size={17} weight="fill" />
          {error}
        </div>
      )}
      <div className="rounded-[10px] border border-[#e6e7e1] bg-white">
        {loading ? (
          <div className="flex min-h-[90px] items-center justify-center gap-3 px-[18px] py-4 text-[11px] text-[#858982]">
            <SpinnerGap className="animate-spin" size={18} />
            Loading access list
          </div>
        ) : (
          users.map((user) => (
            <div
              className="flex items-center gap-3 border-b border-[#e6e7e1] px-[18px] py-4 last:border-b-0"
              key={user.email}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-[7px] bg-[#dcebe1] text-[10px] font-bold text-[#315442]">
                {user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="grid flex-1 gap-[3px]">
                <strong className="text-xs">{user.name}</strong>
                <span className="text-[10px] text-[#8d918a]">{user.email}</span>
              </div>
              <b className="text-[10px] font-medium text-[#60655e]">
                {user.role}
              </b>
              <span className="flex w-12 justify-end">
                <span
                  className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-1.5 py-1 text-[8px] ${user.joined ? "bg-[#e9f2ec] font-semibold text-[#3e6d52]" : "bg-[#efefeb] text-[#777b74]"}`}
                >
                  {user.joined ? (
                    <>
                      <Check size={12} /> Active
                    </>
                  ) : (
                    "Invited"
                  )}
                </span>
              </span>
              <span className="grid w-6 shrink-0 place-items-center">
                {user.role !== "admin" && (
                  <Button
                    className="bg-transparent text-[#a0a39d] transition-[color,background,transform] duration-150 hover:bg-[#f8efed] hover:text-[#8d4b46] active:scale-[0.92] [&_svg]:size-[13px]"
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={removing === user.email}
                    onClick={() => removeUser(user)}
                    aria-label={`Remove ${user.email}`}
                    title={`Remove ${user.joined ? "user" : "invitation"}`}
                  >
                    {removing === user.email ? (
                      <SpinnerGap className="animate-spin" />
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
