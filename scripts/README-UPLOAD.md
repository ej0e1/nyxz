# Upload Script Setup (qBittorrent Run on Completion)

## 1. qBittorrent configuration

Set the **Run external program on torrent completion** to:

```bash
node /home/nyx9/app/scripts/upload-to-wasabi.js "%F" "%L"
```

- `%F` = content path (file or folder)
- `%L` = category (we set category = jobId when adding via API)

## 2. Environment variables

Ensure these are set where the script runs (e.g. systemd, shell profile, PM2):

- `DATABASE_URL` - PostgreSQL connection string
- `WASABI_ENDPOINT`, `WASABI_REGION`, `WASABI_ACCESS_KEY`, `WASABI_SECRET_KEY`, `WASABI_BUCKET`

The script loads `.env` and `.env.local` from the project root.

## 3. Job path (QBIT_JOBS_PATH)

When adding torrents via the API, we set qBittorrent’s `savepath` to:

```
{QBIT_JOBS_PATH}/{jobId}
```

Example: `/home/nyx9/downloads/jobs`

The category is also set to `jobId`, so the script can look up the TorrentJob and userId.

## 4. Legacy mode

If the script is run without `%L` (e.g. `"%F"` only), it runs in legacy mode:

- Uploads to bucket root (no user isolation)
- No DB records
- Deletes local files after upload
