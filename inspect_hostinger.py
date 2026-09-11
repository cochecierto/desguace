"""
Script para inspeccionar la estructura de directorios en Hostinger vía FTP
"""
import os
import ftplib

host = os.environ.get("HOSTINGER_FTP_HOST", "")
user = os.environ.get("HOSTINGER_FTP_USER", "")
passwd = os.environ.get("HOSTINGER_FTP_PASSWORD", "")

print(f"Conectando a {host} con usuario {user}...")
ftp = ftplib.FTP(host)
ftp.login(user=user, passwd=passwd)
print("Conectado exitosamente.\n")

def list_dir(path):
    print(f"=== LISTADO DE: {path} ===")
    try:
        ftp.cwd(path)
        ftp.retrlines('LIST')
    except Exception as e:
        print(f"Error listando {path}: {e}")
    print("\n")

# Listar raíz
list_dir("/")

# Listar public_html
list_dir("/public_html")

# Listar domains si existe
list_dir("/domains")

# Listar subdominios o carpetas desguace
list_dir("/public_html/desguace")

ftp.quit()
