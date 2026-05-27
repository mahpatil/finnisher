import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
const DEFAULTS = {
    stall_hours: 48,
};
function getFinnisherHome() {
    return process.env['FINNISHER_HOME'] ?? homedir();
}
export function readConfig() {
    const configPath = join(getFinnisherHome(), '.finnisher', 'config.json');
    if (!existsSync(configPath))
        return { ...DEFAULTS };
    try {
        const raw = JSON.parse(readFileSync(configPath, 'utf8'));
        return {
            stall_hours: typeof raw['stall_hours'] === 'number' ? raw['stall_hours'] : DEFAULTS.stall_hours,
        };
    }
    catch {
        return { ...DEFAULTS };
    }
}
//# sourceMappingURL=config.js.map