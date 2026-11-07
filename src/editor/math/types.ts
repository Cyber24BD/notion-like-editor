import type { Editor } from '@tiptap/core'

export type MathMode = 'inline' | 'block'

export interface MathDialogOptions {
  editor: Editor
  mode: MathMode
  initialLatex: string
  allowModeChange: boolean
  onApply: (latex: string, mode: MathMode) => void
}

export interface MathSnippet {
  label: string
  latex: string
}

export const MATH_SYMBOLS: MathSnippet[] = [
  { label: 'Fraction', latex: '\\frac{a}{b}' },
  { label: 'Square root', latex: '\\sqrt{x}' },
  { label: 'Power', latex: 'x^{2}' },
  { label: 'Subscript', latex: 'x_{i}' },
  { label: 'Sum', latex: '\\sum_{i=1}^{n}' },
  { label: 'Integral', latex: '\\int_{a}^{b}' },
  { label: 'Limit', latex: '\\lim_{x \\to \\infty}' },
  { label: 'Alpha', latex: '\\alpha' },
  { label: 'Beta', latex: '\\beta' },
  { label: 'Gamma', latex: '\\gamma' },
  { label: 'Pi', latex: '\\pi' },
  { label: 'Theta', latex: '\\theta' },
  { label: 'Infinity', latex: '\\infty' },
  { label: 'Plus-minus', latex: '\\pm' },
  { label: 'Times', latex: '\\times' },
  { label: 'Divide', latex: '\\div' },
  { label: 'Less or equal', latex: '\\leq' },
  { label: 'Greater or equal', latex: '\\geq' },
  { label: 'Not equal', latex: '\\neq' },
  { label: 'Approximately', latex: '\\approx' },
  { label: 'Right arrow', latex: '\\rightarrow' },
  { label: 'Left arrow', latex: '\\leftarrow' },
  { label: 'Implies', latex: '\\Rightarrow' },
  { label: 'If and only if', latex: '\\Leftrightarrow' },
  { label: 'Element of', latex: '\\in' },
  { label: 'Not element of', latex: '\\notin' },
  { label: 'Subset', latex: '\\subset' },
  { label: 'Union', latex: '\\cup' },
  { label: 'Intersection', latex: '\\cap' },
  { label: 'For all', latex: '\\forall' },
  { label: 'Exists', latex: '\\exists' },
  { label: 'Nabla', latex: '\\nabla' },
  { label: 'Partial', latex: '\\partial' },
  { label: 'Dot', latex: '\\cdot' },
  { label: 'Ellipsis', latex: '\\ldots' },
  { label: 'Centered ellipsis', latex: '\\cdots' },
]

export const MATH_TEMPLATES: MathSnippet[] = [
  { label: 'Fraction', latex: '\\frac{a}{b}' },
  { label: 'Square root', latex: '\\sqrt{x}' },
  { label: 'Power', latex: 'x^{2}' },
  { label: 'Subscript', latex: 'x_{i}' },
  { label: 'Sum', latex: '\\sum_{i=1}^{n} a_i' },
  { label: 'Integral', latex: '\\int_{a}^{b} f(x)\\,dx' },
  { label: 'Limit', latex: '\\lim_{x \\to \\infty} f(x)' },
  { label: 'Derivative', latex: '\\frac{d}{dx} f(x)' },
  { label: 'Partial derivative', latex: '\\frac{\\partial f}{\\partial x}' },
  {
    label: 'Matrix',
    latex: '\\begin{matrix} a & b \\\\ c & d \\end{matrix}',
  },
  {
    label: 'Cases',
    latex:
      '\\begin{cases} x & \\text{if } x > 0 \\\\ -x & \\text{if } x \\le 0 \\end{cases}',
  },
  {
    label: 'Aligned',
    latex:
      '\\begin{aligned} a &= b + c \\\\ d &= e + f \\end{aligned}',
  },
  {
    label: 'Vector',
    latex: '\\vec{v} = \\begin{pmatrix} x \\\\ y \\end{pmatrix}',
  },
  {
    label: 'Quadratic formula',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
  },
  {
    label: 'Euler',
    latex: 'e^{i\\pi} + 1 = 0',
  },
]
