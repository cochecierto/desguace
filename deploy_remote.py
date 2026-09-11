"""
Script de despliegue directo y verificación para desguace.cochecierto.com
Sube a /public_html/desguace de forma exacta y segura
"""
import os
import ftplib

host = os.environ.get("HOSTINGER_FTP_HOST", "")
user = os.environ.get("HOSTINGER_FTP_USER", "")
passwd = os.environ.get("HOSTINGER_FTP_PASSWORD", "")

print(f"Conectando a {host}...")
ftp = ftplib.FTP(host)
ftp.login(user=user, passwd=passwd)
print("Conexión FTP exitosa.")

target_dir = "/public_html/desguace"
try:
    ftp.cwd(target_dir)
    print(f"Directorio de destino activo: {target_dir}")
except Exception as e:
    print(f"Directorio {target_dir} no existe. Creando...")
    ftp.cwd("/public_html")
    ftp.mkd("desguace")
    ftp.cwd(target_dir)

# Asegurar carpetas remotas
for folder in ["api", "api/data"]:
    try:
        ftp.cwd(f"{target_dir}/{folder}")
    except Exception:
        try:
            ftp.mkd(f"{target_dir}/{folder}")
        except Exception:
            pass
ftp.cwd(target_dir)

files_to_upload = [
    ("index.html", "index.html"),
    ("operaciones.html", "operaciones.html"),
    ("login.html", "login.html"),
    ("public.html", "public.html"),
    ("styles.css", "styles.css"),
    ("styles-public.css", "styles-public.css"),
    ("app.js", "app.js"),
    ("public.js", "public.js"),
    (".htaccess", ".htaccess"),
    ("api/config.php", "api/config.php"),
    ("api/db.php", "api/db.php"),
    ("api/auth.php", "api/auth.php"),
    ("api/requests.php", "api/requests.php"),
    ("api/stats.php", "api/stats.php"),
    ("api/inventory.php", "api/inventory.php"),
    ("api/vehicles.php", "api/vehicles.php"),
    ("api/version.php", "api/version.php"),
    ("api/data/.htaccess", "api/data/.htaccess"),
]

current_dir = os.path.dirname(os.path.abspath(__file__))

for local_rel, remote_rel in files_to_upload:
    local_path = os.path.join(current_dir, local_rel)
    if os.path.exists(local_path):
        remote_dir = os.path.dirname(remote_rel)
        remote_filename = os.path.basename(remote_rel)

        if remote_dir:
            dest_dir = f"{target_dir}/{remote_dir}"
        else:
            dest_dir = target_dir

        ftp.cwd(dest_dir)
        with open(local_path, "rb") as f:
            print(f"Subiendo {remote_rel} -> {dest_dir}/{remote_filename}...")
            ftp.storbinary(f"STOR {remote_filename}", f)
            print(f"✓ {remote_rel} OK")
    else:
        print(f"⚠ Archivo {local_rel} no encontrado")

print("\n=== VERIFICANDO LISTADO DE /public_html/desguace ===")
ftp.cwd(target_dir)
ftp.retrlines("LIST")

print("\n=== VERIFICANDO LISTADO DE /public_html/desguace/api ===")
ftp.cwd(f"{target_dir}/api")
ftp.retrlines("LIST")

ftp.quit()
print("\n✓ Despliegue completado con éxito a desguace.cochecierto.com")
