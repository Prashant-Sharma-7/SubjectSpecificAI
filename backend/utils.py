import os
import re

def sanitize_name(name: str) -> str:
    # This removes anything that IS NOT a letter, number, dash, or underscore
    return re.sub(r'[^a-zA-Z0-9_-]', '', name)
