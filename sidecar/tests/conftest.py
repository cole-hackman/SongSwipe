import sys
from pathlib import Path

SIDEcar_ROOT = Path(__file__).resolve().parent.parent
if str(SIDEcar_ROOT) not in sys.path:
    sys.path.insert(0, str(SIDEcar_ROOT))
