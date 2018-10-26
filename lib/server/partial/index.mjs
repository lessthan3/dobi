import fs from 'fs';
import path from 'path';
import wrap from 'dobi-asset-wrap';
import { promisify } from 'util';
import { IS_PROD } from '../config';
import {
  error,
  getPackage,
  loadStylusVariables,
  readCSON,
  setContentType,
} from '../helpers';

const asyncExists = promisify(fs.exists);

export default pkgDir => async (req, res) => {
  const {
    params: {
      ext,
      id,
      version,
    },
    query: {
      file,
    },
  } = req;

  if (!file) {
    return error(res, 400, 'file required');
  }

  // grab parameters
  const filePath = path.join(`${getPackage(pkgDir, id, version)}`, file);
  const targetExt = path.extname(filePath);
  const name = path.basename(file, targetExt);

  // make sure file exists
  const exists = await asyncExists(filePath);

  if (!exists) {
    if (IS_PROD) {
      return error(res, 404, 'File does not exist');
    }
    return error(res, 404, `File ${file} does not exist`);
  }

  switch (ext) {
    // schema files
    case 'json': {
      try {
        const data = await readCSON(filePath);
        setContentType(res, 'text/javascript');
        const pkg = `lt3.pkg["${id}"]["${version}"]`;
        return res.send(`${pkg}.schema["${name}"] = ${JSON.stringify(data)}`);
      } catch (err) {
        return error(res, 400, err);
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
        setContentType(res, 'text/coffeescript');
        return res.send(asset.data);
      } catch (err) {
        return error(res, 400, err);
      }
    }

    // presenters and templates
    case 'js':
    case 'js.map': {
      const asset = new wrap.Coffee({
        generated_file: req.url.replace('.js.map', '.js'),
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
          req.url.replace(/(.js.map|.js)/, '.coffee'),
        ],
        source_map: true,
        src: filePath,
      });

      try {
        await asset.wrap();
        setContentType(res, 'text/javascript');
        if (ext === 'js') {
          const sourceMapUrl = req.url.replace('.js', '.js.map');
          res.set('X-SourceMap', sourceMapUrl);
          return res.send(asset.data);
        }
        return res.send(asset.v3_source_map);
      } catch (err) {
        return error(res, 400, err);
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
        vars: req.query,
        vars_prefix: '$',
      });

      try {
        await asset.wrap();
        setContentType(res, 'text/css');
        return res.send(asset.data);
      } catch (err) {
        return error(400, err);
      }
    }
    default: {
      return error(400, 'invalid file type');
    }
  }
};
