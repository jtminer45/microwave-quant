import functools
import threading
import time


def ttl_cache(ttl_seconds: int):
    """Thread-safe TTL cache decorator — a Streamlit-free stand-in for @st.cache_data."""
    def decorator(func):
        store: dict = {}
        lock = threading.Lock()

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = (args, tuple(sorted(kwargs.items())))
            now = time.monotonic()
            with lock:
                cached = store.get(key)
                if cached is not None and now < cached[1]:
                    return cached[0]
            result = func(*args, **kwargs)
            with lock:
                store[key] = (result, now + ttl_seconds)
            return result

        def clear():
            with lock:
                store.clear()

        wrapper.clear = clear
        return wrapper
    return decorator
