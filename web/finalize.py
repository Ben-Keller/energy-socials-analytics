from pathlib import Path
import shutil
here=Path(__file__).parent;site=here.parent/'site'
# Retain older content-hashed assets so already-open/cached pages keep working.
shutil.copytree(here/'dist',site,dirs_exist_ok=True)
print('Published static build into',site)
