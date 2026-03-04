"use client";

import { useCallback, useEffect, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

const PLATFORMS = ["TikTok", "Instagram", "Facebook", "YouTube", "X (Twitter)", "LinkedIn"] as const;
type Platform = typeof PLATFORMS[number];

const PLATFORM_ICONS: Record<Platform, string> = {
  TikTok: "♪", Instagram: "◈", Facebook: "ƒ",
  YouTube: "▶", "X (Twitter)": "𝕏", LinkedIn: "in",
};

const AD_LABELS: Record<Platform, string> = {
  TikTok: "TIKTOK AD", Instagram: "META AD", Facebook: "META AD",
  YouTube: "GOOGLE AD", "X (Twitter)": "X AD", LinkedIn: "LINKEDIN AD",
};

const AD_FIELDS: Record<Platform, string> = {
  TikTok: "tiktok_ad_compliant", Instagram: "meta_ad_compliant",
  Facebook: "meta_ad_compliant", YouTube: "google_ad_compliant",
  "X (Twitter)": "x_ad_compliant", LinkedIn: "linkedin_ad_compliant",
};

const URL_PLATFORM_MAP: Record<string, Platform> = {
  "tiktok.com": "TikTok",
  "instagram.com": "Instagram",
  "facebook.com": "Facebook",
  "fb.com": "Facebook",
  "fb.watch": "Facebook",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "twitter.com": "X (Twitter)",
  "x.com": "X (Twitter)",
  "linkedin.com": "LinkedIn",
};

const TRANSCRIPTION_PLATFORMS: Platform[] = ["TikTok", "YouTube"];

const detectPlatform = (url: string): Platform | null => {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    for (const [domain, platform] of Object.entries(URL_PLATFORM_MAP)) {
      if (hostname.includes(domain)) return platform;
    }
  } catch {}
  return null;
};

const isValidUrl = (url: string): boolean => {
  try { new URL(url); return true; } catch { return false; }
};

const scoreColor = (s: number) => s >= 75 ? "#00ff87" : s >= 45 ? "#ffcc00" : "#ff3d3d";
const triColor = (v: string) => v === "Yes" ? "#00ff87" : v === "Partially" ? "#ffcc00" : v === "No" ? "#ff3d3d" : "#3a3a3a";
const hookColor = (v: string) => v === "Strong" ? "#00ff87" : v === "Moderate" ? "#ffcc00" : "#ff3d3d";

const decisionMap: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  Keep:   { color: "#00ff87", bg: "rgba(0,255,135,0.06)",  border: "rgba(0,255,135,0.2)",  icon: "✓" },
  Revise: { color: "#ffcc00", bg: "rgba(255,204,0,0.06)",  border: "rgba(255,204,0,0.2)",  icon: "△" },
  Delete: { color: "#ff3d3d", bg: "rgba(255,61,61,0.06)",  border: "rgba(255,61,61,0.2)",  icon: "✕" },
};

interface AuditResult {
  platform: string;
  brand_alignment: string;
  crm_mention: string;
  action: string;
  score: number;
  hook_strength: string;
  cta_present: boolean;
  verdict: string;
  issues: string[];
  suggestions: string[];
  revised_angle: string;
  [key: string]: any;
}

export default function WiBizAuditTool() {
  const [platform, setPlatform] = useState<Platform>("TikTok");
  const [videoUrl, setVideoUrl] = useState("");
  const [script, setScript] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState<"script" | "url">("script");
  const [step, setStep] = useState("");
  const [autoDetected, setAutoDetected] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (inputMode !== "url" || !videoUrl.trim()) {
      setAutoDetected(false);
      return;
    }
    const detected = detectPlatform(videoUrl);
    if (detected) {
      setPlatform(detected);
      setAutoDetected(true);
    } else {
      setAutoDetected(false);
    }
  }, [videoUrl, inputMode]);

  const handleAudit = useCallback(async () => {
    const content = inputMode === "url" ? videoUrl.trim() : script.trim();

    if (!content) { setError("Please provide a video URL or script."); return; }
    if (inputMode === "url" && !isValidUrl(content)) { setError("Invalid URL format."); return; }
    if (inputMode === "script" && content.length < 5) { setError("Script is too short to audit."); return; }
    if (inputMode === "script" && content.length > 10000) { setError("Script too long — max 10,000 characters."); return; }

    setError("");
    setResult(null);
    setLoading(true);

    const isTranscription = inputMode === "url" && TRANSCRIPTION_PLATFORMS.includes(platform);
    setStep(isTranscription ? "Extracting audio…" : inputMode === "url" ? "Analyzing URL context…" : "Sending to AI…");

    try {
      const response = await fetch(`${BACKEND_URL}/api/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: inputMode === "script" ? content : undefined,
          url: inputMode === "url" ? content : undefined,
          platform,
        }),
      });

      setStep(isTranscription ? "Transcribing audio…" : "Analyzing brand alignment…");

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.message || errData?.error || `Server error ${response.status}`);
      }

      const data: AuditResult = await response.json();
      if (!data.score || !data.action || !data.verdict) {
        throw new Error("Incomplete response from server. Please try again.");
      }

      setResult(data);

    } catch (err: any) {
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        setError("Cannot connect to server. Make sure the backend is running.");
      } else {
        setError(err.message || "Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
      setStep("");
    }
  }, [inputMode, videoUrl, script, platform]);

  const dec = result ? (decisionMap[result.action] || decisionMap.Revise) : null;
  const adField = result ? AD_FIELDS[result.platform as Platform] : null;
  const adValue = adField && result ? result[adField] : null;
  const adLabel = result ? (AD_LABELS[result.platform as Platform] || "AD POLICY") : "AD POLICY";

  const urlHint = platform
    ? TRANSCRIPTION_PLATFORMS.includes(platform)
      ? `✓ ${platform} — full audio transcription`
      : `✓ ${platform} — AI context audit (URL-based)`
    : "Paste a video URL — platform auto-detected";

  if (!mounted) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#e8e8e8", fontFamily: "'Syne', 'DM Sans', system-ui, sans-serif" }}>

      <div style={{ position: "fixed", top: -200, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(0,255,135,0.04) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <header style={{ position: "relative", zIndex: 1, borderBottom: "1px solid #141414", padding: "0 48px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #00ff87 0%, #0066ff 100%)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: "#000" }}>W</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" }}>WiBiz</span>
          <span style={{ fontSize: 11, color: "#2a2a2a", letterSpacing: "0.15em" }}>AUDIT</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 11, color: "#2a2a2a", letterSpacing: "0.1em" }}>v2.0</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00ff87", boxShadow: "0 0 6px #00ff87", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: "#3a3a3a", letterSpacing: "0.1em" }}>ONLINE</span>
          </div>
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", padding: "72px 24px 96px" }}>

        <div style={{ marginBottom: 72 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,255,135,0.05)", border: "1px solid rgba(0,255,135,0.12)", borderRadius: 100, padding: "5px 14px", marginBottom: 28 }}>
            <span style={{ fontSize: 10, color: "#00ff87", letterSpacing: "0.15em", fontWeight: 700 }}>AI VIDEO BRAND AUDIT — SINGAPORE</span>
          </div>
          <h1 style={{ fontSize: "clamp(40px, 7vw, 80px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.04em", color: "#fff", margin: "0 0 20px" }}>
            Every Video.<br />
            <span style={{ color: "#2a2a2a" }}>Every Platform.</span><br />
            <span style={{ background: "linear-gradient(90deg, #00ff87 0%, #0066ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Audited.</span>
          </h1>
          <p style={{ fontSize: 15, color: "#404040", lineHeight: 1.7, maxWidth: 420, margin: 0 }}>
            Platform-specific AI scoring against WiBiz brand standards. Consistent. Fast. Reliable.
          </p>
        </div>

        <div style={{ background: "#0e0e0e", border: "1px solid #161616", borderRadius: 20, padding: "40px", marginBottom: 40 }}>

          {/* Platform */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 10, color: "#3a3a3a", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 14 }}>TARGET PLATFORM</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => { setPlatform(p); setAutoDetected(false); }}
                  style={{ padding: "8px 16px", borderRadius: 100, border: platform === p ? "1px solid rgba(0,255,135,0.35)" : "1px solid #1c1c1c", background: platform === p ? "rgba(0,255,135,0.07)" : "transparent", color: platform === p ? "#00ff87" : "#3a3a3a", fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: platform === p ? 700 : 500, letterSpacing: "0.04em", transition: "all 0.15s" }}>
                  {PLATFORM_ICONS[p]} {p}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "#2a2a2a", letterSpacing: "0.06em" }}>
              {autoDetected
                ? <span style={{ color: "#00ff87" }}>⚡ Auto-detected: {platform}</span>
                : <span>✦ {AD_LABELS[platform]} policy check active</span>
              }
            </div>
          </div>

          {/* Mode Toggle */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "inline-flex", background: "#0a0a0a", border: "1px solid #161616", borderRadius: 100, padding: 3 }}>
              {(["script", "url"] as const).map(mode => (
                <button key={mode} onClick={() => { setInputMode(mode); setError(""); }}
                  style={{ padding: "7px 20px", borderRadius: 100, background: inputMode === mode ? "#fff" : "transparent", color: inputMode === mode ? "#000" : "#3a3a3a", border: "none", fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: inputMode === mode ? 700 : 500, letterSpacing: "0.05em", transition: "all 0.15s" }}>
                  {mode === "script" ? "📝 Paste Script" : "🔗 Video URL"}
                </button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          {inputMode === "script" ? (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, color: "#3a3a3a", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 10 }}>SCRIPT / CAPTION / DESCRIPTION</div>
              <textarea
                value={script}
                onChange={e => { setScript(e.target.value); setError(""); }}
                rows={6}
                placeholder="Paste your video script or caption here…"
                style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #161616", borderRadius: 12, padding: "16px 20px", color: "#e8e8e8", fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", lineHeight: 1.7 }}
                onFocus={e => e.target.style.borderColor = "#2a2a2a"}
                onBlur={e => e.target.style.borderColor = "#161616"}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: "#2a2a2a" }}>Select the correct platform before auditing</span>
                <span style={{ fontSize: 11, color: script.length > 9000 ? "#ff3d3d" : "#2a2a2a" }}>{script.length}/10,000</span>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, color: "#3a3a3a", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 10 }}>VIDEO URL</div>
              <input
                type="url"
                value={videoUrl}
                onChange={e => { setVideoUrl(e.target.value); setError(""); }}
                placeholder="Paste any video URL — TikTok, YouTube, Instagram, Facebook, LinkedIn, X…"
                style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #161616", borderRadius: 12, padding: "16px 20px", color: "#e8e8e8", fontSize: 14, fontFamily: "inherit", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "#2a2a2a"}
                onBlur={e => e.target.style.borderColor = "#161616"}
              />
              <div style={{ marginTop: 8, fontSize: 11, color: "#2a2a2a", lineHeight: 1.6 }}>
                {urlHint}
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: "rgba(255,61,61,0.05)", border: "1px solid rgba(255,61,61,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#ff3d3d", fontSize: 13, lineHeight: 1.5 }}>
              ⚠ {error}
            </div>
          )}

          <button onClick={handleAudit} disabled={loading}
            style={{ width: "100%", padding: "18px 24px", background: loading ? "#0e0e0e" : "#fff", border: loading ? "1px solid #1c1c1c" : "none", borderRadius: 12, color: loading ? "#3a3a3a" : "#000", fontSize: 14, fontFamily: "inherit", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            {loading
              ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>{step}</span>
              : <span>Run {platform} Audit →</span>
            }
          </button>
        </div>

        {/* Results */}
        {result && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid #141414" }}>
              <div>
                <div style={{ fontSize: 10, color: "#3a3a3a", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 6 }}>AUDIT COMPLETE</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{result.platform} Results</div>
                <div style={{ fontSize: 13, color: "#3a3a3a", marginTop: 4 }}>{result.verdict}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: "#3a3a3a", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 4 }}>BRAND SCORE</div>
                <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color: scoreColor(result.score), letterSpacing: "-0.04em" }}>{result.score}</div>
                <div style={{ fontSize: 11, color: "#2a2a2a" }}>out of 100</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
              <div style={{ background: dec?.bg, border: `1px solid ${dec?.border}`, borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#3a3a3a", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 10 }}>DECISION</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: dec?.color }}>{dec?.icon} {result.action.toUpperCase()}</div>
              </div>
              <div style={{ background: "#0e0e0e", border: "1px solid #161616", borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#3a3a3a", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 10 }}>HOOK</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: hookColor(result.hook_strength) }}>{result.hook_strength || "—"}</div>
              </div>
              <div style={{ background: "#0e0e0e", border: "1px solid #161616", borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#3a3a3a", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 10 }}>CRM</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: triColor(result.crm_mention) }}>{result.crm_mention || "—"}</div>
                <div style={{ fontSize: 10, marginTop: 6, color: result.cta_present ? "#00ff87" : "#ff3d3d", letterSpacing: "0.05em" }}>CTA {result.cta_present ? "✓ Present" : "✕ Missing"}</div>
              </div>
              <div style={{ background: "#0e0e0e", border: "1px solid #161616", borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#3a3a3a", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 10 }}>{adLabel}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: triColor(adValue) }}>{adValue || "N/A"}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              {result.issues?.length > 0 && (
                <div style={{ background: "rgba(255,61,61,0.03)", border: "1px solid rgba(255,61,61,0.1)", borderRadius: 14, padding: "20px 24px" }}>
                  <div style={{ fontSize: 10, color: "#ff3d3d", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 14 }}>⚠ ISSUES</div>
                  {result.issues.map((issue, i) => (
                    <div key={i} style={{ fontSize: 13, color: "#555", lineHeight: 1.65, paddingLeft: 12, borderLeft: "2px solid rgba(255,61,61,0.25)", marginBottom: 10 }}>{issue}</div>
                  ))}
                </div>
              )}
              {result.suggestions?.length > 0 && (
                <div style={{ background: "rgba(0,255,135,0.02)", border: "1px solid rgba(0,255,135,0.1)", borderRadius: 14, padding: "20px 24px" }}>
                  <div style={{ fontSize: 10, color: "#00ff87", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 14 }}>✦ SUGGESTIONS</div>
                  {result.suggestions.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: "#555", lineHeight: 1.65, paddingLeft: 12, borderLeft: "2px solid rgba(0,255,135,0.25)", marginBottom: 10 }}>{s}</div>
                  ))}
                </div>
              )}
            </div>

            {result.revised_angle && (
              <div style={{ background: "rgba(0,102,255,0.03)", border: "1px solid rgba(0,102,255,0.12)", borderRadius: 14, padding: "24px 28px" }}>
                <div style={{ fontSize: 10, color: "#0066ff", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 12 }}>✎ REVISION ANGLE</div>
                <div style={{ fontSize: 14, color: "#4a4a4a", lineHeight: 1.8, fontStyle: "italic" }}>{result.revised_angle}</div>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 96, paddingTop: 24, borderTop: "1px solid #111", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#1e1e1e", letterSpacing: "0.1em" }}>WIBIZ AI AUTOMATION • SINGAPORE</span>
          <span style={{ fontSize: 11, color: "#1e1e1e", letterSpacing: "0.1em" }}>POWERED BY GROQ LLAMA 3.1</span>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: #252525 !important; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        button:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
        button:active:not(:disabled) { transform: translateY(0px); }
        scrollbar-width: thin;
        scrollbar-color: #1a1a1a #080808;
      `}</style>
    </div>
  );
}