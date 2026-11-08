/**
 * Prefixes every scoped library selector with a root class at build time:
 *
 *   .btn -> .notion-editor-root .btn
 *   [data-theme='dark'] .code -> [data-theme='dark'] .notion-editor-root .code
 *
 * The app build does not use this plugin, so the demo keeps its global styles.
 */
export default function scopeCss(rootSelector) {
  return {
    postcssPlugin: 'notion-scope-css',
    Once(root) {
      root.walkRules((rule) => {
        if (
          rule.parent &&
          rule.parent.type === 'atrule' &&
          /keyframes$/i.test(rule.parent.name)
        ) {
          return
        }

        rule.selector = rule.selector
          .split(',')
          .map((part) => {
            const selector = part.trim()
            if (!selector) return selector
            if (selector.includes(rootSelector)) return selector
            if (/^(?::root|html|body|#root)(?:\s|$|,)/.test(selector)) {
              return selector
            }

            const themed = selector.match(
              /^(?:html)?(\[data-theme[^\]]*\])\s+(.+)$/,
            )
            if (themed) {
              return `${themed[1]} ${rootSelector} ${themed[2]}`
            }

            return `${rootSelector} ${selector}`
          })
          .join(', ')
      })
    },
  }
}
