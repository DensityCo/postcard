const assert = require('assert');
const mockFs = require('mock-fs');
const postcard = require('./postcard');

afterEach(done => {
  mockFs.restore();
  setTimeout(() => done(), 100);
});

/* So a little preface before looking at these tests... Since postcard uses an internet
 * connection to inline all styles (mailchimp's inliner), it requires an internet connection.
 * Which means the tests take a bit to run. Better than nothing, but not great. Sorry.
 */

it('should output an email with a react component and a stylesheet', async () => {
  mockFs({
    // A really basic component.
    '/index.js': `module.exports = ({head}) => {
      return React.createElement('html', {},
        React.createElement('head', {}, head),
        React.createElement('body', {},
          React.createElement('p', {}, 'foo')
        )
      );
    }`,
    '/styles.scss': 'p { color: red; }',
  });

  const response = await postcard({
    react: '/index.js',
    styles: '/styles.scss',
  });

  assert.deepEqual(
    response,
    '<html><head><style>p {\n  color: red; }\n</style></head><body><p style="color: red;">foo</p></body></html>'
  );
});
it('should output an email with a react component and stylesheet prefixed with some content', async () => {
  mockFs({
    // A really basic component.
    '/index.js': `module.exports = ({head}) => {
      return React.createElement('html', {},
        React.createElement('head', {}, head),
        React.createElement('body', {},
          React.createElement('p', {}, 'foo')
        )
      );
    }`,
    '/styles.scss': 'p { color: red; }',
  });

  const response = await postcard({
    react: '/index.js',
    styles: '/styles.scss',
    prefix: 'my prefix',
    suffix: 'my suffix',
  });

  assert.deepEqual(
    response,
    'my prefix<html><head><style>p {\n  color: red; }\n</style></head><body><p style="color: red;">foo</p></body></html>my suffix'
  );
});

it('should output an email with a react component in plaintext', async () => {
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
