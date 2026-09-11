"""
Script de despliegue directo a Hostinger vía FTP para desguace.cochecierto.com
Uso:
  python deploy_hostinger.py
o pasando argumentos:
  python deploy_hostinger.py --host ftp.cochecierto.com --user mi_usuario --password mi_clave
"""

import os
import sys
import ftplib
import argparse

DEFAULT_HOST = os.environ.get("HOSTINGER_FTP_HOST", "ftp.cochecierto.com")
DEFAULT_USER = os.environ.get("HOSTINGER_FTP_USER", "")
DEFAULT_PASS = os.environ.get("HOSTINGER_FTP_PASSWORD", "")
DEFAULT_DIR = os.environ.get("HOSTINGER_FTP_DIR", "public_html/desguace")

FILES_TO_UPLOAD = [
    "index.html",
    "operaciones.html",
    "login.html",
    "public.html",
    "styles.css",
    "styles-public.css",
    "app.js",
    "public.js",
    ".htaccess",
    "api/config.php",
    "api/db.php",
    "api/auth.php",
    "api/requests.php",
    "api/stats.php",
    "api/inventory.php",
    "api/vehicles.php",
    "api/version.php",
    "api/data/.htaccess"
]

def upload():
    parser = argparse.ArgumentParser(description="Despliegue a Hostinger para desguace.cochecierto.com")
    parser.add_argument("--host", default=DEFAULT_HOST, help="Servidor FTP de Hostinger")
    parser.add_argument("--user", default=DEFAULT_USER, help="Usuario FTP")
    parser.add_argument("--password", default=DEFAULT_PASS, help="Contraseña FTP")
    parser.add_argument("--dir", default=DEFAULT_DIR, help="Directorio remoto (ej: public_html o public_html/desguace)")
    args = parser.parse_args()

    host = args.host
    user = args.user or input("Introduce el usuario FTP de Hostinger: ").strip()
    password = args.password or input("Introduce la contraseña FTP de Hostinger: ").strip()
    remote_dir = args.dir

    print(f"Conectando a {host}...")
    try:
        ftp = ftplib.FTP(host)
        ftp.login(user=user, passwd=password)
        print("✓ Conexión FTP exitosa.")
    except Exception as e:
        print(f"❌ Error al conectar al FTP: {e}")
        sys.exit(1)

    # Navegar o crear directorio remoto si es necesario
    try:
        ftp.cwd(remote_dir)
        print(f"✓ Directorio activo: {remote_dir}")
    except Exception:
        print(f"Directorio {remote_dir} no existe. Intentando crear...")
        parts = remote_dir.strip("/").split("/")
        current = ""
        for part in parts:
            current += f"/{part}"
            try:
                ftp.cwd(current)
            except Exception:
                ftp.mkd(current)
                ftp.cwd(current)

    current_dir = os.path.dirname(os.path.abspath(__file__))

    for filename in FILES_TO_UPLOAD:
        local_path = os.path.join(current_dir, filename)
        if os.path.exists(local_path):
            file_dir = os.path.dirname(filename)
            base_filename = os.path.basename(filename)

            # Volver al directorio base remoto
            ftp.cwd(remote_dir)

            # Si el archivo está en un subdirectorio (ej. api/ o api/data/), navegar o crear
            if file_dir:
                for sub in file_dir.replace("\\", "/").split("/"):
                    if sub:
                        try:
                            ftp.cwd(sub)
                        except Exception:
                            ftp.mkd(sub)
                            ftp.cwd(sub)

            with open(local_path, "rb") as f:
                print(f"Subiendo {filename}...")
                ftp.storbinary(f"STOR {base_filename}", f)
                print(f"✓ {filename} subido correctamente.")
            
            # Volver a remote_dir para la siguiente iteración
            ftp.cwd(remote_dir)
        else:
            print(f"⚠ Archivo {filename} no encontrado en local.")

    ftp.quit()
    print("\n=======================================================")
    print("✓ Despliegue completado con éxito.")
    print("Visita: https://desguace.cochecierto.com/")
    print("=======================================================")

if __name__ == "__main__":
    upload()
