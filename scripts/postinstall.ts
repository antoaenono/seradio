/**
 * Cross-platform postinstall: only runs git hooks setup if .git exists.
 * Skips silently in CI/containers where .git is absent.
 *
 * Reads the "simple-git-hooks" config from package.json and installs
 * the corresponding git hooks.
 * Runs automatically after `bun install` via the "postinstall" script.
 */
import { execSync } from 'child_process'
import { existsSync } from 'fs'

if (existsSync('.git')) {
  execSync('bun x simple-git-hooks', { stdio: 'inherit' })
}
