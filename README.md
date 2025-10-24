Dobi will be available for use in the near future. If you'd like to play around
before then, contact us at dobi@lessthan3.com.

# Dobi.io

Dobi is an ultra-simple environment for building scalable, real-time web
applications.

With Dobi you write apps...

* in Coffee-Script (or javascript, but please don't)
* with client-side rendering (only send data over the wire)
* with real-time functionality by simply referencing variables
* build schemas with simple json objects (no more complicated ORMs)
* that scale to 100k+ users without hosting your own servers
* on Linux, Mac, or Windows
* in any editing environment you prefer

Documentation is available at http://www.dobi.io

## Configuration

Dobi 7.0+ uses explicit environment variables for configuration instead of relying on `NODE_ENV`.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DOBI_PKG_DIR` | `dist` | Package directory to serve from. Set to `pkg` to serve source files directly (slower). |
| `DOBI_ENABLE_DEV_ROUTES` | `true` | Enable development routes like `/connect` and `/partial`. Set to `false` in production. |
| `DOBI_STRIP_SENSITIVE_CONFIG` | `false` | Strip sensitive information (author, changelog, contact) from config. Set to `true` in production. |
| `DOBI_VERBOSE_ERRORS` | `true` | Show file paths in error messages. Set to `false` in production for security. |
| `DOBI_USE_COMPRESSION` | `false` | Compress JavaScript and CSS output. Set to `true` in production. |
| `DOBI_DEBUG` | `undefined` | Enable debug logging. |

### Production Configuration Example

```bash
DOBI_PKG_DIR=dist \
DOBI_ENABLE_DEV_ROUTES=false \
DOBI_STRIP_SENSITIVE_CONFIG=true \
DOBI_VERBOSE_ERRORS=false \
DOBI_USE_COMPRESSION=true \
npm start
```

### Development Configuration (Default)

Development works out of the box with sensible defaults:

```bash
npm run dev  # Uses default settings
```

### Build System

Dobi 7.0 uses the same code path for both development and production:

1. **Build packages once:**
   ```bash
   dobi build app/pkg app/dist
   ```

2. **Server reads from dist/ by default:**
   - Pre-built files are served instantly
   - Falls back to build-on-demand if file missing
   - Dev and prod use identical logic

3. **Watch mode rebuilds changed packages:**
   - Enabled by default in development
   - Auto-rebuilds when source files change

## Migrating from 6.x to 7.0

Version 7.0 includes breaking changes to improve dev/prod parity and configuration clarity.

### Key Changes

1. **`NODE_ENV` no longer controls application behavior**
   - Use `DOBI_*` environment variables instead
   - `NODE_ENV` is now free for Node.js runtime optimizations

2. **Default package directory changed from `pkg` to `dist`**
   - Build your packages: `dobi build app/pkg app/dist`
   - Or set `DOBI_PKG_DIR=pkg` to use source files

3. **Dev and prod now use the same code path**
   - Both read from `dist/` by default
   - Both fall back to build-on-demand if file missing
   - Eliminates "works in dev but not prod" issues

### Migration Steps

1. **Update your build process:**
   ```bash
   # Add to your CI/deployment scripts
   dobi build app/pkg app/dist
   ```

2. **Update production environment variables:**
   ```bash
   # Replace NODE_ENV=production with:
   DOBI_ENABLE_DEV_ROUTES=false
   DOBI_STRIP_SENSITIVE_CONFIG=true
   DOBI_VERBOSE_ERRORS=false
   DOBI_USE_COMPRESSION=true
   ```

3. **Test locally with production settings:**
   ```bash
   # Build and test
   dobi build app/pkg app/dist
   DOBI_ENABLE_DEV_ROUTES=false npm start
   ```

4. **If using `dobi-server.js` config:**
   - The file can now use ES6 modules: `export const data = {...}`
   - Older formats still work

## Quick Start

Prerequisites:

- install node: (http://nodejs.org/download/)
- install coffee-script: `npm install -g coffee-script`

Install Dobi:

    npm install -g dobi

Setup a dobi workspace

    cd ~ ; mkdir workspace ; cd workspace
    dobi init

Login:

    dobi login

Create a new app:

    dobi create my-app@1.0.0

Create a website using your app:

    dobi install my-app@1.0.0 site-slug

Deploy it to the world:

    dobi deploy my-app

View your site, running your new app:

    dobi open site-slug

## Examples

* 2014.ultraeurope.com
* 2014.ultramusicfestival.com
* 2015.ultramusicfestival.com
* askimu.ironman.com
* edccurated.insomniac.com
* explore.maestro.io
* info.maestro.io
* live.capcomprotour.com
* live.centurionboats.com
* live.deadmau5.com
* live.esl-one.com
* live.esports-conference.com
* live.eversport.tv
* live.heroicrecordings.com
* live.monstercat.com
* live.movistarchile.tv
* live.nolchashows.com
* live.peakmind.org
* live.power106.com
* live.renmanmb.com
* live.silk-music.com
* live.stustaculum.de
* live.tbrownltd.com
* live.thebpmfestival.com
* live.ultramusicfestival.com
* music.digicelgroup.com
* scheduler.insomniac.com
* tv.moceandistrict.com
* tv.nickyromero.com
* tv.steveaoki.com
* www.3lau.com
* www.amsterdammusicfestival.tv
* www.audiendj.com
* www.battleviewer.com
* www.crosscounter.tv
* www.deltavcapital.com
* www.djbobbypuma.com
* www.dobi.io
* www.dzekoandtorres.com
* www.elrealomega.com
* www.ibizauncut.com
* www.jalenanderic.com
* www.martingarrix.com
* www.meshblorg.com
* www.morgan-page.com
* www.motiofficial.com
* www.musicalfreedom.com
* www.netwrkmgmt.com
* www.noisehouse.com
* www.papigordo.com
* www.porterrobinson.com
* www.richarddurand.com
* www.slanderofficial.com
* www.thebpmfestival.com
* www.throughtimeand.space
