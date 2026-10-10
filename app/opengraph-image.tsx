import { ImageResponse } from "next/og";

export const alt =
  "Handshake — device-level trust for phone calls. The voice can be cloned. The person can still prove who they are.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Static brand OG image: the pairing mark on graphite with the tagline. */
export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#0a0c0f",
        padding: "72px 80px",
        position: "relative",
      }}
    >
      {/* hairline grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "0 80px",
          opacity: 0.5,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
        ))}
      </div>
      {/* soft halo */}
      <div
        style={{
          position: "absolute",
          right: -160,
          top: -180,
          width: 560,
          height: 560,
          borderRadius: 9999,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.22) 0%, rgba(56,189,248,0.05) 45%, transparent 70%)",
        }}
      />

      {/* brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          width: "100%",
          justifyContent: "flex-start",
        }}
      >
        {/* mark: two devices joined */}
        <div style={{ display: "flex", width: 40, height: 40, position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 6,
              width: 14,
              height: 28,
              borderRadius: 8,
              border: "2.5px solid #38bdf8",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 6,
              width: 14,
              height: 28,
              borderRadius: 8,
              border: "2.5px solid #38bdf8",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 13,
              height: 13,
              borderRadius: 9999,
              transform: "translate(-50%, -50%)",
              backgroundColor: "#38bdf8",
            }}
          />
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", color: "#fafafa" }}>
          Handshake
        </div>
      </div>

      {/* headline */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: 900,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <div style={{ width: 40, height: 2, backgroundColor: "#38bdf8" }} />
          <div
            style={{
              fontSize: 18,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#7dd3fc",
            }}
          >
            Device-level trust for phone calls
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.06,
            letterSpacing: "-0.03em",
            color: "#fafafa",
          }}
        >
          The voice can be cloned.
          <br />
          The person can still prove
          <br />
          who they are.
        </div>
      </div>

      {/* footer states */}
      <div
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 28,
            fontSize: 17,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#34d399" }}>
            <div style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: "#34d399" }} />
            Trusted connection
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#fbbf24" }}>
            <div style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: "#fbbf24" }} />
            Verify
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#f87171" }}>
            <div style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: "#f87171" }} />
            Risk detected
          </div>
        </div>
        <div style={{ fontSize: 17, color: "#71717a" }}>handshake · hackathon prototype</div>
      </div>
    </div>,
    { ...size },
  );
}
