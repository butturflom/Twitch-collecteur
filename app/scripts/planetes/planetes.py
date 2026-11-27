# Formes des planètes de chaîne (piste « B, terrasses » du prototype R5, choisie le 27/11/2026) : images NEUTRES rendues avec
# Blender, fond transparent. La photo de la chaîne et sa couleur sont posées plus tard dans le navigateur (src/lib/planet.ts).
# Formes et reliefs ne portent aucune donnée : ils ne servent qu'à varier.
#
# Lancer (depuis n'importe où ; graines fixes, donc rejouable à l'identique) ; le build de l'application n'en a pas besoin :
#   "C:\Program Files\Blender Foundation\Blender 5.3\blender.exe" --background --factory-startup --python planetes.py
# Écrit dans app/src/assets/planetes/ (ou dans le dossier donné après « -- »).
#
# Deux images par forme, de RES px, la planète (rayon 1) au centre d'un cadre de demi-largeur HALF :
#   c<n>.png     : R = lumière (clé en haut à gauche, appoint derrière à droite), G = terres (1) ou mer (0), B inutilisé,
#                  A = couverture ;
#   c<n>-uv.png  : où lire la photo, pixel par pixel : R, G = (u, v), B = 1 sur la planète, A = couverture.
# RES et HALF sont repris dans src/lib/planet.ts : les changer ensemble.
#
# Une forme à anneau (c6 du prototype) a été écartée : son anneau se serait confondu avec celui des 3 chaînes les plus fortes.

import bpy, bmesh, math, os, random, struct, sys, zlib, tempfile
import numpy as np
from mathutils import Vector, noise

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.path.normpath(os.path.join(ICI, "..", "..", "src", "assets", "planetes"))
RES = 160      # taille finale (px) ; couvre environ 65 px de rayon à l'écran
HALF = 1.2     # demi-largeur du cadre, en rayons de planète
SS = 3         # sur-échantillonnage (rendu à RES*SS puis réduction en boîte : bords propres)
TMP = tempfile.mkdtemp(prefix="planetes_")

FORMES = [
    dict(id="c1", seed=21, thr=.02),
    dict(id="c2", seed=22, thr=.12, scale=2.4),
    dict(id="c3", seed=23, mode="caps", thr=.5),
    dict(id="c4", seed=24, mode="bands", freq=6.0, thr=.25, steps=[0, .04, .07]),
    dict(id="c5", seed=25, mode="craters", craters=[(-.5, -.7, .4, .42), (.55, -.6, -.35, .34), (0, -.8, -.75, .3), (.2, .9, .2, .4)]),
]

# ---------------------------------------------------------------- forme
def bruit(p, seed, scale=1.0, octaves=3):
    """Bruit fractal déterministe (Perlin d'origine) : la graine décale l'espace."""
    off = Vector(((seed * 12.9898) % 97.0, (seed * 78.233) % 89.0, (seed * 37.719) % 83.0))
    v, a, f, tot = 0.0, 1.0, 1.0, 0.0
    for _ in range(octaves):
        v += a * noise.noise((p * scale * f) + off * f, noise_basis='PERLIN_ORIGINAL')
        tot += a; a *= 0.5; f *= 2.0
    return v / tot

def terrasses(o):
    """Mer basse à facettes et terres en paliers (seconde matière), calottes, bandes ou cratères selon le mode."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
    s, mode, steps = o["seed"], o.get("mode", "noise"), o.get("steps", [0.0, .05, .09])
    lvl = {}
    for v in bm.verts:
        d = v.co.normalized()
        if mode == "noise": h = bruit(d, s, o.get("scale", 1.4), 4) - o.get("thr", 0.0)
        elif mode == "caps": h = abs(d.z) - o.get("thr", .55) + .25 * bruit(d, s, 2.2)
        elif mode == "bands": h = math.sin(d.z * o.get("freq", 7.0) + 1.6 * bruit(d, s, 1.3)) - o.get("thr", .2)
        elif mode == "craters":
            h = .15 + .2 * bruit(d, s, 2.0)
            for (cx, cy, cz, rr) in o["craters"]:
                c = Vector((cx, cy, cz)).normalized(); t = (d - c).length
                if t < rr: h -= .5 * (1 - t / rr)
                elif t < rr * 1.25: h += .12
        n = 0
        for k, th in enumerate((0.0, .16)):
            if h > th: n = k + 1
        lvl[v] = n
        v.co = d * (1 + steps[n] + .012 * bruit(d, s + 7, 6.0))
    for f in bm.faces:
        f.material_index = 1 if sum(lvl[v] for v in f.verts) / len(f.verts) >= .5 else 0
    return bm

# ---------------------------------------------------------------- scène
def scene_neuve():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x = sc.render.resolution_y = RES * SS
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    try: sc.eevee.taa_render_samples = 16
    except Exception: pass
    for vt in ('Standard', 'AgX', 'Filmic'):
        try: sc.view_settings.view_transform = vt; break
        except Exception: continue
    sc.view_settings.look = 'None'
    w = bpy.data.worlds.new("monde"); sc.world = w
    bg = w.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (1, 1, 1, 1); bg.inputs[1].default_value = .22
    cam = bpy.data.cameras.new("cam"); cam.type = 'ORTHO'; cam.ortho_scale = 2 * HALF
    co = bpy.data.objects.new("cam", cam); sc.collection.objects.link(co); sc.camera = co
    co.location = (0, -10, 0); co.rotation_euler = (math.radians(90), 0, 0)
    def soleil(nom, direction, force, angle):
        l = bpy.data.lights.new(nom, 'SUN'); l.energy = force; l.angle = math.radians(angle)
        o = bpy.data.objects.new(nom, l); sc.collection.objects.link(o)
        o.rotation_euler = Vector(direction).to_track_quat('-Z', 'Y').to_euler()
    soleil("cle", (1.0, 1.1, -0.9), 4.2, 3)      # lumière venue d'en haut à gauche, devant
    soleil("appoint", (-1.0, -0.4, 0.25), 1.1, 10)  # contre-jour faible de droite : le bord garde ses facettes

def materiaux():
    """Deux rendus : « lumière » (gris clair éclairé) et « masque » (émission pure, noir = mer, vert = terres)."""
    lum, msk = [], []
    for i, col in enumerate([(0, 0, 0), (0, 1, 0)]):
        m = bpy.data.materials.new(f"lum{i}")
        nt = m.node_tree; b = nt.nodes.get("Principled BSDF")
        att = nt.nodes.new("ShaderNodeAttribute"); att.attribute_name = "jit"
        mul = nt.nodes.new("ShaderNodeMath"); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = .82
        nt.links.new(att.outputs["Fac"], mul.inputs[0])
        nt.links.new(mul.outputs[0], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = .62
        try: b.inputs["Specular IOR Level"].default_value = .35
        except Exception: pass
        lum.append(m)
        e = bpy.data.materials.new(f"msk{i}")
        nt = e.node_tree; nt.nodes.clear()
        em = nt.nodes.new("ShaderNodeEmission"); em.inputs[0].default_value = (*col, 1); em.inputs[1].default_value = 1
        out = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(em.outputs[0], out.inputs["Surface"])
        msk.append(e)
    return lum, msk

def objet(bm, seed):
    bm.normal_update()
    me = bpy.data.meshes.new("planete"); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = False
    # légère variation de teinte par facette : 0.88 à 1
    rng = random.Random(seed * 7 + 1)
    attr = me.attributes.new("jit", 'FLOAT', 'FACE')
    attr.data.foreach_set("value", [0.88 + 0.12 * rng.random() for _ in me.polygons])
    o = bpy.data.objects.new("planete", me); bpy.context.scene.collection.objects.link(o)
    return o

def rendu(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(path)
    a = np.empty(len(im.pixels), dtype=np.float32); im.pixels.foreach_get(a)
    w, h = im.size; bpy.data.images.remove(im)
    return a.reshape(h, w, 4)[::-1]  # Blender : origine en bas

def reduire(a):
    """Réduction en boîte SS×SS, en alpha prémultiplié."""
    h, w, _ = a.shape; pm = a.copy(); pm[..., :3] *= pm[..., 3:4]
    pm = pm.reshape(h // SS, SS, w // SS, SS, 4).mean(axis=(1, 3))
    out = pm.copy(); al = np.maximum(pm[..., 3:4], 1e-6); out[..., :3] = np.where(pm[..., 3:4] > 0, pm[..., :3] / al, 0)
    return out

def png(path, arr):
    """PNG RGBA écrit à la main (zlib 9, meilleur filtre par ligne, aucune information de couleur). arr : uint8 (h, w, 4)."""
    h, w, c = arr.shape; bpp = c
    raw = bytearray(); prev = np.zeros(w * c, dtype=np.int16)
    for y in range(h):
        line = arr[y].reshape(-1).astype(np.int16)
        left = np.concatenate([np.zeros(bpp, np.int16), line[:-bpp]])
        upleft = np.concatenate([np.zeros(bpp, np.int16), prev[:-bpp]])
        p = left + prev - upleft
        pa, pb, pc = np.abs(p - left), np.abs(p - prev), np.abs(p - upleft)
        paeth = np.where((pa <= pb) & (pa <= pc), left, np.where(pb <= pc, prev, upleft))
        cands = [line, line - left, line - prev, line - ((left + prev) // 2), line - paeth]
        best = min(range(5), key=lambda k: int(np.abs(((cands[k] + 128) % 256) - 128).sum()))
        raw.append(best); raw += (cands[best] % 256).astype(np.uint8).tobytes()
        prev = line
    def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) \
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    with open(path, "wb") as f: f.write(data)
    return len(data)

def octet(x): return np.clip(np.round(x * 255), 0, 255).astype(np.uint8)

def passe_uv(o, nom):
    """Pour coller la photo : projection orthographique de la DIRECTION du point de la surface (x et z de la normale radiale).
    Un palier surélevé se voit plus loin du centre qu'il ne lit la photo : la photo « suit » le relief, en marches.
    Rendu en émission, transformation de vue « Raw » : les valeurs sont écrites telles quelles."""
    me = o.data
    attr = me.color_attributes.new("uvp", 'FLOAT_COLOR', 'POINT')
    vals = []
    for v in me.vertices:
        n = v.co.normalized()
        vals += [.5 + n.x * .5, .5 + n.z * .5, 1.0, 1.0]
    attr.data.foreach_set("color", vals)
    mat = bpy.data.materials.new("uv"); nt = mat.node_tree; nt.nodes.clear()
    at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = "uvp"
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs[1].default_value = 1
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(at.outputs["Color"], em.inputs[0]); nt.links.new(em.outputs[0], out.inputs["Surface"])
    for i in range(len(me.materials)): me.materials[i] = mat
    vs = bpy.context.scene.view_settings; avant = vs.view_transform
    try: vs.view_transform = 'Raw'; brut = True
    except Exception: brut = False
    U = reduire(rendu(os.path.join(TMP, "u.png")))
    vs.view_transform = avant
    if not brut:  # repli : la vue a encodé en sRGB, on revient au linéaire
        c = U[..., :3]; U[..., :3] = np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
    taille = png(os.path.join(SORTIE, nom), np.stack([octet(U[..., k]) for k in range(4)], axis=2))
    print(f"[planetes] {nom} {taille} o (vue brute : {brut})", flush=True)

def main():
    os.makedirs(SORTIE, exist_ok=True)
    for f in FORMES:
        scene_neuve()
        lum, msk = materiaux()
        o = objet(terrasses(f), f["seed"])
        for m in lum: o.data.materials.append(m)
        L = reduire(rendu(os.path.join(TMP, "l.png")))
        for i, m in enumerate(msk): o.data.materials[i] = m
        M = reduire(rendu(os.path.join(TMP, "m.png")))
        arr = np.stack([octet(L[..., :3].mean(axis=2)), octet(M[..., 1]), octet(M[..., 2]), octet(L[..., 3])], axis=2)
        taille = png(os.path.join(SORTIE, f["id"] + ".png"), arr)
        print(f"[planetes] {f['id']}.png {taille} o", flush=True)
        passe_uv(o, f["id"] + "-uv.png")
    print("[planetes] fini", flush=True)

main()
