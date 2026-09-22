import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, Mic, Image as ImageIcon, MapPin, Layers, CheckCircle, Menu, X } from "lucide-react";
import { HeroVideo } from "../components/HeroVideo";
import { BrandLogo } from "../components/BrandLogo";
import { InteractiveGrid, type GridHandle } from "../components/InteractiveGrid";

export function Home() {
  const [hasTransitioned, setHasTransitioned] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const heroRef = useRef<HTMLElement>(null);
  const gridRef = useRef<GridHandle>(null);
  const animationRef = useRef<number | null>(null);

  const scrollAnimationRef = useRef<number | null>(null);

  // Smooth scroll function
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (id === "") {
      if (prefersReducedMotion) {
        window.scrollTo({ top: 0, behavior: "auto" });
      } else {
        animateScroll(0);
      }
      history.replaceState(null, "", window.location.pathname);
      return;
    }

    const element = document.getElementById(id);
    if (!element) return;

    // Calculate viewport centering
    const navbarHeight = 72;
    const minGap = 32; // Minimum gap below navbar
    const sectionHeight = element.getBoundingClientRect().height;
    const availableHeight = window.innerHeight - navbarHeight;

    let targetY = element.getBoundingClientRect().top + window.scrollY;

    if (sectionHeight < availableHeight - minGap * 2) {
      // Center the section in the available space
      const offset = (availableHeight - sectionHeight) / 2;
      targetY -= (navbarHeight + offset);
    } else {
      // Taller than available space: align near top
      targetY -= (navbarHeight + minGap);
    }

    if (prefersReducedMotion) {
      window.scrollTo({ top: targetY, behavior: "auto" });
    } else {
      animateScroll(targetY);
    }

    history.replaceState(null, "", `#${id}`);
  };

  const animateScroll = (targetY: number) => {
    if (scrollAnimationRef.current) cancelAnimationFrame(scrollAnimationRef.current);

    const startY = window.scrollY;
    const distance = targetY - startY;
    const duration = 650;
    let startTime: number | null = null;

    // Easing function (easeOutQuart)
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

    const step = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      window.scrollTo(0, startY + distance * easeOut(progress));

      if (progress < 1) {
        scrollAnimationRef.current = requestAnimationFrame(step);
      } else {
        scrollAnimationRef.current = null;
      }
    };

    scrollAnimationRef.current = requestAnimationFrame(step);
  };

  const cancelScroll = () => {
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Cancel custom scroll on user interaction
    window.addEventListener("wheel", cancelScroll, { passive: true });
    window.addEventListener("touchstart", cancelScroll, { passive: true });
    window.addEventListener("keydown", cancelScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", cancelScroll);
      window.removeEventListener("touchstart", cancelScroll);
      window.removeEventListener("keydown", cancelScroll);
    };
  }, []);

  useEffect(() => {
    // Setup IntersectionObserver for scroll spy
    const spyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0px -60% 0px" } // trigger when near top of viewport
    );

    const sections = document.querySelectorAll("section[id]");
    sections.forEach((section) => spyObserver.observe(section));

    // Setup IntersectionObserver for reveal animations
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );

    const revealElements = document.querySelectorAll(".reveal-on-scroll");
    revealElements.forEach((el) => revealObserver.observe(el));

    return () => {
      spyObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);
  return (
    <div className="min-h-screen bg-offwhite selection:bg-teal-500 selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <header
        className="fixed top-0 z-50 w-full py-4 transition-all duration-300"
        style={{
          background: "rgba(5, 15, 29, 0.88)",
          backdropFilter: "blur(18px) saturate(125%)",
          WebkitBackdropFilter: "blur(18px) saturate(125%)",
          borderBottom: hasTransitioned ? "1px solid rgba(103, 215, 192, 0.3)" : "1px solid rgba(103, 215, 192, 0.12)",
          boxShadow: "0 8px 30px rgba(2, 10, 22, 0.18)"
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <a href="#" onClick={(e) => scrollToSection(e, "")} className="outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-sm">
            <BrandLogo variant="dark" />
          </a>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
              <a
                href="#how-it-works"
                onClick={(e) => scrollToSection(e, "how-it-works")}
                className={`relative transition-colors hover:text-white pb-1 ${activeSection === "how-it-works" ? "text-white" : ""}`}
              >
                How it works
                {activeSection === "how-it-works" && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-teal-400 rounded-full animate-fade-up"></span>
                )}
              </a>
              <a
                href="#accountability"
                onClick={(e) => scrollToSection(e, "accountability")}
                className={`relative transition-colors hover:text-white pb-1 ${activeSection === "accountability" ? "text-white" : ""}`}
              >
                Accountability
                {activeSection === "accountability" && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-teal-400 rounded-full animate-fade-up"></span>
                )}
              </a>
            </nav>
            <div className="hidden md:flex items-center gap-4">
              <Link
                to="/dashboard"
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  isScrolled || isMobileMenuOpen ? "text-slate-300 hover:text-white" : "text-white/80 hover:text-white"
                }`}
              >
                <LayoutDashboard size={16} aria-hidden="true" />
                <span>Staff dashboard</span>
              </Link>
              <Link
                to="/report"
                className="flex items-center justify-center rounded-full btn-signal text-navy-950 px-5 py-2 text-sm"
              >
                Report an issue
              </Link>
            </div>
            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="icon-btn relative h-11 w-11 -mr-2 text-slate-300 hover:bg-white/5 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
              >
                <Menu
                  size={28}
                  aria-hidden="true"
                  className={`absolute inset-0 m-auto transition-all duration-300 ${isMobileMenuOpen ? "rotate-90 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
                />
                <X
                  size={28}
                  aria-hidden="true"
                  className={`absolute inset-0 m-auto transition-all duration-300 ${isMobileMenuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-75 opacity-0"}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="animate-fade-up md:hidden glass-nav border-t border-teal-500/10 absolute top-full left-0 w-full px-6 py-4 flex flex-col gap-4 shadow-2xl">
            <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="text-white font-medium py-2 transition-colors hover:text-teal-400">How it works</a>
            <a href="#accountability" onClick={() => setIsMobileMenuOpen(false)} className="text-white font-medium py-2 transition-colors hover:text-teal-400">Accountability</a>
            <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-white font-medium py-2 flex items-center gap-2 transition-colors hover:text-teal-400">
              <LayoutDashboard size={18} /> Staff dashboard
            </Link>
            <Link to="/report" onClick={() => setIsMobileMenuOpen(false)} className="btn-signal text-navy-950 font-bold py-3 text-center rounded-lg mt-2 active:scale-[0.98]">
              Report an issue
            </Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section
        ref={heroRef}
        id="hero"
        className="relative min-h-[100svh] w-full bg-navy-950 flex items-center pt-[72px]"
        onPointerMove={(e) => {
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
          animationRef.current = requestAnimationFrame(() => {
            if (heroRef.current && gridRef.current) {
              const rect = heroRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              gridRef.current.updatePointer(x, y);
            }
          });
        }}
        onPointerLeave={() => {
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
          gridRef.current?.hideHighlight();
        }}
      >
        <HeroVideo
          onTransitionStateChange={(isDone) => {
            setHasTransitioned(isDone);
            if (isDone) setIsTransitioning(true);
          }}
          onTransitionStart={() => setIsTransitioning(true)}
        />

        <InteractiveGrid ref={gridRef} show={hasTransitioned || isTransitioning} isTransitioning={isTransitioning} />

        {/* Foreground Content */}
        <div className="relative z-10 w-full mx-auto max-w-[1180px] px-6 py-8 md:py-12 h-full min-h-[calc(100svh-72px)] flex items-center group/hero">

          <div
            className={`
              glass-panel-dark backdrop-blur-xl border relative overflow-hidden flex flex-col
              transition-all ease-[cubic-bezier(0.22,1,0.36,1)] duration-[1000ms] motion-reduce:transition-none
              ${isTransitioning || hasTransitioned
                ? "w-full max-w-[min(1040px,calc(100vw-96px))] left-[50%] -translate-x-1/2 rounded-[40px] md:rounded-[48px] h-auto border-teal-500/0 shadow-none bg-navy-900/30 group"
                : "w-full max-w-[560px] left-[24px] translate-x-0 rounded-3xl h-auto border-teal-500/10 shadow-2xl bg-navy-900/60"
              }
            `}
          >
             {/* Light sweep element */}
             <div className={`absolute top-0 bottom-0 w-[200%] bg-[linear-gradient(90deg,transparent_0%,rgba(25,185,154,0.03)_50%,transparent_100%)] -skew-x-12
               transition-all duration-[1500ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:hidden
               ${isTransitioning || hasTransitioned ? "left-[100%] opacity-100" : "-left-[100%] opacity-0"}`} />

             {/* Inner content wrapper sliding smoothly */}
             <div className={`
               relative flex flex-col pt-8 md:pt-10 pb-8 md:pb-10
               transition-all duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none
               ${isTransitioning || hasTransitioned
                 ? "w-full max-w-[800px] mx-auto items-center text-center px-6 md:px-12"
                 : "w-full max-w-[560px] items-start text-left px-8 md:px-10"
               }
             `}>
               <div className={`transition-all duration-[1000ms] delay-[40ms] motion-reduce:transition-none motion-reduce:delay-0 mb-4 md:mb-5 shrink-0 ${(isTransitioning || hasTransitioned) ? "opacity-100 translate-y-0" : "translate-y-0"}`}>
                 <p className="text-teal-400 font-bold tracking-widest text-xs sm:text-sm uppercase drop-shadow-sm">CIVIC REPORTING, REIMAGINED</p>
               </div>

               <div className={`transition-all duration-[1000ms] delay-[80ms] motion-reduce:transition-none motion-reduce:delay-0 mb-6 md:mb-8 shrink-0 ${(isTransitioning || hasTransitioned) ? "opacity-100 scale-100" : "scale-100"}`}>
                 <BrandLogo variant="dark" size="hero" className={`drop-shadow-2xl transition-all duration-[1000ms] motion-reduce:transition-none ${(isTransitioning || hasTransitioned) ? "mx-auto scale-[0.80] origin-center" : "mr-auto scale-90 origin-left"}`} />
               </div>

               <div className={`w-full max-w-[720px] transition-all duration-[1000ms] delay-[120ms] motion-reduce:transition-none motion-reduce:delay-0 shrink-0`}>
                 <h1 className="text-[clamp(2.25rem,3.5vw,3rem)] font-extrabold tracking-tight text-offwhite drop-shadow-md leading-[1.15]">
                   Your voice can move a city.
                 </h1>
               </div>

               <div className={`w-full max-w-[720px] transition-all duration-[1000ms] delay-[160ms] motion-reduce:transition-none motion-reduce:delay-0 mt-5 shrink-0`}>
                 <p className="text-base sm:text-lg text-slate-400 drop-shadow-sm">
                   Report civic problems with your voice, a photo and your location.
                 </p>
               </div>

               <div className={`mt-[28px] flex flex-col sm:flex-row gap-4 transition-all duration-[1000ms] delay-[200ms] motion-reduce:transition-none motion-reduce:delay-0 shrink-0 ${(isTransitioning || hasTransitioned) ? "justify-center w-full" : "w-full"}`}>
                  <Link
                    to="/report"
                    className="flex items-center justify-center rounded-full btn-signal text-navy-950 px-8 py-2 text-base font-bold w-full sm:w-auto h-[48px]"
                  >
                    Report an issue
                  </Link>
                  <a
                    href="#how-it-works"
                    onClick={(e) => scrollToSection(e, "how-it-works")}
                    className="flex items-center justify-center rounded-full glass-control px-8 py-2 text-base font-bold text-white w-full sm:w-auto h-[48px] ring-1 ring-white/10"
                  >
                    See how it works
                  </a>
               </div>

               <div className={`mt-[30px] flex items-center gap-4 text-xs font-bold text-teal-400 uppercase tracking-widest drop-shadow-sm transition-all duration-[1000ms] delay-[240ms] motion-reduce:transition-none motion-reduce:delay-0 shrink-0 ${(isTransitioning || hasTransitioned) ? "mx-auto" : "mr-auto"}`}>
                  <span>Voice</span>
                  <span className="w-1 h-1 rounded-full bg-teal-500/50"></span>
                  <span>Photo</span>
                  <span className="w-1 h-1 rounded-full bg-teal-500/50"></span>
                  <span>Location</span>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* How It Works - Connected Journey */}
      <section id="how-it-works" className="py-24 md:py-32 px-6 relative bg-navy-950 z-10 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(25,185,154,0.03)_0%,transparent_70%)] pointer-events-none" />

        <div className="mx-auto max-w-5xl relative z-10">
          <div className="text-center mb-20 md:mb-32">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">How it works</h2>
            <p className="mt-6 text-xl text-slate-400 max-w-2xl mx-auto">Three simple steps to report a civic issue.</p>
          </div>

          <div className="relative">
            {/* Connecting line (Desktop horizontal, Mobile vertical) */}
            {/* Base line */}
            <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-slate-800 md:hidden"></div>
            <div className="absolute top-8 left-12 right-12 h-0.5 bg-slate-800 hidden md:block"></div>

            {/* Animated glowing route line */}
            <div className="reveal-on-scroll line-vertical absolute left-8 top-8 w-0.5 bg-teal-500 shadow-[0_0_10px_rgba(25,185,154,0.5)] md:hidden transition-all duration-[2000ms] ease-out motion-reduce:h-full h-0"></div>
            <div className="reveal-on-scroll line-horizontal absolute top-8 left-12 h-0.5 bg-teal-500 shadow-[0_0_10px_rgba(25,185,154,0.5)] hidden md:block transition-all duration-[2000ms] ease-out motion-reduce:w-[calc(100%-6rem)] w-0"></div>

            <div className="flex flex-col md:flex-row gap-12 md:gap-8 justify-between relative z-10">

              {/* Step 1 */}
              <div className="reveal-on-scroll flex-1 relative pl-20 md:pl-0 md:text-center group transition-all duration-700 delay-100 motion-reduce:opacity-100 opacity-0 translate-y-8">
                <div className="absolute left-0 top-0 md:relative md:mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navy-900 text-teal-400 shadow-[0_0_30px_rgba(25,185,154,0.15)] ring-4 ring-navy-950 motion-safe:transition-transform motion-safe:duration-300 group-hover:-translate-y-2 mb-8">
                  <Mic size={28} />
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-teal-500 text-navy-950 flex items-center justify-center text-xs font-bold ring-2 ring-navy-950">1</div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 drop-shadow-sm">Speak</h3>
                <p className="text-lg text-slate-400 leading-relaxed">Record the problem in your own words without filling out a long form.</p>
              </div>

              {/* Step 2 */}
              <div className="reveal-on-scroll flex-1 relative pl-20 md:pl-0 md:text-center group transition-all duration-700 delay-300 motion-reduce:opacity-100 opacity-0 translate-y-8">
                <div className="absolute left-0 top-0 md:relative md:mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navy-900 text-teal-400 shadow-[0_0_30px_rgba(25,185,154,0.15)] ring-4 ring-navy-950 motion-safe:transition-transform motion-safe:duration-300 group-hover:-translate-y-2 mb-8">
                  <ImageIcon size={28} />
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-teal-500 text-navy-950 flex items-center justify-center text-xs font-bold ring-2 ring-navy-950">2</div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 drop-shadow-sm">Snap</h3>
                <p className="text-lg text-slate-400 leading-relaxed">Add a photo to show staff what is happening.</p>
              </div>

              {/* Step 3 */}
              <div className="reveal-on-scroll flex-1 relative pl-20 md:pl-0 md:text-center group transition-all duration-700 delay-500 motion-reduce:opacity-100 opacity-0 translate-y-8">
                <div className="absolute left-0 top-0 md:relative md:mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navy-900 text-teal-400 shadow-[0_0_30px_rgba(25,185,154,0.15)] ring-4 ring-navy-950 motion-safe:transition-transform motion-safe:duration-300 group-hover:-translate-y-2 mb-8">
                  <MapPin size={28} />
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-teal-500 text-navy-950 flex items-center justify-center text-xs font-bold ring-2 ring-navy-950">3</div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 drop-shadow-sm">Share</h3>
                <p className="text-lg text-slate-400 leading-relaxed">Share the issue location so staff can see where it was reported.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Concrete Civic Scenario Animation */}
      <section className="bg-[#05101D] py-32 px-6 text-white overflow-hidden relative border-t border-navy-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right_top,rgba(25,185,154,0.02)_0%,transparent_50%)]" />

        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="reveal-on-scroll transition-all duration-700 motion-reduce:opacity-100 opacity-0 translate-y-8">
            <div className="mb-8 inline-flex items-center gap-2 text-navy-950 bg-teal-500 font-bold tracking-widest text-xs uppercase px-3 py-1.5 rounded-sm shadow-md">
              <Layers size={14} />
              <span>PRODUCT WORKFLOW EXAMPLE</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight mb-8 sm:text-4xl lg:text-5xl leading-tight text-white drop-shadow-md">Multiple reports become stronger evidence.</h2>
            <p className="text-xl text-slate-400 mb-8 leading-relaxed">
              When several people report the same nearby problem, CivicPulse is designed to group those reports into one stronger issue signal.
            </p>
            <p className="text-lg text-slate-500 leading-relaxed">
              Stronger corroboration helps staff understand how widely an issue is being reported, naturally prioritizing it for review.
            </p>
          </div>

          <div className="reveal-on-scroll relative h-[520px] rounded-3xl glass-panel-dark overflow-hidden border-teal-500/10 shadow-2xl flex flex-col transition-all duration-700 delay-200 motion-reduce:opacity-100 opacity-0 translate-y-8">
            <div className="flex-1 relative bg-navy-950/50">
              {/* Street map background (SVG) */}
              <div className="absolute inset-0 opacity-20">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 0 100 L 400 100 M 150 0 L 150 300 M 0 200 L 400 200" stroke="#475569" strokeWidth="40" strokeOpacity="0.3" fill="none" />
                </svg>
              </div>

              {/* The Underlying Issue (Teal) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                <div className="h-16 w-16 bg-teal-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(25,185,154,0.4)]">
                  <MapPin size={32} className="text-navy-950" />
                </div>
                <div className="mt-4 bg-navy-900 border border-teal-500/30 rounded-xl px-5 py-3 text-base font-bold text-white shadow-xl backdrop-blur-md">
                  Pothole Problem
                  <div className="text-sm text-teal-400 font-medium mt-1.5 flex items-center justify-center gap-1.5 motion-safe:opacity-0 motion-safe:animate-[fade-in-late_12s_ease-in-out_infinite] motion-reduce:opacity-100">
                    <Layers size={14} /> 4 reports grouped
                  </div>
                </div>
              </div>

              {/* Individual Reports (Amber) - CSS Animated to merge */}
              <style dangerouslySetInnerHTML={{ __html: `
                @media (prefers-reduced-motion: no-preference) {
                  @keyframes merge1 { 0%, 15% { transform: translate(0, 0) scale(1); opacity: 1; } 30%, 100% { transform: translate(80px, 60px) scale(0.5); opacity: 0; } }
                  @keyframes merge2 { 0%, 15% { transform: translate(0, 0) scale(1); opacity: 1; } 30%, 100% { transform: translate(-70px, 80px) scale(0.5); opacity: 0; } }
                  @keyframes merge3 { 0%, 15% { transform: translate(0, 0) scale(1); opacity: 1; } 30%, 100% { transform: translate(60px, -70px) scale(0.5); opacity: 0; } }
                  @keyframes merge4 { 0%, 15% { transform: translate(0, 0) scale(1); opacity: 1; } 30%, 100% { transform: translate(-80px, -50px) scale(0.5); opacity: 0; } }

                  @keyframes fade-in-late { 0%, 30% { opacity: 0; transform: translateY(4px); } 35%, 100% { opacity: 1; transform: translateY(0); } }
                  @keyframes swap-up { 0%, 45% { transform: translateY(0); background-color: rgba(13,29,51,1); border-color: transparent; box-shadow: none; } 55%, 100% { transform: translateY(-60px); background-color: rgba(25,185,154,0.1); border-color: rgba(25,185,154,0.3); box-shadow: 0 0 15px rgba(25,185,154,0.15); } }
                  @keyframes swap-down { 0%, 45% { transform: translateY(0); } 55%, 100% { transform: translateY(60px); } }
                }
              `}} />

              {/* Report 1 */}
              <div className="absolute top-8 left-8 w-40 bg-navy-900 border border-amber-500/40 rounded-xl p-3 shadow-lg motion-safe:animate-[merge1_12s_ease-in-out_infinite] motion-reduce:hidden z-20">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                  <span className="text-xs font-bold uppercase tracking-wider">Voice Report</span>
                </div>
                <div className="flex justify-start items-center text-slate-400 opacity-60">
                  <Mic size={16} />
                </div>
              </div>

              {/* Report 2 */}
              <div className="absolute top-10 right-10 w-40 bg-navy-900 border border-amber-500/40 rounded-xl p-3 shadow-lg motion-safe:animate-[merge2_12s_ease-in-out_infinite] motion-reduce:hidden z-20">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                  <span className="text-xs font-bold uppercase tracking-wider">Photo Report</span>
                </div>
                <div className="flex justify-start items-center text-slate-400 opacity-60">
                  <ImageIcon size={16} />
                </div>
              </div>

              {/* Report 3 */}
              <div className="absolute bottom-16 left-16 w-40 bg-navy-900 border border-amber-500/40 rounded-xl p-3 shadow-lg motion-safe:animate-[merge3_12s_ease-in-out_infinite] motion-reduce:hidden z-20">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                  <span className="text-xs font-bold uppercase tracking-wider">Location Ping</span>
                </div>
                <div className="flex justify-start items-center text-slate-400 opacity-60">
                  <MapPin size={16} />
                </div>
              </div>

              {/* Report 4 */}
              <div className="absolute bottom-12 right-12 w-40 bg-navy-900 border border-amber-500/40 rounded-xl p-3 shadow-lg motion-safe:animate-[merge4_12s_ease-in-out_infinite] motion-reduce:hidden z-20">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                  <span className="text-xs font-bold uppercase tracking-wider">Voice Report</span>
                </div>
                <div className="flex justify-start items-center text-slate-400 opacity-60">
                  <Mic size={16} />
                </div>
              </div>
            </div>

            {/* Simulated Priority Queue */}
            <div className="h-56 bg-navy-950 backdrop-blur-md border-t border-navy-800 p-6 relative flex flex-col z-20">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 shrink-0">Explanation: Staff Queue</div>
              <div className="relative flex-1 overflow-hidden">
                <div className="absolute w-full flex flex-col gap-3">
                  {/* Top Item */}
                  <div className="flex justify-between items-center bg-navy-900 rounded-lg p-3 text-sm opacity-80 h-[48px] motion-safe:animate-[swap-down_12s_ease-in-out_infinite] motion-reduce:translate-y-[60px]">
                    <span className="text-slate-300">Streetlight Outage</span>
                  </div>
                  {/* The Grouped Issue */}
                  <div className="flex justify-between items-center bg-navy-900 border border-transparent rounded-lg p-3 text-sm h-[48px] z-10 motion-safe:animate-[swap-up_12s_ease-in-out_infinite] motion-reduce:-translate-y-[60px] motion-reduce:bg-teal-500/10 motion-reduce:border-teal-500/30 motion-reduce:shadow-[0_0_15px_rgba(25,185,154,0.15)]">
                    <span className="text-white font-medium text-base">Pothole Problem</span>
                    <span className="text-teal-400 font-bold flex items-center gap-1.5 motion-safe:opacity-0 motion-safe:animate-[fade-in-late_12s_ease-in-out_infinite] motion-reduce:opacity-100"><Layers size={14} /> Corroborated</span>
                  </div>
                  {/* Bottom Item */}
                  <div className="flex justify-between items-center bg-navy-900 rounded-lg p-3 text-sm opacity-50 border-transparent h-[48px]">
                    <span className="text-slate-400">Minor Graffiti</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Accountability Section */}
      <section id="accountability" className="py-32 px-6 bg-navy-950 border-t border-navy-800 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(25,185,154,0.02)_0%,transparent_60%)] pointer-events-none" />

        <div className="mx-auto max-w-5xl text-center relative z-10 reveal-on-scroll transition-all duration-700 motion-reduce:opacity-100 opacity-0 translate-y-8">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-8 drop-shadow-md">Building public accountability</h2>
          <p className="text-xl text-slate-400 mb-20 max-w-2xl mx-auto leading-relaxed">
            CivicPulse is designed to make reported civic issues easier to prioritize, follow and review.
          </p>

          <div className="flex flex-col md:flex-row gap-16 text-left relative">
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-navy-800" />

            <div className="reveal-on-scroll flex-1 pr-0 md:pr-12 transition-all duration-700 delay-100 motion-reduce:opacity-100 opacity-0 translate-x-[-20px]">
              <div className="h-14 w-14 rounded-xl bg-navy-900 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-8 shadow-[0_4px_20px_rgba(25,185,154,0.1)]">
                <Layers size={28} />
              </div>
              <h3 className="text-3xl font-bold text-white mb-6">Ranked civic action</h3>
              <p className="text-lg text-slate-400 leading-relaxed">
                When several people report the same nearby problem, CivicPulse is designed to group those reports into one stronger issue signal. Staff receive a ranked action queue, helping prevent critical infrastructure problems from being overlooked.
              </p>
            </div>

            <div className="reveal-on-scroll flex-1 pl-0 md:pl-12 transition-all duration-700 delay-300 motion-reduce:opacity-100 opacity-0 translate-x-[20px]">
              <div className="h-14 w-14 rounded-xl bg-navy-900 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-8 shadow-[0_4px_20px_rgba(25,185,154,0.1)]">
                <CheckCircle size={28} />
              </div>
              <h3 className="text-3xl font-bold text-white mb-6">Evidence-backed closure</h3>
              <p className="text-lg text-slate-400 leading-relaxed">
                By combining voice descriptions, photographic proof, and exact geographic coordinates, reports provide actionable evidence. The intended closure workflow requires staff to provide evidence of completed work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-[#05101D] py-24 px-6 text-center relative overflow-hidden border-t border-navy-800">
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-500/20 motion-reduce:hidden">
           <div className="reveal-on-scroll line-horizontal absolute top-0 bottom-0 w-1/3 bg-teal-400 shadow-[0_0_20px_rgba(25,185,154,0.8)] motion-safe:animate-[pulse_3s_ease-in-out_infinite]" />
        </div>

        <div className="reveal-on-scroll mx-auto max-w-2xl relative z-10 transition-all duration-700 motion-reduce:opacity-100 opacity-0 translate-y-8">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight drop-shadow-md">Make the problem visible.</h2>
          <p className="text-xl text-slate-400 mb-10">
            Send a voice note, add a photo and share the location.
          </p>
          <Link
            to="/report"
            className="inline-flex items-center justify-center rounded-full btn-signal text-navy-950 px-10 py-4 text-xl font-bold transition-transform hover:-translate-y-1"
          >
            Report an issue
          </Link>
        </div>
      </section>

      <footer className="bg-[#05101D] py-10 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6">
          <BrandLogo variant="dark" />
          <p className="text-slate-500 text-sm">A triage layer for civic complaints.</p>
          <div className="flex gap-6 text-sm font-medium">
            <Link to="/report" className="text-teal-500 transition-colors duration-200 hover:text-teal-400">Report an issue</Link>
            <Link to="/dashboard" className="text-slate-400 transition-colors duration-200 hover:text-white">Staff dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
