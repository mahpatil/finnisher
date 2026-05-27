#!/usr/bin/env node
import { Command } from 'commander'
import { runMigrations } from '../db/migrate.js'
import { register as registerList } from './commands/list.js'
import { register as registerAdd } from './commands/add.js'
import { register as registerNext } from './commands/next.js'
import { register as registerDone } from './commands/done.js'
import { register as registerStatus } from './commands/status.js'
import { register as registerSessions } from './commands/sessions.js'
import { register as registerTouch } from './commands/touch.js'
import { register as registerWeb } from './commands/web.js'
import { register as registerHook } from './commands/hook.js'
import { register as registerSetup } from './commands/setup.js'
import { register as registerDiscover } from './commands/discover.js'
import { register as registerArchive } from './commands/archive.js'
import { register as registerPriority } from './commands/priority.js'
import { register as registerLaunch } from './commands/launch.js'
import { register as registerIntent } from './commands/intent.js'
import { register as registerWeek } from './commands/week.js'

runMigrations()

const program = new Command()
  .name('finn')
  .description('Finnisher — personal execution momentum tracker')
  .version('0.1.0')

registerList(program)
registerAdd(program)
registerNext(program)
registerDone(program)
registerStatus(program)
registerSessions(program)
registerTouch(program)
registerWeb(program)
registerHook(program)
registerSetup(program)
registerDiscover(program)
registerArchive(program)
registerPriority(program)
registerLaunch(program)
registerIntent(program)
registerWeek(program)

program.parse()