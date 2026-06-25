import { Link } from "@tanstack/react-router";
import { Activity, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar() {
  const [dark, setDark] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mp_theme");
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);

    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("mp_theme", next ? "dark" : "light");
  };

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 glass transition-all duration-300"
      style={{ opacity: scrolled ? 1 : 0.35 }}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Activity className="h-6 w-6 text-cyan animate-heartbeat" />
          </div>
          <span className="font-bold tracking-tight text-lg">
            MediPredict <span className="text-cyan">AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-1 md:gap-6 text-sm">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/assessment">Assessment</NavLink>
          <NavLink to="/history">History</NavLink>

          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="ml-2 p-2 rounded-md hover:bg-secondary transition-colors"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </nav>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-2 rounded-md text-muted-foreground hover:text-cyan transition-colors"
      activeProps={{ className: "px-3 py-2 rounded-md text-cyan font-medium" }}
      activeOptions={{ exact: to === "/" }}
    >
      {children}
    </Link>
  );
}