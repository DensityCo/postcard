#!/usr/bin/env node
const path = require('path');
const fs = require('fsp');
const argv = require('minimist')(process.argv.slice(2));
const fetch = require('node-fetch');
const minify = require('html-minifier').minify;
const reactDOM = require('react-dom/server');
const react = require('react');
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
  // Step one: render sass to css.
  let stylesheet = '';
  if (options.styles) {
    const styleData = await fs.readFileP(options.styles);
    const {css} = await sassRender({
      data: styleData.toString(),
      includePaths: ['.'],
    });
    stylesheet = css.toString();
  }

  // Step two: render the react component.
  if (!options.react) {
    throw new Error('No source passed - please pass a react component with --react.');
  }

  // Non absolute paths should be prepended with the pwd
  if (!options.react.startsWith('/')) {
    options.react = path.join(process.cwd(), options.react);
  }

  // Render the component.
  const exported = require(options.react);
  const component = exported.default || exported;
  if (typeof component !== 'function') {
    throw new Error(`${options.react} should defaultly export a function that returns jsx!`);
  }
  const jsx = component({
    // The email should include this head value in its head to that we can inject styles (and
    // maybe more in the future, made it general on purpose) into the correct location into the
    // document.
    head: (
      React.createElement(React.Fragment, {},
        // Add stylesheet into the head of the document
        React.createElement('style', {}, stylesheet)
      )
    )
  });
  let data = reactDOM.renderToStaticMarkup(jsx);

  // Step three: inline all styles.
  const inlineResponse = await fetch('https://templates.mailchimp.com/services/inline-css/', {
    method: 'POST',
    body: `html=${encodeURIComponent(data)}`,
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
  let minified = minify(inlined, {
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

  if (options.prefix) {
    minified = `${options.prefix}${minified}`;
  }
  if (options.suffix) {
    minified = `${minified}${options.suffix}`;
  }

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
    react: argv.react || argv._[0] || null,
    styles: argv.styles || argv.scss || argv.css || null,
    plaintext: argv.plaintext || argv.text || argv.txt,
    prefix: argv.prefix,
    suffix: argv.suffix,
    help: argv.help || argv.h || argv['?'],
  };

  if (options.help) {
    console.log('./postcard [OPTIONS] [javascript file containing react component]');
    console.log('Options:')
    console.log('* --styles: Pass an optional stylesheet to be added to the email. Supports sass.');
    console.log('* --plaintext: Output the email in plain text form, stripping out all html tags.');
    console.log('* --prefix: Define content to add before the document.');
    console.log('* --suffix: Define content to add after the document.');
    console.log();
    console.log('Output is printed to stdout. All logs are printed to stderr to easily facilitate piping logs to one place and the output to another place.');
    console.log();
    console.log('Example:');
    console.log('* ./postcard --styles foo.scss index.js');
  }

  postcard(options).then(minified => {
    console.log(minified);
  }).catch(die);
}
