type PlaylistMembershipBadgesProps = {
  inDest: boolean
  inCut: boolean
}

export function PlaylistMembershipBadges({ inDest, inCut }: PlaylistMembershipBadgesProps) {
  if (!inDest && !inCut) return null
  return (
    <div className="track-card__badges">
      {inDest ? <span className="badge badge--keep">In keep</span> : null}
      {inCut ? <span className="badge badge--cut">In cut</span> : null}
    </div>
  )
}
