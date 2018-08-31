# jitson

Just-In-Time JSON.parse compiler

```
npm install jitson
```

Works by schema sampling the incoming data and if the schema is stable, it
will compile a fast parser for it using [turbo-json-parse](https://github.com/mafintosh/turbo-json-parse)

## Usage

``` js
const jitson = require('jitson')

// make an instance
const parse = jitson()

for (var i = 0; i < 10; i++) {
  console.log(parse(JSON.stringify({hello: 'world', number: Math.random()})))
}

// Check if the compiler found a matching schema.
// If so it is using an optimised parser to parse the JSON
console.log(parse.schema)
```

## API

#### `const parse = jitson(opts)`

Create a new JSON parser.

Options include

```js
{
  sampleInterval: 100 // sample the schema everytime we parse 100 objects
}
```

It keeps a small internal cache around of old schemas that is used to produce a better parser.
If the cache is empty it will sample right away as well.

Any additional options are forwarded to [turbo-json-parse](https://github.com/mafintosh/turbo-json-parse)
when it triggers a parser compilation.

It works the best if you try to only pass data to it that has a schema so make
an instance for each of your http endpoints for example

#### `const object = parse(src)`

Similar to JSON.parse. Will schema sample the input once in a while
to check if it has a stable schema. If so it'll optimise the parser.

If the optimised parser fails it will fallback to JSON.parse and resample more data in future. If the optimised parser keeps failing it'll increase the sampling interval, to not waste too much time sampling and compiling.

If you are parsing from Node.js buffers make sure to pass that as the `src`
instead of `toString()`ing it first as that will produce a faster parser
when compiling.

## License

MIT
