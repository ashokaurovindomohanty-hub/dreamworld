import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCallback, useEffect, useRef, useState } from "react";
import type { backendInterface } from "../backend";

// ─── Types ────────────────────────────────────────────────────────────────────
type Actor = backendInterface;

type TestStatus = "pending" | "running" | "pass" | "fail" | "skipped";

interface TestCase {
  id: string;
  method: string;
  description: string;
  isWrite: boolean;
  enabled: boolean;
  status: TestStatus;
  latency: number | null;
  error: string | null;
  result: unknown;
}

interface LogEntry {
  id: string;
  timestamp: string;
  method: string;
  args: string;
  result: string;
  latency: number;
  status: "success" | "error" | "pending";
}

interface StateData {
  isLoggedIn: boolean;
  principal: string | null;
  role: string | null;
  profile: {
    username: string;
    bio: string;
    zone: string;
    score: string;
  } | null;
  activeEventsCount: number | null;
  starsCount: number | null;
  groupsCount: number | null;
  publicJournalCount: number | null;
  unreadNotifications: string | null;
}

const READ_METHODS: Array<{
  method: keyof Actor;
  description: string;
  args?: unknown[];
}> = [
  { method: "getCallerUserRole", description: "Get caller's user role" },
  { method: "getCallerUserProfile", description: "Get caller's user profile" },
  { method: "getActiveEvents", description: "Get currently active events" },
  { method: "getAllEvents", description: "Get all world events" },
  { method: "getAllGroups", description: "Get all groups" },
  { method: "getAllStars", description: "Get all star dedications" },
  { method: "getLeaderboard", description: "Get top-10 leaderboard" },
  {
    method: "getPublicJournalEntries",
    description: "Get public journal entries",
  },
  { method: "getMyJournalEntries", description: "Get my journal entries" },
  {
    method: "getUnreadNotificationCount",
    description: "Get unread notification count",
  },
  {
    method: "getZoneMessages",
    description: "Get messages for Starter Plaza",
    args: ["Starter Plaza"],
  },
  { method: "isCallerAdmin", description: "Check if caller is admin" },
];

const WRITE_METHODS: Array<{ method: keyof Actor; description: string }> = [
  { method: "createProfile", description: "Create a user profile" },
  { method: "teleport", description: "Teleport to a zone" },
  { method: "sendMessage", description: "Send a chat message" },
  { method: "sendFriendRequest", description: "Send a friend request" },
  { method: "createGroup", description: "Create a group" },
  { method: "joinGroup", description: "Join a group" },
  { method: "dedicateStar", description: "Dedicate a star" },
  { method: "addJournalEntry", description: "Add a journal entry" },
  { method: "likeJournalEntry", description: "Like a journal entry" },
  { method: "deleteJournalEntry", description: "Delete a journal entry" },
  { method: "rsvpEvent", description: "RSVP to an event" },
  { method: "startQuest", description: "Start a quest" },
  { method: "completeQuest", description: "Complete a quest" },
  {
    method: "markAllNotificationsRead",
    description: "Mark all notifications read",
  },
  { method: "updateAvatar", description: "Update avatar config" },
];

const ALL_METHODS = [
  ...READ_METHODS.map((m) => ({ ...m, isWrite: false })),
  ...WRITE_METHODS.map((m) => ({ ...m, isWrite: true, args: undefined })),
];

const METHOD_PARAMS: Record<
  string,
  Array<{ name: string; type: "string" | "boolean" | "bigint" }>
> = {
  createProfile: [
    { name: "username", type: "string" },
    { name: "bio", type: "string" },
  ],
  teleport: [{ name: "zone", type: "string" }],
  sendMessage: [{ name: "content", type: "string" }],
  sendFriendRequest: [{ name: "to (Principal)", type: "string" }],
  acceptFriendRequest: [{ name: "from (Principal)", type: "string" }],
  createGroup: [
    { name: "name", type: "string" },
    { name: "description", type: "string" },
  ],
  joinGroup: [{ name: "groupName", type: "string" }],
  dedicateStar: [
    { name: "recipientName", type: "string" },
    { name: "message", type: "string" },
  ],
  addJournalEntry: [
    { name: "title", type: "string" },
    { name: "content", type: "string" },
    { name: "isPublic", type: "boolean" },
  ],
  likeJournalEntry: [{ name: "entryId", type: "bigint" }],
  deleteJournalEntry: [{ name: "entryId", type: "bigint" }],
  rsvpEvent: [{ name: "eventId", type: "bigint" }],
  startQuest: [{ name: "questId", type: "bigint" }],
  completeQuest: [{ name: "questId", type: "bigint" }],
  getZoneMessages: [{ name: "zone", type: "string" }],
  getProfile: [{ name: "user (Principal)", type: "string" }],
  getUserProfile: [{ name: "user (Principal)", type: "string" }],
  assignCallerUserRole: [
    { name: "user (Principal)", type: "string" },
    { name: "role (admin|user|guest)", type: "string" },
  ],
  addQuest: [
    { name: "title", type: "string" },
    { name: "description", type: "string" },
    { name: "rewardPoints", type: "bigint" },
  ],
  saveCallerUserProfile: [{ name: "profile (JSON)", type: "string" }],
  saveCallerUserProfileBook: [{ name: "profile (JSON)", type: "string" }],
  createEvent: [
    { name: "title", type: "string" },
    { name: "description", type: "string" },
    { name: "zone", type: "string" },
    { name: "startTime", type: "bigint" },
    { name: "endTime", type: "bigint" },
  ],
  markAllNotificationsRead: [],
  updateAvatar: [{ name: "avatar (JSON)", type: "string" }],
};

function truncate(s: string, n = 120): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function safeStringify(val: unknown): string {
  try {
    return JSON.stringify(
      val,
      (_k, v) => (typeof v === "bigint" ? `${v.toString()}n` : v),
      2,
    );
  } catch {
    return String(val);
  }
}

function nowTs(): string {
  return new Date().toISOString().slice(11, 23);
}

function statusIcon(s: TestStatus): string {
  if (s === "pending") return "⏳";
  if (s === "running") return "🔄";
  if (s === "pass") return "✅";
  if (s === "fail") return "❌";
  return "⏭️";
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface TestDebugPanelProps {
  actor: Actor | null;
  isLoggedIn: boolean;
  principal: string | null;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TestDebugPanel({
  actor,
  isLoggedIn,
  principal,
  onClose,
}: TestDebugPanelProps) {
  // ── Test Runner state ──
  const [tests, setTests] = useState<TestCase[]>(() =>
    ALL_METHODS.map((m) => ({
      id: m.method,
      method: m.method,
      description: m.description ?? "",
      isWrite: m.isWrite,
      enabled: !m.isWrite,
      status: "pending" as TestStatus,
      latency: null,
      error: null,
      result: undefined,
    })),
  );
  const [isRunning, setIsRunning] = useState(false);

  // ── Console log state ──
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── State inspector ──
  const [stateData, setStateData] = useState<StateData>({
    isLoggedIn,
    principal,
    role: null,
    profile: null,
    activeEventsCount: null,
    starsCount: null,
    groupsCount: null,
    publicJournalCount: null,
    unreadNotifications: null,
  });
  const [stateLoading, setStateLoading] = useState(false);

  // ── Manual caller state ──
  const [selectedMethod, setSelectedMethod] =
    useState<string>("getCallerUserRole");
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [callResult, setCallResult] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [callRunning, setCallRunning] = useState(false);

  // ── Auto-scroll logs ──
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }); // no deps - ref-based scroll

  // ── Logging helper ──
  const addLog = useCallback(
    (
      method: string,
      args: unknown[],
      result: unknown,
      latency: number,
      isError: boolean,
    ) => {
      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: nowTs(),
        method,
        args: truncate(safeStringify(args)),
        result: truncate(safeStringify(result)),
        latency,
        status: isError ? "error" : "success",
      };
      setLogs((prev) => [...prev, entry]);
    },
    [],
  );

  // ── Run single test ──
  const runTest = useCallback(
    async (tc: TestCase): Promise<TestCase> => {
      if (!actor) {
        return {
          ...tc,
          status: "fail",
          error: "No actor — not connected",
          latency: 0,
        };
      }
      if (!tc.enabled) {
        return { ...tc, status: "skipped" };
      }

      const methodDef = ALL_METHODS.find((m) => m.method === tc.method);
      const args: unknown[] =
        (methodDef &&
          !tc.isWrite &&
          (methodDef as { args?: unknown[] }).args) ||
        [];

      const t0 = performance.now();
      try {
        const fn = actor[tc.method as keyof Actor] as (
          ...a: unknown[]
        ) => Promise<unknown>;
        const result = await fn.apply(actor, args);
        const latency = Math.round(performance.now() - t0);
        addLog(tc.method, args, result, latency, false);
        return { ...tc, status: "pass", latency, error: null, result };
      } catch (e) {
        const latency = Math.round(performance.now() - t0);
        const msg = e instanceof Error ? e.message : String(e);
        addLog(tc.method, args, msg, latency, true);
        return { ...tc, status: "fail", latency, error: msg };
      }
    },
    [actor, addLog],
  );

  // ── Run all enabled tests ──
  const runAll = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    // Reset all
    setTests((prev) =>
      prev.map((t) => ({
        ...t,
        status: "pending",
        latency: null,
        error: null,
      })),
    );

    const current = tests;
    for (let i = 0; i < current.length; i++) {
      setTests((prev) =>
        prev.map((t) =>
          t.id === current[i].id ? { ...t, status: "running" } : t,
        ),
      );
      const result = await runTest(current[i]);
      setTests((prev) => prev.map((t) => (t.id === result.id ? result : t)));
    }
    setIsRunning(false);
  }, [isRunning, tests, runTest]);

  // ── Run selected tests ──
  const runSelected = useCallback(async () => {
    if (isRunning) return;
    const selected = tests.filter((t) => t.enabled);
    if (selected.length === 0) return;
    setIsRunning(true);
    setTests((prev) =>
      prev.map((t) =>
        t.enabled ? { ...t, status: "pending", latency: null, error: null } : t,
      ),
    );
    for (const tc of selected) {
      setTests((prev) =>
        prev.map((t) => (t.id === tc.id ? { ...t, status: "running" } : t)),
      );
      const result = await runTest({ ...tc, status: "pending" });
      setTests((prev) => prev.map((t) => (t.id === result.id ? result : t)));
    }
    setIsRunning(false);
  }, [isRunning, tests, runTest]);

  // ── State inspector refresh ──
  const refreshState = useCallback(async () => {
    setStateLoading(true);
    const next: StateData = {
      isLoggedIn,
      principal,
      role: null,
      profile: null,
      activeEventsCount: null,
      starsCount: null,
      groupsCount: null,
      publicJournalCount: null,
      unreadNotifications: null,
    };
    if (actor) {
      const [role, profile, events, stars, groups, journal, notifs] =
        await Promise.allSettled([
          actor.getCallerUserRole(),
          actor.getCallerUserProfile(),
          actor.getActiveEvents(),
          actor.getAllStars(),
          actor.getAllGroups(),
          actor.getPublicJournalEntries(),
          actor.getUnreadNotificationCount(),
        ]);
      if (role.status === "fulfilled") next.role = String(role.value);
      if (profile.status === "fulfilled" && profile.value) {
        const p = profile.value;
        next.profile = {
          username: p.username,
          bio: p.bio,
          zone: p.currentZone,
          score: p.totalScore.toString(),
        };
      }
      if (events.status === "fulfilled")
        next.activeEventsCount = events.value.length;
      if (stars.status === "fulfilled") next.starsCount = stars.value.length;
      if (groups.status === "fulfilled") next.groupsCount = groups.value.length;
      if (journal.status === "fulfilled")
        next.publicJournalCount = journal.value.length;
      if (notifs.status === "fulfilled")
        next.unreadNotifications = notifs.value.toString();
    }
    setStateData(next);
    setStateLoading(false);
  }, [actor, isLoggedIn, principal]);

  // ── Manual caller execute ──
  const executeCall = useCallback(async () => {
    if (!actor || callRunning) return;
    setCallRunning(true);
    setCallResult(null);
    setCallError(null);

    const params = METHOD_PARAMS[selectedMethod] || [];
    const args: unknown[] = params.map((p) => {
      const raw = paramValues[p.name] ?? "";
      if (p.type === "bigint") return BigInt(raw || "0");
      if (p.type === "boolean") return raw === "true" || raw === "1";
      // Try parse JSON for complex types
      if (raw.startsWith("{") || raw.startsWith("[")) {
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      }
      return raw;
    });

    const t0 = performance.now();
    try {
      const fn = actor[selectedMethod as keyof Actor] as (
        ...a: unknown[]
      ) => Promise<unknown>;
      const result = await fn.apply(actor, args);
      const latency = Math.round(performance.now() - t0);
      addLog(selectedMethod, args, result, latency, false);
      setCallResult(safeStringify(result));
    } catch (e) {
      const latency = Math.round(performance.now() - t0);
      const msg = e instanceof Error ? e.message : String(e);
      addLog(selectedMethod, args, msg, latency, true);
      setCallError(msg);
    }
    setCallRunning(false);
  }, [actor, callRunning, selectedMethod, paramValues, addLog]);

  // ── Summary stats ──
  const passed = tests.filter((t) => t.status === "pass").length;
  const failed = tests.filter((t) => t.status === "fail").length;
  const skipped = tests.filter((t) => t.status === "skipped").length;
  const totalTime = tests.reduce((s, t) => s + (t.latency ?? 0), 0);

  const filteredLogs = logFilter
    ? logs.filter(
        (l) =>
          l.method.toLowerCase().includes(logFilter.toLowerCase()) ||
          l.result.toLowerCase().includes(logFilter.toLowerCase()),
      )
    : logs;

  const currentParams = METHOD_PARAMS[selectedMethod] || [];
  const allMethodNames = ALL_METHODS.map((m) => m.method);

  return (
    <div
      data-ocid="debug.panel"
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: "rgba(5,5,15,0.97)",
        fontFamily: "'JetBrains Mono', 'Geist Mono', monospace",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-green-500/20 bg-black/40 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🐛</span>
          <span className="text-green-400 font-bold tracking-widest text-sm uppercase">
            DreamWorld — Test &amp; Debug Panel
          </span>
          {!isLoggedIn && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
              Not logged in
            </Badge>
          )}
          {isLoggedIn && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              Connected
            </Badge>
          )}
        </div>
        <button
          data-ocid="debug.close_button"
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-red-400 text-xl transition-colors px-2"
          aria-label="Close debug panel"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="runner" className="flex flex-col flex-1 min-h-0">
        <TabsList
          className="shrink-0 mx-4 mt-3 mb-2 bg-black/50 border border-green-500/20 rounded-none h-9"
          style={{ fontFamily: "inherit" }}
        >
          <TabsTrigger
            value="runner"
            data-ocid="debug.runner.tab"
            className="text-xs text-green-300/70 data-[state=active]:text-green-400 data-[state=active]:bg-green-500/15 rounded-none"
          >
            🧪 Test Runner
          </TabsTrigger>
          <TabsTrigger
            value="console"
            data-ocid="debug.console.tab"
            className="text-xs text-green-300/70 data-[state=active]:text-green-400 data-[state=active]:bg-green-500/15 rounded-none"
          >
            📋 Console ({logs.length})
          </TabsTrigger>
          <TabsTrigger
            value="state"
            data-ocid="debug.state.tab"
            className="text-xs text-green-300/70 data-[state=active]:text-green-400 data-[state=active]:bg-green-500/15 rounded-none"
          >
            🔍 State Inspector
          </TabsTrigger>
          <TabsTrigger
            value="caller"
            data-ocid="debug.caller.tab"
            className="text-xs text-green-300/70 data-[state=active]:text-green-400 data-[state=active]:bg-green-500/15 rounded-none"
          >
            ⚡ Manual Caller
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Test Runner ── */}
        <TabsContent
          value="runner"
          className="flex flex-col flex-1 min-h-0 mx-4"
        >
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 mb-3 shrink-0">
            <Button
              data-ocid="debug.runner.primary_button"
              size="sm"
              onClick={runAll}
              disabled={isRunning || !actor}
              className="bg-green-600 hover:bg-green-500 text-black font-bold text-xs h-7 px-3 rounded-none"
            >
              {isRunning ? "Running…" : "▶ Run All Tests"}
            </Button>
            <Button
              data-ocid="debug.runner.secondary_button"
              size="sm"
              onClick={runSelected}
              disabled={isRunning || !actor}
              className="bg-cyan-600/30 hover:bg-cyan-500/40 border border-cyan-500/30 text-cyan-300 text-xs h-7 px-3 rounded-none"
            >
              ▶ Run Selected
            </Button>
            <button
              type="button"
              onClick={() =>
                setTests((prev) =>
                  prev.map((t) => ({
                    ...t,
                    status: "pending",
                    latency: null,
                    error: null,
                  })),
                )
              }
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 border border-gray-700 rounded-none transition-colors"
            >
              Reset
            </button>
            {/* Summary */}
            <div className="flex gap-3 ml-auto text-xs">
              <span className="text-green-400">✅ {passed}</span>
              <span className="text-red-400">❌ {failed}</span>
              <span className="text-gray-500">⏭️ {skipped}</span>
              {totalTime > 0 && (
                <span className="text-gray-400">{totalTime}ms total</span>
              )}
            </div>
          </div>

          {/* Test Table */}
          <ScrollArea
            className="flex-1 border border-green-500/10 bg-black/30"
            data-ocid="debug.runner.table"
          >
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-green-500/15">
                  <th className="text-left px-3 py-2 text-green-300/50 w-8">
                    On
                  </th>
                  <th className="text-left px-3 py-2 text-green-300/50">
                    Method
                  </th>
                  <th className="text-left px-3 py-2 text-green-300/50 w-8">
                    St
                  </th>
                  <th className="text-left px-3 py-2 text-green-300/50 w-16">
                    Latency
                  </th>
                  <th className="text-left px-3 py-2 text-green-300/50">
                    Result / Error
                  </th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t, idx) => (
                  <tr
                    key={t.id}
                    data-ocid={`debug.runner.row.${idx + 1}`}
                    className="border-b border-green-500/5 hover:bg-green-500/5 transition-colors"
                  >
                    <td className="px-3 py-1.5">
                      <Checkbox
                        checked={t.enabled}
                        onCheckedChange={(v) =>
                          setTests((prev) =>
                            prev.map((x) =>
                              x.id === t.id ? { ...x, enabled: !!v } : x,
                            ),
                          )
                        }
                        className="w-3 h-3 border-green-500/40"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="text-green-300">{t.method}</span>
                      {t.isWrite && (
                        <Badge className="ml-2 text-[10px] bg-orange-500/20 text-orange-400 border-orange-500/30 px-1 py-0">
                          WRITE
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-base">
                      {statusIcon(t.status)}
                    </td>
                    <td className="px-3 py-1.5 text-gray-400">
                      {t.latency !== null ? `${t.latency}ms` : "—"}
                    </td>
                    <td className="px-3 py-1.5 max-w-sm">
                      {t.status === "fail" && (
                        <span className="text-red-400 break-all">
                          {truncate(t.error ?? "", 80)}
                        </span>
                      )}
                      {t.status === "pass" && (
                        <span className="text-green-300/50">
                          {truncate(safeStringify(t.result), 80)}
                        </span>
                      )}
                      {t.status === "skipped" && (
                        <span className="text-gray-600">
                          Write — skipped (enable to run)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </TabsContent>

        {/* ── Tab 2: Debug Console ── */}
        <TabsContent
          value="console"
          className="flex flex-col flex-1 min-h-0 mx-4"
        >
          <div className="flex gap-2 mb-3 shrink-0">
            <Input
              data-ocid="debug.console.search_input"
              placeholder="Filter logs…"
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="h-7 text-xs bg-black/50 border-green-500/20 text-green-300 placeholder:text-green-900 rounded-none flex-1"
            />
            <button
              data-ocid="debug.console.delete_button"
              type="button"
              onClick={() => setLogs([])}
              className="text-xs text-gray-500 hover:text-red-400 px-3 py-1 border border-gray-700 rounded-none transition-colors"
            >
              Clear
            </button>
          </div>
          <ScrollArea
            className="flex-1 border border-green-500/10 bg-black/30"
            data-ocid="debug.console.panel"
          >
            {filteredLogs.length === 0 ? (
              <div
                className="text-gray-600 text-xs p-4"
                data-ocid="debug.console.empty_state"
              >
                {logs.length === 0
                  ? "No API calls logged yet. Run tests or use the Manual Caller."
                  : "No logs match filter."}
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {filteredLogs.map((log, idx) => (
                  <div
                    key={log.id}
                    data-ocid={`debug.console.item.${idx + 1}`}
                    className={`text-xs px-3 py-1.5 rounded font-mono border-l-2 ${
                      log.status === "success"
                        ? "border-green-500 bg-green-500/5 text-green-300"
                        : log.status === "error"
                          ? "border-red-500 bg-red-500/5 text-red-300"
                          : "border-yellow-500 bg-yellow-500/5 text-yellow-300"
                    }`}
                  >
                    <span className="text-gray-500 mr-2">
                      [{log.timestamp}]
                    </span>
                    <span className="text-cyan-400 mr-2">{log.method}</span>
                    <span className="text-gray-400 mr-2">args:{log.args}</span>
                    <span className="mr-2">→ {log.result}</span>
                    <span className="text-gray-500">{log.latency}ms</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* ── Tab 3: State Inspector ── */}
        <TabsContent
          value="state"
          className="flex flex-col flex-1 min-h-0 mx-4"
        >
          <div className="flex gap-2 mb-3 shrink-0">
            <Button
              data-ocid="debug.state.primary_button"
              size="sm"
              onClick={refreshState}
              disabled={stateLoading}
              className="bg-cyan-600/30 hover:bg-cyan-500/40 border border-cyan-500/30 text-cyan-300 text-xs h-7 px-3 rounded-none"
            >
              {stateLoading ? "Refreshing…" : "🔄 Refresh State"}
            </Button>
          </div>
          <ScrollArea
            className="flex-1 border border-green-500/10 bg-black/30"
            data-ocid="debug.state.panel"
          >
            <div className="p-4 space-y-4 text-xs">
              <StateSection title="Authentication">
                <StateRow
                  label="Logged In"
                  value={String(stateData.isLoggedIn)}
                  type="boolean"
                  good={stateData.isLoggedIn}
                />
                <StateRow
                  label="Principal"
                  value={stateData.principal ?? "—"}
                  type="string"
                />
              </StateSection>
              <StateSection title="User">
                <StateRow
                  label="Role"
                  value={stateData.role ?? "(not fetched)"}
                  type="string"
                />
                {stateData.profile ? (
                  <>
                    <StateRow
                      label="Username"
                      value={stateData.profile.username}
                      type="string"
                    />
                    <StateRow
                      label="Bio"
                      value={stateData.profile.bio || "(empty)"}
                      type="string"
                    />
                    <StateRow
                      label="Current Zone"
                      value={stateData.profile.zone}
                      type="string"
                    />
                    <StateRow
                      label="Total Score"
                      value={stateData.profile.score}
                      type="bigint"
                    />
                  </>
                ) : (
                  <StateRow
                    label="Profile"
                    value="(not fetched — click Refresh)"
                    type="null"
                  />
                )}
              </StateSection>
              <StateSection title="World Data">
                <StateRow
                  label="Active Events"
                  value={
                    stateData.activeEventsCount !== null
                      ? String(stateData.activeEventsCount)
                      : "(not fetched)"
                  }
                  type="number"
                />
                <StateRow
                  label="Stars Count"
                  value={
                    stateData.starsCount !== null
                      ? String(stateData.starsCount)
                      : "(not fetched)"
                  }
                  type="number"
                />
                <StateRow
                  label="Groups Count"
                  value={
                    stateData.groupsCount !== null
                      ? String(stateData.groupsCount)
                      : "(not fetched)"
                  }
                  type="number"
                />
                <StateRow
                  label="Public Journal Entries"
                  value={
                    stateData.publicJournalCount !== null
                      ? String(stateData.publicJournalCount)
                      : "(not fetched)"
                  }
                  type="number"
                />
                <StateRow
                  label="Unread Notifications"
                  value={stateData.unreadNotifications ?? "(not fetched)"}
                  type="bigint"
                />
              </StateSection>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Tab 4: Manual API Caller ── */}
        <TabsContent
          value="caller"
          className="flex flex-col flex-1 min-h-0 mx-4"
        >
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="shrink-0 space-y-3">
              <div>
                <Label className="text-green-300/60 text-xs mb-1 block">
                  Select Method
                </Label>
                <Select
                  value={selectedMethod}
                  onValueChange={(v) => {
                    setSelectedMethod(v);
                    setParamValues({});
                    setCallResult(null);
                    setCallError(null);
                  }}
                >
                  <SelectTrigger
                    data-ocid="debug.caller.select"
                    className="h-8 text-xs bg-black/50 border-green-500/20 text-green-300 rounded-none"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-green-500/20 text-green-300 text-xs">
                    {allMethodNames.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentParams.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-green-300/60 text-xs block">
                    Parameters
                  </Label>
                  {currentParams.map((p) => (
                    <div key={p.name} className="flex items-center gap-2">
                      <Label className="text-cyan-300/70 text-xs w-44 shrink-0">
                        {p.name}
                        <span className="text-gray-600 ml-1">({p.type})</span>
                      </Label>
                      {p.type === "boolean" ? (
                        <Select
                          value={paramValues[p.name] ?? "false"}
                          onValueChange={(v) =>
                            setParamValues((prev) => ({ ...prev, [p.name]: v }))
                          }
                        >
                          <SelectTrigger
                            data-ocid="debug.caller.select"
                            className="h-7 text-xs bg-black/50 border-green-500/20 text-green-300 rounded-none w-28"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-950 border-green-500/20 text-green-300 text-xs">
                            <SelectItem value="true">true</SelectItem>
                            <SelectItem value="false">false</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          data-ocid="debug.caller.input"
                          value={paramValues[p.name] ?? ""}
                          onChange={(e) =>
                            setParamValues((prev) => ({
                              ...prev,
                              [p.name]: e.target.value,
                            }))
                          }
                          placeholder={p.type === "bigint" ? "e.g. 0" : "value"}
                          className="h-7 text-xs bg-black/50 border-green-500/20 text-green-300 placeholder:text-green-900 rounded-none flex-1"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button
                data-ocid="debug.caller.primary_button"
                size="sm"
                onClick={executeCall}
                disabled={callRunning || !actor}
                className="bg-green-600 hover:bg-green-500 text-black font-bold text-xs h-7 px-4 rounded-none"
              >
                {callRunning ? "Executing…" : "⚡ Execute"}
              </Button>
            </div>

            {/* Result area */}
            <ScrollArea
              className="flex-1 border border-green-500/10 bg-black/30"
              data-ocid="debug.caller.panel"
            >
              {callResult !== null && (
                <pre
                  className="text-green-300 text-xs p-4 whitespace-pre-wrap break-all"
                  data-ocid="debug.caller.success_state"
                >
                  {callResult}
                </pre>
              )}
              {callError !== null && (
                <pre
                  className="text-red-400 text-xs p-4 whitespace-pre-wrap break-all"
                  data-ocid="debug.caller.error_state"
                >
                  Error: {callError}
                </pre>
              )}
              {callResult === null && callError === null && (
                <div
                  className="text-gray-600 text-xs p-4"
                  data-ocid="debug.caller.empty_state"
                >
                  Select a method, fill in parameters, and click Execute.
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StateSection({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-green-400/80 uppercase tracking-widest text-[10px] mb-1.5 border-b border-green-500/10 pb-1">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function StateRow({
  label,
  value,
  type,
  good,
}: {
  label: string;
  value: string;
  type: string;
  good?: boolean;
}) {
  const valueColor =
    good === true
      ? "text-green-400"
      : good === false
        ? "text-red-400"
        : type === "boolean"
          ? value === "true"
            ? "text-green-400"
            : "text-red-400"
          : type === "number" || type === "bigint"
            ? "text-cyan-300"
            : "text-gray-200";

  return (
    <div className="flex gap-3 items-start">
      <span className="text-gray-500 w-44 shrink-0">{label}</span>
      <span className={`${valueColor} break-all`}>{value}</span>
      <span className="text-gray-700 ml-auto text-[10px] shrink-0">{type}</span>
    </div>
  );
}
