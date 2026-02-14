const US_STATE_ABBREVIATIONS = {
  alabama: 'al', alaska: 'ak', arizona: 'az', arkansas: 'ar', california: 'ca', colorado: 'co',
  connecticut: 'ct', delaware: 'de', florida: 'fl', georgia: 'ga', hawaii: 'hi', idaho: 'id',
  illinois: 'il', indiana: 'in', iowa: 'ia', kansas: 'ks', kentucky: 'ky', louisiana: 'la',
  maine: 'me', maryland: 'md', massachusetts: 'ma', michigan: 'mi', minnesota: 'mn',
  mississippi: 'ms', missouri: 'mo', montana: 'mt', nebraska: 'ne', nevada: 'nv',
  'new hampshire': 'nh', 'new jersey': 'nj', 'new mexico': 'nm', 'new york': 'ny',
  'north carolina': 'nc', 'north dakota': 'nd', ohio: 'oh', oklahoma: 'ok', oregon: 'or',
  pennsylvania: 'pa', 'rhode island': 'ri', 'south carolina': 'sc', 'south dakota': 'sd',
  tennessee: 'tn', texas: 'tx', utah: 'ut', vermont: 'vt', virginia: 'va', washington: 'wa',
  'west virginia': 'wv', wisconsin: 'wi', wyoming: 'wy',
  'district of columbia': 'dc'
}

export function normalizeLocationText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
}

export function isStateLevelQuery(locationQuery, result) {
  const normalizedQuery = normalizeLocationText(locationQuery)
  if (!normalizedQuery) return false

  const normalizedState = normalizeLocationText(result?.address?.state)
  const normalizedCounty = normalizeLocationText(result?.address?.county)
  const normalizedCity = normalizeLocationText(
    result?.address?.city || result?.address?.town || result?.address?.village
  )
  const normalizedAddresstype = normalizeLocationText(result?.addresstype)

  if (!normalizedState) return false

  const queryMatchesFullStateName = normalizedQuery === normalizedState
  const stateAbbrev = US_STATE_ABBREVIATIONS[normalizedState]
  const queryMatchesStateAbbrev = !!stateAbbrev && normalizedQuery === stateAbbrev

  const isExplicitStateResult = normalizedAddresstype === 'state'
  const looksLikeStateBoundary = (result?.type === 'administrative' || result?.type === 'boundary' || result?.osm_type === 'relation')
    && result?.importance
    && result.importance > 0.7

  const looksLikeCityOrCounty = normalizedQuery === normalizedCity || normalizedQuery === normalizedCounty

  return (isExplicitStateResult || looksLikeStateBoundary)
    && (queryMatchesFullStateName || queryMatchesStateAbbrev)
    && !looksLikeCityOrCounty
}
