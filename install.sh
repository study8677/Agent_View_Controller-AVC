#!/bin/bash
# AVC (Agent View Controller) — Universal Installer
# Installs the avc binary and configures skills for all major AI agents.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/study8677/Agent_View_Controller-AVC/main/install.sh | bash
#
# Install location for the binary, in order of preference:
#   1. $AVC_INSTALL_DIR (if set)
#   2. ~/.local/bin    (no sudo, if in PATH)
#   3. ~/bin           (no sudo, if in PATH)
#   4. /usr/local/bin  (requires sudo)

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

REQUIRED_GO_MAJOR=1
REQUIRED_GO_MINOR=24

echo ""
echo -e "${BLUE}👁️  AVC — Agent View Controller Installer${NC}"
echo -e "   The visual layer for CLI coding agents"
echo ""

# ─── Prerequisites Check ───
if ! command -v go &>/dev/null; then
  echo -e "${RED}✗ Go is required but not installed.${NC}"
  echo "  Install Go ${REQUIRED_GO_MAJOR}.${REQUIRED_GO_MINOR}+: https://go.dev/dl/"
  exit 1
fi

# Parse go version output: "go version go1.25.6 darwin/arm64" → "1.25"
GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
GO_MAJOR=$(echo "$GO_VERSION" | cut -d. -f1)
GO_MINOR=$(echo "$GO_VERSION" | cut -d. -f2)
if [ "$GO_MAJOR" -lt "$REQUIRED_GO_MAJOR" ] || \
   { [ "$GO_MAJOR" -eq "$REQUIRED_GO_MAJOR" ] && [ "$GO_MINOR" -lt "$REQUIRED_GO_MINOR" ]; }; then
  echo -e "${YELLOW}⚠ Go ${GO_VERSION} detected. AVC needs Go ${REQUIRED_GO_MAJOR}.${REQUIRED_GO_MINOR}+. Attempting build anyway...${NC}"
fi

# ─── Pick an install dir (prefer no-sudo) ───
pick_install_dir() {
  # 1) explicit override
  if [ -n "${AVC_INSTALL_DIR:-}" ]; then
    echo "$AVC_INSTALL_DIR"
    return
  fi
  # 2-3) any user-owned bin dir already in PATH
  local candidate
  for candidate in "$HOME/.local/bin" "$HOME/bin"; do
    if [ -d "$candidate" ] && echo "$PATH" | tr ':' '\n' | grep -qx "$candidate"; then
      echo "$candidate"
      return
    fi
  done
  # 4) fallback
  echo "/usr/local/bin"
}

INSTALL_DIR="$(pick_install_dir)"
NEEDS_SUDO=0
if [ ! -w "$INSTALL_DIR" ] && [ "$(id -u)" -ne 0 ]; then
  NEEDS_SUDO=1
fi

# ─── Clone / Update source tree ───
AVC_DIR="${TMPDIR:-/tmp}/avc-install-$$"
trap 'rm -rf "$AVC_DIR"' EXIT INT TERM
echo "📥 Cloning AVC source to $AVC_DIR..."
git clone --quiet --depth 1 https://github.com/study8677/Agent_View_Controller-AVC.git "$AVC_DIR"
cd "$AVC_DIR"

# ─── Build ───
echo "🔨 Building avc binary..."
if ! CGO_ENABLED=1 go build -ldflags "-X main.version=$(git rev-parse --short HEAD)" -o avc .; then
  echo -e "${RED}✗ Build failed.${NC} See output above."
  exit 1
fi
echo -e "${GREEN}✅ Build OK${NC} ($(du -h avc | cut -f1) binary)"

# ─── Install Binary ───
echo "📦 Installing to $INSTALL_DIR/avc..."
if [ "$NEEDS_SUDO" -eq 1 ]; then
  echo -e "${YELLOW}   $INSTALL_DIR is not writable — using sudo (will prompt for password).${NC}"
  echo "   To avoid sudo next time: create ~/.local/bin and add it to PATH,"
  echo "   or run with AVC_INSTALL_DIR=/path/you/own"
  sudo install -m 755 avc "$INSTALL_DIR/avc"
else
  install -m 755 avc "$INSTALL_DIR/avc"
fi

# ─── Verify ───
if ! command -v avc &>/dev/null; then
  echo -e "${YELLOW}⚠ avc installed to $INSTALL_DIR but not found in PATH.${NC}"
  echo "  Add this to your shell rc: export PATH=\"$INSTALL_DIR:\$PATH\""
else
  INSTALLED_VERSION="$(avc --version 2>/dev/null || echo 'unknown')"
  echo -e "${GREEN}✅ avc installed${NC} ($(command -v avc), version $INSTALLED_VERSION)"
fi

# ─── Install Skills ───
SKILL_SRC="$AVC_DIR/skills/avc"
INSTALLED=()

install_skill() {
  local label="$1" dir="$2"
  mkdir -p "$dir"
  cp "$SKILL_SRC/SKILL.md" "$dir/SKILL.md"
  INSTALLED+=("$label → ${dir/$HOME/~}")
}

# Auto-detect each agent by presence of its config dir OR its CLI in PATH
[ -d "$HOME/.codex"  ] || command -v codex  &>/dev/null && install_skill "Codex CLI"      "$HOME/.codex/skills/avc"
[ -d "$HOME/.claude" ] || command -v claude &>/dev/null && install_skill "Claude Code"    "$HOME/.claude/skills/avc"
[ -d "$HOME/.gemini" ]                                  && install_skill "Gemini CLI"     "$HOME/.gemini/skills/avc"
[ -d "$HOME/.copilot" ]                                 && install_skill "GitHub Copilot" "$HOME/.copilot/skills/avc"

# If no agent detected, install to common Claude + Codex paths so things still work
if [ ${#INSTALLED[@]} -eq 0 ]; then
  echo -e "${YELLOW}   No agent config dir detected. Installing to ~/.claude and ~/.codex anyway.${NC}"
  install_skill "Claude Code (default)" "$HOME/.claude/skills/avc"
  install_skill "Codex CLI (default)"   "$HOME/.codex/skills/avc"
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
echo "   Test it (pops up a window because we bypass the threshold):"
echo -e "   ${BLUE}echo '{\"view\":\"plan\",\"title\":\"Hello AVC\",\"data\":{\"steps\":[{\"id\":1,\"label\":\"It works!\",\"status\":\"pending\"}]}}' | avc --no-threshold${NC}"
echo ""
