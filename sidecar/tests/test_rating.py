from rating import rating_from_db, rating_to_db


def test_rating_round_trip():
    for stars in range(6):
        assert rating_from_db(rating_to_db(stars)) == stars


def test_rating_from_db_encoded_values():
    assert rating_from_db(0) == 0
    assert rating_from_db(51) == 1
    assert rating_from_db(102) == 2
    assert rating_from_db(153) == 3
    assert rating_from_db(204) == 4
    assert rating_from_db(255) == 5


def test_rating_from_db_plain_stars():
    assert rating_from_db(3) == 3


def test_rating_to_db_mapping():
    assert rating_to_db(0) == 0
    assert rating_to_db(5) == 255
