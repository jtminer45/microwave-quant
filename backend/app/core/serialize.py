import math

import pandas as pd


def clean_records(df: pd.DataFrame) -> list:
    """Convert a DataFrame to a list of JSON-safe dicts — NaN/Inf become None,
    since Python's json module emits literal NaN/Infinity tokens that most
    strict JSON parsers (including JS's JSON.parse) reject.
    """
    records = df.to_dict(orient="records")
    for record in records:
        for key, value in record.items():
            if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
                record[key] = None
    return records
