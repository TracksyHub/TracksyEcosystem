from typing import List, Dict, Any

def generate_activity_heatmap(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> List[float]:
    """
    Bucket activity counts into 'buckets' time intervals,
    returning either raw counts or normalized [0.0–1.0].
    - timestamps: list of epoch ms timestamps.
    - counts: list of integer counts per timestamp.
    """
    if not timestamps or not counts or len(timestamps) != len(counts):
        return []

    t_min, t_max = min(timestamps), max(timestamps)
    span = t_max - t_min or 1
    bucket_size = span / buckets

    agg = [0] * buckets
    for t, c in zip(timestamps, counts):
        idx = min(buckets - 1, int((t - t_min) / bucket_size))
        agg[idx] += c

    if normalize:
        m = max(agg) or 1
        return [round(val / m, 4) for val in agg]
    return agg


def detailed_heatmap_report(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> Dict[str, Any]:
    """
    Returns both the computed heatmap and metadata about distribution.
    """
    heatmap = generate_activity_heatmap(timestamps, counts, buckets, normalize)

    total_activity = sum(counts)
    nonzero_buckets = sum(1 for v in heatmap if v > 0)
    sparsity = round(1 - (nonzero_buckets / buckets), 4)

    return {
        "inputs": {
            "total_points": len(timestamps),
            "buckets": buckets,
            "normalize": normalize
        },
        "heatmap": heatmap,
        "stats": {
            "total_activity": total_activity,
            "nonzero_buckets": nonzero_buckets,
            "sparsity": sparsity
        }
    }
