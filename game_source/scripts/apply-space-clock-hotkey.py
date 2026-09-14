from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1):
    p = Path(path)
    text = p.read_text()
    found = text.count(old)
    if found < count:
        raise SystemExit(f"{path}: expected {count} occurrence(s), found {found}: {old[:120]!r}")
    p.write_text(text.replace(old, new, count))

app = "game_source/src/App.tsx"

# Remember the player's last genuinely running clock speed so Space can resume it.
replace(
    app,
    "  const dayAccRef = useRef(0);\n  const dayCountRef = useRef(0);\n",
    "  const dayAccRef = useRef(0);\n  const dayCountRef = useRef(0);\n  const lastClockSpeedRef = useRef<1 | 4 | 8 | 12>(1);\n",
)

replace(
    app,
    "  const canPause = screen !== \"title\" && screen !== \"gameover\" && screen !== \"retrospective\";\n",
    "  const canPause = screen !== \"title\" && screen !== \"gameover\" && screen !== \"retrospective\";\n  useEffect(() => {\n    if (timeSpeed > 0) lastClockSpeedRef.current = timeSpeed;\n  }, [timeSpeed]);\n",
)

old_hotkeys = '''  /* --------------------------------------------------------- hotkeys */\n  useEffect(() => {\n    const h = (e: KeyboardEvent) => {\n      if (e.key === \"Escape\" || e.key.toLowerCase() === \"p\") {\n        if (canPause) {\n          setPaused((p) => !p);\n          sfx.click();\n        }\n      }\n      if (e.key.toLowerCase() === \"m\") {\n        const m = !isMuted();\n        setMuted(m);\n        setMuteUI(m);\n      }\n    };\n    window.addEventListener(\"keydown\", h);\n    return () => window.removeEventListener(\"keydown\", h);\n  }, [canPause]);\n'''

new_hotkeys = '''  /* --------------------------------------------------------- hotkeys */\n  useEffect(() => {\n    const isTextEntryTarget = (target: EventTarget | null) => {\n      if (!(target instanceof HTMLElement)) return false;\n      const tag = target.tagName;\n      return tag === \"INPUT\" || tag === \"TEXTAREA\" || tag === \"SELECT\" || target.isContentEditable || !!target.closest('[contenteditable=\"true\"], [role=\"textbox\"]');\n    };\n    const h = (e: KeyboardEvent) => {\n      const liveEditing = screen === \"produce\" && focus?.milestone === \"edit\" && !!focus.projectId;\n      const clockHotkeyAllowed =\n        (screen === \"office\" || liveEditing) &&\n        !paused &&\n        !sellerAuctionOpen &&\n        !bigThreeRevealOpen &&\n        !nominationAnnouncementOpen &&\n        !(pendingLevelUp && levelUpPresentationAllowed) &&\n        (run?.studioEvents.length ?? 0) === 0 &&\n        !run?.ipMarket.pendingPromptId &&\n        !released;\n\n      if ((e.code === \"Space\" || e.key === \" \") && !e.repeat && clockHotkeyAllowed && !isTextEntryTarget(e.target)) {\n        e.preventDefault();\n        setTimeSpeed((speed) => {\n          if (speed === 0) return lastClockSpeedRef.current;\n          lastClockSpeedRef.current = speed;\n          return 0;\n        });\n        sfx.click();\n        return;\n      }\n      if (e.key === \"Escape\" || e.key.toLowerCase() === \"p\") {\n        if (canPause) {\n          setPaused((p) => !p);\n          sfx.click();\n        }\n      }\n      if (e.key.toLowerCase() === \"m\") {\n        const m = !isMuted();\n        setMuted(m);\n        setMuteUI(m);\n      }\n    };\n    window.addEventListener(\"keydown\", h);\n    return () => window.removeEventListener(\"keydown\", h);\n  }, [canPause, screen, focus?.milestone, focus?.projectId, paused, sellerAuctionOpen, bigThreeRevealOpen, nominationAnnouncementOpen, pendingLevelUp, levelUpPresentationAllowed, run?.studioEvents.length, run?.ipMarket.pendingPromptId, released]);\n'''
replace(app, old_hotkeys, new_hotkeys)

replace(
    app,
    "            <Keyboard size={12} /> Staff run production automatically · ENTER next · M mute · ESC pause\n",
    "            <Keyboard size={12} /> SPACE clock pause/resume · M mute · ESC pause menu\n",
)

# Add a source-level regression guard alongside the existing UI regression tests.
test = "game_source/src/engine/__tests__/playtest-regressions.test.ts"
replace(
    test,
    '''  it("keeps the worker dossier close target deliberately below the very top edge", () => {\n    const css = readFileSync("src/mobile-layout.css", "utf8");\n    expect(css).toContain("margin-top: 5px");\n    expect(css).toContain("+ 52px");\n  });\n''',
    '''  it("lets Space pause and resume the live clock at its previous speed without stealing typing spaces", () => {\n    const app = readFileSync("src/App.tsx", "utf8");\n    expect(app).toContain('lastClockSpeedRef');\n    expect(app).toContain('e.code === "Space"');\n    expect(app).toContain('!e.repeat');\n    expect(app).toContain('tag === "INPUT"');\n    expect(app).toContain('tag === "TEXTAREA"');\n    expect(app).toContain('target.isContentEditable');\n    expect(app).toContain('return lastClockSpeedRef.current');\n    expect(app).toContain('pendingLevelUp && levelUpPresentationAllowed');\n  });\n\n  it("keeps the worker dossier close target deliberately below the very top edge", () => {\n    const css = readFileSync("src/mobile-layout.css", "utf8");\n    expect(css).toContain("margin-top: 5px");\n    expect(css).toContain("+ 52px");\n  });\n''',
)
