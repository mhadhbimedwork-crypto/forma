# Genera le risorse Android (icone + splash) della variante THE LIFTING ZONE da icons/gym/*.png
import os, glob
from PIL import Image
R='android/app/src/main/res'; O='android-tlz/res'
mask=Image.open('icons/gym/icon-maskable-512.png').convert('RGBA')
icon=Image.open('icons/gym/icon-512.png').convert('RGBA')
mark=Image.open('icons/gym/mark.png').convert('RGBA')
bg=mask.getpixel((3,3))[:3]
leg={'mdpi':48,'hdpi':72,'xhdpi':96,'xxhdpi':144,'xxxhdpi':192}
adp={'mdpi':108,'hdpi':162,'xhdpi':216,'xxhdpi':324,'xxxhdpi':432}
def save(im,p):
    os.makedirs(os.path.dirname(p),exist_ok=True); im.save(p)
for d,s in leg.items():
    a=icon.resize((s,s),Image.LANCZOS)
    save(a,f'{O}/mipmap-{d}/ic_launcher.png'); save(a,f'{O}/mipmap-{d}/ic_launcher_round.png')
    save(mask.resize((adp[d],adp[d]),Image.LANCZOS),f'{O}/mipmap-{d}/ic_launcher_foreground.png')
    save(Image.new('RGBA',(adp[d],adp[d]),bg+(255,)),f'{O}/mipmap-{d}/ic_launcher_background.png')
for p in glob.glob(f'{R}/drawable*/splash.png'):
    w,h=Image.open(p).size
    im=Image.new('RGBA',(w,h),bg+(255,))
    m=int(min(w,h)*0.42); mk=mark.resize((m,int(m*mark.size[1]/mark.size[0])),Image.LANCZOS)
    im.alpha_composite(mk,((w-mk.size[0])//2,(h-mk.size[1])//2))
    save(im,p.replace(R,O))
print('ok',bg, mark.size)
