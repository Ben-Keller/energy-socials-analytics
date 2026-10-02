from pathlib import Path
import json
O=Path('outputs/linkedin_audit_20261002')
p=Path('d3_report_work/page.html').read_text()
for token,file in [('__DATA__',O/'visual_assets/d3_report_data.json'),('__CATALOG__',O/'visual_assets/figure_catalog.json'),('__D3__',O/'visual_assets/vendor/d3.v7.9.0.min.js'),('__CHARTS__',Path('d3_report_work/charts.js')),('__INTERACTIVITY__',Path('d3_report_work/interactivity.js')),('__INTERACTIVE_CSS__',Path('d3_report_work/interactive.css')),('__MOBILE_CSS__',Path('d3_report_work/mobile.css')),('__MOBILE_JS__',Path('d3_report_work/mobile.js'))]:
 content=file.read_text()
 if token=='__DATA__' and (O/'thumbnails/manifest.json').exists():
  payload=json.loads(content);thumbs={entry['id']:entry['variants'] for entry in json.loads((O/'thumbnails/manifest.json').read_text())}
  for post in payload['posts']:
   if post['id'] in thumbs:
    post['thumbnails']=thumbs[post['id']];post['thumbnail']=post['thumbnails'][0]['src'];post['embedded']=post['thumbnails'][min(1,len(post['thumbnails'])-1)]['src']
  content=json.dumps(payload,separators=(',',':'))
 p=p.replace(token,content.replace('</script','<\\/script'))
(O/'Visual_Gallery.html').write_text(p)
print('D3 HTML bytes',len(p.encode()))
