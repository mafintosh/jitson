const jitson = require('./')

// make an instance
const parse = jitson()

for (var i = 0; i < 10; i++) {
  console.log(parse(JSON.stringify({ hello: 'world', number: Math.random() })))
}

// Check if the compiler found a matching schema.
// If so it is using an optimised parser to parse the JSON
console.log(parse.schema)
