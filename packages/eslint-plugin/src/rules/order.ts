import { ESLintUtils } from '@typescript-eslint/utils'
import type { RuleListener } from '@typescript-eslint/utils/ts-eslint'
import type { TSESTree } from '@typescript-eslint/types'
import { AST_NODES_WITH_QUOTES, CLASS_FIELDS } from '../constants'
import { syncAction } from './_'

export default ESLintUtils.RuleCreator(name => name)({
  name: 'order',
  meta: {
    type: 'layout',
    fixable: 'code',
    docs: {
      description: 'Order of UnoCSS utilities in class attribute',
      recommended: 'recommended',
    },
    messages: {
      'invalid-order': 'UnoCSS utilities are not ordered',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function checkLiteral(node: TSESTree.Literal) {
      if (typeof node.value !== 'string' || !node.value.trim())
        return
      const input = node.value
      const sorted = syncAction('sort', input).trim()
      if (sorted !== input) {
        context.report({
          node,
          messageId: 'invalid-order',
          fix(fixer) {
            if (AST_NODES_WITH_QUOTES.includes(node.type))
              return fixer.replaceTextRange([node.range[0] + 1, node.range[1] - 1], sorted)
            else
              return fixer.replaceText(node, sorted)
          },
        })
      }
    }

    const scriptVisitor: RuleListener = {
      JSXAttribute(node) {
        if (typeof node.name.name === 'string' && CLASS_FIELDS.includes(node.name.name.toLowerCase()) && node.value) {
          if (node.value.type === 'Literal')
            checkLiteral(node.value)
        }
      },
      SvelteAttribute(node: any) {
        if (node.key.name === 'class') {
          if (node.value?.[0].type === 'SvelteLiteral')
            checkLiteral(node.value[0])
        }
      },
    }

    const templateBodyVisitor: RuleListener = {
      VAttribute(node: any) {
        if (node.key.name === 'class') {
          if (node.value.type === 'VLiteral')
            checkLiteral(node.value)
        }
      },
    }

    // @ts-expect-error missing-types
    if (context.parserServices == null || context.parserServices.defineTemplateBodyVisitor == null) {
      return scriptVisitor
    }
    else {
      // For Vue
      // @ts-expect-error missing-types
      return context.parserServices?.defineTemplateBodyVisitor(templateBodyVisitor, scriptVisitor)
    }
  },
})
