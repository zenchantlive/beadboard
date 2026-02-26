#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_NAME = 'create-beads-orchestration';

// Get paths
const homeDir = os.homedir();
const claudeDir = path.join(homeDir, '.claude');
const claudeSkillsDir = path.join(claudeDir, 'skills', SKILL_NAME);
const packageDir = path.dirname(__dirname);
const sourceSkillDir = path.join(packageDir, 'skills', SKILL_NAME);

console.log('\n📦 Installing beads-orchestration skill...\n');

// Check OS
if (process.platform === 'win32') {
  console.log('⚠️  Windows is not supported. Use WSL or macOS/Linux.');
  process.exit(0);
}

// Create ~/.claude/skills/create-beads-orchestration/
try {
  fs.mkdirSync(claudeSkillsDir, { recursive: true });
} catch (err) {
  console.error(`❌ Failed to create directory: ${claudeSkillsDir}`);
  console.error(err.message);
  process.exit(1);
}

// Copy SKILL.md
const sourceFile = path.join(sourceSkillDir, 'SKILL.md');
const destFile = path.join(claudeSkillsDir, 'SKILL.md');

try {
  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ Source skill not found: ${sourceFile}`);
    process.exit(1);
  }

  fs.copyFileSync(sourceFile, destFile);
  console.log(`✅ Installed skill to: ${claudeSkillsDir}`);
} catch (err) {
  console.error(`❌ Failed to copy skill: ${err.message}`);
  process.exit(1);
}

// Save package location for bootstrap.py
const configFile = path.join(claudeDir, 'beads-orchestration-path.txt');
try {
  fs.writeFileSync(configFile, packageDir);
  console.log(`✅ Saved package path to: ${configFile}`);
} catch (err) {
  console.error(`⚠️  Could not save package path: ${err.message}`);
}

console.log(`
🎉 Installation complete!

Package location: ${packageDir}

Usage:
  In any Claude Code session, run:

    /create-beads-orchestration

  The skill will guide you through setting up orchestration for your project.

`);
