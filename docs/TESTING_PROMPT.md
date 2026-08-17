# FIDScript Platform — Comprehensive End-to-End Test Prompt

Use this prompt with an AI agent to perform a full verification of the FIDScript platform.
Copy the entire prompt below and paste it into a new conversation with the agent.

---

## SYSTEM CONTEXT

You are testing the **FIDScript Deploy** platform — a self-hosted BaaS (Backend-as-a-Service) that runs on a single VPS. The platform consists of:

- **Backend**: NestJS API at `https://api.deploy.fidscript.com`
- **Dashboard**: Next.js frontend at `https://deploy.fidscript.com`
- **CLI**: `@fidscript-deploy/cli` (npm package)
- **MCP Server**: `@fidscript-deploy/mcp-server` (npm package, binary: `fidscript-mcp`)
- **SDK**: `@fidscript-deploy/sdk` (npm package)

The VPS is already running at `164.92.106.116` with all containers live.
SSH is available from the machine you're running on (you ARE on the server).
Docker containers are running. You have `docker` CLI and `curl` available.

---

## YOUR IDENTITY

You are a senior backend engineer hired to do a thorough QA pass on a production system.
Be methodical. For every test, record: what you did, what happened, and whether it PASSED or FAILED.
If something fails, diagnose WHY and report the exact error.

---

## PHASE 1 — Backend Health

### 1.1 API is responding
```bash
curl -s https://api.deploy.fidscript.com/api/v1/projects | head -100
```
Expected: JSON response (may be empty array `[]` or list of projects).
If 401/403: note it. If connection refused: report as BLOCKER.

### 1.2 All infrastructure containers healthy
```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
```
Expected: `fidscript_api`, `fidscript_dashboard`, `fidscript_postgres`, `fidscript_redis`, `fidscript_nats`, `fidscript_minio`, `fidscript_stalwart` all show "Up" or "healthy".
Report any container that is not running or restarting.

### 1.3 Database connectivity
```bash
docker exec fidscript_postgres psql -U fidscript -d fidscript -c "SELECT count(*) FROM \"Project\";" 2>&1
```
Expected: A number (count of projects).

### 1.4 NATS connectivity
```bash
docker exec fidscript_nats nats server info 2>&1 | head -5
```
Expected: Server info with version.

---

## PHASE 2 — Dashboard Frontend

### 2.1 Dashboard loads
```bash
curl -s -o /dev/null -w "%{http_code}" https://deploy.fidscript.com/
```
Expected: 200 or 301 (redirect to login). NOT 502/503/504.

### 2.2 Login page loads
```bash
curl -s -o /dev/null -w "%{http_code}" https://deploy.fidscript.com/login
```
Expected: 200.

### 2.3 MCP page loads (public /mcp)
```bash
curl -s -o /dev/null -w "%{http_code}" https://deploy.fidscript.com/mcp
```
Expected: 200. Check the page contains text about MCP, Claude Desktop, CLI.

### 2.4 Navigate the dashboard (as a logged-in user)
Use the browser automation (Playwright or similar) to:
1. Open `https://deploy.fidscript.com`
2. If redirected to login, log in with credentials: `admin@deploy.fidscript.com` / `Fidscript@2026!`
3. Check the Projects page loads
4. Navigate to any existing project
5. Navigate to the project's **MCP page** (`/projects/[id]/mcp`)
6. Verify the MCP page shows:
   - "Three ways to connect" section
   - MCP install command: `npm install -g @fidscript-deploy/mcp-server`
   - CLI install command: `npm install -g @fidscript-deploy/cli`
   - MCP config using `fidscript-mcp` (NOT `npx @fidscript/mcp`)
   - Tool catalog with expandable service groups
   - **No placeholder text**, no "coming soon" on the tool descriptions
   - No broken icons (no blank squares)

Report each finding separately: PASS or FAIL for each item above.

---

## PHASE 3 — CLI (@fidscript-deploy/cli)

### 3.1 Install CLI
```bash
npm install -g @fidscript-deploy/cli
```
Then verify:
```bash
fidscript --version
```
Expected: version number printed (e.g. `1.1.1`).

### 3.2 CLI help works
```bash
fidscript --help
```
Expected: list of commands. Verify these groups are present: `login`, `logout`, `whoami`, `projects`, `deployments`, `functions`, `databases`, `storage`, `queues`, `cron`, `email`, `domains`, `env`.

### 3.3 CLI login
```bash
fidscript login <use-a-real-api-key>
```
First, get a real API key from the dashboard:
- Log in to dashboard → go to a project → MCP page → Generate API Key
- Copy the key and use it here

Expected: `Logged in successfully` (or similar success message).
If the key is invalid or expired: report what message you got.

### 3.4 CLI whoami
```bash
fidscript whoami
```
Expected: shows current user email or API key info.

### 3.5 CLI projects list
```bash
fidscript projects list
```
Expected: JSON or table of projects. Record how many projects and their names.

### 3.6 CLI command for each service group
Run the following and record the output for each:

```bash
# Deployments
fidscript deployments list
# Expected: list of deployments (may be empty)

# Functions
fidscript functions list
# Expected: list of functions (may be empty)

# Databases
fidscript databases list
# Expected: list of databases (may be empty)

# Storage
fidscript storage buckets
# Expected: list of storage buckets (may be empty)

# Queues
fidscript queues list
# Expected: list of queues (may be empty)

# Cron
fidscript cron list
# Expected: list of cron jobs (may be empty)

# Domains
fidscript domains list
# Expected: list of domains (may be empty)

# Email (at least check the command runs)
fidscript email templates
# Expected: list of templates (may be empty) or error if no email domain

# Env vars
fidscript env list
# Expected: list of env vars (may be empty)
```

---

## PHASE 4 — MCP Server (@fidscript-deploy/mcp-server)

### 4.1 Install MCP server
```bash
npm install -g @fidscript-deploy/mcp-server
```

### 4.2 Binary exists and runs
```bash
fidscript-mcp --help 2>&1
# OR
fidscript-mcp --version 2>&1
```
Expected: command runs without "command not found" or ESM errors.
**The critical test**: it should NOT output "Dynamic require of util is not supported".
If that error appears: REPORT AS BLOCKER (the ESM fix from v1.0.6 is not working).

### 4.3 Test MCP with Claude Code (if available)
If Claude Code CLI is available:
```bash
claude mcp --help 2>&1
```
Then try to add the FIDScript MCP server:
```bash
claude mcp add fidscript --婚后 fidscript-mcp --env-file /dev/null 2>&1
# OR the correct syntax for this Claude Code version
```
Check Claude Code documentation for the correct MCP add syntax.

### 4.4 MCP config — manual verification
Create a test config file at `~/.claude/test-mcp.json`:
```json
{
  "mcpServers": {
    "fidscript": {
      "command": "fidscript-mcp",
      "env": {
        "FIDSCRIPT_API_KEY": "<your-real-api-key>",
        "FIDSCRIPT_API_URL": "https://api.deploy.fidscript.com"
      }
    }
  }
}
```
Try to start a Claude process with this config (or use `claude mcp` if there's a way to test without full Claude Desktop setup).

### 4.5 MCP tool test via SDK
Instead of testing via AI agent, verify the MCP server binary at least starts and parses its environment:
```bash
FIDSCRIPT_API_KEY=<real-key> FIDSCRIPT_API_URL=https://api.deploy.fidscript.com fidscript-mcp 2>&1 | head -20
```
Expected: starts without crash, waits for MCP protocol input (it will hang waiting for stdio).
If it exits immediately or errors: record the error.

---

## PHASE 5 — SDK (@fidscript-deploy/sdk)

### 5.1 Install SDK
```bash
npm install @fidscript-deploy/sdk
```

### 5.2 SDK basic connectivity test
Create a test file `test-sdk.mjs`:
```javascript
import { FidscriptSDK } from '@fidscript-deploy/sdk';

const sdk = new FidscriptSDK({
  baseUrl: 'https://api.deploy.fidscript.com',
  apiKey: '<real-api-key>',
});

async function test() {
  try {
    // Test projects list
    const projects = await sdk.projects.list();
    console.log('projects.list():', JSON.stringify(projects, null, 2));

    // Test health
    const health = await sdk.health();
    console.log('health():', JSON.stringify(health, null, 2));

    console.log('SDK connectivity: PASS');
  } catch (err) {
    console.error('SDK connectivity FAIL:', err.message);
  }
}

test();
```
Run it:
```bash
node test-sdk.mjs
```
Expected: outputs from `projects.list()` and `health()` — both should return data without throwing.

### 5.3 SDK method coverage test
Test each SDK module. Create a comprehensive test:

```javascript
import { FidscriptSDK } from '@fidscript-deploy/sdk';

const sdk = new FidscriptSDK({
  baseUrl: 'https://api.deploy.fidscript.com',
  apiKey: '<real-api-key>',
});

async function testModule(name, fn) {
  try {
    const result = await fn();
    console.log(`✅ ${name}:`, typeof result === 'object' ? JSON.stringify(result).slice(0, 200) : result);
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
  }
}

async function main() {
  const projects = await sdk.projects.list();
  const projectId = projects[0]?.id;
  const domainId = projects[0]?.domains?.[0]?.id;

  await testModule('projects.list', () => sdk.projects.list());
  if (projectId) {
    await testModule('deployments.list', () => sdk.deployments.list(projectId));
    await testModule('functions.list', () => sdk.functions.list(projectId));
    await testModule('databases.list', () => sdk.databases.list(projectId));
    await testModule('storage.listBuckets', () => sdk.storage.listBuckets(projectId));
    await testModule('queues.list', () => sdk.queues.list(projectId));
    await testModule('cron.list', () => sdk.cron.list(projectId));
    await testModule('domains.list', () => sdk.domains.list(projectId));
    await testModule('env.list', () => sdk.env.list(projectId));
  }
  if (domainId) {
    await testModule('email.status (with domainId)', () => sdk.email.status(projectId, domainId));
  }
}

main();
```
Run it and report results for each module.

---

## PHASE 6 — Specific Feature Tests

### 6.1 Create a project via API
```bash
curl -X POST https://api.deploy.fidscript.com/api/v1/projects \
  -H "Authorization: Bearer <api-key>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "test-project-cli", "type": "frontend" }' 2>&1
```
Expected: 201 Created with project object.
Record the project ID.

### 6.2 MCP tool "project_list" via direct HTTP call
Verify the MCP endpoint is reachable:
```bash
curl -X POST https://api.deploy.fidscript.com/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <api-key>" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' 2>&1
```
Expected: JSON-RPC response with tools list.

### 6.3 Email domain verification status
```bash
curl -s https://api.deploy.fidscript.com/api/v1/projects/<project-id>/email/status \
  -H "Authorization: Bearer <api-key>" 2>&1
```
Expected: JSON with email domain verification status (DKIM, SPF, MX checks).

### 6.4 Monitor a deployment
```bash
curl -s https://api.deploy.fidscript.com/api/v1/projects/<project-id>/deployments \
  -H "Authorization: Bearer <api-key>" 2>&1 | head -50
```

---

## PHASE 7 — Integration: Full MCP Chain

This is the most important test. To verify MCP really works end-to-end:

1. **Get an API key** from the dashboard at `https://deploy.fidscript.com/projects/[project-id]/mcp`

2. **Write an MCP config file** `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "fidscript": {
      "command": "fidscript-mcp",
      "env": {
        "FIDSCRIPT_API_KEY": "<key>",
        "FIDSCRIPT_API_URL": "https://api.deploy.fidscript.com"
      }
    }
  }
}
```

3. **Restart Claude** (Claude Desktop or Claude Code CLI)

4. **Ask Claude** (via the CLI or desktop):
   - "List my FIDScript projects"
   - "Create a new database in my project"
   - "Show me my storage buckets"
   - "What's the status of my email domain?"

5. **Record for each**:
   - Did Claude successfully call the MCP tool?
   - Did the tool return correct data?
   - Did Claude respond in a useful way?

If Claude can't connect to MCP at all: report what error appears and whether it's an MCP config issue, a binary issue, or an API key issue.

---

## PHASE 8 — Report Format

For each phase, produce a structured report:

```
## Phase N — [Phase Name]

### Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| ... | ... | ... | PASS/FAIL |

### Blockers (MUST FIX before production)
1. [Description of blocker]
2. ...

### Issues (should fix but not blocking)
1. [Description]

### Notes
[Any observations, edge cases, or things that worked unexpectedly well]
```

Then a final **SUMMARY**:
```
## FINAL VERDICT

Total tests: N
Passed: N
Failed: N
Blockers: N

OVERALL: [PRODUCTION READY / MOSTLY READY / NEEDS WORK / NOT READY]

Top 3 critical fixes needed:
1. ...
2. ...
3. ...
```

---

## CREDENTIALS TO USE

- **Dashboard**: `admin@deploy.fidscript.com` / `Fidscript@2026!`
- **API base URL**: `https://api.deploy.fidscript.com`
- **Dashboard URL**: `https://deploy.fidscript.com`
- **VPS**: `164.92.106.116` (you are already on this machine)

To get a real API key for testing: log into the dashboard → select a project → go to `/projects/[id]/mcp` → click "Generate API Key".

---

## IMPORTANT RULES FOR THE TESTING AGENT

1. **Do not skip tests because they seem to work.** Run every command. Verify every output.
2. **If something fails, do not just move on.** Try to understand WHY it failed.
3. **If you need to dig deeper into a container**, use:
   ```bash
   docker exec -it <container-name> /bin/sh
   ```
4. **If you need to see logs**: `docker logs <container-name> --tail 50 -f`
5. **If npm install fails**, try with `--registry https://registry.npmjs.org/`
6. **For any test that requires a real project**, use an existing project from `fidscript projects list` or create a new one first.
7. **Be honest about what you could not test** (e.g., "could not test MCP with Claude Desktop because Claude Code is not installed on this machine").
8. **Report the actual error messages**, not just "it failed".
