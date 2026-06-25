import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { EcgLine } from "@/components/EcgLine";
import { Activity, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediPredict AI" },
      { name: "description", content: "AI-powered disease prediction and treatment cost estimation." },
    ],
  }),
  component: Index,
});

// Number of frames to pre-extract. More = smoother but slower load.
const FRAME_COUNT = 50;
// Resolution of each extracted frame (background, so low-res is fine)
const FRAME_W = 1280;
const FRAME_H = 720;

function Index() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = FRAME_W;
    canvas.height = FRAME_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frames: ImageBitmap[] = [];
    // Float display index for lerp — stays between scroll events
    let displayIdx = 0;
    let targetIdx = 0;
    let rafId: number;
    let alive = true;

    // Offscreen canvas for resizing frames during extraction
    const offscreen = document.createElement("canvas");
    offscreen.width = FRAME_W;
    offscreen.height = FRAME_H;
    const offCtx = offscreen.getContext("2d")!;

    // Hidden video used only for frame extraction
    const vid = document.createElement("video");
    vid.src = "/bg-video.mp4";
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = "auto";
    vid.crossOrigin = "anonymous";

    const extractFrames = async () => {
      // Wait for metadata so we know duration
      await new Promise<void>((res) => {
        if (vid.readyState >= 1) { res(); return; }
        vid.addEventListener("loadedmetadata", () => res(), { once: true });
        vid.load();
      });

      const duration = vid.duration;

      for (let i = 0; i < FRAME_COUNT; i++) {
        if (!alive) break;
        // Seek to evenly-spaced timestamp
        vid.currentTime = (i / (FRAME_COUNT - 1)) * duration;
        await new Promise<void>((res) =>
          vid.addEventListener("seeked", () => res(), { once: true })
        );
        // Draw at our target resolution and convert to ImageBitmap
        offCtx.drawImage(vid, 0, 0, FRAME_W, FRAME_H);
        const bmp = await createImageBitmap(offscreen);
        frames.push(bmp);

        // Draw the first frame immediately so the background isn't blank
        if (i === 0) {
          ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        }
      }
    };

    // Scroll: map position → target frame index
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (!scrollable || !frames.length) return;
      const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
      targetIdx = progress * (frames.length - 1);
    };

    // RAF loop: lerp displayIdx → targetIdx, then draw the frame
    const loop = () => {
      if (!alive) return;
      rafId = requestAnimationFrame(loop);
      if (!frames.length) return;

      // Smooth lerp (0.14 ≈ ~120 ms ease) — same speed both directions
      displayIdx += (targetIdx - displayIdx) * 0.14;
      const idx = Math.min(Math.max(Math.round(displayIdx), 0), frames.length - 1);
      const bmp = frames[idx];
      if (bmp) ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    };

    extractFrames().then(() => {
      if (alive) loop();
    });

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      frames.forEach((f) => f.close());
      vid.src = "";
    };
  }, []);

  return (
    <div className="relative">
      {/* Scroll-driven background — pre-decoded frames drawn to canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 -z-20 h-full w-full"
        style={{ opacity: 0.15, objectFit: "cover" }}
      />

      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(circle, var(--cyan), transparent 70%)" }}
        />
      </div>

      <section className="max-w-6xl mx-auto px-6 pt-24 pb-32 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-cyan mb-8">
          <Sparkles className="h-3.5 w-3.5" /> Powered by clinical AI models
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
          MediPredict <span className="text-cyan">AI</span>
        </h1>
        <p className="mt-6 text-xl md:text-2xl text-muted-foreground italic">
          Predict. Prepare. Prevent.
        </p>
        <p className="mt-4 max-w-2xl mx-auto text-base text-muted-foreground">
          Get instant disease risk analysis and treatment cost estimates powered by
          clinical AI — built for proactive health decisions.
        </p>

        <Link
          to="/assessment"
          className="mt-10 inline-flex items-center gap-2 px-8 py-4 rounded-full bg-cyan text-[oklch(0.15_0.04_255)] font-semibold glow-cyan hover:scale-105 transition-transform"
        >
          Start Health Assessment <ArrowRight className="h-5 w-5" />
        </Link>

        {/* Animated ECG */}
        <div className="mt-16 max-w-3xl mx-auto">
          <EcgLine className="w-full h-24" />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {[
          { icon: Activity, title: "Risk Analysis", desc: "Multi-factor disease probability scoring across 10+ conditions." },
          { icon: ShieldCheck, title: "Cost Transparency", desc: "Detailed treatment cost breakdown — consultation to hospitalization." },
          { icon: Sparkles, title: "Personalized Actions", desc: "Tailored recommendations based on your symptoms and history." },
        ].map((f) => (
          <div key={f.title} className="glass rounded-2xl p-6 hover:glow-cyan transition-shadow">
            <f.icon className="h-8 w-8 text-cyan mb-4" />
            <h3 className="font-semibold text-lg">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
