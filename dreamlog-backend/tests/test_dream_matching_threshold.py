def test_matching_threshold_accepts_local_chinese_embedding_similarity():
    from app.api.v1.dreams import MATCH_SIMILARITY_THRESHOLD

    assert MATCH_SIMILARITY_THRESHOLD <= 0.2
