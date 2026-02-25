"use client";

import { useState } from "react";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || "";

const PLATFORMS = ["TikTok", "Instagram", "Facebook", "YouTube", "X (Twitter)", "LinkedIn"];

const PLATFORM_ICONS: Record<string, string> = {
  TikTok: "♪",
  Instagram: "◈",
  Facebook: "ƒ",
  YouTube: "▶",
  "X (Twitter)": "𝕏",
  LinkedIn: "in",
};

const WIBIZ_SYSTEM_PROMPT = `You are a senior brand strategist for WiBiz — a Singapore-based AI automation and CRM solutions company. Your job is to audit video scripts or descriptions against WiBiz's brand standards.

WiBiz Brand Standards:
- Core Services: AI automation, CRM solutions, business process automation, lead generation
- Brand Voice: Professional yet approachable, forward-thinking, results-driven, Singapore market savvy
- Must Include: Clear value proposition, technology focus, CRM or automation mention
- Hook: First 3 seconds must grab attention
- CTA: Must have a clear call-to-action
- Platform Fit: Content must match platform's native style and audience

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "platform": "detected or inputted platform",
  "brand_alignment": "Yes / No / Partially",
  "crm_mention": "Yes / No / Partially",
  "action": "Keep / Revise / Delete",
  "score": 0-100,
  "hook_strength": "Strong / Moderate / Weak",
  "cta_present": true or false,
  "verdict": "one sentence summary",
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "revised_angle": "A one paragraph suggested revision angle for the script"
}`;

export default function WiBizAuditTool() {
  const [platform, setPlatform] = useState("TikTok");
  const [videoUrl, setVideoUrl] = useState("");
  const [script, setScript] = useState("");
  const [apiKey, setApiKey] = useState(GROQ_API_KEY);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState("script");
  const [step, setStep] = useState("");

  const handleAudit = async () => {
    const content = inputMode === "url" ? videoUrl.trim() : script.trim();
    if (!content) { setError("Please provide a video URL or script."); return; }
    if (!apiKey.trim()) { setError("Please enter your Groq API key."); return; }
    setError("");
    setResult(null);
    setLoading(true);
    setStep("Preparing audit request…");

    try {
      const userMessage = inputMode === "url"
        ? `Please audit this video content for the ${platform} platform.\nVideo URL: ${content}`
        : `Please audit this video script/description for the ${platform} platform:\n\n${content}`;

      setStep("Analyzing brand alignment…");

      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 1000,
          messages: [
            { role: "system", content: WIBIZ_SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
        }),
      });

      setStep("Processing results…");

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as any)?.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Check your API key and try again.");
    } finally {
      setLoading(false);
      setStep("");
    }
  };

  const getDecisionStyle = (action: string) => {
    const map: Record<string, any> = {
      Keep: { bg: "#0d3d2e", border: "#00e676", text: "#00e676", label: "✓ KEEP" },
      Revise: { bg: "#3d2f00", border: "#ffd600", text: "#ffd600", label: "△ REVISE" },
      Delete: { bg: "#3d0d0d", border: "#ff1744", text: "#ff1744", label: "✕ DELETE" },
    };
    return map[action] || map.Revise;
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "#00e676";
    if (score >= 45) return "#ffd600";
    return "#ff1744";
  };

  const ds = result ? getDecisionStyle(result.action) : {};

  return (
    <div style={{ minHeight: "100vh", background: "#080c10", color: "#e8edf2", fontFamily: "'DM Mono', 'Courier New', monospace", padding: "0" }}>
      <div style={{ borderBottom: "1px solid #1a2332", padding: "20px 32px", display: "flex", alignItems: "center", gap: "16px", background: "rgba(255,255,255,0.02)" }}>
        <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #0ea5e9, #6366f1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: "bold", color: "#fff" }}>W</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#0ea5e9", textTransform: "uppercase" }}>WiBiz</div>
          <div style={{ fontSize: 11, color: "#4a6072", letterSpacing: "0.1em" }}>AI VIDEO AUDIT TOOL v2</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#2a3f52", letterSpacing: "0.08em" }}>SG • AI AUTOMATION & CRM</div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", fontSize: 11, color: "#4a6072", letterSpacing: "0.12em", marginBottom: 10 }}>TARGET PLATFORM</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PLATFORMS.map(p => (
              <button key={p} onClick={() => setPlatform(p)} style={{ padding: "7px 14px", borderRadius: 6, border: platform === p ? "1px solid #0ea5e9" : "1px solid #1a2d3f", background: platform === p ? "rgba(14,165,233,0.12)" : "#0c1520", color: platform === p ? "#0ea5e9" : "#4a6072", fontSize: 12, fontFamily: "inherit", cursor: "pointer", letterSpacing: "0.05em" }}>
                <span style={{ marginRight: 5 }}>{PLATFORM_ICONS[p]}</span>{p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "inline-flex", border: "1px solid #1a2d3f", borderRadius: 8, overflow: "hidden" }}>
            {["script", "url"].map(mode => (
              <button key={mode} onClick={() => setInputMode(mode)} style={{ padding: "8px 20px", background: inputMode === mode ? "#0ea5e9" : "transparent", color: inputMode === mode ? "#080c10" : "#4a6072", border: "none", fontSize: 11, fontFamily: "inherit", cursor: "pointer", letterSpacing: "0.1em", fontWeight: inputMode === mode ? 700 : 400, textTransform: "uppercase" }}>
                {mode === "script" ? "📝 Paste Script" : "🔗 Video URL"}
              </button>
            ))}
          </div>
        </div>

        {inputMode === "script" ? (
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, color: "#4a6072", letterSpacing: "0.12em", marginBottom: 8 }}>VIDEO SCRIPT / CAPTION / DESCRIPTION</label>
            <textarea value={script} onChange={e => setScript(e.target.value)} rows={7} placeholder="Paste your video script, caption, or description here…" style={{ width: "100%", boxSizing: "border-box", background: "#0c1520", border: "1px solid #1a2d3f", borderRadius: 8, padding: "14px 16px", color: "#e8edf2", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", lineHeight: 1.6 }} />
          </div>
        ) : (
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, color: "#4a6072", letterSpacing: "0.12em", marginBottom: 8 }}>VIDEO URL</label>
            <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.tiktok.com/@wibiz/video/..." style={{ width: "100%", boxSizing: "border-box", background: "#0c1520", border: "1px solid #1a2d3f", borderRadius: 8, padding: "12px 16px", color: "#e8edf2", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
            <div style={{ fontSize: 11, color: "#2a3f52", marginTop: 6 }}>Supports TikTok, YouTube, Instagram, Facebook, LinkedIn, X video links.</div>
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(255,23,68,0.08)", border: "1px solid #ff1744", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#ff6b6b", fontSize: 12 }}>
            ⚠ {error}
          </div>
        )}

        <button onClick={handleAudit} disabled={loading} style={{ width: "100%", padding: "14px", background: loading ? "#0c1520" : "linear-gradient(135deg, #0ea5e9, #6366f1)", border: loading ? "1px solid #1a2d3f" : "none", borderRadius: 8, color: loading ? "#4a6072" : "#fff", fontSize: 13, fontFamily: "inherit", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? `⟳ ${step}` : "⚡ Run Brand Audit"}
        </button>

        {result && (
          <div style={{ marginTop: 40 }}>
            <div style={{ fontSize: 11, color: "#4a6072", letterSpacing: "0.15em", marginBottom: 20, borderBottom: "1px solid #1a2d3f", paddingBottom: 12 }}>
              AUDIT RESULTS — {(result.platform || platform).toUpperCase()}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "#0c1520", border: "1px solid #1a2d3f", borderRadius: 10, padding: "18px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#4a6072", letterSpacing: "0.1em", marginBottom: 8 }}>BRAND SCORE</div>
                <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: getScoreColor(result.score) }}>{result.score}</div>
                <div style={{ fontSize: 10, color: "#2a3f52", marginTop: 4 }}>/ 100</div>
              </div>
              <div style={{ background: ds.bg, border: `1px solid ${ds.border}`, borderRadius: 10, padding: "18px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#4a6072", letterSpacing: "0.1em", marginBottom: 8 }}>DECISION</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: ds.text, letterSpacing: "0.08em" }}>{ds.label}</div>
              </div>
              <div style={{ background: "#0c1520", border: "1px solid #1a2d3f", borderRadius: 10, padding: "18px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#4a6072", letterSpacing: "0.1em", marginBottom: 8 }}>HOOK</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: result.hook_strength === "Strong" ? "#00e676" : result.hook_strength === "Moderate" ? "#ffd600" : "#ff1744" }}>{result.hook_strength || "—"}</div>
              </div>
              <div style={{ background: "#0c1520", border: "1px solid #1a2d3f", borderRadius: 10, padding: "18px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#4a6072", letterSpacing: "0.1em", marginBottom: 8 }}>CRM MENTION</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: result.crm_mention === "Yes" ? "#00e676" : result.crm_mention === "Partially" ? "#ffd600" : "#ff1744" }}>{result.crm_mention || "—"}</div>
                <div style={{ fontSize: 10, marginTop: 4, color: result.cta_present ? "#00e676" : "#ff1744" }}>CTA: {result.cta_present ? "✓ Present" : "✕ Missing"}</div>
              </div>
            </div>
            <div style={{ background: "#0c1520", border: "1px solid #1a2d3f", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#4a6072", letterSpacing: "0.1em", marginBottom: 6 }}>VERDICT</div>
              <div style={{ fontSize: 14, color: "#b0c4d4", lineHeight: 1.6 }}>{result.verdict}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {result.issues?.length > 0 && (
                <div style={{ background: "rgba(255,23,68,0.04)", border: "1px solid #2a1a1a", borderRadius: 10, padding: "16px 20px" }}>
                  <div style={{ fontSize: 10, color: "#ff6b6b", letterSpacing: "0.1em", marginBottom: 10 }}>⚠ ISSUES FOUND</div>
                  {result.issues.map((issue: string, i: number) => (
                    <div key={i} style={{ fontSize: 12, color: "#b0c4d4", lineHeight: 1.6, paddingLeft: 12, borderLeft: "2px solid #ff1744", marginBottom: 8 }}>{issue}</div>
                  ))}
                </div>
              )}
              {result.suggestions?.length > 0 && (
                <div style={{ background: "rgba(0,230,118,0.03)", border: "1px solid #1a2d20", borderRadius: 10, padding: "16px 20px" }}>
                  <div style={{ fontSize: 10, color: "#00e676", letterSpacing: "0.1em", marginBottom: 10 }}>✦ SUGGESTIONS</div>
                  {result.suggestions.map((s: string, i: number) => (
                    <div key={i} style={{ fontSize: 12, color: "#b0c4d4", lineHeight: 1.6, paddingLeft: 12, borderLeft: "2px solid #00e676", marginBottom: 8 }}>{s}</div>
                  ))}
                </div>
              )}
            </div>
            {result.revised_angle && (
              <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid #1e2040", borderRadius: 10, padding: "18px 20px" }}>
                <div style={{ fontSize: 10, color: "#6366f1", letterSpacing: "0.1em", marginBottom: 10 }}>✎ SUGGESTED REVISION ANGLE</div>
                <div style={{ fontSize: 13, color: "#b0c4d4", lineHeight: 1.7, fontStyle: "italic" }}>{result.revised_angle}</div>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 48, paddingTop: 20, borderTop: "1px solid #0f1a24", fontSize: 10, color: "#1e3040", letterSpacing: "0.1em", textAlign: "center" }}>
          WIBIZ AI AUTOMATION • SINGAPORE • POWERED BY GROQ LLAMA 3.1
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: #2a3f52; }
        button:hover:not(:disabled) { opacity: 0.9; }
        input:focus, textarea:focus { border-color: #0ea5e9 !important; }
      `}</style>
    </div>
  );
}