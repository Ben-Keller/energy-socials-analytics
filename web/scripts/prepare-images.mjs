import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const web=fileURLToPath(new URL('../',import.meta.url)),pub=path.join(web,'public'),target=path.join(pub,'thumbnails');
const files=(await fs.readdir(path.join(pub,'post_images'))).filter(name=>/\.(jpe?g|png|webp)$/i.test(name)).sort();
const manifest={};let created=0;
// Existing 160/320/640 previews remain unchanged. Generate the large tier only
// when the source has more detail than 640 pixels; never enlarge an original.
let cursor=0;await Promise.all(Array.from({length:4},async()=>{
 while(cursor<files.length){
  const name=files[cursor++],stem=path.parse(name).name,source=path.join(pub,'post_images',name),meta=await sharp(source).metadata();
  const rotated=[5,6,7,8].includes(meta.orientation),width=rotated?meta.height:meta.width,height=rotated?meta.width:meta.height;
  const variants=[];
  for(const size of [160,320,640]){
   const f=path.join(target,`${stem}-${size}.webp`);
   try{const m=await sharp(f).metadata();variants.push([size,m.width,m.height]);}catch{/* Images without existing tiers use their source. */}
  }
  if(variants.length&&Math.max(width,height)>640){
   const f=path.join(target,`${stem}-1280.webp`),srcStat=await fs.stat(source);let current;
   try{current=await fs.stat(f)}catch{}
   if(!current||current.mtimeMs<srcStat.mtimeMs){await sharp(source).rotate().resize({width:1280,height:1280,fit:'inside',withoutEnlargement:true}).webp({quality:80,effort:4}).toFile(f);created++;}
   const m=await sharp(f).metadata();variants.push([1280,m.width,m.height]);
  }
  if(variants.length)manifest[stem]={width,height,variants};
 }
}));
await fs.mkdir(path.join(web,'src/generated'),{recursive:true});
await fs.writeFile(path.join(web,'src/generated/image-meta.json'),JSON.stringify(Object.fromEntries(Object.entries(manifest).sort(([a],[b])=>a.localeCompare(b)))));
console.log(JSON.stringify({images:Object.keys(manifest).length,newLargePreviews:created,tiers:[160,320,640,1280]}));

// Keep the low-resolution atlas image out of inherited CSS values. It is a
// cacheable file, reused by every tile, preview and the second explorer tab.
const atlas=JSON.parse(await fs.readFile(path.join(web,'src/site-data.json'),'utf8'));
await fs.writeFile(path.join(pub,'atlas-overview.webp'),Buffer.from(atlas.sprite.src.split(',')[1],'base64'));
const packs=[...new Set(atlas.posts.filter(p=>p.tile).map(p=>p.tile.src))];
for(const name of packs)for(const size of [48,64]){
 const source=path.join(pub,name),small=source.replace('.webp',`-${size}.webp`);
 let exists;try{exists=await fs.stat(small)}catch{}
 if(!exists||exists.mtimeMs<(await fs.stat(source)).mtimeMs)await sharp(source).resize({width:8*size,height:4*size}).webp({quality:80,effort:4}).toFile(small);
}
console.log(JSON.stringify({smallAtlasPacks:packs.length}));
