# Implementation Plan - Ultra-Modern UI/UX Overview

This plan covers the visual transformation of Corex AI Desktop into a futuristic, "glassmorphism" and "neon" styled application.

## User Review Required
> [!IMPORTANT]
> This change will significantly alter the look and feel of the application. It will move away from the standard "flat" dark theme to a more translucent, vibrant aesthetic.

## Proposed Changes

### Design System Updates (`src/index.css`)
- [ ] **CSS Variables**: Add variables for:
    - `--glass-bg`: Semi-transparent background color (e.g., `rgba(30, 30, 30, 0.6)`).
    - `--glass-border`: Semi-transparent border color (e.g., `rgba(255, 255, 255, 0.1)`).
    - `--neon-blue`: Primary neon glow color.
    - `--neon-purple`: Secondary neon glow color.
- [ ] **Utility Classes**:
    - `.glass-panel`: Applies `backdrop-filter: blur(12px)`, background color, and border.
    - `.neon-text`: Adds text-shadow for glow effect.
    - `.neon-border`: Adds box-shadow for glowing borders.
    - `.animate-fade-in`: Smooth entry animation for panels.
    - `.custom-scrollbar`: Ultra-thin, futuristic scrollbar styling.

### Component Updates
#### [MODIFY] [App.tsx](file:///e:/ai-desktop/local-ai/src/App.tsx)
- Apply a subtle, dark **animated gradient mesh** background to the main container.
- Update the main layout containers to use transparency.

#### [MODIFY] [SidePanel.tsx](file:///e:/ai-desktop/local-ai/src/components/SidePanel.tsx)
- Apply `.glass-panel` class.
- Add **hover glow effects** and **micro-interactions** (scale up slightly) to file items.

#### [MODIFY] [ChatPanel.tsx](file:///e:/ai-desktop/local-ai/src/components/ChatPanel.tsx)
- Apply `.glass-panel` class.
- Style user/AI messages with distinct glass/neon styles.
- Add **typing indicator animation** (glowing dots).

#### [MODIFY] [TerminalPanel.tsx](file:///e:/ai-desktop/local-ai/src/components/TerminalPanel.tsx)
- Make terminal background semi-transparent.
- Add **CRT Scanline effect** (optional retro-futuristic touch).

#### [MODIFY] [StatusBar.tsx](file:///e:/ai-desktop/local-ai/src/components/StatusBar.tsx)
- Floating glass bar design instead of fixed bottom bar.

## Verification Plan

### Manual Verification
- **Visual Inspection**:
    - Launch the app (`npm run dev`).
    - Verify that the background has a subtle, moving gradient.
    - Open Sidebar, Chat, and Terminal. Check for glass blur and smooth entry animations.
    - Test hover states on file items for micro-interactions.
    - Check if the terminal has the CRT effect (if implemented).
