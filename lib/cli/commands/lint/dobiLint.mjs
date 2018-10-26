// dependencies
import coffeeLint from 'coffeelint';
import colors from 'colors';
import cson from 'season';
import jsonLint from 'jsonlint';
import path from 'path';
import stylusHelp from 'stylus-help';
import { asyncExists, asyncReadFile } from '../../../utils';
import dirname from './dirname';

const { cyan, green, red } = colors;
const EXTENSIONS = ['coffee', 'cson', 'styl'];

const read = async (fileName) => {
  const exists = await asyncExists(fileName);
  if (!exists) {
    throw new Error(`file not found: ${fileName} `);
  }
  return asyncReadFile(fileName, 'utf-8');
};

export default class DobiLint {
  constructor(fileName) {
    this.fileName = fileName;
    this.ERRORS = [];
    this.exitCode = 0;
    this.ext = path.extname(fileName).slice(1);
  }

  static log(...args) {
    const c = console; return c.log.apply(null, args);
  }

  fail(lineNumber, message, line) {
    this.ERRORS.push({ line, lineNumber, message });
  }

  // console log statements are not allowed
  testConsoleStatements() {
    const period = String.fromCharCode(46);
    const msg = `console${period}log statements are not allowed`;
    for (let index = 0; index < this.lines.length; index++) {
      const line = this.lines[index];
      if (/console\.log/.test(line)) {
        this.fail(index + 1, msg, line);
      }
    }
  }

  testCsonParsing() {
    // make sure cson files are parsable
    if (this.ext === 'cson') {
      try {
        cson.readFileSync(this.fileName);
      } catch (error) {
        if (error.constructor === SyntaxError) {
          this.fail(error.location.first_line, error.toString());
        } else {
          this.fail('unknown', error);
        }
      }
    }
  }

  // lint all edited coffee files
  async lintCoffeeFiles() {
    if (this.ext === 'coffee') {
      const configString = await read(`${dirname}/lint.json`);
      const config = JSON.parse(configString);
      const errors = coffeeLint.lint(this.contents, config);
      for (const err of errors) {
        if (err.level !== 'error') { continue; }
        this.fail(err.lineNumber, err.message, err.line);
      }
    }
  }

  // require empty line before 'when' in switch statements
  // except when doing a short when... then... statement
  testEmptyLineBeforeSwitch() {
    const msg = 'An empty line is required before a \'when\' statement';
    if (this.ext === 'coffee') {
      for (let index = 0; index < this.lines.length; index++) {
        const line = this.lines[index];
        if (/^(\s)*when[\s(]/.test(line)) {
          if (line.indexOf('then') > 0) { continue; }
          const prev = this.lines[index - 1];
          if ((prev !== '') && !/^(\s)*#/.test(prev)) {
            this.fail(index + 1, msg, line);
          }
        }
      }
    }
  }

  // make sure json files are parsable
  testJsonParsing() {
    if (this.ext === 'json') {
      try {
        jsonLint.parse(this.contents);
      } catch (error) {
        const match = /error\son\sline\s(\d)+/.exec(error);
        const lineNumber = match ? match[1] : null;
        this.fail(lineNumber, error.toString());
      }
    }
  }

  // watch out for merge conflicts
  testMergeConflicts() {
    const msg = 'Please fix your merge conflicts.';
    for (let index = 0; index < this.lines.length; index++) {
      const line = this.lines[index];
      if (/^(<<<<|====|>>>>)+.*$/.test(line)) {
        this.fail(index + 1, msg, line);
      }
    }
  }

  // not allowed to have multiple empty lines
  testMultipleEmptyLines() {
    const msg = 'Too many empty lines in a row. Only 1 allowed';
    for (let index = 0; index < this.lines.length; index++) {
      const line = this.lines[index];
      const re = /^$/;
      const nextLine = this.lines[index + 1];
      if (re.test(line) && re.test(nextLine)) {
        this.fail(index, msg, this.lines[index]);
      }
    }
  }

  // coffee - require a space after the #
  testSpaceAfterCoffeeCommentSymbol() {
    const msg = 'a single space is required after the # of a comment';
    if (this.ext === 'coffee') {
      for (let index = 0; index < this.lines.length; index++) {
        const line = this.lines[index];
        if (/^(\s)*#[^\s=#{]/.test(line)) {
          this.fail(index + 1, msg, line);
        }
      }
    }
  }

  // - require an empty line on the previous line
  testEmptyLineBeforeCoffeeComments() {
    if (this.ext === 'coffee') {
      const msg = 'an empty line is required prior to a single line comment';
      for (let index = 0; index < this.lines.length; index++) {
        const line = this.lines[index];
        if (/^(\s)*#\s/.test(line)) {
          const prev = this.lines[index - 1];
          if ((prev !== '') && !(/^(\s)*#/.test(prev))) {
            this.fail(index + 1, msg, line);
          }
        }
      }
    }
  }

  // dont allow excess parenthesis or spacing
  testExcessCoffeeSymbols() {
    if (this.ext === 'coffee') {
      /*
        * string starts
        * whitespace 0 or more
        * not : or # or ( or ) or whitespace 1 or more [CAPTURED]
        * grab (
        * grab all non ) characters (atleast 1)
        * find a )
        * string ends
      */
      /* sample catches
        $wrap = @$el.find('> .background.temp')
        $el = if e then $(e.currentTarget) else @$el.find('.footer span').eq(0)
        $others = @$el.find('.filter').not($filter)
      */

      /* ignores because of repeated .data function
        $(a).data('index') - $(b).data('index')
      */
      const msg = 'excess parenthesis or spacing detected';
      for (let index = 0; index < this.lines.length; index++) {
        const line = this.lines[index];
        const lineMatch = line.match(/\s*([^:#()\s]+)\([^)]+\)$/);
        const match = lineMatch ? lineMatch[1] : null;

        // if the function used more than once in the same
        // line then allow it
        if (match && (line.indexOf(match) === line.lastIndexOf(match))) {
          this.fail(index + 1, msg, line);
        }
      }
    }
  }

  // must be no spaces before a comma
  testSpaceBeforeCommas() {
    const msg = 'No spaces allowed before a comma';
    for (let index = 0; index < this.lines.length; index++) {
      const line = this.lines[index];
      if (/\s,/.test(line)) {
        if (line.indexOf('Regex') > 0) { continue; } // in a regex
        if (line.indexOf(' /') > 0) { continue; } // in a regex
        if (line.indexOf('(/') > 0) { continue; } // in a regex
        if (/".*,.*"/.test(line)) { continue; } // in a string
        if (/'.*,.*'/.test(line)) { continue; } // in a string
        this.fail(index + 1, msg, line);
      }
    }
  }

  testSpaceAfterCommas() {
    // require a space after a comma
    // stylus catches it's own way
    const msg = 'Must include a space after a comma';
    if (['coffee', 'cson'].includes(this.ext)) {
      for (let index = 0; index < this.lines.length; index++) {
        const line = this.lines[index];
        if (/,[^\s']/.test(line)) {
          if (line.indexOf('Regex') > 0) { continue; }
          if (line.indexOf(' /') > 0) { continue; } // in a regex
          if (line.indexOf('(/') > 0) { continue; } // in a regex
          if (/{[0-9,]*}/.test(line)) { continue; } // in a regex
          if (/".*,.*"/.test(line)) { continue; } // in a string
          if (/'.*,.*'/.test(line)) { continue; } // in a string
          this.fail(index + 1, msg, line);
        }
      }
    }
  }

  testStylusFiles() {
    // TODO: lint stylus files
    if (this.ext === 'styl') {
      // Config data for custom linting
      // Just flag Jason if it is giving you trouble
      const errors = stylusHelp.processData('simple_lint', [this.fileName]);
      for (const data of Object.values(errors)) {
        for (let index = 0; index < data.length; index++) {
          const infraction = data[index];
          this.fail(infraction.line_num, infraction.message, infraction.line);
        }
      }
    }
  }

  // tabs are not allowed
  testTabs() {
    const msg = 'Tabs are not allowed. Please use spaces';
    for (let index = 0; index < this.lines.length; index++) {
      const line = this.lines[index];
      if (/\t/.test(line)) {
        this.fail(index + 1, msg, line);
      }
    }
  }

  // trailing commas not allowed is not allowed
  testTrailingCommas() {
    const msg = 'Trailing commas are not allowed';
    for (let index = 0; index < this.lines.length; index++) {
      const line = this.lines[index];
      if (/,$/.test(line)) {
        this.fail(index + 1, msg, line);
      }
    }
  }

  // trailing whitespace is not allowed
  testTrailingWhitespace() {
    const msg = 'Trailing whitespace is not allowed';
    for (let index = 0; index < this.lines.length; index++) {
      const line = this.lines[index];
      if (/\s$/.test(line)) {
        this.fail(index + 1, msg, line);
      }
    }
  }

  async lint() {
    this.contents = await read(this.fileName);
    this.lines = this.contents.split('\n');

    // only check certain extensions
    if (!EXTENSIONS.includes(this.ext)) {
      return 0;
    }

    await this.lintCoffeeFiles();
    this.testConsoleStatements();
    this.testCsonParsing();
    this.testEmptyLineBeforeCoffeeComments();
    this.testEmptyLineBeforeSwitch();
    this.testExcessCoffeeSymbols();
    this.testJsonParsing();
    this.testMergeConflicts();
    this.testMultipleEmptyLines();
    this.testSpaceAfterCoffeeCommentSymbol();
    this.testSpaceAfterCommas();
    this.testSpaceBeforeCommas();
    this.testStylusFiles();
    this.testTabs();
    this.testTrailingCommas();
    this.testTrailingWhitespace();

    // output
    if (this.ERRORS.length) {
      this.exitCode = 1;
      DobiLint.log('[dobi-lint]', green(this.fileName));

      const ERRORS = this.ERRORS.sort((a, b) => a.lineNumber - b.lineNumber);
      for (const { line, lineNumber, message } of ERRORS) {
        DobiLint.log('[dobi-lint]', `${red(`#${lineNumber}`)}:`, message);
        if (line) {
          let indent = '';
          for (let i = 0; i < `${lineNumber}`.length + 3; i++) {
            indent += ' ';
          }
          const logLine = line.replace(/\s*(.*)/, `${indent}$1`);
          DobiLint.log('[dobi-lint]', cyan(logLine));
        }
        DobiLint.log('');
      }
    }
    return this.exitCode;
  }
}
