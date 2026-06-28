type PlaylistMembershipBadgesProps = {
  inDest: boolean
  inCull: boolean
}

export function PlaylistMembershipBadges({ inDest, inCull }: PlaylistMembershipBadgesProps) {
  if (!inDest && !inCull) return null
  return (
    <div className="track-card__badges">
      {inDest ? <span className="badge badge--keep">In keep</span> : null}
      {inCull ? <span className="badge badge--cull">In cull</span> : null}
    </div>
  )
}
