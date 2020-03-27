const fs = require('fs')

// set flexsearch object as a global variable to make it available to language files
global.FlexSearch = require('flexsearch')

exports.onPostBootstrap = function (_ref, options) {
  const { getNodes } = _ref

  const { filter, type } = options
  const defaultFilter = () => true
  const nodeFilter = filter || defaultFilter

  const _options$langua = options.languages
  const languages = _options$langua === undefined ? ['en'] : _options$langua

  const _options$fields = options.fields
  const fields = _options$fields === undefined ? [] : _options$fields

  const store = []
  const indexStore = []
  const fullIndex = {}

  languages.forEach((lng) => {
    // collect fields to store
    const fieldsToStore = fields
      .filter((field) => (field.store ? field.resolver : null))
      .map((field) => ({ name: field.name, resolver: field.resolver }))
    const nid = []

    // add each field to index
    fields.forEach((index_) => {
      const index = {}
      index.name = index_.name

      if (index_.indexed) {
        const attrs = index_.attributes || {}
        index.attrs = attrs

        // load language files if needed by stemmer or filter
        if (
          index.attrs.stemmer !== undefined ||
          index.attrs.filter !== undefined
        ) {
          try {
            if (lng === 'en') {
              require('./lang/en')
            } else if (lng === 'de') {
              require('./lang/de')
            } else {
              console.error(
                'Language not supported by pre-defined stemmer or filter'
              )
            }
          } catch (e) {
            console.error(e)
          }
        }

        index.values = new FlexSearch(attrs)
      }

      getNodes()
        .filter((node) => node.internal.type === type && nodeFilter(node))
        .forEach((n, i) => {
          const id = i
          if (index_.indexed) {
            const content = index_.resolver(n)

            if (Array.isArray(content)) {
              index.values.add(id, content.join(', '))
            } else {
              index.values.add(id, content)
            }
          }
          const nodeContent = {}
          fieldsToStore.forEach((field) => {
            nodeContent[field.name] = field.resolver(n)
          })
          if (!nid.includes(id)) {
            store.push({ id, node: nodeContent })
            nid.push(id)
          }
        })

      if (index_.indexed) {
        index.values = index.values.export()
        indexStore.push(index)
      }
    })

    fullIndex[lng] = {
      index: indexStore,
      store,
    }
  })

  fs.writeFileSync('public/flexsearch_index.json', JSON.stringify(fullIndex))
}
