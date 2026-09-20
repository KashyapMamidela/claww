// Compile-time guarantee that every <Text>/<TextInput> renders in Inter,
// regardless of the device's system font (Samsung FlipFont, custom OEM
// fonts, etc.) — the whole point of "static font" per the product
// requirement. A runtime approach (patching Text.defaultProps, or React's
// old forwardRef .render trick) doesn't work on this stack: React 19
// dropped defaultProps support for function components, and RN 0.81's
// Text/TextInput are plain function components (Flow `component(...)`
// syntax), not forwardRef — there's no render method to intercept. This
// also means a call site can never again silently ship a Text with
// fontWeight but no fontFamily (the exact bug found in
// workout-complete.tsx and GoogleSignInButton.tsx): every JSX <Text>/
// <TextInput> gets `fontFamily: 'Inter'` prepended to its style array, so
// an explicit fontFamily at the call site still wins (RN's array-style
// flattening applies later entries last), but the default is never
// missing.
module.exports = function forceFontPlugin({ types: t }) {
  const TARGET_NAMES = new Set(['Text', 'TextInput']);
  const FONT_FAMILY = 'Inter';

  return {
    name: 'force-font',
    visitor: {
      JSXOpeningElement(path) {
        const name = path.node.name;
        if (!t.isJSXIdentifier(name) || !TARGET_NAMES.has(name.name)) return;

        const styleAttr = path.node.attributes.find(
          (attr) => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'style'
        );

        const defaultStyleExpr = t.objectExpression([
          t.objectProperty(t.identifier('fontFamily'), t.stringLiteral(FONT_FAMILY)),
        ]);

        if (!styleAttr) {
          path.node.attributes.push(
            t.jsxAttribute(t.jsxIdentifier('style'), t.jsxExpressionContainer(t.arrayExpression([defaultStyleExpr])))
          );
          return;
        }

        if (!t.isJSXExpressionContainer(styleAttr.value) || t.isJSXEmptyExpression(styleAttr.value.expression)) {
          return; // Not a JS expression (shouldn't happen for `style`) — leave untouched rather than guess.
        }

        const existing = styleAttr.value.expression;
        // Already wrapped once by this plugin (re-run on the same AST in watch mode) — don't double-prepend.
        if (
          t.isArrayExpression(existing) &&
          existing.elements[0] &&
          t.isObjectExpression(existing.elements[0]) &&
          existing.elements[0].properties.some(
            (p) => t.isObjectProperty(p) && t.isIdentifier(p.key, { name: 'fontFamily' }) && t.isStringLiteral(p.value, { value: FONT_FAMILY })
          )
        ) {
          return;
        }

        const newElements = t.isArrayExpression(existing) ? [defaultStyleExpr, ...existing.elements] : [defaultStyleExpr, existing];
        styleAttr.value = t.jsxExpressionContainer(t.arrayExpression(newElements));
      },
    },
  };
};
