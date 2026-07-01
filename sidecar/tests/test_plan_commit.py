import commands


def test_plan_commit_describes_operations():
    decisions = [
        {"trackId": "t1", "keep": True, "rating": 4, "destPlaylistId": "keep-pl"},
        {"trackId": "t2", "keep": False, "cutPlaylistId": "cut-pl"},
    ]
    plan = commands.plan_commit(
        decisions,
        default_dest_id="keep-pl",
        default_cut_id="cut-pl",
    )
    types = [op["type"] for op in plan["operations"]]
    assert "set_rating" in types
    assert "add_to_playlist" in types
