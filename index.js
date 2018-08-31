const turbo = require('turbo-json-parse')

module.exports = jitson

function jitson (opts) {
  if (!opts) opts = {}

  const schemas = []
  const inputs = []
  const partial = !!opts.partial

  var sampleInterval = opts.sampleInterval || 100
  var tick = sampleInterval
  var compiled = null
  var failures = 0

  parsePartial.pointer = 0

  const result = partial ? parsePartial : parse
  result.recompiles = 0
  result.schema = null
  result.turbo = null
  return result

  function sample (src) {
    const data = JSON.parse(src)

    if (--tick > 0 && inputs.length === 8 && compiled) return data
    tick = sampleInterval

    if (inputs.length === 8) {
      inputs.shift()
      schemas.shift()
    }

    const sch = getSchema(data)
    if (!sch) return data

    inputs.push(src)
    schemas.push(sch)

    const schema = result.schema = joinSchemas(schemas)
    if (!schema) {
      if (++failures >= 7) {
        sampleInterval *= 2
      }
      return data
    }

    failures = 0
    opts.buffer = inputs.every(isBuffer)
    opts.defaults = false

    result.recompiles++
    compiled = result.turbo = turbo(schema, opts)
    return data
  }

  function parse (src) {
    try {
      if (compiled) return compiled(src, 0)
    } catch (err) {
      compiled = result.compiled = result.turbo = null
    }
    return sample(src)
  }

  function parsePartial (src, ptr) {
    try {
      if (compiled) {
        const data = compiled(src, ptr)
        parse.pointer = compiled.pointer
        return data
      }
    } catch (err) {}
    throw new Error('not impl')
  }
}

function isBuffer (buf) {
  return typeof buf !== 'string'
}

function getSchema (object) {
  const type = Array.isArray(object) ? 'array' : typeof object
  switch (type) {
    case 'number':
    case 'string':
    case 'boolean': {
      return { type }
    }

    case 'object': {
      if (!object) return null
      const res = { type: 'object', ordered: true, properties: {} }
      for (const key of Object.keys(object)) {
        const sch = res.properties[key] = getSchema(object[key])
        if (!sch) return null
      }
      return res
    }

    case 'array': {
      const res = { type: 'array', items: null }
      if (object.length) {
        res.items = getSchema(object[0])
        if (!res.items) return null
      }
      return res
    }
  }

  return null
}

function joinSchemas (samples) {
  if (!samples.length) return null
  const s = samples[0]

  if (samples.length === 1) return s

  for (const sample of samples) {
    if (!sample || sample.type !== s.type) return null
  }

  switch (s.type) {
    case 'number':
    case 'string':
    case 'boolean':
    case 'integer': {
      return { type: s.type }
    }

    case 'object': {
      const isOrdered = create()
      const res = { type: 'object', ordered: true, properties: {} }
      const props = {}

      for (const sample of samples) {
        if (res.ordered && !isOrdered(Object.keys(sample.properties))) {
          res.ordered = false
        }
        for (const prop of Object.keys(sample.properties)) {
          if (!props[prop]) props[prop] = []
          props[prop].push(sample.properties[prop])
        }
      }
      for (const prop of Object.keys(props)) {
        const val = res.properties[prop] = joinSchemas(props[prop])
        if (!val) return null
      }

      return res
    }

    case 'array': {
      const items = []
      for (const sample of samples) {
        if (sample.items) items.push(sample.items)
      }
      const res = { type: 'array', items: joinSchemas(items) }
      return items.length && !res.items ? null : res
    }
  }
}

function upsert (map, key, val) {
  if (map.has(key)) return map.get(key)
  map.set(key, val)
  return val
}

function create () {
  const lts = new Uint32Array(32)
  const gts = new Uint32Array(32)
  const tokens = new Map()

  return isOrdered

  function isOrdered (keys) {
    const ids = new Uint8Array(keys.length)

    for (var i = 0; i < keys.length; i++) {
      const id = upsert(tokens, keys[i], tokens.size)
      if (id >= 32) return false
      ids[i] = id
    }

    var l = 0
    var g = 0

    for (const id of ids) {
      l |= (1 << id)
    }

    for (const id of ids) {
      if (lts[id] & g) return false
      if (gts[id] & l) return false

      lts[id] |= l
      gts[id] |= g

      l &= ~(1 << id)
      g |= (1 << id)
    }

    return true
  }
}
