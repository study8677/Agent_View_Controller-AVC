#!/bin/bash
# AVC (Agent View Controller) — Universal Installer
# Installs the avc binary and configures skills for all major AI agents
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/study8677/Agent_View_Controller-AVC/main/install.sh | bash
#
# What this script does:
#   1. Clones/updates AVC repository
#   2. Builds the avc binary (requires Go)
#   3. Installs binary to /usr/local/bin
#   4. Installs skill for Codex CLI, Claude Code, Gemini CLI, GitHub Copilot

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}👁️  AVC — Agent View Controller Installer${NC}"
echo -e "   The visual layer for CLI coding agents"
echo ""

# ─── Prerequisites Check ───
if ! command -v go &>/dev/null; then
  echo -e "${YELLOW}⚠ Go is required but not installed.${NC}"
  echo "  Install Go: https://go.dev/dl/"
  exit 1
fi

# ─── Clone / Update ───
AVC_DIR="/tmp/avc-install"
if [ -d "$AVC_DIR" ]; then
  echo "📥 Updating AVC source..."
  cd "$AVC_DIR" && git pull --quiet
else
  echo "📥 Cloning AVC..."
  git clone --quiet https://github.com/study8677/Agent_View_Controller-AVC.git "$AVC_DIR"
fi
cd "$AVC_DIR"

# ─── Build ───
echo "🔨 Building avc binary..."
CGO_ENABLED=1 go build -o avc .
echo -e "${GREEN}✅ Build OK${NC} ($(du -h avc | cut -f1) binary)"

# ─── Install Binary ───
echo "📦 Installing to /usr/local/bin/avc..."
sudo cp avc /usr/local/bin/avc
echo -e "${GREEN}✅ avc installed to PATH${NC}"

# ─── Install Skills ───
SKILL_SRC="$AVC_DIR/skills/avc"
INSTALLED=()

# Codex CLI
CODEX_SKILLS="$HOME/.codex/skills/avc"
if [ -d "$HOME/.codex" ] || command -v codex &>/dev/null; then
  mkdir -p "$CODEX_SKILLS"
  cp "$SKILL_SRC/SKILL.md" "$CODEX_SKILLS/SKILL.md"
  INSTALLED+=("Codex CLI → ~/.codex/skills/avc/")
fi

# Claude Code
CLAUDE_SKILLS="$HOME/.claude/skills/avc"
if [ -d "$HOME/.claude" ] || command -v claude &>/dev/null; then
  mkdir -p "$CLAUDE_SKILLS"
  cp "$SKILL_SRC/SKILL.md" "$CLAUDE_SKILLS/SKILL.md"
  INSTALLED+=("Claude Code → ~/.claude/skills/avc/")
fi

# Gemini CLI / Antigravity
GEMINI_SKILLS="$HOME/.gemini/skills/avc"
if [ -d "$HOME/.gemini" ]; then
  mkdir -p "$GEMINI_SKILLS"
  cp "$SKILL_SRC/SKILL.md" "$GEMINI_SKILLS/SKILL.md"
  INSTALLED+=("Gemini CLI → ~/.gemini/skills/avc/")
fi

# GitHub Copilot
COPILOT_SKILLS="$HOME/.copilot/skills/avc"
if [ -d "$HOME/.copilot" ]; then
  mkdir -p "$COPILOT_SKILLS"
  cp "$SKILL_SRC/SKILL.md" "$COPILOT_SKILLS/SKILL.md"
  INSTALLED+=("GitHub Copilot → ~/.copilot/skills/avc/")
fi

# If no agent detected, install to all common paths
if [ ${#INSTALLED[@]} -eq 0 ]; then
  echo -e "${YELLOW}No agent detected. Installing skill to common paths...${NC}"
  for DIR in "$HOME/.codex/skills/avc" "$HOME/.claude/skills/avc" "$HOME/.gemini/skills/avc"; do
    mkdir -p "$DIR"
    cp "$SKILL_SRC/SKILL.md" "$DIR/SKILL.md"
  done
  INSTALLED+=("~/.codex/skills/avc/" "~/.claude/skills/avc/" "~/.gemini/skills/avc/")
fi

# ─── Done ───
echo ""
echo -e "${GREEN}🎉 AVC installed successfully!${NC}"
echo ""
echo "   Skills installed for:"
for item in "${INSTALLED[@]}"; do
  echo -e "   ${GREEN}✓${NC} $item"
done
echo ""
echo "   Test it:"
echo -e "   ${BLUE}echo '{\"view\":\"plan\",\"title\":\"Hello AVC\",\"token_count\":5000,\"data\":{\"steps\":[{\"id\":1,\"label\":\"It works!\",\"status\":\"pending\"}]}}' | avc${NC}"
echo ""

# Cleanup
rm -rf "$AVC_DIR"
