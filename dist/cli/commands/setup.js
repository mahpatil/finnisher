import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { runMigrations } from '../../db/migrate.js';
function getFinnisherHome() {
    return process.env['FINNISHER_HOME'] ?? homedir();
}
function finnBin() {
    try {
        return execSync('which finn', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    }
    catch {
        return 'finn';
    }
}
function mergeClaudeSettings(settingsPath) {
    let config = {};
    if (existsSync(settingsPath)) {
        try {
            config = JSON.parse(readFileSync(settingsPath, 'utf8'));
        }
        catch {
            console.warn('  ⚠  settings.json contained invalid JSON — starting fresh');
            config = {};
        }
    }
    const hooks = (config['hooks'] ?? {});
    const bin = finnBin();
    const preToolCmd = `${bin} hook claude-pre-tool-use`;
    const stopCmd = `${bin} hook claude-stop`;
    const hasCmd = (arr, cmd) => arr.some(w => w.hooks?.some(h => h.command === cmd));
    const promptSubmit = Array.isArray(hooks['UserPromptSubmit']) ? hooks['UserPromptSubmit'] : [];
    if (!hasCmd(promptSubmit, preToolCmd)) {
        promptSubmit.push({ matcher: '', hooks: [{ type: 'command', command: preToolCmd }] });
    }
    const preTool = Array.isArray(hooks['PostToolUse']) ? hooks['PostToolUse'] : [];
    if (!hasCmd(preTool, preToolCmd)) {
        preTool.push({ matcher: '', hooks: [{ type: 'command', command: preToolCmd }] });
    }
    const stop = Array.isArray(hooks['Stop']) ? hooks['Stop'] : [];
    if (!hasCmd(stop, stopCmd)) {
        stop.push({ matcher: '', hooks: [{ type: 'command', command: stopCmd }] });
    }
    hooks['UserPromptSubmit'] = promptSubmit;
    hooks['PostToolUse'] = preTool;
    hooks['Stop'] = stop;
    config['hooks'] = hooks;
    mkdirSync(join(settingsPath, '..'), { recursive: true });
    writeFileSync(settingsPath, JSON.stringify(config, null, 2));
    console.log('  ✓ Claude Code hooks registered');
}
function installGitHook(repoRoot) {
    const hooksDir = join(repoRoot, '.git', 'hooks');
    const hookPath = join(hooksDir, 'post-commit');
    const bin = finnBin();
    const finnLine = `${bin} hook git-post-commit`;
    if (existsSync(hookPath)) {
        const existing = readFileSync(hookPath, 'utf8');
        if (existing.includes(finnLine)) {
            console.log('  ✓ git post-commit hook already installed');
            return;
        }
        writeFileSync(hookPath, existing.trimEnd() + '\n' + finnLine + '\n');
    }
    else {
        mkdirSync(hooksDir, { recursive: true });
        writeFileSync(hookPath, `#!/bin/bash\n${finnLine}\nexit 0\n`);
        chmodSync(hookPath, 0o755);
    }
    console.log('  ✓ git post-commit hook installed');
}
function isOnPath(bin) {
    try {
        execSync(`which ${bin}`, { stdio: ['pipe', 'pipe', 'pipe'] });
        return true;
    }
    catch {
        return false;
    }
}
const OPENCODE_PLUGIN_CONTENT = `const { spawn } = require('child_process');

module.exports = async (ctx) => ({
  event: async ({ event }) => {
    const bin = (() => {
      try {
        return require('child_process').execSync('which finn', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
      } catch {
        return 'finn'
      }
    })();

    if (event.type === 'session.created') {
      const cwd = process.cwd();
      const child = spawn(bin, ['hook', 'opencode-start', '--cwd', cwd], { detached: true, stdio: 'ignore' });
      child.unref();
    }

    if (event.type === 'session.deleted') {
      const cwd = process.cwd();
      const child = spawn(bin, ['hook', 'opencode-stop', '--cwd', cwd], { detached: true, stdio: 'ignore' });
      child.unref();
    }
  },
});
`;
function installOpenCodePlugin(home) {
    const pluginDir = join(home, '.config', 'opencode', 'plugins');
    const pluginPath = join(pluginDir, 'finnisher.js');
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(pluginPath, OPENCODE_PLUGIN_CONTENT);
}
function installGeminiHooks(home) {
    const settingsPath = join(home, '.gemini', 'settings.json');
    let config = {};
    if (existsSync(settingsPath)) {
        try {
            config = JSON.parse(readFileSync(settingsPath, 'utf8'));
        }
        catch {
            config = {};
        }
    }
    const bin = finnBin();
    const hooks = (config['hooks'] ?? {});
    if (!hooks['SessionStart'])
        hooks['SessionStart'] = `${bin} hook gemini-start`;
    if (!hooks['SessionEnd'])
        hooks['SessionEnd'] = `${bin} hook gemini-stop`;
    config['hooks'] = hooks;
    mkdirSync(join(settingsPath, '..'), { recursive: true });
    writeFileSync(settingsPath, JSON.stringify(config, null, 2));
}
function removeOpenCodeAfterHook(home) {
    const configPath = join(home, '.opencode', 'config.json');
    if (!existsSync(configPath))
        return;
    try {
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        const hooks = config['hooks'];
        if (hooks && typeof hooks === 'object' && !Array.isArray(hooks)) {
            const afterHook = hooks['after'];
            if (typeof afterHook === 'string' && afterHook.includes('finn hook opencode-stop')) {
                delete hooks['after'];
                writeFileSync(configPath, JSON.stringify(config, null, 2));
            }
        }
    }
    catch {
        // Ignore invalid JSON
    }
}
export function register(program) {
    program
        .command('setup')
        .description('One-time setup: initialize DB and register agent hooks')
        .option('--git', 'Install git post-commit hook in current directory')
        .option('--git-dir <path>', 'Git repo root for --git (default: cwd)')
        .option('--claude-settings <path>', 'Path to ~/.claude/settings.json override')
        .option('--no-auto-detect', 'Skip agent auto-detection')
        .action(async (opts) => {
        const home = getFinnisherHome();
        runMigrations();
        console.log('  ✓ DB initialized');
        if (opts.autoDetect !== false) {
            const settingsPath = opts.claudeSettings ?? join(home, '.claude', 'settings.json');
            if (isOnPath('claude') || existsSync(settingsPath)) {
                mergeClaudeSettings(settingsPath);
            }
            else {
                console.log('  ✗ Claude Code not found on PATH (skipped)');
            }
            if (isOnPath('codex')) {
                const hooksDir = join(home, '.codex', 'hooks');
                mkdirSync(hooksDir, { recursive: true });
                const bin = finnBin();
                writeFileSync(join(hooksDir, 'post-session'), `#!/bin/bash\n${bin} hook codex-stop\nexit 0\n`);
                console.log('  ✓ Codex hooks registered');
            }
            else {
                console.log('  ✗ Codex not found on PATH (skipped)');
            }
            if (isOnPath('opencode') || existsSync(join(home, '.opencode', 'config.json'))) {
                // Remove old after hook from config.json
                removeOpenCodeAfterHook(home);
                // Install the new plugin
                installOpenCodePlugin(home);
                console.log('  ✓ OpenCode hooks registered');
            }
            else {
                console.log('  ✗ OpenCode not found on PATH (skipped)');
            }
            if (isOnPath('gemini')) {
                installGeminiHooks(home);
                console.log('  ✓ Gemini CLI hooks registered');
            }
            else {
                console.log('  ✗ Gemini not found on PATH (skipped)');
            }
        }
        if (opts.git) {
            const repoRoot = opts.gitDir ?? process.cwd();
            installGitHook(repoRoot);
        }
        console.log('\n  Run: echo "<thread-id>" > .finn-thread');
        console.log('       in any project to link it to a thread.\n');
    });
}
//# sourceMappingURL=setup.js.map