import { isStateLevelQuery } from '../utils/lookupDisambiguation.js'

const cases = [
  {
    name: 'state name -> state-level',
    query: 'texas',
    result: {
      addresstype: 'state',
      type: 'administrative',
      osm_type: 'relation',
      importance: 0.88,
      address: { state: 'Texas' }
    },
    expected: true
  },
  {
    name: 'state abbreviation -> state-level',
    query: 'TX',
    result: {
      addresstype: 'state',
      type: 'administrative',
      osm_type: 'relation',
      importance: 0.88,
      address: { state: 'Texas' }
    },
    expected: true
  },
  {
    name: 'city query should not be state-level',
    query: 'Austin',
    result: {
      addresstype: 'city',
      type: 'administrative',
      osm_type: 'relation',
      importance: 0.82,
      address: { city: 'Austin', state: 'Texas', county: 'Travis County' }
    },
    expected: false
  },
  {
    name: 'county query should not be state-level',
    query: 'Travis County',
    result: {
      addresstype: 'county',
      type: 'administrative',
      osm_type: 'relation',
      importance: 0.82,
      address: { county: 'Travis County', state: 'Texas' }
    },
    expected: false
  }
]

let failures = 0

for (const testCase of cases) {
  const actual = isStateLevelQuery(testCase.query, testCase.result)
  if (actual !== testCase.expected) {
    failures += 1
    console.error(`✗ ${testCase.name}: expected ${testCase.expected}, got ${actual}`)
  } else {
    console.log(`✓ ${testCase.name}`)
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}

console.log('\nAll disambiguation checks passed')
