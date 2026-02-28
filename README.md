# Aura

A self-hosted Docker services dashboard — monitor containers, system stats, network traffic and disk usage from a single page.

## Features

-   **Services** — live Docker status for all your containers (start / stop / restart)
-   **System** — CPU load, RAM usage, uptime
-   **Network** — real-time bandwidth (WebSocket) + historical data via vnstat
-   **Storage** — disk usage for `/` and every `/mnt/*` mount point
-   **Auth** — username + password login with server-side sessions (SQLite)
-   **Themes** — light / dark mode

---

## Option A — Pull from registry (recommended)

No need to clone the repo. Just grab the image, drop in your config, and run.

### 1. Create your services config

Download the example and edit it:

```bash
curl -sL https://raw.githubusercontent.com/ioeldev/aura/main/config/services.example.json \
  -o services.json
# Edit services.json — replace URLs with your own
```

### 2a. docker run

```bash
docker run -d \
  --name aura \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /mnt:/mnt:ro \
  -v $(pwd)/services.json:/app/config/services.json:ro \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=changeme \
  ghcr.io/ioeldev/aura:latest
```

### 2b. docker compose

Create a `docker-compose.yml`:

```yaml
services:
    aura:
        image: ghcr.io/ioeldev/aura:latest
        container_name: aura
        restart: unless-stopped
        ports:
            - "3000:3000"
        volumes:
            - /var/run/docker.sock:/var/run/docker.sock:ro
            - /mnt:/mnt:ro
            - ./services.json:/app/config/services.json:ro
        environment:
            - ADMIN_USERNAME=admin
            - ADMIN_PASSWORD=changeme
            - SESSION_EXPIRE_HOURS=24
```

```bash
docker compose up -d
```

The panel is available at **http://localhost:3000**.

---

## Option B — Build from source

```bash
git clone https://github.com/ioeldev/aura.git
cd aura

cp .env.example .env               # set ADMIN_PASSWORD
cp config/services.example.json config/services.json  # edit URLs

docker compose up -d
```

---

## Configuration

### Authentication

| Variable               | Default   | Description                                      |
| ---------------------- | --------- | ------------------------------------------------ |
| `ADMIN_USERNAME`       | `admin`   | Login username                                   |
| `ADMIN_PASSWORD`       | _(empty)_ | Login password — **leave empty to disable auth** |
| `SESSION_EXPIRE_HOURS` | `24`      | Session lifetime in hours                        |

> If `ADMIN_PASSWORD` is not set the panel is accessible without login. Suitable for a trusted local network, not for public exposure.

### Services config (`services.json`)

Changes are picked up automatically — no restart needed.

```json
{
    "services": [
        {
            "id": "sonarr",
            "displayName": "Sonarr",
            "dockerName": "sonarr",
            "icon": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/sonarr.png",
            "url": "http://192.168.1.10:8989",
            "category": "Management"
        }
    ]
}
```

| Field         | Required | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| `id`          | ✅       | Unique identifier                                                         |
| `displayName` | ✅       | Label shown in the UI                                                     |
| `dockerName`  | ✅       | Container name as shown by `docker ps`                                    |
| `icon`        | ✅       | URL to an icon image                                                      |
| `url`         | ✅       | URL opened when clicking the service                                      |
| `category`    | —        | Groups services: `Media`, `Management`, `Download`, `Monitoring`, `Infra` |

Icons: [walkxcode/dashboard-icons](https://github.com/walkxcode/dashboard-icons) — use `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/<name>.png`

### Volumes

| Mount                                       | Purpose                               |
| ------------------------------------------- | ------------------------------------- |
| `/var/run/docker.sock`                      | Read container states from Docker     |
| `./services.json:/app/config/services.json` | Your services list                    |
| `/mnt`                                      | Host mount points for disk monitoring |
| `./data:/app/data` _(optional)_             | Persist auth sessions across restarts |

---

## Releasing a new version

Tag a commit — GitHub Actions builds and pushes to GHCR automatically:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Image will be available at `ghcr.io/ioeldev/aura:1.0.0` and `ghcr.io/ioeldev/aura:latest`.

---

## Development

Requirements: Bun 1.x

```bash
cd backend && bun install
cd ../frontend && bun install

bun dev   # from repo root
```
