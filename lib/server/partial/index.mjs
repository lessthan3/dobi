import fs from 'fs';
import path from 'path';
import wrap from 'dobi-asset-wrap';
import { promisify } from 'util';
import { IS_PROD } from '../config.mjs';
import {
  getPackage,
  loadStylusVariables,
  readCSON,
} from '../helpers/index.mjs';

const asyncExists = promisify(fs.exists);

export default async (ctx) => {
  const { dobiConfig } = ctx.state;
  ctx.assert(dobiConfig, 500, 'getSchema: missing dobiConfig from state');
  const { pkgDir } = dobiConfig;
  ctx.assert(pkgDir, 500, 'getSchema: missing pkgDir from config.mjs');

  const { file } = ctx.request.query;

  const {
    ext,
    id,
    version,
  } = ctx.params;

  if (!file) {
    ctx.throw(400, 'file required');
  }

  // grab parameters
  const filePath = path.join(`${getPackage(pkgDir, id, version)}`, file);
  const targetExt = path.extname(filePath);
  const name = path.basename(file, targetExt);

  // make sure file exists
  const exists = await asyncExists(filePath);
  ctx.assert(
    exists,
    404,
    IS_PROD ? 'File does not exist' : `File ${file} does not exist`,
  );

  switch (ext) {
    // schema files
    case 'json': {
      try {
        const data = await readCSON(filePath);
        ctx.set('Content-Type', 'text/javascript');
        const pkg = `lt3.pkg["${id}"]["${version}"]`;
        ctx.body = `${pkg}.schema["${name}"] = ${JSON.stringify(data)}`;
        return;
      } catch (err) {
        ctx.throw(400, err);
        return;
      }
    }

    // source coffee-script
    case 'coffee': {
      const asset = new wrap.Asset({
        preprocess(_source) {
          let source = _source;
          const pkg = `lt3.pkg['${id}']['${version}']`;
          const p = `${pkg}.Presenters['${name}'] extends lt3.presenters`;
          const t = `${pkg}.Templates['${name}']`;
          const subs = [
            ['exports.Collection', `${p}.Collection`],
            ['exports.Object', `${p}.Object`],
            ['exports.Page', `${p}.Page`],
            ['exports.Presenter', `${p}.Presenter`],
            ['exports.Region', `${p}.Region`],
            ['exports.Template', `${t}`],
          ];
          for (const [original, replacement] of subs) {
            source = source.replace(original, replacement);
          }
          return source;
        },
        src: filePath,
      });

      try {
        await asset.wrap();
        ctx.set('Content-Type', 'text/coffeescript');
        ctx.body = asset.data;
        return;
      } catch (err) {
        ctx.throw(400, err);
        return;
      }
    }

    // presenters and templates
    case 'js':
    case 'js.map': {
      const asset = new wrap.Coffee({
        generated_file: ctx.url.replace('.js.map', '.js'),
        preprocess(_source) {
          let source = _source;
          const pkg = `lt3.pkg['${id}']['${version}']`;
          const p = `${pkg}.Presenters['${name}'] extends lt3.presenters`;
          const t = `${pkg}.Templates['${name}']`;
          const subs = [
            ['exports.Collection', `${p}.Collection`],
            ['exports.Object', `${p}.Object`],
            ['exports.Page', `${p}.Page`],
            ['exports.Presenter', `${p}.Presenter`],
            ['exports.Region', `${p}.Region`],
            ['exports.Template', `${t}`],
          ];
          for (const sub of Array.from(subs)) {
            source = source.replace(sub[0], sub[1]);
          }
          return source;
        },
        source_files: [
          ctx.url.replace(/(.js.map|.js)/, '.coffee'),
        ],
        source_map: true,
        src: filePath,
      });

      try {
        await asset.wrap();
        ctx.set('Content-TYpe', 'text/javascript');
        if (ext === 'js') {
          const sourceMapUrl = ctx.url.replace('.js', '.js.map');
          ctx.set('X-SourceMap', sourceMapUrl);
          ctx.body = asset.data;
          return;
        }
        ctx.body = asset.v3_source_map;
        return;
      } catch (err) {
        ctx.throw(400, err);
        return;
      }
    }

    // style files
    case 'css': {
      // check for style/variables.styl
      const root = getPackage(pkgDir, id, version);
      const variablesCode = await loadStylusVariables(root);
      const asset = new wrap.Stylus({

        preprocess(_source) {
          let source = _source;
          const updatedVersion = version.replace(/\./g, '-');

          const p = `.${id}.v${updatedVersion} .${name}`;
          const subs = [
            ['.exports.collection', `${p}.collection`],
            ['.exports.object', `${p}.object`],
            ['.exports.page', `${p}.object`],
            ['.exports.presenter', `${p}.presenter`],
            ['.exports.region', `${p}.region`],
          ];
          for (const [original, replacement] of subs) {
            source = source.replace(new RegExp(original, 'g'), replacement);
          }

          // ex: html.exports -> html.artist-hq.v3-0-0
          source = source.replace(/.exports/g, `.${id}.v${updatedVersion}`);

          // add variables code
          return variablesCode + source;
        },
        src: filePath,
        vars: ctx.request.query,
        vars_prefix: '$',
      });

      try {
        await asset.wrap();
        ctx.set('Content-Type', 'text/css');
        ctx.body = asset.data;
        return;
      } catch (err) {
        ctx.throw(400, err);
        return;
      }
    }
    default: {
      ctx.throw(400, 'invalid file type');
    }
  }
};
