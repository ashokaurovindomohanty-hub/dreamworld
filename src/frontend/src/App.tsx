import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AvatarConfig,
  ChatMessage,
  DreamJournalEntryView,
  Group,
  StarDedication,
  UserProfile,
  WorldEventView,
} from "./backend";
import TestDebugPanel from "./components/TestDebugPanel";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { MAX_LENGTHS, sanitizeInput, validateText } from "./utils/security";

// ─── Zones ───────────────────────────────────────────────────────────────────
const ZONES = [
  {
    id: "Starter Plaza",
    emoji: "🏛️",
    desc: "The heart of DreamWorld",
    gradient: "from-pink-900/60 to-fuchsia-800/40",
  },
  {
    id: "Forest",
    emoji: "🌲",
    desc: "Ancient enchanted woodlands",
    gradient: "from-emerald-900/60 to-green-800/40",
  },
  {
    id: "City",
    emoji: "🌆",
    desc: "Neon-lit futuristic metropolis",
    gradient: "from-blue-900/60 to-cyan-800/40",
  },
  {
    id: "Ocean",
    emoji: "🌊",
    desc: "Mysterious underwater realm",
    gradient: "from-teal-900/60 to-blue-800/40",
  },
  {
    id: "Space",
    emoji: "🚀",
    desc: "Infinite cosmic frontier",
    gradient: "from-indigo-950/60 to-violet-900/40",
  },
];

const QUESTS = [
  {
    id: 0n,
    title: "First Steps",
    desc: "Visit all 5 zones",
    reward: 100,
    icon: "🗺️",
  },
  {
    id: 1n,
    title: "Social Butterfly",
    desc: "Join a group",
    reward: 50,
    icon: "🦋",
  },
  {
    id: 2n,
    title: "Puzzle Master",
    desc: "Complete the mini-game",
    reward: 75,
    icon: "🧩",
  },
  {
    id: 3n,
    title: "Explorer",
    desc: "Send 10 chat messages",
    reward: 60,
    icon: "📜",
  },
  {
    id: 4n,
    title: "Legend",
    desc: "Reach 500 total score",
    reward: 200,
    icon: "⭐",
  },
];

// ─── Avatar SVG ───────────────────────────────────────────────────────────────
function AvatarSVG({
  config,
  size = 120,
}: { config: AvatarConfig; size?: number }) {
  const colorMap: Record<string, string> = {
    red: "#ef4444",
    blue: "#3b82f6",
    green: "#22c55e",
    purple: "#a855f7",
    gold: "#eab308",
    silver: "#94a3b8",
  };
  const fill = colorMap[config.color] || "#a855f7";
  const avatarLabel = `${config.bodyType} avatar with ${config.outfit} outfit and ${config.accessory} accessory`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={avatarLabel}
    >
      <title>{avatarLabel}</title>
      {/* Shadow */}
      <ellipse cx="50" cy="115" rx="25" ry="5" fill="rgba(0,0,0,0.3)" />

      {/* Wings */}
      {config.accessory === "Wings" && (
        <>
          <path d="M20 55 Q5 40 10 25 Q20 45 30 50" fill={fill} opacity="0.7" />
          <path
            d="M80 55 Q95 40 90 25 Q80 45 70 50"
            fill={fill}
            opacity="0.7"
          />
        </>
      )}

      {/* Body */}
      {config.bodyType === "Robot" ? (
        <rect
          x="28"
          y="58"
          width="44"
          height="50"
          rx="4"
          fill={fill}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
      ) : config.bodyType === "Dragon" ? (
        <path
          d="M50 108 Q20 100 22 68 Q28 58 50 58 Q72 58 78 68 Q80 100 50 108Z"
          fill={fill}
        />
      ) : config.bodyType === "Elf" ? (
        <path
          d="M50 108 Q25 102 28 70 Q32 58 50 58 Q68 58 72 70 Q75 102 50 108Z"
          fill={fill}
        />
      ) : (
        <path
          d="M50 108 Q24 100 26 68 Q30 58 50 58 Q70 58 74 68 Q76 100 50 108Z"
          fill={fill}
        />
      )}

      {/* Outfit detail */}
      {config.outfit === "Warrior" && (
        <>
          <path
            d="M30 68 Q50 72 70 68 L68 82 Q50 86 32 82Z"
            fill="rgba(255,255,255,0.2)"
          />
          <rect
            x="46"
            y="58"
            width="8"
            height="20"
            fill="rgba(255,255,255,0.15)"
            rx="2"
          />
        </>
      )}
      {config.outfit === "Mage" && (
        <path
          d="M30 65 Q50 70 70 65 Q68 85 50 90 Q32 85 30 65Z"
          fill="rgba(150,100,255,0.3)"
          stroke="rgba(200,150,255,0.4)"
          strokeWidth="1"
        />
      )}
      {config.outfit === "Explorer" && (
        <>
          <rect
            x="36"
            y="62"
            width="28"
            height="4"
            rx="2"
            fill="rgba(200,150,50,0.6)"
          />
          <rect
            x="42"
            y="66"
            width="16"
            height="3"
            rx="1"
            fill="rgba(200,150,50,0.4)"
          />
        </>
      )}

      {/* Neck */}
      <rect x="44" y="50" width="12" height="10" rx="3" fill={fill} />

      {/* Head */}
      {config.bodyType === "Robot" ? (
        <rect
          x="32"
          y="22"
          width="36"
          height="32"
          rx="6"
          fill={fill}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
      ) : config.bodyType === "Dragon" ? (
        <>
          <ellipse cx="50" cy="38" rx="18" ry="16" fill={fill} />
          <polygon points="38,24 35,14 42,22" fill={fill} />
          <polygon points="62,24 65,14 58,22" fill={fill} />
        </>
      ) : config.bodyType === "Elf" ? (
        <>
          <ellipse cx="50" cy="38" rx="16" ry="14" fill={fill} />
          <polygon points="34,30 28,22 36,28" fill={fill} />
          <polygon points="66,30 72,22 64,28" fill={fill} />
        </>
      ) : (
        <circle cx="50" cy="38" r="17" fill={fill} />
      )}

      {/* Eyes */}
      {config.bodyType === "Robot" ? (
        <>
          <rect
            x="40"
            y="33"
            width="6"
            height="4"
            rx="1"
            fill="cyan"
            opacity="0.8"
          />
          <rect
            x="54"
            y="33"
            width="6"
            height="4"
            rx="1"
            fill="cyan"
            opacity="0.8"
          />
        </>
      ) : (
        <>
          <circle cx="43" cy="36" r="3" fill="rgba(0,0,0,0.6)" />
          <circle cx="57" cy="36" r="3" fill="rgba(0,0,0,0.6)" />
          <circle cx="44" cy="35" r="1" fill="white" />
          <circle cx="58" cy="35" r="1" fill="white" />
        </>
      )}

      {/* Smile */}
      <path
        d="M44 44 Q50 49 56 44"
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Hat */}
      {config.accessory === "Hat" && (
        <>
          <rect
            x="38"
            y="16"
            width="24"
            height="5"
            rx="2"
            fill="rgba(100,50,200,0.8)"
          />
          <rect
            x="42"
            y="5"
            width="16"
            height="13"
            rx="3"
            fill="rgba(80,40,180,0.9)"
          />
          <rect
            x="44"
            y="8"
            width="12"
            height="2"
            rx="1"
            fill="rgba(255,215,0,0.7)"
          />
        </>
      )}

      {/* Sword */}
      {config.accessory === "Sword" && (
        <>
          <rect
            x="74"
            y="50"
            width="3"
            height="35"
            rx="1"
            fill="rgba(200,200,220,0.9)"
          />
          <rect
            x="69"
            y="62"
            width="13"
            height="3"
            rx="1"
            fill="rgba(180,140,40,0.9)"
          />
          <rect
            x="74"
            y="46"
            width="3"
            height="6"
            rx="2"
            fill="rgba(180,140,40,0.9)"
          />
        </>
      )}

      <ellipse cx="44" cy="32" rx="5" ry="3" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}

// ─── Stars Background ─────────────────────────────────────────────────────────
const STAR_COLORS = ["warm", "cool", "pink", "", "", ""];
const STAR_DATA = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x: (i * 17 + 7) % 97,
  y: (i * 31 + 13) % 97,
  size: (i % 3) * 0.7 + 0.5,
  duration: (i % 4) + 1.5,
  delay: (i % 5) * 0.8,
  colorClass: STAR_COLORS[i % STAR_COLORS.length],
}));

function StarsBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {STAR_DATA.map((s) => (
        <div
          key={s.id}
          className={`star ${s.colorClass}`}
          style={
            {
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              "--duration": `${s.duration}s`,
              "--delay": `${s.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
function LandingPage({ onLogin }: { onLogin: () => void }) {
  const features = [
    { icon: "🗺️", label: "5 Unique Zones" },
    { icon: "👾", label: "Avatar Creator" },
    { icon: "💬", label: "Live Chat" },
    { icon: "⚔️", label: "Quests & Games" },
  ];
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative z-10 px-4">
      <StarsBackground />
      <div className="text-center animate-slide-in">
        <div className="relative inline-block mb-6">
          <div
            className="absolute inset-0 rounded-full animate-aurora"
            style={{
              background:
                "conic-gradient(from 0deg, oklch(0.65 0.28 320 / 0.6), oklch(0.72 0.22 195 / 0.5), oklch(0.84 0.22 80 / 0.5), oklch(0.65 0.28 320 / 0.6))",
              filter: "blur(20px)",
              transform: "scale(1.8)",
            }}
          />
          <div className="text-8xl animate-float relative z-10">🌌</div>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-3 bg-gradient-to-r from-pink-300 via-fuchsia-200 to-cyan-300 bg-clip-text text-transparent drop-shadow-lg">
          DreamWorld
        </h1>
        <p className="text-xl text-pink-200 mb-2 font-light tracking-wider">
          World of dreams, happiness and excitement
        </p>
        <p className="text-sm text-fuchsia-300/70 mb-10 tracking-widest uppercase">
          Enter a realm beyond imagination
        </p>

        <button
          type="button"
          onClick={onLogin}
          className="btn-dream px-10 py-4 rounded-full text-white font-bold text-lg tracking-wide animate-pulse-glow"
        >
          ✨ Enter DreamWorld
        </button>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {features.map((f) => (
            <div
              key={f.label}
              className="card-glass rounded-xl p-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-500/30 to-violet-500/20 flex items-center justify-center text-2xl mx-auto mb-2 border border-fuchsia-400/20">
                {f.icon}
              </div>
              <p className="text-pink-200 text-sm font-medium">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
function Onboarding({ onComplete }: { onComplete: (p: UserProfile) => void }) {
  const { actor } = useActor();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !username.trim()) return;
    setLoading(true);
    setError("");
    try {
      await actor.createProfile(
        validateText(username, MAX_LENGTHS.username),
        validateText(bio, MAX_LENGTHS.bio),
      );
      const profile = await actor.getCallerUserProfile();
      if (profile) onComplete(profile);
    } catch {
      setError("Failed to create profile. Try a different username.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative z-10 px-4">
      <StarsBackground />
      <div className="card-glass rounded-2xl p-5 md:p-8 w-full max-w-md animate-slide-in glow-purple">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌟</div>
          <h2 className="text-2xl font-bold text-fuchsia-100">
            Create Your Hero
          </h2>
          <p className="text-fuchsia-300/60 text-sm mt-1">
            Choose your identity in DreamWorld
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="onboard-username"
              className="block text-fuchsia-300/80 text-sm mb-1.5 font-medium"
            >
              Username
            </label>
            <input
              id="onboard-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your hero name..."
              className="w-full bg-white/5 border border-fuchsia-500/30 rounded-lg px-4 py-3 text-white placeholder-fuchsia-300/30 focus:outline-none focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-500/20"
              maxLength={MAX_LENGTHS.username}
              required
            />
          </div>
          <div>
            <label
              htmlFor="onboard-bio"
              className="block text-fuchsia-300/80 text-sm mb-1.5 font-medium"
            >
              Bio <span className="text-fuchsia-400/40">(optional)</span>
            </label>
            <textarea
              id="onboard-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the world about yourself..."
              rows={3}
              className="w-full bg-white/5 border border-fuchsia-500/30 rounded-lg px-4 py-3 text-white placeholder-fuchsia-300/30 focus:outline-none focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-500/20 resize-none"
              maxLength={MAX_LENGTHS.bio}
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="btn-dream w-full py-3 rounded-lg text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Enter DreamWorld 🚀"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── World Map Tab ────────────────────────────────────────────────────────────
function WorldMapTab({
  profile,
  onTeleport,
}: { profile: UserProfile; onTeleport: (zone: string) => Promise<void> }) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleTeleport = async (zoneId: string) => {
    setLoading(zoneId);
    try {
      await onTeleport(zoneId);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-pink-200">🗺️ World Map</h2>
      <p className="text-fuchsia-300/60 text-sm">
        Currently in:{" "}
        <span className="text-fuchsia-300 font-semibold">
          {profile.currentZone || "Starter Plaza"}
        </span>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {ZONES.map((zone) => {
          const isCurrent =
            (profile.currentZone || "Starter Plaza") === zone.id;
          return (
            <div
              key={zone.id}
              className={`card-glass rounded-xl p-5 bg-gradient-to-br ${zone.gradient} border transition-all ${
                isCurrent
                  ? "border-fuchsia-400/60 glow-purple"
                  : "border-fuchsia-500/20 hover:border-fuchsia-400/40"
              }`}
            >
              <div className="text-4xl mb-3">{zone.emoji}</div>
              <h3 className="font-bold text-white mb-1">{zone.id}</h3>
              <p className="text-fuchsia-300/60 text-sm mb-4">{zone.desc}</p>
              {isCurrent ? (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-fuchsia-500/30 text-pink-200 border border-fuchsia-400/40">
                  📍 Current Location
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTeleport(zone.id)}
                  disabled={!!loading}
                  className="btn-dream px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                >
                  {loading === zone.id ? "Teleporting..." : "✨ Teleport"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────
function ChatTab({ profile }: { profile: UserProfile }) {
  const { actor } = useActor();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const zone = profile.currentZone || "Starter Plaza";

  const fetchMessages = useCallback(async () => {
    if (!actor) return;
    try {
      const msgs = await actor.getZoneMessages(zone);
      setMessages(msgs);
    } catch {}
  }, [actor, zone]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !input.trim()) return;
    setSending(true);
    try {
      await actor.sendMessage(validateText(input, MAX_LENGTHS.message));
      setInput("");
      await fetchMessages();
    } catch {}
    setSending(false);
  };

  const zoneInfo = ZONES.find((z) => z.id === zone);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{zoneInfo?.emoji || "💬"}</span>
        <div>
          <h2 className="text-xl font-bold text-pink-200">Zone Chat</h2>
          <p className="text-fuchsia-300/60 text-sm">{zone}</p>
        </div>
      </div>

      <div className="card-glass rounded-xl flex-1 min-h-64 max-h-96 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-fuchsia-300/40 text-center py-8">
            No messages yet. Say hello! 👋
          </p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={`${msg.sender}-${String(msg.timestamp)}-${i}`}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {msg.sender.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-yellow-300/80 text-xs font-semibold">
                  {sanitizeInput(msg.sender)}
                </span>
                <p className="text-fuchsia-100/90 text-sm mt-0.5 bg-white/5 rounded-lg px-3 py-2">
                  {sanitizeInput(msg.content)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something..."
          maxLength={MAX_LENGTHS.message}
          className="flex-1 bg-white/5 border border-fuchsia-500/30 rounded-lg px-4 py-3 text-white placeholder-fuchsia-300/30 focus:outline-none focus:border-fuchsia-400/60"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="btn-dream px-5 py-3 rounded-lg text-white font-medium disabled:opacity-50"
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}

// ─── Social Tab ───────────────────────────────────────────────────────────────
function SocialTab() {
  const { actor } = useActor();
  const [groups, setGroups] = useState<Group[]>([]);
  const [friendPrincipal, setFriendPrincipal] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [loading, setLoading] = useState("");
  const [msg, setMsg] = useState("");

  const fetchGroups = useCallback(async () => {
    if (!actor) return;
    try {
      const g = await actor.getAllGroups();
      setGroups(g);
    } catch {}
  }, [actor]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const sendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !friendPrincipal.trim()) return;
    setLoading("friend");
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      await actor.sendFriendRequest(Principal.fromText(friendPrincipal.trim()));
      setFriendPrincipal("");
      setMsg("Friend request sent! ✅");
    } catch {
      setMsg("Invalid Principal ID");
    }
    setLoading("");
    setTimeout(() => setMsg(""), 3000);
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !groupName.trim()) return;
    setLoading("group");
    try {
      await actor.createGroup(
        validateText(groupName, MAX_LENGTHS.groupName),
        validateText(groupDesc, MAX_LENGTHS.groupDescription),
      );
      setGroupName("");
      setGroupDesc("");
      setShowCreateGroup(false);
      await fetchGroups();
    } catch {}
    setLoading("");
  };

  const joinGroup = async (name: string) => {
    if (!actor) return;
    setLoading(`join-${name}`);
    try {
      await actor.joinGroup(name);
      setMsg(`Joined ${name}! 🎉`);
    } catch {
      setMsg("Already a member or error");
    }
    setLoading("");
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-pink-200">👥 Social Hub</h2>
      {msg && (
        <div className="card-glass rounded-lg p-3 text-pink-200 text-sm border border-fuchsia-400/30">
          {msg}
        </div>
      )}

      {/* Friends */}
      <div className="card-glass rounded-xl p-5">
        <h3 className="font-semibold text-pink-200 mb-3">🤝 Add Friend</h3>
        <form onSubmit={sendFriendRequest} className="flex gap-2">
          <input
            value={friendPrincipal}
            onChange={(e) => setFriendPrincipal(e.target.value)}
            placeholder="Paste friend's Principal ID..."
            className="flex-1 bg-white/5 border border-fuchsia-500/30 rounded-lg px-3 py-2.5 text-white text-sm placeholder-fuchsia-300/30 focus:outline-none focus:border-fuchsia-400/60"
          />
          <button
            type="submit"
            disabled={loading === "friend" || !friendPrincipal.trim()}
            className="btn-dream px-4 py-2 rounded-lg text-white text-sm disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>

      {/* Groups */}
      <div className="card-glass rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-pink-200">🏰 Groups</h3>
          <button
            type="button"
            onClick={() => setShowCreateGroup(!showCreateGroup)}
            className="btn-gold px-3 py-1.5 rounded-lg text-black text-sm font-medium"
          >
            + Create
          </button>
        </div>

        {showCreateGroup && (
          <form
            onSubmit={createGroup}
            className="space-y-3 p-4 bg-white/5 rounded-lg border border-fuchsia-500/20"
          >
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name..."
              maxLength={MAX_LENGTHS.groupName}
              className="w-full bg-white/5 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white text-sm placeholder-fuchsia-300/30 focus:outline-none"
              required
            />
            <input
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              placeholder="Description..."
              maxLength={MAX_LENGTHS.groupDescription}
              className="w-full bg-white/5 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white text-sm placeholder-fuchsia-300/30 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading === "group"}
                className="btn-dream px-4 py-2 rounded-lg text-white text-sm"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateGroup(false)}
                className="px-4 py-2 rounded-lg text-fuchsia-300 text-sm hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {groups.length === 0 ? (
          <p className="text-fuchsia-300/40 text-sm py-4 text-center">
            No groups yet. Be the first to create one!
          </p>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <div
                key={g.name}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-fuchsia-500/20"
              >
                <div>
                  <p className="text-pink-200 font-medium">
                    {sanitizeInput(g.name)}
                  </p>
                  <p className="text-fuchsia-300/60 text-xs">
                    {g.description} &middot; {g.members.length} member
                    {g.members.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => joinGroup(g.name)}
                  disabled={loading === `join-${g.name}`}
                  className="btn-dream px-3 py-1.5 rounded-lg text-white text-xs disabled:opacity-50"
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Avatar Tab ───────────────────────────────────────────────────────────────
const colorHex: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  purple: "#a855f7",
  gold: "#eab308",
  silver: "#94a3b8",
};

function AvatarTab({
  profile,
  onSave,
}: { profile: UserProfile; onSave: (a: AvatarConfig) => Promise<void> }) {
  const defaultAvatar: AvatarConfig = {
    bodyType: "Human",
    outfit: "Casual",
    accessory: "None",
    color: "purple",
  };
  const [config, setConfig] = useState<AvatarConfig>(
    profile.avatar || defaultAvatar,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (key: keyof AvatarConfig, value: string) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await onSave(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  interface OptionRowProps {
    label: string;
    options: string[];
    field: keyof AvatarConfig;
  }
  const OptionRow = ({ label, options, field }: OptionRowProps) => (
    <div className="space-y-2">
      <p className="text-fuchsia-300/80 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            type="button"
            key={opt}
            onClick={() => update(field, opt)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              config[field] === opt
                ? "bg-fuchsia-500/40 border-fuchsia-400/60 text-fuchsia-100 glow-purple"
                : "bg-white/5 border-fuchsia-500/20 text-fuchsia-300/70 hover:border-fuchsia-400/40"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-pink-200">🎨 Avatar Creator</h2>
        <OptionRow
          label="Body Type"
          options={["Human", "Elf", "Robot", "Dragon"]}
          field="bodyType"
        />
        <OptionRow
          label="Outfit"
          options={["Casual", "Warrior", "Mage", "Explorer"]}
          field="outfit"
        />
        <OptionRow
          label="Accessory"
          options={["None", "Hat", "Wings", "Sword"]}
          field="accessory"
        />
        <div className="space-y-2">
          <p className="text-fuchsia-300/80 text-sm font-medium">Color</p>
          <div className="flex gap-3">
            {Object.keys(colorHex).map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => update("color", c)}
                className={`w-9 h-9 rounded-full border-2 transition-all ${
                  config.color === c
                    ? "border-white scale-110 shadow-lg"
                    : "border-transparent hover:border-white/50"
                }`}
                style={{ backgroundColor: colorHex[c] }}
                title={c}
                aria-label={`Select ${c} color`}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={`btn-dream px-6 py-3 rounded-lg text-white font-bold ${saved ? "opacity-80" : ""}`}
        >
          {saving ? "Saving..." : saved ? "✓ Saved!" : "💾 Save Avatar"}
        </button>
      </div>

      <div className="card-glass rounded-2xl p-8 flex flex-col items-center justify-center glow-purple">
        <p className="text-fuchsia-300/60 text-sm mb-4 uppercase tracking-widest">
          Preview
        </p>
        <AvatarSVG config={config} size={160} />
        <p className="text-pink-200 font-bold mt-4">{profile.username}</p>
        <p className="text-fuchsia-300/60 text-sm">
          {config.bodyType} &middot; {config.outfit}
        </p>
      </div>
    </div>
  );
}

// ─── Quests Tab ───────────────────────────────────────────────────────────────
function QuestsTab({ profile }: { profile: UserProfile }) {
  const { actor } = useActor();
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [questLoading, setQuestLoading] = useState<bigint | null>(null);
  const [completedQuests, setCompletedQuests] = useState<Set<bigint>>(
    new Set(),
  );

  useEffect(() => {
    if (!actor) return;
    actor
      .getLeaderboard()
      .then(setLeaderboard)
      .catch(() => {});
  }, [actor]);

  const startQuest = async (id: bigint) => {
    if (!actor) return;
    setQuestLoading(id);
    try {
      await actor.startQuest(id);
    } catch {}
    setQuestLoading(null);
  };

  const completeQuest = async (id: bigint) => {
    if (!actor) return;
    setQuestLoading(id);
    try {
      await actor.completeQuest(id);
      setCompletedQuests((s) => new Set(s).add(id));
    } catch {}
    setQuestLoading(null);
  };

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-pink-200">
        ⚔️ Quests &amp; Leaderboard
      </h2>
      <p className="text-fuchsia-300/60 text-sm">
        Your score:{" "}
        <span className="text-yellow-300 font-bold">
          {profile.totalScore.toString()} pts
        </span>
      </p>

      <div className="grid grid-cols-1 gap-3">
        {QUESTS.map((quest) => {
          const done = completedQuests.has(quest.id);
          const isLoading = questLoading === quest.id;
          return (
            <div
              key={String(quest.id)}
              className={`card-glass rounded-xl p-4 border flex items-center gap-4 ${
                done ? "border-green-500/40" : "border-fuchsia-500/20"
              }`}
            >
              <div className="text-3xl">{quest.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-pink-200 font-semibold">{quest.title}</p>
                  {done && (
                    <span className="text-green-400 text-xs">✓ Done</span>
                  )}
                </div>
                <p className="text-fuchsia-300/60 text-sm">{quest.desc}</p>
              </div>
              <div className="text-right">
                <p className="text-yellow-300 font-bold text-sm">
                  +{quest.reward} pts
                </p>
                {!done && (
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => startQuest(quest.id)}
                      disabled={isLoading}
                      className="btn-dream px-3 py-1 rounded-lg text-white text-xs disabled:opacity-50"
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      onClick={() => completeQuest(quest.id)}
                      disabled={isLoading}
                      className="btn-gold px-3 py-1 rounded-lg text-black text-xs font-medium disabled:opacity-50"
                    >
                      Complete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card-glass rounded-xl p-5">
        <h3 className="font-semibold text-pink-200 mb-4">🏆 Leaderboard</h3>
        {leaderboard.length === 0 ? (
          <p className="text-fuchsia-300/40 text-sm text-center py-4">
            No scores yet. Be the first!
          </p>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((p, i) => (
              <div
                key={p.username}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  p.username === profile.username
                    ? "bg-fuchsia-500/20 border-fuchsia-400/40"
                    : "bg-white/3 border-fuchsia-500/10"
                }`}
              >
                <span className="text-lg w-8">{medals[i] ?? `${i + 1}`}</span>
                <div className="flex-1">
                  <p className="text-pink-200 font-medium">
                    {sanitizeInput(p.username)}
                  </p>
                  <p className="text-fuchsia-300/50 text-xs">{p.currentZone}</p>
                </div>
                <span className="text-yellow-300 font-bold">
                  {p.totalScore.toString()} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── World Events Tab ─────────────────────────────────────────────────────────
function WorldEventsTab() {
  const { actor } = useActor();
  const [events, setEvents] = useState<WorldEventView[]>([]);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    zone: "Starter Plaza",
    startTime: "",
    endTime: "",
  });
  const [msg, setMsg] = useState("");

  const fetchData = useCallback(async () => {
    if (!actor) return;
    try {
      const [all, active, admin] = await Promise.all([
        actor.getAllEvents(),
        actor.getActiveEvents(),
        actor.isCallerAdmin(),
      ]);
      setEvents(all);
      setActiveIds(new Set(active.map((e) => e.id.toString())));
      setIsAdmin(admin);
    } catch (_) {}
    setLoading(false);
  }, [actor]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRsvp = async (id: bigint) => {
    if (!actor) return;
    setRsvpLoading(id.toString());
    try {
      await actor.rsvpEvent(id);
      setMsg("✅ RSVP confirmed!");
      fetchData();
    } catch (_) {
      setMsg("❌ RSVP failed");
    }
    setRsvpLoading(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;
    setCreateLoading(true);
    try {
      const start = BigInt(new Date(form.startTime).getTime()) * 1_000_000n;
      const end = BigInt(new Date(form.endTime).getTime()) * 1_000_000n;
      await actor.createEvent(
        validateText(form.title, MAX_LENGTHS.eventTitle),
        validateText(form.description, MAX_LENGTHS.eventDescription),
        form.zone,
        start,
        end,
      );
      setMsg("🌟 Event created!");
      setShowCreate(false);
      setForm({
        title: "",
        description: "",
        zone: "Starter Plaza",
        startTime: "",
        endTime: "",
      });
      fetchData();
    } catch (_) {
      setMsg("❌ Failed to create event");
    }
    setCreateLoading(false);
  };

  const formatTime = (ts: bigint) =>
    new Date(Number(ts) / 1_000_000).toLocaleString();

  if (loading)
    return (
      <div
        className="flex items-center justify-center py-20 text-fuchsia-300/60"
        data-ocid="events.loading_state"
      >
        <span className="animate-pulse text-lg">Loading events...</span>
      </div>
    );

  return (
    <div className="space-y-6" data-ocid="events.section">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">🌍 World Events</h2>
          <p className="text-fuchsia-300/60 text-sm mt-1">
            Global happenings across DreamWorld
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="btn-dream px-4 py-2 rounded-lg text-white font-medium text-sm"
            data-ocid="events.open_modal_button"
          >
            ✨ Create Event
          </button>
        )}
      </div>

      {msg && (
        <div
          className="card-glass rounded-xl p-3 text-center text-sm text-pink-200 border border-fuchsia-400/30"
          data-ocid="events.success_state"
        >
          {msg}
          <button
            type="button"
            onClick={() => setMsg("")}
            className="ml-3 text-fuchsia-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {showCreate && isAdmin && (
        <form
          onSubmit={handleCreate}
          className="card-glass rounded-2xl p-5 border border-fuchsia-500/40 space-y-4"
          data-ocid="events.dialog"
        >
          <h3 className="text-lg font-bold text-pink-200">Create New Event</h3>
          <input
            className="w-full bg-white/5 border border-fuchsia-500/30 rounded-lg px-4 py-2 text-white placeholder-fuchsia-400/50 focus:outline-none focus:border-fuchsia-400"
            placeholder="Event title"
            maxLength={MAX_LENGTHS.eventTitle}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            data-ocid="events.input"
          />
          <textarea
            className="w-full bg-white/5 border border-fuchsia-500/30 rounded-lg px-4 py-2 text-white placeholder-fuchsia-400/50 focus:outline-none focus:border-fuchsia-400 resize-none"
            placeholder="Description"
            maxLength={MAX_LENGTHS.eventDescription}
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            required
            data-ocid="events.textarea"
          />
          <select
            className="w-full bg-white/5 border border-fuchsia-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-fuchsia-400"
            value={form.zone}
            onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
            data-ocid="events.select"
          >
            {ZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {z.emoji} {z.id}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-fuchsia-300/70 text-xs mb-1">Start Time</p>
              <input
                type="datetime-local"
                className="w-full bg-white/5 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-fuchsia-400 [color-scheme:dark]"
                value={form.startTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startTime: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <p className="text-fuchsia-300/70 text-xs mb-1">End Time</p>
              <input
                type="datetime-local"
                className="w-full bg-white/5 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-fuchsia-400 [color-scheme:dark]"
                value={form.endTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endTime: e.target.value }))
                }
                required
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={createLoading}
              className="btn-dream px-5 py-2 rounded-lg text-white font-medium"
              data-ocid="events.submit_button"
            >
              {createLoading ? "Creating..." : "🌟 Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-5 py-2 rounded-lg text-fuchsia-300/70 hover:text-white border border-fuchsia-500/30 hover:border-fuchsia-400/60 transition-colors"
              data-ocid="events.cancel_button"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {events.length === 0 ? (
        <div
          className="card-glass rounded-2xl p-10 text-center"
          data-ocid="events.empty_state"
        >
          <div className="text-5xl mb-3">🌌</div>
          <p className="text-fuchsia-300/60">
            No events scheduled yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
          {events.map((evt, i) => {
            const isActive = activeIds.has(evt.id.toString());
            return (
              <div
                key={evt.id.toString()}
                className={`card-glass rounded-2xl p-5 border transition-all ${isActive ? "border-yellow-400/50 glow-gold" : "border-fuchsia-500/20"}`}
                data-ocid={`events.item.${i + 1}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-white font-bold text-lg leading-tight">
                    {sanitizeInput(evt.title)}
                  </h3>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 shrink-0 animate-pulse">
                      LIVE
                    </span>
                  )}
                </div>
                <p className="text-fuchsia-300/70 text-sm mb-3">
                  {sanitizeInput(evt.description)}
                </p>
                <div className="space-y-1 text-xs text-fuchsia-400/70 mb-4">
                  <div>
                    📍 Zone: <span className="text-pink-200">{evt.zone}</span>
                  </div>
                  <div>
                    ⏰ Start:{" "}
                    <span className="text-pink-200">
                      {formatTime(evt.startTime)}
                    </span>
                  </div>
                  <div>
                    🏁 End:{" "}
                    <span className="text-pink-200">
                      {formatTime(evt.endTime)}
                    </span>
                  </div>
                  <div>
                    👥 Attendees:{" "}
                    <span className="text-pink-200">
                      {evt.attendees.length}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={rsvpLoading === evt.id.toString()}
                  onClick={() => handleRsvp(evt.id)}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-yellow-500/20 border border-yellow-400/40 text-yellow-300 hover:bg-yellow-500/30"
                      : "bg-fuchsia-600/30 border border-fuchsia-500/40 text-pink-200 hover:bg-fuchsia-600/50"
                  }`}
                  data-ocid={`events.primary_button.${i + 1}`}
                >
                  {rsvpLoading === evt.id.toString()
                    ? "Registering..."
                    : "✋ RSVP"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Dream Journal Tab ────────────────────────────────────────────────────────
function DreamJournalTab(_props: { profile: UserProfile }) {
  const { actor } = useActor();
  const [subTab, setSubTab] = useState<"mine" | "public">("mine");
  const [myEntries, setMyEntries] = useState<DreamJournalEntryView[]>([]);
  const [publicEntries, setPublicEntries] = useState<DreamJournalEntryView[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [posting, setPosting] = useState(false);
  const [likeLoading, setLikeLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const fetchJournals = useCallback(async () => {
    if (!actor) return;
    try {
      const [mine, pub] = await Promise.all([
        actor.getMyJournalEntries(),
        actor.getPublicJournalEntries(),
      ]);
      setMyEntries(mine);
      setPublicEntries(pub);
    } catch (_) {}
    setLoading(false);
  }, [actor]);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !title.trim() || !content.trim()) return;
    setPosting(true);
    try {
      await actor.addJournalEntry(
        validateText(title, MAX_LENGTHS.journalTitle),
        validateText(content, MAX_LENGTHS.journalContent),
        isPublic,
      );
      setTitle("");
      setContent("");
      setIsPublic(false);
      setMsg("📖 Entry saved!");
      fetchJournals();
    } catch (_) {
      setMsg("❌ Failed to save entry");
    }
    setPosting(false);
  };

  const handleLike = async (id: bigint) => {
    if (!actor) return;
    setLikeLoading(id.toString());
    try {
      await actor.likeJournalEntry(id);
      fetchJournals();
    } catch (_) {}
    setLikeLoading(null);
  };

  const handleDelete = async (id: bigint) => {
    if (!actor) return;
    setDeleteLoading(id.toString());
    try {
      await actor.deleteJournalEntry(id);
      setMsg("🗑️ Entry deleted");
      fetchJournals();
    } catch (_) {
      setMsg("❌ Delete failed");
    }
    setDeleteLoading(null);
  };

  const formatDate = (ts: bigint) =>
    new Date(Number(ts) / 1_000_000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="space-y-6" data-ocid="journal.section">
      <div>
        <h2 className="text-2xl font-black text-white">📖 Dream Journal</h2>
        <p className="text-fuchsia-300/60 text-sm mt-1">
          Chronicle your adventures in DreamWorld
        </p>
      </div>

      <div className="flex gap-2" data-ocid="journal.tab">
        {(["mine", "public"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSubTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              subTab === t ? "tab-active" : "tab-inactive"
            }`}
          >
            {t === "mine" ? "📝 My Journal" : "🌐 Public Feed"}
          </button>
        ))}
      </div>

      {msg && (
        <div
          className="card-glass rounded-xl p-3 text-center text-sm text-pink-200 border border-fuchsia-400/30"
          data-ocid="journal.success_state"
        >
          {msg}
          <button
            type="button"
            onClick={() => setMsg("")}
            className="ml-3 text-fuchsia-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {subTab === "mine" && (
        <div className="space-y-5">
          <form
            onSubmit={handlePost}
            className="card-glass rounded-2xl p-5 border border-fuchsia-500/30 space-y-4"
            data-ocid="journal.panel"
          >
            <h3 className="text-pink-200 font-semibold">✍️ New Entry</h3>
            <input
              className="w-full bg-white/5 border border-fuchsia-500/30 rounded-lg px-4 py-2 text-white placeholder-fuchsia-400/50 focus:outline-none focus:border-fuchsia-400"
              placeholder="Entry title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={MAX_LENGTHS.journalTitle}
              data-ocid="journal.input"
            />
            <textarea
              className="w-full bg-white/5 border border-fuchsia-500/30 rounded-lg px-4 py-2 text-white placeholder-fuchsia-400/50 focus:outline-none focus:border-fuchsia-400 resize-none"
              placeholder="Write about your adventure..."
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              maxLength={MAX_LENGTHS.journalContent}
              data-ocid="journal.textarea"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer text-sm text-fuchsia-300/70">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPublic}
                  onClick={() => setIsPublic((v) => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${isPublic ? "bg-fuchsia-500" : "bg-white/10"}`}
                  data-ocid="journal.switch"
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isPublic ? "left-5" : "left-0.5"}`}
                  />
                </button>
                {isPublic ? "🌐 Public" : "🔒 Private"}
              </div>
              <button
                type="submit"
                disabled={posting}
                className="btn-dream px-5 py-2 rounded-lg text-white font-medium text-sm"
                data-ocid="journal.submit_button"
              >
                {posting ? "Saving..." : "📖 Save Entry"}
              </button>
            </div>
          </form>

          {loading ? (
            <div
              className="text-center py-10 text-fuchsia-300/60 animate-pulse"
              data-ocid="journal.loading_state"
            >
              Loading entries...
            </div>
          ) : myEntries.length === 0 ? (
            <div
              className="card-glass rounded-2xl p-10 text-center"
              data-ocid="journal.empty_state"
            >
              <div className="text-5xl mb-3">📔</div>
              <p className="text-fuchsia-300/60">
                No entries yet. Write your first adventure!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myEntries.map((entry, i) => (
                <div
                  key={entry.id.toString()}
                  className="card-glass rounded-2xl p-5 border border-fuchsia-500/20"
                  data-ocid={`journal.item.${i + 1}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-white font-bold">
                      {sanitizeInput(entry.title)}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${entry.isPublic ? "bg-green-500/20 text-green-300 border border-green-400/30" : "bg-gray-500/20 text-gray-400 border border-gray-500/30"}`}
                      >
                        {entry.isPublic ? "🌐 Public" : "🔒 Private"}
                      </span>
                      <button
                        type="button"
                        disabled={deleteLoading === entry.id.toString()}
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-400/60 hover:text-red-400 text-sm transition-colors"
                        data-ocid={`journal.delete_button.${i + 1}`}
                      >
                        {deleteLoading === entry.id.toString() ? "..." : "🗑️"}
                      </button>
                    </div>
                  </div>
                  <p className="text-fuchsia-300/70 text-sm mb-3 leading-relaxed">
                    {sanitizeInput(entry.content)}
                  </p>
                  <div className="flex items-center justify-between text-xs text-fuchsia-400/60">
                    <span>{formatDate(entry.timestamp)}</span>
                    <span>❤️ {entry.likes.length} likes</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === "public" && (
        <div className="space-y-4">
          {loading ? (
            <div
              className="text-center py-10 text-fuchsia-300/60 animate-pulse"
              data-ocid="journal.loading_state"
            >
              Loading feed...
            </div>
          ) : publicEntries.length === 0 ? (
            <div
              className="card-glass rounded-2xl p-10 text-center"
              data-ocid="journal.empty_state"
            >
              <div className="text-5xl mb-3">🌐</div>
              <p className="text-fuchsia-300/60">
                No public entries yet. Be the first to share!
              </p>
            </div>
          ) : (
            publicEntries.map((entry, i) => (
              <div
                key={entry.id.toString()}
                className="card-glass rounded-2xl p-5 border border-fuchsia-500/20"
                data-ocid={`journal.item.${i + 1}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-white font-bold">
                    {sanitizeInput(entry.title)}
                  </h3>
                  <button
                    type="button"
                    disabled={likeLoading === entry.id.toString()}
                    onClick={() => handleLike(entry.id)}
                    className="flex items-center gap-1 text-sm text-fuchsia-300/70 hover:text-pink-400 transition-colors shrink-0"
                    data-ocid={`journal.secondary_button.${i + 1}`}
                  >
                    {likeLoading === entry.id.toString()
                      ? "..."
                      : `❤️ ${entry.likes.length}`}
                  </button>
                </div>
                <p className="text-fuchsia-400/70 text-xs mb-2">
                  by {sanitizeInput(entry.authorName)}
                </p>
                <p className="text-fuchsia-300/70 text-sm mb-3 leading-relaxed line-clamp-3">
                  {sanitizeInput(entry.content)}
                </p>
                <div className="text-xs text-fuchsia-400/60">
                  {formatDate(entry.timestamp)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Star Dedications Tab ─────────────────────────────────────────────────────
function StarDedicationsTab(_props: { profile: UserProfile }) {
  const { actor } = useActor();
  const [stars, setStars] = useState<StarDedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [dedicating, setDedicating] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchStars = useCallback(async () => {
    if (!actor) return;
    try {
      const s = await actor.getAllStars();
      setStars(s);
    } catch (_) {}
    setLoading(false);
  }, [actor]);

  useEffect(() => {
    fetchStars();
  }, [fetchStars]);

  const handleDedicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !recipient.trim() || !message.trim()) return;
    setDedicating(true);
    try {
      await actor.dedicateStar(
        validateText(recipient, MAX_LENGTHS.starName),
        validateText(message, MAX_LENGTHS.starMessage),
      );
      setRecipient("");
      setMessage("");
      setMsg("⭐ Star dedicated forever!");
      fetchStars();
    } catch (_) {
      setMsg("❌ Failed to dedicate star");
    }
    setDedicating(false);
  };

  const formatDate = (ts: bigint) =>
    new Date(Number(ts) / 1_000_000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="relative space-y-6 min-h-96" data-ocid="stars.section">
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl"
        aria-hidden="true"
      >
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: decorative stars with fixed positions
            key={i}
            className="absolute rounded-full bg-yellow-200"
            style={{
              width: `${((i * 7) % 3) + 1}px`,
              height: `${((i * 7) % 3) + 1}px`,
              top: `${(i * 97) % 100}%`,
              left: `${(i * 83) % 100}%`,
              opacity: 0.2 + (i % 5) * 0.12,
              animation: `pulse ${2 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${(i % 3) * 0.7}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <h2 className="text-2xl font-black text-white">⭐ Star Dedications</h2>
        <p className="text-fuchsia-300/60 text-sm mt-1">
          Name a star in the cosmos for someone special — it shines forever
        </p>
      </div>

      {msg && (
        <div
          className="relative z-10 card-glass rounded-xl p-3 text-center text-sm text-yellow-200 border border-yellow-400/30"
          data-ocid="stars.success_state"
        >
          {msg}
          <button
            type="button"
            onClick={() => setMsg("")}
            className="ml-3 text-yellow-400/60 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      <form
        onSubmit={handleDedicate}
        className="relative z-10 rounded-2xl p-6 border border-yellow-400/30 space-y-4 bg-gradient-to-br from-indigo-950/80 to-violet-950/80 backdrop-blur-sm"
        data-ocid="stars.panel"
      >
        <div className="text-center mb-2">
          <div className="text-4xl mb-1">✨</div>
          <h3 className="text-yellow-200 font-bold text-lg">Dedicate a Star</h3>
          <p className="text-fuchsia-300/50 text-xs mt-1">
            This star will shine forever in the Space zone
          </p>
        </div>
        <input
          className="w-full bg-white/5 border border-yellow-400/30 rounded-lg px-4 py-2 text-white placeholder-yellow-400/40 focus:outline-none focus:border-yellow-400"
          placeholder="Recipient's name..."
          maxLength={MAX_LENGTHS.starName}
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          required
          data-ocid="stars.input"
        />
        <textarea
          className="w-full bg-white/5 border border-yellow-400/30 rounded-lg px-4 py-2 text-white placeholder-yellow-400/40 focus:outline-none focus:border-yellow-400 resize-none"
          placeholder="Your heartfelt message..."
          maxLength={MAX_LENGTHS.starMessage}
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          data-ocid="stars.textarea"
        />
        <button
          type="submit"
          disabled={dedicating}
          className="w-full py-2.5 rounded-lg font-bold text-sm transition-all bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-400/40 text-yellow-200 hover:from-yellow-500/50 hover:to-amber-500/50"
          data-ocid="stars.submit_button"
        >
          {dedicating ? "Dedicating..." : "⭐ Dedicate This Star"}
        </button>
      </form>

      {loading ? (
        <div
          className="relative z-10 text-center py-10 text-fuchsia-300/60 animate-pulse"
          data-ocid="stars.loading_state"
        >
          Loading stars...
        </div>
      ) : stars.length === 0 ? (
        <div
          className="relative z-10 rounded-2xl p-10 text-center bg-violet-950/40 border border-yellow-400/10"
          data-ocid="stars.empty_state"
        >
          <div className="text-5xl mb-3">🌌</div>
          <p className="text-fuchsia-300/60">
            No stars dedicated yet. Be the first to name one!
          </p>
        </div>
      ) : (
        <div className="relative z-10 grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {stars.map((star, i) => (
            <div
              key={star.id.toString()}
              className="rounded-2xl p-5 border border-yellow-400/20 bg-gradient-to-br from-indigo-950/70 to-violet-950/60 backdrop-blur-sm hover:border-yellow-400/40 transition-all group"
              style={{ boxShadow: "0 0 20px rgba(250,204,21,0.07)" }}
              data-ocid={`stars.item.${i + 1}`}
            >
              <div className="text-center mb-2">
                <span className="text-3xl group-hover:scale-110 inline-block transition-transform">
                  ⭐
                </span>
              </div>
              <h3 className="text-yellow-200 font-black text-center text-lg mb-1">
                {sanitizeInput(star.recipientName)}
              </h3>
              <p className="text-fuchsia-300/70 text-sm text-center italic leading-relaxed mb-3">
                &ldquo;{sanitizeInput(star.message)}&rdquo;
              </p>
              <div className="border-t border-yellow-400/10 pt-2 text-xs text-fuchsia-400/60 text-center">
                <div>
                  Dedicated by{" "}
                  <span className="text-fuchsia-300">
                    {sanitizeInput(star.dedicatorName)}
                  </span>
                </div>
                <div className="mt-0.5">{formatDate(star.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sliding Puzzle ───────────────────────────────────────────────────────────────
function shuffleTiles(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0];

function MiniGameTab() {
  const [tiles, setTiles] = useState<number[]>(() => shuffleTiles([...SOLVED]));
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);

  const handleClick = (index: number) => {
    if (solved) return;
    const blankIdx = tiles.indexOf(0);
    const row = Math.floor(index / 3);
    const col = index % 3;
    const bRow = Math.floor(blankIdx / 3);
    const bCol = blankIdx % 3;
    const adjacent =
      (Math.abs(row - bRow) === 1 && col === bCol) ||
      (Math.abs(col - bCol) === 1 && row === bRow);
    if (!adjacent) return;
    const next = [...tiles];
    [next[index], next[blankIdx]] = [next[blankIdx], next[index]];
    setTiles(next);
    setMoves((m) => m + 1);
    if (next.every((v, i) => v === SOLVED[i])) setSolved(true);
  };

  const reset = () => {
    setTiles(shuffleTiles([...SOLVED]));
    setMoves(0);
    setSolved(false);
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <h2 className="text-xl font-bold text-pink-200">🧩 Sliding Puzzle</h2>
      <p className="text-fuchsia-300/60 text-sm">
        Arrange tiles 1-8 in order. Click a tile adjacent to the blank to slide
        it.
      </p>

      <div className="flex items-center gap-8">
        <div className="text-center">
          <p className="text-fuchsia-300/60 text-xs uppercase tracking-wider mb-1">
            Moves
          </p>
          <p className="text-4xl font-black text-pink-200">{moves}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 p-4 card-glass rounded-2xl glow-purple">
          {tiles.map((tile, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: tile order changes on every move, index is correct key here
              key={i}
              type="button"
              onClick={() => handleClick(i)}
              disabled={tile === 0}
              aria-label={tile === 0 ? "Empty tile" : `Tile ${tile}`}
              className={`w-16 h-16 rounded-xl font-black text-xl transition-all ${
                tile === 0
                  ? "bg-transparent cursor-default"
                  : "bg-gradient-to-br from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-500 hover:to-blue-500 hover:scale-95 shadow-lg"
              }`}
            >
              {tile !== 0 ? tile : ""}
            </button>
          ))}
        </div>
      </div>

      {solved && (
        <div className="card-glass rounded-xl p-6 text-center glow-gold border border-yellow-400/40 animate-slide-in">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-yellow-300 font-black text-xl">Puzzle Solved!</p>
          <p className="text-fuchsia-300/70 text-sm">
            Completed in {moves} moves
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={reset}
        className="btn-dream px-6 py-3 rounded-lg text-white font-medium"
      >
        🔀 Shuffle
      </button>
    </div>
  );
}

// ─── Main Hub ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "map", label: "🗺️ World" },
  { id: "chat", label: "💬 Chat" },
  { id: "social", label: "👥 Social" },
  { id: "avatar", label: "🎨 Avatar" },
  { id: "quests", label: "⚔️ Quests" },
  { id: "game", label: "🧩 Game" },
  { id: "events", label: "🌍 Events" },
  { id: "journal", label: "📖 Journal" },
  { id: "stars", label: "⭐ Stars" },
];

function MainHub({
  profile: initialProfile,
  onLogout,
}: { profile: UserProfile; onLogout: () => void }) {
  const { actor } = useActor();
  const [profile, setProfile] = useState(initialProfile);
  const [tab, setTab] = useState("map");
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!actor) return;
    actor
      .getUnreadNotificationCount()
      .then((n) => setNotifCount(Number(n)))
      .catch(() => {});
    const interval = setInterval(() => {
      actor
        .getUnreadNotificationCount()
        .then((n) => setNotifCount(Number(n)))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [actor]);

  const handleTeleport = async (zone: string) => {
    if (!actor) return;
    await actor.teleport(zone);
    setProfile((p) => ({ ...p, currentZone: zone }));
  };

  const handleSaveAvatar = async (avatarConfig: AvatarConfig) => {
    if (!actor) return;
    await actor.updateAvatar(avatarConfig);
    setProfile((p) => ({ ...p, avatar: avatarConfig }));
  };

  const defaultAvatar: AvatarConfig = {
    bodyType: "Human",
    outfit: "Casual",
    accessory: "None",
    color: "purple",
  };

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      {/* Top Nav */}
      <header className="card-glass border-b border-fuchsia-500/30 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌌</span>
          <span className="text-white font-black text-xl tracking-wide hidden sm:block">
            DreamWorld
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <AvatarSVG config={profile.avatar || defaultAvatar} size={32} />
            <span className="text-pink-200 font-semibold text-sm hidden sm:block">
              {sanitizeInput(profile.username)}
            </span>
          </div>
          {notifCount > 0 && (
            <button
              type="button"
              onClick={async () => {
                await actor?.markAllNotificationsRead();
                setNotifCount(0);
              }}
              className="relative px-2 py-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/40 text-pink-200 text-xs"
            >
              🔔 {notifCount}
            </button>
          )}
          <span className="text-fuchsia-300/60 text-xs hidden sm:block">
            {profile.currentZone || "Starter Plaza"}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg text-fuchsia-300/70 hover:text-red-400 hover:bg-red-500/10 text-sm transition-colors border border-transparent hover:border-red-500/20"
          >
            Exit
          </button>
        </div>
      </header>

      {/* Tab Bar */}
      <nav className="flex gap-1 px-2 md:px-4 py-2 overflow-x-auto scrollbar-hide border-b border-fuchsia-500/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.id ? "tab-active" : "tab-inactive"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 px-3 md:px-4 pb-8 md:pb-10 max-w-5xl mx-auto w-full pt-4">
        {tab === "map" && (
          <WorldMapTab profile={profile} onTeleport={handleTeleport} />
        )}
        {tab === "chat" && <ChatTab profile={profile} />}
        {tab === "social" && <SocialTab />}
        {tab === "avatar" && (
          <AvatarTab profile={profile} onSave={handleSaveAvatar} />
        )}
        {tab === "quests" && <QuestsTab profile={profile} />}
        {tab === "game" && <MiniGameTab />}
        {tab === "events" && <WorldEventsTab />}
        {tab === "journal" && <DreamJournalTab profile={profile} />}
        {tab === "stars" && <StarDedicationsTab profile={profile} />}
      </main>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const { identity, login, clear, isInitializing } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  useEffect(() => {
    if (!identity || !actor || isFetching) {
      if (!identity) setProfileChecked(false);
      return;
    }
    setProfileLoading(true);
    actor
      .getCallerUserProfile()
      .then((p) => {
        setProfile(p);
        setProfileChecked(true);
      })
      .catch(() => setProfileChecked(true))
      .finally(() => setProfileLoading(false));
  }, [identity, actor, isFetching]);

  const handleLogout = () => {
    clear();
    setProfile(null);
    setProfileChecked(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.ctrlKey || e.metaKey) && e.key === "D") {
        e.preventDefault();
        setDebugOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const debugPanel = (
    <>
      {debugOpen && (
        <TestDebugPanel
          actor={actor}
          isLoggedIn={!!identity}
          principal={identity?.getPrincipal().toString() ?? null}
          onClose={() => setDebugOpen(false)}
        />
      )}
      {!debugOpen && (
        <button
          data-ocid="debug.open_modal_button"
          type="button"
          onClick={() => setDebugOpen(true)}
          title="Open Debug Panel (Ctrl+Shift+D)"
          className="fixed bottom-5 right-5 z-40 w-10 h-10 rounded-full bg-black/70 border border-green-500/30 text-lg flex items-center justify-center hover:bg-green-900/40 hover:border-green-400/60 transition-all shadow-lg"
          aria-label="Open debug panel"
        >
          🐛
        </button>
      )}
    </>
  );

  if (isInitializing || (identity && (isFetching || profileLoading))) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center relative z-10">
          <StarsBackground />
          <div className="animate-pulse-glow">
            <div className="text-6xl mb-4 animate-float">🌌</div>
          </div>
          <p className="text-fuchsia-300/60 mt-4 text-sm tracking-widest uppercase animate-pulse">
            Loading DreamWorld...
          </p>
        </div>
        {debugPanel}
      </>
    );
  }

  if (!identity)
    return (
      <>
        <LandingPage onLogin={login} />
        {debugPanel}
      </>
    );
  if (!profileChecked || profile === null) {
    return (
      <>
        <Onboarding
          onComplete={(p) => {
            setProfile(p);
            setProfileChecked(true);
          }}
        />
        {debugPanel}
      </>
    );
  }
  return (
    <>
      <MainHub profile={profile} onLogout={handleLogout} />
      {debugPanel}
    </>
  );
}
