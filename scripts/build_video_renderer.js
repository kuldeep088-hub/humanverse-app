
const puppeteer = require("puppeteer");
const ffmpegPath = require("ffmpeg-static");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const images = JSON.parse(fs.readFileSync(path.join(__dirname, "images_data.json"), "utf8"));

const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      background-color: #060913;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #ffffff;
      position: relative;
      user-select: none;
    }

    /* Ambient Background */
    #bg-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 1920px;
      height: 1080px;
      z-index: 1;
    }

    #light-orb-1, #light-orb-2, #light-orb-3 {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      pointer-events: none;
      z-index: 2;
      opacity: 0.55;
    }
    #light-orb-1 { width: 700px; height: 700px; background: radial-gradient(circle, #6366f1 0%, rgba(99,102,241,0) 70%); }
    #light-orb-2 { width: 800px; height: 800px; background: radial-gradient(circle, #ec4899 0%, rgba(236,72,153,0) 70%); }
    #light-orb-3 { width: 600px; height: 600px; background: radial-gradient(circle, #3b82f6 0%, rgba(59,130,246,0) 70%); }

    /* Grid overlay */
    .grid-overlay {
      position: absolute;
      top: 0; left: 0; width: 1920px; height: 1080px;
      background-size: 60px 60px;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      z-index: 3;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, #000 60%, transparent 100%);
    }

    /* Top Bar */
    .top-bar {
      position: absolute;
      top: 30px;
      left: 60px;
      right: 60px;
      height: 50px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 100;
    }
    .brand-pill {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 20px;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 9999px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .brand-logo { width: 28px; height: 28px; border-radius: 6px; object-fit: contain; }
    .brand-name { font-size: 18px; font-weight: 700; letter-spacing: -0.5px; background: linear-gradient(135deg, #fff, #a5b4fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    
    .badge-live {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.35);
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      color: #c7d2fe;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #6366f1; box-shadow: 0 0 10px #6366f1; }

    /* Top Timeline progress bar */
    .timeline-progress-track {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 4px;
      background: rgba(255,255,255,0.06);
      z-index: 101;
    }
    .timeline-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #ec4899, #06b6d4);
      width: 0%;
      box-shadow: 0 0 12px #6366f1;
    }

    /* Stage Layer */
    .stage {
      position: absolute;
      top: 0; left: 0; width: 1920px; height: 1080px;
      perspective: 1400px;
      transform-style: preserve-3d;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Device Mockup */
    .mockup-window {
      position: absolute;
      width: 1200px;
      height: 750px;
      background: #0f1422;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 35px 90px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255,255,255,0.05);
      overflow: hidden;
      transform-style: preserve-3d;
      will-change: transform, opacity;
    }
    .mockup-header {
      height: 44px;
      background: #151a2d;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      padding: 0 18px;
      gap: 16px;
    }
    .traffic-lights { display: flex; gap: 7px; }
    .traffic-dot { width: 11px; height: 11px; border-radius: 50%; }
    .dot-red { background: #ff5f56; }
    .dot-yellow { background: #ffbd2e; }
    .dot-green { background: #27c93f; }

    .mockup-address-bar {
      flex: 1;
      max-width: 440px;
      margin: 0 auto;
      height: 26px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #94a3b8;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .mockup-address-bar span { color: #f8fafc; font-weight: 500; }

    .mockup-body {
      width: 100%;
      height: 706px;
      position: relative;
      background: #090d18;
      overflow: hidden;
    }
    .mockup-img {
      position: absolute;
      top: 0; left: 0; width: 100%; height: auto;
      display: block;
      opacity: 0;
      transform-origin: top center;
    }

    /* Float Cards & Callouts */
    .callout-card {
      position: absolute;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 16px;
      padding: 20px 26px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px rgba(99, 102, 241, 0.2);
      z-index: 50;
      opacity: 0;
      transform: translateY(30px) scale(0.9);
      max-width: 440px;
    }
    .callout-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .tag-purple { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.3); }
    .tag-rose { background: rgba(244, 63, 94, 0.2); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.3); }
    .tag-emerald { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.3); }
    .tag-amber { background: rgba(245, 158, 11, 0.2); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.3); }
    .tag-cyan { background: rgba(6, 182, 212, 0.2); color: #a5f3fc; border: 1px solid rgba(6, 182, 212, 0.3); }

    .callout-title { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 6px; line-height: 1.25; }
    .callout-desc { font-size: 14px; color: #cbd5e1; line-height: 1.5; }

    /* Scene Overlay Cards */
    .scene-intro-card {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      max-width: 1050px;
      z-index: 60;
      opacity: 0;
    }
    .intro-badge {
      padding: 8px 22px;
      background: rgba(236, 72, 153, 0.15);
      border: 1px solid rgba(236, 72, 153, 0.4);
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #f472b6;
      text-transform: uppercase;
      margin-bottom: 24px;
      box-shadow: 0 0 20px rgba(236, 72, 153, 0.3);
    }
    .intro-hero-title {
      font-size: 64px;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -2px;
      margin-bottom: 20px;
      background: linear-gradient(135deg, #ffffff 30%, #a5b4fc 70%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 10px 40px rgba(99, 102, 241, 0.3);
    }
    .intro-hero-sub {
      font-size: 23px;
      color: #94a3b8;
      max-width: 820px;
      line-height: 1.55;
      font-weight: 400;
    }

    /* Floating Reaction Chips */
    .reaction-float-chip {
      position: absolute;
      padding: 10px 20px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.18);
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
      z-index: 70;
      opacity: 0;
    }

    /* Spotlight Glow Box */
    .spotlight-box {
      position: absolute;
      border: 2px solid #6366f1;
      border-radius: 12px;
      box-shadow: 0 0 35px rgba(99, 102, 241, 0.6), inset 0 0 20px rgba(99, 102, 241, 0.2);
      pointer-events: none;
      z-index: 55;
      opacity: 0;
    }

    /* Bottom Subtitle / Narration Bar */
    .narration-bar {
      position: absolute;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      padding: 14px 34px;
      background: rgba(10, 15, 30, 0.88);
      backdrop-filter: blur(25px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 9999px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
      z-index: 90;
      max-width: 1200px;
    }
    .narration-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
      box-shadow: 0 0 15px #6366f1;
    }
    .narration-text {
      font-size: 18px;
      font-weight: 500;
      color: #f1f5f9;
      letter-spacing: -0.2px;
    }
    .narration-text strong {
      color: #a5b4fc;
      font-weight: 700;
    }
  </style>
</head>
<body>

  <!-- Ambient Light Orbs -->
  <div id="light-orb-1"></div>
  <div id="light-orb-2"></div>
  <div id="light-orb-3"></div>
  <div class="grid-overlay"></div>
  <canvas id="bg-canvas" width="1920" height="1080"></canvas>

  <!-- Progress Bar -->
  <div class="timeline-progress-track">
    <div id="progress-bar" class="timeline-progress-bar"></div>
  </div>

  <!-- Top Header -->
  <div class="top-bar">
    <div class="brand-pill">
      <img src="${images.logo}" class="brand-logo" alt="Logo" />
      <span class="brand-name">HUMANVERSE</span>
    </div>
    <div class="badge-live">
      <div class="live-dot"></div>
      <span>Interactive Tour</span>
    </div>
  </div>

  <!-- Stage -->
  <div class="stage">
    <!-- Mockup 1 (Primary Showcase) -->
    <div id="mockup-1" class="mockup-window">
      <div class="mockup-header">
        <div class="traffic-lights">
          <div class="traffic-dot dot-red"></div>
          <div class="traffic-dot dot-yellow"></div>
          <div class="traffic-dot dot-green"></div>
        </div>
        <div class="mockup-address-bar">
          🔒 <span id="address-url" style="margin-left: 6px;">https://humanverse.fun/app/feed</span>
        </div>
      </div>
      <div class="mockup-body">
        <img id="img-login" class="mockup-img" src="${images.login}" />
        <img id="img-feed-all" class="mockup-img" src="${images.feedAll}" />
        <img id="img-feed-help" class="mockup-img" src="${images.feedHelp}" />
        <img id="img-composer" class="mockup-img" src="${images.composer}" />
        <img id="img-threads" class="mockup-img" src="${images.threadsHub}" />
        <img id="img-thread-detail" class="mockup-img" src="${images.threadDetail}" />
        <img id="img-circles" class="mockup-img" src="${images.circles}" />
        <img id="img-journal" class="mockup-img" src="${images.journal}" />
        <img id="img-messages" class="mockup-img" src="${images.messages}" />
        <img id="img-profile" class="mockup-img" src="${images.profile}" />
      </div>
    </div>

    <!-- Secondary Split Mockup for scene comparisons -->
    <div id="mockup-2" class="mockup-window" style="width: 780px; height: 620px; display: none;">
      <div class="mockup-header">
        <div class="traffic-lights">
          <div class="traffic-dot dot-red"></div>
          <div class="traffic-dot dot-yellow"></div>
          <div class="traffic-dot dot-green"></div>
        </div>
        <div class="mockup-address-bar">🔒 <span id="address-url-2">https://humanverse.fun/app/journal</span></div>
      </div>
      <div class="mockup-body">
        <img id="img-split-2" class="mockup-img" src="${images.journal}" style="opacity: 1;" />
      </div>
    </div>

    <!-- Intro Center Hero Overlay -->
    <div id="scene-intro" class="scene-intro-card">
      <div class="intro-badge">The Unfiltered Professional Network</div>
      <h1 class="intro-hero-title">Work is human.<br>Your network should be too.</h1>
      <p class="intro-hero-sub">
        Beyond corporate highlight reels and forced positivity. A safe, authentic space to share the unpolished reality of working life — with full pseudonym protection and peer mentorship.
      </p>
      <div style="display: flex; gap: 16px; margin-top: 36px;">
        <div style="padding: 14px 30px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 9999px; font-weight: 700; font-size: 18px; box-shadow: 0 10px 30px rgba(99,102,241,0.5);">
          Explore Humanverse
        </div>
      </div>
    </div>

    <!-- Outro Center Hero Overlay -->
    <div id="scene-outro" class="scene-intro-card">
      <div class="intro-badge" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.4); color: #6ee7b7; box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);">
        Ready For Honest Career Conversations?
      </div>
      <h1 class="intro-hero-title">Join The Humanverse</h1>
      <p class="intro-hero-sub">
        Connect with empathetic peers, get genuine advice, navigate career pivots, and celebrate every milestone in a safe, community-driven space.
      </p>
      <div style="display: flex; gap: 20px; margin-top: 36px;">
        <div style="padding: 16px 36px; background: linear-gradient(135deg, #6366f1, #ec4899); border-radius: 9999px; font-weight: 700; font-size: 20px; box-shadow: 0 12px 35px rgba(99,102,241,0.6);">
          Sign Up Free at humanverse.fun
        </div>
      </div>
    </div>

    <!-- Callout 1 (Left / Top) -->
    <div id="callout-1" class="callout-card" style="top: 130px; left: 80px;">
      <div id="callout-1-tag" class="callout-tag tag-purple">Feature Spotlight</div>
      <h3 id="callout-1-title" class="callout-title">Safe Pseudonymous Posting</h3>
      <p id="callout-1-desc" class="callout-desc">Speak freely about layoffs, burnouts, and salary negotiation without career risk or employer retaliation.</p>
    </div>

    <!-- Callout 2 (Right / Bottom) -->
    <div id="callout-2" class="callout-card" style="bottom: 120px; right: 80px;">
      <div id="callout-2-tag" class="callout-tag tag-emerald">Empathy Driven</div>
      <h3 id="callout-2-title" class="callout-title">Supportive Reactions</h3>
      <p id="callout-2-desc" class="callout-desc">Reactions built for real career moments: Been there, Respect, Needed this, and Oof.</p>
    </div>

    <!-- Floating Reaction Chips -->
    <div id="chip-1" class="reaction-float-chip" style="top: 240px; right: 120px;">
      <span>🤝</span> <span>Been there (42)</span>
    </div>
    <div id="chip-2" class="reaction-float-chip" style="top: 330px; right: 80px;">
      <span>🎖️</span> <span>Respect (28)</span>
    </div>
    <div id="chip-3" class="reaction-float-chip" style="top: 420px; right: 130px;">
      <span>❤️</span> <span>Needed this (65)</span>
    </div>
    <div id="chip-4" class="reaction-float-chip" style="top: 510px; right: 90px;">
      <span>⚠️</span> <span>Oof (19)</span>
    </div>

    <!-- Spotlight Element -->
    <div id="spotlight" class="spotlight-box"></div>
  </div>

  <!-- Bottom Narration Bar -->
  <div id="narration" class="narration-bar">
    <div class="narration-icon">✨</div>
    <div id="narration-text" class="narration-text">
      Welcome to <strong>Humanverse</strong> — The honest professional network for real career life.
    </div>
  </div>

  <script>
    // Particle Background System
    const canvas = document.getElementById("bg-canvas");
    const ctx = canvas.getContext("2d");
    const particles = [];
    for (let i = 0; i < 70; i++) {
      particles.push({
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    function drawParticles(t) {
      ctx.clearRect(0, 0, 1920, 1080);
      ctx.fillStyle = "#fff";
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const px = (p.x + p.vx * t * 30) % 1920;
        const py = (p.y + p.vy * t * 30) % 1080;
        const curX = px < 0 ? px + 1920 : px;
        const curY = py < 0 ? py + 1080 : py;

        ctx.beginPath();
        ctx.arc(curX, curY, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(165, 180, 252, " + p.alpha + ")";
        ctx.fill();

        // Connect nearby
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const p2x = (p2.x + p2.vx * t * 30) % 1920;
          const p2y = (p2.y + p2.vy * t * 30) % 1080;
          const c2x = p2x < 0 ? p2x + 1920 : p2x;
          const c2y = p2y < 0 ? p2y + 1080 : p2y;
          const dist = Math.hypot(curX - c2x, curY - c2y);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(curX, curY);
            ctx.lineTo(c2x, c2y);
            ctx.strokeStyle = "rgba(99, 102, 241, " + (0.15 * (1 - dist / 130)) + ")";
            ctx.stroke();
          }
        }
      }
    }

    // Helper math easing functions
    function easeInOutCubic(x) {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }
    function easeOutCubic(x) {
      return 1 - Math.pow(1 - x, 3);
    }
    function easeOutBack(x) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
    function clamp(val, min, max) {
      return Math.min(Math.max(val, min), max);
    }

    // Elements
    const progressBar = document.getElementById("progress-bar");
    const lightOrb1 = document.getElementById("light-orb-1");
    const lightOrb2 = document.getElementById("light-orb-2");
    const mockup1 = document.getElementById("mockup-1");
    const mockup2 = document.getElementById("mockup-2");
    const addressUrl = document.getElementById("address-url");
    const sceneIntro = document.getElementById("scene-intro");
    const sceneOutro = document.getElementById("scene-outro");
    const callout1 = document.getElementById("callout-1");
    const callout2 = document.getElementById("callout-2");
    const chip1 = document.getElementById("chip-1");
    const chip2 = document.getElementById("chip-2");
    const chip3 = document.getElementById("chip-3");
    const chip4 = document.getElementById("chip-4");
    const narrationText = document.getElementById("narration-text");
    const spotlight = document.getElementById("spotlight");

    const imagesElements = {
      login: document.getElementById("img-login"),
      feedAll: document.getElementById("img-feed-all"),
      feedHelp: document.getElementById("img-feed-help"),
      composer: document.getElementById("img-composer"),
      threads: document.getElementById("img-threads"),
      threadDetail: document.getElementById("img-thread-detail"),
      circles: document.getElementById("img-circles"),
      journal: document.getElementById("img-journal"),
      messages: document.getElementById("img-messages"),
      profile: document.getElementById("img-profile")
    };

    function hideAllImages() {
      for (const k in imagesElements) {
        imagesElements[k].style.opacity = 0;
      }
    }

    // Frame Renderer
    window.renderFrame = function(t) {
      drawParticles(t);
      progressBar.style.width = (t / 60 * 100) + "%";

      // Move light orbs
      lightOrb1.style.left = (300 + 150 * Math.sin(t * 0.4)) + "px";
      lightOrb1.style.top = (100 + 100 * Math.cos(t * 0.5)) + "px";
      lightOrb2.style.right = (200 + 180 * Math.cos(t * 0.35)) + "px";
      lightOrb2.style.bottom = (100 + 120 * Math.sin(t * 0.45)) + "px";

      // Reset states
      hideAllImages();
      mockup2.style.display = "none";
      spotlight.style.opacity = 0;
      chip1.style.opacity = 0;
      chip2.style.opacity = 0;
      chip3.style.opacity = 0;
      chip4.style.opacity = 0;
      callout1.style.opacity = 0;
      callout2.style.opacity = 0;
      sceneIntro.style.opacity = 0;
      sceneOutro.style.opacity = 0;

      // ==========================================
      // SCENE 1: (0.0s - 7.5s) INTRO & HOOK
      // ==========================================
      if (t < 7.5) {
        const p = t / 7.5;
        sceneIntro.style.opacity = clamp(p < 0.15 ? p / 0.15 : (p > 0.85 ? (1 - p) / 0.15 : 1), 0, 1);
        sceneIntro.style.transform = "scale(" + (0.92 + 0.08 * easeOutCubic(p)) + ")";

        mockup1.style.opacity = clamp((p - 0.2) * 1.5, 0, 0.4);
        mockup1.style.transform = "translate3d(0, " + (200 - 80 * easeOutCubic(p)) + "px, -400px) rotateX(25deg) scale(0.85)";
        imagesElements.feedAll.style.opacity = 1;

        narrationText.innerHTML = "Welcome to <strong>Humanverse</strong> — The honest professional network for real career life.";
        return;
      }

      // ==========================================
      // SCENE 2: (7.5s - 16.0s) CORE FEED & REACTIONS
      // ==========================================
      if (t < 16.0) {
        const p = (t - 7.5) / 8.5;
        const entry = clamp(p / 0.15, 0, 1);
        const exit = clamp((1 - p) / 0.15, 0, 1);
        const opacity = Math.min(entry, exit);

        imagesElements.feedAll.style.opacity = 1;
        addressUrl.innerText = "https://humanverse.fun/app/feed";

        // 3D camera pan & smooth tilt
        const rotY = 12 - 16 * easeInOutCubic(p);
        const rotX = 14 - 6 * easeInOutCubic(p);
        const transY = -40 + 30 * Math.sin(p * Math.PI);
        const scale = 0.95 + 0.08 * p;
        mockup1.style.opacity = opacity;
        mockup1.style.transform = "translate3d(-100px, " + transY + "px, 50px) rotateX(" + rotX + "deg) rotateY(" + rotY + "deg) scale(" + scale + ")";

        // Callout 1
        if (p > 0.18) {
          const cp = clamp((p - 0.18) / 0.15, 0, 1);
          callout1.style.opacity = cp * opacity;
          callout1.style.top = "160px";
          callout1.style.left = "80px";
          callout1.style.transform = "translateY(" + (20 * (1 - easeOutBack(cp))) + "px) scale(" + (0.9 + 0.1 * easeOutBack(cp)) + ")";
          document.getElementById("callout-1-tag").className = "callout-tag tag-purple";
          document.getElementById("callout-1-tag").innerText = "Authentic Discussions";
          document.getElementById("callout-1-title").innerText = "Real Career Reality";
          document.getElementById("callout-1-desc").innerText = "Share raw stories about layoffs, burnout, compensation, and pivots without corporate fluff.";
        }

        // Floating Reaction Chips popping in
        if (p > 0.35) {
          const cp = clamp((p - 0.35) / 0.12, 0, 1);
          chip1.style.opacity = cp * opacity;
          chip1.style.transform = "scale(" + easeOutBack(cp) + ") translateX(" + (10 * Math.sin(t * 2)) + "px)";
        }
        if (p > 0.45) {
          const cp = clamp((p - 0.45) / 0.12, 0, 1);
          chip2.style.opacity = cp * opacity;
          chip2.style.transform = "scale(" + easeOutBack(cp) + ") translateX(" + (8 * Math.cos(t * 2)) + "px)";
        }
        if (p > 0.55) {
          const cp = clamp((p - 0.55) / 0.12, 0, 1);
          chip3.style.opacity = cp * opacity;
          chip3.style.transform = "scale(" + easeOutBack(cp) + ") translateX(" + (12 * Math.sin(t * 2.5)) + "px)";
        }
        if (p > 0.65) {
          const cp = clamp((p - 0.65) / 0.12, 0, 1);
          chip4.style.opacity = cp * opacity;
          chip4.style.transform = "scale(" + easeOutBack(cp) + ") translateX(" + (10 * Math.cos(t * 2.5)) + "px)";
        }

        narrationText.innerHTML = "A live feed designed for <strong>vulnerability and honest support</strong>, backed by empathetic reactions.";
        return;
      }

      // ==========================================
      // SCENE 3: (16.0s - 25.0s) PSEUDONYM & COMPOSER
      // ==========================================
      if (t < 25.0) {
        const p = (t - 16.0) / 9.0;
        const entry = clamp(p / 0.15, 0, 1);
        const exit = clamp((1 - p) / 0.15, 0, 1);
        const opacity = Math.min(entry, exit);

        imagesElements.composer.style.opacity = 1;
        addressUrl.innerText = "https://humanverse.fun/app/feed (New Post)";

        // Zoom deep into Composer
        const scale = 1.05 + 0.15 * easeInOutCubic(p);
        const transY = -120 + 40 * easeInOutCubic(p);
        mockup1.style.opacity = opacity;
        mockup1.style.transform = "translate3d(120px, " + transY + "px, 150px) rotateX(4deg) rotateY(-8deg) scale(" + scale + ")";

        // Callout 1 (Pseudonym Protection)
        if (p > 0.15) {
          const cp = clamp((p - 0.15) / 0.15, 0, 1);
          callout1.style.opacity = cp * opacity;
          callout1.style.top = "140px";
          callout1.style.left = "70px";
          callout1.style.transform = "translateY(" + (20 * (1 - easeOutBack(cp))) + "px) scale(" + (0.9 + 0.1 * easeOutBack(cp)) + ")";
          document.getElementById("callout-1-tag").className = "callout-tag tag-emerald";
          document.getElementById("callout-1-tag").innerText = "Dual-Identity Engine";
          document.getElementById("callout-1-title").innerText = "Safe Pseudonymous Mode";
          document.getElementById("callout-1-desc").innerText = "Toggle seamlessly between your Real Profile and a protected Pseudonym with one click.";
        }

        // Callout 2 (Zero Career Risk)
        if (p > 0.38) {
          const cp = clamp((p - 0.38) / 0.15, 0, 1);
          callout2.style.opacity = cp * opacity;
          callout2.style.bottom = "130px";
          callout2.style.right = "80px";
          callout2.style.transform = "translateY(" + (20 * (1 - easeOutBack(cp))) + "px) scale(" + (0.9 + 0.1 * easeOutBack(cp)) + ")";
          document.getElementById("callout-2-tag").className = "callout-tag tag-amber";
          document.getElementById("callout-2-tag").innerText = "Total Privacy";
          document.getElementById("callout-2-title").innerText = "Zero Employment Risk";
          document.getElementById("callout-2-desc").innerText = "Ask confidential salary questions or discuss workplace challenges with 100% peace of mind.";
        }

        narrationText.innerHTML = "Post as your <strong>verified identity</strong> or your <strong>protected pseudonym</strong> whenever you need safety.";
        return;
      }

      // ==========================================
      // SCENE 4: (25.0s - 34.0s) CAREER THREADS HUB
      // ==========================================
      if (t < 34.0) {
        const p = (t - 25.0) / 9.0;
        const entry = clamp(p / 0.15, 0, 1);
        const exit = clamp((1 - p) / 0.15, 0, 1);
        const opacity = Math.min(entry, exit);

        // First half shows Threads Hub, second half shows #LaidOff Thread detail
        if (p < 0.5) {
          imagesElements.threads.style.opacity = 1;
          addressUrl.innerText = "https://humanverse.fun/app/threads";
        } else {
          imagesElements.threadDetail.style.opacity = 1;
          addressUrl.innerText = "https://humanverse.fun/app/threads/laidoff";
        }

        const rotY = -12 + 20 * easeInOutCubic(p);
        const rotX = 10 - 5 * easeInOutCubic(p);
        const scale = 0.98 + 0.05 * Math.sin(p * Math.PI);
        mockup1.style.opacity = opacity;
        mockup1.style.transform = "translate3d(-80px, -20px, 60px) rotateX(" + rotX + "deg) rotateY(" + rotY + "deg) scale(" + scale + ")";

        // Callout 1 (Threads Hub)
        if (p > 0.15) {
          const cp = clamp((p - 0.15) / 0.15, 0, 1);
          callout1.style.opacity = cp * opacity;
          callout1.style.top = "150px";
          callout1.style.left = "80px";
          callout1.style.transform = "translateY(" + (20 * (1 - easeOutBack(cp))) + "px) scale(" + (0.9 + 0.1 * easeOutBack(cp)) + ")";
          document.getElementById("callout-1-tag").className = "callout-tag tag-rose";
          document.getElementById("callout-1-tag").innerText = "Topic Hubs";
          document.getElementById("callout-1-title").innerText = "#LaidOff & #CareerPivot";
          document.getElementById("callout-1-desc").innerText = "Find structured support hubs dedicated to job hunts, toxic managers, and salary transparency.";
        }

        // Callout 2
        if (p > 0.45) {
          const cp = clamp((p - 0.45) / 0.15, 0, 1);
          callout2.style.opacity = cp * opacity;
          callout2.style.bottom = "120px";
          callout2.style.right = "90px";
          callout2.style.transform = "translateY(" + (20 * (1 - easeOutBack(cp))) + "px) scale(" + (0.9 + 0.1 * easeOutBack(cp)) + ")";
          document.getElementById("callout-2-tag").className = "callout-tag tag-cyan";
          document.getElementById("callout-2-tag").innerText = "Deep Discussions";
          document.getElementById("callout-2-title").innerText = "Actionable Solidarity";
          document.getElementById("callout-2-desc").innerText = "Get warm introductions, peer resume feedback, and real strategies from people who overcame the same obstacles.";
        }

        narrationText.innerHTML = "Dedicated <strong>Career Threads</strong> bring together professionals navigating similar life changes.";
        return;
      }

      // ==========================================
      // SCENE 5: (34.0s - 43.0s) HELP & MENTORSHIP
      // ==========================================
      if (t < 43.0) {
        const p = (t - 34.0) / 9.0;
        const entry = clamp(p / 0.15, 0, 1);
        const exit = clamp((1 - p) / 0.15, 0, 1);
        const opacity = Math.min(entry, exit);

        imagesElements.feedHelp.style.opacity = 1;
        addressUrl.innerText = "https://humanverse.fun/app/feed?filter=help";

        const rotY = 10 - 15 * easeInOutCubic(p);
        const scale = 1.02 + 0.04 * Math.sin(p * Math.PI);
        mockup1.style.opacity = opacity;
        mockup1.style.transform = "translate3d(0, -30px, 80px) rotateX(8deg) rotateY(" + rotY + "deg) scale(" + scale + ")";

        // Callout 1 (Help Exchange)
        if (p > 0.15) {
          const cp = clamp((p - 0.15) / 0.15, 0, 1);
          callout1.style.opacity = cp * opacity;
          callout1.style.top = "140px";
          callout1.style.left = "70px";
          callout1.style.transform = "translateY(" + (20 * (1 - easeOutBack(cp))) + "px) scale(" + (0.9 + 0.1 * easeOutBack(cp)) + ")";
          document.getElementById("callout-1-tag").className = "callout-tag tag-emerald";
          document.getElementById("callout-1-tag").innerText = "Peer Mentorship";
          document.getElementById("callout-1-title").innerText = "Help & Mentorship Marketplace";
          document.getElementById("callout-1-desc").innerText = "Tag your posts with 📄 Resume Review, 🎯 Mock Interview, 💛 Layoff Support, or 🤝 Offering Help.";
        }

        // Callout 2 (Free & Reciprocal)
        if (p > 0.4) {
          const cp = clamp((p - 0.4) / 0.15, 0, 1);
          callout2.style.opacity = cp * opacity;
          callout2.style.bottom = "120px";
          callout2.style.right = "80px";
          callout2.style.transform = "translateY(" + (20 * (1 - easeOutBack(cp))) + "px) scale(" + (0.9 + 0.1 * easeOutBack(cp)) + ")";
          document.getElementById("callout-2-tag").className = "callout-tag tag-purple";
          document.getElementById("callout-2-tag").innerText = "Zero Cost";
          document.getElementById("callout-2-title").innerText = "Free Mutual Support";
          document.getElementById("callout-2-desc").innerText = "Senior designers, engineers, and leaders helping job seekers without predatory fees.";
        }

        narrationText.innerHTML = "Exchange <strong>mock interviews, resume audits, and layoff advice</strong> with generous mentors.";
        return;
      }

      // ==========================================
      // SCENE 6: (43.0s - 52.0s) CIRCLES & PRIVATE JOURNAL
      // ==========================================
      if (t < 52.0) {
        const p = (t - 43.0) / 9.0;
        const entry = clamp(p / 0.15, 0, 1);
        const exit = clamp((1 - p) / 0.15, 0, 1);
        const opacity = Math.min(entry, exit);

        // Show Circles on Left Mockup
        imagesElements.circles.style.opacity = 1;
        addressUrl.innerText = "https://humanverse.fun/app/circles";

        mockup1.style.opacity = opacity;
        mockup1.style.transform = "translate3d(-260px, -20px, 0px) rotateX(8deg) rotateY(16deg) scale(0.85)";

        // Secondary Split Mockup on Right (Journal)
        mockup2.style.display = "block";
        mockup2.style.opacity = opacity;
        mockup2.style.transform = "translate3d(360px, 10px, 40px) rotateX(8deg) rotateY(-14deg) scale(0.92)";

        // Callout 1 (Circles)
        if (p > 0.15) {
          const cp = clamp((p - 0.15) / 0.15, 0, 1);
          callout1.style.opacity = cp * opacity;
          callout1.style.top = "130px";
          callout1.style.left = "60px";
          callout1.style.transform = "translateY(" + (20 * (1 - easeOutBack(cp))) + "px) scale(" + (0.9 + 0.1 * easeOutBack(cp)) + ")";
          document.getElementById("callout-1-tag").className = "callout-tag tag-cyan";
          document.getElementById("callout-1-tag").innerText = "Micro-Communities";
          document.getElementById("callout-1-title").innerText = "Circles";
          document.getElementById("callout-1-desc").innerText = "Curated groups for Remote Devs, Transitioning Designers, Startup Founders, and more.";
        }

        // Callout 2 (Career Journal)
        if (p > 0.35) {
          const cp = clamp((p - 0.35) / 0.15, 0, 1);
          callout2.style.opacity = cp * opacity;
          callout2.style.bottom = "120px";
          callout2.style.right = "60px";
          callout2.style.transform = "translateY(" + (20 * (1 - easeOutBack(cp))) + "px) scale(" + (0.9 + 0.1 * easeOutBack(cp)) + ")";
          document.getElementById("callout-2-tag").className = "callout-tag tag-amber";
          document.getElementById("callout-2-tag").innerText = "Private Reflection";
          document.getElementById("callout-2-title").innerText = "Career Journal";
          document.getElementById("callout-2-desc").innerText = "An encrypted personal sanctuary to record emotional milestones, daily thoughts, and career breakthroughs.";
        }

        narrationText.innerHTML = "Join intimate <strong>Circles</strong> and keep an encrypted <strong>Career Journal</strong> for personal reflection.";
        return;
      }

      // ==========================================
      // SCENE 7: (52.0s - 60.0s) GRAND FINALE & CTA
      // ==========================================
      const p = (t - 52.0) / 8.0;
      const entry = clamp(p / 0.18, 0, 1);
      const exit = clamp((1 - p) / 0.12, 0, 1);
      const opacity = Math.min(entry, exit);

      sceneOutro.style.opacity = opacity;
      sceneOutro.style.transform = "scale(" + (0.94 + 0.06 * easeOutCubic(p)) + ")";

      // Background Mockup floating back into distance
      mockup1.style.opacity = opacity * 0.35;
      mockup1.style.transform = "translate3d(0, " + (120 - 40 * easeOutCubic(p)) + "px, -350px) rotateX(20deg) scale(0.85)";
      imagesElements.feedAll.style.opacity = 1;

      narrationText.innerHTML = "Ready for the next evolution of professional networking? <strong>Join Humanverse today.</strong>";
    };
  </script>
</body>
</html>
`;

async function renderFullVideo() {
  const OUTPUT_VIDEO = path.join(__dirname, "../video/humanverse_full_product_tour.mp4");
  const AUDIO_PATH = path.join(__dirname, "../video/soundtrack.wav");

  console.log("Launching headless Chrome for 1080p rendering...");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1920,1080",
      "--disable-web-security"
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.setContent(HTML_CONTENT, { waitUntil: "domcontentloaded" });

  const FPS = 30;
  const DURATION_SEC = 60;
  const TOTAL_FRAMES = FPS * DURATION_SEC; // 1800 frames

  console.log(`Starting video encoding: ${TOTAL_FRAMES} frames @ ${FPS}fps (1080p)...`);

  const ffmpegArgs = [
    "-y",
    "-f", "image2pipe",
    "-vcodec", "mjpeg",
    "-r", String(FPS),
    "-i", "-",
    "-i", AUDIO_PATH,
    "-c:v", "libx264",
    "-preset", "faster",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    OUTPUT_VIDEO
  ];

  const ffmpeg = spawn(ffmpegPath, ffmpegArgs);

  ffmpeg.stderr.on("data", (data) => {
    // console.log("ffmpeg:", data.toString().trim());
  });

  const startTime = Date.now();

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const t = frame / FPS;
    await page.evaluate((time) => window.renderFrame(time), t);
    const frameBuffer = await page.screenshot({
      type: "jpeg",
      quality: 88,
      clip: { x: 0, y: 0, width: 1920, height: 1080 }
    });

    if (!ffmpeg.stdin.write(frameBuffer)) {
      await new Promise(resolve => ffmpeg.stdin.once("drain", resolve));
    }

    if (frame % 90 === 0 || frame === TOTAL_FRAMES - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const percent = ((frame / TOTAL_FRAMES) * 100).toFixed(1);
      const fps = (frame / (Date.now() - startTime) * 1000).toFixed(1);
      console.log(`Progress: ${percent}% (Frame ${frame}/${TOTAL_FRAMES}, ${t.toFixed(1)}s) | ${fps} fps | Elapsed: ${elapsed}s`);
    }
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error("FFmpeg exited with code " + code));
    });
  });

  await browser.close();
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`🎉 Video successfully rendered and saved to ${OUTPUT_VIDEO} in ${totalElapsed}s!`);
}

renderFullVideo().catch(err => {
  console.error("Rendering error:", err);
  process.exit(1);
});
