import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Theme = "dark" | "light" | "cyberpunk" | "forest" | "ocean";

interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  border: string;
  hover: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

const themes: Record<Theme, ThemeColors> = {
  dark: {
    primary: "#3b82f6",
    secondary: "#6366f1",
    background: "#1e1e1e",
    surface: "#252525",
    text: "#ffffff",
    textSecondary: "#a3a3a3",
    accent: "#06b6d4",
    border: "#404040",
    hover: "#2a2a2a",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",
  },
  light: {
    primary: "#0969da",
    secondary: "#8250df",
    background: "#f6f8fa",
    surface: "#ffffff",
    text: "#1f2328",
    textSecondary: "#65717e",
    accent: "#0969da",
    border: "#d0d7de",
    hover: "#f3f4f6",
    success: "#1a7f37",
    warning: "#9a6700",
    error: "#cf222e",
    info: "#0969da",
  },
  cyberpunk: {
    primary: "#ff0080",
    secondary: "#00ff80",
    background: "#0a0a0a",
    surface: "#1a0a1a",
    text: "#00ff80",
    textSecondary: "#ff0080",
    accent: "#ffff00",
    border: "#ff0080",
    hover: "#2a0a2a",
    success: "#00ff80",
    warning: "#ffff00",
    error: "#ff0080",
    info: "#00ffff",
  },
  forest: {
    primary: "#22c55e",
    secondary: "#16a34a",
    background: "#0f1419",
    surface: "#1a2332",
    text: "#e6fffa",
    textSecondary: "#94a3b8",
    accent: "#34d399",
    border: "#2d3748",
    hover: "#2a3441",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#06b6d4",
  },
  ocean: {
    primary: "#0ea5e9",
    secondary: "#0284c7",
    background: "#0c1222",
    surface: "#1e293b",
    text: "#f1f5f9",
    textSecondary: "#94a3b8",
    accent: "#06b6d4",
    border: "#334155",
    hover: "#2d3748",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#0ea5e9",
  },
};

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  setTheme: (theme: Theme) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("corex-theme") as Theme;
    if (savedTheme && themes[savedTheme]) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem("corex-theme", theme);

    // Apply CSS variables
    const root = document.documentElement;
    const colors = themes[theme];

    // Set data-theme attribute for CSS selectors
    root.setAttribute("data-theme", theme);

    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }, [theme]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors: themes[theme],
        setTheme: handleSetTheme,
        availableThemes: Object.keys(themes) as Theme[],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
