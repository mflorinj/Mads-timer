# Ugeopgørelse – Azure Static Web App + Cosmos DB

Tidsregistrering pr. medarbejder, delt på tværs af laptops, iPhone og iPad.
Hver medarbejder logger ind med Microsoft-konto og ser kun egne uger. En admin kan se alle.

## Mappestruktur

```
.
├── index.html                  # Frontend (responsiv, virker på mobil/tablet/desktop)
├── staticwebapp.config.json    # Login + rutebeskyttelse
└── api/                        # Azure Functions (backend mod Cosmos DB)
    ├── host.json
    ├── package.json            # afhængighed: @azure/cosmos
    ├── _shared/
    │   ├── cosmos.js           # Cosmos-klient (opretter db/container automatisk)
    │   └── identity.js         # læser login + admin-tjek
    ├── me/                     # GET /api/me        -> hvem er jeg + admin?
    ├── timesheet/              # GET/PUT/DELETE /api/timesheet
    └── employees/              # GET /api/employees  (kun admin)
```

## Datamodel i Cosmos

- Database: `timereg` · Container: `timesheets` · Partition key: `/employeeId`
- Ét dokument pr. medarbejder + uge:

```json
{
  "id": "2026-24",
  "employeeId": "<bruger-id fra login>",
  "employeeName": "navn@firma.dk",
  "year": 2026,
  "week": 24,
  "rows": [ { "day": "Mandag", "start": "08:00", "slut": "16:30", "pause": "30", "kunde": "Specsavers", "opgave": "..." } ],
  "updatedAt": "2026-06-13T10:00:00.000Z"
}
```

Databasen og containeren oprettes automatisk første gang, hvis de ikke findes – du skal kun have en Cosmos-konto og en connection string.

## Opsætning (engangs)

### 1. Cosmos DB
Opret en Cosmos DB-konto (NoSQL / Core API), gerne i en EU-region (fx West Europe / North Europe). Kopiér en **primary connection string** fra *Keys*.

### 2. App settings på Static Web App
Under *Static Web App → Settings → Environment variables* (Configuration):

| Navn | Værdi |
|------|-------|
| `COSMOS_CONNECTION_STRING` | connection string fra Cosmos |
| `ADMIN_USERS` | komma-separeret liste af admin-e-mails, fx `morten@fagerholm.dk` |
| `COSMOS_DB` | (valgfri) standard `timereg` |
| `COSMOS_CONTAINER` | (valgfri) standard `timesheets` |

`ADMIN_USERS` matcher mod login-navnet (`userDetails`, typisk e-mail). Står man på listen, vises medarbejder-vælgeren og man kan se alles uger skrivebeskyttet.

### 3. Microsoft-login
`staticwebapp.config.json` sender ikke-loggede brugere til `/.auth/login/aad`.

- **Hurtig start:** SWA's indbyggede Microsoft-provider virker uden videre under `/.auth/login/aad`.
- **Eget tenant (anbefalet til drift / kun jeres organisation):** registrér en app i Entra ID med redirect-URI
  `https://<dit-app-navn>.azurestaticapps.net/.auth/login/aad/callback`, gem `AAD_CLIENT_ID` og `AAD_CLIENT_SECRET` som app settings, og tilføj dette til `staticwebapp.config.json`:

```json
"auth": {
  "identityProviders": {
    "azureActiveDirectory": {
      "registration": {
        "openIdIssuer": "https://login.microsoftonline.com/<TENANT_ID>/v2.0",
        "clientIdSettingName": "AAD_CLIENT_ID",
        "clientSecretSettingName": "AAD_CLIENT_SECRET"
      }
    }
  }
}
```

Vælg *single tenant* ved registreringen, hvis kun jeres egne brugere skal kunne logge ind. Husk at fornye client-secret før den udløber.

## Deploy

**Via GitHub Actions** (oprettes automatisk når du laver din SWA fra et repo):
sæt i workflow-filen `app_location: "/"`, `api_location: "api"`, `output_location: ""`.

**Via SWA CLI:**
```bash
npm install -g @azure/static-web-apps-cli
swa deploy ./ --api-location ./api
```

## Lokal kørsel
```bash
npm install -g @azure/static-web-apps-cli azure-functions-core-tools@4
cd api && npm install && cd ..
# læg COSMOS_CONNECTION_STRING og ADMIN_USERS i api/local.settings.json under "Values"
swa start ./ --api-location ./api
```
Login emuleres lokalt på `http://localhost:4280/.auth/login/aad` (du kan selv vælge rolle/bruger).

## Bemærkninger
- **Sikkerhed:** backend skriver altid på den indloggede brugers eget id – man kan ikke gemme på andres vegne, og kun admin kan læse andres uger.
- **Offline:** åbnes filen uden backend (fx direkte lokalt), falder den tilbage til at gemme i browseren på den enkelte enhed. Når den ligger på SWA med login, gemmes alt i Cosmos og deles mellem enheder.
- **Mobil:** på telefon/tablet foldes tabellen ud som kort pr. dag, inputfelter er ≥16px (ingen auto-zoom på iOS) og knapper er touch-venlige.
