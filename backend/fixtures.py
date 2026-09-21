"""Fixture issues mirroring frontend/src/data/sampleIssues.ts.

There's no live scoring pipeline yet, so this exists purely so
GET /api/issues has something deterministic to serve.
"""

SEVERITY_WEIGHT = {"low": 1, "medium": 2, "high": 3, "critical": 4}


def compute_priority_score(issue: dict) -> int:
    severity_points = SEVERITY_WEIGHT[issue["severity"]] * 20
    corroboration_points = min(issue["corroboration_count"] * 3, 60)
    population_points = min(issue["estimated_affected_population"] / 20, 30)
    age_points = min(issue["days_open"] * 1.5, 20)
    return round(severity_points + corroboration_points + population_points + age_points)


_RAW_ISSUES = [
    {
        "id": "iss-001",
        "title": "Sewage overflow near Lakeview bus stop",
        "description": (
            "Standing sewage water has been flowing onto the road near the bus stop for "
            "several days. Residents report a strong smell and children wading through it "
            "on the way to school."
        ),
        "category": "sewage",
        "severity": "critical",
        "status": "open",
        "corroboration_count": 23,
        "estimated_affected_population": 420,
        "days_open": 6,
        "location": {"lat": 13.0827, "lng": 80.2707, "address": "Lakeview Rd & Bus Stop 4, Rivermill"},
        "reported_languages": ["Tamil", "English"],
    },
    {
        "id": "iss-002",
        "title": "Deep pothole outside Rivermill Junction market",
        "description": (
            "A large pothole has formed at the market junction, causing two-wheeler "
            "accidents during evening traffic."
        ),
        "category": "pothole",
        "severity": "high",
        "status": "open",
        "corroboration_count": 14,
        "estimated_affected_population": 900,
        "days_open": 11,
        "location": {"lat": 13.086, "lng": 80.2785, "address": "Junction Market Rd, Rivermill"},
        "reported_languages": ["Tamil", "English", "Telugu"],
    },
    {
        "id": "iss-003",
        "title": "Uncollected garbage pileup on 3rd Cross Street",
        "description": (
            "Household waste has not been collected in over a week. Pile is attracting "
            "stray animals and blocking part of the footpath."
        ),
        "category": "garbage",
        "severity": "medium",
        "status": "open",
        "corroboration_count": 9,
        "estimated_affected_population": 260,
        "days_open": 8,
        "location": {"lat": 13.079, "lng": 80.2735, "address": "3rd Cross Street, Rivermill"},
        "reported_languages": ["Tamil"],
    },
    {
        "id": "iss-004",
        "title": "Broken streetlights along Canal Road",
        "description": (
            "Four consecutive streetlights are non-functional, leaving a stretch of Canal "
            "Road unlit at night. Residents report feeling unsafe walking home."
        ),
        "category": "streetlight",
        "severity": "medium",
        "status": "in_progress",
        "corroboration_count": 6,
        "estimated_affected_population": 500,
        "days_open": 15,
        "location": {"lat": 13.0905, "lng": 80.269, "address": "Canal Road, Rivermill"},
        "reported_languages": ["English", "Tamil"],
    },
    {
        "id": "iss-005",
        "title": "Drinking water pipeline leak near Greenfield School",
        "description": (
            "A cracked pipeline is leaking treated drinking water continuously, reducing "
            "pressure for nearby households."
        ),
        "category": "water",
        "severity": "high",
        "status": "open",
        "corroboration_count": 11,
        "estimated_affected_population": 610,
        "days_open": 4,
        "location": {"lat": 13.0768, "lng": 80.2648, "address": "Greenfield School Rd, Rivermill"},
        "reported_languages": ["Tamil", "English"],
    },
    {
        "id": "iss-006",
        "title": "Overflowing storm drain behind Anna Nagar Complex",
        "description": (
            "Storm drain has been blocked by debris and is overflowing onto the internal "
            "road after light rain."
        ),
        "category": "sewage",
        "severity": "medium",
        "status": "open",
        "corroboration_count": 5,
        "estimated_affected_population": 180,
        "days_open": 3,
        "location": {"lat": 13.0842, "lng": 80.2755, "address": "Anna Nagar Complex, Rivermill"},
        "reported_languages": ["Tamil"],
    },
    {
        "id": "iss-007",
        "title": "Series of small potholes on Temple Street",
        "description": (
            "Multiple shallow potholes have formed after recent rains, mostly affecting "
            "cyclists and two-wheelers."
        ),
        "category": "pothole",
        "severity": "low",
        "status": "open",
        "corroboration_count": 4,
        "estimated_affected_population": 150,
        "days_open": 2,
        "location": {"lat": 13.081, "lng": 80.281, "address": "Temple Street, Rivermill"},
        "reported_languages": ["Tamil", "English"],
    },
    {
        "id": "iss-008",
        "title": "Garbage bin overflow near Riverside Park entrance",
        "description": (
            "The public garbage bin at the park entrance has been overflowing for several "
            "days, with waste scattered nearby."
        ),
        "category": "garbage",
        "severity": "low",
        "status": "resolved",
        "corroboration_count": 7,
        "estimated_affected_population": 300,
        "days_open": 12,
        "location": {"lat": 13.0778, "lng": 80.2712, "address": "Riverside Park Entrance, Rivermill"},
        "reported_languages": ["English", "Tamil"],
    },
    {
        "id": "iss-009",
        "title": "Flickering and dark streetlight near Rivermill Bridge",
        "description": (
            "The streetlight at the bridge approach flickers intermittently and goes fully "
            "dark after 11pm, a known pedestrian crossing point."
        ),
        "category": "streetlight",
        "severity": "high",
        "status": "open",
        "corroboration_count": 8,
        "estimated_affected_population": 340,
        "days_open": 9,
        "location": {"lat": 13.0895, "lng": 80.2822, "address": "Rivermill Bridge Approach, Rivermill"},
        "reported_languages": ["Tamil", "English"],
    },
]

SAMPLE_ISSUES = sorted(
    ({**issue, "priority_score": compute_priority_score(issue)} for issue in _RAW_ISSUES),
    key=lambda issue: issue["priority_score"],
    reverse=True,
)

_ISSUES_BY_ID = {issue["id"]: issue for issue in SAMPLE_ISSUES}


def get_issue_by_id(issue_id: str) -> dict | None:
    return _ISSUES_BY_ID.get(issue_id)
