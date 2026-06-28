import type { BatchRule } from '@/lib/types'

type RuleSuggestionBannerProps = {
  rule: BatchRule
  onAccept: () => void
  onDismiss: () => void
}

export function RuleSuggestionBanner({ rule, onAccept, onDismiss }: RuleSuggestionBannerProps) {
  const actionLabel = rule.action === 'suggest_keep' ? 'Keep' : 'Cull'
  return (
    <div className="rule-banner">
      <span>
        Rule suggests: <strong>{actionLabel}</strong> ({describeRule(rule)})
      </span>
      <div className="rule-banner__actions">
        <button type="button" className="btn" onClick={onDismiss}>
          Dismiss
        </button>
        <button type="button" className="btn btn--primary" onClick={onAccept}>
          {actionLabel}
        </button>
      </div>
    </div>
  )
}

function describeRule(rule: BatchRule): string {
  if (rule.field === 'bpm') return `BPM ${rule.op} ${rule.value}`
  if (rule.field === 'rating') return rule.op === 'empty' ? 'unrated' : `rating ${rule.value}`
  if (rule.field === 'key') return rule.op === 'empty' ? 'no key' : `key ${rule.value}`
  return rule.field
}
