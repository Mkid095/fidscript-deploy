# Backend Inventory — Applications

See `index.md` for conventions. All routes JWT; the install route is
admin/owner only.

The **applications** an operator can have on a platform. Two are part of the
core and are always there — the deployment engine and the mail server. The
rest are the installer's add-ons, installed from the Applications screen.

## Catalogue and installs — `/api/v1/applications`

| ID | Method | Path | Auth | Request | Response | Events |
|----|--------|------|------|---------|----------|--------|
| APP-01 | GET | `/applications` | any signed-in user | — | `{applications:[{id,title,summary,kind:'core'\|'add-on',installed,installable,url,requires,icon}]}` | none |
| APP-02 | GET | `/applications/installs` | any signed-in user | — | `{installs:[{id,applicationId,status,startedAt,finishedAt,output,error}]}` | none |
| APP-03 | GET | `/applications/:id/install` | any signed-in user | — | `{install:job\|null}` | none |
| APP-04 | POST | `/applications/:id/install` | **admin/owner** | — | `{install:job}` | none |

**`installed`** is what the installer recorded — the add-on is listed in
`installer/docker/.env`'s `FIDScript_ADDONS`. It is the same record
`fidscript-addons` reads and writes, so the screen and the installer cannot
disagree about what is installed.

**`url`** is where the application's console is, resolved against this
platform's domain. It is null for an application with no console of its own
(the internal image registry) and for the core ones, whose console is the
dashboard itself.

**APP-04 returns immediately.** An install brings containers up and can take
minutes; the operator watches it from the screen rather than holding a
request open. The job's `output` is the installer's own output — what the
operator would have seen had they run the command themselves.

**APP-04 runs the installer's own command** — `fidscript-addons enable <id>
--no-recreate` — rather than reimplementing it. `--no-recreate` matters: the
platform's api is itself one of the running containers, and it is the process
asking for the install.

**APP-04 answers 409** when the application is already installed or an
install for it is already running, and **404** when there is no such
application.
