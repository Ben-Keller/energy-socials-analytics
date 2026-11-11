import metadata from './generated/image-meta.json';
import overrides from './preview-overrides.json';

export function imageAttributes(post,base='',{height=280,mobileHeight=240,width='680px',mobileWidth='calc(100vw - 48px)',cap=1280}={}){
 const original=overrides[post.id]?.image||post.image||post.preview||post.thumbnail||'',stem=original.split('/').at(-1)?.replace(/-(160|320|640|1280)\.webp$|\.[^.]+$/,'');
 const meta=metadata[stem];if(!meta)return {src:base+original};
 const choices=[...new Map(meta.variants.filter(([tier])=>tier<=cap).map(row=>[row[1],row])).values()];
 const fallback=choices.find(([tier])=>tier===640)||choices.at(-1),src=tier=>base+`thumbnails/${stem}-${tier}.webp`,ratio=meta.width/meta.height;
 return {srcset:choices.map(([tier,w])=>`${src(tier)} ${w}w`).join(', '),sizes:`(max-width: 740px) min(${mobileWidth}, ${Math.round(mobileHeight*ratio)}px), min(${width}, ${Math.round(height*ratio)}px)`,width:meta.width,height:meta.height,src:src(fallback[0])};
}

export function setImageAttributes(image,post,base='',options={}){
 for(const [key,value] of Object.entries(imageAttributes(post,base,options)))image.setAttribute(key,value);
 image.decoding='async';
 return image;
}
