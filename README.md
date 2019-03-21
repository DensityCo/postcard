# Postcard

[![CircleCI](https://circleci.com/gh/DensityCo/postcard/tree/master.svg?style=svg)](https://circleci.com/gh/DensityCo/postcard/tree/master)

A email generator written in React.

HTML emails are hard. Ideally, we want to support [various email clients, ancient and
modern](https://www.campaignmonitor.com/css/) while also being able to write the email in modern
technologies we are familiar with and use throughout our system.

Postcard is a tool that allows html emails to be written in React (or HTML) and styled with scss. As
input, you provide a tree of stateless components and some scss, and we'll do a couple things:
- Render the scss to css.
- Render the React component tree with `react-dom/server`'s `renderToStaticMarkup`. This is why the
  components should be stateless - the components are only rendered once and are used purely as a
  way to break up the email into reusable chunks.
- Inline all styles into the html. Some email clients strip out all style tags and therefore
  inlining styles into each html element is the only way to ensure they will be properly styled.
  This tool uses [Mailchimp's CSS inliner](https://templates.mailchimp.com/resources/inline-css/).
- The HTML is minified to reduce byte count using the `html-minifier` package.

## Installation
NOTE: node `>= v7.6` is required for use of `async`/`await`, which this package requires.

`npm install -g @density/postcard`

## Documentation
Run `postcard --help`.

## React component example

```
$ cat index.js
function Container(props) {
  return <div className="container">{props.children}</div>;
}

// A postcard module must defaultly export a function that will be called with render parameters.
// Right now the only parameter is `head`, which is some jsx that must be injected into the <head>
// of your email.
module.exports = ({head}) => (
  <html>
    <head>
      {/* head data is injected below */}
      {head}
    </head>
    <body>
      <Container>
        <h1>Title</h1>
        <p>lorem ipsum dolar set amet.</p>
      </Container>
    </body>
  </html>
);

$ cat styles.scss
.container {
  background-color: white;
  max-width: 800px;
  margin: 20px auto;
}
$ # Postcard will combine together and minify the two sources!
$ postcard ./index.js --styles ./styles.js
<style>.container{background-color:#fff;max-width:800px;margin:20px auto}</style><div class=container style="background-color:#fff;max-width:800px;margin:20px auto"><h1>Title</h1><p>lorem ipsum dolar set amet.</p></div>
```
