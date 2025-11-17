"""File encoding detection for Japanese CSV files."""
import chardet


def detect_encoding(file_content: bytes) -> str:
    """Detect CSV file encoding using chardet.

    Handles common Japanese encodings like Shift-JIS, CP932, UTF-8, UTF-8-BOM.

    Args:
        file_content: Raw bytes from CSV file

    Returns:
        Detected encoding (utf-8, shift-jis, cp932, etc.)
    """
    result = chardet.detect(file_content)
    encoding = result["encoding"]

    # Handle common Japanese encodings
    if encoding and encoding.lower() in ["shift_jis", "shift-jis", "cp932"]:
        return "shift_jis"
    elif encoding and "utf" in encoding.lower():
        return "utf-8-sig"  # Handle BOM

    return encoding or "utf-8"
