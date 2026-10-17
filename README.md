# CET Connect: Your Gateway to CET Digital Services

A static portal (HTML, CSS, vanilla JS) for the College of Engineering and Technology, Tarlac Agricultural University. Google Sheets controls every card. No framework, no server.

## Files
`index.html`, `style.css`, `script.js`, `google-apps-script.gs`, `websites-template.csv`

## 1. Create the spreadsheet
1. Create a Google Sheet and rename the first tab to exactly `Websites`.
2. Import `websites-template.csv` (File > Import > Replace current sheet), or type these headers in row 1, columns A to K:
   `ID | Title | Description | URL | Category | IconURL | Status | Featured | DateAdded | Tags | Badge`
3. Replace the example rows (they use placeholder URLs) with real CET websites.
- **Status**: `Active` shows the card; anything else hides it.
- **Featured**: `TRUE` or `FALSE`. **DateAdded**: `YYYY-MM-DD`. **Tags**: comma-separated.
- **Category**: free text. Categories on the site come from this column, so new ones appear automatically.

## 2. Deploy the Apps Script (preferred)
1. In the sheet: Extensions > Apps Script. Replace the code with `google-apps-script.gs`. Save.
2. Deploy > New deployment > type **Web app**.
3. Execute as: **Me**. Who has access: **Anyone**. Deploy and authorize.
4. Copy the Web app URL (ends in `/exec`). Open it in a browser; you should see JSON.
5. After editing the script, use Deploy > Manage deployments > Edit > New version. The `/exec` URL stays the same.

The script only reads the `Websites` sheet and returns active rows. It holds no credentials, and the sheet itself stays private. Anyone with the URL can read the returned JSON, so only list public links.

### Alternative: published sheet
File > Share > Publish to web > choose the `Websites` tab and **CSV**. Copy the link into `SHEET_CSV_URL` in `script.js`. This makes the published data public, and changes can take a few minutes to appear. Inactive rows are still filtered out by the frontend, but they remain visible in the CSV, so use Apps Script if you must keep draft rows hidden.

## 3. Configure the frontend
Edit the top of `script.js`:
```js
const API_URL = "https://script.google.com/macros/s/XXXX/exec";
const CONFIG = { cetLogoUrl: "assets/cet-logo.png", universityLogoUrl: "assets/tau-logo.png",
  suggestFormUrl: "<Google Form>", brokenLinkFormUrl: "<Google Form>",
  contact: { email: "", phone: "", address: "" } };
```
Add the official logo files yourself; none are bundled. Empty values hide the related element. Test locally with `python -m http.server` (opening the file directly may block requests).

## 4. Deploy
**GitHub Pages**: push the files to a repo, then Settings > Pages > Deploy from branch `main` / root. 
**Vercel**: import the repo, framework preset "Other", no build command.
Updating the sheet changes the portal on the next page load or "Refresh data" click, with no code edits.

## Troubleshooting
| Problem | Fix |
|---|---|
| "data source is not configured" | `API_URL` still has the placeholder. |
| "not valid JSON" / CORS error | Redeploy with access **Anyone** and use the `/exec` URL (not `/dev`). Opening it in a private window should show JSON, not a login page. |
| "Worksheet not found" | Tab must be named `Websites`. |
| Card missing | Check Status is `Active`, and Title and URL are filled with a valid `http(s)` link. |
| Old data showing | Create a new script deployment version; for CSV, wait a few minutes. |
| Icon not showing | URL must be a direct, public image link (not a Drive share page). A letter is shown as fallback. |
| Link opens wrong page | Fix the URL in the sheet; it must start with `http://` or `https://`. |

## Security notes
Sheet values are rendered with `textContent`, never `innerHTML`. Only `http`/`https` URLs are accepted. External links use `rel="noopener noreferrer"`. No keys or tokens exist in the frontend. The portal links to external services and does not operate them.
