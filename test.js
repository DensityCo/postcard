const assert = require('assert');
const mockFs = require('mock-fs');
const postcard = require('./postcard');

afterEach(() => {
  mockFs.restore();
});

/* So a little preface before looking at these tests... Since postcard uses an internet
 * connection to inline all styles (mailchimp's inliner), it requires an internet connection.
 * Which means the tests take a bit to run. Better than nothing, but not great. Sorry.
 */

it('should output an email with a file', async () => {
  mockFs({
    '/index.html': '<h1>Foo</h1>'
  });

  const response = await postcard({
    html: '/index.html',
  });

  assert.deepEqual(response, '<h1>Foo</h1>');
});
it('should output an email with a file and stylesheet (and inline the stylesheet)', async () => {
  mockFs({
    '/index.html': '<h1>Foo</h1>',
    '/styles.scss': 'h1 { color: red; }',
  });

  const response = await postcard({
    html: '/index.html',
    styles: '/styles.scss',
  });

  assert.deepEqual(response, '<style>h1{color:red}</style><h1 style=color:red>Foo</h1>');
});
it('should output an email with a react component and a stylesheet', async () => {
  mockFs({
    // A really basic component.
    '/index.js': `module.exports = React.createElement('p', {}, 'foo')`,
    '/styles.scss': 'p { color: red; }',
  });

  const response = await postcard({
    react: '/index.js',
    styles: '/styles.scss',
  });

  assert.deepEqual(response, '<style>p{color:red}</style><p style=color:red>foo</p>');
});
it('should output an email with a react component and a stylesheet in plaintext', async () => {
  mockFs({
    // A really basic component.
    '/index.js': `module.exports = React.createElement('p', {}, 'foo')`,
    '/styles.scss': 'p { color: red; }',
  });

  const response = await postcard({
    react: '/index.js',
    styles: '/styles.scss',
    plaintext: true,
  });

  assert.deepEqual(response, 'foo');
});
