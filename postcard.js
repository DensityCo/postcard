#!/usr/bin/env node

const fs = require('fsp');
const argv = require('minimist')(process.argv.slice(2));
const fetch = require('node-fetch');
const minify = require('html-minifier').minify;
const reactDOM = require('react-dom/server');
const htmlToText = require('html-to-text');

// Register babel to be used with any required react components.
require('babel-register')({
  presets: ['es2015', 'react'],
});
// Also, set react as a global so that all react components don't have to manually import `React`.
// This is done for convenience but more importantly because we want to control what version of
// React is used so that it matches the version of `react-dom` that is used in postcard.
global.React = require('react');

// Wrap sass renderer in a promise.
const sass = require('node-sass');
function sassRender(options) {
  return new Promise((resolve, reject) => {
    return sass.render(options, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// When passed an error, complain loudly then parish.
function die(err) {
  console.log(err);
  process.exit(1);
}

async function postcard(options) {
  // Step one: read html, or render a react component.
  let html;
  if (options.html) {
    // Render html from a file.
    html = await fs.readFileP(options.html);
  } else if (options.react) {
    // Or render a react component to a string.
    const component = require(options.react);
    html = reactDOM.renderToStaticMarkup(component.default || component);
  } else {
    throw new Error('No source passed - please pass a html file or a react component with --react.');
  }

  // Step two: render sass to css.
  let stylesheet = '';
  if (options.styles) {
    const styleData = await fs.readFileP(options.styles);
    const {css} = await sassRender({
      data: styleData.toString(),
      includePaths: ['.'],
    });
    stylesheet = css.toString();
  }

  // Step three: inline all styles.
  let data = html;
  if (stylesheet && stylesheet.length > 0) {
    data = `<style>${stylesheet}</style>${data}`;
  }
  const inlineResponse = await fetch('https://templates.mailchimp.com/services/inline-css/', {
    method: 'POST',
    body: `html=${encodeURI(data)}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  });

  let inlined;
  if (inlineResponse.ok) {
    inlined = await inlineResponse.text();
  } else {
    throw new Error(`Mailchimp wasn't able to inline css: ${await inlineResponse.json()}`);
  }

  // Step four: minify html to reduce byte count as much as possible.
  const minified = minify(inlined, {
    // The below are from https://www.npmjs.com/package/html-minifier#options-quick-reference.
    // TODO: are there any others that could be safely done? Or is this good enough?
    html5: true,
    useShortDoctype: true,
    removeAttributeQuotes: true,
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true,
  });

  // If plaintext is expected, then strip out all html tags.
  if (options.plaintext) {
    return htmlToText.fromString(minified, {});
  } else {
    return minified;
  }
}

// Export for use in commonjs / es6 modules.
module.exports = postcard;
module.exports.default = postcard;

// If called as a command line tool, then render an email.
if (require.main === module) {
  // Parse all passed options.
  const options = {
    html: argv.html || argv._[0] || null,
    react: argv.react,
    styles: argv.styles || argv.scss || argv.css || null,
    plaintext: argv.plaintext || argv.text || argv.txt,
    help: argv.help || argv.h || argv['?'],
  };

  if (options.help) {
    console.log('./postcard [OPTIONS] [html input file]');
    console.log('Options:')
    console.log('* --styles: Pass an optional stylesheet to be added to the email. Supports sass.');
    console.log('* --plaintext: Output the email in plain text form, stripping out all html tags.');
    console.log();
    console.log('Output is printed to stdout. All logs are printed to stderr to easily facilitate piping logs to one place and the output to another place.');
    console.log();
    console.log('Example:');
    console.log('* ./postcard --styles foo.scss index.html');
  }

  postcard(options).then(minified => {
    console.log(minified);
  }).catch(die);
}
