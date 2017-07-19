# Postcard

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

## Docs
Run `postcard --help`.

## React component example

```
$ cat index.js
function Container(props) {
  return <div className="container">{props.children}</div>;
}

module.exports = <Container>
  <h1>Title</h1>
  <p>lorem ipsum dolar set amet.</p>
</Container>;

$ cat styles.scss
.container {
  background-color: white;
  max-width: 800px;
  margin: 20px auto;
}
$ # Postcard will combine together and minify the two sources!
$ postcard --react ./index.js --styles ./styles.js
<style>.container{background-color:#fff;max-width:800px;margin:20px auto}</style><div class=container style="background-color:#fff;max-width:800px;margin:20px auto"><h1>Title</h1><p>lorem ipsum dolar set amet.</p></div>
```

## HTML example
```
$ cat index.html
<div class="container">
  <h1>Title</h1>
  <p>lorem ipsum dolar set amet.</p>
</div>
$ cat styles.scss
.container {
  background-color: white;
  max-width: 800px;
  margin: 20px auto;
}
$ # Postcard will combine together and minify the two sources!
$ postcard --html ./index.html --styles ./styles.js
<style>.container{background-color:#fff;max-width:800px;margin:20px auto}</style><div class=container style="background-color:#fff;max-width:800px;margin:20px auto"><h1>Title</h1><p>lorem ipsum dolar set amet.</p></div>
```

## Gotchas
- When passing the `--react` parameter, the path is passed into a `require` call. This means
  a `./` at the beginning isn't implicit - do `--react ./index.js`, not `--react index.js`!
