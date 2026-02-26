# Prompt: Fix CGO-Enabled Release Builds for steveyegge/beads

## Mission

Submit a PR to https://github.com/steveyegge/beads that fixes issue #1856: "Install script binary has CGO_ENABLED=0 — Dolt embedded mode fails"

## Background Context

### The Problem

1. All release builds run on `ubuntu-latest` (see `.github/workflows/release.yml`)
2. Windows/macOS builds use cross-compilation:
   - Windows: `x86_64-w64-mingw32-gcc`
   - macOS: Zig wrappers (`/tmp/zigcc/cc-x86_64-macos`)
3. Only Linux ICU is installed: `sudo apt-get install libicu-dev`
4. CGO requires target-platform ICU headers/libraries
5. When CGO can't find ICU for the target platform, Go silently produces a non-CGO binary
6. Users get: `Error: failed to open database: dolt backend requires CGO`

### Evidence

```bash
# From installed binary on macOS:
strings ~/.local/bin/bd | grep CGO_ENABLED
CGO_ENABLED=0  # <-- PROBLEM

# The .goreleaser.yml SAYS CGO_ENABLED=1, but cross-compilation fails silently
```

### Affected Platforms

- Windows AMD64 (cross-compiled with mingw)
- Windows ARM64 (cross-compiled with Zig)
- macOS AMD64 (cross-compiled with Zig)
- macOS ARM64 (cross-compiled with Zig)

Linux builds work because they're native.

## The Fix: Native Builds Per Platform

### Approach

Instead of cross-compiling from Ubuntu, use native runners:

| Platform | Runner | CGO Support |
|----------|--------|-------------|
| Linux AMD64 | ubuntu-latest | Native gcc + libicu-dev |
| Linux ARM64 | ubuntu-latest | Cross-compile (aarch64-linux-gnu-gcc) |
| macOS AMD64 | macos-latest | Native clang + icu4c (brew) |
| macOS ARM64 | macos-latest | Native clang + icu4c (brew) |
| Windows AMD64 | windows-latest | Native gcc via MSYS2 UCRT64 |
| Windows ARM64 | windows-latest | Cross-compile with Zig |

### Why This Works

- Native builds have native ICU available via package managers
- CGO "just works" when the compiler can find headers/libs
- No fragile cross-compilation setup needed

## TDD Approach (REQUIRED)

### Step 1: Write Failing Test FIRST

Add a verification step in release.yml that checks for CGO:

```yaml
- name: Verify CGO enabled in binary
  run: |
    # For each built binary, verify CGO is enabled
    for binary in dist/*/bd; do
      if strings "$binary" | grep -q "CGO_ENABLED=0"; then
        echo "ERROR: $binary was built without CGO support"
        exit 1
      fi
      echo "OK: $binary has CGO support"
    done
```

**This test will FAIL on current main branch** - proving the bug exists.

### Step 2: Implement Fix

Split the release workflow into platform-specific jobs.

### Step 3: Test Passes

After fix, the verification step passes on all platforms.

## Files to Modify

### 1. `.github/workflows/release.yml`

Split into 3 jobs:

```yaml
jobs:
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 0 }
      - uses: actions/setup-go@v6
        with: { go-version-file: 'go.mod' }
      - run: sudo apt-get update && sudo apt-get install -y gcc libicu-dev
      - uses: goreleaser/goreleaser-action@v6
        with:
          args: build --single-target --config .goreleaser-linux.yml
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Verify CGO enabled
        run: |
          if strings dist/bd_linux_amd64/bd | grep -q "CGO_ENABLED=0"; then
            echo "ERROR: Linux binary lacks CGO"
            exit 1
          fi

  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 0 }
      - uses: actions/setup-go@v6
        with: { go-version-file: 'go.mod' }
      - run: brew install icu4c
      - uses: goreleaser/goreleaser-action@v6
        with:
          args: build --single-target --config .goreleaser-macos.yml
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CGO_CFLAGS: "-I$(brew --prefix icu4c)/include"
          CGO_LDFLAGS: "-L$(brew --prefix icu4c)/lib"
      - name: Verify CGO enabled
        run: |
          for binary in dist/*/bd; do
            if strings "$binary" | grep -q "CGO_ENABLED=0"; then
              echo "ERROR: $binary lacks CGO"
              exit 1
            fi
          fi

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 0 }
      - uses: actions/setup-go@v6
        with: { go-version-file: 'go.mod' }
      - uses: msys2/setup-msys2@v2
        with:
          msystem: UCRT64
          update: true
          install: mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-icu
      - uses: goreleaser/goreleaser-action@v6
        with:
          args: build --single-target --config .goreleaser-windows.yml
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CGO_ENABLED: 1
          CC: C:/msys64/ucrt64/bin/gcc.exe
          PATH: C:/msys64/ucrt64/bin;${{ env.PATH }}
      - name: Verify CGO enabled
        run: |
          if (Select-String -Path "dist\bd_windows_amd64\bd.exe" -Pattern "CGO_ENABLED=0" -Quiet) {
            Write-Error "ERROR: Windows binary lacks CGO"
            exit 1
          }

  release:
    needs: [build-linux, build-macos, build-windows]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - name: Download all artifacts
        uses: actions/download-artifact@v4
      - uses: goreleaser/goreleaser-action@v6
        with:
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 2. Split `.goreleaser.yml` (optional, or use build IDs)

Either split into separate config files, or use build IDs with `goos`/`goarch` filters.

## Best Practices for PR Acceptance

### 1. Be Respectful and Clear

- Open with: "Thank you for beads! It's an excellent tool."
- Acknowledge existing work: "I see the goreleaser config already specifies CGO_ENABLED=1"
- Frame as collaborative: "This PR proposes a fix for #1856"

### 2. Keep It Minimal

- Don't refactor unrelated code
- Don't add features
- Only change what's needed to fix the CGO issue

### 3. Explain the "Why"

In PR description:
- Cross-compilation + CGO + ICU is fragile
- Native builds are simpler and guaranteed to work
- This aligns with how Homebrew builds beads (native on macOS)

### 4. Reference Existing Issue

```
Fixes #1856
```

### 5. Test Evidence

Include in PR:
- Link to your fork's CI run showing test pass
- Or screenshots of `strings bd.exe | grep CGO` showing no CGO_ENABLED=0

## PR Description Template

```markdown
## Summary

Fixes #1856 - Release binaries were built with CGO_ENABLED=0, causing "Dolt backend requires CGO" errors for users.

## Problem

Cross-compilation from `ubuntu-latest` for Windows/macOS targets cannot find ICU headers for the target platform. Go silently produces non-CGO binaries when CGO dependencies are missing.

## Solution

Use native runners for each platform:
- `ubuntu-latest` for Linux (existing)
- `macos-latest` for macOS (native CGO with icu4c)
- `windows-latest` for Windows (native CGO with MSYS2/UCRT64)

## Testing

Added CI verification step that fails if binary contains `CGO_ENABLED=0`:
```yaml
- name: Verify CGO enabled
  run: |
    if strings dist/bd | grep -q "CGO_ENABLED=0"; then
      echo "ERROR: Binary built without CGO"
      exit 1
    fi
```

This test currently fails on main; passes with this fix.

## Files Changed

- `.github/workflows/release.yml` - Split into platform-native jobs

## Notes

- Homebrew already builds beads natively on macOS (and it works)
- This approach is more maintainable than fixing cross-compilation ICU paths
- Linux ARM64 still cross-compiles (no arm64 GitHub runner for free tiers)
```

## Fork Setup

1. Fork https://github.com/steveyegge/beads
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/beads.git`
3. Create branch: `git checkout -b fix/cgo-native-builds`
4. Make changes
5. Push: `git push origin fix/cgo-native-builds`
6. Open PR against `steveyegge/beads:main`

## References

- Issue: https://github.com/steveyegge/beads/issues/1856
- Current release.yml: `.github/wo
rkflows/release.yml
- Current goreleaser: `.goreleaser.yml`
- Our local build succeeded with MSYS2 UCRT64 on Windows

## Related Bead

- `bb-zbt`: PR: Fix CGO-enabled release builds for beads (beadboard project)

---

Good luck! Be excellent to the maintainers.
